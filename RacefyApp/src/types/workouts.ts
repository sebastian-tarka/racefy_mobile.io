// ============ STRENGTH WORKOUT PLANS ============
// Mirrors docs/mobile/TYPESCRIPT.md → "Strength Workout Plans" in the API repo.
// Plan → workouts pinned to weekdays → exercise prescriptions; exercises live in
// a per-user library with an optional admin-curated global one.

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'full_body'
  | 'cardio'
  | 'other';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'glutes',
  'core',
  'full_body',
  'cardio',
  'other',
];

export type WorkoutPlanStatus = 'draft' | 'active' | 'archived';
export type WorkoutPlanSource = 'manual' | 'xlsx_import';
/** reps: reps_min/max are repetitions · seconds: they are seconds (plank) · amrap: "max", both null */
export type WorkoutTargetType = 'reps' | 'seconds' | 'amrap';
/** 1 = Monday … 7 = Sunday */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export interface Exercise {
  id: number;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  video_url: string | null;
  description: string | null;
  /** Admin-curated, read-only for users. */
  is_global: boolean;
  /** How many workouts prescribe it (library endpoints). */
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: number;
  workout_id: number;
  display_order: number;
  exercise: Exercise;
  sets: number;
  target_type: WorkoutTargetType;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  superset_group: number | null;
  /** Link to open (override ?? exercise.video_url). */
  video_url: string | null;
  /** The per-workout override alone. */
  video_url_override: string | null;
  notes: string | null;
  /** Free text from the spreadsheet, e.g. "25 i pow 8". */
  load_note: string | null;
  target_weight_kg: number | null;
  /** Original "6-10" / "max" / "45-60 s". */
  raw_prescription: string | null;
}

export interface Workout {
  id: number;
  workout_plan_id: number;
  name: string;
  /** "Dzień 1" */
  day_label: string | null;
  display_order: number;
  weekday: Weekday | null;
  focus: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  exercises_count?: number;
  /** Present on plan detail / workout responses. */
  exercises?: WorkoutExercise[];
  created_at: string;
  updated_at: string;
}

export type ScheduleNotes = Partial<Record<`${Weekday}`, string>>;

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string | null;
  goal: string | null;
  status: WorkoutPlanStatus;
  sport_type?: { id: number; name: string; slug: string; icon: string };
  /** YYYY-MM-DD */
  starts_on: string | null;
  ends_on: string | null;
  /** Days without a strength workout. Always an object. */
  schedule_notes: ScheduleNotes;
  source: WorkoutPlanSource;
  source_filename: string | null;
  workouts_count?: number;
  /** Present on GET /workout-plans/{id}. */
  workouts?: Workout[];
  created_at: string;
  updated_at: string;
}

// ── request bodies ──────────────────────────────────────────────────────────

export interface ExerciseReference {
  /** Own or global exercise. */
  id?: number | null;
  /** Matched case/diacritic-insensitively, created when new. */
  name?: string;
  muscle_group?: MuscleGroup;
  equipment?: string;
  video_url?: string;
  description?: string;
}

export interface WorkoutExerciseInput {
  exercise: ExerciseReference;
  /** 1–20 */
  sets: number;
  /** Default 'reps'. */
  target_type?: WorkoutTargetType;
  reps_min?: number | null;
  /** >= reps_min */
  reps_max?: number | null;
  /** 0–3600 */
  rest_seconds?: number | null;
  tempo?: string | null;
  superset_group?: number | null;
  video_url?: string | null;
  notes?: string | null;
  load_note?: string | null;
  target_weight_kg?: number | null;
  raw_prescription?: string | null;
}

/** PUT /workout-exercises/{id}: every field optional; `exercise` alone swaps the library row. */
export type WorkoutExerciseUpdate = Partial<WorkoutExerciseInput>;

export interface WorkoutInput {
  name: string;
  day_label?: string | null;
  weekday?: Weekday | null;
  focus?: string | null;
  notes?: string | null;
  exercises?: WorkoutExerciseInput[];
}

export type WorkoutUpdate = Partial<Omit<WorkoutInput, 'exercises'>>;

export interface WorkoutPlanInput {
  name: string;
  description?: string | null;
  goal?: string | null;
  /** Defaults to strength-training. */
  sport_type_id?: number;
  starts_on?: string | null;
  ends_on?: string | null;
  schedule_notes?: ScheduleNotes;
  source?: WorkoutPlanSource;
  source_filename?: string | null;
  /** Nested create, max 30 × 40. */
  workouts?: WorkoutInput[];
}

export type WorkoutPlanUpdate = Partial<
  Pick<
    WorkoutPlanInput,
    'name' | 'description' | 'goal' | 'starts_on' | 'ends_on' | 'schedule_notes'
  >
>;

export interface ExerciseInput {
  name: string;
  muscle_group?: MuscleGroup;
  equipment?: string | null;
  video_url?: string | null;
  description?: string | null;
  /** Admins only. */
  is_global?: boolean;
}

export interface ExerciseListParams {
  q?: string;
  muscle_group?: MuscleGroup;
  scope?: 'all' | 'mine' | 'global';
  page?: number;
  /** ≤ 100 */
  per_page?: number;
}

export interface ExerciseListResponse {
  data: Exercise[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
}

// ── XLSX import preview ─────────────────────────────────────────────────────

export interface ImportExerciseReference extends ExerciseReference {
  match: 'new' | 'existing';
  is_global: boolean;
}

export interface ImportWorkoutExercise extends WorkoutExerciseInput {
  exercise: ImportExerciseReference;
}

export interface ImportWorkout extends WorkoutInput {
  exercises: ImportWorkoutExercise[];
}

export interface WorkoutPlanImportPreview {
  message: string;
  data: Omit<WorkoutPlanInput, 'workouts'> & { workouts: ImportWorkout[] };
  warnings: { sheet: string; row: number; message: string }[];
  summary: {
    workouts: number;
    exercises: number;
    new_exercises: number;
    existing_exercises: number;
    scheduled_workouts: number;
  };
}
