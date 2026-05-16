import type * as Types from '../../types/api';
import type {
  CreateGoalRequest,
  GoalHistoryResponse,
  GoalsProgressMap,
  UpdateGoalRequest,
  UserGoal,
} from '../../types/goals';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function GoalsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class GoalsMixin extends Base {
    /**
     * List all user goals (active + archived). Non-paginated.
     * Each goal carries a live `progress` payload.
     */
    async listGoals(): Promise<UserGoal[]> {
      const response = await this.request<Types.ApiResponse<UserGoal[]>>('/goals');
      return response.data;
    }

    /**
     * Aggregated progress payload keyed by goal id — for screens that already
     * know the goal list and just need fresh numbers (e.g. home widget).
     */
    async getGoalsProgress(): Promise<GoalsProgressMap> {
      const response = await this.request<Types.ApiResponse<GoalsProgressMap>>(
        '/goals/progress'
      );
      return response.data;
    }

    async getGoal(id: number): Promise<UserGoal> {
      const response = await this.request<Types.ApiResponse<UserGoal>>(`/goals/${id}`);
      return response.data;
    }

    async createGoal(data: CreateGoalRequest): Promise<UserGoal> {
      const response = await this.request<Types.ApiResponse<UserGoal>>('/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async updateGoal(id: number, data: UpdateGoalRequest): Promise<UserGoal> {
      const response = await this.request<Types.ApiResponse<UserGoal>>(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async deleteGoal(id: number): Promise<string> {
      const response = await this.request<{ message: string }>(`/goals/${id}`, {
        method: 'DELETE',
      });
      return response.message;
    }

    /**
     * Closed-period results for this goal, clipped by subscription tier.
     * `meta.history_months`: -1 = unlimited (Pro), 1 = Free, 12 = Plus.
     */
    async getGoalHistory(id: number): Promise<GoalHistoryResponse> {
      return this.request<GoalHistoryResponse>(`/goals/${id}/history`);
    }
  };
}
