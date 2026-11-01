import { playLiveCheer } from '../playback';
import { api } from '../../api';
import { loadAudio, playAudioSource } from '../../audio/playAudioSource';
import { playBase64Mp3 } from '../../audio/playBase64Mp3';
import type { LiveMessage } from '../../../types/api';

// Asset requires resolve to numbers in the bundle; here they only need to be distinguishable.
jest.mock('../../../../assets/audio/cheer_voice.wav', () => 'cheer_voice', { virtual: true });
jest.mock('../../../../assets/audio/cheer_text.wav', () => 'cheer_text', { virtual: true });

jest.mock('../../api', () => ({
  api: { getLiveMessageTts: jest.fn(), markLiveMessagePlayed: jest.fn() },
}));
jest.mock('../../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
// Serial queue stand-in: runs tasks back to back, like the real one, without expo-speech.
jest.mock('../../audioCoach/tts', () => {
  let chain: Promise<void> = Promise.resolve();
  return {
    enqueueAudioTask: (task: () => Promise<void>) => {
      chain = chain.then(task, task);
    },
  };
});
const focusLog: string[] = [];
jest.mock('../../audioCoach/audioSession', () => ({
  withAudioFocus: async (fn: () => Promise<unknown>) => {
    focusLog.push('acquire');
    try {
      return await fn();
    } finally {
      focusLog.push('release');
    }
  },
}));
jest.mock('../../audio/playAudioSource', () => ({
  loadAudio: jest.fn(),
  playAudioSource: jest.fn(),
}));
jest.mock('../../audio/playBase64Mp3', () => ({ playBase64Mp3: jest.fn() }));

const mockedApi = api as unknown as {
  getLiveMessageTts: jest.Mock;
  markLiveMessagePlayed: jest.Mock;
};
const mockedLoad = loadAudio as jest.Mock;
const mockedPlaySource = playAudioSource as jest.Mock;
const mockedMp3 = playBase64Mp3 as jest.Mock;

const message = (overrides: Partial<LiveMessage>): LiveMessage =>
  ({ id: 7, content: 'Go!', audio_played_at: null, ...overrides }) as LiveMessage;

describe('playLiveCheer', () => {
  beforeEach(() => {
    focusLog.length = 0;
    jest.clearAllMocks();
    mockedPlaySource.mockResolvedValue(undefined);
    mockedMp3.mockResolvedValue(undefined);
    mockedApi.markLiveMessagePlayed.mockResolvedValue(undefined);
  });

  it('plays a text cheer as jingle + TTS inside one focus hold', async () => {
    mockedApi.getLiveMessageTts.mockResolvedValue({ audio_base64: 'QUJD' });

    const result = await playLiveCheer(message({ message_type: 'text' }));

    expect(result).toEqual({ ok: true });
    expect(mockedPlaySource).toHaveBeenCalledWith(
      'cheer_text',
      expect.objectContaining({ timeoutMs: 2000 }),
    );
    expect(mockedMp3).toHaveBeenCalledWith('QUJD', 'live_msg_7');
    expect(focusLog).toEqual(['acquire', 'release']);
    // Fetch happens before focus is taken: music must not duck while we wait on the network.
    expect(mockedApi.getLiveMessageTts.mock.invocationCallOrder[0]).toBeLessThan(
      mockedPlaySource.mock.invocationCallOrder[0],
    );
  });

  it('maps TTS tier and quota rejections apart', async () => {
    mockedApi.getLiveMessageTts.mockRejectedValueOnce(Object.assign(new Error(), { status: 403 }));
    expect(await playLiveCheer(message({}))).toEqual({ ok: false, reason: 'upgrade_required' });

    mockedApi.getLiveMessageTts.mockRejectedValueOnce(Object.assign(new Error(), { status: 402 }));
    expect(await playLiveCheer(message({}))).toEqual({ ok: false, reason: 'limit_reached' });

    mockedApi.getLiveMessageTts.mockRejectedValueOnce(Object.assign(new Error(), { status: 404 }));
    expect(await playLiveCheer(message({}))).toEqual({ ok: false, reason: 'not_athlete' });
  });

  it('plays a voice cheer as jingle + clip, loads the clip first, then marks it played', async () => {
    const play = jest.fn().mockResolvedValue(undefined);
    const unload = jest.fn().mockResolvedValue(undefined);
    mockedLoad.mockResolvedValue({ play, unload });

    const result = await playLiveCheer(
      message({
        message_type: 'voice',
        audio_url: 'https://api/live/messages/7/audio?signature=x',
        audio_duration_ms: 12_000,
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockedLoad).toHaveBeenCalledWith(
      { uri: 'https://api/live/messages/7/audio?signature=x' },
      { timeoutMs: 15_000 },
    );
    expect(mockedPlaySource).toHaveBeenCalledWith('cheer_voice', expect.anything());
    expect(mockedLoad.mock.invocationCallOrder[0]).toBeLessThan(
      mockedPlaySource.mock.invocationCallOrder[0],
    );
    expect(mockedPlaySource.mock.invocationCallOrder[0]).toBeLessThan(
      play.mock.invocationCallOrder[0],
    );
    expect(unload).toHaveBeenCalled();
    expect(focusLog).toEqual(['acquire', 'release']);
    expect(mockedApi.markLiveMessagePlayed).toHaveBeenCalledWith(7);
    // Voice never touches the TTS endpoint — it is not tier-gated.
    expect(mockedApi.getLiveMessageTts).not.toHaveBeenCalled();
  });

  it('reports a purged clip as expired without touching audio', async () => {
    const result = await playLiveCheer(message({ message_type: 'voice', audio_url: null }));

    expect(result).toEqual({ ok: false, reason: 'expired' });
    expect(mockedLoad).not.toHaveBeenCalled();
    expect(mockedApi.markLiveMessagePlayed).not.toHaveBeenCalled();
  });

  it('does not mark a clip played when it could not be loaded', async () => {
    mockedLoad.mockRejectedValue(new Error('403 bad signature'));

    const result = await playLiveCheer(
      message({ message_type: 'voice', audio_url: 'https://api/x', audio_duration_ms: 1000 }),
    );

    expect(result).toEqual({ ok: false, reason: 'failed' });
    expect(mockedApi.markLiveMessagePlayed).not.toHaveBeenCalled();
  });

  it('plays queued cheers strictly in arrival order', async () => {
    const order: number[] = [];
    mockedApi.getLiveMessageTts.mockResolvedValue({ audio_base64: 'QUJD' });
    mockedMp3.mockImplementation(async (_b64: string, tag: string) => {
      order.push(Number(tag.replace('live_msg_', '')));
    });

    await Promise.all([
      playLiveCheer(message({ id: 1 })),
      playLiveCheer(message({ id: 2 })),
      playLiveCheer(message({ id: 3 })),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });
});
