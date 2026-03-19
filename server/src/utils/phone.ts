// Validate Chinese mobile phone number
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone.trim());
}

// Extract phone number from a line (handles multi-column CSV)
export function extractPhone(line: string): string | null {
  const cleaned = line.replace(/[\ufeff\r\n"']/g, '').trim();
  // Try to find an 11-digit phone number starting with 1
  const match = cleaned.match(/\b(1[3-9]\d{9})\b/);
  return match ? match[1] : null;
}

// Get activity level label from days
export function getActivityLevel(days: number | null): string {
  if (days === null || days === undefined) return '未筛选';
  if (days <= 1) return '极高活跃';
  if (days <= 3) return '高活跃';
  if (days <= 7) return '中活跃';
  if (days <= 14) return '低活跃';
  if (days <= 30) return '即将沉睡';
  return '沉睡';
}

// Activity level ranges for filtering
export const ACTIVITY_LEVELS = [
  { label: '极高活跃', key: 'very_high', min: 0, max: 1 },
  { label: '高活跃', key: 'high', min: 1, max: 3 },
  { label: '中活跃', key: 'medium', min: 3, max: 7 },
  { label: '低活跃', key: 'low', min: 7, max: 14 },
  { label: '即将沉睡', key: 'nearly_dormant', min: 14, max: 30 },
  { label: '沉睡', key: 'dormant', min: 30, max: 999999 },
] as const;
