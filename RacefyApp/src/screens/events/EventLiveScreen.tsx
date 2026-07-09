import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card, Loading, ScreenContainer } from '../../components';
import {
  EventScoreboard,
  type ScoreboardTile,
  type StandingRowModel,
  standingToRow,
} from '../../components/event';
import { CountdownTimer } from '../../components/CountdownTimer';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useFetch } from '../../hooks/useFetch';
import { useEventStandings } from '../../hooks/useEventStandings';
import { api } from '../../services/api';
import { formatTotalTime } from '../../utils/formatters';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { Event, EventRankingMode, EventTeamStandingEntry } from '../../types/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventLive'>;

function teamStandingToRow(
  entry: EventTeamStandingEntry,
  mode: EventRankingMode | undefined,
  units: ReturnType<typeof useUnits>,
  finishedLabel: (n: number) => string,
): StandingRowModel {
  let primary: string;
  switch (mode) {
    case 'most_distance':
      primary = units.formatDistanceShort(entry.total_distance ?? 0);
      break;
    case 'most_elevation':
      primary = units.formatElevation(entry.total_elevation ?? 0);
      break;
    default:
      primary = entry.total_duration ? formatTotalTime(entry.total_duration) : '—';
  }
  return {
    place: entry.position,
    name: entry.team?.name ?? '—',
    avatar: null,
    subtitle: finishedLabel(entry.finished_count),
    primary,
    finished: false,
  };
}

export function EventLiveScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { eventId } = route.params;

  const { data: event } = useFetch<Event>(() => api.getEvent(eventId), {
    deps: [eventId],
    logCategory: 'api',
  });

  const { individualStandings, teamStandings, rankingMode, aggregates, isLoading } =
    useEventStandings(eventId, { enabled: true });

  const individualRows = useMemo(
    () => individualStandings.map((s) => standingToRow(s, rankingMode, units, t)),
    [individualStandings, rankingMode, units, t],
  );
  const teamRows = useMemo(
    () =>
      teamStandings.map((s) =>
        teamStandingToRow(s, rankingMode, units, (n) =>
          t('eventDetail.nFinished', { count: n, defaultValue: `${n} finished` }),
        ),
      ),
    [teamStandings, rankingMode, units, t],
  );

  const tiles: ScoreboardTile[] = [
    {
      icon: 'pulse',
      label: t('eventDetail.racingNowLabel', 'Racing now'),
      value: String(aggregates.racingCount),
      color: colors.error,
    },
    {
      icon: 'checkmark-done',
      label: t('eventDetail.finished', 'Finished'),
      value: String(aggregates.finishedPct),
      unit: '%',
    },
    {
      icon: 'navigate',
      label: t('eventDetail.totalDist', 'Total dist'),
      value: units.formatDistanceShort(aggregates.totalDistance),
    },
    {
      icon: 'trending-up',
      label: t('eventDetail.totalClimb', 'Total climb'),
      value: units.formatElevation(aggregates.totalElevation),
    },
  ];

  const goToCommentary = useCallback(
    () => navigation.navigate('EventCommentary', { eventId }),
    [navigation, eventId],
  );

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
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('eventDetail.liveStandings', 'Live standings')}
        </Text>
        <View style={[styles.liveBadge, { backgroundColor: colors.error }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>{t('home.live', 'LIVE')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {event?.post?.title ? (
          <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{event.post.title}</Text>
        ) : null}
        {event?.ends_at ? (
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
        ) : null}

        {isLoading && individualRows.length === 0 ? (
          <Loading />
        ) : (
          <EventScoreboard
            tiles={tiles}
            individualRows={individualRows}
            teamRows={teamRows}
            currentUserId={user?.id}
            listTitle={t('eventDetail.liveStandings', 'Live standings')}
            emptyText={t('eventDetail.noStandingsYet', 'No results yet — the race just started.')}
          />
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={goToCommentary}>
          <Card style={styles.commentaryLink}>
            <Ionicons name="sparkles" size={18} color="#8b5cf6" />
            <Text style={[styles.commentaryText, { color: colors.textSecondary }]}>
              {t('eventDetail.autoRefresh', 'Updating live · auto-refresh 30s')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </TouchableOpacity>
      </ScrollView>
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
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
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
