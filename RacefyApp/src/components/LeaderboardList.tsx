import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { fixStorageUrl } from '../config/api';
import { spacing, fontSize, borderRadius } from '../theme';
import type { LeaderboardEntry } from '../types/api';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  error?: string | null;
  onUserPress?: (username: string) => void;
  onRetry?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  emptyMessage?: string;
}

// Medal colors for top 3
const MEDAL_COLORS = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
};

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  onPress?: (username: string) => void;
  isCurrentUser?: boolean;
}

const LeaderboardItem = memo(({ entry, onPress, isCurrentUser }: LeaderboardItemProps) => {
  const { colors } = useTheme();
  const medalColor = MEDAL_COLORS[entry.rank as keyof typeof MEDAL_COLORS];
  const isTopThree = entry.rank <= 3;

  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        { backgroundColor: colors.cardBackground },
        isCurrentUser && { backgroundColor: colors.primary + '10' },
      ]}
      onPress={() => onPress?.(entry.user.username)}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isTopThree ? (
          <View style={[styles.medalContainer, { backgroundColor: medalColor + '20' }]}>
            <Ionicons
              name="trophy"
              size={16}
              color={medalColor}
            />
          </View>
        ) : (
          <Text style={[styles.rankText, { color: colors.textSecondary }]}>
            {entry.rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <Avatar
        uri={fixStorageUrl(entry.user.avatar)}
        name={entry.user.name}
        size="md"
      />

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text
          style={[
            styles.userName,
            { color: colors.textPrimary },
            isCurrentUser && { fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {entry.user.name}
        </Text>
        <Text style={[styles.userUsername, { color: colors.textSecondary }]} numberOfLines={1}>
          @{entry.user.username}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsValue, { color: colors.primary }]}>
          {entry.points.toLocaleString()}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>pts</Text>
      </View>
    </TouchableOpacity>
  );
});

function LeaderboardListComponent({
  entries,
  isLoading = false,
  error = null,
  onUserPress,
  onRetry,
  ListHeaderComponent,
  emptyMessage,
}: LeaderboardListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const renderItem = ({ item }: { item: LeaderboardEntry }) => (
    <LeaderboardItem
      entry={item}
      onPress={onUserPress}
      isCurrentUser={user?.id === item.user.id}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
          {onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <Text style={[styles.retryText, { color: colors.white }]}>
                {t('common.tryAgain')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {emptyMessage || t('leaderboard.noEntries')}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || entries.length === 0) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        {ListHeaderComponent ?? null}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => `${item.rank}-${item.user.id}`}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  medalContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  pointsLabel: {
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});

export const LeaderboardList = memo(LeaderboardListComponent);
