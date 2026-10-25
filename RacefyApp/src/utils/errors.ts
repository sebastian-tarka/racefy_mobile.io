import type { ApiError } from '../types/api';

/**
 * What `api.request()` throws on a non-2xx response: the parsed JSON body with
 * `status` attached. Endpoints add their own fields (`feature`, `limit`,
 * `usage_count`, `upgrade_required`, `training_week_id`…), hence the index signature.
 */
export type ApiErrorBody = ApiError & Record<string, unknown>;

/** True for an error thrown by `api.request()` — a network failure has no `status`. */
export function isApiError(error: unknown): error is ApiErrorBody {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

/** Message of an `Error`, an API error body or a thrown string; `fallback` otherwise. */
export function getErrorMessage(error: unknown, fallback = ''): string {
  if (typeof error === 'string') return error || fallback;
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  return isApiError(error) ? error.status : undefined;
}

/** `code` of a native module error (Google Sign-In, expo-sharing…). */
export function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
