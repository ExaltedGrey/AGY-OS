export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatRelativeDue(iso: string | null | undefined): {
  label: string;
  tone: 'overdue' | 'today' | 'upcoming' | 'none';
} {
  if (!iso) return { label: '', tone: 'none' };
  const today = getTodayISO();
  const target = iso.slice(0, 10);

  if (target === today) return { label: 'Due today', tone: 'today' };

  const [ty, tm, td] = today.split('-').map(Number);
  const [y, m, d] = target.split('-').map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const targetMs = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: overdueDays === 1 ? '1d overdue' : `${overdueDays}d overdue`,
      tone: 'overdue',
    };
  }
  if (diffDays === 1) return { label: 'Tomorrow', tone: 'upcoming' };
  if (diffDays <= 7) return { label: `In ${diffDays}d`, tone: 'upcoming' };
  return { label: formatShortDate(target), tone: 'upcoming' };
}

export function formatRelativeTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
