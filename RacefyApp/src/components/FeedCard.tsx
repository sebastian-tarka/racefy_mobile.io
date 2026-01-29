import React, { useState } from 'react';
import { Card } from './Card';
import { useTheme } from '../hooks/useTheme';
import { FeedCardHeader } from './FeedCard.Header';
import { FeedCardActions } from './FeedCard.Actions';
import { GeneralBody, ActivityBody, EventBody, SponsoredBody } from './FeedCard.Bodies';
import { type FeedCardProps, type FeedPostType, getEffectiveType, getTypeColors } from './FeedCard.utils';

// Re-export types for backward compatibility
export type { FeedCardProps } from './FeedCard.utils';

const BODY_COMPONENTS: Record<FeedPostType, React.ComponentType<any>> = {
  general: GeneralBody,
  activity: ActivityBody,
  event: EventBody,
  sponsored: SponsoredBody,
};

export function FeedCard({ post, isOwner = false, onUserPress, onLike, onComment, onActivityPress, onEventPress, onMenu }: FeedCardProps) {
  const { colors } = useTheme();
  const type = getEffectiveType(post);
  const typeColors = getTypeColors(type, colors);
  const Body = BODY_COMPONENTS[type];
  const marginBottom = type === 'general' ? 12 : 20;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card style={[{ marginBottom }, ...(typeColors.border ? [{ borderLeftWidth: 1, borderRightWidth:1, borderLeftColor: typeColors.border, borderRightColor: typeColors.border }] : [])]}>
      <FeedCardHeader
        post={post}
        type={type}
        isOwner={isOwner}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(!menuOpen)}
        onUserPress={onUserPress}
        onMenu={onMenu}
      />
      <Body post={post} onActivityPress={onActivityPress} onEventPress={onEventPress} />
      <FeedCardActions post={post} isOwner={isOwner} onLike={onLike} onComment={onComment} />
    </Card>
  );
}