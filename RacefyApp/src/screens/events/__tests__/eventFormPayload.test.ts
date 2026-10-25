import type { Event } from '../../../types/api';
import type { CommentarySettingsData, FormData } from '../EventFormScreen.utils';
import {
  buildCreateEventPayload,
  buildUpdateEventPayload,
  commentarySettingsPayload,
  eventToFormData,
  mapEventApiErrors,
} from '../eventFormPayload';

/** What actually reaches the API: createEvent/updateEvent send JSON.stringify(payload). */
const wire = (payload: unknown) => JSON.parse(JSON.stringify(payload));

const STARTS = '2026-11-01T09:00:00.000Z';
const ENDS = '2026-11-01T13:00:00.000Z';

const minimalForm: FormData = {
  title: 'Parkrun',
  content: '',
  sport_type_id: 1,
  ranking_mode: 'fastest_time',
  location_name: 'Park',
  latitude: 52.1,
  longitude: 21.0,
  starts_at: new Date(STARTS),
  ends_at: new Date(ENDS),
  registration_opens_at: null,
  registration_closes_at: null,
  max_participants: '',
  difficulty: 'all_levels',
  distance: '',
  entry_fee: '',
  show_start_finish_points: false,
  start_finish_note: '',
  allow_multiple_activities: false,
  auto_finalize_results: true,
  visibility: 'public',
  time_limit: '',
  target_elevation: '',
  is_team_event: false,
  team_size_min: '',
  team_size_max: '',
  team_scoring: 'sum',
  point_rewards_first: '',
  point_rewards_second: '',
  point_rewards_third: '',
  point_rewards_finisher: '',
  route_id: null,
};

const fullForm: FormData = {
  ...minimalForm,
  content: 'Opis',
  registration_opens_at: new Date('2026-10-20T08:00:00.000Z'),
  registration_closes_at: new Date('2026-10-31T20:00:00.000Z'),
  max_participants: '100',
  difficulty: 'advanced',
  distance: '10.5',
  entry_fee: '25.5',
  show_start_finish_points: true,
  start_finish_note: 'Start przy fontannie',
  allow_multiple_activities: true,
  auto_finalize_results: false,
  visibility: 'followers',
  time_limit: '90',
  target_elevation: '850',
  is_team_event: true,
  team_size_min: '2',
  team_size_max: '4',
  team_scoring: 'average',
  point_rewards_first: '500',
  point_rewards_finisher: '50',
  route_id: 7,
};

const common = {
  title: 'Parkrun',
  content: '',
  sport_type_id: 1,
  ranking_mode: 'fastest_time',
  location_name: 'Park',
  latitude: 52.1,
  longitude: 21.0,
  starts_at: STARTS,
  ends_at: ENDS,
  difficulty: 'all_levels',
  show_start_finish_points: false,
  allow_multiple_activities: false,
  visibility: 'public',
  is_team_event: false,
  route_id: null,
};

const fullCommon = {
  ...common,
  content: 'Opis',
  registration_opens_at: '2026-10-20T08:00:00.000Z',
  registration_closes_at: '2026-10-31T20:00:00.000Z',
  max_participants: 100,
  difficulty: 'advanced',
  distance: 10500,
  entry_fee: 25.5,
  show_start_finish_points: true,
  start_finish_note: 'Start przy fontannie',
  allow_multiple_activities: true,
  auto_finalize_results: false,
  visibility: 'followers',
  time_limit: 5400,
  target_elevation: 850,
  is_team_event: true,
  team_size_min: 2,
  team_size_max: 4,
  team_scoring: 'average',
  point_rewards: { first_place: 500, finisher: 50 },
  route_id: 7,
};

describe('buildUpdateEventPayload', () => {
  it('sends cleared optional fields as null so the server forgets them', () => {
    expect(wire(buildUpdateEventPayload(minimalForm, { entryFeeEnabled: true }))).toStrictEqual({
      ...common,
      registration_opens_at: null,
      registration_closes_at: null,
      max_participants: null,
      distance: null,
      target_elevation: null,
      entry_fee: null,
      auto_finalize_results: true,
    });
  });

  it('converts every filled field to API units', () => {
    expect(wire(buildUpdateEventPayload(fullForm, { entryFeeEnabled: true }))).toStrictEqual(
      fullCommon,
    );
  });

  it('sends entry_fee as null when the feature flag is off', () => {
    expect(buildUpdateEventPayload(fullForm, { entryFeeEnabled: false }).entry_fee).toBeNull();
  });
});

describe('buildCreateEventPayload', () => {
  it('omits empty optional fields and the default auto_finalize_results', () => {
    expect(wire(buildCreateEventPayload(minimalForm, { entryFeeEnabled: true }))).toStrictEqual(
      common,
    );
  });

  it('converts every filled field to API units', () => {
    expect(wire(buildCreateEventPayload(fullForm, { entryFeeEnabled: true }))).toStrictEqual(
      fullCommon,
    );
  });

  it('omits entry_fee entirely when the feature flag is off', () => {
    expect(wire(buildCreateEventPayload(fullForm, { entryFeeEnabled: false }))).not.toHaveProperty(
      'entry_fee',
    );
  });
});

describe.each([
  ['create', buildCreateEventPayload],
  ['update', buildUpdateEventPayload],
] as const)('%s payload', (_mode, build) => {
  it('drops team fields for a non-team event even when sizes are filled', () => {
    const payload = wire(
      build(
        { ...fullForm, is_team_event: false },
        {
          entryFeeEnabled: true,
        },
      ),
    );
    expect(payload.is_team_event).toBe(false);
    expect(payload).not.toHaveProperty('team_size_min');
    expect(payload).not.toHaveProperty('team_size_max');
    expect(payload).not.toHaveProperty('team_scoring');
  });

  it('parses integers leniently, like the form inputs allow', () => {
    const payload = build(
      { ...minimalForm, max_participants: '12.7', point_rewards_third: '30pts' },
      { entryFeeEnabled: true },
    );
    expect(payload.max_participants).toBe(12);
    expect(wire(payload).point_rewards).toStrictEqual({ third_place: 30 });
  });
});

describe('eventToFormData', () => {
  const event = {
    id: 3,
    status: 'upcoming',
    post: { title: 'Parkrun', content: 'Opis' },
    sport_type_id: null,
    sport_type: { id: 4 },
    location_name: 'Park',
    ranking_mode: 'fastest_time',
    coordinates: [21.0, 52.1],
    starts_at: STARTS,
    ends_at: ENDS,
    registration_opens_at: null,
    registration_closes_at: '2026-10-31T20:00:00.000Z',
    max_participants: 100,
    difficulty: 'advanced',
    distance: null,
    target_distance: 21097,
    entry_fee: null,
    time_limit: 5400,
    team_size_min: 2,
    point_rewards: { first_place: 500, second_place: null },
    route_id: 0,
  } as unknown as Event;

  it('maps API units and fallbacks back into form strings', () => {
    expect(eventToFormData(event)).toStrictEqual({
      title: 'Parkrun',
      content: 'Opis',
      sport_type_id: 4,
      location_name: 'Park',
      ranking_mode: 'fastest_time',
      latitude: 52.1,
      longitude: 21.0,
      starts_at: new Date(STARTS),
      ends_at: new Date(ENDS),
      registration_opens_at: null,
      registration_closes_at: new Date('2026-10-31T20:00:00.000Z'),
      max_participants: '100',
      difficulty: 'advanced',
      distance: '21.097',
      entry_fee: '',
      show_start_finish_points: false,
      start_finish_note: '',
      allow_multiple_activities: false,
      auto_finalize_results: true,
      visibility: 'public',
      time_limit: '90',
      target_elevation: '',
      is_team_event: false,
      team_size_min: '2',
      team_size_max: '',
      team_scoring: 'sum',
      point_rewards_first: '500',
      point_rewards_second: '',
      point_rewards_third: '',
      point_rewards_finisher: '',
      route_id: null,
    });
  });

  it('round-trips an edited event to the same update payload', () => {
    const form = eventToFormData({
      ...event,
      sport_type_id: 1,
      distance: 10500,
      entry_fee: 25.5,
      auto_finalize_results: false,
    } as Event);
    const payload = wire(buildUpdateEventPayload(form, { entryFeeEnabled: true }));
    expect(payload).toMatchObject({
      sport_type_id: 1,
      distance: 10500,
      entry_fee: 25.5,
      time_limit: 5400,
      max_participants: 100,
      auto_finalize_results: false,
      point_rewards: { first_place: 500 },
    });
  });
});

it('rounds the distance to whole metres', () => {
  const payload = buildCreateEventPayload(
    { ...minimalForm, distance: '1.005' },
    { entryFeeEnabled: true },
  );
  expect(payload.distance).toBe(1005);
});

describe('coordinates', () => {
  const noPin = { ...minimalForm, latitude: null, longitude: null };

  it('create leaves out a location that was never picked', () => {
    const payload = wire(buildCreateEventPayload(noPin, { entryFeeEnabled: true }));
    expect(payload).not.toHaveProperty('latitude');
    expect(payload).not.toHaveProperty('longitude');
  });

  it('update clears it with null', () => {
    const payload = buildUpdateEventPayload(noPin, { entryFeeEnabled: true });
    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
  });

  it('reads [lng, lat] from the API and treats a missing pair as no location', () => {
    expect(eventToFormData({ coordinates: null } as unknown as Event)).toMatchObject({
      latitude: null,
      longitude: null,
    });
  });
});

describe('mapEventApiErrors', () => {
  it('flattens nested point_rewards keys onto form fields', () => {
    expect(
      mapEventApiErrors({
        title: ['Required'],
        'point_rewards.first_place': ['Too many'],
        'point_rewards.finisher': ['Too many'],
        'point_rewards.total': ['Budget'],
        'recurrence.by_weekday': ['Pick a day'],
        'recurrence.count': ['Too many'],
      }),
    ).toStrictEqual({
      title: ['Required'],
      point_rewards_first: ['Too many'],
      point_rewards_finisher: ['Too many'],
      point_rewards_total: ['Budget'],
      recurrence: ['Pick a day'],
    });
  });
});

describe('commentarySettingsPayload', () => {
  const settings: CommentarySettingsData = {
    enabled: true,
    style: 'exciting',
    token_limit: 5000,
    interval_minutes: 15,
    auto_publish: true,
    languages: ['pl'],
    force_participants: false,
    time_windows: [],
    days_of_week: [1, 3],
    pause_summary_enabled: true,
  } as CommentarySettingsData;

  it('sends empty schedules as null (no restriction)', () => {
    const payload = commentarySettingsPayload(settings);
    expect(payload.time_windows).toBeNull();
    expect(payload.days_of_week).toStrictEqual([1, 3]);
  });
});
