import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { triggerHaptic } from '../../../../hooks/useHaptics';
import { spacing, borderRadius, fontSize, fontWeight } from '../../../../theme';
import type { TrainingDay } from '../../../../hooks/useTrainingReminders';

interface WeeklyStreakCardProps {
  activeDays: boolean[];
  todayIndex: number;
  goalDays: number;
  completedDays: number;
  trainingDays?: TrainingDay[];
  plannedTrainingDays?: number[];  // From API: current week's training activities (0=Mon, 6=Sun)
  onToggleTrainingDay?: (day: TrainingDay) => void;
  onSettingsPress?: () => void;
}

export const WeeklyStreakCard: React.FC<WeeklyStreakCardProps> = ({
  activeDays,
  todayIndex,
  goalDays,
  completedDays,
  trainingDays,
  plannedTrainingDays,
  onToggleTrainingDay,
  onSettingsPress,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const dayLabels = t('home.weeklyStreak.days', { returnObjects: true }) as string[];

  const renderDayBox = (index: number) => {
    const isCompleted = activeDays[index];
    const isToday = index === todayIndex;
    const isFuture = index > todayIndex;
    const isMissed = !isCompleted && !isToday && !isFuture;
    const isTrainingDay = trainingDays?.includes(index as TrainingDay);
    const isPlannedDay = plannedTrainingDays?.includes(index);

    const dayContent = (
      <View key={index} style={styles.dayContainer}>
        {isCompleted ? (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayBox}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.dayBox,
              {
                backgroundColor: isMissed
                  ? colors.border
                  : isToday
                  ? colors.cardBackground
                  : isPlannedDay && isFuture
                  ? colors.primary + '12'
                  : colors.borderLight,
                borderWidth: isToday ? 2 : (isTrainingDay || (isPlannedDay && isFuture)) ? 1.5 : 0,
                borderColor: isToday ? colors.primary : colors.primaryLight,
                borderStyle: isToday ? 'dashed' : 'solid',
              },
            ]}
          >
            {isPlannedDay && !isCompleted && !isMissed && (
              <Ionicons name="barbell-outline" size={14} color={colors.primaryLight} />
            )}
            {!isPlannedDay && isTrainingDay && !isToday && !isMissed && (
              <View style={[styles.trainingDot, { backgroundColor: colors.primaryLight }]} />
            )}
            {isMissed && !isPlannedDay && <Text style={{ color: colors.textMuted }}>–</Text>}
            {isMissed && isPlannedDay && (
              <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
            )}
          </View>
        )}
        <Text
          style={[
            styles.dayLabel,
            {
              color: isToday ? colors.primary : (isTrainingDay || isPlannedDay) ? colors.primary : colors.textMuted,
              fontWeight: isToday || isTrainingDay || isPlannedDay ? fontWeight.bold : fontWeight.medium,
            }
          ]}
        >
          {dayLabels[index]}
        </Text>
      </View>
    );

    if (onToggleTrainingDay) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => {
            triggerHaptic();
            onToggleTrainingDay(index as TrainingDay);
          }}
          activeOpacity={0.7}
        >
          {dayContent}
        </TouchableOpacity>
      );
    }

    return dayContent;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="flame" size={20} color="#f59e0b" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('home.weeklyStreak.title')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.progress, { color: colors.orange }]}>
            {t('home.weeklyStreak.progress', { completed: completedDays, goal: goalDays })}
          </Text>
          {onSettingsPress && (
            <TouchableOpacity onPress={onSettingsPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.daysGrid}>
        {activeDays.map((_, index) => renderDayBox(index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  progress: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  trainingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});