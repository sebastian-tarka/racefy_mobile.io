// ============ AUDIO COACH ============

export type AudioCoachStyle = 'neutral' | 'motivational' | 'coach' | 'minimal';

export type AudioCoachVoice =
  | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo'
  | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

export type AudioCoachLanguage = 'en' | 'pl' | 'de' | 'fr' | 'es' | 'it' | 'pt';

export interface AudioCoachSettings {
  enabled: boolean;
  language: AudioCoachLanguage;
  intervalKm: number;
  style: AudioCoachStyle;
  speechRate: number;
  speechPitch: number;
  useAiVoice: boolean;
  aiVoice: AudioCoachVoice;
  announceHeartRate: boolean;
  announceSplitDelta: boolean;
}

export const DEFAULT_AUDIO_COACH_SETTINGS: AudioCoachSettings = {
  enabled: false,
  language: 'en',
  intervalKm: 1,
  style: 'motivational',
  speechRate: 1.0,
  speechPitch: 1.0,
  useAiVoice: false,
  aiVoice: 'nova',
  announceHeartRate: false,
  announceSplitDelta: false,
};

// API request/response types

export interface SynthesizeRequest {
  text: string;
  voice: AudioCoachVoice;
  language: AudioCoachLanguage;
}

export interface SynthesizeResponse {
  audio_base64: string;
  format: string;
  voice: string;
  characters: number;
}

export interface AudioCoachPlanInfo {
  tier: 'free' | 'plus' | 'pro';
  ttsEngine: 'offline' | 'ai-standard' | 'ai-hd';
  monthlyCharacters: number;
  usedCharacters: number;
  remainingCharacters: number;
  voices: AudioCoachVoice[];
  features: {
    heartRate: boolean;
    splitData: boolean;
    customVoice: boolean;
  };
}

export interface AudioCoachServerSettings {
  enabled: boolean;
  language: string; // Server uses full locale: 'en-US', 'pl-PL', etc.
  interval_km: number;
  voice_style: AudioCoachStyle;
  speech_rate: number;
  speech_pitch: number;
  use_ai_voice: boolean;
  ai_voice: AudioCoachVoice;
  announce_heart_rate: boolean;
  announce_split_comparison: boolean;
}

// Announcement builder input
export interface AnnouncementData {
  language: AudioCoachLanguage;
  style: AudioCoachStyle;
  km: number;
  pace: number; // min/km as decimal (e.g. 5.5 = 5:30)
  heartRate?: number;
  splitDelta?: number; // seconds faster/slower than previous km
}
