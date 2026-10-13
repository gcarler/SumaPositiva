import { z } from "zod";

/**
 * Inicialización de Zod en Modo Jitless [CIERRE-05]
 *
 * En entornos con Content-Security-Policy estricta donde se prohíbe 'unsafe-eval'
 * en script-src, Zod v4 compila objetos usando JIT ('new Function(...)') por defecto.
 * La activación de 'jitless: true' desactiva la generación dinámica de código por cadenas
 * y utiliza análisis funcional directo, garantizando cero violaciones CSP y plena conformidad.
 */
if (typeof z?.config === "function") {
  z.config({ jitless: true });
}
