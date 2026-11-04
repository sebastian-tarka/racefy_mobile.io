import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, Loading, ScreenContainer } from '../../components';
import {
  EventResultCard,
  EventResultShareSheet,
  EventScoreboard,
  EventWinnerCard,
  type ScoreboardTile,
  type StandingRowModel,
  formatPrimaryMetric,
  primaryMetricLabel,
  rankedRowToModel,
} from '../../components/event';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useFetch } from '../../hooks/useFetch';
import { useEventResults } from '../../hooks/useEventResults';
import { useEventStandings } from '../../hooks/useEventStandings';
import { api } from '../../services/api';
import { borderRadius, fontSize, msFont, spacing, withAlpha } from '../../theme';
import { formatTotalTime } from '../../utils/formatters';
import { metricForMode, sumBy } from '../../utils/eventStandings';
import { formatIntlDateTime } from '../../utils/dateFormat';
import type { Event } from '../../types/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventResults'>;

export function EventResultsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { eventId } = route.params;
  const [shareOpen, setShareOpen] = useState(false);

  const { data: event } = useFetch<Event>(() => api.getEvent(eventId), {
    deps: [eventId],
    logCategory: 'api',
  });

  const results = useEventResults(eventId, { enabled: true });
  // Until the organizer finalizes, the ranking is the last live standings — read once, no polling.
  const standings = useEventStandings(eventId, {
    enabled: results.results != null && !results.isFinalized,
    pollMs: 0,
  });

  const isFinalized = results.isFinalized;
  const mode = results.rankingMode ?? standings.rankingMode ?? event?.ranking_mode;
  const rows = isFinalized ? results.rows : standings.rows;
  const teamRows = isFinalized ? results.teamRows : standings.teamRows;
  const dnfRows = results.dnfRows;
  const viewerResult = results.viewerResult;
  const isLoading = results.isLoading || (!isFinalized && standings.isLoading);

  const rowOptions = useMemo(() => ({ mode, units, t }), [mode, units, t]);
  const individualRows = useMemo(
    () => [
      ...rows.map((r) => rankedRowToModel(r, rowOptions)),
      ...dnfRows.map((r) => rankedRowToModel(r, rowOptions)),
    ],
    [rows, dnfRows, rowOptions],
  );
  const teamRowModels = useMemo(
    () => teamRows.map((r) => rankedRowToModel(r, rowOptions)),
    [teamRows, rowOptions],
  );

  const tiles = useMemo<ScoreboardTile[]>(() => {
    const finishers = isFinalized ? rows.length : rows.filter((r) => r.isFinished).length;
    const participants = rows.length + dnfRows.length;
    const winner = rows[0] ?? null;
    const list: ScoreboardTile[] = [
      {
        icon: 'flag',
        label: t('eventLive.stats.finished', 'Finished'),
        value: String(finishers),
        note:
          participants > 0
            ? t('eventLive.stats.ofParticipants', { total: participants })
            : undefined,
      },
      {
        icon: 'trophy',
        label: t('eventLive.stats.winner', 'Winner'),
        value: winner ? formatPrimaryMetric(winner, mode, units) : '—',
        note: winner ? (winner.team?.name ?? winner.user?.name ?? undefined) : undefined,
        color: colors.rank.gold,
      },
    ];
    const key = metricForMode(mode);
    if (key === 'duration') {
      const finished = rows.filter((r) => r.duration > 0);
      list.push({
        icon: 'time',
        label: t('eventLive.stats.average', 'Average'),
        value: finished.length
          ? formatTotalTime(sumBy(finished, 'duration') / finished.length)
          : '—',
      });
      list.push({
        icon: 'trending-up',
        label: t('eventLive.stats.totalElevation', 'Total climb'),
        value: units.formatElevation(sumBy(rows, 'elevation')),
      });
    } else {
      list.push({
        icon: 'navigate',
        label: t('eventDetail.totalDist', 'Total dist'),
        value: units.formatDistanceShort(sumBy(rows, 'distance')),
      });
      list.push({
        icon: 'trending-up',
        label: t('eventLive.stats.totalElevation', 'Total climb'),
        value: units.formatElevation(sumBy(rows, 'elevation')),
      });
    }
    return list;
  }, [rows, dnfRows, isFinalized, mode, units, t, colors]);

  const goToCommentary = useCallback(
    () => navigation.navigate('EventCommentary', { eventId }),
    [navigation, eventId],
  );
  const goToActivity = useCallback(
    (activityId: number) => navigation.navigate('ActivityDetail', { activityId }),
    [navigation],
  );
  const goToProfile = useCallback(
    (username: string) => navigation.navigate('UserProfile', { username }),
    [navigation],
  );
  const handleRowPress = useCallback(
    (row: StandingRowModel) => {
      if (row.activityId != null) goToActivity(row.activityId);
    },
    [goToActivity],
  );

  const loaded = results.results != null;
  const showEmpty = loaded && !isLoading && !results.error && individualRows.length === 0;
  const winner = rows[0] ?? null;
  const isParticipant = viewerResult != null && viewerResult.state !== 'not_started';
  const endedAt = event?.ends_at
    ? formatIntlDateTime(event.ends_at, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('eventDetail.finalResults', 'Final results')}
        </Text>
        {loaded ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isFinalized
                  ? withAlpha(colors.primaryLight, 0.16)
                  : withAlpha(colors.warning, 0.16),
              },
            ]}
            testID="results-status-pill"
          >
            <Ionicons
              name={isFinalized ? 'checkmark-circle' : 'time-outline'}
              size={13}
              color={isFinalized ? colors.primary : colors.warning}
            />
            <Text
              style={[styles.statusText, { color: isFinalized ? colors.primary : colors.warning }]}
            >
              {(isFinalized
                ? t('eventResult.official', 'Official results')
                : t('eventResult.provisional', 'Provisional results')
              ).toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {event?.post?.title ? (
          <View style={styles.hero}>
            <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
              {event.post.title}
            </Text>
            {endedAt ? (
              <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                {t('eventStatus.completed', 'Completed')} · {endedAt}
              </Text>
            ) : null}
          </View>
        ) : null}

        {loaded && !isFinalized ? (
          <View style={[styles.notice, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
            <Ionicons name="information-circle" size={18} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              {t('eventResult.provisionalNote')}
            </Text>
          </View>
        ) : null}

        {isLoading && !loaded ? <Loading /> : null}

        {viewerResult && isParticipant ? (
          <EventResultCard
            result={viewerResult}
            rankingMode={mode}
            onShare={() => setShareOpen(true)}
            onViewActivity={goToActivity}
          />
        ) : loaded && winner ? (
          <EventWinnerCard
            winner={winner}
            rankingMode={mode}
            finishers={isFinalized ? rows.length : rows.filter((r) => r.isFinished).length}
            participants={rows.length + dnfRows.length}
            dnfCount={dnfRows.length}
            onProfilePress={isAuthenticated ? goToProfile : undefined}
          />
        ) : null}

        {showEmpty ? (
          <EmptyState
            icon="trophy-outline"
            title={t('eventDetail.noResultsTitle', 'Results not final yet')}
            message={t(
              'eventDetail.noResultsMessage',
              'Final placements will appear once the organizer finalizes them.',
            )}
          />
        ) : loaded ? (
          <EventScoreboard
            tiles={tiles}
            individualRows={individualRows}
            teamRows={teamRowModels}
            currentUserId={user?.id}
            listTitle={`${t('eventDetail.finalStandings', 'Final standings')} · ${primaryMetricLabel(mode, t)}`}
            emptyText={t('eventDetail.noStandingsYet', 'No results.')}
            onRowPress={isAuthenticated ? handleRowPress : undefined}
          />
        ) : null}

        {!showEmpty && loaded ? (
          <TouchableOpacity activeOpacity={0.85} onPress={goToCommentary}>
            <Card style={styles.commentaryLink}>
              <Ionicons name="sparkles" size={18} color={colors.ai} />
              <Text style={[styles.commentaryText, { color: colors.textSecondary }]}>
                {t('commentary.raceCommentary', 'Race commentary')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {viewerResult?.state === 'finished' ? (
        <EventResultShareSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          eventId={eventId}
          activityId={viewerResult.activity_id}
          provisional={viewerResult.provisional}
        />
      ) : null}
    </ScreenContainer>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: msFont(10),
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  hero: {
    gap: 2,
  },
  eventTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: fontSize.sm,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  commentaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentaryText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
