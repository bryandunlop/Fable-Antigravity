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
    permission: NotificationPermission;
    requestPermission: () => Promise<NotificationPermission>;
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
        priority: 'high',
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
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/assigned-tasks',
        actionText: 'View Task',
        module: 'Maintenance',
        relatedId: 'TASK001',
        daysUntilDue: 1,
        assignedBy: 'Chief Maintenance Officer'
    },
    {
        id: 'INV001',
        title: 'Critical Inventory Shortage',
        message: 'Diet Coke has fallen below acceptable thresholds on N500GA. Restock needed prior to next flight.',
        type: 'passenger',
        priority: 'high',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/inventory',
        actionText: 'View Inventory',
        module: 'Inventory Operations',
        relatedId: 'INV-DC'
    },
    {
        id: 'SQUAWK001',
        title: 'New AOG Squawk Reported',
        message: 'N650PR reported Right Engine Bleed Air fault resulting in AOG status.',
        type: 'maintenance',
        priority: 'critical',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/tech-log',
        actionText: 'View Tech Log',
        module: 'Maintenance',
        relatedId: 'SQ-9921'
    },
    {
        id: 'SAFE001',
        title: 'New ASAP Report Submitted',
        message: 'A new ASAP report requires initial review by the Safety Committee.',
        type: 'safety',
        priority: 'high',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/safety-dashboard',
        actionText: 'Review Report',
        module: 'Safety Systems',
        relatedId: 'ASAP-928'
    },
    {
        id: 'DOC001',
        title: 'Document Revision Released',
        message: 'GOM Revision 14.2 has been released. Please acknowledge receipt.',
        type: 'document',
        priority: 'medium',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/document-center',
        actionText: 'Acknowledge',
        module: 'Document Control',
        relatedId: 'DOC-GOM142'
    }
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [permission, setPermission] = useState<NotificationPermission>(
        typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
    );

    // Register service worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    }, []);

    // Load from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ams_notifications');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) {
                    setNotifications(parsed);
                } else {
                    setNotifications(SEED_NOTIFICATIONS);
                    localStorage.setItem('ams_notifications', JSON.stringify(SEED_NOTIFICATIONS));
                }
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

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications.');
            return 'default';
        }

        const res = await window.Notification.requestPermission();
        setPermission(res);
        return res;
    }, []);

    const showBrowserNotification = useCallback((title: string, message: string, actionUrl?: string) => {
        if (permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: message,
                    icon: '/vite.svg',
                    badge: '/vite.svg',
                    data: {
                        url: actionUrl || '/'
                    }
                });
            });
        } else if (permission === 'granted' && 'Notification' in window) {
            new window.Notification(title, {
                body: message,
                icon: '/vite.svg'
            });
        }
    }, [permission]);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
        const newNotification: Notification = {
            ...notification,
            id: `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            isRead: false
        };
        setNotifications(prev => [newNotification, ...prev]);

        // Trigger browser notification
        showBrowserNotification(newNotification.title, newNotification.message, newNotification.actionUrl);
    }, [showBrowserNotification]);

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
            counts: getCounts(),
            permission,
            requestPermission
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
