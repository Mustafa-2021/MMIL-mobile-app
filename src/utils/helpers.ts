export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return `${formatDate(timestamp)} ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function isOverdue(dueDate: number, status: string): boolean {
  if (status === 'Done') return false;
  return dueDate < Date.now();
}

export function nextExtensionRound(history: { round: string }[]): string {
  const n = (history?.length ?? 0) + 1;
  return `R${n}`;
}

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Normalises Indian input to E.164: "7032778652", "07032778652", "917032778652",
// "+91 70327 78652" all become "+917032778652". Other "+"-prefixed numbers pass through.
export function toE164(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+91${digits}`;
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/\s/g, ''));
}

/** Builds YYYY-MM-DD if the parts form a real calendar date, else null. */
export function toIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  if (year < 1900 || d.getTime() > Date.now()) return null;
  return d.toISOString().slice(0, 10);
}

/** Formats typed digits as DD/MM/YYYY while the user types a date of birth. */
export function maskDobInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "15/08/1990" → "1990-08-15"; null if incomplete or not a real date. */
export function dobInputToIso(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  return m ? toIsoDate(Number(m[3]), Number(m[2]), Number(m[1])) : null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Reads a date of birth typed into a spreadsheet as text. Day comes first (Indian format):
 * 15/08/1990, 15-08-1990, 15.08.1990, 15-Aug-1990, 15 August 1990, or ISO 1990-08-15.
 */
export function parseDobText(text: string): string | null {
  const s = text.trim().toLowerCase();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/.exec(s);
  if (m) return toIsoDate(fullYear(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})[-/. ]+([a-z]{3,9})[-/., ]+(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3)) + 1;
    return month ? toIsoDate(fullYear(m[3]), month, Number(m[1])) : null;
  }
  return null;
}

// Two-digit years are birth years, so anything after this year belongs to the 1900s.
function fullYear(y: string): number {
  if (y.length === 4) return Number(y);
  const n = Number(y);
  return n > new Date().getFullYear() % 100 ? 1900 + n : 2000 + n;
}

/** "1990-08-15" → "15 Aug 1990". */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return formatDate(new Date(y, m - 1, d).getTime());
}
