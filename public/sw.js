/**
 * POLIS Cartagena — Service Worker PWA para Resiliencia Territorial y Modo Offline
 * Diseñado para facilitadores en zonas insulares y rurales sin cobertura celular.
 */

const CACHE_NAME = "polis-pwa-v2";
const STATIC_ASSETS = [
  "/",
  "/barrio",
  "/logo.svg",
  "/manifest.json",
  "/robots.txt",
];

// 1. Instalación y precache de recursos estáticos críticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 2. Activación y limpieza de caches obsoletas
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

// 3. Estrategia de Fetch resiliente
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar esquemas no HTTP/HTTPS (ej. chrome-extension://, data:, blob:) y orígenes externos
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Ignorar peticiones que no sean GET (POST/PUT/DELETE se gestionan con IndexedDB Outbox)
  if (request.method !== "GET") {
    return;
  }

  // Ignorar llamadas directas a la API transaccional (FastAPI) para no enmascarar errores de red
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Navegación (HTML): Network-First con fallback a cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone).catch(() => {});
              })
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          // Si falla una ruta específica offline, fallback a /barrio o /
          const fallback = (await caches.match("/barrio")) || (await caches.match("/"));
          if (fallback) return fallback;

          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
              <head><meta charset="utf-8"><title>POLIS — Modo Offline</title></head>
              <body style="font-family:sans-serif;padding:2rem;text-align:center;">
                <h2>Sin conexión a Internet</h2>
                <p>Estás en una zona sin cobertura celular. Tus datos se guardarán localmente en el dispositivo.</p>
                <a href="/barrio" style="color:#e11d48;font-weight:bold;">Ir a Modo Barrio</a>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // Recursos estáticos (_next, imágenes, fuentes, svg): Cache-First con actualización en fondo
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Revalidar en fondo
          fetch(request)
            .then((fresh) => {
              if (fresh.status === 200) {
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(request, fresh).catch(() => {}))
                  .catch(() => {});
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone).catch(() => {}))
              .catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
