import { Audio } from 'expo-av';
import { loadAudio, playAudioSource } from '../playAudioSource';

jest.mock('../../audioCoach/audioSession', () => ({
  getAudioFocusPrefs: () => ({ mode: 'duck', volume: 0.8 }),
}));

type StatusCb = (status: { isLoaded: boolean; didJustFinish?: boolean }) => void;

const sound = {
  setOnPlaybackStatusUpdate: jest.fn<void, [StatusCb]>(),
  playAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-av', () => ({
  Audio: { Sound: { createAsync: jest.fn() } },
}));

const createAsync = Audio.Sound.createAsync as jest.Mock;
const lastStatusCb = () => sound.setOnPlaybackStatusUpdate.mock.calls.at(-1)?.[0];

describe('playAudioSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    createAsync.mockResolvedValue({ sound });
  });
  afterEach(() => jest.useRealTimers());

  it('loads without autoplay and uses the announcement volume by default', async () => {
    await loadAudio({ uri: 'file:///x.m4a' }, { timeoutMs: 1000 });

    expect(createAsync).toHaveBeenCalledWith(
      { uri: 'file:///x.m4a' },
      { shouldPlay: false, volume: 0.8 },
    );
  });

  it('resolves on didJustFinish and unloads', async () => {
    const done = playAudioSource(7, { timeoutMs: 10_000 });
    await Promise.resolve(); // let createAsync settle
    await Promise.resolve();
    lastStatusCb()?.({ isLoaded: true, didJustFinish: true });

    await done;
    expect(sound.playAsync).toHaveBeenCalled();
    expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
  });

  it('gives up after the timeout when the player never reports the end', async () => {
    const done = playAudioSource(7, { timeoutMs: 1500 });
    await Promise.resolve();
    await Promise.resolve();
    // No status update ever arrives.
    jest.advanceTimersByTime(1500);

    await expect(done).resolves.toBeUndefined();
    expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
  });

  it('treats an unloaded status mid-play as the end, not a pause', async () => {
    const done = playAudioSource(7, { timeoutMs: 10_000 });
    await Promise.resolve();
    await Promise.resolve();
    lastStatusCb()?.({ isLoaded: false });

    await expect(done).resolves.toBeUndefined();
  });

  it('rejects only when the clip cannot be loaded', async () => {
    createAsync.mockRejectedValueOnce(new Error('404'));

    await expect(playAudioSource({ uri: 'https://gone' }, { timeoutMs: 1000 })).rejects.toThrow(
      '404',
    );
    expect(sound.unloadAsync).not.toHaveBeenCalled();
  });
});
