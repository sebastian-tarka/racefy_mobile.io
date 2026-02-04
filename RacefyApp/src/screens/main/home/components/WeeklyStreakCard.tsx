import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../../../theme';

interface WeeklyStreakCardProps {
  activeDays: boolean[];
  todayIndex: number;
  goalDays: number;
  completedDays: number;
}

export const WeeklyStreakCard: React.FC<WeeklyStreakCardProps> = ({
  activeDays,
  todayIndex,
  goalDays,
  completedDays,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const dayLabels = t('home.weeklyStreak.days', { returnObjects: true }) as string[];

  const renderDayBox = (index: number) => {
    const isCompleted = activeDays[index];
    const isToday = index === todayIndex;
    const isFuture = index > todayIndex;
    const isMissed = !isCompleted && !isToday && !isFuture;

    return (
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
                  : colors.borderLight,
                borderWidth: isToday ? 2 : 0,
                borderColor: colors.primary,
                borderStyle: isToday ? 'dashed' : 'solid',
              },
            ]}
          >
            {isMissed && <Text style={{ color: colors.textMuted }}>–</Text>}
          </View>
        )}
        <Text
          style={[
            styles.dayLabel,
            {
              color: isToday ? colors.primary : colors.textMuted,
              fontWeight: isToday ? fontWeight.bold : fontWeight.medium,
            }
          ]}
        >
          {dayLabels[index]}
        </Text>
      </View>
    );
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
        <Text style={[styles.progress, { color: colors.orange }]}>
          {t('home.weeklyStreak.progress', { completed: completedDays, goal: goalDays })}
        </Text>
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
});
