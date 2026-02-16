import React from 'react';
import { Badge } from './ui/badge';
import { getStatusConfig, Status } from './utils/maintenanceUtils';

interface StatusBadgeProps {
  status: Status;
  showLiveIndicator?: boolean;
  className?: string;
}

export default function StatusBadge({ status, showLiveIndicator = true, className = '' }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge className={`${config.badgeClass} ${className}`}>
      {showLiveIndicator && config.liveIndicator && (
        <span className="mr-1.5 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {config.label}
    </Badge>
  );
}
