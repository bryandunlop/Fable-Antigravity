export type GfoStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const GFO_STATUS_CLASS: Record<GfoStatus, string> = {
  success: 'status-success',
  warning: 'status-warning',
  error: 'status-error',
  info: 'status-info',
  neutral: 'bg-muted text-muted-foreground border-border',
};
