import React from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { useLiveBroadcasts } from '../../hooks/useLiveBroadcasts';
import { spacing } from '../../theme';
import { EmptyState, Loading, ScreenContainer, ScreenHeader } from '../../components';
import { LiveBroadcastCard } from '../../components/LiveBroadcastCard';
import type { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: NavigationProp;
}

/** Keeps the list roughly in step with broadcasts starting and ending. */
const REFRESH_INTERVAL_MS = 20_000;

export function LiveBroadcastsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { broadcasts, isLoading, isRefreshing, refresh } = useLiveBroadcasts({
    refreshIntervalMs: REFRESH_INTERVAL_MS,
  });

  return (
    <ScreenContainer>
      <ScreenHeader title={t('live.list.title')} showBack onBack={() => navigation.goBack()} />

      {isLoading ? (
        <Loading fullScreen />
      ) : (
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <LiveBroadcastCard
              broadcast={item}
              onPress={() => navigation.navigate('LiveSpectator', { activityId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="radio-outline"
              title={t('live.list.emptyTitle')}
              message={t('live.list.emptyMessage')}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    flexGrow: 1,
  },
});
