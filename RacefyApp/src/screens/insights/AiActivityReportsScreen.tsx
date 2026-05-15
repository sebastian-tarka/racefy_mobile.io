import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, ScreenHeader, EmptyState } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { AiActivityReport, AiActivityReportStatus } from '../../types/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'AiActivityReports'>;

const STATUS_COLORS: Record<AiActivityReportStatus, string> = {
  pending: '#6B7280',
  processing: '#F59E0B',
  completed: '#10B981',
  failed: '#EF4444',
};

export function AiActivityReportsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const [reports, setReports] = useState<AiActivityReport[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number, mode: 'refresh' | 'append') => {
    try {
      const response = await api.listActivityReports(pageNum);
      setReports((prev) =>
        mode === 'refresh' ? response.data : [...prev, ...response.data]
      );
      setPage(response.meta.current_page);
      setLastPage(response.meta.last_page);
    } catch (error: any) {
      logger.error('api', 'Failed to load activity reports', { error: error.message });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await fetchPage(1, 'refresh');
      if (mounted) setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchPage]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPage(1, 'refresh');
    setIsRefreshing(false);
  }, [fetchPage]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || page >= lastPage) return;
    setIsLoadingMore(true);
    await fetchPage(page + 1, 'append');
    setIsLoadingMore(false);
  }, [fetchPage, isLoadingMore, page, lastPage]);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString(i18n.language, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCard = ({ item }: { item: AiActivityReport }) => {
    const statusColor = STATUS_COLORS[item.status];
    const count = item.activity_ids.length;
    const countLabel = count === 1
      ? t('insights.aiReports.activityIncluded', { count })
      : t('insights.aiReports.activitiesIncluded', { count });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('AiActivityReportDetail', { reportId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>🤖</Text>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardDate, { color: colors.textPrimary }]}>
              {formatDate(item.created_at)}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {countLabel}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {t(`insights.aiReports.status.${item.status}`)}
            </Text>
          </View>
        </View>
        {item.content?.summary ? (
          <Text
            style={[styles.cardSummary, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.content.summary}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="sparkles-outline"
        title={t('insights.aiReports.noneYet')}
        message={t('insights.aiReports.noneYetHint')}
      />
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <ActivityIndicator color={colors.primary} style={styles.footerLoader} />;
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('insights.aiReports.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={[
            styles.listContent,
            reports.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ListHeaderComponent={
            reports.length > 0 ? (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('insights.aiReports.subtitle')}
              </Text>
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginVertical: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardEmoji: {
    fontSize: fontSize.xl,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardDate: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  cardSummary: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  footerLoader: {
    paddingVertical: spacing.md,
  },
});