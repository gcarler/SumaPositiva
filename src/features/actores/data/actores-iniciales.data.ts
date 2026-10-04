import type { ActorEstrategico } from "../models/actor";

/**
 * Catálogo canónico inicial de actores estratégicos.
 * Conforme al dictamen de auditoría AUD-14 y Ley 1581 de 2012 (Habeas Data):
 * - Queda terminantemente prohibido almacenar PII (nombres de personas, teléfonos,
 *   correos o direcciones físicas) en archivos de código fuente o catálogos estáticos.
 * - El estado inicial inicia limpio (vacío) y se sincroniza reactivamente con el backend
 *   mediante GET /api/v1/actores.
 * - Para pruebas o demostración en desarrollo, se utiliza scripts/sembrar_actores_demo.py
 *   con es_demostracion=true y nombres genéricos sin datos personales.
 */
export const ACTORES_INICIALES: ActorEstrategico[] = [];
