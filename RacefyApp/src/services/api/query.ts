export type QueryValue = string | number | null | undefined;

/**
 * `path` with `params` as a query string, in key order. Falsy values (undefined,
 * null, '', 0) are left out — the `if (params?.x) query.append(...)` guards this
 * replaces — so a value that must be sent even when 0 goes in as a string.
 * No `?` when nothing is left.
 */
export function withQuery(path: string, params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.append(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
