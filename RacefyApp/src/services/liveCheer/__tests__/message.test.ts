import {
  DEFAULT_VOICE_MAX_SECONDS,
  formatClipSeconds,
  isVoiceMessage,
  voiceClipTimeoutMs,
} from '../message';

describe('liveCheer/message', () => {
  it('treats a message without message_type (older backend) as text', () => {
    expect(isVoiceMessage({})).toBe(false);
    expect(isVoiceMessage({ message_type: 'text' })).toBe(false);
    expect(isVoiceMessage({ message_type: 'voice' })).toBe(true);
  });

  it('budgets the clip length plus a margin, and the server maximum when unknown', () => {
    expect(voiceClipTimeoutMs(12_000)).toBe(15_000);
    expect(voiceClipTimeoutMs(null)).toBe(DEFAULT_VOICE_MAX_SECONDS * 1000 + 3000);
    expect(voiceClipTimeoutMs(0)).toBe(DEFAULT_VOICE_MAX_SECONDS * 1000 + 3000);
  });

  it('formats whole seconds, never "0 s"', () => {
    expect(formatClipSeconds(12_000)).toBe('12 s');
    expect(formatClipSeconds(11_200)).toBe('12 s');
    expect(formatClipSeconds(400)).toBe('1 s');
    expect(formatClipSeconds(null)).toBe('1 s');
  });
});
