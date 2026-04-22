import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import { ProfileScreen } from './ProfileScreen';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export function ProfileScreenWrapper(props: Props) {
  return <ProfileScreen {...props as any} />;
}