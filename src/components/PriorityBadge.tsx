import React from 'react';
import { Badge } from './ui/badge';
import { getPriorityConfig, Priority } from './utils/maintenanceUtils';

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
  className?: string;
}

export default function PriorityBadge({ priority, showIcon = true, className = '' }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <Badge className={`${config.badgeClass} ${config.pulseClass} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
