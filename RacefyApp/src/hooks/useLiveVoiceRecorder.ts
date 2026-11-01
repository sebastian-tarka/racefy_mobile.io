import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { File } from 'expo-file-system';

import { logger } from '../services/logger';
import { getErrorMessage } from '../utils/errors';
import type { RecordedClip } from './useLiveMessaging';

/**
 * What the server accepts without transcoding (there is no ffmpeg on prod):
 * AAC in an m4a container, mono, 44.1 kHz, ~64 kbps. Twenty seconds of that is
 * ~160 KB, far under the 1 MB cap, and the same file plays in a browser.
 */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  web: {
    mimeType: 'audio/mp4',
    bitsPerSecond: 64000,
  },
};

const PROGRESS_INTERVAL_MS = 250;

type RecorderStatus = 'idle' | 'recording' | 'recorded';

interface Options {
  /** From the app config `live.voice.max_seconds`; recording stops itself here. */
  maxSeconds: number;
  /**
   * Called before the system permission dialog when the user has never been
   * asked. Resolve false to not ask after all. A bare OS prompt with no
   * context reads as "why does a sports app want my microphone".
   */
  explainPermission?: () => Promise<boolean>;
}

interface Result {
  status: RecorderStatus;
  /** Live while recording; the clip's length once stopped. */
  elapsedMs: number;
  clip: RecordedClip | null;
  /** The OS refused, or the user refused — the mic is gone for this session. */
  permissionDenied: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Forget the clip (and delete the file) without sending. */
  discard: () => void;
}

/**
 * One voice cheer at a time, through expo-av — the same audio stack the rest
 * of the app uses, so no second native module to configure.
 *
 * iOS records only with `allowsRecordingIOS`, which also reroutes playback to
 * the earpiece-quality route; it is switched on for the recording and off
 * straight after, so whatever the spectator listens to goes back to normal.
 */
export function useLiveVoiceRecorder({ maxSeconds, explainPermission }: Options): Result {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoStop = () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = null;
  };

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await Audio.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    if (explainPermission && !(await explainPermission())) return false;
    const asked = await Audio.requestPermissionsAsync();
    return asked.granted;
  }, [explainPermission]);

  const stop = useCallback(async () => {
    clearAutoStop();
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;

    try {
      const final = await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('Recording produced no file');
      setClip({ uri, durationMs: final.durationMillis });
      setElapsedMs(final.durationMillis);
      setStatus('recorded');
    } catch (error) {
      logger.warn('live', 'Stopping voice recording failed', { error: getErrorMessage(error) });
      setStatus('idle');
      setElapsedMs(0);
    } finally {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  }, []);

  const start = useCallback(async () => {
    if (recordingRef.current) return;

    if (!(await ensurePermission())) {
      setPermissionDenied(true);
      return;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      recording.setProgressUpdateInterval(PROGRESS_INTERVAL_MS);
      recording.setOnRecordingStatusUpdate((update) => {
        if (update.isRecording) setElapsedMs(update.durationMillis);
      });
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

      recordingRef.current = recording;
      setClip(null);
      setElapsedMs(0);
      setStatus('recording');
      // The server rejects anything longer; stopping here beats a bounced upload.
      autoStopRef.current = setTimeout(() => void stop(), maxSeconds * 1000);
    } catch (error) {
      logger.warn('live', 'Starting voice recording failed', { error: getErrorMessage(error) });
      recordingRef.current = null;
      setStatus('idle');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  }, [ensurePermission, maxSeconds, stop]);

  const discard = useCallback(() => {
    const current = clip;
    setClip(null);
    setElapsedMs(0);
    setStatus('idle');
    if (current) {
      try {
        new File(current.uri).delete();
      } catch {
        // A stale temp file is harmless; the cache directory is disposable.
      }
    }
  }, [clip]);

  // Leaving the screen mid-recording must not leave the recorder (and the iOS
  // recording route) running.
  useEffect(
    () => () => {
      clearAutoStop();
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) {
        recording
          .stopAndUnloadAsync()
          .catch(() => {})
          .finally(() => Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {}));
      }
    },
    [],
  );

  return { status, elapsedMs, clip, permissionDenied, start, stop, discard };
}
