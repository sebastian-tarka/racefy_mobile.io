import { api } from '../api';
import { logger } from '../logger';
import type {
  AudioCoachSettings,
  AudioCoachServerSettings,
  AudioCoachPlanInfo,
  SynthesizeRequest,
  SynthesizeResponse,
} from '../../types/audioCoach';
import type { ApiResponse } from '../../types/api';

/**
 * Map short language codes (used in UI/templates) to full locale codes (used by API)
 */
const LANG_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'en-US', // pt not supported by API, fallback to en-US
};

const LOCALE_TO_LANG: Record<string, AudioCoachSettings['language']> = {
  'en-US': 'en',
  'en-GB': 'en',
  'pl-PL': 'pl',
  'de-DE': 'de',
  'fr-FR': 'fr',
  'es-ES': 'es',
  'it-IT': 'it',
};

/**
 * Convert camelCase client settings to snake_case server format
 */
function toServerSettings(settings: Partial<AudioCoachSettings>): Partial<AudioCoachServerSettings> {
  const result: Record<string, unknown> = {};

  if (settings.enabled !== undefined) result.enabled = settings.enabled;
  if (settings.language !== undefined) result.language = LANG_TO_LOCALE[settings.language] || 'en-US';
  if (settings.intervalKm !== undefined) result.interval_km = settings.intervalKm;
  if (settings.style !== undefined) result.voice_style = settings.style;
  if (settings.speechRate !== undefined) result.speech_rate = settings.speechRate;
  if (settings.speechPitch !== undefined) result.speech_pitch = settings.speechPitch;
  if (settings.useAiVoice !== undefined) result.use_ai_voice = settings.useAiVoice;
  if (settings.aiVoice !== undefined) result.ai_voice = settings.aiVoice;
  if (settings.announceHeartRate !== undefined) result.announce_heart_rate = settings.announceHeartRate;
  if (settings.announceSplitDelta !== undefined) result.announce_split_comparison = settings.announceSplitDelta;

  return result as Partial<AudioCoachServerSettings>;
}

/**
 * Convert snake_case server settings to camelCase client format
 */
function fromServerSettings(server: AudioCoachServerSettings): AudioCoachSettings {
  return {
    enabled: server.enabled,
    language: LOCALE_TO_LANG[server.language] || 'en',
    intervalKm: server.interval_km,
    style: server.voice_style,
    speechRate: server.speech_rate,
    speechPitch: server.speech_pitch,
    useAiVoice: server.use_ai_voice,
    aiVoice: server.ai_voice,
    announceHeartRate: server.announce_heart_rate,
    announceSplitDelta: server.announce_split_comparison,
  };
}

/**
 * Synthesize speech via backend AI TTS
 */
export async function synthesize(
  text: string,
  voice: string,
  language: string,
): Promise<SynthesizeResponse> {
  const locale = LANG_TO_LOCALE[language] || 'en-US';
  logger.debug('audioCoach', 'Synthesizing speech', { textLength: text.length, voice, locale });

  const body: SynthesizeRequest = { text, voice: voice as any, language: locale as any };
  const response = await api.request<any>(
    '/audio-coach/synthesize',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  // API may return { data: { audio_base64, ... } } or { audio_base64, ... } directly
  const result = response.data ?? response;
  return result as SynthesizeResponse;
}

/**
 * Fetch audio coach settings from server
 */
export async function fetchSettings(): Promise<AudioCoachSettings> {
  logger.debug('audioCoach', 'Fetching audio coach settings');
  const response = await api.request<any>('/audio-coach/settings');
  return fromServerSettings(response.data ?? response);
}

/**
 * Update audio coach settings on server
 */
export async function updateSettings(
  partial: Partial<AudioCoachSettings>,
): Promise<AudioCoachSettings> {
  logger.debug('audioCoach', 'Updating audio coach settings', partial);
  const response = await api.request<any>(
    '/audio-coach/settings',
    {
      method: 'PUT',
      body: JSON.stringify(toServerSettings(partial)),
    },
  );
  return fromServerSettings(response.data ?? response);
}

/**
 * Fetch plan info (tier, usage, available voices)
 */
export async function fetchPlanInfo(): Promise<AudioCoachPlanInfo> {
  logger.debug('audioCoach', 'Fetching audio coach plan info');
  const response = await api.request<any>('/audio-coach/plan-info');
  const raw = response.data ?? response;
  // Map snake_case from API to camelCase
  return {
    tier: raw.tier,
    ttsEngine: raw.tts_engine ?? raw.ttsEngine,
    monthlyCharacters: raw.monthly_characters ?? raw.monthlyCharacters ?? 0,
    usedCharacters: raw.used_characters ?? raw.usedCharacters ?? 0,
    remainingCharacters: raw.remaining_characters ?? raw.remainingCharacters ?? 0,
    voices: raw.voices ?? [],
    features: {
      heartRate: raw.features?.heart_rate ?? raw.features?.heartRate ?? false,
      splitData: raw.features?.split_data ?? raw.features?.splitData ?? false,
      customVoice: raw.features?.custom_voice ?? raw.features?.customVoice ?? false,
    },
  };
}
