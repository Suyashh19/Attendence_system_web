// Students need this share of classes to stay eligible
export const MIN_ATTENDANCE_PERCENT = 75;

export function initials(name?: string | null) {
  const parts = (name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Tailwind classes for an attendance or enrollment status. */
export function statusTone(status: string): { text: string; bg: string } {
  switch (status) {
    case 'PRESENT':
    case 'APPROVED':
      return { text: 'text-success', bg: 'bg-success-bg' };
    case 'ABSENT':
    case 'REJECTED':
      return { text: 'text-danger', bg: 'bg-danger-bg' };
    default:
      return { text: 'text-warning', bg: 'bg-warning-bg' };
  }
}
