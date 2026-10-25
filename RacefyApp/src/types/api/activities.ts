import type { ActivityAnalysisSummary } from './effortAnalysis';
import type { Photo, Video } from './media';
import type { RouteTurnInstruction } from './routes';
import type { MentionMap } from './social';
import type { GpsProfileApiResponse, SportType } from './sports';
import type { User } from './user';

// ============ ACTIVITIES ============

// Location data for activity (captured at start/finish)
export interface ActivityLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  location_name?: string;
}

// Location as returned by the API (with coordinates nested)
export interface ActivityLocationResponse {
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  location_name: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface Activity {
  id: number;
  user_id: number;
  post_id: number | null;
  sport_type_id: number;
  event_id: number | null;
  title: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration: number;
  distance: number;
  client_distance: number | null;
  elevation_gain: number | null;
  calories: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  hr_data_source: HealthDataSource | null;
  source: 'app' | 'garmin' | 'amazfit' | 'strava' | 'gpx_import' | 'manual';
  is_private: boolean;
  visibility: 'public' | 'followers' | 'private';
  // GPS Privacy (new in 2026-01)
  show_start_finish_points: boolean; // Activity-level privacy override
  can_view_start_finish: boolean; // Whether current viewer can see markers
  privacy_settings?: {
    // Only for activity owner
    show_start_finish_points: boolean;
    has_privacy_zones: boolean;
  };
  // Live tracking fields
  status: 'in_progress' | 'paused' | 'completed';
  is_active: boolean;
  total_paused_duration: number;
  /** ISO start of the pause in progress; null/absent while recording. */
  paused_at?: string | null;
  /** Device-minted recording UUID (set at start since offline start exists). */
  client_activity_id?: string | null;
  last_point_at: string | null;
  has_gps_track: boolean;
  route_svg?: string | null;
  route_map_url?: string | null;
  route_preview_url?: string | null; // PNG, transparent bg, route + km markers
  sport_type?: SportType;
  gps_track?: GpsTrack;
  photos?: Photo[];
  videos?: Video[];
  user?: User;
  is_owner?: boolean;
  /** True only while broadcasting; cleared the moment the broadcast ends. */
  is_live?: boolean;
  /**
   * When the activity was first broadcast. Never cleared, so this — not
   * `is_live` — is what says "this activity was live" after the fact.
   */
  live_started_at?: string | null;
  duration_formatted?: string;
  distance_formatted?: string;
  pace?: string | null;
  // Location (captured at activity start/finish)
  location?: ActivityLocationResponse;
  // Engagement fields
  likes_count?: number;
  boosts_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_boosted?: boolean;
  // Training link
  training_week_id?: number | null;
  // GPS profile used during tracking (returned by API after activity is finished)
  gps_profile_used?: GpsProfileApiResponse | null;
  // Mentions
  mentions?: MentionMap;
  /**
   * Effort-analysis digest for list surfaces (full analysis lives behind
   * `GET /activities/{id}/analysis`). Absent when the relation was not eager
   * loaded, `null` when nothing has been computed yet - treat both the same.
   * Never present on `/activities/discover` and `/activities/nearby`, which
   * serve trimmed public resources.
   */
  analysis_summary?: ActivityAnalysisSummary | null;
  /**
   * The strength session this activity was logged from. Present on
   * `GET /activities/{id}`, `GET /feed` (post `activity` and
   * `shared_post.activity`), `GET /posts` and `GET /posts/{id}`; the key is
   * missing everywhere else and on activities not logged from a session.
   */
  strength_session?: StrengthSessionSummary;
}

// ============ STRENGTH SESSION (activity.strength_session) ============

export interface StrengthSetValue {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
}

export interface StrengthProgress {
  /** Best weight now − last time. */
  weight_delta_kg: number;
  /** Only at the same weight, else 0. */
  reps_delta: number;
  /** Only at the same weight, else 0. */
  duration_delta_seconds: number;
}

export type StrengthHighlight = {
  exercise_order: number;
  name: string;
  type: 'weight' | 'reps' | 'duration';
  from: StrengthSetValue;
  to: StrengthSetValue;
} & StrengthProgress;

export type StrengthSet = StrengthSetValue & {
  set_number: number;
  /** Skipped sets are listed too, with reps / weight null. */
  is_completed: boolean;
  rest_seconds: number | null;
};

export interface StrengthExercise {
  exercise_order: number;
  exercise_id: number;
  name: string;
  /** Often 'other' — do not build UI around it. */
  muscle_group: string | null;
  planned: {
    sets: number;
    target_type: 'reps' | 'seconds' | 'amrap' | null;
    reps_min: number | null;
    reps_max: number | null;
    rest_seconds: number | null;
    suggested_weight_kg: number | null;
  };
  /** `rest_seconds` on a set = the rest AFTER it (null = not timed). */
  sets: StrengthSet[];
  /** 0 = the exercise was skipped (show muted, never as a failure). */
  sets_completed: number;
  volume_kg: number;
  /** Heaviest completed set; null when nothing was completed. */
  best_set: StrengthSetValue | null;
  /** Last earlier session containing this exercise; null the first time. */
  previous: {
    session_id: number;
    completed_at: string;
    best_set: StrengthSetValue | null;
    volume_kg: number;
  } | null;
  progress: StrengthProgress | null;
}

export interface StrengthSessionSummary {
  id: number;
  workout_id: number | null;
  workout_plan_id: number | null;
  workout_name: string;
  day_label: string | null;
  duration_seconds: number | null;
  /** 1–10 */
  rpe: number | null;
  /** The athlete's own note — owner only, null for everyone else. */
  notes: string | null;
  /**
   * True while `activity.description` is the generated sets list (hide it — the
   * strength UI shows the same); false once the athlete has edited it.
   */
  description_is_auto: boolean;
  stats: {
    sets_total: number;
    sets_completed: number;
    volume_kg: number;
    exercises: number;
    exercises_completed: number;
  };
  highlights: StrengthHighlight[];
  exercises: StrengthExercise[];
}

// ============ ACTIVITY BOOSTS ============

export interface BoostResponse {
  message: string;
  boosts_count: number;
}

// ============ HEALTH DATA ============

export interface HeartRateSample {
  timestamp: string;
  bpm: number;
}

export type HealthDataSource = 'health_connect' | 'apple_health';

export interface SendHealthDataRequest {
  heart_rate_samples: HeartRateSample[];
  source: HealthDataSource;
}

// GPS Point for live tracking
export interface GpsPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
  hr?: number;
  speed?: number;
  cadence?: number;
  accuracy?: number;
  /** Per-activity monotonic sequence number (idempotent batch uploads) */
  seq?: number;
  /** First point after a GPS gap — route rendered as separate segments */
  segment_break?: boolean;
}

// Nearby route for shadow track feature
export interface NearbyRoute {
  id: number;
  title: string;
  distance: number; // meters
  elevation_gain: number; // meters
  duration: number; // seconds
  sport_type_id: number;
  user: {
    id: number;
    name: string;
    username: string; // @username
    avatar: string; // Backend uses 'avatar' not 'avatar_url'
  };
  stats: {
    likes_count: number;
    boosts_count: number; // Backend uses boosts instead of completions
  };
  track_data: GeoJSONLineString;
  distance_from_user: number; // meters from search location
  created_at: string;
  /**
   * Where the entry came from. `activity` (default) = raw GPS track from
   * /activities/nearby (no router turns); `planned_route` = /routes;
   * `event` = event's planned route.
   */
  source?: import('../../utils/routeKey').RouteSource;
  /** Router-generated turns (planned routes only). Empty/missing → derived from geometry. */
  turn_instructions?: RouteTurnInstruction[];
}

// Request for adding GPS points to live activity
export interface AddActivityPointsRequest {
  points: GpsPoint[];
  // Optional stats sync (for crash recovery - sync periodically)
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  // Client-calculated distance (meters) - preserved alongside server-calculated distance
  client_distance?: number;
}

// Response from adding GPS points to live activity
export interface AddActivityPointsResponse {
  message: string;
  points_count: number; // Points added in this batch
  total_points: number; // Total GPS points
  stats: {
    distance: number; // Total meters
    duration: number; // Total seconds (excludes paused time)
    elevation_gain: number; // Total meters climbed
    calories?: number; // Current calories (if synced)
    avg_speed?: number; // Average speed in m/s (server-calculated)
    max_speed?: number; // Maximum speed in m/s (server-calculated)
  };
}

export interface CreateActivityRequest {
  sport_type_id: number;
  title: string;
  description?: string;
  started_at: string;
  ended_at: string;
  duration: number;
  distance: number;
  elevation_gain?: number;
  calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  source: 'app' | 'manual';
  is_private?: boolean;
  visibility?: 'public' | 'followers' | 'private';
  track_data?: GeoJSONLineString;
}

// Request data for finishing a live activity
export interface FinishActivityRequest {
  title?: string;
  description?: string;
  ended_at?: string;
  /**
   * Seconds spent paused, measured on the device. Sent only when a pause/resume
   * of this activity could not be delivered on time (no network): the server
   * clocks pauses by arrival, so without this the stops would count as active time.
   */
  total_paused_duration?: number;
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  location?: ActivityLocation;
  skip_auto_post?: boolean;
  final_points?: GpsPoint[];
  // Client-calculated distance (meters) - preserved alongside server-calculated distance
  client_distance?: number;
  // Device-minted UUID of the tracking session (idempotent batch uploads)
  client_activity_id?: string;
  // Event the activity should be linked to (set/changed at save time)
  event_id?: number | null;
}

// Auto-created post info returned when finishing an activity
export interface AutoCreatedPost {
  id: number;
  status: 'published' | 'draft';
  title: string;
}

// Response from finishing an activity (includes optional auto-created post)
export interface FinishActivityResponse {
  data: Activity;
  message: string;
  points_earned?: number;
  splits?: {
    distance_splits: {
      distance: number;
      time: number;
      pace: string;
    }[];
    time_splits: {
      time: number;
      distance: number;
      speed: number;
    }[];
  };
  post?: AutoCreatedPost;
}

export interface GpsTrack {
  id: number;
  activity_id: number;
  track_data: GeoJSONLineString; // Privacy-aware: trimmed if viewer is not owner
  points_count: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  simplified_track: GeoJSONLineString; // Privacy-aware: trimmed if viewer is not owner
  route_svg: string | null;
  route_map_url: string | null;
  route_preview_url: string | null; // PNG, transparent bg, route + km markers
  svg_generated_at: string | null;
  map_generated_at: string | null;
  // GPS Privacy (new in 2026-01)
  show_start_marker: boolean; // Whether viewer can see start marker
  show_finish_marker: boolean; // Whether viewer can see finish marker
  start_point: [number, number, number?] | null; // Start coords [lng, lat, ele?] or null if hidden
  finish_point: [number, number, number?] | null; // Finish coords [lng, lat, ele?] or null if hidden
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

// Detailed track point from /activities/{id}/track-points endpoint
export interface TrackPoint {
  index: number;
  lat: number;
  lng: number;
  distance: number; // Cumulative distance in meters
  timestamp: string;
  elevation: number; // Elevation in meters
  speed: number; // Speed in m/s
}

// Response from /activities/{id}/track-points endpoint
export interface TrackPointsResponse {
  data?: TrackPoint[]; // May be undefined for activities without detailed track data
  total_points?: number;
  sampled_points?: number;
  bounds?: {
    east: number;
    west: number;
    north: number;
    south: number;
  };
}

// Split data (per kilometer)
export interface ActivitySplit {
  kilometer: number;
  duration: number; // seconds for this km
  pace: string; // formatted pace (e.g., "5:42")
  cumulative_duration: number; // total seconds up to this km
  cumulative_distance: number; // total meters up to this km
  elevation_gain: number; // meters gained in this km
  elevation_loss: number; // meters lost in this km
  avg_heart_rate: number | null; // average bpm for this km
  max_heart_rate: number | null; // max bpm for this km
  avg_speed: number | null; // m/s average for this km
  max_speed: number | null; // m/s max for this km
  avg_cadence: number | null; // steps per minute
  formatted?: {
    pace: { value: string; unit: string };
    elevation_gain: { value: number; unit: string };
    elevation_loss: { value: number; unit: string };
    avg_speed: { value: number; unit: string };
    max_speed: { value: number; unit: string };
  };
}

// Splits summary from /activities/{id}/splits or /activities/{id}/stats
export interface SplitsSummary {
  splits: ActivitySplit[];
  total_splits: number;
  best_km: {
    kilometer: number;
    duration: number;
    pace: string;
  };
  worst_km: {
    kilometer: number;
    duration: number;
    pace: string;
  };
  average_pace: string;
}

// Activity stats from /activities/{id}/stats endpoint
export interface SingleActivityStats {
  primary: {
    distance: number; // meters
    duration: number; // seconds
    elevation_gain: number; // meters
  };
  performance: {
    pace: {
      average: number | null; // seconds per kilometer
      formatted: string; // e.g., "5:42"
    };
    speed: {
      average: number | null; // m/s
      max: number | null; // m/s
    };
    heart_rate: {
      average: number | null; // bpm
      max: number | null; // bpm
    };
    calories: number | null; // kcal
  };
  splits: SplitsSummary | null;
  has_data: {
    elevation: boolean;
    heart_rate: boolean;
    speed: boolean;
    cadence: boolean;
  };
}
