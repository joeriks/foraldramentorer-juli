const CACHE_NAME = "foraldramentorer-mentor-v126";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/calendar-domain.js",
  "/interaction-domain.js",
  "/communication-domain.js",
  "/guided-activity-domain.js",
  "/case-workspace-domain.js",
  "/support-area-domain.js",
  "/matching-profile-domain.js",
  "/matching-catalog-domain.js",
  "/mentor-application-domain.js",
  "/mentor-self-service-domain.js",
  "/learning-domain.js",
  "/support-domain.js",
  "/case-domain.js",
  "/feature-links.js",
  "/routine-illustrations.js",
  "/manifest.webmanifest",
  "/assets/foraldramentorer-logo.svg",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/apple-touch-icon.png",
  "/vendor/bootstrap/bootstrap.min.css",
  "/vendor/bootstrap/bootstrap.bundle.min.js",
  "/vendor/marked/marked.esm.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
