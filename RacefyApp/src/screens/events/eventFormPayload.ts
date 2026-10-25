import type {
  CommentarySettings,
  CreateEventRequest,
  Event,
  UpdateCommentarySettingsRequest,
  UpdateEventRequest,
} from '../../types/api';
import type { CommentarySettingsData, FormData as EventFormData } from './EventFormScreen.utils';

interface PayloadOptions {
  /** `event_entry_fee` feature flag — without it the fee is never sent. */
  entryFeeEnabled: boolean;
}

const toInt = (value: string): number | undefined => (value ? parseInt(value, 10) : undefined);

/** Fields sent the same way on create and update; optional ones are `undefined` when empty. */
function buildSharedFields(formData: EventFormData, { entryFeeEnabled }: PayloadOptions) {
  const isTeam = formData.is_team_event;
  const hasRewards =
    formData.point_rewards_first ||
    formData.point_rewards_second ||
    formData.point_rewards_third ||
    formData.point_rewards_finisher;
  return {
    title: formData.title,
    content: formData.content,
    sport_type_id: formData.sport_type_id!,
    ranking_mode: formData.ranking_mode,
    location_name: formData.location_name,
    latitude: formData.latitude,
    longitude: formData.longitude,
    starts_at: formData.starts_at.toISOString(),
    ends_at: formData.ends_at.toISOString(),
    registration_opens_at: formData.registration_opens_at?.toISOString(),
    registration_closes_at: formData.registration_closes_at?.toISOString(),
    max_participants: toInt(formData.max_participants),
    difficulty: formData.difficulty,
    // Convert from km (form) to meters (API) — backend auto-mirrors distance → target_distance
    distance: formData.distance ? parseFloat(formData.distance) * 1000 : undefined,
    entry_fee: entryFeeEnabled && formData.entry_fee ? parseFloat(formData.entry_fee) : undefined,
    show_start_finish_points: formData.show_start_finish_points,
    start_finish_note: formData.start_finish_note || undefined,
    allow_multiple_activities: formData.allow_multiple_activities,
    visibility: formData.visibility,
    // Minutes in the form, seconds in the API
    time_limit: formData.time_limit ? parseInt(formData.time_limit, 10) * 60 : undefined,
    is_team_event: isTeam,
    team_size_min: isTeam ? toInt(formData.team_size_min) : undefined,
    team_size_max: isTeam ? toInt(formData.team_size_max) : undefined,
    team_scoring: isTeam ? formData.team_scoring : undefined,
    point_rewards: hasRewards
      ? {
          first_place: toInt(formData.point_rewards_first),
          second_place: toInt(formData.point_rewards_second),
          third_place: toInt(formData.point_rewards_third),
          finisher: toInt(formData.point_rewards_finisher),
        }
      : undefined,
    route_id: formData.route_id,
  };
}

/** Create leaves empty optional fields out; the API applies its defaults. */
export function buildCreateEventPayload(
  formData: EventFormData,
  options: PayloadOptions,
): CreateEventRequest {
  const { entry_fee, ...fields } = buildSharedFields(formData, options);
  return {
    ...fields,
    ...(entry_fee !== undefined ? { entry_fee } : {}),
    // API defaults to true, so it is only sent when switched off
    ...(!formData.auto_finalize_results ? { auto_finalize_results: false } : {}),
  };
}

/** Update sends cleared fields as `null` — leaving them out would keep the old value. */
export function buildUpdateEventPayload(
  formData: EventFormData,
  options: PayloadOptions,
): UpdateEventRequest {
  const fields = buildSharedFields(formData, options);
  return {
    ...fields,
    registration_opens_at: fields.registration_opens_at ?? null,
    registration_closes_at: fields.registration_closes_at ?? null,
    max_participants: fields.max_participants ?? null,
    distance: fields.distance ?? null,
    entry_fee: fields.entry_fee ?? null,
    auto_finalize_results: formData.auto_finalize_results,
  };
}

export function eventToFormData(event: Event): EventFormData {
  // Use sport_type_id if available, otherwise fallback to sport_type.id
  const sportTypeId = event.sport_type_id ?? event.sport_type?.id ?? null;
  return {
    title: event.post?.title || '',
    content: event.post?.content || '',
    sport_type_id: sportTypeId,
    location_name: event.location_name,
    ranking_mode: event.ranking_mode,
    latitude: event.latitude,
    longitude: event.longitude,
    starts_at: new Date(event.starts_at),
    ends_at: new Date(event.ends_at),
    registration_opens_at: event.registration_opens_at
      ? new Date(event.registration_opens_at)
      : null,
    registration_closes_at: event.registration_closes_at
      ? new Date(event.registration_closes_at)
      : null,
    max_participants: event.max_participants?.toString() || '',
    difficulty: event.difficulty,
    // Convert from meters (API) to km (form display).
    // Backend auto-mirrors `distance` ↔ `target_distance`, so prefer
    // whichever is set when loading an existing event.
    distance: event.distance
      ? (event.distance / 1000).toString()
      : event.target_distance
        ? (event.target_distance / 1000).toString()
        : '',
    entry_fee: event.entry_fee?.toString() || '',
    // GPS Privacy (new in 2026-01)
    show_start_finish_points: event.show_start_finish_points ?? false,
    start_finish_note: event.start_finish_note || '',
    // Activity aggregation
    allow_multiple_activities: event.allow_multiple_activities ?? false,
    auto_finalize_results: event.auto_finalize_results !== false,
    // Visibility
    visibility: event.visibility || 'public',
    // Ranking mode config (target_distance is mirrored from `distance` by backend)
    time_limit: event.time_limit ? (event.time_limit / 60).toString() : '',
    // Team event
    is_team_event: event.is_team_event ?? false,
    team_size_min: event.team_size_min?.toString() || '',
    team_size_max: event.team_size_max?.toString() || '',
    team_scoring: event.team_scoring || 'sum',
    // Point rewards
    point_rewards_first: event.point_rewards?.first_place?.toString() || '',
    point_rewards_second: event.point_rewards?.second_place?.toString() || '',
    point_rewards_third: event.point_rewards?.third_place?.toString() || '',
    point_rewards_finisher: event.point_rewards?.finisher?.toString() || '',
    // Route planning
    route_id: event.route_id || null,
  };
}

export function commentarySettingsFromApi(settings: CommentarySettings): CommentarySettingsData {
  return {
    enabled: settings.enabled,
    style: settings.style,
    token_limit: settings.token_limit,
    interval_minutes: settings.interval_minutes,
    auto_publish: settings.auto_publish,
    languages: settings.languages,
    force_participants: settings.force_participants || false,
    time_windows: settings.time_windows || [],
    days_of_week: settings.days_of_week || [],
    pause_summary_enabled: settings.pause_summary_enabled !== false,
  };
}

/** Body for `updateCommentarySettings` — empty schedules go out as `null` (no restriction). */
export function commentarySettingsPayload(
  settings: CommentarySettingsData,
): UpdateCommentarySettingsRequest {
  return {
    enabled: settings.enabled,
    style: settings.style,
    token_limit: settings.token_limit,
    interval_minutes: settings.interval_minutes,
    auto_publish: settings.auto_publish,
    languages: settings.languages,
    force_participants: settings.force_participants,
    time_windows: settings.time_windows.length > 0 ? settings.time_windows : null,
    days_of_week: settings.days_of_week.length > 0 ? settings.days_of_week : null,
    pause_summary_enabled: settings.pause_summary_enabled,
  };
}

/** Laravel field errors → form field keys (`point_rewards.first_place` → `point_rewards_first`). */
export function mapEventApiErrors(
  apiErrors: Record<string, unknown>,
): Record<string, string | string[]> {
  const mapped: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(apiErrors)) {
    // Flatten nested point_rewards.* → point_rewards_*
    if (key.startsWith('point_rewards.')) {
      const sub = key.slice('point_rewards.'.length);
      const flatKey =
        sub === 'first_place'
          ? 'point_rewards_first'
          : sub === 'second_place'
            ? 'point_rewards_second'
            : sub === 'third_place'
              ? 'point_rewards_third'
              : sub === 'finisher'
                ? 'point_rewards_finisher'
                : `point_rewards_${sub}`;
      mapped[flatKey] = value as string[];
    } else {
      mapped[key] = value as string[];
    }
  }
  return mapped;
}
