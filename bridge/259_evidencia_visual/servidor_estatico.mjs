/**
 * Servidor estático mínimo para storybook-static (revisión visual 259).
 * Puerto fijo 4181 — solo acceso local.
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const RAIZ = process.argv[2] ?? "storybook-static";
const PUERTO = 4181;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

const cachear = new Map();
async function buscar(ruta) {
  if (cachear.has(ruta)) return cachear.get(ruta);
  const abs = join(RAIZ, normalize(ruta).replace(/^([.][.][/\\])+/, ""));
  try {
    const data = await readFile(abs);
    cachear.set(ruta, data);
    return data;
  } catch {
    return null;
  }
}

Bun.serve({
  port: PUERTO,
  hostname: "127.0.0.1",
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);
    let ruta = decodeURIComponent(url.pathname);
    if (ruta === "/") ruta = "/index.html";
    let data = await buscar(ruta);
    if (data === null) {
      // Storybook assets a veces resuelven con índice de directorio
      try {
        const files = await readdir(join(RAIZ, ruta));
        return new Response(files.join("\n"), { status: 200 });
      } catch {
        return new Response("no encontrado", { status: 404 });
      }
    }
    return new Response(data, {
      headers: { "Content-Type": MIME[extname(ruta)] ?? "application/octet-stream" },
    });
  },
});
console.log(`[vis-259] estático en http://127.0.0.1:${PUERTO}`);
