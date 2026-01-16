import React from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useEventCommentaryFeed } from '../hooks/useEventCommentaryFeed';
import { useTranslation } from 'react-i18next';
import { CommentaryItem } from './CommentaryItem';
import { EmptyState } from './EmptyState';
import { spacing } from '../theme';
import type { CommentaryLanguage } from '../types/api';

interface CommentaryFeedProps {
  eventId: number;
  language?: CommentaryLanguage;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showTokenUsage?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
}

export function CommentaryFeed({
  eventId,
  language,
  autoRefresh = true,
  refreshInterval = 30000,
  showTokenUsage = false,
  ListHeaderComponent,
}: CommentaryFeedProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const {
    commentaries,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    isEmpty,
    isCommentaryEnabled,
    tokensUsed,
    tokenLimit,
    isPollingActive,
    secondsUntilRefresh,
  } = useEventCommentaryFeed({
    eventId,
    language,
    autoRefresh,
    refreshInterval,
  });

  const renderTokenUsage = () => {
    if (!showTokenUsage || !isCommentaryEnabled) return null;

    const percent = tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0;
    const isNearLimit = percent > 80;

    return (
      <View
        style={[
          styles.tokenUsageBar,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.tokenUsageContent}>
          <Text style={[styles.tokenUsageLabel, { color: colors.textSecondary }]}>
            {t('commentary.tokenUsage', 'Token Usage')}
          </Text>
          <Text
            style={[
              styles.tokenUsageValue,
              {
                color: isNearLimit ? colors.warning : colors.textPrimary,
              },
            ]}
          >
            {tokensUsed} / {tokenLimit || t('commentary.unlimited', 'Unlimited')}
          </Text>
        </View>
        {tokenLimit > 0 && (
          <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(percent, 100)}%`,
                  backgroundColor: isNearLimit ? colors.warning : colors.primary,
                },
              ]}
            />
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <>
        {ListHeaderComponent}
        {isPollingActive && (
          <View
            style={[
              styles.liveIndicator,
              { backgroundColor: colors.successLight, borderColor: colors.success },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <View style={styles.liveTextContainer}>
              <Text style={[styles.liveText, { color: colors.success }]}>
                {t('commentary.liveActive', 'Live Commentary Active')}
              </Text>
              <Text style={[styles.countdownText, { color: colors.success }]}>
                {t('commentary.nextUpdate', 'Next update in')} {secondsUntilRefresh}s
              </Text>
            </View>
          </View>
        )}
        {renderTokenUsage()}
      </>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <EmptyState
          icon="warning"
          title={t('commentary.errorTitle', 'Failed to load commentary')}
          message={error}
        />
      );
    }

    if (isEmpty && !isCommentaryEnabled) {
      return (
        <EmptyState
          icon="eye-off-outline"
          title={t('commentary.disabledTitle', 'Commentary is disabled')}
          message={t(
            'commentary.disabledMessage',
            'AI commentary is not enabled for this event'
          )}
        />
      );
    }

    if (isEmpty) {
      return (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title={t('commentary.emptyTitle', 'No commentary yet')}
          message={t(
            'commentary.emptyMessage',
            'Commentary will appear as the event progresses'
          )}
        />
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (!hasMore || !isLoading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading && commentaries.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('commentary.loading', 'Loading commentary...')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={commentaries}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <CommentaryItem commentary={item} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={renderHeader()}
      ListEmptyComponent={renderEmpty()}
      ListFooterComponent={renderFooter()}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  liveTextContainer: {
    flexDirection: 'column',
  },
  liveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
  },
  tokenUsageBar: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tokenUsageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tokenUsageLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tokenUsageValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
