import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useRecordingActions, type RecordingActionsInput } from '../useRecordingActions';

jest.mock('../../../../hooks', () => ({
  announceEnd: jest.fn(),
  announceStart: jest.fn(),
  isProvisionalActivity: jest.fn(() => false),
  triggerHaptic: jest.fn(),
}));
jest.mock('../../../../services/batteryOptimization', () => ({
  isBatteryOptimized: jest.fn(async () => false),
  requestIgnoreBatteryOptimizations: jest.fn(),
}));
jest.mock('../../../../services/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), activity: jest.fn() },
}));
jest.mock('../../../../services/workout/storage', () => ({ clearWorkoutSession: jest.fn() }));
jest.mock('../../../../services/workout/goalNotification', () => ({
  cancelGoalNotification: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) },
}));
jest.mock('expo-haptics', () => ({ ImpactFeedbackStyle: { Medium: 'm', Heavy: 'h' } }));

const sport = { id: 3, name: 'Running' } as RecordingActionsInput['selectedSport'];

function makeInput(overrides: Partial<RecordingActionsInput> = {}): RecordingActionsInput {
  return {
    t: ((key: string) => key) as unknown as RecordingActionsInput['t'],
    navigation: { navigate: jest.fn() } as unknown as RecordingActionsInput['navigation'],
    live: {
      activity: { id: 1 } as RecordingActionsInput['live']['activity'],
      isTracking: true,
      currentStats: { distance: 5000 } as RecordingActionsInput['live']['currentStats'],
      startTracking: jest.fn(async () => ({ id: 1 })) as never,
      pauseTracking: jest.fn(async () => {}) as never,
      resumeTracking: jest.fn(async () => {}) as never,
      finishTracking: jest.fn(async () => null) as never,
      discardTracking: jest.fn(async () => {}) as never,
    },
    localDuration: 1500,
    selectedSport: sport,
    selectedEvent: null,
    setSelectedEvent: jest.fn(),
    skipAutoPost: false,
    setSkipAutoPost: jest.fn(),
    setShowFinish: jest.fn(),
    setWorkoutPlan: jest.fn(),
    isFinishingRef: { current: false },
    requestActivityTrackingPermissions: jest.fn(async () => {}),
    refreshGpsHealth: jest.fn(),
    showOfflineToast: jest.fn(),
    distanceMilestones: [],
    resetMilestones: jest.fn(),
    audioCoachSettings: {} as RecordingActionsInput['audioCoachSettings'],
    persistEffectiveAudioCoachEnabled: jest.fn(),
    restoreAudioCoachSettings: jest.fn(),
    tier: 'free',
    enrichActivityWithHeartRate: jest.fn(async () => {}),
    ...overrides,
  };
}

describe('useRecordingActions', () => {
  it('keeps the same handlers across renders and reads the latest inputs', async () => {
    const first = makeInput();
    const { result, rerender } = renderHook(
      (input: RecordingActionsInput) => useRecordingActions(input),
      { initialProps: first },
    );
    const before = result.current;

    const second = makeInput({ selectedSport: { id: 9, name: 'Cycling' } as never });
    rerender(second);

    expect(result.current).toBe(before);
    await act(() => result.current.handleStart());
    expect(second.live.startTracking).toHaveBeenCalledWith(9, 'Cycling Activity', undefined);
    expect(first.live.startTracking).not.toHaveBeenCalled();
  });

  it('refuses to start without a sport', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const input = makeInput({ selectedSport: null });
    const { result } = renderHook(() => useRecordingActions(input));
    await act(() => result.current.handleStart());
    expect(input.live.startTracking).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('opens the finish screen on Stop even when pausing fails', async () => {
    const input = makeInput();
    (input.live.pauseTracking as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useRecordingActions(input));
    await act(() => result.current.handleStop());
    expect(input.setShowFinish).toHaveBeenCalledWith(true);
  });

  it('saves with the title, share choice and pinned event, then resets', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const input = makeInput({ selectedEvent: { id: 77 } as never });
    (input.live.finishTracking as jest.Mock).mockResolvedValueOnce({
      queued: true,
      activityId: 5,
      state: 'pending',
    });
    const { result } = renderHook(() => useRecordingActions(input));

    await act(() => result.current.handleSave({ title: '  Evening  ', share: false }));

    expect(input.live.finishTracking).toHaveBeenCalledWith({
      title: 'Evening',
      calories: Math.floor(1500 * 0.15),
      skip_auto_post: true,
      event_id: 77,
    });
    expect(input.setShowFinish).toHaveBeenCalledWith(false);
    expect(input.setSelectedEvent).toHaveBeenCalledWith(null);
    expect(input.setWorkoutPlan).toHaveBeenCalledWith(null);
    expect(input.isFinishingRef.current).toBe(false);
    alert.mockRestore();
  });

  it('retries a failed save with the same options', async () => {
    let retry: (() => void) | undefined;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      retry = buttons?.find((b) => b.text === 'recording.retry')?.onPress as () => void;
    });
    const input = makeInput();
    (input.live.finishTracking as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useRecordingActions(input));

    await act(() => result.current.handleSave({ title: 'Long run', share: true }));
    expect(retry).toBeDefined();
    await act(async () => retry!());

    expect(input.live.finishTracking).toHaveBeenCalledTimes(2);
    expect((input.live.finishTracking as jest.Mock).mock.calls[1][0]).toMatchObject({
      title: 'Long run',
      skip_auto_post: false,
    });
    alert.mockRestore();
  });

  it('ignores a second save while one is in flight', async () => {
    const input = makeInput({ isFinishingRef: { current: true } });
    const { result } = renderHook(() => useRecordingActions(input));
    await act(() => result.current.handleSave());
    expect(input.live.finishTracking).not.toHaveBeenCalled();
  });
});
