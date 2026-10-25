import type { ApiBase } from './base';
import type { InsightsRangeKey, InsightsResponse, WeeklyVolume } from '../../types/insights';
import { withQuery } from './query';

type Constructable<T = object> = new (...args: any[]) => T;

export function InsightsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class InsightsMixin extends Base {
    /** Without `range` the API answers the all-time payload. */
    async getInsights(range?: InsightsRangeKey): Promise<InsightsResponse> {
      return this.request<InsightsResponse>(withQuery('/insights', { range }));
    }

    /** 8 weeks of volume; with a sport also its tempo. Plus+ (403 for Free). */
    async getInsightsWeekly(sportTypeId?: number | null): Promise<WeeklyVolume> {
      const response = await this.request<{ data: WeeklyVolume }>(
        withQuery('/insights/weekly', { sport_type_id: sportTypeId ?? undefined }),
      );
      return response.data;
    }
  };
}
