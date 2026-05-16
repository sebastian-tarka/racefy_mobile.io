import type { SportType } from './api';

export type GoalPeriod = 'week' | 'month' | 'year';
export type GoalMetric = 'distance' | 'duration' | 'elevation' | 'activities_count';
export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'completed';
export type GoalPeriodStatus = 'success' | 'partial' | 'missed';

export interface GoalProgress {
  achieved_value: number;
  percent: number;
  days_left: number;
  expected_percent: number;
  pace_status: PaceStatus;
}

export interface UserGoal {
  id: number;
  user_id: number;
  sport_type_id: number | null;
  period: GoalPeriod;
  metric: GoalMetric;
  target_value: number;
  start_date: string;
  end_date: string | null;
  is_repeating: boolean;
  is_active: boolean;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  sport_type: SportType | null;
  progress?: GoalProgress;
}

export interface UserGoalPeriodResult {
  id: number;
  period_start: string;
  period_end: string;
  target_value: number;
  achieved_value: number;
  progress_percent: number;
  status: GoalPeriodStatus;
}

export interface GoalHistoryMeta {
  history_months: number;
  count: number;
  met_count: number;
  avg_percent: number;
  current_streak: number;
  best: UserGoalPeriodResult | null;
  worst: UserGoalPeriodResult | null;
}

export interface GoalHistoryResponse {
  data: UserGoalPeriodResult[];
  meta: GoalHistoryMeta;
}

export interface CreateGoalRequest {
  sport_type_id: number | null;
  period: GoalPeriod;
  metric: GoalMetric;
  target_value: number;
  start_date?: string;
  end_date?: string | null;
  is_repeating?: boolean;
}

export interface UpdateGoalRequest {
  target_value?: number;
  end_date?: string | null;
  is_repeating?: boolean;
  is_active?: boolean;
}

export interface GoalsProgressMap {
  [goalId: string]: GoalProgress;
}