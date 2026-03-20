import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { SubscriptionTier, SubscriptionFeatures, SubscriptionUsage } from '../types/api';

const DEFAULT_FREE_FEATURES: SubscriptionFeatures = {
  ai_posts_monthly: 0,
  ai_post_on_finish: false,
  events_monthly: 2,
  event_prizes: false,
  event_ai_commentary: false,
  privacy_zones: 1,
  training_programs: 1,
  training_summaries: false,
  advanced_stats: false,
  share_link_permanent: false,
  points_multiplier: 1,
  gpx_export: false,
  exclusive_badges: false,
};

export function useSubscription() {
  const { user } = useAuth();
  const sub = user?.subscription;

  return useMemo(() => ({
    tier: (sub?.tier ?? 'free') as SubscriptionTier,
    isPremium: sub?.is_premium ?? false,
    isTrial: sub?.is_trial ?? false,
    isActive: sub?.is_active ?? false,
    trialEndsAt: sub?.trial_ends_at ?? null,
    expiresAt: sub?.expires_at ?? null,
    remainingDays: sub?.remaining_days ?? null,
    provider: sub?.provider ?? null,
    features: sub?.features ?? DEFAULT_FREE_FEATURES,
    usage: sub?.usage ?? { ai_posts_monthly: 0, events_monthly: 0, privacy_zones: 0, training_programs: 0 },
    canUse: (feature: keyof SubscriptionFeatures): boolean => {
      const val = sub?.features?.[feature];
      if (val === undefined) return false;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === -1 || val > 0;
      return false;
    },
    hasRemaining: (feature: keyof SubscriptionUsage): boolean => {
      const limit = sub?.features?.[feature];
      if (limit === undefined) return false;
      if (typeof limit !== 'number') return false;
      if (limit === -1) return true; // unlimited
      const used = sub?.usage?.[feature] ?? 0;
      return used < limit;
    },
  }), [sub]);
}