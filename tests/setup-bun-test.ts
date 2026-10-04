// Configuración del entorno de pruebas para POLIS Frontend (AUD-07)
// Asegura que process.env.NEXT_PUBLIC_API_URL esté siempre configurado en entornos Node/Bun
// para erradicar fallos ERR_INVALID_URL en pruebas unitarias y de integración,
// y filtra advertencias controladas de fallbacks para mantener reportes limpios.

if (typeof process !== "undefined") {
  process.env.NEXT_PUBLIC_API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  process.env.POLIS_API_BASE_URL =
    process.env.POLIS_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
}

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("utilizando catálogo") ||
    msg.includes("no disponible") ||
    msg.includes("Fallo al conectar") ||
    msg.includes("Fallo al consultar") ||
    msg.includes("ejecutando motor") ||
    msg.includes("reportando estado sin conexión") ||
    msg.includes("No fue posible guardar en backend")
  ) {
    return;
  }
  originalWarn(...args);
};
