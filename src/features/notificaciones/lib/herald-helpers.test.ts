import { describe, it, expect } from "vitest";
import {
  obtenerNombreTipoEvento,
  formatearSegundos,
  formatearLatido,
  esNotificacionAgotada,
} from "./herald-helpers";

describe("herald-helpers", () => {
  describe("obtenerNombreTipoEvento", () => {
    it("retorna nombres institucionales en español para claves conocidas", () => {
      expect(obtenerNombreTipoEvento("radicacion")).toBe("Constancia de radicación");
      expect(obtenerNombreTipoEvento("perfil_actualizado")).toBe("Actualización de perfil");
      expect(obtenerNombreTipoEvento("contrasena_cambiada")).toBe("Modificación de contraseña");
      expect(obtenerNombreTipoEvento("gestion_institucional")).toBe("Gestión institucional");
      expect(obtenerNombreTipoEvento("alerta_pendientes")).toBe("Alerta de compromisos pendientes");
      expect(obtenerNombreTipoEvento("respaldo")).toBe("Respaldo popular ciudadano");
      expect(obtenerNombreTipoEvento("cambio_estado")).toBe("Cambio de estado de propuesta");
    });

    it("formatea amigablemente tipos no catalogados", () => {
      expect(obtenerNombreTipoEvento("tipo_desconocido_test")).toBe("Tipo Desconocido Test");
      expect(obtenerNombreTipoEvento("evento")).toBe("Evento");
    });

    it("maneja cadenas vacías o valores atípicos", () => {
      expect(obtenerNombreTipoEvento("")).toBe("Evento no especificado");
    });
  });

  describe("formatearSegundos", () => {
    it("devuelve 'Sin espera' para valores nulos, indefinidos o NaN", () => {
      expect(formatearSegundos(null)).toBe("Sin espera");
      expect(formatearSegundos(undefined)).toBe("Sin espera");
      expect(formatearSegundos(Number.NaN)).toBe("Sin espera");
    });

    it("formatea 0 y pocos segundos como '0 s' o segundos", () => {
      expect(formatearSegundos(0)).toBe("0 s");
      expect(formatearSegundos(-5)).toBe("0 s");
      expect(formatearSegundos(45)).toBe("hace 45 s");
    });

    it("formatea minutos y segundos adecuadamente", () => {
      expect(formatearSegundos(60)).toBe("hace 1 min");
      expect(formatearSegundos(120)).toBe("hace 2 min");
      expect(formatearSegundos(3540)).toBe("hace 59 min");
    });

    it("formatea horas y minutos adecuadamente", () => {
      expect(formatearSegundos(3600)).toBe("hace 1 h");
      expect(formatearSegundos(3660)).toBe("hace 1 h 1 min");
      expect(formatearSegundos(7200)).toBe("hace 2 h");
    });

    it("formatea días adecuadamente", () => {
      expect(formatearSegundos(86400)).toBe("hace 1 d");
      expect(formatearSegundos(172800)).toBe("hace 2 d");
    });
  });

  describe("formatearLatido", () => {
    it("devuelve 'Sin registro de actividad' cuando la fecha es nula, vacía o indefinida", () => {
      expect(formatearLatido(null)).toBe("Sin registro de actividad");
      expect(formatearLatido(undefined)).toBe("Sin registro de actividad");
      expect(formatearLatido("")).toBe("Sin registro de actividad");
      expect(formatearLatido("fecha-invalida-xyz")).toBe("Fecha inválida");
    });

    it("formatea latidos recientes como 'hace unos instantes'", () => {
      const ahora = 1700000000000;
      const hace5s = new Date(ahora - 5000).toISOString();
      expect(formatearLatido(hace5s, ahora)).toBe("hace unos instantes");
    });

    it("formatea fechas ISO válidas transcurridas", () => {
      const ahora = 1700000000000;
      const hace2min = new Date(ahora - 120000).toISOString();
      expect(formatearLatido(hace2min, ahora)).toBe("hace 2 min");
    });
  });

  describe("esNotificacionAgotada", () => {
    it("retorna false para valores nulos o vacíos", () => {
      expect(esNotificacionAgotada(null as unknown as { estado_envio: string })).toBe(false);
    });

    it("retorna true para notificaciones con estado fallido o error", () => {
      expect(esNotificacionAgotada({ estado_envio: "fallido" })).toBe(true);
      expect(esNotificacionAgotada({ estado_envio: "FALLIDO" })).toBe(true);
      expect(esNotificacionAgotada({ estado_envio: "error" })).toBe(true);
      expect(esNotificacionAgotada({ estado_envio: "Error", intentos: 3 })).toBe(true);
    });

    it("retorna false para estados activos o exitosos", () => {
      expect(esNotificacionAgotada({ estado_envio: "enviado" })).toBe(false);
      expect(esNotificacionAgotada({ estado_envio: "simulado" })).toBe(false);
      expect(esNotificacionAgotada({ estado_envio: "pendiente" })).toBe(false);
      expect(esNotificacionAgotada({ estado_envio: "procesando" })).toBe(false);
    });
  });
});
