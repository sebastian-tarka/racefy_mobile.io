// ============ FEEDBACK ============

export type FeedbackType = 'bug' | 'feature_request' | 'feedback';
export type FeedbackStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export interface FeedbackAttachment {
  id: number;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface FeedbackUser {
  id: number;
  name: string;
  username?: string;
  avatar: string | null;
}

export interface FeedbackReply {
  id: number;
  body: string;
  is_admin_reply: boolean;
  user: FeedbackUser;
  attachments: FeedbackAttachment[];
  created_at: string;
}

export interface Feedback {
  id: number;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  subject: string;
  description: string;
  platform: 'ios' | 'android' | 'web' | null;
  app_version: string | null;
  os_version: string | null;
  device_model: string | null;
  url: string | null;
  user?: FeedbackUser;
  attachments: FeedbackAttachment[];
  replies?: FeedbackReply[];
  replies_count: number;
  latest_reply: FeedbackReply | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceInfoPayload {
  screen_width: number;
  screen_height: number;
  pixel_ratio: number;
  memory_available?: number;
  battery_level?: number;
  network_type?: 'wifi' | 'cellular' | 'none';
  locale: string;
  is_tablet?: boolean;
}
