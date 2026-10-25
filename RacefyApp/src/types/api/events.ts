import type { CommentaryLanguage, CommentaryStyle } from './commentary';
import type { Photo, Video } from './media';
import type { Post } from './posts';
import type { PlannedRoute } from './routes';
import type { SportType } from './sports';
import type { EventTeam } from './teams';
import type { User } from './user';

// ============ EVENTS ============

export type EventRankingMode = 'fastest_time' | 'most_distance' | 'most_elevation' | 'first_finish';
export type RankingModeOption = { description?: string; value: EventRankingMode; name: string };
export type EventTeamScoring = 'sum' | 'average' | 'best_n';
export type EventVisibility = 'public' | 'followers' | 'private';

export interface AiFeaturesResponse {
  ai_features_enabled: boolean;
  ai_commentary_enabled: boolean;
}

// Registration eligibility reason codes
export type RegistrationEligibilityReason =
  | 'event_completed'
  | 'event_cancelled'
  | 'event_not_upcoming'
  | 'too_close_to_event'
  | 'registration_not_opened'
  | 'registration_closed';

// Registration eligibility information
export interface RegistrationEligibility {
  can_register: boolean;
  reason: RegistrationEligibilityReason | null;
  opens_at: string | null;
  closes_at: string | null;
}

export interface EventPointRewards {
  first_place?: number;
  second_place?: number;
  third_place?: number;
  finisher?: number;
}

export interface Event {
  id: number;
  created_by: number;
  post_id: number;
  sport_type_id: number;
  slug?: string;
  slug_expires_at?: string;
  friendly_url?: string;
  location_name: string;
  /** [lng, lat]; null when the event has no location (the API maps 0/0 to null). */
  coordinates?: [number, number] | null;
  starts_at: string;
  ends_at: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  max_participants: number | null;
  participants_count: number;
  available_spots: number | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance: number | null;
  entry_fee: number | null;
  visibility?: EventVisibility;
  cover_image: string | null;
  cover_image_url: string | null;
  accent_color?: string | null;
  // Ranking mode
  ranking_mode?: EventRankingMode;
  target_distance?: number;
  target_elevation?: number;
  time_limit?: number;
  results_finalized?: boolean;
  auto_finalize_results?: boolean;
  // Team event
  is_team_event?: boolean;
  team_size_min?: number;
  team_size_max?: number;
  team_scoring?: EventTeamScoring;
  // AI Commentary settings
  ai_commentary_enabled?: boolean;
  ai_commentary_style?: CommentaryStyle;
  ai_commentary_languages?: CommentaryLanguage[];
  ai_commentary_interval_minutes?: number;
  ai_commentary_token_limit?: number | null;
  ai_commentary_auto_publish?: boolean;
  ai_commentary_force_participants?: boolean;
  ai_commentary_time_windows?: { start: string; end: string }[] | null;
  ai_commentary_days_of_week?: number[] | null;
  ai_commentary_pause_summary_enabled?: boolean;
  ai_commentary_active_now?: boolean;
  ai_commentary_next_window?: string | null;
  ai_commentary_last_paused_at?: string | null;
  ai_commentary_last_resumed_at?: string | null;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points?: boolean; // Override GPS privacy for all participants
  start_finish_note?: string | null; // Explanation why markers are shown
  // Activity aggregation
  allow_multiple_activities?: boolean; // Allow multiple activities to be aggregated
  // Point rewards
  point_rewards?: EventPointRewards;
  // Route planning
  route_id?: number | null;
  route?: PlannedRoute | null;
  // Registration status
  is_registration_open?: boolean; // DEPRECATED: Use registration_eligibility instead
  is_full?: boolean;
  registration_eligibility?: RegistrationEligibility;
  // Sponsoring / prizes
  prizes?: EventPrize[];
  coupons?: EventCoupon[];
  sponsor?: EventSponsor | null;
  // Visual / content
  cover_variants?: EventCoverVariants | null;
  has_custom_page?: boolean;
  custom_page_url?: string | null;
  videos?: Video[];
  gallery_photos?: Photo[];
  gallery_videos?: Video[];
  tagged_posts?: EventTaggedPost[];
  // Relations
  sport_type?: SportType;
  post?: Post;
  is_registered?: boolean;
  is_owner?: boolean;
  is_watching?: boolean;
  /** Embedded registration for the current viewer (bib number, status, notes). */
  user_registration?: EventRegistration | null;
  created_at?: string;
  updated_at?: string;
}

/** Map of cover image variant name (e.g. `mobile`, `desktop`) to its URL. */
export type EventCoverVariants = Record<string, string>;

export interface EventPrize {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  prize_type: string;
  value_usd: number | null;
  place: number;
  affiliate_url: string | null;
}

export interface EventCoupon {
  id: number;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  currency: string | null;
  place: number;
  promoted_link: string | null;
  expires_at: string | null;
}

export interface EventSponsor {
  name: string;
}

export interface EventTaggedPost {
  id: number;
  content: string | null;
  user: Pick<User, 'id' | 'name' | 'username'> & { avatar: string | null };
  photos: Photo[];
  videos: Video[];
  created_at: string;
}

export interface CreateEventRequest {
  // Required fields
  title: string;
  content: string;
  sport_type_id: number;
  location_name: string;
  starts_at: string;
  // Optional location
  latitude?: number;
  longitude?: number;
  // Optional timing
  ends_at?: string;
  registration_opens_at?: string;
  registration_closes_at?: string;
  // Optional settings
  max_participants?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance?: number;
  entry_fee?: number;
  visibility?: EventVisibility;
  // Slug
  slug?: string;
  slug_expires_at?: string;
  // Ranking mode
  ranking_mode?: EventRankingMode;
  target_distance?: number;
  target_elevation?: number;
  time_limit?: number;
  // Team event
  is_team_event?: boolean;
  team_size_min?: number;
  team_size_max?: number;
  team_scoring?: EventTeamScoring;
  // AI Commentary settings
  ai_commentary_enabled?: boolean;
  ai_commentary_style?: CommentaryStyle;
  ai_commentary_languages?: CommentaryLanguage[];
  ai_commentary_interval_minutes?: number;
  ai_commentary_token_limit?: number | null;
  ai_commentary_auto_publish?: boolean;
  ai_commentary_force_participants?: boolean;
  ai_commentary_time_windows?: { start: string; end: string }[] | null;
  ai_commentary_days_of_week?: number[] | null;
  ai_commentary_pause_summary_enabled?: boolean;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points?: boolean; // Override GPS privacy for all participants
  start_finish_note?: string; // Explanation why markers are shown (e.g., "Race starts at City Hall")
  // Activity aggregation
  allow_multiple_activities?: boolean;
  // Auto-finalize results
  auto_finalize_results?: boolean;
  // Point rewards
  point_rewards?: EventPointRewards;
  // Route planning
  route_id?: number | null;
}

export interface UpdateEventRequest {
  // Post fields (always allowed)
  title?: string;
  content?: string;
  visibility?: EventVisibility;
  // Event fields (restricted for ongoing/completed)
  sport_type_id?: number;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  starts_at?: string;
  ends_at?: string;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  max_participants?: number | null;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance?: number | null;
  entry_fee?: number | null;
  slug?: string;
  slug_expires_at?: string;
  // Ranking mode
  ranking_mode?: EventRankingMode;
  target_distance?: number;
  target_elevation?: number | null;
  time_limit?: number;
  // Team event
  is_team_event?: boolean;
  team_size_min?: number;
  team_size_max?: number;
  team_scoring?: EventTeamScoring;
  // AI Commentary settings
  ai_commentary_enabled?: boolean;
  ai_commentary_style?: CommentaryStyle;
  ai_commentary_languages?: CommentaryLanguage[];
  ai_commentary_interval_minutes?: number;
  ai_commentary_token_limit?: number | null;
  ai_commentary_auto_publish?: boolean;
  ai_commentary_force_participants?: boolean;
  ai_commentary_time_windows?: { start: string; end: string }[] | null;
  ai_commentary_days_of_week?: number[] | null;
  ai_commentary_pause_summary_enabled?: boolean;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points?: boolean; // Override GPS privacy for all participants
  start_finish_note?: string; // Explanation why markers are shown (e.g., "Race starts at City Hall")
  // Activity aggregation
  allow_multiple_activities?: boolean;
  // Auto-finalize results
  auto_finalize_results?: boolean;
  // Point rewards
  point_rewards?: EventPointRewards;
  // Route planning
  route_id?: number | null;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  status: 'registered' | 'waitlisted' | 'cancelled' | 'attended';
  registration_number: number;
  notes: string | null;
  registered_at: string;
  event?: Event;
  user?: User;
}

// ============ EVENT STANDINGS (live) & RESULTS (finalized) ============

/** Minimal user shape returned inside standings/results rows. */
export interface EventStandingUser {
  id: number;
  name: string;
  username: string;
  avatar?: string | null;
  avatar_url?: string | null;
}

/**
 * One live-standings row. In single-activity mode `activity` carries the metrics;
 * in aggregated mode (`allow_multiple_activities`) the `total_*` fields are set and
 * `activity` is null. Use `normalizeStanding()` to read metrics uniformly.
 */
export interface EventStandingEntry {
  position: number;
  user: EventStandingUser;
  activity: {
    id: number;
    distance: number | null;
    duration: number | null;
    elevation_gain: number | null;
    status?: string;
  } | null;
  is_finished: boolean;
  // aggregated mode
  activities_count?: number;
  total_distance?: number | null;
  total_duration?: number | null;
  total_elevation_gain?: number | null;
}

export interface EventTeamStandingEntry {
  position: number;
  team: EventTeam;
  members: EventStandingEntry[];
  total_distance: number | null;
  total_duration: number | null;
  total_elevation: number | null;
  finished_count: number;
}

export interface EventStandingsResponse {
  event_status: Event['status'];
  ranking_mode?: EventRankingMode;
  is_team_event: boolean;
  individual_standings: EventStandingEntry[];
  team_standings?: EventTeamStandingEntry[];
}

/** One finalized result row (EventResultResource). */
export interface EventResult {
  id: number;
  place: number;
  place_label: string;
  user?: User;
  team?: EventTeam;
  activity_id: number | null;
  duration: number | null;
  formatted_duration: string | null;
  distance: number | null;
  formatted_distance: string | null;
  elevation_gain: number | null;
  finished_at: string | null;
  is_team_result: boolean;
  activities_count: number;
  created_at: string | null;
}

export interface EventResultsResponse {
  results_finalized: boolean;
  ranking_mode?: EventRankingMode;
  is_team_event: boolean;
  individual_results: EventResult[];
  team_results: EventResult[];
}

export interface EventWatchStatus {
  is_watching: boolean;
  is_registered: boolean;
  can_watch: boolean;
}

export interface EventWatchResponse {
  message: string;
  is_watching: boolean;
}

// ============ EVENT STATS ============

export interface EventStats {
  organized: {
    total: number;
    completed: number;
    total_participants: number;
  };
  participated: {
    joined: number;
    completed: number;
    ongoing: number;
    upcoming: number;
  };
  results: {
    total_finishes: number;
    podiums: number;
    gold: number;
    silver: number;
    bronze: number;
    best_result: {
      place: number;
      place_label: string;
      event_slug: string;
      event_title: string;
    } | null;
  };
  activity_totals: {
    count: number;
    distance: number;
    duration: number;
    elevation_gain: number;
  };
}

// ============ EVENT OVERVIEW (global platform stats) ============

export interface EventStatusStats {
  event_count: number;
  total_participants: number;
  total_activities: number;
  total_distance: number; // meters
  total_elevation_gain: number; // meters
  total_duration: number; // seconds
}

export interface EventOverview {
  upcoming: EventStatusStats;
  ongoing: EventStatusStats;
  completed: EventStatusStats;
  totals: EventStatusStats;
}

// ============ EVENT POINTS BUDGET ============

/**
 * Request payload for POST /api/events/points-budget/preview.
 * All distances/elevations in meters. max_participants is integer.
 */
export interface EventPointsBudgetPreviewRequest {
  sport_type_id: number;
  distance?: number | null;
  elevation_gain?: number | null;
  target_distance?: number | null;
  target_elevation?: number | null;
  max_participants?: number | null;
  is_sponsored?: boolean;
}

/**
 * Response from POST /api/events/points-budget/preview
 * and GET /api/events/{event}/points-budget.
 */
export interface EventPointsBudget {
  valid: boolean;
  pool: number;
  allocated: number;
  remaining: number;
  estimated_finishers: number;
  is_sponsored: boolean;
  effective_distance: number;
  effective_elevation: number;
}
