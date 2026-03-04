import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import { useNavigationStyle } from '../../contexts/NavigationStyleContext';
import { ProfileScreen } from './ProfileScreen';
import { DynamicProfileScreen } from './DynamicProfileScreen';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

/**
 * ProfileScreenWrapper - API-driven profile screen selector.
 *
 * Checks the navigation style (from API home_version) and renders
 * either the legacy ProfileScreen or the new DynamicProfileScreen.
 * Follows the same pattern as HomeScreenWrapper.
 */
export function ProfileScreenWrapper(props: Props) {
  const { style } = useNavigationStyle();

  // Cast props through any — the composite navigation prop (BottomTab + NativeStack)
  // is available at runtime via React Navigation's parent resolution.
  // Both ProfileScreen and DynamicProfileScreen declare the wider composite type
  // for navigation.navigate() calls to root stack screens.
  if (style === 'dynamic') {
    return <DynamicProfileScreen {...props as any} />;
  }

  return <ProfileScreen {...props as any} />;
}
