/**
 * Lightweight runtime guards for critical API response shapes.
 *
 * These functions validate that server responses contain the fields the app
 * depends on, and throw a descriptive error (caught by ErrorBoundary or caller)
 * instead of failing silently with undefined/null downstream.
 *
 * Intentionally minimal — covers only auth and user-identity responses that
 * are security-critical. For full schema validation, consider adding zod.
 */

/** Asserts that a value is a non-null object */
function assertObject(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`API response guard: expected object at ${context}, got ${typeof value}`);
  }
}

/** Asserts that a required string field is present and non-empty */
function assertString(obj: Record<string, unknown>, field: string, context: string): void {
  if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
    throw new Error(
      `API response guard: missing or empty string "${field}" in ${context}`
    );
  }
}

/** Asserts that a required number field is present and positive */
function assertPositiveNumber(obj: Record<string, unknown>, field: string, context: string): void {
  if (typeof obj[field] !== 'number' || (obj[field] as number) <= 0) {
    throw new Error(
      `API response guard: missing or invalid number "${field}" in ${context}`
    );
  }
}

/**
 * Validates that an auth `user` object has the minimum required fields.
 * Called after login / register / googleAuth to catch malformed server responses.
 */
export function assertUser(value: unknown): void {
  assertObject(value, 'User');
  assertPositiveNumber(value, 'id', 'User');
  assertString(value, 'email', 'User');
  assertString(value, 'name', 'User');
}

/**
 * Validates that an auth token string is present and non-empty.
 * Called when extracting access_token from login / register / googleAuth responses.
 */
export function assertToken(token: string | undefined | null, context: string): asserts token is string {
  if (!token || token.trim().length === 0) {
    throw new Error(`API response guard: missing access token in ${context} response`);
  }
}
