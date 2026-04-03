import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function SubscriptionMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class SubscriptionMixin extends Base {
    // ============ SUBSCRIPTION ============

    /**
     * Get available subscription plans
     */
    async getSubscriptionPlans(): Promise<{ plans: Types.SubscriptionPlan[]; country_code: string }> {
      const response = await this.request<{ plans: Types.SubscriptionPlan[]; country_code: string } | Types.ApiResponse<{ plans: Types.SubscriptionPlan[]; country_code: string }>>(
        '/subscription/plans'
      );
      // Handle both wrapped {data: {plans}} and unwrapped {plans} responses
      return 'data' in response && (response as any).data?.plans ? (response as any).data : response as { plans: Types.SubscriptionPlan[]; country_code: string };
    }

    /**
     * Get current user's subscription status
     */
    async getSubscriptionStatus(): Promise<Types.SubscriptionStatus> {
      const response = await this.request<any>('/subscription/status');
      return response.data ?? response;
    }

    /**
     * Get current user's subscription features and usage
     */
    async getSubscriptionFeatures(): Promise<{ features: Record<string, Record<string, boolean | number>>; tiers: Record<string, { name: string; level: number }> }> {
      const response = await this.request<any>('/subscription/features');
      return response.data ?? response;
    }
  };
}