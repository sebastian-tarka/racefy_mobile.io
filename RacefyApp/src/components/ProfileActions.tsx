import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { spacing } from '../theme';
import type { FollowStatusValue } from '../types/api';

interface ProfileActionsProps {
  isFollowing: boolean;
  followStatus?: FollowStatusValue;
  isFollowLoading: boolean;
  isMessageLoading: boolean;
  canMessage: boolean;
  onFollowToggle: () => void;
  onMessagePress: () => void;
}

export function ProfileActions({
  isFollowing,
  followStatus,
  isFollowLoading,
  isMessageLoading,
  canMessage,
  onFollowToggle,
  onMessagePress,
}: ProfileActionsProps) {
  const { t } = useTranslation();

  // Determine button state based on follow_status
  const getFollowButtonState = () => {
    if (followStatus === 'pending') {
      return { title: t('profile.requested'), variant: 'outline' as const };
    }
    if (followStatus === 'accepted' || isFollowing) {
      return { title: t('profile.unfollow'), variant: 'outline' as const };
    }
    return { title: t('profile.follow'), variant: 'primary' as const };
  };

  const followButtonState = getFollowButtonState();

  return (
    <View style={styles.actions}>
      <Button
        title={followButtonState.title}
        onPress={onFollowToggle}
        variant={followButtonState.variant}
        loading={isFollowLoading}
        style={styles.followButton}
      />
      <Button
        title={t('messaging.message')}
        onPress={onMessagePress}
        variant="outline"
        loading={isMessageLoading}
        disabled={!canMessage}
        style={styles.messageButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  followButton: {
    minWidth: 120,
  },
  messageButton: {
    minWidth: 120,
  },
});