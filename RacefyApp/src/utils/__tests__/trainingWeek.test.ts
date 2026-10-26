import {
  activityIcon,
  defaultWeek,
  getSessions,
  humanize,
  programAdherence,
  programProgress,
  weekStats,
} from '../trainingWeek';
import type { TrainingWeek } from '../../types/api';

const km = (m: number) => `${m / 1000} km`;

const week = (patch: Partial<TrainingWeek>): TrainingWeek =>
  ({
    id: 1,
    week_number: 1,
    status: 'current',
    activities: [],
    suggested_activities: [],
    ...patch,
  }) as TrainingWeek;

describe('humanize', () => {
  it('turns snake/kebab case into a sentence', () => {
    expect(humanize('long_run')).toBe('Long run');
    expect(humanize('easy-recovery')).toBe('Easy recovery');
    expect(humanize('')).toBe('');
  });
});

describe('getSessions', () => {
  it('prefers concrete activities with their status', () => {
    const sessions = getSessions(
      week({
        activities: [
          {
            id: 7,
            activity_type: 'tempo_run',
            description: null,
            distance_meters: 8000,
            intensity: 'Z3',
            duration_minutes: 45,
            status: 'completed',
          },
        ] as never,
        suggested_activities: [{ id: 9, activity_type: 'easy' }] as never,
      }),
      km,
    );
    expect(sessions).toEqual([
      {
        id: 'a-7',
        title: 'Tempo run',
        detail: '8 km · Z3',
        durationMinutes: 45,
        status: 'completed',
        iconType: 'tempo_run',
      },
    ]);
  });

  it('falls back to the prescription, always pending, with the session sport', () => {
    const [s] = getSessions(
      week({
        suggested_activities: [
          {
            id: 3,
            activity_type: 'swim_drills',
            target_distance_meters: null,
            intensity_description: 'easy',
            target_duration_minutes: 30,
            sport_slug: 'swimming',
          },
        ] as never,
      }),
      km,
    );
    expect(s).toMatchObject({
      id: 's-3',
      title: 'Swim drills',
      detail: 'easy',
      status: 'pending',
      sportSlug: 'swimming',
    });
  });
});

describe('weekStats', () => {
  it('counts done sessions, preferring the server progress when higher', () => {
    const w = week({
      suggested_activities: [
        { id: 1, activity_type: 'run', target_duration_minutes: 30 },
        { id: 2, activity_type: 'run', target_duration_minutes: 40 },
      ] as never,
      progress: { activities_count: 1, suggested_activities_count: 2 } as never,
    });
    expect(weekStats(w, km)).toMatchObject({
      completed: 1,
      total: 2,
      plannedMinutes: 70,
      percent: 50,
    });
  });

  it('caps the percent at 100', () => {
    const w = week({ progress: { activities_count: 5, suggested_activities_count: 3 } as never });
    expect(weekStats(w, km).percent).toBe(100);
  });
});

describe('programAdherence', () => {
  it('ignores upcoming weeks and is null before anything was planned', () => {
    const done = week({
      status: 'completed',
      progress: { activities_count: 3, suggested_activities_count: 4 } as never,
    });
    const upcoming = week({
      id: 2,
      status: 'upcoming',
      progress: { activities_count: 0, suggested_activities_count: 4 } as never,
    });
    expect(programAdherence([done, upcoming], km)).toBe(75);
    expect(programAdherence([upcoming], km)).toBeNull();
  });
});

describe('programProgress', () => {
  it('counts finished weeks before the current one', () => {
    expect(programProgress({ total_weeks: 12, current_week_number: 4 })).toEqual({
      totalWeeks: 12,
      currentWeekNumber: 4,
      weeksDone: 3,
      toGo: 9,
      overallPercent: 25,
    });
  });

  it('copes with a programme that has not started', () => {
    expect(programProgress({ total_weeks: 0, current_week_number: null })).toMatchObject({
      weeksDone: 0,
      overallPercent: 0,
    });
  });
});

describe('defaultWeek', () => {
  it('picks the current week, else the first', () => {
    const a = week({ id: 1, status: 'completed' });
    const b = week({ id: 2, status: 'active' });
    expect(defaultWeek([a, b])?.id).toBe(2);
    expect(defaultWeek([a])?.id).toBe(1);
    expect(defaultWeek([])).toBeNull();
  });
});

describe('activityIcon', () => {
  it('trusts the session sport over the type name', () => {
    expect(activityIcon('interval', 'swimming')).toBe('water');
    expect(activityIcon('long_ride', 'cycling')).toBe('bicycle');
  });
  it('guesses from the type name otherwise', () => {
    expect(activityIcon('rest_day')).toBe('bed-outline');
    expect(activityIcon('hill_repeats')).toBe('flame');
    expect(activityIcon('easy_run')).toBe('walk');
  });
});
