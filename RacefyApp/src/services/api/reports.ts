import type * as Types from '../../types/api';
import type {
  AiActivityReport,
  AiActivityReportLocale,
  GenerateActivityReportRequest,
  GenerateActivityReportResponse,
} from '../../types/reports';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function ReportsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class ReportsMixin extends Base {
    /**
     * Generate a new AI activity report (or return a cached / in-flight one).
     * 201 = new, 200 + cached = returned cached result, 200 + in_flight = existing
     * pending/processing report. All three are handled by the caller identically:
     * navigate to detail and let polling resolve the final state.
     */
    async generateActivityReport(
      data: GenerateActivityReportRequest
    ): Promise<GenerateActivityReportResponse> {
      return this.request<GenerateActivityReportResponse>('/ai/activity-reports', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }

    /**
     * List the current user's reports (paginated, 20 per page, newest first).
     */
    async listActivityReports(page = 1): Promise<Types.PaginatedResponse<AiActivityReport>> {
      return this.request<Types.PaginatedResponse<AiActivityReport>>(
        `/ai/activity-reports?page=${page}`
      );
    }

    /**
     * Fetch a single report. Used both for initial load and for polling
     * while status is pending/processing.
     */
    async getActivityReport(id: number): Promise<AiActivityReport> {
      const response = await this.request<Types.ApiResponse<AiActivityReport>>(
        `/ai/activity-reports/${id}`
      );
      return response.data;
    }

    /**
     * Delete a report. Owner-only.
     */
    async deleteActivityReport(id: number): Promise<string> {
      const response = await this.request<{ message: string }>(
        `/ai/activity-reports/${id}`,
        { method: 'DELETE' }
      );
      return response.message;
    }
  };
}

export type { AiActivityReport, AiActivityReportLocale };