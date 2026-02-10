const CACHE_NAME = "expense-tracker-cache-v2";

const FILES_TO_CACHE = ["/icon192.png", "/icon512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
   event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
         return cache.addAll(FILES_TO_CACHE);
      })
   );
   self.skipWaiting();
});

self.addEventListener("activate", (event) => {
   event.waitUntil(
      caches.keys().then((cacheNames) => {
         return Promise.all(
            cacheNames.map((cache) => {
               if (cache !== CACHE_NAME) {
                  return caches.delete(cache);
               }
            })
         );
      })
   );
   self.clients.claim();
});

self.addEventListener("fetch", (event) => {
   // Network-First Strategy for Navigation Requests (HTML pages)
   if (event.request.mode === "navigate") {
      event.respondWith(
         fetch(event.request)
            .then((response) => {
               // Clone the response because it's a stream and can only be consumed once
               const responseClone = response.clone();
               caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
               });
               return response;
            })
            .catch(() => {
               // If network fails, try to serve from cache
               return caches.match(event.request);
            })
      );
   } else {
      // Stale-While-Revalidate Strategy for Static Assets (JS, CSS, Images, etc.)
      // or Cache-First depending on preference.
      // For Next.js chunks (hashed filenames), Cache-First is generally safe,
      // but since we had issues, let's stick to network-first for everything else too
      // OR just use a simple cache falling back to network for now to match previous behavior but properly initialized.

      // Actually, for static assets (/_next/static/...), they are hashed, so we can cache them aggressively.
      // BUT to avoid complexity and ensure freshness given the issues, let's use Stale-While-Revalidate or Network-First.
      // Let's stick to the previous simple logic but with correct versioning, OR a slightly better Stale-While-Revalidate.

      event.respondWith(
         caches.match(event.request).then((response) => {
            return (
               response ||
               fetch(event.request).then((networkResponse) => {
                  return caches.open(CACHE_NAME).then((cache) => {
                     // Only cache valid responses
                     if (event.request.url.startsWith("http") && event.request.method === "GET") {
                        cache.put(event.request, networkResponse.clone());
                     }
                     return networkResponse;
                  });
               })
            );
         })
      );
   }
});
