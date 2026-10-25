// ============ ACTIVITY EFFORT ANALYSIS ============

export type EffortPhaseType = 'warmup' | 'steady' | 'peak' | 'decline' | 'cooldown' | 'intervals';

export type EffortQuality = 'high' | 'medium' | 'low';

/** `negative` = stronger finish, `positive` = weaker finish (running convention). */
export type PacingSplit = 'negative' | 'even' | 'positive';

export interface EffortPhase {
  type: EffortPhaseType;
  start_s: number;
  end_s: number;
  duration_s: number;
  /** Metres from the start of the activity. */
  start_distance: number;
  end_distance: number;
  /** Relative to 1.0 = this session's baseline. Never an absolute figure. */
  avg_effort: number;
  trend: number;
  confidence: number;
  /** m/s */
  avg_speed: number | null;
  avg_heart_rate: number | null;
}

/** `e === null` means the athlete was standing still - draw a gap, not a line. */
export interface EffortSeriesPoint {
  t: number;
  d: number;
  e: number | null;
}

export interface EffortMetrics {
  pacing_split: PacingSplit;
  pacing_drift_pct: number;
  effort_trend_pct_per_hour: number;
  /** 0..1 - share of time spent on a gradient above 3%. */
  terrain_index: number;
  variability: number | null;
  dispersion: number;
  /** Null without heart rate data. */
  aerobic_decoupling_pct: number | null;
  /** 0..100 */
  fatigue_score: number;
  baseline_proxy: number;
}

export interface ActivityEffortAnalysis {
  activity_id: number;
  version: number;
  quality: EffortQuality;
  /** excessive_pauses | no_elevation | no_terrain_model_for_sport | fragmented_recording */
  quality_reasons: string[];
  confidence: number;
  /** True = one even effort throughout. A result, not an empty state. */
  featureless: boolean;
  phases: EffortPhase[];
  /** ~120 points, chart-ready. Carries time and distance offsets only - never coordinates. */
  effort_series: EffortSeriesPoint[];
  metrics: EffortMetrics;
  model: 'minetti' | 'power' | 'speed' | null;
  has_heart_rate: boolean;
  computed_at: string | null;
}

export interface ActivityAnalysisSummary {
  quality: EffortQuality;
  confidence: number;
  featureless: boolean;
  phase_count: number;
  phase_types: EffortPhaseType[];
  fatigue_score: number | null;
  pacing_split: PacingSplit | null;
  aerobic_decoupling_pct: number | null;
}

/**
 * The endpoint answers with three deliberately different statuses and the UI
 * must tell them apart: 202 is transient (a job was just queued), 204/404 mean
 * the card must never render for this activity.
 */
export type EffortAnalysisResult =
  | { state: 'ready'; analysis: ActivityEffortAnalysis }
  | { state: 'pending' }
  | { state: 'unavailable' };
