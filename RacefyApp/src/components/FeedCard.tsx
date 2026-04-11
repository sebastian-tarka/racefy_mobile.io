import React, {useCallback, useState} from 'react';
import {View} from 'react-native';
import {Card} from './Card';
import {ReshareModal} from './ReshareModal';
import {useTheme} from '../hooks/useTheme';
import {FeedCardHeader} from './FeedCard.Header';
import {FeedCardActions} from './FeedCard.Actions';
import {AchievementBody, ActivityBody, EventBody, GeneralBody, SponsoredBody} from './FeedCard.Bodies';
import {type FeedCardProps, type FeedPostType, getEffectiveType, getTypeColors, styles} from './FeedCard.utils';

// Re-export types for backward compatibility
export type { FeedCardProps } from './FeedCard.utils';

const BODY_COMPONENTS: Record<FeedPostType, React.ComponentType<any>> = {
  general: GeneralBody,
  activity: ActivityBody,
  event: EventBody,
  sponsored: SponsoredBody,
  reshare: GeneralBody,
  achievement: AchievementBody,
  challenge: GeneralBody,
  digest: GeneralBody,
  milestone: GeneralBody,
};

export const FeedCard = React.memo(function FeedCard({ post, isOwner = false, onUserPress, onLikeChange, onBoostChange, onComment, onShareActivity, onActivityPress, onEventPress, onMenu, onReshare, onUnreshare, onOriginalPostUserPress }: FeedCardProps) {
  const { colors } = useTheme();
  const type = getEffectiveType(post);
  const typeColors = getTypeColors(type, colors);
  const Body = BODY_COMPONENTS[type];
  const marginBottom = type === 'general' ? 12 : 20;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reshareModalVisible, setReshareModalVisible] = useState(false);

  const handleReshareSubmit = useCallback(async (content?: string, visibility?: string) => {
    if (onReshare) {
      await onReshare(content, visibility);
    }
  }, [onReshare]);

  const handleOriginalPostPress = useCallback(() => {
    if (post.shared_post) {
      // Navigate to the original post's detail - use the shared post ID
      // This is handled by onComment-style navigation in parent
    }
  }, [post.shared_post]);

  return (
    <Card style={{ marginBottom, position: 'relative' }}>
      {typeColors.accent && (
        <View style={[styles.accentBar, { backgroundColor: typeColors.accent, opacity: 0.8 }]} />
      )}
      <FeedCardHeader
        post={post}
        type={type}
        isOwner={isOwner}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(!menuOpen)}
        onUserPress={onUserPress}
        onMenu={onMenu}
      />
      <Body
        post={post}
        onActivityPress={onActivityPress}
        onEventPress={onEventPress}
        onOriginalPostPress={handleOriginalPostPress}
        onOriginalPostUserPress={onOriginalPostUserPress}
      />
      <FeedCardActions
        post={post}
        isOwner={isOwner}
        onLikeChange={onLikeChange}
        onBoostChange={onBoostChange}
        onComment={onComment}
        onShareActivity={onShareActivity}
        onResharePress={() => setReshareModalVisible(true)}
        onUnreshare={onUnreshare}
      />
      <ReshareModal
        visible={reshareModalVisible}
        onClose={() => setReshareModalVisible(false)}
        post={post}
        onSubmit={handleReshareSubmit}
      />
    </Card>
  );
});