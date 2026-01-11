import React, { useCallback } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, PointHistoryList } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { usePointHistory } from '../../hooks/usePointHistory';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PointHistory'>;

export function PointHistoryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    transactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = usePointHistory({ autoLoad: true });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('leaderboard.history.title')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <PointHistoryList
        transactions={transactions}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});