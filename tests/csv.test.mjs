import test from 'node:test';
import assert from 'node:assert/strict';

// Test CSV sanitization logic
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function generateCsv(columns, data) {
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

test('CSV Sanitization - protects against spreadsheet formula injection', async (t) => {
  await t.test('escapes malicious formulas starting with =, +, -, @, \\t, \\r', () => {
    assert.strictEqual(sanitizeCsvCell('=cmd|/C calc!A0'), `"'=cmd|/C calc!A0"`);
    assert.strictEqual(sanitizeCsvCell('+12345'), ` "'+12345"`.trim());
    assert.strictEqual(sanitizeCsvCell('-5+2'), ` "'-5+2"`.trim());
    assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), `"'@SUM(A1:A10)"`);
    assert.strictEqual(sanitizeCsvCell('\t=1+1'), `"'\t=1+1"`);
  });

  await t.test('properly escapes quotes inside cells', () => {
    assert.strictEqual(sanitizeCsvCell('Standard "Quoted" Text'), `"Standard ""Quoted"" Text"`);
  });

  await t.test('handles null and undefined values safely', () => {
    assert.strictEqual(sanitizeCsvCell(null), '""');
    assert.strictEqual(sanitizeCsvCell(undefined), '""');
  });

  await t.test('generates valid multi-column CSV with sanitized values', () => {
    const columns = [
      { header: 'Employee', key: 'name' },
      { header: 'Formula Payload', key: 'payload' },
    ];
    const data = [
      { name: 'Alice Smith', payload: '=cmd|/c calc' },
      { name: 'Bob Jones', payload: 'Safe text' },
    ];
    const output = generateCsv(columns, data);
    assert.ok(output.includes(`"'=cmd|/c calc"`));
    assert.ok(output.includes(`"Alice Smith"`));
    assert.ok(output.includes(`"Bob Jones"`));
  });
});
