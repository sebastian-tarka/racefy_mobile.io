import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useUnits } from '../../hooks';
import type { TeamActivityBoardState } from '../../hooks/useTeamActivityBoard';
import { Button, Card, EmptyState, FilterChip, TeamActivityRow } from '../../components';
import { fontSize, spacing } from '../../theme';

interface TeamActivityBoardTabProps {
  board: TeamActivityBoardState;
  onActivityPress: (activityId: number) => void;
}

/**
 * Team "Activities" tab: this week in numbers, sport chips and the members'
 * finished activities the viewer may see. The host screen owns the hook (so its
 * pull-to-refresh and scroll-to-end can drive it); this is the presentation.
 */
export function TeamActivityBoardTab({ board, onActivityPress }: TeamActivityBoardTabProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort } = useUnits();

  const {
    week,
    leader,
    activities,
    sports,
    sportTypeId,
    setSportTypeId,
    isPrivate,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
  } = board;

  const chips = useMemo(
    () => [
      { id: null as number | null, label: t('teamBoard.allSports') },
      ...sports.map((sport) => ({ id: sport.id as number | null, label: sport.name })),
    ],
    [sports, t],
  );

  if (isPrivate) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title={t('teams.statsPrivate')}
        message={t('teams.statsPrivateDescription')}
      />
    );
  }

  if (isLoading && activities.length === 0) {
    return (
      <View style={styles.loading} testID="team-board-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && activities.length === 0) {
    return <EmptyState icon="alert-circle-outline" title={t('common.error')} message={error} />;
  }

  return (
    <View testID="team-board">
      {week && (
        <Card style={styles.section} testID="team-board-week">
          <View style={styles.weekHead}>
            <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
              {t('teamBoard.thisWeek')}
            </Text>
            {leader && (
              <Text
                style={[styles.weekLeader, { color: colors.textMuted }]}
                numberOfLines={1}
                testID="team-board-leader"
              >
                {t('teamBoard.mostActive', {
                  name: leader.user.name,
                  distance: formatDistanceShort(leader.total_distance),
                })}
              </Text>
            )}
          </View>
          <View style={styles.weekRow}>
            <WeekMetric
              label={t('teams.distance')}
              value={formatDistanceShort(week.total_distance)}
              color={colors.textPrimary}
              labelColor={colors.textMuted}
            />
            <WeekMetric
              label={t('teams.activities')}
              value={String(week.activities_count)}
              color={colors.textPrimary}
              labelColor={colors.textMuted}
            />
            <WeekMetric
              label={t('teamBoard.activeMembers')}
              value={String(week.active_members)}
              color={colors.textPrimary}
              labelColor={colors.textMuted}
            />
          </View>
        </Card>
      )}

      {sports.length > 1 && (
        <View style={styles.chips} testID="team-board-chips">
          {chips.map((chip) => (
            <FilterChip
              key={chip.id ?? 'all'}
              label={chip.label}
              active={sportTypeId === chip.id}
              onPress={() => setSportTypeId(chip.id)}
            />
          ))}
        </View>
      )}

      {activities.length === 0 ? (
        <EmptyState
          icon="footsteps-outline"
          title={t('teamBoard.emptyTitle')}
          message={t('teamBoard.emptyDesc')}
        />
      ) : (
        <Card style={styles.section} testID="team-board-list">
          {activities.map((activity, index) => (
            <TeamActivityRow
              key={activity.id}
              activity={activity}
              onPress={onActivityPress}
              showDivider={index < activities.length - 1}
            />
          ))}
          {isLoadingMore ? (
            <ActivityIndicator color={colors.primary} style={styles.footer} />
          ) : hasMore ? (
            <Button
              title={t('teamBoard.loadMore')}
              onPress={loadMore}
              variant="outline"
              style={styles.footer}
            />
          ) : null}
        </Card>
      )}
    </View>
  );
}

function WeekMetric({
  label,
  value,
  color,
  labelColor,
}: {
  label: string;
  value: string;
  color: string;
  labelColor: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xl * 2, alignItems: 'center' },
  section: { marginBottom: spacing.md },
  weekHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weekLeader: { fontSize: fontSize.xs, flexShrink: 1 },
  weekRow: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: fontSize.lg, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: fontSize.xs, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  footer: { marginTop: spacing.sm },
});
