import type { Activity } from './activities';
import type { Event } from './events';
import type { Media, MediaItem, Photo, Video } from './media';
import type { AiPostPerspective, AiPostStyle } from './preferences';
import type { MentionMap } from './social';
import type { AchievementData } from './subscriptions';
import type { User } from './user';

// ============ POSTS ============

export interface Post {
  id: number;
  user_id: number;
  type: 'general' | 'event' | 'activity' | 'achievement' | 'challenge' | 'digest' | 'milestone';
  title: string | null;
  content: string;
  visibility: 'public' | 'followers' | 'private';
  status: 'draft' | 'published';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  photos?: Photo[];
  media?: Media[];
  videos?: Video[];
  event?: Event;
  activity?: Activity;
  achievement?: AchievementData;
  tagged_event?: TaggedEvent;
  is_liked?: boolean;
  is_owner?: boolean;
  mentions?: MentionMap;
  reshares_count?: number;
  shared_post?: SharedPost | null;
  shared_post_deleted?: boolean;
  is_reshared?: boolean;
  youtube_embed_id?: string | null;
  accent_color?: string | null;
  sponsored_data?: SponsoredData;
}

export interface SponsoredData {
  campaign_name?: string;
  cta_text?: string;
  cta_url?: string;
  promoted_link?: string;
  accent_color?: string | null;
}

export interface TaggedEvent {
  id: number;
  slug?: string;
  name: string;
  sport_type?: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
}

export interface SharedPost {
  id: number;
  type: 'general' | 'event' | 'activity' | 'achievement' | 'challenge' | 'digest' | 'milestone';
  title: string | null;
  content: string;
  visibility: 'public' | 'followers' | 'private';
  created_at: string;
  user?: User;
  photos?: Photo[];
  media?: Media[];
  videos?: Video[];
  activity?: Activity;
  event?: Event;
  likes_count: number;
  comments_count: number;
}

export interface ReshareRequest {
  content?: string;
  visibility?: 'public' | 'followers' | 'private';
}

export interface CreatePostRequest {
  title?: string;
  content: string;
  visibility?: 'public' | 'followers' | 'private';
  status?: 'draft' | 'published';
}

// AI generation metadata included with AI-generated drafts
export interface AiGenerationInfo {
  id: number;
  trigger: 'activity_completion' | 'activity_share' | 'event_results' | 'event_forced';
  style: AiPostStyle;
  perspective: AiPostPerspective;
  is_ai_generated: true;
}

// Draft post data structure - extends Post with AI generation info
export interface DraftPost extends Post {
  status: 'draft';
  ai_generation?: AiGenerationInfo;
}

// Paginated response for drafts
export interface DraftsResponse {
  data: DraftPost[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ============ COMMENTS ============

// Note: Activity comments now use 'post' type via activity.post_id
export type CommentableType = 'post' | 'event';

export interface Comment {
  id: number;
  user_id: number;
  commentable_type: CommentableType;
  commentable_id: number;
  parent_id: number | null;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at?: string;
  user?: User;
  replies?: Comment[];
  photos?: Photo[];
  videos?: Video[];
  media?: Media[];
  is_liked?: boolean;
  mentions?: MentionMap;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: number;
  photo?: MediaItem;
}
