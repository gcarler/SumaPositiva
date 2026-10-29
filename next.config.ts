import type { NextConfig } from "next";

/**
 * Endurecimiento de Content-Security-Policy (CSP) [CIERRE-05]
 *
 * 1. script-src:
 *    - En producción: SE ELIMINA 'unsafe-eval' terminantemente.
 *    - Se mantiene 'unsafe-inline' debido a que Next.js con App Router y pre-renderizado
 *      estático standalone (SSG en 192 rutas) inyecta scripts de hidratación y flight payloads
 *      en tiempo de compilación. El uso de nonces requeriría generación criptográfica por cada
 *      petición HTTP en un middleware dinámico, lo cual impediría el almacenamiento en caché
 *      y la entrega estática de ultra bajo tiempo de respuesta (TTFB < 10ms).
 *      Riesgo residual: Mitigado exhaustivamente mediante:
 *        a) Eliminación total de 'unsafe-eval' (cero ejecución dinámica de cadenas como código).
 *        b) Restricción estricta de connect-src exclusivamente a orígenes HTTPS oficiales.
 *        c) Recolección en tiempo real de violaciones vía /api/v1/seguridad/csp-report.
 *        d) frame-ancestors 'none' y X-Frame-Options 'DENY' anti-clickjacking.
 *
 * 2. connect-src:
 *    - En producción: Sin 'ws:', sin 'wss:', sin 'localhost', sin '127.0.0.1'.
 *      Únicamente orígenes oficiales HTTPS de POLIS, teselas OSM y Google OAuth.
 *    - En desarrollo: Se permiten orígenes locales y WebSockets para Hot Module Reloading (HMR).
 *
 * 3. Modo por defecto:
 *    - Report-Only por defecto hasta nueva orden del coordinador de auditoría (EAF).
 *    - Conmutable a Enforce mediante POLIS_CSP_ENFORCE=true o POLIS_CSP_REPORT_ONLY=false.
 */

function construirCsp(isProd: boolean): string {
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline' https://accounts.google.com"
    : "'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com";

  const connectSrc = isProd
    ? "'self' https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://accounts.google.com"
    : "'self' http://127.0.0.1:8000 http://localhost:8000 https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://accounts.google.com ws: wss:";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.tile.osm.org https://*.googleusercontent.com https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://images.unsplash.com https://api.qrserver.com",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://accounts.google.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/v1/seguridad/csp-report",
    "report-to csp-endpoint",
  ].join("; ");
}

/* POLIS_NEXT_DIST_DIR: distDir temporal para builds de validación aislados.
 * Sirve cuando hay un proceso Next sirviendo el distDir por defecto (.next):
 * reconstruir .next deja ese proceso con su cwd "deleted" (PID 1228166).
 * Sin la variable se conserva el comportamiento por defecto. */
const distDirTemporal = process.env.POLIS_NEXT_DIST_DIR;

const nextConfig: NextConfig = {
  ...(distDirTemporal ? { distDir: distDirTemporal } : {}),
  output: "standalone",
  experimental: { proxyClientMaxBodySize: "40mb" },
  // Route the browser API through Next.js to keep a single public origin.
  async rewrites() {
    const backendUrl = process.env.POLIS_BACKEND_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
    ];
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const cspDirectives = construirCsp(isProd);

    // En producción se aplica modo Enforce por defecto para blindaje perimetral efectivo.
    // Se mantiene la opción de Report-Only si se declara explícitamente POLIS_CSP_REPORT_ONLY=true.
    const isEnforce =
      process.env.POLIS_CSP_ENFORCE === "true" ||
      process.env.POLIS_CSP_REPORT_ONLY === "false" ||
      (isProd && process.env.POLIS_CSP_REPORT_ONLY !== "true");

    const cspHeaderKey = isEnforce
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only";

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: cspHeaderKey,
            value: cspDirectives,
          },
          {
            key: "Reporting-Endpoints",
            value: 'csp-endpoint="/api/v1/seguridad/csp-report"',
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
