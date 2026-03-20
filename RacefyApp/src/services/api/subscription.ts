import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function SubscriptionMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class SubscriptionMixin extends Base {
    // ============ SUBSCRIPTION ============

    /**
     * Get available subscription plans
     */
    async getSubscriptionPlans(): Promise<Types.SubscriptionPlan[]> {
      const response = await this.request<Types.ApiResponse<Types.SubscriptionPlan[]>>(
        '/subscription/plans'
      );
      return response.data;
    }

    /**
     * Get current user's subscription status
     */
    async getSubscriptionStatus(): Promise<Types.SubscriptionStatus> {
      const response = await this.request<Types.ApiResponse<Types.SubscriptionStatus>>(
        '/subscription/status'
      );
      return response.data;
    }

    /**
     * Get current user's subscription features and usage
     */
    async getSubscriptionFeatures(): Promise<Types.SubscriptionFeatures> {
      const response = await this.request<Types.ApiResponse<Types.SubscriptionFeatures>>(
        '/subscription/features'
      );
      return response.data;
    }
  };
}