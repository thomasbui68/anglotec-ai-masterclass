/**
 * Anglotec AI Master Class - Service Worker
 * Caches app shell for offline use across all platforms
 */

const CACHE_NAME = "anglotec-v1";

// Assets to cache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/app-icon.png",
  "/app-icon-192.png",
  "/app-icon-64.png",
];

// Install: pre-cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API calls (let them go to network)
  if (url.pathname.startsWith("/api/")) return;

  // Skip ElevenLabs API calls
  if (url.hostname.includes("elevenlabs.io")) return;

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Don't cache opaque responses or errors
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          // Clone and cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline: return index.html for SPA routes
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
