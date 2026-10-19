import type { AiActivityReportStatus } from '../../types/reports';

/** Status badge colors shared by the AI report list and detail screens. */
export const REPORT_STATUS_COLORS: Record<AiActivityReportStatus, string> = {
  pending: '#6B7280',
  processing: '#F59E0B',
  completed: '#10B981',
  failed: '#EF4444',
};
