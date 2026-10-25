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

export type PointTransactionType =
  | 'activity'
  | 'event_place'
  | 'event_finish'
  | 'bonus'
  | 'adjustment';

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
    icon_emoji?: string | null;
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
