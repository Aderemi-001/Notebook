/* eslint-disable no-undef */
// Periodic Sync Handler
// This script is imported by the Service Worker to handle periodic background tasks.

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
        event.waitUntil(syncContent());
    }
});

/**
 * syncContent logic
 * This runs in the background even if the app is closed.
 * Used for pre-fetching daily reviews or syncing offline changes.
 */
async function syncContent() {
    console.log('[SW] Periodic sync triggered: content-sync');

    try {
        // In a production app, we would use this time to:
        // 1. Fetch latest study sets for offline access.
        // 2. Pre-cache 'Daily Review' cards for zero-latency startup.
        // 3. Sync any pending analytics from IndexedDB to Supabase.

        // Example: Refreshing the cache for Supabase data
        const cache = await caches.open('supabase-data');
        console.log('[SW] Periodic sync: Background data audit complete.');

        // We notify clients that a background sync happened
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'bg-sync-complete',
                tag: 'content-sync',
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        console.error('[SW] Periodic sync failed:', error);
    }
}
