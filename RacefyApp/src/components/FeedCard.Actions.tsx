import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {SocialShareModal} from './SocialShareModal';
import {InteractionButton} from './InteractionButton';
import {useTheme} from '../hooks/useTheme';
import type {Post} from '../types/api';
import {spacing} from '../theme';
import {styles} from './FeedCard.utils';

interface FeedCardActionsProps {
  post: Post;
  isOwner: boolean;
  onLikeChange?: (isLiked: boolean, likesCount: number) => void;
  onBoostChange?: (isBoosted: boolean, boostsCount: number) => void;
  onComment?: () => void;
  onShareActivity?: () => void;
  onResharePress?: () => void;
  onUnreshare?: () => void;
}

export function FeedCardActions({
  post,
  isOwner,
  onLikeChange,
  onBoostChange,
  onComment,
  onShareActivity,
  onResharePress,
  onUnreshare,
}: FeedCardActionsProps) {
  const { colors } = useTheme();
  const [shareVisible, setShareVisible] = useState(false);

  const activity = post.activity;
  const showBoost = post.type === 'activity' && activity;
  const isActivityPost = post.type === 'activity' && activity;

  const handleSharePress = () => {
    if (isActivityPost && onShareActivity) {
      onShareActivity();
    } else {
      setShareVisible(true);
    }
  };

  return (
    <View style={[styles.actionsRow, { borderTopColor: colors.background }]}>
      <InteractionButton
        variant="like"
        targetType="post"
        targetId={post.id}
        count={post.likes_count}
        isActive={post.is_liked}
        disabled={isOwner}
        size="lg"
        onChange={onLikeChange}
        containerStyle={{ marginRight: spacing.xl, paddingHorizontal: 0 }}
      />

      {showBoost && activity && (
        <InteractionButton
          variant="boost"
          targetType="activity"
          targetId={activity.id}
          count={activity.boosts_count || 0}
          isActive={activity.is_boosted}
          disabled={isOwner}
          size="lg"
          onChange={onBoostChange}
          containerStyle={{ marginRight: spacing.xl, paddingHorizontal: 0 }}
        />
      )}

      <InteractionButton
        variant="comment"
        targetType="post"
        targetId={post.id}
        count={post.comments_count}
        size="lg"
        onPress={onComment}
        containerStyle={{ marginRight: spacing.xl, paddingHorizontal: 0 }}
      />

      {!isOwner && !post.shared_post && !post.shared_post_deleted && post.visibility !== 'private' && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={post.is_reshared ? onUnreshare : onResharePress}
        >
          <Ionicons
            name={post.is_reshared ? 'repeat' : 'repeat-outline'}
            size={20}
            color={post.is_reshared ? '#06b6d4' : colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: post.is_reshared ? '#06b6d4' : colors.textSecondary }]}>
            {post.reshares_count || 0}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.actionButtonShare} onPress={handleSharePress}>
        <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Only show modal for non-activity posts */}
      {!isActivityPost && (
        <SocialShareModal visible={shareVisible} onClose={() => setShareVisible(false)} type="post" id={post.id} title={post.title} description={post.content} />
      )}
    </View>
  );
}