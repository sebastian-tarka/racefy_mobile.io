/** Sections counted by GET /me/badges as "new since you last looked". */
export type BadgeSection = 'events' | 'ai_reports' | 'activities' | 'goals' | 'feedback';

/** GET /me/badges and POST /me/badges/seen. */
export interface BadgesResponse {
  notifications_unread: number;
  messages_unread: number;
  team_invitations: number;
  team_join_requests: number;
  drafts: number;
  follow_requests: number;
  /** New since the section was last seen — on any device (the state is server-side). */
  sections: Record<BadgeSection, number>;
  /** A gym session is in progress: "live" on the strength entry. */
  workout_session_active: boolean;
  /** Admins only. */
  admin?: { reports_pending: number; feedback_open: number };
}
