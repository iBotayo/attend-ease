/**
 * Sanitizes a cell value to prevent CSV / Spreadsheet formula injection vulnerabilities.
 * Prefixes cells beginning with =, +, -, @, \t, \r with a single quote '.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // If value begins with dangerous characters that could execute formulas in Excel/Sheets, prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateCsv<T extends object>(
  columns: { header: string; key: keyof T | ((row: T) => unknown) }[],
  data: T[]
): string {
  const headerRow = columns.map((col) => sanitizeCsvCell(col.header)).join(',');

  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const val = typeof col.key === 'function' ? col.key(row) : row[col.key];
        return sanitizeCsvCell(val);
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

export function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
