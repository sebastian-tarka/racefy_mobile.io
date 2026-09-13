import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  LeaderboardRow,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
} from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { usePointStats } from '../../hooks/usePointStats';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { borderRadius, msFont, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { LeaderboardEntry, LeaderboardPeriod } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;
type Scope = 'following' | 'global';

/** A separator between the head of the board and the athlete's neighbourhood. */
type Row = { kind: 'entry'; entry: LeaderboardEntry } | { kind: 'divider' };

const HEAD_LIMIT = 20;
const NEIGHBOURS = 3;

/**
 * Where the athlete stands, and who is close enough to catch
 * (design "Racefy v2" → CompeteScreen).
 *
 * Defaults to Following + Week on purpose: Following is the board where an
 * ordinary athlete is actually visible, and a week resets often enough to be
 * worth coming back to. All-time global — the old default — told most people
 * only that they were four thousandth.
 *
 * The athlete's own row is pinned to the bottom while their true position is
 * off-screen, so "where am I" never requires scrolling to find out.
 */
export function LeaderboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();

  const [scope, setScope] = useState<Scope>(isAuthenticated ? 'following' : 'global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [meVisible, setMeVisible] = useState(false);

  const board = useLeaderboard({ type: scope, period, limit: HEAD_LIMIT, autoLoad: true });
  const { stats } = usePointStats();

  const myRank = useMemo(() => {
    if (!stats) return null;
    const rank =
      period === 'weekly'
        ? stats.weekly_rank
        : period === 'monthly'
          ? stats.monthly_rank
          : stats.global_rank;
    return rank > 0 ? rank : null;
  }, [stats, period]);

  // Keep the period in sync when the scope flips — the hook owns its own copy.
  useEffect(() => {
    board.changePeriod(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, scope]);

  // The window around the athlete. Only the global board is deep enough to
  // need it — the following board is short enough that they are already in it.
  const [neighbours, setNeighbours] = useState<LeaderboardEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    const head = board.entries.length;
    if (scope !== 'global' || !myRank || myRank <= head + 1) {
      setNeighbours([]);
      return;
    }
    const offset = Math.max(0, myRank - 1 - NEIGHBOURS);
    api
      .getGlobalLeaderboard(period, NEIGHBOURS * 2 + 1, offset)
      .then((res) => {
        if (!cancelled) setNeighbours(res.leaderboard);
      })
      .catch((error) => {
        // Losing the neighbourhood costs a section, not the screen.
        logger.warn('api', 'Failed to load leaderboard neighbourhood', { error });
        if (!cancelled) setNeighbours([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, period, myRank, board.entries.length]);

  const rows: Row[] = useMemo(() => {
    const head: Row[] = board.entries.map((entry) => ({ kind: 'entry', entry }));
    if (neighbours.length === 0) return head;
    return [
      ...head,
      { kind: 'divider' },
      ...neighbours.map((entry) => ({ kind: 'entry' as const, entry })),
    ];
  }, [board.entries, neighbours]);

  const isMine = useCallback(
    (entry: LeaderboardEntry) => myRank != null && entry.rank === myRank,
    [myRank],
  );

  /** Points to the athlete one place up — the only number that says "keep going". */
  const gapFor = useCallback(
    (entry: LeaderboardEntry) => {
      const pool = neighbours.length ? neighbours : board.entries;
      const above = pool.find((e) => e.rank === entry.rank - 1);
      return above ? above.points - entry.points : null;
    },
    [neighbours, board.entries],
  );

  // `UserPointStats` carries no username, so the athlete's own row is found by
  // rank. That is exact: a board has one entry per position.
  const myRow = useMemo(
    () =>
      rows.find((r): r is { kind: 'entry'; entry: LeaderboardEntry } =>
        r.kind === 'entry' ? isMine(r.entry) : false,
      )?.entry ?? null,
    [rows, isMine],
  );

  // FlatList keeps the first callback it is given, so the rank has to reach it
  // through a ref rather than the closure.
  const myRankRef = useRef<number | null>(null);
  myRankRef.current = myRank;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const rank = myRankRef.current;
    setMeVisible(
      rank != null &&
        viewableItems.some((v) => {
          const item = v.item as Row;
          return item?.kind === 'entry' && item.entry.rank === rank;
        }),
    );
  }).current;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await board.refetch();
    setIsRefreshing(false);
  }, [board]);

  const openAthlete = useCallback(
    (username: string) => navigation.navigate('UserProfile', { username }),
    [navigation],
  );

  const footerNote =
    scope === 'global'
      ? t(
          period === 'weekly'
            ? 'compete.footerWeekly'
            : period === 'monthly'
              ? 'compete.footerMonthly'
              : 'compete.footerAllTime',
        )
      : t('compete.footerFollowing', { count: board.entries.length });

  const showAuthGate = scope === 'following' && !isAuthenticated;
  const showFollowingEmpty =
    scope === 'following' && isAuthenticated && !board.isLoading && board.entries.length === 0;

  return (
    <ScreenContainer glow={false}>
      <ScreenHeader
        title={t('leaderboard.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          isAuthenticated ? (
            <TouchableOpacity
              style={[
                styles.pointsAction,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate('PointHistory')}
            >
              <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.pointsActionText, { color: colors.textSecondary }]}>
                {t('compete.pointsAction')}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.filters}>
        <SegmentedControl
          options={[
            { value: 'following', label: t('leaderboard.tabs.following') },
            { value: 'global', label: t('leaderboard.tabs.global') },
          ]}
          value={scope}
          onChange={setScope}
        />
        <SegmentedControl
          compact
          options={[
            { value: 'weekly', label: t('compete.periods.weekly') },
            { value: 'monthly', label: t('compete.periods.monthly') },
            { value: 'all_time', label: t('compete.periods.allTime') },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </View>

      {showAuthGate ? (
        <EmptyState
          icon="lock-closed-outline"
          title={t('leaderboard.authRequired')}
          message={t('leaderboard.authRequiredMessage')}
          actionLabel={t('common.signIn')}
          onAction={() => navigation.navigate('Auth', { screen: 'Login' })}
        />
      ) : showFollowingEmpty ? (
        <View style={styles.emptyFollowing}>
          <EmptyState
            icon="people-outline"
            title={t('compete.emptyFollowing')}
            message={t('compete.emptyFollowingBody')}
            actionLabel={t('compete.findPeople')}
            onAction={() => navigation.navigate('Main', { screen: 'Feed' })}
          />
          <TouchableOpacity onPress={() => setScope('global')} style={styles.seeGlobal}>
            <Text style={[styles.seeGlobalText, { color: colors.primaryDark }]}>
              {t('compete.seeGlobal')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : board.isLoading && !isRefreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(row, i) =>
              row.kind === 'divider' ? `divider-${i}` : `r-${row.entry.rank}`
            }
            contentContainerStyle={styles.list}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item, index }) => {
              if (item.kind === 'divider') {
                return (
                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerLabel, { color: colors.textMuted }]}>
                      {t('compete.aroundYou')}
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>
                );
              }
              const me = isMine(item.entry);
              const prev = rows[index - 1];
              const first = index === 0 || prev?.kind === 'divider';
              return (
                <View
                  style={[
                    styles.rowWrap,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                    first && styles.rowWrapFirst,
                    !first && { borderTopWidth: 1, borderTopColor: colors.border },
                  ]}
                >
                  <LeaderboardRow
                    entry={item.entry}
                    isMe={me}
                    gap={me ? gapFor(item.entry) : null}
                    onPress={openAthlete}
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              <EmptyState icon="trophy-outline" title={t('leaderboard.noEntries')} message="" />
            }
            ListFooterComponent={
              <Text style={[styles.footer, { color: colors.textMuted }]}>{footerNote}</Text>
            }
          />

          {/* Pinned own row — the answer to "where am I" without scrolling for
              it. Hidden while the real row is on screen so the board never
              shows the same athlete twice. */}
          {myRow && !meVisible && (
            <View style={styles.dock} pointerEvents="box-none">
              <View style={styles.dockInner}>
                <LeaderboardRow
                  entry={myRow}
                  isMe
                  docked
                  gap={gapFor(myRow)}
                  onPress={() => navigation.navigate('PointHistory')}
                />
              </View>
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 96,
  },
  rowWrap: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  rowWrapFirst: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.sm + 2,
    paddingHorizontal: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: msFont(10.5),
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  footer: {
    fontSize: msFont(11.5),
    paddingTop: spacing.md + 2,
    paddingHorizontal: 4,
  },
  dock: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  dockInner: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0a1a14',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  pointsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  pointsActionText: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
  emptyFollowing: {
    flex: 1,
  },
  seeGlobal: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  seeGlobalText: {
    fontSize: msFont(12.5),
    fontWeight: '600',
  },
});
