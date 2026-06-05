const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < MS_PER_MINUTE) return 'just now';
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateOnly(isoString: string): string {
  return new Date(isoString).toISOString().split('T')[0];
}

export function getBatchExpirationStatus(expirationDate: string | undefined): 'expired' | 'expiring-soon' | 'ok' | 'none' {
  if (!expirationDate) return 'none';
  const daysUntil = Math.floor((new Date(expirationDate).getTime() - Date.now()) / MS_PER_DAY);
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 14) return 'expiring-soon';
  return 'ok';
}

export function daysUntilExpiration(expirationDate: string): number {
  return Math.floor((new Date(expirationDate).getTime() - Date.now()) / MS_PER_DAY);
}
