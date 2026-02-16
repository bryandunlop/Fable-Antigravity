import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'task' | 'audit' | 'fuel' | 'maintenance' | 'safety' | 'passenger' | 'schedule' | 'document' | 'system' | 'nas_impact' | 'trip';
    priority: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    isRead: boolean;
    actionUrl?: string;
    actionText?: string;
    module: string;
    relatedId?: string;
    daysUntilDue?: number;
    assignedBy?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    loading: boolean;
    error: string | null;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
    markAsRead: (id: string) => void;
    markAsUnread: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
    clearAll: () => void;
    refetch: () => void;
    counts: {
        total: number;
        unread: number;
        highPriority: number;
        critical: number;
    };
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
};

// Initial seed data to populate if empty
const SEED_NOTIFICATIONS: Notification[] = [
    {
        id: 'NAS001',
        title: 'Ground Stop at LGA - Flight FO004 Affected',
        message: 'Flight FO004 (ORD→LGA) impacted by thunderstorm ground stop at LGA',
        type: 'nas_impact',
        priority: 'critical',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/',
        actionText: 'View Impact Details',
        module: 'NAS Status',
        relatedId: 'FO004'
    },
    {
        id: 'TRIP001',
        title: 'Trip Checklist Item Due Today',
        message: 'TRP-2025-001: File international flight plans due today',
        type: 'trip',
        priority: 'critical',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/trip-coordination',
        actionText: 'View Trip',
        module: 'Trip Coordination',
        relatedId: 'TRP-2025-001',
        daysUntilDue: 0,
        assignedBy: 'Sarah Chen'
    },
    {
        id: 'NOTIF001',
        title: 'Task Due Tomorrow',
        message: 'Complete 100-hour inspection on N123AB is due tomorrow',
        type: 'task',
        priority: 'high',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/assigned-tasks',
        actionText: 'View Task',
        module: 'Maintenance',
        relatedId: 'TASK001',
        daysUntilDue: 1,
        assignedBy: 'Chief Maintenance Officer'
    }
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ams_notifications');
            if (saved) {
                setNotifications(JSON.parse(saved));
            } else {
                // Seed initial data if empty
                setNotifications(SEED_NOTIFICATIONS);
                localStorage.setItem('ams_notifications', JSON.stringify(SEED_NOTIFICATIONS));
            }
        } catch (err) {
            console.error('Failed to load notifications', err);
            setError('Failed to load notifications');
            // Fallback to seed data
            setNotifications(SEED_NOTIFICATIONS);
        } finally {
            setLoading(false);
        }
    }, []);

    // Save to local storage whenever notifications change
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('ams_notifications', JSON.stringify(notifications));
        }
    }, [notifications, loading]);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
        const newNotification: Notification = {
            ...notification,
            id: `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            isRead: false
        };
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const markAsUnread = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const deleteNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const refetch = useCallback(() => {
        setLoading(true);
        try {
            const saved = localStorage.getItem('ams_notifications');
            if (saved) {
                setNotifications(JSON.parse(saved));
            }
        } catch (err) {
            console.error('Failed to reload notifications', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const getCounts = useCallback(() => {
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

    return (
        <NotificationContext.Provider value={{
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
            counts: getCounts()
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
