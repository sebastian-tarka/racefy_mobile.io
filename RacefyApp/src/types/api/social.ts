import type { Event } from './events';
import type { Post } from './posts';
import type { User } from './user';

// ============ FOLLOWS ============

// Follow status value type
export type FollowStatusValue = 'pending' | 'accepted' | 'rejected' | null;

// Follow request resource
export interface FollowRequest {
  id: number;
  follower: User;
  following: User;
  status: 'pending' | 'accepted' | 'rejected';
  requested_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

export interface FollowStatus {
  is_following: boolean;
  is_followed_by: boolean;
  follow_status: FollowStatusValue; // New field
  followed_by_status: FollowStatusValue; // New field
}

// API list response for follow requests (paginated)
export interface ApiListResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ============ USER BLOCKING ============

export interface BlockedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  blocked_at: string; // ISO datetime
}

export interface BlockStatus {
  is_blocking: boolean; // You blocked them
  is_blocked_by: boolean; // They blocked you
  has_relationship: boolean; // Either direction
}

export interface BlockedUsersResponse {
  data: BlockedUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ============ CONTENT REPORTING ============

export type ReportableType = 'post' | 'comment' | 'activity' | 'user' | 'message';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'impersonation'
  | 'copyright'
  | 'other';

export interface CreateReportRequest {
  reportable_type: ReportableType;
  reportable_id: number;
  reason: ReportReason;
  description?: string; // Optional, max 500 chars
}

export interface ReportResponse {
  message: string;
}

// ============ MENTIONS ============

export interface MentionEntity {
  type: 'user' | 'event' | 'activity';
  id: number;
  name: string;
  username?: string;
  avatar?: string;
  url: string;
}

export type MentionMap = Record<string, MentionEntity>;

export interface MentionSearchUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
}

export interface MentionSearchEvent {
  id: number;
  title?: string;
  name?: string;
  location: string | null;
}

export interface MentionSearchActivity {
  id: number;
  title?: string;
  name?: string;
}

// ============ INTERACTIONS (likes/boosts list) ============

/**
 * A user that interacted with content (liked / boosted), with the timestamp
 * of the interaction. Returned by the *_likes / *_boosts list endpoints.
 */
export interface UserInteractor extends User {
  is_following?: boolean;
  interacted_at: string;
}

// ============ SEARCH ============

export interface SearchResultCategory<T> {
  data: T[];
  count: number;
}

export interface SearchResponse {
  query: string;
  total_count: number;
  results: {
    users: SearchResultCategory<User>;
    events: SearchResultCategory<Event>;
    posts: SearchResultCategory<Post>;
  };
}

export interface SearchUsersResponse {
  query: string;
  total_count: number;
  results: {
    users: SearchResultCategory<User>;
  };
}
