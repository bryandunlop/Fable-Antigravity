import React from 'react';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Zap, 
  Pause,
  Play,
  Radio,
  Wifi,
  WifiOff
} from 'lucide-react';

interface StatusIndicatorProps {
  status: string;
  type?: 'aircraft' | 'flight' | 'crew' | 'maintenance' | 'passenger' | 'system';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLiveIndicator?: boolean;
  timeInStatus?: string; // e.g., "2h 15m"
}

export default function StatusIndicator({ 
  status, 
  type = 'system', 
  size = 'md', 
  showIcon = true,
  showLiveIndicator = true,
  timeInStatus
}: StatusIndicatorProps) {
  
  const getStatusConfig = () => {
    const normalizedStatus = status.toLowerCase();
    
    // Aircraft Status
    if (type === 'aircraft') {
      switch (normalizedStatus) {
        case 'available':
        case 'ready':
        case 'online':
          return { 
            color: 'bg-green-100 text-green-800 border-green-200', 
            icon: CheckCircle, 
            pulse: false 
          };
        case 'in flight':
        case 'active':
        case 'flying':
          return { 
            color: 'bg-blue-100 text-blue-800 border-blue-200', 
            icon: Radio, 
            pulse: true 
          };
        case 'maintenance':
        case 'scheduled mx':
          return { 
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
            icon: AlertTriangle, 
            pulse: false 
          };
        case 'aog':
        case 'aircraft on ground':
        case 'critical':
          return { 
            color: 'bg-red-100 text-red-800 border-red-200', 
            icon: XCircle, 
            pulse: true 
          };
        case 'offline':
        case 'disconnected':
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: WifiOff, 
            pulse: false 
          };
        default:
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: Clock, 
            pulse: false 
          };
      }
    }
    
    // Flight Status
    if (type === 'flight') {
      switch (normalizedStatus) {
        case 'on time':
        case 'departed':
        case 'arrived':
          return { 
            color: 'bg-green-100 text-green-800 border-green-200', 
            icon: CheckCircle, 
            pulse: false 
          };
        case 'boarding':
        case 'gate':
          return { 
            color: 'bg-blue-100 text-blue-800 border-blue-200', 
            icon: Play, 
            pulse: false 
          };
        case 'delayed':
        case 'weather hold':
          return { 
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
            icon: Clock, 
            pulse: false 
          };
        case 'cancelled':
        case 'diverted':
          return { 
            color: 'bg-red-100 text-red-800 border-red-200', 
            icon: XCircle, 
            pulse: false 
          };
        default:
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: Clock, 
            pulse: false 
          };
      }
    }
    
    // Crew Status
    if (type === 'crew') {
      switch (normalizedStatus) {
        case 'active':
        case 'on duty':
        case 'available':
          return { 
            color: 'bg-green-100 text-green-800 border-green-200', 
            icon: CheckCircle, 
            pulse: false 
          };
        case 'rest':
        case 'off duty':
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: Pause, 
            pulse: false 
          };
        case 'flight duty':
        case 'flying':
          return { 
            color: 'bg-blue-100 text-blue-800 border-blue-200', 
            icon: Radio, 
            pulse: true 
          };
        case 'training':
        case 'recurrent':
          return { 
            color: 'bg-purple-100 text-purple-800 border-purple-200', 
            icon: Play, 
            pulse: false 
          };
        default:
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: Clock, 
            pulse: false 
          };
      }
    }
    
    // Maintenance Status
    if (type === 'maintenance') {
      switch (normalizedStatus) {
        case 'completed':
        case 'signed off':
        case 'released':
          return { 
            color: 'bg-green-100 text-green-800 border-green-200', 
            icon: CheckCircle, 
            pulse: false 
          };
        case 'in progress':
        case 'working':
          return { 
            color: 'bg-blue-100 text-blue-800 border-blue-200', 
            icon: Zap, 
            pulse: true 
          };
        case 'scheduled':
        case 'pending':
          return { 
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
            icon: Clock, 
            pulse: false 
          };
        case 'overdue':
        case 'critical':
          return { 
            color: 'bg-red-100 text-red-800 border-red-200', 
            icon: AlertTriangle, 
            pulse: true 
          };
        default:
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: Clock, 
            pulse: false 
          };
      }
    }
    
    // Passenger Status
    if (type === 'passenger') {
      switch (normalizedStatus) {
        case 'confirmed':
        case 'checked in':
          return { 
            color: 'bg-green-100 text-green-800 border-green-200', 
            icon: CheckCircle, 
            pulse: false 
          };
        case 'vip':
        case 'priority':
          return { 
            color: 'bg-purple-100 text-purple-800 border-purple-200', 
            icon: Zap, 
            pulse: false 
          };
        case 'allergies':
        case 'medical':
          return { 
            color: 'bg-red-100 text-red-800 border-red-200', 
            icon: AlertTriangle, 
            pulse: false 
          };
        case 'pending':
        case 'waitlist':
          return { 
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
            icon: Clock, 
            pulse: false 
          };
        default:
          return { 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: Clock, 
            pulse: false 
          };
      }
    }
    
    // Default system status
    switch (normalizedStatus) {
      case 'online':
      case 'active':
      case 'healthy':
      case 'operational':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle, 
          pulse: false 
        };
      case 'warning':
      case 'degraded':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: AlertTriangle, 
          pulse: false 
        };
      case 'error':
      case 'critical':
      case 'offline':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: XCircle, 
          pulse: true 
        };
      case 'connecting':
      case 'loading':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: Wifi, 
          pulse: true 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: Clock, 
          pulse: false 
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const isLiveStatus = config.pulse && showLiveIndicator;

  return (
    <Badge 
      className={`
        ${config.color} 
        ${sizeClasses[size]} 
        border
        flex items-center gap-1.5
        relative
      `}
    >
      {/* Live indicator dot for active statuses */}
      {isLiveStatus && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {showIcon && <Icon className={`${iconSizes[size]} ${config.pulse && !showLiveIndicator ? 'animate-pulse' : ''}`} />}
      <span>{status}</span>
      {timeInStatus && (
        <span className="text-[10px] opacity-70 ml-1">({timeInStatus})</span>
      )}
    </Badge>
  );
}