// Service Worker disabled - prevents caching issues
// This file intentionally does nothing
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
self.addEventListener("fetch", (event) => {
  // Pass-through - no caching
});
