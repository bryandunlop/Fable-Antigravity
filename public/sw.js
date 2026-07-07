// Service Worker for Aviation Management System
// Handles background push notifications and notification clicks

self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.message,
            icon: '/favicon.png',
            badge: '/favicon.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.actionUrl || '/'
            },
            actions: data.actionText ? [
                {
                    action: 'view',
                    title: data.actionText
                }
            ] : []
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            // Focus an existing tab and route it to the target; otherwise open one.
            for (const client of windowClients) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(urlToOpen).catch(() => {});
                    }
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Self-destruct old service workers if necessary
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
