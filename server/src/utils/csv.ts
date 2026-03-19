import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import { extractPhone } from './phone.js';

// Parse uploaded file (CSV or TXT) and extract phone numbers
export function parsePhoneFile(filePath: string): string[] {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM
  content = content.replace(/^\ufeff/, '');

  const phones: string[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const phone = extractPhone(line);
    if (phone) {
      phones.push(phone);
    }
  }

  return phones;
}

// Parse screening file (phone + activity_days)
export function parseScreeningFile(filePath: string): Array<{ phone: string; activityDays: number }> {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/^\ufeff/, '');

  const results: Array<{ phone: string; activityDays: number }> = [];

  // Try CSV parse first
  try {
    const records = parse(content, { skip_empty_lines: true, relax_column_count: true });
    for (const record of records) {
      const phone = extractPhone(String(record[0] || ''));
      const days = parseFloat(String(record[1] || record[0] || ''));
      if (phone && !isNaN(days)) {
        results.push({ phone, activityDays: days });
      } else if (phone && record.length >= 2) {
        const days2 = parseFloat(String(record[1]));
        if (!isNaN(days2)) {
          results.push({ phone, activityDays: days2 });
        }
      }
    }
  } catch {
    // Fallback: line-by-line parse
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/[,\t\s]+/);
      let phone: string | null = null;
      let days: number = NaN;
      for (const part of parts) {
        const p = extractPhone(part);
        if (p) phone = p;
        const d = parseFloat(part);
        if (!isNaN(d) && d >= 0 && d < 100000) days = d;
      }
      if (phone && !isNaN(days)) {
        results.push({ phone, activityDays: days });
      }
    }
  }

  return results;
}

// Generate CSV content with BOM for Excel compatibility
export function generateCsv(phones: string[]): string {
  const BOM = '\ufeff';
  const rows = phones.map(p => [`"${p}"`]);
  return BOM + stringify(rows, { header: true, columns: ['手机号'] });
}
