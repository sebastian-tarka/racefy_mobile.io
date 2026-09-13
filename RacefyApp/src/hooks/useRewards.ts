import { useMemo } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type {
  BadgeReward,
  CouponReward,
  PointReward,
  PrizeReward,
  RewardsResponse,
} from '../types/api';

interface UseRewardsResult {
  badges: BadgeReward[];
  coupons: CouponReward[];
  prizes: PrizeReward[];
  points: PointReward[];
  totals: { points: number; coupons: number; badges: number };
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Everything the athlete has won, split by kind.
 *
 * One request rather than four: `/user/rewards` returns every kind in a single
 * list with aggregate totals alongside, and the cabinet on the profile needs
 * the badges and the totals at the same moment anyway.
 */
export function useRewards(): UseRewardsResult {
  const { data, isLoading, error, refetch } = useFetch<RewardsResponse>(
    () => api.getUserRewards(),
    { errorMessage: 'Failed to load rewards' },
  );

  const split = useMemo(() => {
    const rewards = data?.data ?? [];
    return {
      badges: rewards.filter((r): r is BadgeReward => r.reward_type === 'badge'),
      coupons: rewards.filter((r): r is CouponReward => r.reward_type === 'coupon'),
      prizes: rewards.filter((r): r is PrizeReward => r.reward_type === 'prize'),
      points: rewards.filter((r): r is PointReward => r.reward_type === 'points'),
    };
  }, [data]);

  return {
    ...split,
    totals: {
      points: data?.total_points ?? 0,
      coupons: data?.total_coupons ?? 0,
      badges: data?.total_badges ?? split.badges.length,
    },
    isLoading,
    error,
    refetch,
  };
}
