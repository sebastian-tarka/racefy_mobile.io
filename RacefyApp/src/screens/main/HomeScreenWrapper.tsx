import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import { useHomeData } from '../../hooks/useHomeData';
import { useTheme } from '../../hooks/useTheme';
import { Loading } from '../../components';
import { HomeScreen } from './HomeScreen';
import { DynamicHomeScreen } from './DynamicHomeScreen';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

/**
 * HomeScreenWrapper - API-driven home screen selector.
 *
 * This component fetches the home_version from the API and renders
 * either the legacy HomeScreen or the new DynamicHomeScreen based
 * on the server response.
 *
 * This allows the backend to control which home experience users see,
 * enabling gradual rollout, A/B testing, or per-user customization
 * without requiring app updates.
 */
export function HomeScreenWrapper(props: Props) {
  const { colors } = useTheme();
  const { loading, homeVersion, data } = useHomeData({
    enableAutoRefresh: false, // Don't auto-refresh just for version check
  });

  // Show loading only on initial load when we don't have any data yet
  // (no cached data and still fetching)
  if (loading && !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Loading />
      </View>
    );
  }

  // Render appropriate home screen based on API-driven home_version
  if (homeVersion === 'dynamic') {
    return <DynamicHomeScreen {...props} />;
  }

  // Default to legacy home screen
  return <HomeScreen {...props} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
