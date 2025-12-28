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
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: 'Bearer';
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

// ============ USER PREFERENCES ============

export interface UserPreferences {
  units: 'metric' | 'imperial';
  language: 'en' | 'pl';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email_weekly_summary: boolean;
    email_event_reminders: boolean;
    push_likes: boolean;
    push_comments: boolean;
    push_follows: boolean;
    push_messages: boolean;
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
  };
}

// ============ SPORT TYPES ============

export interface SportType {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
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
  event?: Event;
  activity?: Activity;
  is_liked?: boolean;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
  visibility?: 'public' | 'followers' | 'private';
  status?: 'draft' | 'published';
}

// ============ EVENTS ============

export interface Event {
  id: number;
  created_by: number;
  post_id: number;
  sport_type_id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  max_participants: number | null;
  participants_count: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance: number | null;
  entry_fee: number | null;
  cover_image: string | null;
  cover_image_url: string | null;
  sport_type?: SportType;
  post?: Post;
  is_registered?: boolean;
  available_spots?: number | null;
}

export interface CreateEventRequest {
  title: string;
  content: string;
  sport_type_id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string;
  registration_opens_at?: string;
  registration_closes_at?: string;
  max_participants?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance?: number;
  entry_fee?: number;
}

export interface UpdateEventRequest {
  title?: string;
  content?: string;
  sport_type_id?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  starts_at?: string;
  ends_at?: string;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  max_participants?: number | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance?: number | null;
  entry_fee?: number | null;
  cover_image?: string;
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
  source: 'app' | 'garmin' | 'amazfit' | 'strava' | 'gpx_import' | 'manual';
  is_private: boolean;
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
  duration_formatted?: string;
  distance_formatted?: string;
  pace?: string | null;
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

export interface GpsTrack {
  id: number;
  activity_id: number;
  track_data: GeoJSONLineString;
  points_count: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  simplified_track: GeoJSONLineString;
  route_svg: string | null;
  route_map_url: string | null;
  svg_generated_at: string | null;
  map_generated_at: string | null;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

// ============ COMMENTS ============

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  likes_count: number;
  created_at: string;
  user?: User;
  replies?: Comment[];
  is_liked?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: number;
}

// ============ PHOTOS ============

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

// ============ FOLLOWS ============

export interface FollowStatus {
  is_following: boolean;
  is_followed_by: boolean;
}

export interface UserWithFollowCounts extends User {
  followers_count: number;
  following_count: number;
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

// ============ API RESPONSE ============

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
