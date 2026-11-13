export function safeParseDate(val?: string | number | Date | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSafeDate(val?: string | number | Date | null, fallback = '—'): string {
  const d = safeParseDate(val);
  if (!d) return typeof val === 'string' && val.trim() ? val : fallback;
  return d.toLocaleDateString();
}

export function formatSafeDateTime(val?: string | number | Date | null, fallback = '—'): string {
  const d = safeParseDate(val);
  if (!d) return typeof val === 'string' && val.trim() ? val : fallback;
  return d.toLocaleString();
}

export function getSafeTimestamp(val?: string | number | Date | null): number {
  const d = safeParseDate(val);
  return d ? d.getTime() : 0;
}
