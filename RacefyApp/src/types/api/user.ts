import type { SubscriptionStatus } from './subscriptions';

// ============ USER & AUTH ============

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  email_verified_at: string | null;
  avatar: string | null;
  avatar_url: string | null;
  background_image: string | null;
  background_image_url: string | null;
  bio: string | null;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
  subscription?: SubscriptionStatus;
}

// ============ IMPERSONATION ============

export interface ImpersonationSession {
  id: number;
  admin_id: number;
  impersonated_user_id: number;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
}

export interface StartImpersonationResponse {
  impersonation_token: string;
  impersonated_user: User;
  expires_at: string;
  session_id: number;
}

export interface StopImpersonationResponse {
  message: string;
  admin_user: User;
}

export interface ImpersonationStatusResponse {
  is_impersonating: boolean;
  session: ImpersonationSession | null;
  original_admin: User | null;
}
