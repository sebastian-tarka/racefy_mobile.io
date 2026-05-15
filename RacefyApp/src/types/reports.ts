export type AiActivityReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type AiActivityReportLocale = 'en' | 'pl' | 'es';

export interface AiReportNextStep {
  action: string;
  rationale: string;
}

export interface AiReportContent {
  summary: string;
  highlights: string[];
  areas_to_improve: string[];
  coaching_recommendations: string[];
  next_steps: AiReportNextStep[];
  _parse_warning?: string;
}

export interface AiActivityReport {
  id: number;
  status: AiActivityReportStatus;
  activity_ids: number[];
  locale: AiActivityReportLocale;
  provider: string | null;
  model: string | null;
  content: AiReportContent | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface GenerateActivityReportRequest {
  activity_ids: number[];
  locale?: AiActivityReportLocale;
}

export interface GenerateActivityReportResponse {
  data: AiActivityReport;
  cached?: boolean;
  in_flight?: boolean;
}