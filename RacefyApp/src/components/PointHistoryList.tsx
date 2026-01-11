import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { PointTransaction, PointTransactionType } from '../types/api';

interface PointHistoryListProps {
  transactions: PointTransaction[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
}

// Get icon and color for transaction type
const getTransactionStyle = (
  type: PointTransactionType,
  colors: any
): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (type) {
    case 'activity':
      return { icon: 'fitness-outline', color: colors.primary };
    case 'event_place':
      return { icon: 'trophy-outline', color: '#FFD700' };
    case 'event_finish':
      return { icon: 'flag-outline', color: colors.success };
    case 'bonus':
      return { icon: 'gift-outline', color: '#9333ea' };
    case 'adjustment':
      return { icon: 'settings-outline', color: colors.textSecondary };
    default:
      return { icon: 'star-outline', color: colors.textSecondary };
  }
};

interface PointHistoryItemProps {
  transaction: PointTransaction;
}

const PointHistoryItem = memo(({ transaction }: PointHistoryItemProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { icon, color } = getTransactionStyle(transaction.type, colors);
  const isPositive = transaction.points >= 0;

  return (
    <View style={[styles.itemContainer, { backgroundColor: colors.cardBackground }]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={[styles.description, { color: colors.textPrimary }]} numberOfLines={2}>
          {transaction.description}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text
          style={[
            styles.points,
            { color: isPositive ? colors.success : colors.error },
          ]}
        >
          {isPositive ? '+' : ''}{transaction.points}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>
          {t('leaderboard.history.points')}
        </Text>
      </View>
    </View>
  );
});

function PointHistoryListComponent({
  transactions,
  isLoading = false,
  isLoadingMore = false,
  error = null,
  hasMore = false,
  onLoadMore,
  ListHeaderComponent,
}: PointHistoryListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const renderItem = ({ item }: { item: PointTransaction }) => (
    <PointHistoryItem transaction={item} />
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('leaderboard.history.noTransactions')}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    if (!hasMore && transactions.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={[styles.endText, { color: colors.textMuted }]}>
            {t('leaderboard.history.allLoaded')}
          </Text>
        </View>
      );
    }

    return null;
  };

  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        {ListHeaderComponent ?? null}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => `transaction-${item.id}`}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.3}
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  descriptionContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  date: {
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  points: {
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
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  endFooter: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  endText: {
    fontSize: fontSize.sm,
  },
});

export const PointHistoryList = memo(PointHistoryListComponent);