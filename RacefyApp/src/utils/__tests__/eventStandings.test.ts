import {
  eventTarget,
  findViewerRow,
  findViewerTeam,
  gapToNeighbour,
  isAscendingMode,
  metricForMode,
  normalizeDnf,
  normalizeIndividualStanding,
  normalizeResult,
  normalizeTeamStanding,
  progressToTarget,
  rowUsername,
  sumBy,
} from '../eventStandings';
import type {
  EventDidNotFinishEntry,
  EventResult,
  EventStandingEntry,
  EventTeamStandingEntry,
} from '../../types/api';

const user = (id: number, name = `User ${id}`) => ({ id, name, username: `u${id}` });

const standing = (
  id: number,
  position: number,
  overrides: Partial<EventStandingEntry> = {},
): EventStandingEntry => ({
  position,
  user: user(id),
  activity: { id: id * 10, distance: 10000, duration: 3600, elevation_gain: 100 },
  is_finished: true,
  is_recording: false,
  live: null,
  ...overrides,
});

describe('metricForMode / isAscendingMode', () => {
  it('maps modes to the metric that decides the ranking', () => {
    expect(metricForMode('most_distance')).toBe('distance');
    expect(metricForMode('most_elevation')).toBe('elevation');
    expect(metricForMode('fastest_time')).toBe('duration');
    expect(metricForMode('first_finish')).toBe('duration');
    expect(metricForMode(undefined)).toBe('duration');
  });

  it('only time modes sort ascending', () => {
    expect(isAscendingMode('fastest_time')).toBe(true);
    expect(isAscendingMode('most_distance')).toBe(false);
  });
});

describe('normalizeIndividualStanding', () => {
  it('reads metrics from the activity in single-activity mode', () => {
    const row = normalizeIndividualStanding(
      standing(1, 1, { is_recording: true, live: { activity_id: 10 } }),
    );
    expect(row).toMatchObject({
      key: 'u-1',
      position: 1,
      distance: 10000,
      duration: 3600,
      elevation: 100,
      isFinished: true,
      isRecording: true,
      liveActivityId: 10,
      activityId: 10,
      activitiesCount: 1,
      isDnf: false,
    });
  });

  it('reads totals in aggregated mode and keeps a null activity id', () => {
    const row = normalizeIndividualStanding(
      standing(2, 3, {
        activity: null,
        activities_count: 4,
        total_distance: 42000,
        total_duration: 7200,
        total_elevation_gain: null,
        is_finished: false,
      }),
    );
    expect(row).toMatchObject({
      distance: 42000,
      duration: 7200,
      elevation: 0,
      activitiesCount: 4,
      activityId: null,
      liveActivityId: null,
      isRecording: false,
    });
  });

  it('keys anonymised rows by position so the list still renders', () => {
    const row = normalizeIndividualStanding(
      standing(0, 5, {
        user: { id: null, name: 'Participant', username: null, is_anonymous: true },
      }),
    );
    expect(row.key).toBe('u-pos-5');
    expect(rowUsername(row)).toBeNull();
  });
});

describe('normalizeTeamStanding', () => {
  const team: EventTeamStandingEntry = {
    position: 2,
    team: { id: 7, name: 'Biegacze' },
    members: [standing(1, 1, { is_recording: true }), standing(2, 2, { is_finished: false })],
    total_distance: 20000,
    total_duration: 7200,
    total_elevation: 200,
    finished_count: 1,
    recording_count: 1,
  };

  it('flattens members and carries the recording count', () => {
    const row = normalizeTeamStanding(team);
    expect(row).toMatchObject({
      key: 't-7',
      team: { id: 7, name: 'Biegacze' },
      distance: 20000,
      finishedCount: 1,
      recordingCount: 1,
      isRecording: true,
    });
    expect(row.memberRows.map((m) => m.key)).toEqual(['u-1', 'u-2']);
  });

  it('derives the recording count from members when the API omits it', () => {
    const { recording_count: _omit, ...withoutCount } = team;
    expect(normalizeTeamStanding(withoutCount).recordingCount).toBe(1);
  });
});

describe('normalizeResult / normalizeDnf', () => {
  it('maps a finalized result to a finished row with its place label', () => {
    const result = {
      id: 55,
      place: 1,
      place_label: '1st',
      user: user(3),
      activity_id: 30,
      duration: 3000,
      distance: 10000,
      elevation_gain: 50,
      finished_at: '2026-11-01T10:00:00Z',
      is_team_result: false,
      activities_count: 1,
    } as unknown as EventResult;
    expect(normalizeResult(result)).toMatchObject({
      key: 'r-55',
      position: 1,
      placeLabel: '1st',
      isFinished: true,
      activityId: 30,
      finishedAt: '2026-11-01T10:00:00Z',
    });
  });

  it('marks a DNF row without a position', () => {
    const dnf: EventDidNotFinishEntry = {
      user: user(4),
      distance: 8000,
      duration: 2500,
      elevation_gain: 10,
      activities_count: 1,
      reason: 'target_distance',
    };
    expect(normalizeDnf(dnf, 0)).toMatchObject({
      key: 'd-4',
      position: null,
      isDnf: true,
      dnfReason: 'target_distance',
      isFinished: false,
    });
  });
});

describe('eventTarget / progressToTarget', () => {
  it('prefers the elevation target over the distance target', () => {
    expect(eventTarget({ target_distance: 10000, target_elevation: 500 })).toEqual({
      key: 'elevation',
      value: 500,
    });
    expect(eventTarget({ target_distance: 10000, target_elevation: null })).toEqual({
      key: 'distance',
      value: 10000,
    });
    expect(eventTarget({ target_distance: null, target_elevation: null })).toBeNull();
    expect(eventTarget(null)).toBeNull();
  });

  it('clamps progress to 0…1', () => {
    const target = { key: 'distance' as const, value: 10000 };
    expect(progressToTarget({ distance: 5000, duration: 0, elevation: 0 }, target)).toBe(0.5);
    expect(progressToTarget({ distance: 15000, duration: 0, elevation: 0 }, target)).toBe(1);
    expect(
      progressToTarget({ distance: 1, duration: 0, elevation: 0 }, { ...target, value: 0 }),
    ).toBe(0);
  });
});

describe('gapToNeighbour', () => {
  const rows = [
    standing(1, 1, { activity: { id: 10, distance: 10000, duration: 3000, elevation_gain: 0 } }),
    standing(2, 2, { activity: { id: 20, distance: 10000, duration: 3200, elevation_gain: 0 } }),
    standing(3, 3, {
      is_finished: false,
      activity: { id: 30, distance: 6000, duration: 2000, elevation_gain: 0 },
    }),
  ].map(normalizeIndividualStanding);

  it('reports seconds to the person ahead when both finished in a time mode', () => {
    expect(gapToNeighbour(rows, rows[1], 'fastest_time')).toEqual({
      kind: 'time',
      leader: false,
      seconds: 200,
      place: 1,
    });
  });

  it('reports the lead over the runner-up for the leader', () => {
    expect(gapToNeighbour(rows, rows[0], 'fastest_time')).toEqual({
      kind: 'time',
      leader: true,
      seconds: 200,
      place: 2,
    });
  });

  it('falls back to distance while still on course in a time mode', () => {
    expect(gapToNeighbour(rows, rows[2], 'fastest_time')).toEqual({
      kind: 'metric',
      key: 'distance',
      leader: false,
      amount: 4000,
      place: 2,
    });
  });

  it('uses the ranking metric in volume modes', () => {
    const elevationRows = [
      standing(1, 1, { activity: { id: 10, distance: 0, duration: 0, elevation_gain: 900 } }),
      standing(2, 2, { activity: { id: 20, distance: 0, duration: 0, elevation_gain: 700 } }),
    ].map(normalizeIndividualStanding);
    expect(gapToNeighbour(elevationRows, elevationRows[1], 'most_elevation')).toEqual({
      kind: 'metric',
      key: 'elevation',
      leader: false,
      amount: 200,
      place: 1,
    });
  });

  it('returns null without a row or a neighbour', () => {
    expect(gapToNeighbour(rows, null, 'fastest_time')).toBeNull();
    expect(gapToNeighbour([rows[0]], rows[0], 'fastest_time')).toBeNull();
  });
});

describe('findViewerRow / findViewerTeam / sumBy', () => {
  const rows = [standing(1, 1), standing(2, 2)].map(normalizeIndividualStanding);
  const teams = [
    normalizeTeamStanding({
      position: 1,
      team: { id: 9, name: 'A' },
      members: [standing(2, 1)],
      total_distance: 1,
      total_duration: 1,
      total_elevation: 1,
      finished_count: 1,
    }),
  ];

  it('finds the signed-in user and their team', () => {
    expect(findViewerRow(rows, 2)?.key).toBe('u-2');
    expect(findViewerRow(rows, 3)).toBeNull();
    expect(findViewerRow(rows, null)).toBeNull();
    expect(findViewerTeam(teams, 2)?.key).toBe('t-9');
    expect(findViewerTeam(teams, 1)).toBeNull();
  });

  it('sums a metric over rows', () => {
    expect(sumBy(rows, 'distance')).toBe(20000);
  });
});
