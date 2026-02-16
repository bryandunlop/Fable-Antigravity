import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, X, ArrowRight } from 'lucide-react';
import { formatRelativeTime } from './utils/maintenanceUtils';
import { useMaintenanceContext, Notification } from './contexts/MaintenanceContext';

export default function NotificationDrawer() {
  const { squawks, workOrders } = useMaintenanceContext();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate notifications from maintenance context
  React.useEffect(() => {
    const generatedNotifications: Notification[] = [];

    // Critical squawks
    squawks.forEach(squawk => {
      if (squawk.priority === 'critical' && squawk.status !== 'closed') {
        generatedNotifications.push({
          id: `sq-${squawk.id}`,
          type: 'critical',
          recipient: 'Current User',
          recipientRole: 'Maintenance',
          message: `Critical squawk on ${squawk.aircraftTail}: ${squawk.description.substring(0, 100)}`,
          sentAt: squawk.reportedAt,
          read: false,
          actionRequired: 'Review and assign',
          relatedEntity: 'squawk',
          relatedEntityId: squawk.id,
        });
      }
    });

    // Expired deferrals
    squawks.forEach(squawk => {
      if (squawk.deferral && squawk.deferral.expiryDate < new Date()) {
        generatedNotifications.push({
          id: `def-${squawk.id}`,
          type: 'critical',
          recipient: 'Current User',
          recipientRole: 'Maintenance',
          message: `MEL/CDL deferral EXPIRED on ${squawk.aircraftTail}: ${squawk.deferral.melReference}`,
          sentAt: squawk.deferral.expiryDate,
          read: false,
          actionRequired: 'Extend or resolve',
          relatedEntity: 'squawk',
          relatedEntityId: squawk.id,
        });
      }
    });

    // Overdue work orders
    workOrders.forEach(wo => {
      if (wo.status !== 'completed' && wo.status !== 'cancelled' && new Date(wo.dueDate) < new Date()) {
        generatedNotifications.push({
          id: `wo-${wo.id}`,
          type: 'warning',
          recipient: 'Current User',
          recipientRole: 'Maintenance',
          message: `Work Order ${wo.id} is overdue: ${wo.title}`,
          sentAt: new Date(wo.dueDate),
          read: false,
          actionRequired: 'Update status',
          relatedEntity: 'workorder',
          relatedEntityId: wo.id,
        });
      }
    });

    // Pattern detections
    squawks.forEach(squawk => {
      if (squawk.patternDetected && squawk.patternInfo) {
        generatedNotifications.push({
          id: `pat-${squawk.id}`,
          type: 'warning',
          recipient: 'Current User',
          recipientRole: 'Maintenance',
          message: `Recurring pattern detected: ${squawk.patternInfo.frequency} similar issues on ATA ${squawk.patternInfo.ataChapter}`,
          sentAt: squawk.patternInfo.detectedAt,
          read: false,
          actionRequired: 'Investigate root cause',
          relatedEntity: 'pattern',
          relatedEntityId: squawk.id,
        });
      }
    });

    // Sort by most recent
    generatedNotifications.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
    
    setNotifications(generatedNotifications);
  }, [squawks, workOrders]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalNotifications = notifications.filter(n => n.type === 'critical');
  const warningNotifications = notifications.filter(n => n.type === 'warning');
  const infoNotifications = notifications.filter(n => n.type === 'info' || n.type === 'alert');

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'alert':
        return <Bell className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div
      className={`p-4 border-b hover:bg-muted/50 transition-colors ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
              {notification.message}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
            )}
          </div>
          {notification.actionRequired && (
            <p className="text-xs text-muted-foreground mt-1">
              Action: {notification.actionRequired}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.sentAt)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  markAsRead(notification.id);
                  // Navigate to related entity
                  if (notification.relatedEntity === 'squawk') {
                    window.location.href = '/tech-log';
                  } else if (notification.relatedEntity === 'workorder') {
                    window.location.href = '/work-orders';
                  }
                }}
              >
                View
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => markAsRead(notification.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </SheetHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b px-6">
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-xs" variant="secondary">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="critical" className="relative">
              Critical
              {criticalNotifications.length > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-xs bg-red-100 text-red-800">
                  {criticalNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="warnings" className="relative">
              Warnings
              {warningNotifications.length > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-xs bg-yellow-100 text-yellow-800">
                  {warningNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <TabsContent value="all" className="m-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No notifications at this time
                  </p>
                </div>
              ) : (
                notifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </TabsContent>

            <TabsContent value="critical" className="m-0">
              {criticalNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">No critical alerts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All critical items have been addressed
                  </p>
                </div>
              ) : (
                criticalNotifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </TabsContent>

            <TabsContent value="warnings" className="m-0">
              {warningNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">No warnings</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Everything looks good
                  </p>
                </div>
              ) : (
                warningNotifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </TabsContent>

            <TabsContent value="info" className="m-0">
              {infoNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Info className="w-12 h-12 text-blue-500 mb-4" />
                  <p className="text-lg font-medium">No info notifications</p>
                </div>
              ) : (
                infoNotifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
