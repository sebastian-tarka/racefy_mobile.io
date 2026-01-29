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
  onComment?: () => void;
}

export function FeedCardActions({ post, isOwner, onLike, onComment }: FeedCardActionsProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [shareVisible, setShareVisible] = useState(false);

  return (
    <View style={[styles.actionsRow, { borderTopColor: colors.background }]}>
      <TouchableOpacity style={styles.actionButton} onPress={onLike} disabled={isOwner || !onLike}>
        <Ionicons name={post.is_liked ? 'heart' : 'heart-outline'} size={20} color={post.is_liked ? colors.error : colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }, post.is_liked && { color: colors.error }]}>{post.likes_count}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={onComment} disabled={!onComment}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments_count}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButtonShare} onPress={() => setShareVisible(true)}>
        <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t('common.share')}</Text>
      </TouchableOpacity>
      <SocialShareModal visible={shareVisible} onClose={() => setShareVisible(false)} type="post" id={post.id} title={post.title} description={post.content} />
    </View>
  );
}