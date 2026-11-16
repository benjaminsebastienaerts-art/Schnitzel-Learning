// Service worker: zorgt dat Schnitzel Learning ook zonder internet opent.
// Verhoog CACHE_VERSION bij elke wijziging aan de app, dan krijgt iedereen de nieuwe versie.
const CACHE_VERSION = "schnitzel-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

// De lettertypes komen van Google Fonts. Die bewaren we ook, zodat de app er offline hetzelfde uitziet.
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Eerst de cache (snel en offline), op de achtergrond verversen voor de volgende keer.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: sameOrigin }).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response && (response.ok || response.type === "opaque")) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      if (cached) return cached;
      return refresh.then((response) => response || (sameOrigin ? caches.match("./index.html") : Response.error()));
    })
  );
});
