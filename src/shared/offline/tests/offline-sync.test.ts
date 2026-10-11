import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import {
  guardarPendiente,
  listarPendientes,
  eliminarPendiente,
  contarPendientes,
  contarTotalPendientes,
  registrarIntentoFallo,
  limpiarStore,
  type AsistenciaPendiente,
  type PropuestaPendiente,
} from "../db";
import {
  sincronizarTodo,
  registrarSincronizadores,
} from "../sync-manager";

describe("Módulo de Persistencia y Resiliencia Offline (PWA-OFFLINE-01)", () => {
  beforeEach(async () => {
    await limpiarStore("asistencias_pendientes");
    await limpiarStore("propuestas_pendientes");
    await limpiarStore("actas_pendientes");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Base de Datos Local (polis_offline_db / Memoria Fallback)", () => {
    it("guarda y recupera asistencias pendientes en la cola outbox", async () => {
      const item: AsistenciaPendiente = {
        id: "asist-test-01",
        mesaId: "mt-001",
        datos: {
          nombre_completo: "Clara Inés Valiente",
          tipoDocumento: "CC",
          numeroDocumento: "45123987",
          organizacionOBarrio: "Barú — Santa Ana",
        },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      };

      await guardarPendiente("asistencias_pendientes", item);
      const lista = await listarPendientes<AsistenciaPendiente>("asistencias_pendientes");

      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe("asist-test-01");
      expect(lista[0].mesaId).toBe("mt-001");
      expect(lista[0].datos.nombre_completo).toBe("Clara Inés Valiente");
    });

    it("guarda y recupera propuestas comunitarias pendientes de Modo Barrio", async () => {
      const propuesta: PropuestaPendiente = {
        id: "prop-test-01",
        codigoProvisional: "POL-2026-OFFLINE-ABCD",
        payload: {
          linea_id: "01a0f61b-6252-73d5-b035-7671ed9cf089",
          titulo: "Alumbrado solar para el embarcadero de Bocachica",
          descripcion: "Instalación de paneles y luminarias solares resistentes al salitre.",
          es_anonimo: false,
          autor_nombre: "Líder Comunitario Bocachica",
        },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      };

      await guardarPendiente("propuestas_pendientes", propuesta);
      const lista = await listarPendientes<PropuestaPendiente>("propuestas_pendientes");

      expect(lista).toHaveLength(1);
      expect(lista[0].codigoProvisional).toBe("POL-2026-OFFLINE-ABCD");
      expect(lista[0].payload.titulo).toContain("Alumbrado solar");
    });

    it("elimina registros tras confirmación de sincronización", async () => {
      const item: AsistenciaPendiente = {
        id: "asist-test-02",
        mesaId: "mt-002",
        datos: {
          nombre_completo: "Pedro Nel Arrieta",
          numeroDocumento: "73111222",
        },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      };

      await guardarPendiente("asistencias_pendientes", item);
      expect(await contarPendientes("asistencias_pendientes")).toBe(1);

      await eliminarPendiente("asistencias_pendientes", "asist-test-02");
      expect(await contarPendientes("asistencias_pendientes")).toBe(0);
    });

    it("calcula el consolidado total de registros pendientes en todos los stores", async () => {
      expect(await contarTotalPendientes()).toBe(0);

      await guardarPendiente("asistencias_pendientes", {
        id: "a-1",
        mesaId: "m-1",
        datos: { nombre_completo: "Prueba 1" },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      });

      await guardarPendiente("propuestas_pendientes", {
        id: "p-1",
        codigoProvisional: "POL-2026-OFFLINE-0001",
        payload: {
          linea_id: "l-1",
          titulo: "Propuesta 1",
          descripcion: "Desc 1",
        },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      });

      expect(await contarTotalPendientes()).toBe(2);
    });

    it("registra intentos fallidos y almacena el mensaje de error para reintento", async () => {
      const item: AsistenciaPendiente = {
        id: "asist-fallo-01",
        mesaId: "mt-001",
        datos: { nombre_completo: "Fallo Temporal" },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      };

      await guardarPendiente("asistencias_pendientes", item);
      await registrarIntentoFallo(
        "asistencias_pendientes",
        "asist-fallo-01",
        "Conexión no disponible en zona insular"
      );

      const lista = await listarPendientes<AsistenciaPendiente>("asistencias_pendientes");
      expect(lista[0].intentos).toBe(1);
      expect(lista[0].estado).toBe("error");
      expect(lista[0].ultimoError).toBe("Conexión no disponible en zona insular");
    });
  });

  describe("Gestor de Sincronización Outbox (SyncManager)", () => {
    it("no ejecuta sincronización si no hay registros pendientes", async () => {
      const res = await sincronizarTodo();
      expect(res).toEqual({
        asistenciasExitosas: 0,
        propuestasExitosas: 0,
        errores: 0,
      });
    });

    it("sincroniza exitosamente asistencias y propuestas usando despachadores", async () => {
      const mockAsistencia = vi.fn().mockResolvedValue({ id: "server-id-1" });
      const mockPropuesta = vi.fn().mockResolvedValue({ id: "server-prop-1", codigo_radicado: "POL-2026-9999" });

      registrarSincronizadores({
        asistencia: mockAsistencia,
        propuesta: mockPropuesta,
      });

      await guardarPendiente("asistencias_pendientes", {
        id: "asist-sync-01",
        mesaId: "mt-003",
        datos: {
          nombreCompleto: "Rosa Elena Pérez",
          tipoDocumento: "CC",
          numeroDocumento: "33111444",
          organizacionOBarrio: "Tierrabomba — Caño del Oro",
        },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      });

      await guardarPendiente("propuestas_pendientes", {
        id: "prop-sync-01",
        codigoProvisional: "POL-2026-OFFLINE-7777",
        payload: {
          linea_id: "01a0f61b-6252-73d5-b035-7671ed9cf089",
          titulo: "Muelle flotante comunitario",
          descripcion: "Construcción de muelle seguro para lanchas comunitarias.",
        },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      });

      expect(await contarTotalPendientes()).toBe(2);

      const res = await sincronizarTodo();
      expect(res.asistenciasExitosas).toBe(1);
      expect(res.propuestasExitosas).toBe(1);
      expect(res.errores).toBe(0);

      expect(mockAsistencia).toHaveBeenCalledTimes(1);
      expect(mockPropuesta).toHaveBeenCalledTimes(1);

      // Los elementos sincronizados deben haber sido purgados del outbox
      expect(await contarTotalPendientes()).toBe(0);
    });

    it("omite registros que hayan excedido el límite de 5 reintentos por seguridad", async () => {
      const mockAsistencia = vi.fn().mockResolvedValue({ id: "server-id-x" });
      registrarSincronizadores({ asistencia: mockAsistencia });

      await guardarPendiente("asistencias_pendientes", {
        id: "asist-max-intentos",
        mesaId: "mt-001",
        datos: { nombre_completo: "Exceso de Intentos" },
        creadoEn: new Date().toISOString(),
        intentos: 5, // Límite alcanzado
        estado: "error",
      });

      const res = await sincronizarTodo();
      expect(res.asistenciasExitosas).toBe(0);
      expect(mockAsistencia).not.toHaveBeenCalled();
      // Permanece en el store para auditoría/inspección
      expect(await contarPendientes("asistencias_pendientes")).toBe(1);
    });

    it("maneja fallos de red registrando el error sin perder los datos del facilitador", async () => {
      const mockAsistencia = vi.fn().mockRejectedValue(new Error("Timeout insular"));
      registrarSincronizadores({ asistencia: mockAsistencia });

      await guardarPendiente("asistencias_pendientes", {
        id: "asist-falla-red",
        mesaId: "mt-001",
        datos: { nombre_completo: "María del Rosario" },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: "pendiente",
      });

      const res = await sincronizarTodo();
      expect(res.errores).toBe(1);
      expect(res.asistenciasExitosas).toBe(0);

      // Los datos deben mantenerse intactos en la cola
      const pendientes = await listarPendientes<AsistenciaPendiente>("asistencias_pendientes");
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].intentos).toBe(1);
      expect(pendientes[0].estado).toBe("error");
      expect(pendientes[0].ultimoError).toContain("Timeout insular");
    });
  });
});
