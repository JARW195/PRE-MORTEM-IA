/**
 * PRE-MORTEM IA — Service Worker (vanilla)
 * ---------------------------------------------------
 * - Versioned app-shell cache `premortem-v2` (bumped from v1 to purge stale
 *   HTML that caused hydration mismatches).
 * - Network-first for navigations (always fresh HTML, fallback to cache only
 *   when the network fails). We do NOT pre-cache "/" on install — the HTML
 *   changes on every deploy, and a stale pre-cached copy caused hydration
 *   errors. Only static binary assets (icons, manifest) are pre-cached.
 * - Cache-first for static assets (`/_next/static/`, fonts, css, js, images).
 * - Does NOT cache `/api/` by default EXCEPT GET `/api/analyses`
 *   (history list) so past analyses stay readable offline.
 * - Cleans up stale `premortem-*` caches on activate.
 */

const VERSION = "v2";
const SHELL_CACHE = `premortem-${VERSION}`;
const RUNTIME_CACHE = `premortem-runtime-${VERSION}`;

// App shell: only static binary assets that never change content for a given
// filename. We intentionally do NOT pre-cache "/" because the HTML is
// server-rendered and changes on every deploy — a stale pre-cached copy would
// cause React hydration mismatches.
const APP_SHELL = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

// --- INSTALL: pre-cache only static binary assets ----------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res && res.ok) await cache.put(url, res);
          } catch {
            /* ignore — optional asset may not exist */
          }
        }),
      );
      // skipWaiting so a new SW takes over immediately instead of waiting for
      // all tabs to close — this is what triggers the v1 → v2 cache purge.
      await self.skipWaiting();
    })(),
  );
});

// --- ACTIVATE: purge ALL old premortem-* caches, take control ---------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("premortem-") && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// --- FETCH: route by request type -------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // only cache GETs

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // cross-origin: pass through

  const isNav = request.mode === "navigate";
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:woff2?|ttf|otf|css|js|png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
  const isHistory = url.pathname === "/api/analyses" && !url.search;

  // Never intercept other /api/ calls — they must be live.
  if (url.pathname.startsWith("/api/") && !isHistory) return;

  // (1) Navigation → network-first (always fresh HTML), fall back to cache
  // only when the network genuinely fails (offline).
  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/")) ||
            new Response("<h1>Sin conexión</h1><p>PRE-MORTEM IA no está disponible sin red.</p>", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // (2) GET /api/analyses → stale-while-revalidate (offline history).
  if (isHistory) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })(),
    );
    return;
  }

  // (3) Static assets → cache-first, fill from network on miss.
  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
          return res;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
});
