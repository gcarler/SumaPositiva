import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  listarHistorialNotificaciones,
  consultarRadicado,
  obtenerSaludHerald,
  reintentarNotificacion,
  type SaludHeraldRespuesta,
  type HistorialNotificacionesPaginado,
  type ConsultaRadicadoRespuesta,
  type ReintentarNotificacionRespuesta,
} from "./notificaciones-api";

describe("notificaciones-api service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset fetch
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("listarHistorialNotificaciones", () => {
    it("llama a /notificaciones/historial sin query params si no se pasan filtros", async () => {
      let urlCapturada = "";
      const mockRespuesta: HistorialNotificacionesPaginado = {
        total: 1,
        limite: 10,
        desplazamiento: 0,
        elementos: [
          {
            id: "notif-001",
            codigo_radicado: "POL-2026-001",
            destinatario_correo: "ciudadano@cartagena.gov.co",
            tipo_evento: "radicacion",
            asunto: "Constancia de Radicación",
            estado_envio: "enviado",
            creado_en: "2026-10-31T12:00:00Z",
            enviado_en: "2026-10-31T12:00:05Z",
          },
        ],
      };

      globalThis.fetch = (async (info: RequestInfo | URL) => {
        urlCapturada = info.toString();
        return new Response(JSON.stringify(mockRespuesta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const res = await listarHistorialNotificaciones();
      expect(urlCapturada).toContain("/notificaciones/historial");
      expect(urlCapturada).not.toContain("?");
      expect(res.total).toBe(1);
      expect(res.elementos[0].codigo_radicado).toBe("POL-2026-001");
    });

    it("construye correctamente los query params para paginación y filtros", async () => {
      let urlCapturada = "";
      const mockRespuesta: HistorialNotificacionesPaginado = {
        total: 0,
        limite: 15,
        desplazamiento: 30,
        elementos: [],
      };

      globalThis.fetch = (async (info: RequestInfo | URL) => {
        urlCapturada = info.toString();
        return new Response(JSON.stringify(mockRespuesta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      await listarHistorialNotificaciones({
        limite: 15,
        desplazamiento: 30,
        codigo_radicado: "POL-2026-999",
        tipo_evento: "radicacion",
        estado_envio: "fallido",
      });

      expect(urlCapturada).toContain("limite=15");
      expect(urlCapturada).toContain("desplazamiento=30");
      expect(urlCapturada).toContain("codigo_radicado=POL-2026-999");
      expect(urlCapturada).toContain("tipo_evento=radicacion");
      expect(urlCapturada).toContain("estado_envio=fallido");
    });

    it("lanza error si el backend responde con error 403 o 500", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({ detail: "No autorizado para consultar bitácora forense" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      await expect(listarHistorialNotificaciones()).rejects.toThrow();
    });
  });

  describe("consultarRadicado", () => {
    it("codifica y normaliza a mayúsculas el código de radicado", async () => {
      let urlCapturada = "";
      const mockRadicado: ConsultaRadicadoRespuesta = {
        id: "rad-123",
        codigo_radicado: "POL-2026-ABCD",
        titulo: "Propuesta de Seguridad Vial",
        descripcion: "Instalación de reductores en San Francisco",
        tipo_aporte: "propuesta_ciudadana",
        autor_nombre: "María Pérez",
        estado: "radicado",
        territorio_nombre: "San Francisco",
        creado_en: "2026-10-30T10:00:00Z",
        actualizado_en: "2026-10-30T10:00:00Z",
      };

      globalThis.fetch = (async (info: RequestInfo | URL) => {
        urlCapturada = info.toString();
        return new Response(JSON.stringify(mockRadicado), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const res = await consultarRadicado("  pol-2026-abcd  ");
      expect(urlCapturada).toContain("/notificaciones/radicado/POL-2026-ABCD");
      expect(res.id).toBe("rad-123");
      expect(res.codigo_radicado).toBe("POL-2026-ABCD");
    });

    it("lanza error en caso de radicado inexistente (404)", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({ detail: "Radicado oficial no encontrado" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      await expect(consultarRadicado("POL-INEXISTENTE")).rejects.toThrow();
    });
  });

  describe("obtenerSaludHerald", () => {
    it("consulta /notificaciones/salud y retorna métricas completas", async () => {
      let urlCapturada = "";
      const mockSalud: SaludHeraldRespuesta = {
        estado: "saludable",
        motivos: [],
        smtp_configurado: true,
        ejecutor: {
          activo: true,
          ultimo_latido: "2026-10-31T15:00:00Z",
          ultimo_ciclo: "2026-10-31T15:00:10Z",
        },
        cola: {
          pendientes: 0,
          procesando: 0,
          fallidos_reintentables: 0,
          agotados: 0,
          mas_antiguo_segundos: null,
        },
        ultimas_24h: {
          enviados: 120,
          simulados: 10,
          fallidos: 1,
          tasa_exito: 0.99,
          latencia_p50_s: 0.8,
          latencia_p95_s: 2.1,
        },
        por_tipo: [
          {
            tipo_evento: "radicacion",
            enviados: 80,
            fallidos: 1,
            pendientes: 0,
          },
        ],
      };

      globalThis.fetch = (async (info: RequestInfo | URL) => {
        urlCapturada = info.toString();
        return new Response(JSON.stringify(mockSalud), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const res = await obtenerSaludHerald();
      expect(urlCapturada).toContain("/notificaciones/salud");
      expect(res.estado).toBe("saludable");
      expect(res.smtp_configurado).toBe(true);
      expect(res.ejecutor.activo).toBe(true);
      expect(res.ultimas_24h.enviados).toBe(120);
      expect(res.por_tipo[0].tipo_evento).toBe("radicacion");
    });

    it("lanza error si la respuesta es de error", async () => {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ detail: "Error interno del servidor" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      await expect(obtenerSaludHerald()).rejects.toThrow();
    });
  });

  describe("reintentarNotificacion", () => {
    it("hace una petición POST al endpoint de reintento con el ID especificado", async () => {
      let urlCapturada = "";
      let metodoCapturado = "";
      const mockReintento: ReintentarNotificacionRespuesta = {
        id: "notif-uuid-456",
        estado_envio: "pendiente",
        intentos: 2,
        mensaje: "Notificación encolada para reintento inmediato",
      };

      globalThis.fetch = (async (info: RequestInfo | URL, init?: RequestInit) => {
        urlCapturada = info.toString();
        metodoCapturado = init?.method ?? "GET";
        return new Response(JSON.stringify(mockReintento), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const res = await reintentarNotificacion("notif-uuid-456");
      expect(urlCapturada).toContain("/notificaciones/notif-uuid-456/reintentar");
      expect(metodoCapturado).toBe("POST");
      expect(res.id).toBe("notif-uuid-456");
      expect(res.estado_envio).toBe("pendiente");
      expect(res.intentos).toBe(2);
    });

    it("lanza error en caso de 404 o 409 (conflicto)", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({ detail: "La notificación ya fue despachada o no existe" }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      await expect(reintentarNotificacion("notif-uuid-456")).rejects.toThrow();
    });
  });
});
