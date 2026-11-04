import type {
  EventDidNotFinishEntry,
  EventDnfReason,
  EventRankingMode,
  EventResult,
  EventStandingEntry,
  EventStandingUser,
  EventTeamStandingEntry,
} from '../types/api';

/**
 * Live standings (GET /events/{id}/standings), finalized results (GET /events/{id}/results)
 * and the DNF list differ in shape. Everything on the live / results screens works on
 * `RankedRow`, built here — the same flattening the web app does in `utils/standings.js`.
 */

export type MetricKey = 'distance' | 'duration' | 'elevation';

export interface RankedRow {
  key: string;
  /** null for a DNF row. */
  position: number | null;
  /** null for team rows. */
  user: EventStandingUser | null;
  /** Set on team rows only. */
  team: { id: number; name: string } | null;
  /** meters */
  distance: number;
  /** seconds */
  duration: number;
  /** meters */
  elevation: number;
  isFinished: boolean;
  /** On course right now (`is_recording`). */
  isRecording: boolean;
  isDnf: boolean;
  dnfReason: EventDnfReason | null;
  /** Broadcast the viewer may open for cheering (LiveSpectator), else null. */
  liveActivityId: number | null;
  activityId: number | null;
  activitiesCount: number | null;
  finishedAt: string | null;
  /** "1st" — only on finalized results. */
  placeLabel: string | null;
  // Team rows
  memberRows: RankedRow[];
  finishedCount: number;
  recordingCount: number;
}

const EMPTY_TEAM = { memberRows: [] as RankedRow[], finishedCount: 0, recordingCount: 0 };

const num = (value: number | null | undefined): number => Number(value) || 0;

/** Which metric decides the ranking. */
export function metricForMode(mode: EventRankingMode | undefined): MetricKey {
  switch (mode) {
    case 'most_distance':
      return 'distance';
    case 'most_elevation':
      return 'elevation';
    default:
      return 'duration';
  }
}

/** Time-based rankings sort ascending (lower is better); volume-based descending. */
export function isAscendingMode(mode: EventRankingMode | undefined): boolean {
  return metricForMode(mode) === 'duration';
}

export function normalizeIndividualStanding(entry: EventStandingEntry): RankedRow {
  const a = entry.activity;
  return {
    key: `u-${entry.user?.id ?? `pos-${entry.position}`}`,
    position: entry.position,
    user: entry.user ?? null,
    team: null,
    distance: num(a ? a.distance : entry.total_distance),
    duration: num(a ? a.duration : entry.total_duration),
    elevation: num(a ? a.elevation_gain : entry.total_elevation_gain),
    isFinished: !!entry.is_finished,
    isRecording: !!entry.is_recording,
    isDnf: false,
    dnfReason: null,
    liveActivityId: entry.live?.activity_id ?? null,
    activityId: a?.id ?? null,
    activitiesCount: entry.activities_count ?? (a ? 1 : null),
    finishedAt: a?.ended_at ?? null,
    placeLabel: null,
    ...EMPTY_TEAM,
  };
}

export function normalizeTeamStanding(entry: EventTeamStandingEntry): RankedRow {
  const members = (entry.members ?? []).map(normalizeIndividualStanding);
  return {
    key: `t-${entry.team?.id ?? `pos-${entry.position}`}`,
    position: entry.position,
    user: null,
    team: entry.team ?? null,
    distance: num(entry.total_distance),
    duration: num(entry.total_duration),
    elevation: num(entry.total_elevation),
    isFinished: false,
    isRecording: (entry.recording_count ?? 0) > 0,
    isDnf: false,
    dnfReason: null,
    liveActivityId: null,
    activityId: null,
    activitiesCount: null,
    finishedAt: null,
    placeLabel: null,
    memberRows: members,
    finishedCount: entry.finished_count ?? 0,
    recordingCount: entry.recording_count ?? members.filter((m) => m.isRecording).length,
  };
}

/** One finalized EventResultResource (individual or team). */
export function normalizeResult(result: EventResult): RankedRow {
  const team = result.team ? { id: result.team.id, name: result.team.name } : null;
  return {
    key: `r-${result.id ?? `${result.place}-${result.user?.id ?? team?.id ?? ''}`}`,
    position: result.place,
    user: result.user ?? null,
    team,
    distance: num(result.distance),
    duration: num(result.duration),
    elevation: num(result.elevation_gain),
    isFinished: true,
    isRecording: false,
    isDnf: false,
    dnfReason: null,
    liveActivityId: null,
    activityId: result.activity_id ?? null,
    activitiesCount: result.activities_count ?? null,
    finishedAt: result.finished_at ?? null,
    placeLabel: result.place_label ?? null,
    ...EMPTY_TEAM,
  };
}

/** One `did_not_finish` entry — listed after the ranked rows, without a position. */
export function normalizeDnf(entry: EventDidNotFinishEntry, index: number): RankedRow {
  return {
    key: `d-${entry.user?.id ?? `anon-${index}`}`,
    position: null,
    user: entry.user ?? null,
    team: null,
    distance: num(entry.distance),
    duration: num(entry.duration),
    elevation: num(entry.elevation_gain),
    isFinished: false,
    isRecording: false,
    isDnf: true,
    dnfReason: entry.reason,
    liveActivityId: null,
    activityId: null,
    activitiesCount: entry.activities_count ?? null,
    finishedAt: null,
    placeLabel: null,
    ...EMPTY_TEAM,
  };
}

export function sumBy(rows: readonly RankedRow[], key: MetricKey): number {
  return rows.reduce((acc, row) => acc + row[key], 0);
}

export interface EventTarget {
  key: 'distance' | 'elevation';
  /** meters */
  value: number;
}

/**
 * The event's goal for a row: elevation or distance target. Null when the event has
 * no target — then there is nothing to show a share of.
 */
export function eventTarget(
  event: { target_distance?: number | null; target_elevation?: number | null } | null | undefined,
): EventTarget | null {
  if (!event) return null;
  if (event.target_elevation) return { key: 'elevation', value: Number(event.target_elevation) };
  if (event.target_distance) return { key: 'distance', value: Number(event.target_distance) };
  return null;
}

/** Share of the target a row has covered, clamped to 0…1. */
export function progressToTarget(row: Pick<RankedRow, MetricKey>, target: EventTarget): number {
  if (target.value <= 0) return 0;
  return Math.min(1, Math.max(0, row[target.key] / target.value));
}

type NeighbourGap =
  | { kind: 'time'; leader: boolean; seconds: number; place: number }
  | { kind: 'metric'; key: MetricKey; leader: boolean; amount: number; place: number };

/**
 * Where the viewer stands against the person just ahead (or, as the leader, against the
 * runner-up). Time mode with both finished → seconds; otherwise the metric (distance in
 * time modes, since racers are ordered by how far they got). Null with nobody to compare.
 */
export function gapToNeighbour(
  rows: readonly RankedRow[],
  me: RankedRow | null | undefined,
  mode: EventRankingMode | undefined,
): NeighbourGap | null {
  if (!me) return null;
  const idx = rows.findIndex((r) => r.key === me.key);
  if (idx < 0) return null;

  const leader = idx === 0;
  const other = leader ? rows[1] : rows[idx - 1];
  if (!other || other.position == null) return null;

  const timeMode = isAscendingMode(mode);
  if (timeMode && me.isFinished && other.isFinished) {
    return {
      kind: 'time',
      leader,
      seconds: Math.abs(me.duration - other.duration),
      place: other.position,
    };
  }

  const key: MetricKey = timeMode ? 'distance' : metricForMode(mode);
  return {
    kind: 'metric',
    key,
    leader,
    amount: Math.abs(other[key] - me[key]),
    place: other.position,
  };
}

/** The signed-in user's own row, if they appear in the standings. */
export function findViewerRow(
  rows: readonly RankedRow[],
  userId: number | null | undefined,
): RankedRow | null {
  if (userId == null) return null;
  return rows.find((r) => r.user?.id === userId) ?? null;
}

/** The team the signed-in user races in, if any. */
export function findViewerTeam(
  teams: readonly RankedRow[],
  userId: number | null | undefined,
): RankedRow | null {
  if (userId == null) return null;
  return teams.find((team) => team.memberRows.some((m) => m.user?.id === userId)) ?? null;
}

/** A row the viewer may open (not anonymised, has a username). */
export function rowUsername(row: RankedRow): string | null {
  return row.user && !row.user.is_anonymous ? (row.user.username ?? null) : null;
}
