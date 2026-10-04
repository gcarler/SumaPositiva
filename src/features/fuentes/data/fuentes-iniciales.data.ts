import type { FuenteInformacion } from "../models/fuente";

/**
 * Catálogo inicial de fuentes de información oficial.
 * Conforme a la auditoría EDIT-03b / Ley 1712 de 2014 y política de cero datos inventados:
 * - El estado inicial en producción inicia limpio (vacío) y se sincroniza reactivamente con el backend
 *   mediante GET /api/v1/fuentes.
 * - Para pruebas o demostración en desarrollo, se utiliza scripts/sembrar_fuentes_demo.py
 *   con la guarda de BD destino (polis_demo*). Fixtures para tests en __fixtures__/.
 */
export const FUENTES_INICIALES: FuenteInformacion[] = [];
