self.addEventListener('install', (event) => {
    // Skip waiting so the new service worker takes over immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients so the service worker controls the page immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple pass-through fetch handler required for PWA installation prompt
    event.respondWith(fetch(event.request));
});
