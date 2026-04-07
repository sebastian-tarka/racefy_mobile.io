import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, ScreenHeader, Loading, EmptyState } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useFeedback } from '../../hooks/useFeedback';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Feedback, FeedbackStatus, FeedbackType } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedbackList'>;

const TYPE_ICONS: Record<FeedbackType, string> = {
  bug: 'bug-outline',
  feature_request: 'bulb-outline',
  feedback: 'chatbubble-outline',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: '#3B82F6',
  in_progress: '#EAB308',
  waiting_for_user: '#F97316',
  resolved: '#22C55E',
  closed: '#6B7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#6B7280',
};

const STATUS_FILTERS: (FeedbackStatus | 'all')[] = [
  'all',
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
];

export function FeedbackListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { feedbacks, isLoading, isRefreshing, hasMore, error, refresh, loadMore, setFilters } =
    useFeedback();
  const [activeFilter, setActiveFilter] = useState<FeedbackStatus | 'all'>('all');

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFilterPress = useCallback(
    (filter: FeedbackStatus | 'all') => {
      setActiveFilter(filter);
      setFilters(filter === 'all' ? {} : { status: filter });
    },
    [setFilters]
  );

  const renderFilterChip = (filter: FeedbackStatus | 'all') => {
    const isActive = activeFilter === filter;
    const label =
      filter === 'all' ? t('feedback.allStatuses') : t(`feedback.statuses.${filter}`);

    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? colors.primary : colors.cardBackground,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={() => handleFilterPress(filter)}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: isActive ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFeedbackCard = ({ item }: { item: Feedback }) => {
    const typeIcon = TYPE_ICONS[item.type] || 'chatbubble-outline';
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const priorityColor = PRIORITY_COLORS[item.priority] || '#6B7280';
    const repliesText =
      item.replies_count === 0
        ? t('feedback.noRepliesShort')
        : item.replies_count === 1
        ? t('feedback.repliesCountOne')
        : t('feedback.repliesCount', { count: item.replies_count });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('FeedbackDetail', { feedbackId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={typeIcon as any} size={18} color={colors.textSecondary} />
          <Text style={[styles.cardSubject, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.subject}
          </Text>
        </View>

        <View style={styles.cardMeta}>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {t(`feedback.statuses.${item.status}`)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.badgeText, { color: priorityColor }]}>
              {t(`feedback.priorities.${item.priority}`)}
            </Text>
          </View>
          <Text style={[styles.repliesText, { color: colors.textSecondary }]}>
            {repliesText}
          </Text>
        </View>

        {item.latest_reply && (
          <Text style={[styles.latestReply, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.latest_reply.is_admin_reply ? t('feedback.detail.adminReply') : t('feedback.detail.you')}
            : {item.latest_reply.body}
          </Text>
        )}

        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="chatbubbles-outline"
        title={t('feedback.noFeedback')}
        message={t('feedback.noFeedbackCta')}
      />
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('feedback.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('FeedbackForm')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {STATUS_FILTERS.map(renderFilterChip)}
        </ScrollView>
      </View>

      <FlatList
        data={feedbacks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFeedbackCard}
        contentContainerStyle={[
          styles.listContent,
          feedbacks.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isLoading && feedbacks.length > 0 ? (
            <Loading />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    paddingVertical: spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full || 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg || 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardSubject: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm || 6,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  repliesText: {
    fontSize: fontSize.xs,
  },
  latestReply: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  cardDate: {
    fontSize: fontSize.xs,
  },
  addButton: {
    padding: spacing.xs,
  },
});
