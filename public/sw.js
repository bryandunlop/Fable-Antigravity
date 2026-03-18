// Service Worker for Aviation Management System
// Handles background push notifications and notification clicks

self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.message,
            icon: '/icons/icon-192x192.png', // Fallback icon
            badge: '/icons/badge-72x72.png',
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

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            // If a window is already open, focus it and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
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
