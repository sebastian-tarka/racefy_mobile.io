import type { User } from './user';

// ============ SUBSCRIPTIONS ============

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export interface SubscriptionFeatures {
  ai_posts_monthly: number;
  ai_post_on_finish: boolean;
  events_monthly: number;
  event_prizes: boolean;
  event_ai_commentary: boolean;
  recurring_events: boolean; // free: false, plus/pro: true
  event_series_active: number; // active + paused series — free: 0, plus: 3, pro: -1
  privacy_zones: number;
  training_programs: number;
  active_training_programs: number; // concurrent active/paused limit (-1 = unlimited)
  training_summaries: boolean;
  advanced_stats: boolean;
  share_link_permanent: boolean;
  points_multiplier: number;
  gpx_export: boolean;
  exclusive_badges: boolean;
  teams_max: number; // -1 = unlimited
  team_members_max: number; // -1 = unlimited
  coaching_hints_bulk: boolean; // Pro only: generate all hints at once
  live_navigation: boolean; // Pro only: turn-by-turn navigation during activities
  saved_routes: number; // -1 = unlimited, free = 5, plus = 20
  // Training Goals
  goals_max_active: number; // free: 1, plus: 5, pro: -1
  goals_period_week: boolean;
  goals_period_month: boolean;
  goals_period_year: boolean;
  goals_metrics: import('../goals').GoalMetric[]; // free: ['distance'], plus+: all 4
  goals_per_sport_type: boolean;
  goals_history_months: number; // free: 1, plus: 12, pro: -1
  goals_smart_suggestions: boolean;
  goals_pace_warning_notifications: boolean;
}

export interface SubscriptionUsage {
  ai_posts_monthly: number;
  events_monthly: number;
  event_series_active?: number;
  privacy_zones: number;
  training_programs: number;
  teams_max: number;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  is_premium: boolean;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  expires_at: string | null;
  remaining_days: number | null;
  provider: string | null;
  features: SubscriptionFeatures;
  usage: SubscriptionUsage;
}

export interface SubscriptionPlan {
  id: number;
  slug: string;
  name: string;
  tier: SubscriptionTier;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  features: SubscriptionFeatures;
  is_popular: boolean;
}

export interface PremiumErrorResponse {
  message: string;
  feature?: string;
  limit?: {
    feature: string;
    limit: number;
    current_usage: number;
    remaining: number;
  };
  current_tier: SubscriptionTier;
  upgrade_required: true;
}

export interface UserProfilePrivacy {
  profile_visibility: 'public' | 'followers' | 'private';
  show_activities: boolean;
  show_stats: boolean;
  allow_messages: 'everyone' | 'followers' | 'none';
  share_achievements?: boolean;
  show_start_finish_points?: boolean;
}

export interface BadgeData {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  icon_url: string | null;
  icon_emoji?: string | null;
  rarity: 'legendary' | 'epic' | 'rare' | 'common';
  rarity_color: string;
}

export interface AchievementData {
  user_badge_id: number;
  earned_at: string;
  badge: BadgeData;
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
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface MessageResponse {
  message: string;
}
