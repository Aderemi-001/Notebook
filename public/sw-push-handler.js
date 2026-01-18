/* eslint-disable no-undef */
// Push Notification Handler
// This script is imported by the Service Worker to handle incoming push messages.

self.addEventListener('push', (event) => {
    console.log('[SW] Push Received:', event);

    let data = { title: 'Notebook', body: 'New update available!', icon: '/pwa-192.png' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/pwa-192.png',
        badge: '/pwa-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'View Details',
                icon: '/pwa-192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/pwa-192.png'
            },
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click Received.');

    event.notification.close();

    if (event.action === 'explore') {
        // Navigate to the app or a specific route
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
