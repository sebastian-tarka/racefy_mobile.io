import type * as Types from '../../types/api';
import type {
  Exercise,
  ExerciseInput,
  ExerciseListParams,
  ExerciseListResponse,
  Workout,
  WorkoutExercise,
  WorkoutExerciseInput,
  WorkoutExerciseUpdate,
  WorkoutInput,
  WorkoutPlan,
  WorkoutPlanImportPreview,
  WorkoutPlanInput,
  WorkoutPlanUpdate,
  WorkoutUpdate,
} from '../../types/workouts';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

/**
 * Strength workout plans — `/workout-plans`, `/workouts`, `/workout-exercises`,
 * `/exercises`. See docs/core/API.md → "Strength Workout Plans" in the API repo.
 */
export function WorkoutsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class WorkoutsMixin extends Base {
    // ── plans ───────────────────────────────────────────────────────────────

    /** User's plans, active first, with `workouts_count`. */
    async listWorkoutPlans(): Promise<WorkoutPlan[]> {
      const response = await this.request<Types.ApiResponse<WorkoutPlan[]>>('/workout-plans');
      return response.data;
    }

    /** Plan with workouts, prescriptions and library exercises. */
    async getWorkoutPlan(id: number): Promise<WorkoutPlan> {
      const response = await this.request<Types.ApiResponse<WorkoutPlan>>(`/workout-plans/${id}`);
      return response.data;
    }

    /** Create a plan, optionally with nested `workouts[].exercises[]` (the import payload). */
    async createWorkoutPlan(data: WorkoutPlanInput): Promise<WorkoutPlan> {
      const response = await this.request<Types.ApiResponse<WorkoutPlan>>('/workout-plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async updateWorkoutPlan(id: number, data: WorkoutPlanUpdate): Promise<WorkoutPlan> {
      const response = await this.request<Types.ApiResponse<WorkoutPlan>>(`/workout-plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async deleteWorkoutPlan(id: number): Promise<void> {
      await this.request<{ message: string }>(`/workout-plans/${id}`, { method: 'DELETE' });
    }

    /** Sets `status: active`; the previously active plan becomes `archived`. */
    async activateWorkoutPlan(id: number): Promise<WorkoutPlan> {
      const response = await this.request<Types.ApiResponse<WorkoutPlan>>(
        `/workout-plans/${id}/activate`,
        { method: 'POST' },
      );
      return response.data;
    }

    /** Deep copy as `draft`, optional new name. */
    async duplicateWorkoutPlan(id: number, name?: string): Promise<WorkoutPlan> {
      const response = await this.request<Types.ApiResponse<WorkoutPlan>>(
        `/workout-plans/${id}/duplicate`,
        { method: 'POST', body: JSON.stringify(name ? { name } : {}) },
      );
      return response.data;
    }

    /**
     * Dry run: parse an .xlsx into the create payload + warnings. Nothing is
     * saved — post `data` back through `createWorkoutPlan` after review.
     */
    async importWorkoutPlanPreview(formData: FormData): Promise<WorkoutPlanImportPreview> {
      return this.request<WorkoutPlanImportPreview>('/workout-plans/import', {
        method: 'POST',
        body: formData,
      });
    }

    // ── workouts ────────────────────────────────────────────────────────────

    async createWorkout(planId: number, data: WorkoutInput): Promise<Workout> {
      const response = await this.request<Types.ApiResponse<Workout>>(
        `/workout-plans/${planId}/workouts`,
        { method: 'POST', body: JSON.stringify(data) },
      );
      return response.data;
    }

    /** `ids` in the wanted order; unlisted ids follow. */
    async reorderWorkouts(planId: number, ids: number[]): Promise<void> {
      await this.request<unknown>(`/workout-plans/${planId}/workouts/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ ids }),
      });
    }

    async updateWorkout(id: number, data: WorkoutUpdate): Promise<Workout> {
      const response = await this.request<Types.ApiResponse<Workout>>(`/workouts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async deleteWorkout(id: number): Promise<void> {
      await this.request<{ message: string }>(`/workouts/${id}`, { method: 'DELETE' });
    }

    // ── prescriptions ───────────────────────────────────────────────────────

    async createWorkoutExercise(
      workoutId: number,
      data: WorkoutExerciseInput,
    ): Promise<WorkoutExercise> {
      const response = await this.request<Types.ApiResponse<WorkoutExercise>>(
        `/workouts/${workoutId}/exercises`,
        { method: 'POST', body: JSON.stringify(data) },
      );
      return response.data;
    }

    async reorderWorkoutExercises(workoutId: number, ids: number[]): Promise<void> {
      await this.request<unknown>(`/workouts/${workoutId}/exercises/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ ids }),
      });
    }

    async updateWorkoutExercise(id: number, data: WorkoutExerciseUpdate): Promise<WorkoutExercise> {
      const response = await this.request<Types.ApiResponse<WorkoutExercise>>(
        `/workout-exercises/${id}`,
        { method: 'PUT', body: JSON.stringify(data) },
      );
      return response.data;
    }

    async deleteWorkoutExercise(id: number): Promise<void> {
      await this.request<{ message: string }>(`/workout-exercises/${id}`, { method: 'DELETE' });
    }

    // ── exercise library ────────────────────────────────────────────────────

    /** Own + global library. Paginated. */
    async listExercises(params: ExerciseListParams = {}): Promise<ExerciseListResponse> {
      const query = new URLSearchParams();
      if (params.q) query.set('q', params.q);
      if (params.muscle_group) query.set('muscle_group', params.muscle_group);
      if (params.scope) query.set('scope', params.scope);
      if (params.page) query.set('page', String(params.page));
      if (params.per_page) query.set('per_page', String(params.per_page));
      const qs = query.toString();
      return this.request<ExerciseListResponse>(`/exercises${qs ? `?${qs}` : ''}`);
    }

    async getExercise(id: number): Promise<Exercise> {
      const response = await this.request<Types.ApiResponse<Exercise>>(`/exercises/${id}`);
      return response.data;
    }

    async createExercise(data: ExerciseInput): Promise<Exercise> {
      const response = await this.request<Types.ApiResponse<Exercise>>('/exercises', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async updateExercise(id: number, data: Partial<ExerciseInput>): Promise<Exercise> {
      const response = await this.request<Types.ApiResponse<Exercise>>(`/exercises/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    /** 409 while any workout prescribes it (`usage_count` in the error body). */
    async deleteExercise(id: number): Promise<void> {
      await this.request<{ message: string }>(`/exercises/${id}`, { method: 'DELETE' });
    }
  };
}
