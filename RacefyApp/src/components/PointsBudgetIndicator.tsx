import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { borderRadius, fontSize, spacing } from '../theme';
import type { EventPointsBudget, EventPointsBudgetPreviewRequest } from '../types/api';

export interface PointsBudgetIndicatorProps {
  /** Sport type id (required for preview) */
  sportTypeId: number | null;
  /** Distance in meters (required) */
  distance: number | null;
  /** Optional elevation gain in meters */
  elevationGain?: number | null;
  /** Optional target elevation override in meters */
  targetElevation?: number | null;
  /** Max participants (required for preview) */
  maxParticipants: number | null;
  /** Allocated points from current reward inputs (1st + 2nd + 3rd + finisher × est) */
  allocated: number;
  /** Whether the event is sponsored (skips premium gating server-side) */
  isSponsored?: boolean;
  /** For existing event: fetch persisted budget instead of preview */
  eventId?: number;
  /** Called whenever validity (allocated <= pool) changes */
  onValidityChange?: (valid: boolean) => void;
  /** Called whenever prerequisite completeness changes */
  onPrerequisitesChange?: (ready: boolean) => void;
  /** Called when a fresh budget snapshot is available */
  onBudgetChange?: (budget: EventPointsBudget | null) => void;
}

const DEBOUNCE_MS = 400;

/**
 * Live indicator for the event points pool. Three states:
 *  1. Missing prerequisites (sport_type + distance|elevation + max_participants)
 *  2. Pool ready (preview fetched, allocated may be 0 or > 0)
 *  3. Pool exceeded (allocated > pool) — red border + error
 */
export function PointsBudgetIndicator({
  sportTypeId,
  distance,
  elevationGain,
  targetElevation,
  maxParticipants,
  allocated,
  isSponsored,
  eventId,
  onValidityChange,
  onPrerequisitesChange,
  onBudgetChange,
}: PointsBudgetIndicatorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [budget, setBudget] = useState<EventPointsBudget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReqIdRef = useRef(0);

  // Prerequisites check: need sport_type, max_participants, and either distance or elevation
  const hasEffort = (distance != null && distance > 0) || (elevationGain != null && elevationGain > 0);
  const prerequisitesReady = !!sportTypeId && hasEffort && !!maxParticipants && maxParticipants > 0;

  // Notify parent about prerequisite changes
  useEffect(() => {
    onPrerequisitesChange?.(prerequisitesReady);
  }, [prerequisitesReady, onPrerequisitesChange]);

  // Build a stable key from preview-relevant inputs to drive debounced refetch
  const previewKey = useMemo(
    () =>
      JSON.stringify({
        sportTypeId,
        distance,
        elevationGain,
        targetElevation,
        maxParticipants,
        isSponsored: !!isSponsored,
        eventId,
      }),
    [sportTypeId, distance, elevationGain, targetElevation, maxParticipants, isSponsored, eventId]
  );

  // Fetch preview (debounced) or persisted budget when inputs change
  useEffect(() => {
    if (!prerequisitesReady && !eventId) {
      setBudget(null);
      onBudgetChange?.(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const reqId = ++lastReqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        let result: EventPointsBudget;
        if (eventId && !prerequisitesReady) {
          result = await api.getEventPointsBudget(eventId);
        } else {
          const payload: EventPointsBudgetPreviewRequest = {
            sport_type_id: sportTypeId!,
            distance: distance ?? undefined,
            elevation_gain: elevationGain ?? undefined,
            target_elevation: targetElevation ?? undefined,
            max_participants: maxParticipants ?? undefined,
            is_sponsored: isSponsored,
          };
          result = await api.previewPointsBudget(payload);
        }
        // Drop stale responses
        if (reqId !== lastReqIdRef.current) return;
        setBudget(result);
        onBudgetChange?.(result);
      } catch (err: any) {
        if (reqId !== lastReqIdRef.current) return;
        logger.debug('api', 'Points budget preview failed', { error: err });
        setBudget(null);
        setError(err?.message || 'Failed to load points budget');
        onBudgetChange?.(null);
      } finally {
        if (reqId === lastReqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  // Notify validity (allocated <= pool)
  const exceeded = budget != null && allocated > budget.pool;
  useEffect(() => {
    // Valid when: budget present and not exceeded, OR no budget yet (treat as valid until prereqs met)
    onValidityChange?.(budget == null ? true : !exceeded);
  }, [budget, exceeded, onValidityChange]);

  // ---------- Render: missing prerequisites ----------
  if (!prerequisitesReady && !budget) {
    const missing: string[] = [];
    if (!sportTypeId) missing.push(t('events.pointsBudget.prereqSportType'));
    if (!hasEffort) missing.push(t('events.pointsBudget.prereqEffort'));
    if (!maxParticipants) missing.push(t('events.pointsBudget.prereqMaxParticipants'));

    return (
      <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerRow}>
          <Ionicons name="trophy-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('events.pointsBudget.title')}</Text>
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('events.pointsBudget.prereqTitle')}</Text>
        {missing.map((m) => (
          <Text key={m} style={[styles.hintItem, { color: colors.textMuted }]}>• {m}</Text>
        ))}
      </View>
    );
  }

  // ---------- Render: loading ----------
  if (loading && !budget) {
    return (
      <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('events.pointsBudget.loading')}</Text>
        </View>
      </View>
    );
  }

  // ---------- Render: error ----------
  if (error && !budget) {
    return (
      <View style={[styles.container, { borderColor: colors.error, backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerRow}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={[styles.title, { color: colors.error }]}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!budget) return null;

  const remaining = budget.pool - allocated;

  // ---------- Render: pool ready / exceeded ----------
  return (
    <View
      style={[
        styles.container,
        {
          borderColor: exceeded ? colors.error : colors.border,
          backgroundColor: colors.cardBackground,
          borderWidth: exceeded ? 2 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="trophy" size={18} color={exceeded ? colors.error : colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('events.pointsBudget.title')}</Text>
        {budget.is_sponsored && (
          <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {t('events.pointsBudget.sponsored')}
            </Text>
          </View>
        )}
        {loading && <ActivityIndicator size="small" color={colors.textMuted} style={{ marginLeft: 'auto' }} />}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('events.pointsBudget.pool')}</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{budget.pool.toLocaleString()}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('events.pointsBudget.allocated')}</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{allocated.toLocaleString()}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('events.pointsBudget.remaining')}</Text>
          <Text style={[styles.statValue, { color: exceeded ? colors.error : colors.primary }]}>
            {remaining.toLocaleString()}
          </Text>
        </View>
      </View>

      <Text style={[styles.estimated, { color: colors.textSecondary }]}>
        {t('events.pointsBudget.estimatedFinishers')}: {budget.estimated_finishers}
      </Text>

      {exceeded && (
        <Text style={[styles.exceededText, { color: colors.error }]}>
          {t('events.pointsBudget.exceeded')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  hint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  hintItem: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: 2,
  },
  estimated: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  exceededText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
