import { useMemo } from 'react';
import { useNotificationContext, Notification } from '../contexts/NotificationContext';

export type { Notification };

interface UseNotificationsOptions {
  userRole: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useNotifications = ({ userRole }: UseNotificationsOptions) => {
  const {
    notifications: allNotifications,
    loading,
    error,
    addNotification,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch = () => { } // Context doesn't really have refetch for local storage, but keeping interface API
  } = useNotificationContext();

  // Filter notifications based on user role
  const notifications = useMemo(() => {
    const roleNotifications = {
      'pilot': ['task', 'fuel', 'schedule', 'document', 'system', 'safety', 'nas_impact'],
      'maintenance': ['task', 'maintenance', 'audit', 'document', 'system', 'nas_impact'],
      'inflight': ['task', 'passenger', 'schedule', 'document', 'system', 'nas_impact'],
      'safety': ['task', 'audit', 'safety', 'document', 'system', 'nas_impact'],
      'scheduling': ['task', 'schedule', 'trip', 'document', 'system', 'nas_impact'],
      'admin': ['task', 'audit', 'fuel', 'maintenance', 'safety', 'passenger', 'schedule', 'trip', 'document', 'system', 'nas_impact'],
      'lead': ['task', 'audit', 'fuel', 'maintenance', 'safety', 'passenger', 'schedule', 'trip', 'document', 'system', 'nas_impact'],
      'admin-assistant': ['task', 'passenger', 'schedule', 'trip', 'document', 'system'],
      'document-manager': ['task', 'document', 'system']
    };

    const allowedTypes = roleNotifications[userRole as keyof typeof roleNotifications] || [];
    return allNotifications.filter(notif => allowedTypes.includes(notif.type));
  }, [allNotifications, userRole]);

  // Calculate counts based on filtered notifications
  const counts = useMemo(() => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const highPriorityCount = notifications.filter(n =>
      (n.priority === 'high' || n.priority === 'critical') && !n.isRead
    ).length;
    const criticalCount = notifications.filter(n =>
      n.priority === 'critical' && !n.isRead
    ).length;

    return {
      total: notifications.length,
      unread: unreadCount,
      highPriority: highPriorityCount,
      critical: criticalCount
    };
  }, [notifications]);

  return {
    notifications,
    loading,
    error,
    addNotification,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch,
    counts
  };
};