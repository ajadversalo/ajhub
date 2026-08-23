const CACHE = "aj-hub-v7";
const CORE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

async function cacheAppShell(cache, response) {
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return;

  // Render can return its own temporary page while a free service wakes up.
  // Only our HTML carries this marker, so that page can never replace the shell.
  const html = await response.clone().text();
  if (/name=["']ajhub-app["'][^>]*content=["']1["']|content=["']1["'][^>]*name=["']ajhub-app["']/i.test(html)) {
    await cache.put("/", response.clone());
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await cache.addAll(CORE.slice(1));
    try {
      const response = await fetch("/");
      await cacheAppShell(cache, response);
    } catch {
      // A temporary Render wake-up failure should not prevent installation.
    }
  }));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // API data must always come from the server. Caching it makes Turso-backed
  // settings appear stale after a save or deploy.
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const forceRefresh = url.searchParams.has("signed_in");
        const cached = forceRefresh ? undefined : await cache.match("/");
        const network = fetch(event.request).then(async (response) => {
          await cacheAppShell(cache, response);
          return response;
        });

        // Returning visitors get the shell immediately while Render wakes and
        // refreshes it in the background. Auth transitions always use network.
        if (cached) {
          event.waitUntil(network.catch(() => undefined));
          return cached;
        }

        return network.catch(async () => (await cache.match("/")) || Response.error());
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }))
  );
});
