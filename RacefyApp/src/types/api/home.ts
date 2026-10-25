import type { Activity } from './activities';
import type { CommentaryLanguage, EventCommentary } from './commentary';
import type { Event } from './events';

// ============ HOME FEED ============

export interface EventCommentaryWithBoost extends EventCommentary {
  boosts_count: number;
  user_boosted?: boolean;
}

export interface EventWithLatestCommentary extends Event {
  latest_commentary?: EventCommentaryWithBoost | null;
  active_participants_count?: number;
  featured_media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  } | null;
}

export interface ActivityWithUserInteraction extends Activity {
  user_liked?: boolean;
  user_boosted?: boolean;
}

export interface HomeMeta {
  live_events_count: number;
  upcoming_events_count: number;
  activities_count: number;
  cache_key: string;
  cached_at: string;
  ttl_seconds: number;
  error?: boolean;
  message?: string;
}

export interface HomeData {
  home_version: HomeVersion;
  live_events: EventWithLatestCommentary[];
  upcoming_events: Event[];
  recent_activities: ActivityWithUserInteraction[];
  meta: HomeMeta;
}

export interface BoostCommentaryResponse {
  message: string;
  boosts_count: number;
}

// ============ HOME CONFIG (Dynamic Home Screen) ============

export type HomeCtaAction =
  | 'start_activity'
  | 'view_events'
  | 'view_feed'
  | 'register'
  | 'start_planned_training'
  | 'view_training_week'
  | 'view_goal'
  | 'resume_training';

/** Home screen version - controlled by API */
export type HomeVersion = 'legacy' | 'dynamic';

/**
 * Whitelisted payload keys for action-driven navigation.
 * Backend strips any keys outside this set.
 */
export interface HomeActionPayload {
  training_week_id?: number;
  session_order?: number;
  goal_id?: number;
  program_id?: number;
}

export interface HomeSectionAction {
  type: HomeCtaAction | string;
  payload?: HomeActionPayload;
}

export interface HomePrimaryCta {
  action: HomeCtaAction;
  label: string;
  subtitle?: string;
  payload?: HomeActionPayload;
}

export type HomeSectionType =
  // Original types
  | 'weather_insight'
  | 'friend_activity'
  | 'live_activity'
  | 'upcoming_event'
  | 'last_activity_summary'
  | 'weekly_insight'
  | 'motivation_banner'
  // New event-related types
  | 'live_event'
  | 'event_results'
  | 'nearby_events'
  | 'friend_events'
  // Training-related types (rich data for hero CTA)
  | 'todays_training_session'
  | 'weekly_training_progress'
  | 'training_goal_progress'
  | 'program_phase_intro'
  // UI-only types (not from backend config)
  | 'upcoming_events'
  | 'auth_prompt'
  | 'quick_actions';

/**
 * Meta for `todays_training_session` section.
 * Used to enrich the primary CTA button with structured details.
 */
export interface TodaysTrainingSessionMeta {
  target_distance_meters?: number;
  target_duration_minutes?: number;
  tags?: string[];
  activity_type?: string;
  program_name?: string;
}

/**
 * Meta for `weather_insight`.
 *
 * This is where the API actually puts the weather payload (the older
 * top-level `weather` field is still accepted as a fallback).
 */
export interface HomeWeatherInfo {
  temperature?: number;
  /**
   * OpenWeather `weather[0].main` — ALWAYS English, never localized by
   * `Accept-Language`. Map it with an exact-match lookup, not a substring
   * check ('Drizzle' does not contain 'rain').
   */
  condition?: string;
  feels_like?: number | null;
  icon?: string;
  is_good_for_outdoor?: boolean;
  recommendation?: string;
}

/** Meta for `weekly_training_progress`. */
export interface WeeklyTrainingProgressMeta {
  completed?: number;
  planned?: number;
  remaining?: number;
  all_done?: boolean;
  streak_weeks?: number;
}

/** How the user is pacing against a goal. */
export type GoalPaceStatus = 'ahead' | 'on_track' | 'behind';

/** Unit of `achieved_value` / `target_value` in `training_goal_progress`. */
export type GoalMetricUnit = 'meters' | 'seconds' | 'count';

/** Meta for `training_goal_progress`. */
export interface TrainingGoalProgressMeta {
  achieved_value?: number;
  target_value?: number;
  unit?: GoalMetricUnit;
  percent?: number;
  pace_status?: GoalPaceStatus;
  days_left?: number;
  metric?: string;
  period?: string;
}

/** Meta for `program_phase_intro`. */
export interface ProgramPhaseIntroMeta {
  program_name?: string;
  phase_name?: string;
  week_number?: number;
  total_weeks?: number;
}

export interface HomeSectionEvent {
  id: number;
  title: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  sport_type?: string;
  participants_count?: number;
  cover_image_url?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
}

export interface HomeSectionFriend {
  id: number;
  name: string;
  username: string;
  avatar_url?: string;
}

export interface HomeSectionActivity {
  id: number;
  title?: string;
  distance_km?: number;
  duration_minutes?: number;
  sport_type?: string;
  date?: string;
  user?: HomeSectionFriend;
}

export interface HomeSection {
  type: HomeSectionType;
  priority: number;
  title: string;
  message?: string;
  cta?: string | null;

  /** Small overline shown above the title (e.g. "Today's plan · Coach"). */
  label?: string;

  /** Deep-link target for the section CTA. */
  action?: HomeSectionAction;

  /** Structured render data — shape depends on `type`. */
  meta?: Record<string, unknown>;

  /**
   * Additional data for weather_insight section.
   *
   * The API sends this payload inside `meta` — see `HomeWeatherInfo`. This
   * top-level field is kept for older backends; read both via
   * `getSectionWeather()`.
   */
  weather?: HomeWeatherInfo;

  /** Additional data for last_activity_summary section */
  activity?: {
    id?: number;
    distance_km?: number;
    duration_minutes?: number;
    sport_type?: string;
    date?: string;
  };

  /** Additional data for weekly_insight section */
  stats?: {
    activities_count?: number;
    total_distance_km?: number;
    total_duration_minutes?: number;
    streak_days?: number;
  };

  /** Additional data for live_activity section */
  live?: {
    active_users_count?: number;
    users?: HomeSectionFriend[];
  };

  /** Additional data for friend_activity section */
  friend_activities?: HomeSectionActivity[];

  /** Additional data for upcoming_event, live_event sections */
  event?: HomeSectionEvent;

  /** Additional data for event_results section */
  results?: {
    event: HomeSectionEvent;
    top_participants?: {
      user: HomeSectionFriend;
      position: number;
      distance_km?: number;
      duration_minutes?: number;
    }[];
  };

  /** Additional data for nearby_events, friend_events sections */
  events?: HomeSectionEvent[];
}

export interface HomeConfigMeta {
  ai_generated: boolean;
  language: CommentaryLanguage;
}

export interface HomeConfigData {
  home_version: HomeVersion;
  primary_cta: HomePrimaryCta;
  sections: HomeSection[];
}

export interface HomeConfigResponse {
  data: HomeConfigData;
  meta: HomeConfigMeta;
}

/** GET /home/friends-today — one followed athlete's latest activity today. */
export interface FriendTodayActivity {
  activity_id: number;
  title: string;
  user: { id: number; name: string; username: string; avatar_url: string | null };
  sport_type: { id: number; slug: string; name: string; icon: string | null };
  started_at: string;
  /** Seconds. */
  duration: number;
  /** Meters; 0 for a strength session. */
  distance: number;
  strength: { sets: number; volume_kg: number } | null;
}

export interface FriendsTodayResponse {
  data: FriendTodayActivity[];
  /** Every friend active today, not only the rows returned. */
  meta: { friends_count: number };
}
