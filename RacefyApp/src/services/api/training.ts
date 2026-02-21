import { logger } from '../logger';
import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function TrainingMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class TrainingMixin extends Base {
    // ============ TRAINING PLANS ============

    /**
     * Get available training goals for a sport type
     */
    async getTrainingGoals(sportTypeId: number): Promise<Types.TrainingGoal[]> {
      const response = await this.request<Types.ApiResponse<Types.TrainingGoal[]>>(
        `/sport-types/${sportTypeId}/training-goals`
      );
      return response.data;
    }

    /**
     * Create a training calibration (fitness assessment)
     * First step in generating a personalized training program
     */
    async createCalibration(data: Types.CalibrationData): Promise<Types.TrainingCalibration> {
      const response = await this.request<Types.CreateCalibrationResponse>(
        '/training/calibration',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }

    /**
     * Initialize a training program based on current calibration
     * This is async - program will be "pending" or "processing" initially
     * Poll getProgram() until status becomes "active"
     * @param data - Optional settings for activity linking
     */
    async initProgram(data?: Types.InitProgramRequest): Promise<Types.TrainingProgram> {
      const response = await this.request<Types.InitProgramResponse>(
        '/training/programs/initialize',
        {
          method: 'POST',
          body: JSON.stringify(data || {}),
        }
      );
      // API may wrap in { program: {...} } or { data: {...} }
      return response.program ?? response.data!;
    }

    /**
     * Get a specific training program by ID
     * Use this to poll program status after initialization
     */
    async getProgram(id: number): Promise<Types.TrainingProgram> {
      const response = await this.request<Types.GetProgramResponse>(
        `/training/programs/${id}`
      );
      // API wraps in { program: {...} } or { data: {...} }
      return response.program ?? response.data!;
    }

    /**
     * Get the current active training program for the user
     * Returns null if no active program exists (404 is expected)
     */
    async getCurrentProgram(): Promise<Types.TrainingProgram | null> {
      try {
        const response = await this.request<Types.GetCurrentProgramResponse>(
          '/training/programs/current'
        );
        // API wraps in { program: {...} } or { data: {...} }
        const program = response?.program ?? response?.data;
        logger.debug('training', 'getCurrentProgram result', {
          responseKeys: response ? Object.keys(response) : 'null',
          programId: program?.id,
          programStatus: program?.status,
        });
        return program ?? null;
      } catch (error: any) {
        logger.debug('training', 'getCurrentProgram error caught', {
          message: error.message,
          status: error.status,
          errorKeys: error ? Object.keys(error) : 'null',
        });
        // 404 is expected when user has no active program
        // Note: ApiError from request() has message but no status field,
        // so we check the message text for common "not found" patterns
        const msg = error.message?.toLowerCase() || '';
        if (
          msg.includes('no active training program') ||
          msg.includes('not found') ||
          msg.includes('404') ||
          error.status === 404
        ) {
          logger.debug('training', 'No active program (expected)', { message: error.message });
          return null;
        }
        // Re-throw unexpected errors
        throw error;
      }
    }

    /**
     * Get all weeks for current training program
     * Includes activities for each week
     */
    async getWeeks(): Promise<Types.TrainingWeek[]> {
      const response = await this.request<Types.GetWeeksResponse>('/training/weeks');
      return response.data;
    }

    /**
     * Get a specific training week by ID
     */
    async getWeek(weekId: number): Promise<Types.TrainingWeek> {
      const response = await this.request<Types.GetWeekResponse>(`/training/weeks/${weekId}`);
      return response.data;
    }

    /**
     * Mark a training week as completed
     */
    async completeWeek(weekId: number): Promise<Types.TrainingWeek> {
      const response = await this.request<Types.CompleteWeekResponse>(
        `/training/weeks/${weekId}/complete`,
        { method: 'POST' }
      );
      return response.data;
    }

    /**
     * Skip a training week
     */
    async skipWeek(weekId: number): Promise<Types.TrainingWeek> {
      const response = await this.request<Types.SkipWeekResponse>(
        `/training/weeks/${weekId}/skip`,
        { method: 'POST' }
      );
      return response.data;
    }

    /**
     * Update notes for a training week
     */
    async updateWeekNotes(weekId: number, notes: string): Promise<Types.TrainingWeek> {
      const response = await this.request<Types.UpdateWeekNotesResponse>(
        `/training/weeks/${weekId}/notes`,
        {
          method: 'PUT',
          body: JSON.stringify({ notes }),
        }
      );
      return response.data;
    }

    /**
     * Pause a training program
     */
    async pauseProgram(programId: number, reason: Types.PausedReason): Promise<string> {
      const response = await this.request<Types.PauseProgramResponse>(
        `/training/programs/${programId}/pause`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      return response.message;
    }

    /**
     * Resume a paused training program
     */
    async resumeProgram(programId: number): Promise<string> {
      const response = await this.request<Types.ResumeProgramResponse>(
        `/training/programs/${programId}/resume`,
        { method: 'POST' }
      );
      return response.message;
    }

    /**
     * Abandon a training program (permanent, cannot resume)
     */
    async abandonProgram(programId: number): Promise<string> {
      const response = await this.request<Types.AbandonProgramResponse>(
        `/training/programs/${programId}/abandon`,
        { method: 'POST' }
      );
      return response.message;
    }

    /**
     * Update training program settings
     */
    async updateProgramSettings(
      programId: number,
      settings: Types.UpdateProgramSettingsRequest
    ): Promise<string> {
      const response = await this.request<Types.UpdateProgramSettingsResponse>(
        `/training/programs/${programId}/settings`,
        {
          method: 'PUT',
          body: JSON.stringify(settings),
        }
      );
      return response.message;
    }

    /**
     * Link an existing activity to a training week activity
     * @param weekId - Training week ID
     * @param activityId - Activity ID to link
     */
    async linkActivityToWeek(
      weekId: number,
      activityId: number
    ): Promise<Types.TrainingWeek> {
      const response = await this.request<Types.LinkActivityToWeekResponse>(
        `/training/weeks/${weekId}/activities/${activityId}/link`,
        { method: 'POST' }
      );
      return response.data;
    }

    /**
     * Unlink an activity from a training week activity
     * @param weekId - Training week ID
     * @param activityId - Training activity ID to unlink
     */
    async unlinkActivityFromWeek(
      weekId: number,
      activityId: number
    ): Promise<Types.TrainingWeek> {
      const response = await this.request<Types.UnlinkActivityFromWeekResponse>(
        `/training/weeks/${weekId}/activities/${activityId}/unlink`,
        { method: 'DELETE' }
      );
      return response.data;
    }

    // ============ COACHING HINTS ============

    /**
     * Generate coaching hints for all weeks in a program
     * Returns processing status - poll getWeeks() to track progress
     */
    async generateAllHints(programId: number): Promise<Types.GenerateHintsResponse> {
      return this.request<Types.GenerateHintsResponse>(
        `/training/programs/${programId}/generate-hints`,
        { method: 'POST' }
      );
    }

    // ============ WEEK FEEDBACK ============

    /**
     * Get feedback/analysis for a training week
     * Available for active, completed, and skipped weeks
     */
    async getWeekFeedback(weekId: number): Promise<Types.WeekFeedback> {
      const response = await this.request<Types.WeekFeedbackResponse>(
        `/training/weeks/${weekId}/feedback`
      );
      return response.data;
    }

    // ============ TRAINING TIPS ============

    /**
     * Get available tips based on user's mental budget
     * Returns 0-N tips (respects weekly budget)
     */
    async getAvailableTips(): Promise<Types.TrainingTip[]> {
      const response = await this.request<Types.AvailableTipsResponse>(
        '/training/tips/available'
      );
      return response.data;
    }

    /**
     * Get full tip content and record delivery
     * This call counts toward mental budget
     * @param tipId - Tip ID to retrieve
     */
    async getTip(tipId: number): Promise<Types.TrainingTip> {
      const response = await this.request<Types.TipDetailResponse>(
        `/training/tips/${tipId}`
      );
      return response.data;
    }

    /**
     * Mark a tip as helpful or not helpful
     * @param tipId - Tip ID
     * @param helpful - Whether the tip was helpful
     */
    async markTipHelpful(
      tipId: number,
      helpful: boolean
    ): Promise<string> {
      const response = await this.request<Types.MarkTipHelpfulResponse>(
        `/training/tips/${tipId}/helpful`,
        {
          method: 'POST',
          body: JSON.stringify({ helpful }),
        }
      );
      return response.message;
    }

    /**
     * Get user's mental budget status
     */
    async getMentalBudget(): Promise<Types.MentalBudget> {
      const response = await this.request<Types.MentalBudgetResponse>(
        '/training/mental-budget'
      );
      return response.data;
    }

    /**
     * Update user's mental budget settings
     * @param settings - Budget settings to update
     */
    async updateMentalBudget(
      settings: Types.UpdateMentalBudgetRequest
    ): Promise<Types.MentalBudget> {
      const response = await this.request<Types.UpdateMentalBudgetResponse>(
        '/training/mental-budget',
        {
          method: 'PUT',
          body: JSON.stringify(settings),
        }
      );
      return response.data;
    }
  };
}
