/**
 * Minimal semantic version comparator — no external dependencies.
 *
 * Handles MAJOR.MINOR.PATCH numerically and ignores any prerelease /
 * build-metadata suffix (`1.2.3-beta.1` → `1.2.3`). Missing segments are
 * treated as 0 so `"1.2"` compares equal to `"1.2.0"`.
 *
 * Returns:
 *   -1 if `a < b`
 *    0 if `a === b`
 *    1 if `a > b`
 *
 * Invalid input (non-numeric segments) yields 0 with a console.warn — we
 * fail open so a malformed version from the server can never lock the
 * user out of the app.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parsed = (v: string): number[] => {
    const stripped = v.split(/[-+]/)[0]; // drop prerelease/build metadata
    const parts = stripped.split('.').map((p) => parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n))) {
      // eslint-disable-next-line no-console
      console.warn(`[semver] Invalid version: "${v}"`);
      return [0, 0, 0];
    }
    while (parts.length < 3) parts.push(0);
    return parts;
  };

  const pa = parsed(a);
  const pb = parsed(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}