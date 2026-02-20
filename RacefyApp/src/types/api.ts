// ============ USER & AUTH ============

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  email_verified_at: string | null;
  avatar: string | null;
  avatar_url: string | null;
  background_image: string | null;
  background_image_url: string | null;
  bio: string | null;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface UserProfilePrivacy {
  profile_visibility: 'public' | 'followers' | 'private';
  show_activities: boolean;
  show_stats: boolean;
  allow_messages: 'everyone' | 'followers' | 'none';
}

export interface UserProfile extends User {
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
  privacy?: UserProfilePrivacy;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: 'Bearer';
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface GoogleAuthResponse {
  user: User;
  access_token: string;
  token_type: 'Bearer';
  is_new_user: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ============ IMPERSONATION ============

export interface ImpersonationSession {
  id: number;
  admin_id: number;
  impersonated_user_id: number;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
}

export interface StartImpersonationResponse {
  impersonation_token: string;
  impersonated_user: User;
  expires_at: string;
  session_id: number;
}

export interface StopImpersonationResponse {
  message: string;
  admin_user: User;
}

export interface ImpersonationStatusResponse {
  is_impersonating: boolean;
  session: ImpersonationSession | null;
  original_admin: User | null;
}

// ============ USER PREFERENCES ============

export interface NotificationChannelSettings {
  email: boolean;
  push: boolean;
  websocket: boolean;
}

export type AiPostStyle = 'achievement' | 'statistical' | 'comparison' | 'casual' | 'motivational' | 'technical' | 'social';
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
  language: 'en' | 'pl';
  theme: 'light' | 'dark' | 'system';
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
  };
  privacy: {
    profile_visibility: 'public' | 'followers' | 'private';
    show_activities: boolean;
    show_stats: boolean;
    allow_messages: 'everyone' | 'followers' | 'none';
  };
  activity_defaults: {
    visibility: 'public' | 'followers' | 'private';
    auto_share: boolean;
    favorite_sport_id: number | null;
  };
  ai_posts: AiPostsPreferences;
}

// ============ SPORT TYPES ============

// GPS Profile from API (snake_case)
export interface GpsProfileApiResponse {
  enabled: boolean;
  accuracy_threshold: number;
  min_distance_threshold: number;
  max_realistic_speed: number;
  min_elevation_change: number;
  time_interval: number;
  distance_interval: number;
  smoothing_buffer_size: number;
  // Pace display settings (optional - API may not provide these yet)
  pace_smoothing_factor?: number;     // EMA alpha for pace smoothing (0.1-0.9)
  pace_window_seconds?: number;       // Time window for current pace calculation (20-120s)
  min_distance_for_pace?: number;     // Min meters before showing any pace (20-200m)
  min_segment_distance?: number;      // Min meters in window for valid current pace (10-100m)
  // Background sync settings (optional - API may not provide these yet)
  background_sync_interval?: number;  // Interval in ms for background GPS sync (60000-600000)
  background_sync_enabled?: boolean;  // Enable background sync for this sport
}

// GPS Profile for API requests (snake_case, optional fields)
export interface GpsProfileRequest {
  enabled: boolean;
  accuracy_threshold?: number;
  min_distance_threshold?: number;
  max_realistic_speed?: number;
  min_elevation_change?: number;
  time_interval?: number;
  distance_interval?: number;
  smoothing_buffer_size?: number;
  // Pace display settings
  pace_smoothing_factor?: number;
  pace_window_seconds?: number;
  min_distance_for_pace?: number;
  min_segment_distance?: number;
  // Background sync settings
  background_sync_interval?: number;
  background_sync_enabled?: boolean;
}

export interface SportType {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  gps_profile?: GpsProfileApiResponse; // Optional: may not be present in fallback data
}

// ============ POSTS ============

export interface Post {
  id: number;
  user_id: number;
  type: 'general' | 'event' | 'activity';
  title: string | null;
  content: string;
  visibility: 'public' | 'followers' | 'private';
  status: 'draft' | 'published';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  photos?: Photo[];
  media?: Media[];
  videos?: Video[];
  event?: Event;
  activity?: Activity;
  is_liked?: boolean;
  is_owner?: boolean;
  mentions?: MentionMap;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
  visibility?: 'public' | 'followers' | 'private';
  status?: 'draft' | 'published';
}

// AI generation metadata included with AI-generated drafts
export interface AiGenerationInfo {
  id: number;
  trigger: 'activity_completion' | 'activity_share' | 'event_results' | 'event_forced';
  style: AiPostStyle;
  perspective: AiPostPerspective;
  is_ai_generated: true;
}

// Draft post data structure - extends Post with AI generation info
export interface DraftPost extends Post {
  status: 'draft';
  ai_generation?: AiGenerationInfo;
}

// Paginated response for drafts
export interface DraftsResponse {
  data: DraftPost[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ============ EVENTS ============

export type EventRankingMode = 'fastest_time' | 'most_distance' | 'most_elevation' | 'first_finish';
export type RankingModeOption = {description?: string; value: EventRankingMode, name: string};
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
  latitude: number;
  longitude: number;
  coordinates?: [number, number];
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
  // Ranking mode
  ranking_mode?: EventRankingMode;
  target_distance?: number;
  target_elevation?: number;
  time_limit?: number;
  results_finalized?: boolean;
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
  ai_commentary_time_windows?: Array<{ start: string; end: string }> | null;
  ai_commentary_days_of_week?: number[] | null;
  ai_commentary_pause_summary_enabled?: boolean;
  ai_commentary_active_now?: boolean;
  ai_commentary_next_window?: string | null;
  ai_commentary_last_paused_at?: string | null;
  ai_commentary_last_resumed_at?: string | null;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points?: boolean;  // Override GPS privacy for all participants
  start_finish_note?: string | null;   // Explanation why markers are shown
  // Activity aggregation
  allow_multiple_activities?: boolean;  // Allow multiple activities to be aggregated
  // Point rewards
  point_rewards?: EventPointRewards;
  // Registration status
  is_registration_open?: boolean; // DEPRECATED: Use registration_eligibility instead
  is_full?: boolean;
  registration_eligibility?: RegistrationEligibility;
  // Relations
  sport_type?: SportType;
  post?: Post;
  is_registered?: boolean;
  is_owner?: boolean;
  is_watching?: boolean;
  created_at?: string;
  updated_at?: string;
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
  ai_commentary_time_windows?: Array<{ start: string; end: string }> | null;
  ai_commentary_days_of_week?: number[] | null;
  ai_commentary_pause_summary_enabled?: boolean;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points?: boolean;  // Override GPS privacy for all participants
  start_finish_note?: string;          // Explanation why markers are shown (e.g., "Race starts at City Hall")
  // Activity aggregation
  allow_multiple_activities?: boolean;
  // Point rewards
  point_rewards?: EventPointRewards;
}

export interface UpdateEventRequest {
  // Post fields (always allowed)
  title?: string;
  content?: string;
  visibility?: EventVisibility;
  // Event fields (restricted for ongoing/completed)
  sport_type_id?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
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
  ai_commentary_time_windows?: Array<{ start: string; end: string }> | null;
  ai_commentary_days_of_week?: number[] | null;
  ai_commentary_pause_summary_enabled?: boolean;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points?: boolean;  // Override GPS privacy for all participants
  start_finish_note?: string;          // Explanation why markers are shown (e.g., "Race starts at City Hall")
  // Activity aggregation
  allow_multiple_activities?: boolean;
  // Point rewards
  point_rewards?: EventPointRewards;
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
  elevation_gain: number | null;
  calories: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  hr_data_source: HealthDataSource | null;
  source: 'app' | 'garmin' | 'amazfit' | 'strava' | 'gpx_import' | 'manual';
  is_private: boolean;
  // GPS Privacy (new in 2026-01)
  show_start_finish_points: boolean;  // Activity-level privacy override
  can_view_start_finish: boolean;     // Whether current viewer can see markers
  privacy_settings?: {                // Only for activity owner
    show_start_finish_points: boolean;
    has_privacy_zones: boolean;
  };
  // Live tracking fields
  status: 'in_progress' | 'paused' | 'completed';
  is_active: boolean;
  total_paused_duration: number;
  last_point_at: string | null;
  has_gps_track: boolean;
  route_svg?: string | null;
  route_map_url?: string | null;
  sport_type?: SportType;
  gps_track?: GpsTrack;
  photos?: Photo[];
  user?: User;
  is_owner?: boolean;
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
}

// ============ ACTIVITY BOOSTS ============

export interface ActivityBoost {
  id: number;
  activity_id: number;
  user_id: number;
  created_at: string;
}

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
}

// Nearby route for shadow track feature
export interface NearbyRoute {
  id: number;
  title: string;
  distance: number;  // meters
  elevation_gain: number;  // meters
  duration: number;  // seconds
  sport_type_id: number;
  user: {
    id: number;
    name: string;
    username: string;  // @username
    avatar: string;  // Backend uses 'avatar' not 'avatar_url'
  };
  stats: {
    likes_count: number;
    boosts_count: number;  // Backend uses boosts instead of completions
  };
  track_data: GeoJSONLineString;
  distance_from_user: number;  // meters from search location
  created_at: string;
}

// Request for adding GPS points to live activity
export interface AddActivityPointsRequest {
  points: GpsPoint[];
  // Optional stats sync (for crash recovery - sync periodically)
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
}

// Response from adding GPS points to live activity
export interface AddActivityPointsResponse {
  message: string;
  points_count: number;    // Points added in this batch
  total_points: number;    // Total GPS points
  stats: {
    distance: number;      // Total meters
    duration: number;      // Total seconds (excludes paused time)
    elevation_gain: number; // Total meters climbed
    calories?: number;     // Current calories (if synced)
    avg_speed?: number;    // Average speed in m/s (server-calculated)
    max_speed?: number;    // Maximum speed in m/s (server-calculated)
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
  track_data?: GeoJSONLineString;
}

// Request data for finishing a live activity
export interface FinishActivityRequest {
  title?: string;
  description?: string;
  ended_at?: string;
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  location?: ActivityLocation;
  skip_auto_post?: boolean;
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
    distance_splits: Array<{
      distance: number;
      time: number;
      pace: string;
    }>;
    time_splits: Array<{
      time: number;
      distance: number;
      speed: number;
    }>;
  };
  post?: AutoCreatedPost;
}

export interface GpsTrack {
  id: number;
  activity_id: number;
  track_data: GeoJSONLineString;       // Privacy-aware: trimmed if viewer is not owner
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
  svg_generated_at: string | null;
  map_generated_at: string | null;
  // GPS Privacy (new in 2026-01)
  show_start_marker: boolean;          // Whether viewer can see start marker
  show_finish_marker: boolean;         // Whether viewer can see finish marker
  start_point: [number, number, number?] | null;  // Start coords [lng, lat, ele?] or null if hidden
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
  distance: number;         // Cumulative distance in meters
  timestamp: string;
  elevation: number;        // Elevation in meters
  speed: number;           // Speed in m/s
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
  duration: number;                    // seconds for this km
  pace: string;                        // formatted pace (e.g., "5:42")
  cumulative_duration: number;         // total seconds up to this km
  cumulative_distance: number;         // total meters up to this km
  elevation_gain: number;              // meters gained in this km
  elevation_loss: number;              // meters lost in this km
  avg_heart_rate: number | null;       // average bpm for this km
  max_heart_rate: number | null;       // max bpm for this km
  avg_speed: number | null;            // m/s average for this km
  max_speed: number | null;            // m/s max for this km
  avg_cadence: number | null;          // steps per minute
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
    distance: number;           // meters
    duration: number;           // seconds
    elevation_gain: number;     // meters
  };
  performance: {
    pace: {
      average: number | null;   // seconds per kilometer
      formatted: string;        // e.g., "5:42"
    };
    speed: {
      average: number | null;   // m/s
      max: number | null;       // m/s
    };
    heart_rate: {
      average: number | null;   // bpm
      max: number | null;       // bpm
    };
    calories: number | null;    // kcal
  };
  splits: SplitsSummary | null;
  has_data: {
    elevation: boolean;
    heart_rate: boolean;
    speed: boolean;
    cadence: boolean;
  };
}

// ============ COMMENTS ============

// Note: Activity comments now use 'post' type via activity.post_id
export type CommentableType = 'post' | 'event';

export interface Comment {
  id: number;
  user_id: number;
  commentable_type: CommentableType;
  commentable_id: number;
  parent_id: number | null;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at?: string;
  user?: User;
  replies?: Comment[];
  photos?: Photo[];
  videos?: Video[];
  media?: Media[];
  is_liked?: boolean;
  mentions?: MentionMap;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: number;
  photo?: MediaItem;
}

// ============ PHOTOS & MEDIA ============

export interface Photo {
  id: number;
  user_id: number;
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  url: string;
}

export interface Media {
  id: number;
  user_id: number;
  type: 'image' | 'video';
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null; // video duration in seconds
  thumbnail_url: string | null; // video thumbnail
  caption: string | null;
  url: string;
}

export interface Video {
  id: number;
  url: string;
  thumbnail_url: string | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  caption: string | null;
  order: number;
  created_at: string;
}

// Local media item for picking/uploading
export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  duration?: number;
  width?: number;
  height?: number;
}

// ============ FOLLOWS ============

// Follow status value type
export type FollowStatusValue = 'pending' | 'accepted' | 'rejected' | null;

// Follow request resource
export interface FollowRequest {
  id: number;
  follower: User;
  following: User;
  status: 'pending' | 'accepted' | 'rejected';
  requested_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

export interface FollowStatus {
  is_following: boolean;
  is_followed_by: boolean;
  follow_status: FollowStatusValue;  // New field
  followed_by_status: FollowStatusValue;  // New field
}

export interface UserWithFollowCounts extends User {
  followers_count: number;
  following_count: number;
}

// API list response for follow requests (paginated)
export interface ApiListResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ============ USER BLOCKING ============

export interface BlockedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  blocked_at: string; // ISO datetime
}

export interface BlockStatus {
  is_blocking: boolean;      // You blocked them
  is_blocked_by: boolean;    // They blocked you
  has_relationship: boolean; // Either direction
}

export interface BlockedUsersResponse {
  data: BlockedUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ============ CONTENT REPORTING ============

export type ReportableType = 'post' | 'comment' | 'activity' | 'user' | 'message';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'impersonation'
  | 'copyright'
  | 'other';

export interface CreateReportRequest {
  reportable_type: ReportableType;
  reportable_id: number;
  reason: ReportReason;
  description?: string; // Optional, max 500 chars
}

export interface ReportResponse {
  message: string;
}

// ============ STATISTICS ============

export interface UserStats {
  activities: {
    total: number;
    this_month: number;
    total_distance: number;
    total_duration: number;
  };
  posts: {
    total: number;
    total_likes: number;
  };
  events: {
    registered: number;
    attended: number;
  };
  social: {
    followers: number;
    following: number;
  };
}

export interface ActivityStats {
  count: number;
  totals: {
    distance: number;
    duration: number;
    elevation_gain: number;
    calories: number;
  };
  averages: {
    distance: number;
    duration: number;
    speed: number;
    heart_rate: number;
  };
  bests: {
    longest_distance: ActivityBest | null;
    longest_duration: ActivityBest | null;
    fastest_speed: ActivityBest | null;
  };
  by_sport_type: Record<
    number,
    {
      count: number;
      distance: number;
      duration: number;
    }
  >;
}

export interface ActivityBest {
  id: number;
  title: string;
  distance?: number;
  duration?: number;
  max_speed?: number;
  date: string;
}

export interface WeeklyStats {
  week_start: string;
  week_end: string;
  totals: {
    count: number;
    distance: number;
    duration: number;
  };
  daily: Record<
    string,
    {
      count: number;
      distance: number;
      duration: number;
    }
  >;
}

// ============ MILESTONES ============

export interface MilestoneSingle {
  type: string;
  threshold: number;
  achieved: boolean;
  activity_id: number | null;
  first_date: string | null;
  progress: number;
}

export interface MilestoneTotal {
  type: string;
  threshold: number;
  achieved: boolean;
  current: number;
  achieved_date: string | null;
  progress: number;
}

export interface MilestoneStreak {
  type: string;
  threshold: number;
  achieved: boolean;
  best_streak: number;
  current_streak: number;
  current_streak_start: string | null;
}

export interface MilestonesData {
  sport_type_id: number | null;
  distance_single: MilestoneSingle[];
  distance_total: MilestoneTotal[];
  elevation_single: MilestoneSingle[];
  elevation_total: MilestoneTotal[];
  activity_count: MilestoneTotal[];
  consistency: MilestoneStreak[];
}

// ============ POINTS & LEADERBOARD ============

export interface UserPointStats {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  global_rank: number;
  weekly_rank: number;
  monthly_rank: number;
  total_transactions: number;
  activity_points: number;
  event_points: number;
}

export type LeaderboardPeriod = 'all_time' | 'weekly' | 'monthly';

export interface LeaderboardUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  points: number;
  user: LeaderboardUser;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  leaderboard: LeaderboardEntry[];
}

export interface EventLeaderboardResponse {
  event_id: number;
  leaderboard: LeaderboardEntry[];
}

export interface UserStatsResponse {
  user: LeaderboardUser;
  stats: UserPointStats;
}

export type PointTransactionType = 'activity' | 'event_place' | 'event_finish' | 'bonus' | 'adjustment';

export interface PointTransaction {
  id: number;
  points: number;
  type: PointTransactionType;
  description: string;
  created_at: string;
}

export interface PointHistoryPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PointHistoryResponse {
  transactions: PointTransaction[];
  pagination: PointHistoryPagination;
}

// ============ MENTIONS ============

export interface MentionEntity {
  type: 'user' | 'event' | 'activity';
  id: number;
  name: string;
  username?: string;
  avatar?: string;
  url: string;
}

export type MentionMap = Record<string, MentionEntity>;

export interface MentionSearchUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
}

export interface MentionSearchEvent {
  id: number;
  title?: string;
  name?: string;
  location: string | null;
}

export interface MentionSearchActivity {
  id: number;
  title?: string;
  name?: string;
}

// ============ PAGINATION ============

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

// ============ MESSAGING ============

export interface ConversationParticipant {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
}

export interface LastMessage {
  id: number;
  content: string | null;
  type: 'text' | 'activity';
  sender_id: number;
  created_at: string;
}

export interface Conversation {
  id: number;
  participant: ConversationParticipant;
  last_message: LastMessage | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: ConversationParticipant;
  content: string | null;
  type: 'text' | 'activity';
  is_own: boolean;
  created_at: string;
}

export interface StartConversationRequest {
  user_id: number;
}

export interface SendMessageRequest {
  content: string;
  type?: 'text';
}

// ============ SEARCH ============

export interface SearchResultCategory<T> {
  data: T[];
  count: number;
}

export interface SearchResponse {
  query: string;
  total_count: number;
  results: {
    users: SearchResultCategory<User>;
    events: SearchResultCategory<Event>;
    posts: SearchResultCategory<Post>;
  };
}

export interface SearchUsersResponse {
  query: string;
  total_count: number;
  results: {
    users: SearchResultCategory<User>;
  };
}

// ============ API RESPONSE ============

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  training_week_id?: number; // Present when trying to delete activity linked to training plan
  hint?: string; // Hint message for force deletion
}

// ============ DEBUG LOGS ============

export type DebugLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type DebugLogCategory = 'gps' | 'api' | 'auth' | 'activity' | 'navigation' | 'general';

export interface DebugLogEntry {
  timestamp: string;
  level: DebugLogLevel;
  message: string;
  context?: Record<string, any>;
  stack_trace?: string;
}

export interface DebugLogsRequest {
  device_info: {
    platform: string;
    os_version: string;
    app_version: string;
    device_model: string;
    device_id: string;
  };
  session_id: string;
  logs: DebugLogEntry[];
}

export interface DebugLogsResponse {
  message: string;
  log_reference: string;
}

// ============ BRAND ASSETS ============

export interface BrandAsset {
  filename: string;
  url: string;
  type: string;
  size: number;
  category: string;
  variant: string;
}

export type BrandAssetVariant = 'default' | 'dark' | 'light';
export type BrandAssetCategory = 'logo-full' | 'logo-icon' | 'logo-text';

export interface BrandAssetsResponse {
  data: Record<BrandAssetCategory, Record<BrandAssetVariant, BrandAsset>>;
  meta: {
    base_url: string;
    total_assets: number;
  };
}

export interface BrandAssetResponse {
  data: BrandAsset;
}

// ============ NOTIFICATIONS ============

export type NotificationType =
  | 'likes'
  | 'comments'
  | 'follows'
  | 'mentions'
  | 'boosts'
  | 'activity_reactions'
  | 'messages'
  | 'event_reminders'
  | 'ai_post_ready'
  | 'points_awarded'
  | 'weekly_summary'
  | 'training_week_feedback';

export interface NotificationData {
  type: NotificationType;
  actor_id: number;
  actor_name: string;
  actor_username: string;
  actor_avatar: string | null;
  timestamp: string;
  url: string | null;
  // Type-specific fields (may not be present in all notifications)
  post_id?: number;
  activity_id?: number;
  comment_id?: number;
  event_id?: number;
  conversation_id?: number;
  likeable_type?: 'post' | 'activity' | 'comment';
  likeable_id?: number;
  commentable_type?: 'post' | 'activity';
  commentable_id?: number;
  // Training week feedback fields
  week_id?: number;
  week_number?: number;
  program_name?: string;
  overall_rating?: string;
}

export interface Notification {
  id: string;
  user_id: number;
  type: NotificationType;
  data: {
    type: NotificationType;
    title: string;
    body: string;
    data: NotificationData;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    unread_count: number;
  };
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAsReadResponse {
  message: string;
  data: {
    id: string;
    read_at: string;
  };
}

export interface MarkAllAsReadResponse {
  message: string;
  marked_count: number;
}

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

export type CommentaryLanguage = 'en' | 'pl';

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
  time_windows?: Array<{ start: string; end: string }> | null;
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
  time_windows?: Array<{ start: string; end: string }> | null;
  days_of_week?: number[] | null;
  pause_summary_enabled?: boolean;
}

export interface GenerateCommentaryRequest {
  type: CommentaryType;
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
  | 'register';

/** Home screen version - controlled by API */
export type HomeVersion = 'legacy' | 'dynamic';

export interface HomePrimaryCta {
  action: HomeCtaAction;
  label: string;
  subtitle?: string;
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
  // UI-only types (not from backend config)
  | 'upcoming_events'
  | 'auth_prompt'
  | 'quick_actions';

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

  /** Additional data for weather_insight section */
  weather?: {
    temperature: number;
    feels_like: number;
    condition: string;
    icon?: string;
    is_good_for_outdoor?: boolean;
    recommendation?: string;
  };

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
    top_participants?: Array<{
      user: HomeSectionFriend;
      position: number;
      distance_km?: number;
      duration_minutes?: number;
    }>;
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

// ============ APP CONFIG (Public) ============

export type PushProvider = 'expo' | 'fcm';

export interface AppConfigPush {
  /** Which push provider the server expects: 'expo' or 'fcm' */
  provider: PushProvider;
  /** Which Expo method to use: 'getExpoPushTokenAsync' or 'getDevicePushTokenAsync' */
  token_method: 'getExpoPushTokenAsync' | 'getDevicePushTokenAsync';
}

export interface AppConfigResponse {
  push: AppConfigPush;
}

// ============ DEVICE REGISTRATION (Push Notifications) ============

export type DeviceType = 'ios' | 'android';

export interface DeviceRegistrationRequest {
  fcm_token: string;
  device_type: DeviceType;
}

export interface DeviceRegistrationResponse {
  message: string;
  device_id: number;
}

export interface DeviceUnregisterResponse {
  message: string;
}

// Push notification payload received from FCM/APNs via Expo
export interface PushNotificationData {
  type: NotificationType;
  title?: string;
  body?: string;
  // Backend-provided URL for navigation (priority source)
  url?: string;
  timestamp?: string;
  // Navigation data (fallback if URL not provided)
  post_id?: number;
  activity_id?: number;
  event_id?: number;
  user_id?: number;
  conversation_id?: number;
  comment_id?: number;
  // Type-specific data
  likeable_type?: 'post' | 'activity' | 'comment';
  likeable_id?: number;
  commentable_type?: 'post' | 'activity' | 'event';
  commentable_id?: number;
  // Points awarded data
  place?: number;
  points?: number;
  event_title?: string;
  // Message data (FCM uses app_ prefix for reserved keys)
  app_message_type?: string;
  // Actor info
  actor_id?: number;
  actor_name?: string;
  actor_username?: string;
  actor_avatar?: string;
  // Training week feedback data
  week_id?: number;
  week_number?: number;
  program_name?: string;
  overall_rating?: string;
}

// ============ SOCIAL SHARING ============

export interface ShareLinkPlatform {
  url: string;
  text?: string;
}

export interface  ShareLinkResponse {
  url: string;
  title: string;
  description: string;
  hashtags?: string[];
  image?: string | null;
  platforms: {
    facebook: ShareLinkPlatform;
    twitter: ShareLinkPlatform;
    linkedin: ShareLinkPlatform;
    whatsapp: ShareLinkPlatform;
    telegram: ShareLinkPlatform;
  };
}

// ============ TRAINING PLANS ============

export type ExperienceLevel = 'beginner' | 'recreational' | 'regular';
export type GuidanceLevel = 'minimal' | 'standard' | 'coach_like';
export type RecoveryProfile = 'low' | 'medium' | 'high';
export type ProgramStatus = 'pending' | 'processing' | 'active' | 'paused' | 'abandoned' | 'completed' | 'failed';
export type PausedReason = 'injury' | 'vacation' | 'burnout' | 'other';
export type WeekStatus = 'upcoming' | 'current' | 'active' | 'completed' | 'skipped';
export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface TrainingGoal {
  id: number;
  key: string;
  name: string;
  description: string;
  sport_type_id: number;
  is_active: boolean;
  requires_target_distance: boolean;
  requires_target_date: boolean;
  default_duration_weeks: number;
}

export interface CalibrationData {
  sport_type_id: number;
  training_goal_id: number;
  experience_level: ExperienceLevel;
  sessions_per_week: number; // 1-7
  guidance_level: GuidanceLevel;
  recovery_profile: RecoveryProfile;
  injury_history?: boolean;
  target_distance?: number; // meters
  target_date?: string; // ISO date
}

export interface TrainingCalibration {
  id: number;
  sport_type_id: number;
  training_goal_id: number;
  experience_level: ExperienceLevel;
  sessions_per_week: number;
  guidance_level: GuidanceLevel;
  recovery_profile: RecoveryProfile;
  injury_history: boolean;
  target_distance: number | null;
  target_date: string | null;
  is_current: boolean;
  calibrated_at: string;
  created_at: string;
  sport_type: {
    id: number;
    name: string;
  };
  training_goal: TrainingGoal;
}

export interface TrainingProgram {
  id: number;
  name: string;
  sport_type_id: number;
  training_goal_id: number;
  status: ProgramStatus;
  start_date: string;
  planned_end_date: string | null;
  total_weeks: number;
  current_week_number: number | null;
  weeks_added: number;
  weeks_skipped: number;
  current_guidance_level: string;
  auto_link_activities: boolean;
  allowed_sport_types: number[] | null;
  paused_at: string | null;
  pause_reason: string | null;
  template?: {
    id: number;
    name: string;
    description: string;
  };
  current_week?: TrainingWeek | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingActivity {
  id: number;
  week_id: number;
  day_of_week: number; // 1=Monday, 7=Sunday
  activity_type: string;
  duration_minutes: number | null;
  distance_meters: number | null;
  pace_target: string | null;
  intensity: string | null;
  description: string;
  notes: string | null;
  status: ActivityStatus;
  completed_at: string | null;
  linked_activity_id?: number | null;
}

export interface SuggestedActivity {
  id: number;
  session_order: number;
  activity_type: string;
  intensity_description: string;
  target_distance_meters: number | null;
  target_duration_minutes: number | null;
  notes: string | null;
}

export interface TrainingWeek {
  id: number;
  program_id?: number;
  week_number: number;
  phase_name: string;
  start_date: string;
  end_date: string;
  status: WeekStatus;
  focus_description: string;
  educational_notes: string | null;
  progress: {
    activities_count: number;
    sessions_per_week: number; // 1-7
    suggested_activities_count: number;
    total_distance: number;
    total_duration: number;
  };
  notes: string | null;
  activities?: TrainingActivity[];
  suggested_activities?: SuggestedActivity[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface CreateCalibrationResponse {
  data: TrainingCalibration;
}

export interface InitProgramResponse {
  program?: TrainingProgram;
  data?: TrainingProgram;
  message?: string;
}

export interface GetProgramResponse {
  program?: TrainingProgram;
  data?: TrainingProgram;
}

export interface GetCurrentProgramResponse {
  program?: TrainingProgram | null;
  data?: TrainingProgram | null;
}

export interface GetWeeksResponse {
  data: TrainingWeek[];
}

export interface GetWeekResponse {
  data: TrainingWeek;
}

export interface CompleteWeekResponse {
  data: TrainingWeek;
  message: string;
}

export interface SkipWeekResponse {
  data: TrainingWeek;
  message: string;
}

export interface UpdateWeekNotesRequest {
  notes: string;
}

export interface UpdateWeekNotesResponse {
  data: TrainingWeek;
  message: string;
}

export interface PauseProgramRequest {
  reason: PausedReason;
}

export interface PauseProgramResponse {
  message: string;
}

export interface ResumeProgramResponse {
  message: string;
}

export interface AbandonProgramResponse {
  message: string;
}

export interface InitProgramRequest {
  auto_link_activities?: boolean;
  allowed_sport_types?: number[];
}

export interface UpdateProgramSettingsRequest {
  guidance_level?: GuidanceLevel;
  auto_link_activities?: boolean;
  allowed_sport_types?: number[];
}

export interface UpdateProgramSettingsResponse {
  message: string;
}

export interface LinkActivityToWeekResponse {
  data: TrainingWeek;
  message: string;
}

export interface UnlinkActivityFromWeekResponse {
  data: TrainingWeek;
  message: string;
}

// ============ WEEK FEEDBACK ============

export type OverallRating = 'excellent' | 'good' | 'needs_improvement' | 'poor';
export type MatchStatus = 'completed' | 'partial' | 'missed';
export type TrendDirection = 'improving' | 'declining' | 'maintaining';

export interface ComplianceData {
  sessions: {
    completed: number;
    suggested: number;
    percentage: number;
  };
  distance: {
    completed_km: number;
    suggested_km: number;
    completed_meters: number;
    suggested_meters: number;
    percentage: number;
  };
  duration: {
    completed_seconds: number;
    suggested_seconds: number;
    completed_formatted: string;
    suggested_formatted: string;
    percentage: number;
  };
}

export interface ActivityMatch {
  suggested: {
    activity_type: string;
    target_distance_meters: number | null;
    target_duration_minutes: number | null;
  };
  matched_activity_id: number | null;
  matched_distance_km: number | null;
  matched_duration_formatted: string | null;
  matched_pace: number | null;
  status: MatchStatus;
}

export interface Highlights {
  longest_activity_distance_km: number | null;
  longest_activity_duration_formatted: string | null;
  total_elevation_gain: number;
  total_calories: number;
  avg_pace: number | null;
}

export interface TrendData {
  vs_previous_week: TrendDirection | null;
  distance_change_pct: number | null;
  duration_change_pct: number | null;
}

export interface CoachMessage {
  key: string;
  message: string;
}

export interface WeekFeedback {
  week_id: number;
  week_number: number;
  program_name: string;
  program_goal: string | null;
  compliance: ComplianceData;
  activity_matching: ActivityMatch[];
  highlights: Highlights;
  trends: TrendData;
  consistency_score: number;
  coach_messages: CoachMessage[];
  overall_rating: OverallRating;
}

export interface WeekFeedbackResponse extends ApiResponse<WeekFeedback> {}

// ============ TRAINING TIPS ============

export type TipCategory = 'mindset' | 'recovery' | 'technique' | 'nutrition' | 'sleep' | 'pacing';
export type TipStatus = 'draft' | 'active' | 'archived';
export type AiMode = 'silent' | 'reactive' | 'proactive';

export interface TrainingTip {
  id: number;
  title: string;
  content: string | null; // Null in list view, full content in detail view
  category: TipCategory;
  emotional_load: number; // 1-3
  priority: number;
  status: TipStatus;
  translated_title?: string; // Present if Accept-Language header sent
  translated_content?: string; // Present if Accept-Language header sent
  created_at: string;
  updated_at: string;
}

export interface AvailableTipsResponse {
  data: TrainingTip[];
}

export interface TipDetailResponse {
  data: TrainingTip;
}

export interface MarkTipHelpfulRequest {
  helpful: boolean;
}

export interface MarkTipHelpfulResponse {
  message: string;
}

export interface MentalBudget {
  max_tips_per_week: number;
  tips_delivered_this_week: number;
  remaining_tips: number;
  max_emotional_load_per_week: number;
  emotional_load_used: number;
  remaining_load: number;
  ai_mode: AiMode;
  week_start_date: string;
  week_end_date: string;
}

export interface MentalBudgetResponse {
  data: MentalBudget;
}

export interface UpdateMentalBudgetRequest {
  max_tips_per_week?: number; // 0-10
  ai_mode?: AiMode;
}

export interface UpdateMentalBudgetResponse {
  data: MentalBudget;
  message: string;
}

// ============ REWARDS ============

export type RewardType = 'points' | 'coupon' | 'badge' | 'prize';

// Event data (simplified for rewards)
export interface EventData {
  id: number;
  name: string;
}

// Points Reward
export interface PointReward {
  id: number;
  reward_type: 'points';
  earned_at: string;
  points: number;
  description: string;
  type: string;
  event_id?: number;
  event?: EventData;
}

// Coupon Reward
export interface CouponReward {
  id: number;
  reward_type: 'coupon';
  earned_at: string;
  place: number;
  status: 'pending' | 'sent' | 'cancelled';
  event_id: number;
  event?: EventData;
  coupon: {
    code: string;
    title: string;
    description: string;
    discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
    discount_value: string;
    currency: string;
    expires_at: string;
    is_active: boolean;
  };
}

// Prize Reward
export interface PrizeReward {
  id: number;
  reward_type: 'prize';
  earned_at: string;
  place: number;
  status: 'pending' | 'sent' | 'cancelled';
  event_id: number;
  event?: EventData;
  prize: {
    name: string;
    description: string;
    value: string;
    currency: string;
    image_url?: string;
  };
}

// Badge Reward
export interface BadgeReward {
  id: number;
  reward_type: 'badge';
  earned_at: string;
  is_new: boolean;
  viewed_at: string | null;
  badge: {
    id: number;
    name: string;
    description: string;
    icon: string;
    icon_url: string | null;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    rarity_color: string;
  };
  metadata?: {
    activity_id?: number;
    event_id?: number;
    distance?: number;
    elevation_gain?: number;
    [key: string]: any;
  };
}

// Union type for all rewards
export type Reward = PointReward | CouponReward | PrizeReward | BadgeReward;

// Rewards response
export interface RewardsResponse {
  data: Reward[];
  total_points: number;
  total_coupons: number;
  total_badges: number;
}

// Query parameters for rewards endpoint
export interface RewardsQueryParams {
  type?: 'points' | 'coupon' | 'badge' | 'prize';
  event_id?: number;
}
