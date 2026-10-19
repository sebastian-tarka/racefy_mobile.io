import type { TipCategory } from '../types/api';

/** Accent color and emoji per training-tip category (tip card and tip detail). */
export const TIP_CATEGORY_CONFIG: Record<TipCategory, { color: string; emoji: string }> = {
  mindset: { color: '#3B82F6', emoji: '🧠' },
  recovery: { color: '#10B981', emoji: '💪' },
  technique: { color: '#8B5CF6', emoji: '🎯' },
  nutrition: { color: '#F59E0B', emoji: '🍎' },
  sleep: { color: '#6366F1', emoji: '😴' },
  pacing: { color: '#EF4444', emoji: '🏃' },
};
