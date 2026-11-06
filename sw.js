/* SkinCare Mum PWA — service worker v1
   App shell: cache-first. products.json: network-first (live prices/stock).
   No push notifications (iOS Safari does not support web push for PWAs
   in the same way as Android; see README limitations). */
const CACHE = "skincare-mum-v2";
const SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./logo.png", "./icon-192.png", "./icon-512.png", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Live product feed: network first, fall back to cache, then fail gracefully
  if (url.href.includes("products.json")) {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  // App shell + images: cache first, then network
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && url.origin === self.location.origin) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
    }
    return res;
  }).catch(() => {
    if (e.request.mode === "navigate") return caches.match("./index.html");
    return new Response("Offline — please reconnect to load this.", { status: 503, headers: { "Content-Type": "text/plain" } });
  })));
});
