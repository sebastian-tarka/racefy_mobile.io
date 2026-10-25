import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { fontSize, fontWeight, msFont, spacing } from '../../theme';
import type { ActiveDay } from '../../types/insights';
import { getSportIcon } from '../../utils/sportIcon';

const WEEKS = 12;
const GAP = 3;

type IconName = keyof typeof Ionicons.glyphMap;

function iconFor(sport: { name: string; icon: string }): IconName {
  return sport.icon && sport.icon in Ionicons.glyphMap
    ? (sport.icon as IconName)
    : getSportIcon(sport.name);
}

/** YYYY-MM-DD of a local date. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  days: ActiveDay[];
  onOpenActivity: (activityId: number) => void;
}

/**
 * The last 12 weeks, one column per week (Monday on top), one cell per day.
 * A day with one activity shows its sport icon, with more the first icon and
 * "+N". Tapping a day lists what was done that day.
 */
export function ActiveDaysGrid({ days, onOpenActivity }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceFromKm } = useUnits();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const today = isoDay(new Date());

  // Monday of the current week, then 12 weeks back.
  const columns = useMemo(() => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const first = new Date(monday);
    first.setDate(first.getDate() - (WEEKS - 1) * 7);
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + d);
        return isoDay(date);
      }),
    );
  }, []);

  const cell = width > 0 ? Math.floor((width - GAP * (WEEKS - 1)) / WEEKS) : 0;
  const selectedDay = selected ? byDate.get(selected) : null;

  return (
    <View>
      <View
        style={styles.grid}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={t('insights.streak.activeDaysA11y', { count: days.length })}
      >
        {cell > 0 &&
          columns.map((week) => (
            <View key={week[0]} style={{ gap: GAP }}>
              {week.map((date) => {
                const day = byDate.get(date);
                const count = day?.activities.length ?? 0;
                const future = date > today;
                const isSelected = date === selected;
                return (
                  <TouchableOpacity
                    key={date}
                    disabled={count === 0}
                    onPress={() => setSelected(isSelected ? null : date)}
                    style={[
                      styles.cell,
                      {
                        width: cell,
                        height: cell,
                        backgroundColor:
                          count > 0
                            ? colors.primary + '26'
                            : future
                              ? 'transparent'
                              : colors.border,
                        borderColor: isSelected
                          ? colors.primary
                          : date === today
                            ? colors.textPrimary
                            : 'transparent',
                      },
                    ]}
                    accessibilityLabel={
                      count > 0
                        ? `${date}: ${day!.activities.map((a) => a.title).join(', ')}`
                        : undefined
                    }
                  >
                    {count > 0 && (
                      <Ionicons
                        name={iconFor(day!.activities[0].sport)}
                        size={Math.max(cell * 0.55, 8)}
                        color={colors.primaryDark}
                      />
                    )}
                    {count > 1 && cell >= 18 && (
                      <Text style={[styles.more, { color: colors.primaryDark }]}>+{count - 1}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
      </View>

      {selectedDay && (
        <View style={[styles.dayList, { borderTopColor: colors.border }]}>
          <Text style={[styles.dayTitle, { color: colors.textSecondary }]}>
            {new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString(i18n.language, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          {selectedDay.activities.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.dayRow}
              onPress={() => onOpenActivity(a.id)}
              accessibilityRole="button"
            >
              <Ionicons name={iconFor(a.sport)} size={16} color={colors.primary} />
              <Text style={[styles.dayName, { color: colors.textPrimary }]} numberOfLines={1}>
                {a.title}
              </Text>
              {a.distance_km > 0 && (
                <Text style={[styles.dayValue, { color: colors.textSecondary }]}>
                  {formatDistanceFromKm(a.distance_km)}
                </Text>
              )}
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    position: 'absolute',
    right: 1,
    bottom: 0,
    fontSize: msFont(7),
    fontWeight: fontWeight.bold,
  },
  dayList: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dayTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayName: {
    flex: 1,
    fontSize: fontSize.md,
  },
  dayValue: {
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
});
