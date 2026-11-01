import { Audio, type AVPlaybackSource } from 'expo-av';
import { getAudioFocusPrefs } from '../audioCoach/audioSession';

interface PlayOptions {
  /** 0..1; defaults to the user's announcement volume preference. */
  volume?: number;
  /**
   * Resolve anyway after this long. `didJustFinish` is not guaranteed — a
   * decoder error on Android, or a stream that stalls, leaves the promise
   * pending forever, and everything behind it in the serial audio queue with
   * it. Callers know the clip length; pass that plus a margin.
   */
  timeoutMs: number;
}

interface LoadedAudio {
  /** Play to the end (or to the timeout). Never rejects. */
  play: () => Promise<void>;
  unload: () => Promise<void>;
}

/**
 * Load a clip without starting it, so a caller can get the download out of
 * the way before an earcon and then play the two back to back.
 *
 * Callers must configure the audio session first (see `ensureAudioMode`).
 */
export async function loadAudio(
  source: AVPlaybackSource,
  { volume, timeoutMs }: PlayOptions,
): Promise<LoadedAudio> {
  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: false,
    volume: volume ?? getAudioFocusPrefs().volume,
  });

  return {
    play: () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        sound.setOnPlaybackStatusUpdate((status) => {
          // An unloaded status mid-play is an error, not a pause: finish rather than wait.
          if (!status.isLoaded || status.didJustFinish) done();
        });
        sound.playAsync().catch(done);
      }),
    unload: () =>
      sound
        .unloadAsync()
        .then(() => undefined)
        .catch(() => undefined),
  };
}

/** Load, play to the end, unload. Rejects only if the clip cannot be loaded. */
export async function playAudioSource(
  source: AVPlaybackSource,
  options: PlayOptions,
): Promise<void> {
  const audio = await loadAudio(source, options);
  try {
    await audio.play();
  } finally {
    await audio.unload();
  }
}
