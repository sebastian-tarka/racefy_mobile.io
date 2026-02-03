import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SocialShareModal } from './SocialShareModal';
import { useTheme } from '../hooks/useTheme';
import type { Post } from '../types/api';
import { styles } from './FeedCard.utils';

interface FeedCardActionsProps {
  post: Post;
  isOwner: boolean;
  onLike?: () => void;
  onBoost?: () => void;
  onComment?: () => void;
  onShareActivity?: () => void;
}

export function FeedCardActions({ post, isOwner, onLike, onBoost, onComment, onShareActivity }: FeedCardActionsProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [shareVisible, setShareVisible] = useState(false);

  const activity = post.activity;
  const showBoost = post.type === 'activity' && activity;
  const isActivityPost = post.type === 'activity' && activity;

  const handleSharePress = () => {
    if (isActivityPost && onShareActivity) {
      // Navigate to ActivityShareScreen for activity posts
      onShareActivity();
    } else {
      // Show modal for other post types
      setShareVisible(true);
    }
  };

  return (
    <View style={[styles.actionsRow, { borderTopColor: colors.background }]}>
      <TouchableOpacity style={styles.actionButton} onPress={onLike} disabled={isOwner || !onLike}>
        <Ionicons name={post.is_liked ? 'heart' : 'heart-outline'} size={20} color={post.is_liked ? colors.error : colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }, post.is_liked && { color: colors.error }]}>{post.likes_count}</Text>
      </TouchableOpacity>

      {showBoost && onBoost && (
        <TouchableOpacity style={styles.actionButton} onPress={onBoost} disabled={isOwner}>
          <Ionicons
            name={activity.is_boosted ? 'rocket' : 'rocket-outline'}
            size={20}
            color={activity.is_boosted ? colors.primary : colors.textSecondary}
          />
          <Text style={[
            styles.actionText,
            { color: colors.textSecondary },
            activity.is_boosted && { color: colors.primary }
          ]}>
            {activity.boosts_count || 0}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.actionButton} onPress={onComment} disabled={!onComment}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments_count}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButtonShare} onPress={handleSharePress}>
        <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t('common.share')}</Text>
      </TouchableOpacity>

      {/* Only show modal for non-activity posts */}
      {!isActivityPost && (
        <SocialShareModal visible={shareVisible} onClose={() => setShareVisible(false)} type="post" id={post.id} title={post.title} description={post.content} />
      )}
    </View>
  );
}