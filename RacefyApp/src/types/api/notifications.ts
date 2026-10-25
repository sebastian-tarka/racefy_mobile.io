// ============ NOTIFICATIONS ============

export type NotificationType =
  | 'likes'
  | 'comments'
  | 'follows'
  | 'mentions'
  | 'boosts'
  | 'activity_reactions'
  | 'messages'
  | 'event_reminders'
  | 'ai_post_ready'
  | 'points_awarded'
  | 'weekly_summary'
  | 'training_week_feedback'
  | 'reshares'
  | 'activity_report_ready'
  | 'goal_achieved'
  | 'goal_period_completed'
  | 'goal_pace_warning'
  /** Someone you follow started recording, without broadcasting. */
  | 'activity_started'
  /** Someone you follow opened their session for spectating. */
  | 'activity_live_started';

export interface NotificationData {
  type: NotificationType;
  actor_id: number;
  actor_name: string;
  actor_username: string;
  actor_avatar: string | null;
  timestamp: string;
  url: string | null;
  // Type-specific fields (may not be present in all notifications)
  post_id?: number;
  activity_id?: number;
  comment_id?: number;
  event_id?: number;
  conversation_id?: number;
  likeable_type?: 'post' | 'activity' | 'comment';
  likeable_id?: number;
  commentable_type?: 'post' | 'activity';
  commentable_id?: number;
  // Training week feedback fields
  week_id?: number;
  week_number?: number;
  program_name?: string;
  overall_rating?: string;
}

export interface Notification {
  id: string;
  user_id: number;
  type: NotificationType;
  data: {
    type: NotificationType;
    title: string;
    body: string;
    data: NotificationData;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    unread_count: number;
  };
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAsReadResponse {
  message: string;
  data: {
    id: string;
    read_at: string;
  };
}

export interface MarkAllAsReadResponse {
  message: string;
  marked_count: number;
}

// ============ DEVICE REGISTRATION (Push Notifications) ============

export type DeviceType = 'ios' | 'android';

export interface DeviceRegistrationResponse {
  message: string;
  device_id: number;
}

export interface DeviceUnregisterResponse {
  message: string;
}

// Push notification payload received from FCM/APNs via Expo
export interface PushNotificationData {
  type: NotificationType;
  title?: string;
  body?: string;
  // Backend-provided URL for navigation (priority source)
  url?: string;
  timestamp?: string;
  /**
   * Navigation data. FCM requires every value in `data` to be a string, so
   * these arrive as `"247"`, not `247` — read them through `pushId()` rather
   * than trusting the declared type.
   */
  post_id?: number | string;
  activity_id?: number | string;
  event_id?: number | string;
  user_id?: number | string;
  conversation_id?: number | string;
  comment_id?: number | string;
  // Type-specific data
  likeable_type?: 'post' | 'activity' | 'comment';
  likeable_id?: number;
  commentable_type?: 'post' | 'activity' | 'event';
  commentable_id?: number;
  // Points awarded data
  place?: number;
  points?: number;
  event_title?: string;
  // Message data (FCM uses app_ prefix for reserved keys)
  app_message_type?: string;
  // Actor info
  actor_id?: number | string;
  actor_name?: string;
  actor_username?: string;
  actor_avatar?: string;
  // Training week feedback data
  week_id?: number;
  week_number?: number;
  program_name?: string;
  overall_rating?: string;
  // AI activity report data
  report_id?: number;
  // Training goals data
  goal_id?: number | string;
  // Live broadcast data
  live_visibility?: string;
  sport_type?: string;
  sport_type_slug?: string;
  deep_link_path?: string;
}
