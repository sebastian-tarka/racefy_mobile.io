import type { ApiBase } from './base';
import type { InsightsResponse } from '../../types/insights';

type Constructable<T = object> = new (...args: any[]) => T;

export function InsightsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class InsightsMixin extends Base {
    async getInsights(): Promise<InsightsResponse> {
      return this.request<InsightsResponse>('/insights');
    }
  };
}
