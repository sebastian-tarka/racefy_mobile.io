import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { PlanWarning } from '../../types/api';

interface Props {
  warnings: PlanWarning[];
  onDismiss?: () => void;
}

const fmtDate = (value: unknown) =>
  typeof value === 'string'
    ? new Date(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

/**
 * Renders the `warnings` array returned by `initialize` / `resume`.
 *
 * These are never errors — the user always got a usable plan and is being told
 * the trade-off the planner made (a deferred start, a shortened plan, a race
 * that falls mid-week). Each code carries its own extra fields, which are
 * passed straight to i18n interpolation.
 */
export function PlanWarningsBanner({ warnings, onDismiss }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (warnings.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.warning + '14', borderColor: colors.warning + '40' },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('training.warnings.title')}
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {warnings.map((warning, index) => (
        <Text
          key={`${warning.code}-${index}`}
          style={[styles.message, { color: colors.textSecondary }]}
        >
          {/* Unknown codes fall back to the code itself rather than rendering blank. */}
          {t([`training.warnings.${warning.code}`, 'training.warnings.fallback'], {
            ...warning,
            start_date: fmtDate(warning.start_date),
            target_date: fmtDate(warning.target_date),
          })}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  message: {
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
});
