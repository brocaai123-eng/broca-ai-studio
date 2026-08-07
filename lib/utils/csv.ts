/** Tiny CSV helpers for admin exports */

export function escapeCsvValue(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length && !columns?.length) return '';
  const cols = columns || Object.keys(rows[0] || {});
  const header = cols.map(escapeCsvValue).join(',');
  const lines = rows.map((row) => cols.map((c) => escapeCsvValue(row[c])).join(','));
  return [header, ...lines].join('\n');
}

export function downloadCsvClient(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
