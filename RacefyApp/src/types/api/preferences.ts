import type { LivePreferences } from './live';

// ============ USER PREFERENCES ============

export interface NotificationChannelSettings {
  email: boolean;
  push: boolean;
  websocket: boolean;
}

export type AiPostStyle =
  | 'achievement'
  | 'statistical'
  | 'comparison'
  | 'casual'
  | 'motivational'
  | 'technical'
  | 'social';
export type AiPostPerspective = 'descriptive' | 'personal';

export interface AiPostsPreferences {
  enabled: boolean;
  default_style: AiPostStyle;
  default_perspective: AiPostPerspective;
  triggers: {
    activity_completion: boolean;
    activity_share: boolean;
    event_results: boolean;
  };
  auto_publish: boolean;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
  language: 'en' | 'pl' | 'es';
  theme: 'light' | 'dark' | 'system';
  /**
   * Per-user Mapbox style for route maps. A full style id from the backend's
   * ALLOWED_STYLES (e.g. "mapbox/satellite-v9"), or null to use the
   * admin-configured system default. See GET /config/map-style.
   */
  map_style: string | null;
  notifications: {
    likes: NotificationChannelSettings;
    comments: NotificationChannelSettings;
    follows: NotificationChannelSettings;
    messages: NotificationChannelSettings;
    event_reminders: NotificationChannelSettings;
    weekly_summary: NotificationChannelSettings;
    activity_reactions: NotificationChannelSettings;
    mentions: NotificationChannelSettings;
    training_week_feedback: NotificationChannelSettings;
    /** Someone you follow started recording. Push + websocket only. */
    activity_started: NotificationChannelSettings;
    /** Someone you follow is broadcasting and you can join. Push + websocket only. */
    activity_live_started: NotificationChannelSettings;
  };
  privacy: {
    profile_visibility: 'public' | 'followers' | 'private';
    show_activities: boolean;
    show_stats: boolean;
    allow_messages: 'everyone' | 'followers' | 'none';
    share_achievements?: boolean;
    show_start_finish_points?: boolean;
  };
  activity_defaults: {
    visibility: 'public' | 'followers' | 'private';
    auto_share: boolean;
    favorite_sport_id: number | null;
  };
  ai_posts: AiPostsPreferences;
  training_reminders?: {
    enabled: boolean;
    days: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
    time: string; // "HH:MM"
  };
  /** Live broadcasting consents. See LivePreferences. */
  live?: LivePreferences;
}

/**
 * Public map-style config from GET /config/map-style.
 * `available_styles` is the source of truth for the settings picker —
 * never hardcode the list. `static_style` is the admin default used for
 * server-generated route images (and the "System default" preview tile).
 */
export interface MapStyleConfigResponse {
  static_style: string;
  dynamic_style_light: string;
  dynamic_style_dark: string;
  available_styles: string[];
  route_stroke_color: string;
}

// ============ PRIVACY ZONES ============

export interface PrivacyZone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacyZoneSuggestion {
  name: string;
  // Coordinates may arrive as strings (uncast DB decimals) — coerce with Number() before use.
  latitude: number | string;
  longitude: number | string;
  occurrences: number;
  radius_meters: number;
}

export interface CreatePrivacyZoneRequest {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters?: number;
}

export interface UpdatePrivacyZoneRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  is_active?: boolean;
}
