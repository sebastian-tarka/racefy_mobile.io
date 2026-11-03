import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useMessages } from '../useMessages';
import { api } from '../../services/api';
import { emitRefresh } from '../../services/refreshEvents';
import type { Message } from '../../types/api';

jest.mock('../../services/api', () => ({
  api: {
    getMessages: jest.fn(),
    markConversationAsRead: jest.fn(),
    sendMessage: jest.fn(),
  },
}));
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../services/refreshEvents', () => ({ emitRefresh: jest.fn() }));

const mockFocus = { focused: true };
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocus.focused }));

const getMessages = api.getMessages as jest.Mock;
const markRead = api.markConversationAsRead as jest.Mock;

type Listener = (state: string) => void;
let appStateListener: Listener | null;

const msg = (id: number, is_own: boolean): Message => ({
  id,
  conversation_id: 1,
  sender: { id: is_own ? 1 : 2, name: 'x', username: 'x', avatar: null },
  content: `m${id}`,
  type: 'text',
  is_own,
  created_at: '2026-11-03T10:00:00.000Z',
});
const page = (data: Message[]) => ({ data, meta: { current_page: 1, last_page: 1 } });

const setAppState = (state: string) =>
  Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });

/** Advances one polling tick and lets the fetch promise settle. */
const tick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockFocus.focused = true;
  appStateListener = null;
  setAppState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: Listener) => {
    appStateListener = cb;
    return { remove: jest.fn() };
  }) as any);
  getMessages.mockReset();
  markRead.mockReset().mockResolvedValue(undefined);
  (emitRefresh as jest.Mock).mockReset();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openChat(initial: Message[]) {
  getMessages.mockResolvedValue(page(initial));
  const hook = renderHook(() => useMessages(1));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  expect(markRead).toHaveBeenCalledTimes(1); // opening the chat always marks it read
  markRead.mockClear();
  return hook;
}

describe('useMessages read marking during polling', () => {
  it('marks read once when a poll brings a new message from someone else', async () => {
    await openChat([msg(1, false)]);

    getMessages.mockResolvedValue(page([msg(1, false), msg(2, false)]));
    await tick();
    expect(markRead).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(emitRefresh).toHaveBeenCalledWith('messages'));

    // Same content on the next poll: no second request.
    await tick();
    expect(markRead).toHaveBeenCalledTimes(1);

    // Another new one: marked again.
    getMessages.mockResolvedValue(page([msg(1, false), msg(2, false), msg(3, false)]));
    await tick();
    expect(markRead).toHaveBeenCalledTimes(2);
  });

  it('does not mark read when only own messages arrived', async () => {
    const { result } = await openChat([msg(1, false)]);

    getMessages.mockResolvedValue(page([msg(1, false), msg(2, true)]));
    await tick();
    expect(result.current.messages.map((m) => m.id)).toEqual([1, 2]);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('does not mark read while the app is in the background', async () => {
    await openChat([msg(1, false)]);

    // Poll started in the foreground, app goes to the background before it resolves.
    let resolve!: (value: unknown) => void;
    getMessages.mockReturnValue(new Promise((r) => (resolve = r)));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    setAppState('background');
    appStateListener!('background');
    await act(async () => {
      resolve(page([msg(1, false), msg(2, false)]));
      await Promise.resolve();
    });
    expect(markRead).not.toHaveBeenCalled();

    // Nothing polls in the background at all.
    getMessages.mockClear();
    jest.advanceTimersByTime(60_000);
    expect(getMessages).not.toHaveBeenCalled();

    // Back to the foreground: the immediate poll sees the unmarked message.
    setAppState('active');
    getMessages.mockResolvedValue(page([msg(1, false), msg(2, false)]));
    await act(async () => {
      appStateListener!('active');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('does not mark read while the chat screen is not focused, and does on return', async () => {
    const { rerender } = await openChat([msg(1, false)]);

    mockFocus.focused = false;
    rerender({});
    getMessages.mockResolvedValue(page([msg(1, false), msg(2, false)]));
    await tick();
    expect(markRead).not.toHaveBeenCalled();

    mockFocus.focused = true;
    rerender({});
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(1));
  });
});
