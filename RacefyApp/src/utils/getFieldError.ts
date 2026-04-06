/**
 * Normalizes a field error from API validation responses.
 *
 * Laravel returns validation errors as arrays:
 *   { "field": ["The field is required."] }
 *
 * Some local form validation stores errors as plain strings.
 * This helper accepts both shapes and returns the first message (or undefined).
 */
export function getFieldError(
  errors: Record<string, string | string[] | undefined> | null | undefined,
  field: string
): string | undefined {
  const raw = errors?.[field];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/**
 * Same as getFieldError but accepts a raw value (already extracted from an
 * errors object). Useful inside reusable input components that receive
 * `error?: string | string[]` directly.
 */
export function normalizeFieldError(
  raw: string | string[] | undefined | null
): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}