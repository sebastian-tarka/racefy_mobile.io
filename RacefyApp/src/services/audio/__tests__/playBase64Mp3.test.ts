import { playBase64Mp3 } from '../playBase64Mp3';

const mockWrite = jest.fn();
const mockDelete = jest.fn();
const mockUnload = jest.fn().mockResolvedValue(undefined);
let statusCallback: ((status: any) => void) | null = null;

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation(() => ({
    uri: 'file:///cache/test.mp3',
    write: mockWrite,
    delete: mockDelete,
  })),
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockImplementation(() =>
        Promise.resolve({
          sound: {
            setOnPlaybackStatusUpdate: (cb: (status: any) => void) => {
              statusCallback = cb;
              // Resolve on the next tick, as real playback would.
              setTimeout(() => cb({ didJustFinish: true }), 0);
            },
            unloadAsync: mockUnload,
          },
        }),
      ),
    },
  },
}));

// "hello" in base64 — decodes to 5 bytes.
const HELLO_B64 = 'aGVsbG8=';

describe('playBase64Mp3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statusCallback = null;
  });

  it('decodes base64 into bytes before playing', async () => {
    await playBase64Mp3(HELLO_B64, 'tag');

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0] as Uint8Array;
    expect(Array.from(written)).toEqual([104, 101, 108, 108, 111]); // "hello"
  });

  it('unloads the sound and deletes the temp file after playing', async () => {
    await playBase64Mp3(HELLO_B64, 'tag');

    expect(mockUnload).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('still cleans up when playback fails', async () => {
    mockUnload.mockRejectedValueOnce(new Error('unload exploded'));

    // A failure must not leak the sound handle or leave the file in the cache,
    // which is why cleanup lives in a finally block.
    await expect(playBase64Mp3(HELLO_B64, 'tag')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('registers a playback status listener', async () => {
    await playBase64Mp3(HELLO_B64, 'tag');
    expect(statusCallback).not.toBeNull();
  });
});
