import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection, ProgramPhaseIntroMeta } from '../../../../../types/api';

interface ProgramPhaseIntroSectionProps {
  section: HomeSection;
  onPress?: () => void;
}

/**
 * Program Phase Intro section.
 *
 * Shown when the current week opens a new phase of the training program —
 * an explainer card with the phase name and where the user is in the program.
 */
export function ProgramPhaseIntroSection({ section, onPress }: ProgramPhaseIntroSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const meta = section.meta as ProgramPhaseIntroMeta | undefined;
  const weekNumber = meta?.week_number;
  const totalWeeks = meta?.total_weeks;
  // `label` is the generic overline; the program name is a good stand-in.
  const overline = section.label || meta?.program_name;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primary + '12' }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="flag-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          {overline && (
            <Text style={[styles.overline, { color: colors.primary }]} numberOfLines={1}>
              {overline}
            </Text>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{section.title}</Text>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
      </View>

      {weekNumber !== undefined && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {totalWeeks
              ? t('home.training.weekOf', { week: weekNumber, total: totalWeeks })
              : t('home.training.week', { week: weekNumber })}
          </Text>
          {meta?.phase_name && (
            <Text style={[styles.phaseName, { color: colors.textSecondary }]} numberOfLines={1}>
              · {meta.phase_name}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  phaseName: {
    flex: 1,
    fontSize: fontSize.xs,
  },
});
