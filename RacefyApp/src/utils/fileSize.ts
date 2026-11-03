/**
 * Human-readable file size: 512 B, 24 KB, 1.3 MB. Decimal units (1000), one fraction
 * digit from MB upward — the same convention as the web app's file tiles.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  const kb = bytes / 1000;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  const mb = kb / 1000;
  if (mb < 1000) return `${trimDecimal(mb)} MB`;
  return `${trimDecimal(mb / 1000)} GB`;
}

function trimDecimal(value: number): string {
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
}
