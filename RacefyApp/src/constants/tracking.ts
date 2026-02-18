/**
 * Tracking & GPS constants for useLiveActivity.
 * Single source of truth for all timing, size, and calculation parameters.
 */

// ── Sync intervals ──────────────────────────────────────────────────────────

/** How often (ms) GPS points are synced to the server */
export const SYNC_INTERVAL_MS = 30_000;

/** How often (ms) the in-memory buffer is persisted to AsyncStorage (crash protection) */
export const PERSIST_INTERVAL_MS = 10_000;

/** Maximum backoff delay (ms) when sync fails repeatedly */
export const MAX_BACKOFF_MS = 300_000; // 5 minutes

// ── GPS signal thresholds ───────────────────────────────────────────────────

/** Time without GPS update (ms) below which signal is considered "good" */
export const GPS_GOOD_THRESHOLD_MS = 10_000;

/** Time without GPS update (ms) below which signal is considered "weak" (above = "lost") */
export const GPS_WEAK_THRESHOLD_MS = 30_000;

// ── Pace calculation ────────────────────────────────────────────────────────

/** Maximum number of pace segments kept in memory for rolling average */
export const MAX_PACE_SEGMENTS = 30;

// ── Calorie estimation ──────────────────────────────────────────────────────

/**
 * Rough calorie burn rate per second (kcal/s).
 * Based on average MET values: Running ~10, Cycling ~8, Gym ~5.
 * This is an approximation — a proper calculation would use weight × MET × duration.
 */
export const CALORIES_PER_SECOND = 0.15;
