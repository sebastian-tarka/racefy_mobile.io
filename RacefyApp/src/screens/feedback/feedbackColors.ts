import type { FeedbackPriority, FeedbackStatus } from '../../types/api';

/** Badge colors shared by the feedback list, detail and form screens. */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: '#3B82F6',
  in_progress: '#EAB308',
  waiting_for_user: '#F97316',
  resolved: '#22C55E',
  closed: '#6B7280',
};

export const FEEDBACK_PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#6B7280',
};

/** For a status/priority the app does not know yet (the API may add one). */
export const FEEDBACK_UNKNOWN_COLOR = '#6B7280';
