import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';
import type { StrengthHighlight, StrengthProgress, StrengthSetValue } from '../../types/api';
import {
  formatKg,
  formatVolume,
  highlightDelta,
  progressDelta,
  setDetailLabel,
  setLabel,
  weightUnit,
} from './strengthSession';

/**
 * Strength formatters bound to the UI language and the athlete's units — the
 * API always speaks kg; imperial users read lb. Mirror of the web SPA's
 * `useStrengthFormat`.
 */
export function useStrengthFormat() {
  const { t, i18n } = useTranslation();
  const { units } = useUnits();
  const locale = i18n.language;

  return useMemo(
    () => ({
      units,
      locale,
      unit: weightUnit(units),
      kg: (v: number | null | undefined) => formatKg(v, locale, units),
      volume: (v: number | null | undefined) => formatVolume(v, locale, units),
      set: (s: StrengthSetValue | null | undefined) => setLabel(s, locale, units),
      setDetail: (s: StrengthSetValue) => setDetailLabel(s, locale, units),
      delta: (h: StrengthHighlight) => highlightDelta(h, t, locale, units),
      progress: (p: StrengthProgress) => progressDelta(p, t, locale, units),
    }),
    [t, locale, units],
  );
}

export type StrengthFormat = ReturnType<typeof useStrengthFormat>;
