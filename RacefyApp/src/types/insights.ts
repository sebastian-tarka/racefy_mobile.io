import type { SubscriptionTier } from './api';

export interface InsightsResponse {
  data: {
    tier: SubscriptionTier;
    has_data: boolean;
    sections: Partial<InsightsSections>;
    locked_sections: LockedSection[];
    comparisons: Partial<InsightsComparisons>;
    aggregated_at: string | null;
    last_activity_at: string | null;
  };
}

export interface InsightsSections {
  activity_summary: ActivitySummary;
  streak_data: StreakData;
  trends: TrendsData;
  time_patterns: TimePatterns;
  milestone_progress: MilestoneProgress;
  training_context: Record<string, unknown>;
  social_profile: SocialProfile;
  points_summary: PointsSummary;
  event_history: EventHistory;
  weather_profile: WeatherProfile;
  favorite_routes: FavoriteRoutes;
  route_fingerprints: RouteFingerprint[];
}

export interface LockedSection {
  name: string;
  required_tier: SubscriptionTier;
}

export interface InsightsComparisons {
  week_over_week: SnapshotComparison;
  month_over_month: SnapshotComparison;
  three_month: SnapshotComparison;
}

export interface SnapshotComparison {
  period: string;
  days_since: number;
  activity_count_change?: number;
  distance_change_pct?: number;
  streak_improvement?: number;
  rank_change?: number;
  pace_improvement?: Record<string, number>;
}

export interface ActivitySummary {
  total_count: number;
  total_distance_km: number;
  total_duration_hours: number;
  total_elevation_m: number;
  total_calories: number;
  first_activity_date?: string;
  by_sport_type?: Record<string, SportStats>;
}

export interface SportStats {
  count: number;
  total_distance_km: number;
  total_duration_hours: number;
  total_elevation_m: number;
  avg_distance_km?: number;
  avg_duration_min?: number;
  best_distance_km?: number;
  best_duration_min?: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  activities_this_week: number;
  activities_this_month: number;
  weekly_consistency?: number;
  total_active_days?: number;
}

export interface TrendsData {
  weekly: {
    this_week: { count: number; distance_km: number; duration_min: number };
    last_week: { count: number; distance_km: number; duration_min: number };
    distance_change_pct: number | null;
    count_change: number;
  };
  monthly?: {
    this_month: { count: number; distance_km: number };
    last_month: { count: number; distance_km: number };
    distance_change_pct: number | null;
  };
  weekly_breakdown?: WeeklyBreakdown[];
}

export interface WeeklyBreakdown {
  week_start: string;
  count: number;
  distance_km: number;
  duration_min: number;
}

export interface TimePatterns {
  preferred_time_slot: 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  peak_hour: number;
  preferred_day: string;
  weekend_pct: number;
  hour_distribution: number[];
  day_distribution: Record<string, number>;
}

export interface MilestoneProgress {
  next_milestones: Milestone[];
  recently_achieved: { category: string; type: string }[];
}

export interface Milestone {
  category: string;
  type: string;
  threshold: number;
  progress: number;
  current?: number;
}

export interface WeatherProfile {
  activities_with_weather: number;
  preferred_temperature: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot';
  temperature_distribution: Record<string, number>;
  top_conditions: Record<string, number>;
}

export interface FavoriteRoutes {
  top_locations: TopLocation[];
  route_clusters: { city: string; count: number; label: string }[];
  unique_cities_count: number;
}

export interface TopLocation {
  city: string;
  region?: string;
  country?: string;
  count: number;
  avg_distance_km: number;
  last_used?: string;
}

export interface RouteFingerprint {
  activity_count: number;
  city: string | null;
  label: string;
  is_loop: boolean;
  distance_km: number;
}

export interface SocialProfile {
  followers: number;
  following: number;
  active_friends_this_week: number;
}

export interface PointsSummary {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  global_rank: number;
  weekly_rank: number;
}

export interface EventHistory {
  total_registered: number;
  total_attended: number;
  upcoming: number;
  recent_events: { event_name: string; status: string; date: string }[];
}
