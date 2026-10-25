// ============ EVENT COMMENTARY ============

export type CommentaryType = 'warmup' | 'live' | 'milestone' | 'summary';

export type CommentaryTrigger =
  | 'scheduled'
  | 'activity_arrived'
  | 'leader_change'
  | 'event_started'
  | 'event_completed'
  | 'first_finish'
  | 'halfway'
  | 'manual';

export type CommentaryStatus = 'pending' | 'processing' | 'published' | 'failed';

export type CommentaryStyle =
  | 'exciting'
  | 'professional'
  | 'casual'
  | 'humorous'
  | 'statistical'
  | 'motivational';

/**
 * AI commentary language code (ISO 639-1).
 * Loosely typed because the backend is the source of truth via
 * GET /commentary/languages — new languages can be added without a mobile release.
 */
export type CommentaryLanguage = string;

export interface StandingsSnapshot {
  position: number;
  user: {
    id: number;
    name: string;
  };
  activity: {
    distance: number;
    duration: number;
  };
  is_finished: boolean;
}

export interface EventCommentary {
  id: number;
  event_id: number;
  type: CommentaryType;
  trigger: CommentaryTrigger;
  language: CommentaryLanguage;
  title: string | null;
  content: string;
  status: CommentaryStatus;
  tokens_used: number;
  standings_snapshot?: StandingsSnapshot[];
  error_message?: string;
  published_at: string | null;
  created_at: string;
  boosts_count?: number;
  user_boosted?: boolean;
}

export interface CommentaryListResponse {
  data: EventCommentary[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    tokens_used: number;
    token_limit: number;
    commentary_enabled: boolean;
    available_languages: Record<CommentaryLanguage, string>;
    event_languages: CommentaryLanguage[];
    languages_with_content: CommentaryLanguage[];
  };
}

export interface CommentarySettings {
  enabled: boolean;
  style: CommentaryStyle;
  token_limit: number | null;
  interval_minutes: number;
  auto_publish: boolean;
  tokens_used: number;
  languages: CommentaryLanguage[];
  force_participants?: boolean;
  time_windows?: { start: string; end: string }[] | null;
  days_of_week?: number[] | null;
  pause_summary_enabled?: boolean;
  available_styles: Record<CommentaryStyle, { name: string; description: string }>;
  available_languages: Record<CommentaryLanguage, string>;
}

export interface UpdateCommentarySettingsRequest {
  enabled?: boolean;
  style?: CommentaryStyle;
  token_limit?: number | null;
  interval_minutes?: number;
  auto_publish?: boolean;
  languages?: CommentaryLanguage[] | null;
  force_participants?: boolean;
  time_windows?: { start: string; end: string }[] | null;
  days_of_week?: number[] | null;
  pause_summary_enabled?: boolean;
}

export interface GenerateCommentaryResponse {
  message: string;
  type: CommentaryType;
}

export interface CommentaryStylesResponse {
  styles: Record<CommentaryStyle, { name: string; description: string }>;
}

export interface CommentaryLanguagesResponse {
  languages: Record<CommentaryLanguage, string>;
}
