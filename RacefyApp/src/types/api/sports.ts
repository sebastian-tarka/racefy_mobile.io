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
  // Stationary detection
  stationary_speed_threshold?: number; // Speed in m/s below which user is considered stationary (0.1-3)
  // Pace display settings (optional - API may not provide these yet)
  pace_smoothing_factor?: number; // EMA alpha for pace smoothing (0.1-0.9)
  pace_window_seconds?: number; // Time window for current pace calculation (20-120s)
  min_distance_for_pace?: number; // Min meters before showing any pace (20-200m)
  min_segment_distance?: number; // Min meters in window for valid current pace (10-100m)
  // Background sync settings (optional - API may not provide these yet)
  background_sync_interval?: number; // Interval in ms for background GPS sync (60000-600000)
  background_sync_enabled?: boolean; // Enable background sync for this sport
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
  // Stationary detection
  stationary_speed_threshold?: number;
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
