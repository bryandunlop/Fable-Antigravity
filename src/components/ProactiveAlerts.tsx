import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Info,
  ArrowRight,
  AlertCircle,
  Target,
  CheckCircle
} from 'lucide-react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { formatRelativeTime } from './utils/maintenanceUtils';

interface ProactiveAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  icon: React.ReactNode;
  count?: number;
}

export default function ProactiveAlerts() {
  const { squawks, workOrders, mttrData } = useMaintenanceContext();
  const [alerts, setAlerts] = React.useState<ProactiveAlert[]>([]);

  React.useEffect(() => {
    const generatedAlerts: ProactiveAlert[] = [];

    // Check for expiring deferrals
    const expiringDeferrals = squawks.filter(s => {
      if (!s.deferral || s.status !== 'deferred') return false;
      const daysRemaining = Math.ceil(
        (new Date(s.deferral.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysRemaining > 0 && daysRemaining <= 2;
    });

    const expiredDeferrals = squawks.filter(s => {
      if (!s.deferral || s.status !== 'deferred') return false;
      return new Date(s.deferral.expiryDate) < new Date();
    });

    if (expiredDeferrals.length > 0) {
      generatedAlerts.push({
        id: 'expired-deferrals',
        type: 'critical',
        title: 'Deferrals Expired',
        message: `${expiredDeferrals.length} MEL/CDL deferral${expiredDeferrals.length > 1 ? 's have' : ' has'} expired and require immediate action`,
        action: {
          label: 'Review Deferrals',
          href: '/mel-cdl',
        },
        icon: <AlertTriangle className="w-5 h-5" />,
        count: expiredDeferrals.length,
      });
    } else if (expiringDeferrals.length > 0) {
      generatedAlerts.push({
        id: 'expiring-deferrals',
        type: 'warning',
        title: 'Deferrals Expiring Soon',
        message: `${expiringDeferrals.length} deferral${expiringDeferrals.length > 1 ? 's expire' : ' expires'} in the next 48 hours`,
        action: {
          label: 'View MEL/CDL',
          href: '/mel-cdl',
        },
        icon: <Clock className="w-5 h-5" />,
        count: expiringDeferrals.length,
      });
    }

    // Check for pattern detections
    const patternsDetected = squawks.filter(s => s.patternDetected);
    if (patternsDetected.length > 0) {
      generatedAlerts.push({
        id: 'patterns-detected',
        type: 'warning',
        title: 'Recurring Patterns Detected',
        message: `${patternsDetected.length} recurring maintenance pattern${patternsDetected.length > 1 ? 's have' : ' has'} been identified for investigation`,
        action: {
          label: 'View Patterns',
          href: '/tech-log',
        },
        icon: <Target className="w-5 h-5" />,
        count: patternsDetected.length,
      });
    }

    // Check for overdue work orders
    const overdueWorkOrders = workOrders.filter(wo => {
      if (wo.status === 'completed' || wo.status === 'cancelled') return false;
      return new Date(wo.dueDate) < new Date();
    });

    if (overdueWorkOrders.length > 0) {
      const mostOverdue = overdueWorkOrders.reduce((prev, current) => {
        return new Date(prev.dueDate) < new Date(current.dueDate) ? prev : current;
      });
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(mostOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      generatedAlerts.push({
        id: 'overdue-work-orders',
        type: 'critical',
        title: 'Overdue Work Orders',
        message: `${overdueWorkOrders.length} work order${overdueWorkOrders.length > 1 ? 's are' : ' is'} overdue (longest: ${daysOverdue}d)`,
        action: {
          label: 'View Work Orders',
          href: '/work-orders',
        },
        icon: <AlertCircle className="w-5 h-5" />,
        count: overdueWorkOrders.length,
      });
    }

    // Check for MTTR improvements
    if (mttrData.overall && mttrData.overall < 24) {
      const improvement = ((24 - mttrData.overall) / 24 * 100).toFixed(0);
      generatedAlerts.push({
        id: 'mttr-improvement',
        type: 'success',
        title: 'MTTR Performance Improved',
        message: `Average MTTR is ${improvement}% better than target (${mttrData.overall.toFixed(1)}h vs 24h target)`,
        action: {
          label: 'View Analytics',
          href: '/mttr-dashboard',
        },
        icon: <TrendingUp className="w-5 h-5" />,
      });
    }

    // Check for long-running work
    const longRunningWork = workOrders.filter(wo => {
      if (wo.status !== 'in-progress') return false;
      const startedAt = wo.lifecycleStage.history.find(h => h.stage === 'in-progress');
      if (!startedAt) return false;
      const hoursInProgress = (new Date().getTime() - startedAt.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursInProgress > 48;
    });

    if (longRunningWork.length > 0) {
      generatedAlerts.push({
        id: 'long-running-work',
        type: 'info',
        title: 'Long-Running Work Orders',
        message: `${longRunningWork.length} work order${longRunningWork.length > 1 ? 's have' : ' has'} been in progress for over 48 hours`,
        action: {
          label: 'Check Status',
          href: '/work-orders',
        },
        icon: <Info className="w-5 h-5" />,
        count: longRunningWork.length,
      });
    }

    setAlerts(generatedAlerts);
  }, [squawks, workOrders, mttrData]);

  if (alerts.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-900">All Systems Operational</h4>
              <p className="text-sm text-green-700">No critical alerts at this time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertStyles = (type: ProactiveAlert['type']) => {
    switch (type) {
      case 'critical':
        return {
          cardClass: 'border-red-500 bg-red-50 hover:bg-red-100',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'warning':
        return {
          cardClass: 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'info':
        return {
          cardClass: 'border-blue-500 bg-blue-50 hover:bg-blue-100',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'success':
        return {
          cardClass: 'border-green-500 bg-green-50 hover:bg-green-100',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          badgeClass: 'bg-green-100 text-green-800 border-green-200',
        };
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const styles = getAlertStyles(alert.type);
        return (
          <Card key={alert.id} className={`${styles.cardClass} transition-all duration-200`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`${styles.iconBg} p-2 rounded-lg flex-shrink-0`}>
                  <div className={styles.iconColor}>{alert.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    {alert.count && (
                      <Badge className={styles.badgeClass}>
                        {alert.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
                  {alert.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 text-xs"
                    >
                      <Link to={alert.action.href}>
                        {alert.action.label}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
