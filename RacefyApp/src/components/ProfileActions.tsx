import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { spacing } from '../theme';

interface ProfileActionsProps {
  isFollowing: boolean;
  isFollowLoading: boolean;
  isMessageLoading: boolean;
  canMessage: boolean;
  onFollowToggle: () => void;
  onMessagePress: () => void;
}

export function ProfileActions({
  isFollowing,
  isFollowLoading,
  isMessageLoading,
  canMessage,
  onFollowToggle,
  onMessagePress,
}: ProfileActionsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.actions}>
      <Button
        title={isFollowing ? t('profile.unfollow') : t('profile.follow')}
        onPress={onFollowToggle}
        variant={isFollowing ? 'outline' : 'primary'}
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