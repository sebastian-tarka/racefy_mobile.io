import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { fixStorageUrl } from '../config/api';
import { spacing, fontSize } from '../theme';
import type { LeaderboardEntry } from '../types/api';

// ---------------------------------------------------------------------------
// LeaderboardEntryRow — reusable row used in both the details preview
// and the full leaderboard tab.
// ---------------------------------------------------------------------------
export interface LeaderboardEntryRowProps {
  entry: LeaderboardEntry;
  index: number;
  borderColor: string;
  onPress?: () => void;
  isAuthenticated: boolean;
}

export function LeaderboardEntryRow({
  entry,
  index,
  borderColor,
  onPress,
  isAuthenticated,
}: LeaderboardEntryRowProps) {
  const { colors } = useTheme();
  const medalColor =
    index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : null;

  return (
    <TouchableOpacity
      key={`leaderboard-${entry.rank}-${entry.user.id}`}
      style={[styles.leaderboardItem, { borderBottomColor: borderColor }]}
      onPress={onPress}
      disabled={!isAuthenticated}
      activeOpacity={isAuthenticated ? 0.7 : 1}
    >
      <View style={styles.leaderboardRank}>
        {medalColor ? (
          <View style={[styles.medalBadge, { backgroundColor: medalColor + '20' }]}>
            <Ionicons name="trophy" size={14} color={medalColor} />
          </View>
        ) : (
          <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>{entry.rank}</Text>
        )}
      </View>
      <Avatar uri={fixStorageUrl(entry.user.avatar)} name={entry.user.name} size="sm" />
      <View style={styles.leaderboardUserInfo}>
        <Text style={[styles.leaderboardUserName, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.user.name}
        </Text>
        <Text style={[styles.leaderboardUsername, { color: colors.textMuted }]}>
          @{entry.user.username}
        </Text>
      </View>
      <View style={styles.leaderboardPoints}>
        <Text style={[styles.leaderboardPointsValue, { color: colors.primary }]}>
          {entry.points.toLocaleString()}
        </Text>
        <Text style={[styles.leaderboardPointsLabel, { color: colors.textMuted }]}>pts</Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// EventLeaderboardTabContent — full leaderboard tab
// ---------------------------------------------------------------------------
interface EventLeaderboardTabContentProps {
  leaderboard: LeaderboardEntry[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onUserPress?: (username: string) => void;
  isAuthenticated: boolean;
  onScroll?: (event: any) => void;
}

export function EventLeaderboardTabContent({
  leaderboard,
  isRefreshing,
  onRefresh,
  onUserPress,
  isAuthenticated,
  onScroll,
}: EventLeaderboardTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Card style={styles.section}>
        <View style={styles.leaderboardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
            {t('eventDetail.leaderboard')}
          </Text>
          <Ionicons name="trophy" size={20} color="#FFD700" />
        </View>
        {leaderboard.map((entry, index) => (
          <LeaderboardEntryRow
            key={`tab-${entry.rank}-${entry.user.id}`}
            entry={entry}
            index={index}
            borderColor={colors.border}
            isAuthenticated={isAuthenticated}
            onPress={
              isAuthenticated && entry.user.username
                ? () => onUserPress?.(entry.user.username)
                : undefined
            }
          />
        ))}
      </Card>
      <View style={{ height: 100 + bottomInset }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  leaderboardRank: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  medalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  leaderboardUserInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  leaderboardUserName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  leaderboardUsername: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  leaderboardPoints: {
    alignItems: 'flex-end',
  },
  leaderboardPointsValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  leaderboardPointsLabel: {
    fontSize: fontSize.xs,
  },
});
