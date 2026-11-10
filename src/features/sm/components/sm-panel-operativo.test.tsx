/**
 * Pruebas unitarias para el Panel Operativo SM Core y su Integración con Mesas (Encargo 310).
 *
 * El cliente HTTP se mockea: ninguna prueba acepta datos fabricados por el
 * propio cliente. Los caminos de error deben propagarse y mostrarse.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { apiFetch } from "@/core/http/api-client";
import { useSMStore } from "../state/sm-store";
import type { SMSalud } from "../models/sm-types";
import { SMPanelOperativo } from "./sm-panel-operativo";
import { ingestarEventoSM, ejecutarWorkerSM, obtenerSaludSM, listarMensajesSM } from "../api/sm-api";
import { MesaLogisticaPanel } from "@/features/mesas/components/mesa-logistica-panel";
import { MesaCompromisosTabla } from "@/features/mesas/components/mesa-compromisos-tabla";
import { crearLogisticaPorDefecto, type MesaDeTrabajo } from "@/features/mesas/models/mesas";
import { useSesionStore } from "@/features/sesion/state/session-store";

vi.mock("@/core/http/api-client", () => ({
  apiFetch: vi.fn(),
  setBearerToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  ApiError: class ApiError extends Error {},
  ApiTimeoutError: class ApiTimeoutError extends Error {},
}));

type MockFetch = {
  mockReset: () => void;
  mockResolvedValue: (valor: unknown) => void;
  mockRejectedValue: (error: unknown) => void;
  mockImplementation: (fn: (url: string) => Promise<unknown>) => void;
};

const apiFetchMock = apiFetch as unknown as MockFetch;

const SALUD: SMSalud = {
  tenant: "polis",
  estado: "saludable",
  pendientes: 3,
  enviados: 45,
  fallidos: 1,
  canales_vivos: ["correo", "webhook", "whatsapp"],
  motivos: [],
  actualizado_en: new Date().toISOString(),
};

const MENSAJE = {
  id: "sm-msg-test-01",
  tenant: "polis",
  evento_id: "evt-01",
  canal: "correo" as const,
  actor: "usuario-opaco-01",
  contacto_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd34",
  asunto: "Convocatoria Mesa Mandela",
  cuerpo: "Notificación de inicio",
  estado: "enviado" as const,
  idempotencia: "idemp-01",
  creado_en: new Date().toISOString(),
  actualizado_en: new Date().toISOString(),
};

const RESUMEN = { procesados: 2, enviados: 1, fallidos: 1, agotados: 0, sin_contacto: 0 };

function sesionDePrueba() {
  return {
    modo: "institucional" as const,
    desde: new Date().toISOString(),
    usuarioId: "11111111-1111-4111-8111-111111111111",
    rol: "autoridad_distrital" as const,
    permisos: ["comunicaciones:gestionar", "auditoria:leer"],
    usuario: {
      id: "11111111-1111-4111-8111-111111111111",
      correo: "operador.institucional@example.org",
      nombres: "Operador",
      apellidos: "Institucional",
    } as never,
  };
}

function crearMesaPrueba(): MesaDeTrabajo {
  return {
    id: "mesa-sm-test-01",
    nombre: "Mesa Territorial de Seguridad Humana - Nelson Mandela",
    fecha: "2026-11-20",
    lugar: "Salón Comunal Sector Las Vegas",
    entidad: "Alcaldía Mayor de Cartagena",
    facilitador: "Dra. Carmen Valiente",
    totalAsistentes: 50,
    estado: "en_curso",
    plenaria: { acuerdos: "Priorizar seguridad juvenil y convivencia" },
    submesas: [],
    logistica: crearLogisticaPorDefecto(),
    compromisos: [
      {
        id: "comp-sm-1",
        codigo: "COMP-01",
        descripcion: "Instalación de alumbrado público y cámaras de seguridad comunitaria",
        entidadResponsable: "Secretaría del Interior",
        personaResponsable: "Ing. Roberto Mendoza",
        fechaLimite: "2026-12-30",
        tipo: "inversion_distrital",
        estado: "pendiente",
        avancePorcentaje: 0,
      },
    ],
  };
}

describe("Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310)", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    useSesionStore.setState({ sesion: null });
    useSMStore.setState({
      filtros: { canal: "todos", estado: "todos" },
      salud: SALUD,
      mensajes: [MENSAJE],
      cargando: false,
      ejecutandoWorker: false,
      ultimoResumenWorker: null,
      error: null,
    });
  });

  describe("1. Renderizado del Panel Operativo SM Core", () => {
    test("renderiza tarjetas KPI operativas, visor de salud y botón de outbox", () => {
      const html = renderToString(<SMPanelOperativo />);

      expect(html).toContain("Panel Operativo SM Core");
      expect(html).toContain("Panel Operativo de Notificaciones y Outbox");
      expect(html).toContain("SM Core • Subnúcleo Transaccional");
      expect(html).toContain("Pendientes");
      expect(html).toContain("Enviados");
      expect(html).toContain("Fallidos");
      expect(html).toContain("Agotados");
      expect(html).toContain("Canales Vivos");
      expect(html).toContain("Ejecutar ronda de outbox");
      expect(html).toContain("Estado de Adaptadores y Canales Institucionales");
      expect(html).toContain("Correo Electrónico");
      expect(html).toContain("WhatsApp Oficial");
      expect(html).toContain("Webhook Seguro");
    });

    test("renderiza tabla de mensajes con seudónimo de contacto sin exponer PII", () => {
      const html = renderToString(<SMPanelOperativo />);

      expect(html).toContain("Bandeja de Salida (Outbox Transaccional)");
      expect(html).toContain("Hash Contacto (Ley 1581)");
      expect(html).toContain("a94a8fe5");
      expect(html).not.toContain("@example.org");
      expect(html).not.toContain("+57 300 000 0000");
    });

    test("sin salud disponible muestra 'Sin datos' y el error real, nunca 'Saludable'", () => {
      useSMStore.setState({
        salud: null,
        mensajes: [],
        error: "No se pudo conectar con /sm/health",
      });

      const html = renderToString(<SMPanelOperativo />);

      expect(html).toContain("Sin datos");
      expect(html).toContain("No se pudo conectar con /sm/health");
      expect(html).toContain("No se pudo consultar SM Core");
      expect(html).not.toContain("Saludable");
    });
  });

  describe("2. Cliente API y Store Reactivo Zustand", () => {
    test("obtenerSaludSM devuelve la respuesta de la API", async () => {
      apiFetchMock.mockResolvedValue(SALUD);

      const salud = await obtenerSaludSM();

      expect(salud).toBe(SALUD);
      expect(apiFetchMock).toHaveBeenCalledWith("/sm/health");
    });

    test("obtenerSaludSM propaga el error en vez de inventar salud", async () => {
      apiFetchMock.mockRejectedValue(new Error("API 503"));

      await expect(obtenerSaludSM()).rejects.toThrow("API 503");
    });

    test("listarMensajesSM devuelve mensajes de la API y propaga fallos", async () => {
      apiFetchMock.mockResolvedValue([MENSAJE]);

      await expect(listarMensajesSM({ estado: "enviado" })).resolves.toEqual([MENSAJE]);
      expect(apiFetchMock).toHaveBeenCalledWith("/sm/messages?estado=enviado");

      apiFetchMock.mockRejectedValue(new Error("API 403"));
      await expect(listarMensajesSM()).rejects.toThrow("API 403");
    });

    test("ejecutarWorkerSM devuelve el resumen real y propaga fallos", async () => {
      apiFetchMock.mockResolvedValue(RESUMEN);

      await expect(ejecutarWorkerSM(10)).resolves.toEqual(RESUMEN);
      expect(apiFetchMock).toHaveBeenCalledWith("/sm/worker/run-once", {
        method: "POST",
        body: { limite: 10 },
      });

      apiFetchMock.mockRejectedValue(new Error("worker deshabilitado"));
      await expect(ejecutarWorkerSM()).rejects.toThrow("worker deshabilitado");
    });

    test("useSMStore maneja filtros y guarda solo la respuesta del worker", async () => {
      apiFetchMock.mockImplementation(async (url: string) => {
        if (url === "/sm/worker/run-once") return RESUMEN;
        if (url === "/sm/health") return SALUD;
        if (url.startsWith("/sm/messages")) return [MENSAJE];
        throw new Error(`URL inesperada: ${url}`);
      });

      const store = useSMStore.getState();
      expect(store.filtros.canal).toBe("todos");

      store.setFiltros({ canal: "correo", estado: "enviado" });
      expect(useSMStore.getState().filtros.canal).toBe("correo");
      expect(useSMStore.getState().filtros.estado).toBe("enviado");

      await useSMStore.getState().ejecutarOutbox();
      expect(useSMStore.getState().ultimoResumenWorker).toEqual(RESUMEN);
      expect(useSMStore.getState().error).toBeNull();
    });

    test("el store conserva el error cuando la recarga falla", async () => {
      apiFetchMock.mockRejectedValue(new Error("backend caído"));

      await useSMStore.getState().recargarTodo();

      expect(useSMStore.getState().salud).toBeNull();
      expect(useSMStore.getState().error).toBe("backend caído");
    });
  });

  describe("3. Integración Mesas de Trabajo con SM Core (Encargo 308)", () => {
    test("ingestarEventoSM usa usuario.id como actor y propaga el error", async () => {
      apiFetchMock.mockResolvedValue({ ...MENSAJE, id: "sm-msg-api-1" });

      const evento = await ingestarEventoSM({
        tipo_evento: "mesa.convocatoria",
        actor: "11111111-1111-4111-8111-111111111111",
        canal: "correo",
        contacto: "operador.institucional@example.org",
        idempotencia: "mesa-convocatoria-test",
        entidad: "mesa",
        entidad_id: "mesa-sm-test-01",
      });

      expect(evento.id).toBe("sm-msg-api-1");
      expect(apiFetchMock).toHaveBeenCalledWith("/sm/events", {
        method: "POST",
        body: expect.objectContaining({
          actor: "11111111-1111-4111-8111-111111111111",
          contacto: "operador.institucional@example.org",
        }),
      });

      apiFetchMock.mockRejectedValue(new Error("consentimiento ausente"));
      await expect(
        ingestarEventoSM({
          tipo_evento: "mesa.convocatoria",
          actor: "11111111-1111-4111-8111-111111111111",
          canal: "correo",
          contacto: "operador.institucional@example.org",
          idempotencia: "mesa-convocatoria-test-2",
        })
      ).rejects.toThrow("consentimiento ausente");
    });

    test("MesaLogisticaPanel exige sesión y no inventa correo ni actor", () => {
      const mesa = crearMesaPrueba();
      const htmlSinSesion = renderToString(<MesaLogisticaPanel mesa={mesa} />);

      expect(htmlSinSesion).toContain("Convocatoria Oficial a Participantes");
      expect(htmlSinSesion).toContain("Notificar Convocatoria");
      expect(htmlSinSesion).toContain("Requiere sesión institucional con correo registrado.");
      expect(htmlSinSesion).not.toContain("convocatoria.mesas@cartagena.gov.co");
    });

    test("MesaLogisticaPanel con sesión notifica al correo registrado", () => {
      useSesionStore.setState({ sesion: sesionDePrueba() });
      const mesa = crearMesaPrueba();
      const html = renderToString(<MesaLogisticaPanel mesa={mesa} />);

      expect(html).toContain("Se envía a tu correo registrado con consentimiento SM.");
      expect(html).not.toContain("cartagena.gov.co");
    });

    test("MesaCompromisosTabla exige sesión y no deduce correos del nombre", () => {
      const mesa = crearMesaPrueba();
      const htmlSinSesion = renderToString(<MesaCompromisosTabla mesa={mesa} />);

      expect(htmlSinSesion).toContain("Notificar asignación a responsable");
      expect(htmlSinSesion).toContain("Trazabilidad SM Core • Ley 1581/2012");
      expect(htmlSinSesion).toContain("Requiere sesión institucional con correo registrado.");
      expect(htmlSinSesion).not.toContain("roberto.mendoza@cartagena.gov.co");
      expect(htmlSinSesion).not.toContain("contacto.institucional@cartagena.gov.co");
    });

    test("MesaCompromisosTabla con sesión usa el correo registrado", () => {
      useSesionStore.setState({ sesion: sesionDePrueba() });
      const mesa = crearMesaPrueba();
      const html = renderToString(<MesaCompromisosTabla mesa={mesa} />);

      expect(html).toContain("Se envía a tu correo registrado con consentimiento SM.");
      expect(html).not.toContain("cartagena.gov.co");
    });
  });
});
