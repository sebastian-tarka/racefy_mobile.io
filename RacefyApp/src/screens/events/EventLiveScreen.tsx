import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card, EventPinDialog, Loading, ScreenContainer } from '../../components';
import {
  EventRewardsCard,
  EventScoreboard,
  LiveCheerCard,
  LiveMyPlaceCard,
  LiveSpectatorCard,
  LiveVariantPanel,
  type ScoreboardGroup,
  type ScoreboardTile,
  type StandingRowModel,
  StatTile,
  formatPrimaryMetric,
  primaryMetricLabel,
  rankedRowToModel,
} from '../../components/event';
import { CountdownTimer } from '../../components/CountdownTimer';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useFetch } from '../../hooks/useFetch';
import { useEventStandings } from '../../hooks/useEventStandings';
import { useEventWatch } from '../../hooks/useEventWatch';
import { useLiveActivityStatus } from '../../hooks/useLiveActivity';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { borderRadius, fontSize, spacing } from '../../theme';
import {
  eventTarget,
  findViewerRow,
  findViewerTeam,
  isAscendingMode,
} from '../../utils/eventStandings';
import type { Event } from '../../types/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventLive'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Share of the event window already elapsed (0…1) and the "day n of m" for multi-day events. */
function elapsed(event: Event, now: number) {
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const fraction = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const totalDays = Math.ceil((end - start) / DAY_MS);
  const day = Math.min(totalDays, Math.max(1, Math.floor((now - start) / DAY_MS) + 1));
  return { fraction, day, totalDays };
}

export function EventLiveScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { eventId } = route.params;
  const { isTracking, isPaused } = useLiveActivityStatus();
  const [busyDialogVisible, setBusyDialogVisible] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { data: event, refetch: refetchEvent } = useFetch<Event>(() => api.getEvent(eventId), {
    deps: [eventId],
    logCategory: 'api',
  });

  const { rows, teamRows, rankingMode, aggregates, isLoading } = useEventStandings(eventId, {
    enabled: true,
  });

  const navigateToAuth = useCallback(
    () => navigation.navigate('Auth', { screen: 'Login' }),
    [navigation],
  );
  const watch = useEventWatch({
    eventId,
    isAuthenticated,
    initialIsWatching: event?.is_watching ?? false,
    onChange: () => refetchEvent(),
    navigateToAuth,
  });

  const mode = rankingMode ?? event?.ranking_mode;
  const target = eventTarget(event);
  const me = useMemo(() => findViewerRow(rows, user?.id), [rows, user?.id]);
  const myTeam = useMemo(() => findViewerTeam(teamRows, user?.id), [teamRows, user?.id]);
  const isRegistered = !!event?.is_registered || !!event?.user_registration;
  const canJoin = !!event?.is_registration_open && !event?.is_full;

  const rowOptions = useMemo(() => ({ mode, units, t, target }), [mode, units, t, target]);
  const individualRows = useMemo(
    () => rows.map((r) => rankedRowToModel(r, rowOptions)),
    [rows, rowOptions],
  );
  const teamRowModels = useMemo(
    () => teamRows.map((r) => rankedRowToModel(r, rowOptions)),
    [teamRows, rowOptions],
  );

  // Time-based rankings read best split: who is already at the finish, who is still out.
  const groups = useMemo<ScoreboardGroup[] | undefined>(() => {
    if (!isAscendingMode(mode)) return undefined;
    const finished = individualRows.filter((r) => r.finished);
    const out = individualRows.filter((r) => !r.finished);
    const result: ScoreboardGroup[] = [];
    if (finished.length > 0) {
      result.push({
        key: 'finished',
        title: t('eventLive.groups.finished', { n: finished.length, total: individualRows.length }),
        rows: finished,
      });
    }
    if (out.length > 0) {
      result.push({
        key: 'course',
        title: t('eventLive.groups.onCourse', { n: out.length }),
        rows: out,
      });
    }
    return result.length > 0 ? result : undefined;
  }, [individualRows, mode, t]);

  const tiles = useMemo<ScoreboardTile[]>(() => {
    if (!event) return [];
    const leader = aggregates.leader;
    return [
      {
        icon: 'people',
        label: t('eventLive.stats.registered', 'Registered'),
        value: String(event.participants_count),
        note:
          event.max_participants != null
            ? t('eventLive.stats.ofMax', { max: event.max_participants })
            : undefined,
      },
      {
        icon: 'pulse',
        label: t('eventLive.stats.onCourse', 'On course now'),
        value: String(aggregates.racingCount),
        color: colors.primary,
        live: aggregates.racingCount > 0,
      },
      {
        icon: 'flag',
        label: t('eventLive.stats.finished', 'Finished'),
        value: String(aggregates.finishedCount),
        note:
          aggregates.trackedCount > 0
            ? t('eventLive.stats.ofTotal', { pct: aggregates.finishedPct })
            : undefined,
      },
      {
        icon: 'trophy',
        label: t('eventLive.stats.leader', 'Leading'),
        value: leader ? formatPrimaryMetric(leader, mode, units) : '—',
        note: leader ? (leader.team?.name ?? leader.user?.name ?? undefined) : undefined,
        color: colors.rank.gold,
      },
    ];
  }, [event, aggregates, mode, units, t, colors]);

  const goToCommentary = useCallback(
    () => navigation.navigate('EventCommentary', { eventId }),
    [navigation, eventId],
  );
  const goToSpectator = useCallback(
    (activityId: number) => navigation.navigate('LiveSpectator', { activityId }),
    [navigation],
  );
  const handleRowPress = useCallback(
    (row: StandingRowModel) => {
      if (row.activityId != null)
        navigation.navigate('ActivityDetail', { activityId: row.activityId });
    },
    [navigation],
  );

  const handleJoin = useCallback(async () => {
    if (!isAuthenticated) {
      navigateToAuth();
      return;
    }
    if (!event) return;
    // Team events pick a team on the event screen — the join flow lives there.
    if (event.is_team_event) {
      navigation.navigate('EventDetail', { eventId });
      return;
    }
    setIsJoining(true);
    try {
      await api.registerForEvent(event.id);
      await refetchEvent();
      Alert.alert(t('common.success'), t('eventDetail.registrationSuccess'));
    } catch (err: unknown) {
      logger.error('api', 'Live join failed', { eventId, error: err });
      const message = err instanceof Error ? err.message : t('eventDetail.registrationFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsJoining(false);
    }
  }, [isAuthenticated, navigateToAuth, event, navigation, eventId, refetchEvent, t]);

  const progress = event ? elapsed(event, Date.now()) : null;
  const sportName = event?.sport_type?.name;
  const subtitle = [sportName, event?.location_name].filter(Boolean).join(' · ');

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      {/* Header */}
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
          {t('eventLive.title', 'Live')}
        </Text>
        <View style={[styles.liveBadge, { backgroundColor: colors.error }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.onPrimary }]} />
          <Text style={[styles.liveBadgeText, { color: colors.onPrimary }]}>
            {t('home.live', 'LIVE')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {event ? (
          <View style={styles.hero}>
            {subtitle ? (
              <Text style={[styles.heroSub, { color: colors.textMuted }]} numberOfLines={1}>
                {subtitle.toUpperCase()}
              </Text>
            ) : null}
            {event.post?.title ? (
              <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                {event.post.title}
              </Text>
            ) : null}
            <View style={styles.countdownRow}>
              <Text style={[styles.endsIn, { color: colors.textMuted }]}>
                {t('eventDetail.endsIn', 'Ends in')}
              </Text>
              <CountdownTimer
                targetDate={event.ends_at}
                variant="compact"
                showTitle={false}
                icon="flag-outline"
              />
            </View>
            {progress ? (
              <View style={styles.elapsed}>
                <View
                  style={[styles.elapsedTrack, { backgroundColor: colors.borderLight }]}
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.round(progress.fraction * 100),
                  }}
                >
                  <View
                    style={[
                      styles.elapsedFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${Math.round(progress.fraction * 100)}%`,
                      },
                    ]}
                  />
                </View>
                {progress.totalDays > 1 ? (
                  <Text style={[styles.elapsedText, { color: colors.textMuted }]}>
                    {t('eventLive.dayOf', { day: progress.day, total: progress.totalDays })}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {isLoading && rows.length === 0 && !event ? <Loading /> : null}

        {tiles.length > 0 && (
          <View style={styles.tiles}>
            {tiles.map((tile) => (
              <View key={tile.label} style={styles.tileWrap}>
                <StatTile {...tile} />
              </View>
            ))}
          </View>
        )}

        {event && isRegistered ? (
          <LiveMyPlaceCard
            event={event}
            rows={rows}
            rankingMode={mode}
            me={me}
            team={myTeam}
            cta={{
              recording: isTracking || isPaused,
              onStart: () =>
                navigation.navigate('Main', {
                  screen: 'Record',
                  params: { preselectedEvent: event },
                }),
              onResume: () => navigation.navigate('Main', { screen: 'Record' }),
              onBusy: () => setBusyDialogVisible(true),
            }}
          />
        ) : event && !event.is_owner ? (
          <LiveSpectatorCard
            canJoin={canJoin}
            isTeamEvent={!!event.is_team_event}
            isJoining={isJoining}
            onJoin={handleJoin}
            isWatching={watch.isWatching}
            isWatchToggling={watch.isToggling}
            onToggleWatch={watch.toggleWatch}
          />
        ) : null}

        {isAuthenticated ? (
          <LiveCheerCard rows={rows} currentUserId={user?.id} onCheer={goToSpectator} />
        ) : null}

        {event ? (
          <LiveVariantPanel event={event} rows={rows} myTeam={myTeam} currentUserId={user?.id} />
        ) : null}

        <EventScoreboard
          tiles={[]}
          individualRows={individualRows}
          individualGroups={groups}
          teamRows={teamRowModels}
          currentUserId={user?.id}
          listTitle={`${t('eventDetail.liveStandings', 'Live standings')} · ${primaryMetricLabel(mode, t)}`}
          emptyText={t('eventDetail.noStandingsYet', 'No results yet — the race just started.')}
          podiumLabel={t('eventLive.podiumNow', 'Podium now')}
          onRowPress={isAuthenticated ? handleRowPress : undefined}
        />

        <TouchableOpacity activeOpacity={0.85} onPress={goToCommentary}>
          <Card style={styles.commentaryLink}>
            <Ionicons name="sparkles" size={18} color={colors.ai} />
            <Text style={[styles.commentaryText, { color: colors.textSecondary }]}>
              {t('eventDetail.autoRefresh', 'Updating live · auto-refresh 30s')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </TouchableOpacity>

        {event?.point_rewards ? <EventRewardsCard event={event} /> : null}
      </ScrollView>

      {/* An activity is already running: no switching mid-recording. */}
      <EventPinDialog
        visible={busyDialogVisible}
        icon="calendar-outline"
        title={t('eventPin.busyTitle')}
        body={t('eventPin.busyBody')}
        primaryLabel={t('eventPin.finishSave')}
        secondaryLabel={t('eventPin.keepRecording')}
        onPrimary={() => {
          setBusyDialogVisible(false);
          navigation.navigate('Main', { screen: 'Record' });
        }}
        onClose={() => setBusyDialogVisible(false)}
      />
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  hero: {
    gap: spacing.xs,
  },
  heroSub: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  endsIn: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  elapsed: {
    gap: 4,
    marginTop: spacing.xs,
  },
  elapsedTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  elapsedFill: {
    height: '100%',
    borderRadius: 3,
  },
  elapsedText: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tileWrap: {
    flexGrow: 1,
    flexBasis: '46%',
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
