import type { ApiResponse } from './common';

// ============ TRAINING PLANS ============

export type ExperienceLevel = 'beginner' | 'recreational' | 'regular';
export type GuidanceLevel = 'minimal' | 'standard' | 'coach_like';
export type RecoveryProfile = 'low' | 'medium' | 'high';
/**
 * 'scheduled' = plan is created and dated but its start_date has not arrived yet.
 * It is not an error and not a generation state — render "starts on {start_date}".
 * A nightly server job flips it to 'active'. There is no 'pending'/'processing':
 * POST /training/programs/initialize is synchronous.
 */
export type ProgramStatus = 'scheduled' | 'active' | 'paused' | 'completed' | 'abandoned';
export type PausedReason = 'injury' | 'vacation' | 'burnout' | 'other';
/** 'current' is legacy — the API returns 'active' for the week in progress. */
export type WeekStatus = 'upcoming' | 'current' | 'active' | 'completed' | 'skipped' | 'paused';

/** Derived from ascent per km. Read-only; null when elevation or distance is missing. */
export type TerrainProfile = 'flat' | 'rolling' | 'hilly' | 'mountainous';
export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface TrainingGoal {
  id: number;
  key: string;
  name: string;
  description: string;
  sport_type_id: number;
  is_active: boolean;
  requires_target_distance: boolean;
  requires_target_date: boolean;
  default_duration_weeks: number;
}

export interface CalibrationData {
  sport_type_id: number;
  training_goal_id: number;
  experience_level: ExperienceLevel;
  sessions_per_week: number; // 1-7
  guidance_level: GuidanceLevel;
  recovery_profile: RecoveryProfile;
  injury_history?: boolean;
  target_distance?: number; // meters
  /**
   * Meters of ascent, 0-10000. OMIT when unknown — blank is not zero.
   * Sending 0 claims the course is flat; omitting gives the planner no terrain hint.
   */
  target_elevation?: number;
  target_date?: string; // ISO date, must be in the future
}

export interface TrainingCalibration {
  id: number;
  sport_type_id: number;
  training_goal_id: number;
  experience_level: ExperienceLevel;
  sessions_per_week: number;
  guidance_level: GuidanceLevel;
  recovery_profile: RecoveryProfile;
  injury_history: boolean;
  target_distance: number | null;
  target_elevation: number | null;
  /** Read-only, derived. Render null as "not specified", never as "flat". */
  terrain_profile: TerrainProfile | null;
  target_date: string | null;
  /** Deterministic hash of the calibration inputs — identical plans reuse a cached template. */
  calibration_fingerprint: string;
  is_current: boolean;
  calibrated_at: string;
  created_at: string;
  sport_type: {
    id: number;
    name: string;
  };
  training_goal: TrainingGoal;
}

export interface TrainingProgram {
  id: number;
  name: string;
  sport_type_id: number;
  training_goal_id: number;
  status: ProgramStatus;
  start_date: string; // ISO date, always a Monday
  planned_end_date: string | null; // ISO date, always a Sunday
  actual_end_date?: string | null;
  total_weeks: number;
  current_week_number: number | null;
  weeks_added: number;
  weeks_skipped: number;
  current_guidance_level: string;
  /** 0.7-1.5; how the shared template was scaled to the user. 1.0 = template as written. */
  volume_factor?: number | null;
  auto_link_activities: boolean;
  /** null = every sport counts. Never persist [] — it reads as a restriction but enforces nothing. */
  allowed_sport_types: number[] | null;
  paused_at: string | null;
  pause_reason: string | null;
  template?: {
    id: number;
    name: string;
    description: string;
  };
  /**
   * Snapshot of the questionnaire this plan was generated from — the only place
   * a client can read the race it was aimed at. Editing the calibration later
   * does NOT change this, because the plan is not regenerated.
   */
  calibration?: TrainingCalibration;
  current_week?: TrainingWeek | null;
  /** The whole plan, ordered by week_number. Present when the weeks relation is loaded. */
  weeks?: TrainingWeek[];
  created_at: string;
  updated_at: string;
}

export interface TrainingActivity {
  id: number;
  week_id: number;
  day_of_week: number; // 1=Monday, 7=Sunday
  activity_type: string;
  duration_minutes: number | null;
  distance_meters: number | null;
  pace_target: string | null;
  intensity: string | null;
  description: string;
  notes: string | null;
  status: ActivityStatus;
  completed_at: string | null;
  linked_activity_id?: number | null;
}

/**
 * A planned session. Snapshotted onto the week at creation and already
 * translated + volume-scaled — render as-is, no client-side maths.
 */
export interface SuggestedActivity {
  id: number;
  session_order: number;
  /** The discipline this session trains — differs per session in a triathlon plan. */
  sport_type_id?: number | null;
  sport_slug?: string | null;
  activity_type: string;
  intensity_description: string | null;
  target_distance_meters: number | null;
  target_duration_minutes: number | null;
  notes: string | null;
  tags?: string[] | null;
}

export interface TrainingWeek {
  id: number;
  program_id?: number;
  week_number: number;
  phase_name: string;
  start_date: string;
  end_date: string;
  status: WeekStatus;
  focus_description: string;
  educational_notes: string | null;
  progress: {
    activities_count: number;
    sessions_per_week: number; // 1-7
    suggested_activities_count: number;
    total_distance: number;
    total_duration: number;
  };
  notes: string | null;
  activities?: TrainingActivity[];
  suggested_activities?: SuggestedActivity[];
  coaching_hint?: CoachingHint | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionHint {
  session_order: number;
  title: string;
  description: string;
  warm_up: string;
  main_focus: string;
  cool_down: string;
}

export interface CoachingHint {
  week_overview: string;
  session_hints: SessionHint[];
}

export interface GenerateHintsResponse {
  message: string;
  status: 'processing' | 'completed';
  weeks_pending?: number;
  total_weeks?: number;
}

// API Response types
export interface CreateCalibrationResponse {
  data: TrainingCalibration;
}

export type PlanWarningCode =
  | 'plan_start_deferred'
  | 'plan_shorter_than_recommended'
  | 'plan_extends_beyond_target_date'
  | 'plan_ends_before_target_date'
  | 'insufficient_history_for_scaling'
  | 'goal_demands_more_sessions'
  // resume-only codes
  | 'plan_regenerated_on_resume'
  | 'target_date_passed';

/** Never a 422 — the user always gets a usable plan and is told the trade-off. */
export interface PlanWarning {
  code: PlanWarningCode;
  [key: string]: unknown; // per-code extras
}

/**
 * POST /training/programs/initialize is SYNCHRONOUS — the finished plan comes
 * back here, with all its weeks. No polling, no 'processing' status.
 */
export interface InitProgramResponse {
  data: TrainingProgram;
  /** Always present; [] on the happy path. Branch on .length, not on existence. */
  warnings?: PlanWarning[];
  message?: string;
  /** @deprecated legacy envelope from the pre-synchronous API */
  program?: TrainingProgram;
}

export interface InitProgramResult {
  program: TrainingProgram;
  warnings: PlanWarning[];
}

export interface GetProgramResponse {
  program?: TrainingProgram;
  data?: TrainingProgram;
}

export interface GetCurrentProgramResponse {
  program?: TrainingProgram | null;
  programs?: TrainingProgram[];
  data?: TrainingProgram | null;
}

export interface GetWeeksResponse {
  data: TrainingWeek[];
}

export interface GetWeekResponse {
  data: TrainingWeek;
}

export interface CompleteWeekResponse {
  data: TrainingWeek;
  message: string;
}

export interface SkipWeekResponse {
  data: TrainingWeek;
  message: string;
}

export interface UpdateWeekNotesResponse {
  data: TrainingWeek;
  message: string;
}

export interface PauseProgramResponse {
  message: string;
}

/**
 * When `regenerated` is true, `program` is a NEW program with a NEW id and the
 * old one is abandoned. Callers must re-read `program` rather than assume the id
 * is unchanged, and evict any cache keyed on `previous_program_id`.
 */
export interface ResumeProgramResponse {
  message: string;
  regenerated?: boolean;
  previous_program_id?: number | null;
  program?: TrainingProgram;
  warnings?: PlanWarning[];
}

export interface ResumeProgramResult {
  message: string;
  regenerated: boolean;
  previousProgramId: number | null;
  program: TrainingProgram | null;
  warnings: PlanWarning[];
}

export interface AbandonProgramResponse {
  message: string;
}

/** Every field optional. The calibration is resolved server-side — never send calibration_id. */
export interface InitProgramRequest {
  /** ISO date, snapped to that week's Monday. */
  start_date?: string;
  auto_link_activities?: boolean;
  allowed_sport_types?: number[];
}

export interface UpdateProgramSettingsRequest {
  guidance_level?: GuidanceLevel;
  auto_link_activities?: boolean;
  /** Send null for unrestricted — [] is treated as "every sport" but reads as a restriction. */
  allowed_sport_types?: number[] | null;
}

export interface UpdateProgramSettingsResponse {
  message: string;
}

export interface LinkActivityToWeekResponse {
  data: TrainingWeek;
  message: string;
}

export interface UnlinkActivityFromWeekResponse {
  data: TrainingWeek;
  message: string;
}

// ============ WEEK FEEDBACK ============

export type OverallRating = 'excellent' | 'good' | 'needs_improvement' | 'poor';
export type MatchStatus = 'completed' | 'partial' | 'missed';
export type TrendDirection = 'improving' | 'declining' | 'maintaining';

export interface ComplianceData {
  sessions: {
    completed: number;
    suggested: number;
    percentage: number;
  };
  distance: {
    completed_km: number;
    suggested_km: number;
    completed_meters: number;
    suggested_meters: number;
    percentage: number;
  };
  duration: {
    completed_seconds: number;
    suggested_seconds: number;
    completed_formatted: string;
    suggested_formatted: string;
    percentage: number;
  };
}

export interface ActivityMatch {
  suggested: {
    activity_type: string;
    target_distance_meters: number | null;
    target_duration_minutes: number | null;
  };
  matched_activity_id: number | null;
  matched_distance_km: number | null;
  matched_duration_formatted: string | null;
  matched_pace: number | null;
  status: MatchStatus;
}

export interface Highlights {
  longest_activity_distance_km: number | null;
  longest_activity_duration_formatted: string | null;
  total_elevation_gain: number;
  total_calories: number;
  avg_pace: number | null;
}

export interface TrendData {
  vs_previous_week: TrendDirection | null;
  distance_change_pct: number | null;
  duration_change_pct: number | null;
}

export interface CoachMessage {
  key: string;
  message: string;
}

export interface WeekFeedback {
  week_id: number;
  week_number: number;
  program_name: string;
  program_goal: string | null;
  compliance: ComplianceData;
  activity_matching: ActivityMatch[];
  highlights: Highlights;
  trends: TrendData;
  consistency_score: number;
  coach_messages: CoachMessage[];
  overall_rating: OverallRating;
}

export type WeekFeedbackResponse = ApiResponse<WeekFeedback>;

// ============ TRAINING TIPS ============

export type TipCategory = 'mindset' | 'recovery' | 'technique' | 'nutrition' | 'sleep' | 'pacing';
export type TipStatus = 'draft' | 'active' | 'archived';
export type AiMode = 'silent' | 'reactive' | 'proactive';

export interface TrainingTip {
  id: number;
  title: string;
  content: string | null; // Null in list view, full content in detail view
  category: TipCategory;
  emotional_load: number; // 1-3
  priority: number;
  status: TipStatus;
  translated_title?: string; // Present if Accept-Language header sent
  translated_content?: string; // Present if Accept-Language header sent
  created_at: string;
  updated_at: string;
}

export interface AvailableTipsResponse {
  data: TrainingTip[];
}

export interface TipDetailResponse {
  data: TrainingTip;
}

export interface MarkTipHelpfulResponse {
  message: string;
}

export interface MentalBudget {
  max_tips_per_week: number;
  tips_delivered_this_week: number;
  remaining_tips: number;
  max_emotional_load_per_week: number;
  emotional_load_used: number;
  remaining_load: number;
  ai_mode: AiMode;
  week_start_date: string;
  week_end_date: string;
}

export interface MentalBudgetResponse {
  data: MentalBudget;
}

export interface UpdateMentalBudgetRequest {
  max_tips_per_week?: number; // 0-10
  ai_mode?: AiMode;
}

export interface UpdateMentalBudgetResponse {
  data: MentalBudget;
  message: string;
}
