import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';

export type QuickGoalChoice = 'open' | 'distance' | 'time';

interface Props {
  /** "5.0 km" / "30:00" when a goal is set, null for an open activity. */
  label: string | null;
  /** Open the configurator, optionally preselecting a goal type. */
  onOpen: (type?: Exclude<QuickGoalChoice, 'open'>) => void;
  onClear: () => void;
}

/**
 * The GOAL block on the idle screen (mockup: "New activity"). Without a goal
 * it is a three-way segmented control — Open stays selected, Distance/Time
 * jump straight into the sheet with that type chosen. With a goal it becomes
 * a row card: value, "tap to change", chevron.
 */
export function WorkoutGoalRow({ label, onOpen, onClear }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        {t('recording.workout.sectionGoal').toUpperCase()}
      </Text>

      {label ? (
        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={() => onOpen()}
          activeOpacity={0.8}
          accessibilityLabel={t('recording.workout.changeGoal')}
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.primary + '1F' }]}>
            <Ionicons name="flag" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={[styles.rowHint, { color: colors.textMuted }]} numberOfLines={1}>
              {t('recording.workout.rowHint')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityLabel={t('recording.workout.clearGoal')}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.segmented, { backgroundColor: colors.background + 'E6' }]}>
          {(['open', 'distance', 'time'] as QuickGoalChoice[]).map((choice) => {
            const active = choice === 'open';
            return (
              <TouchableOpacity
                key={choice}
                style={[
                  styles.segment,
                  active && { backgroundColor: colors.cardBackground, ...styles.segmentActive },
                ]}
                onPress={() => (choice === 'open' ? undefined : onOpen(choice))}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {t(
                    choice === 'open'
                      ? 'recording.workout.typeOpen'
                      : choice === 'distance'
                        ? 'recording.workout.distance'
                        : 'recording.workout.time',
                  )}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs + 2,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowHint: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
