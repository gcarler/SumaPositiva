/**
 * POLIS — Pruebas Unitarias de Gating de Fases DNP (AUD-05)
 * Criterio verificable por EAF:
 * Con Fase 2 en 'preparatoria' Alternativas muestra aviso y bloquea escritura a no-admins;
 * Con Fase 3 en 'preparatoria' Seguimiento bloquea escritura a no-admins.
 */

import { describe, expect, test } from "vitest";
import type { Sesion } from "@/features/sesion/models/sesion";
import { puedeEditar } from "@/features/plataforma/models/acceso";

function evaluarGatingFase({
  faseEstado,
  sesion,
  modulo,
}: {
  faseEstado: "preparatoria" | "activa" | "en_revision" | "cerrada" | "archivada";
  sesion: Sesion | null;
  modulo: "alternativas" | "seguimiento";
}) {
  const puedeEditarUsuario = puedeEditar(sesion, modulo);
  const esAdmin =
    sesion?.rol === "autoridad_distrital" ||
    sesion?.rol === "administrador_identidades";
  const faseActiva = faseEstado === "activa";
  const puedeEditarEfectivo = faseActiva
    ? puedeEditarUsuario
    : esAdmin && puedeEditarUsuario;
  const esPreparatoria = faseEstado === "preparatoria";

  return {
    puedeEditarEfectivo,
    esPreparatoria,
    esAdmin,
    mostrarAvisoPreparatoria: esPreparatoria,
  };
}

describe("Gating de Fases DNP en Alternativas y Seguimiento (AUD-05)", () => {
  const ahora = new Date().toISOString();

  const sesionAdmin: Sesion = {
    usuarioId: "usr-admin-01",
    token: "jwt-token-admin",
    modo: "institucional",
    desde: ahora,
    expiraEn: new Date(Date.now() + 3600000).toISOString(),
    rol: "autoridad_distrital",
    permisos: ["alternativas:gestionar", "seguimiento:gestionar"],
  };

  const sesionFacilitador: Sesion = {
    usuarioId: "usr-fac-01",
    token: "jwt-token-fac",
    modo: "institucional",
    desde: ahora,
    expiraEn: new Date(Date.now() + 3600000).toISOString(),
    rol: "facilitador_mesa",
    permisos: ["mesas:abrir"],
  };

  const sesionAuditor: Sesion = {
    usuarioId: "usr-aud-01",
    token: "jwt-token-aud",
    modo: "institucional",
    desde: ahora,
    expiraEn: new Date(Date.now() + 3600000).toISOString(),
    rol: "auditor_forense",
    permisos: ["identidad:auditar"],
  };

  const sesionRolPersonalizadoConPermiso: Sesion = {
    usuarioId: "usr-custom-01",
    token: "jwt-token-custom",
    modo: "institucional",
    desde: ahora,
    expiraEn: new Date(Date.now() + 3600000).toISOString(),
    rol: "enlace_sectorial",
    permisos: ["alternativas:leer", "alternativas:gestionar", "seguimiento:leer", "seguimiento:gestionar"],
  };

  describe("Fase 2 (Alternativas MGA) en estado 'preparatoria'", () => {
    test("bloquea escritura a facilitador_mesa y auditor_forense", () => {
      const resFac = evaluarGatingFase({
        faseEstado: "preparatoria",
        sesion: sesionFacilitador,
        modulo: "alternativas",
      });
      expect(resFac.puedeEditarEfectivo).toBe(false);
      expect(resFac.mostrarAvisoPreparatoria).toBe(true);
      expect(resFac.esAdmin).toBe(false);

      const resAud = evaluarGatingFase({
        faseEstado: "preparatoria",
        sesion: sesionAuditor,
        modulo: "alternativas",
      });
      expect(resAud.puedeEditarEfectivo).toBe(false);
      expect(resAud.mostrarAvisoPreparatoria).toBe(true);
      expect(resAud.esAdmin).toBe(false);
    });

    test("bloquea escritura a rol no-admin aunque tenga permiso alternativas:gestionar", () => {
      const res = evaluarGatingFase({
        faseEstado: "preparatoria",
        sesion: sesionRolPersonalizadoConPermiso,
        modulo: "alternativas",
      });
      expect(res.puedeEditarEfectivo).toBe(false);
      expect(res.mostrarAvisoPreparatoria).toBe(true);
      expect(res.esAdmin).toBe(false);
    });

    test("permite escritura a autoridad_distrital para alistamiento institucional", () => {
      const res = evaluarGatingFase({
        faseEstado: "preparatoria",
        sesion: sesionAdmin,
        modulo: "alternativas",
      });
      expect(res.puedeEditarEfectivo).toBe(true);
      expect(res.mostrarAvisoPreparatoria).toBe(true);
      expect(res.esAdmin).toBe(true);
    });

    test("habilita escritura para roles autorizados una vez que la Fase 2 pasa a 'activa'", () => {
      const res = evaluarGatingFase({
        faseEstado: "activa",
        sesion: sesionRolPersonalizadoConPermiso,
        modulo: "alternativas",
      });
      expect(res.puedeEditarEfectivo).toBe(true);
      expect(res.mostrarAvisoPreparatoria).toBe(false);
    });
  });

  describe("Fase 3 (Seguimiento PAS) en estado 'preparatoria'", () => {
    test("bloquea escritura a no-admins en estado preparatoria", () => {
      const res = evaluarGatingFase({
        faseEstado: "preparatoria",
        sesion: sesionRolPersonalizadoConPermiso,
        modulo: "seguimiento",
      });
      expect(res.puedeEditarEfectivo).toBe(false);
      expect(res.mostrarAvisoPreparatoria).toBe(true);
    });

    test("permite administración y cargue de metas a autoridad_distrital", () => {
      const res = evaluarGatingFase({
        faseEstado: "preparatoria",
        sesion: sesionAdmin,
        modulo: "seguimiento",
      });
      expect(res.puedeEditarEfectivo).toBe(true);
      expect(res.mostrarAvisoPreparatoria).toBe(true);
      expect(res.esAdmin).toBe(true);
    });
  });
});
