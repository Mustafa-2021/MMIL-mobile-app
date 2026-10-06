export function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
