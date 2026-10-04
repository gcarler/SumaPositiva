import { describe, expect, it } from "vitest";
import {
  sanitizarCsv,
  escaparCsv,
  formatearFilaCsv,
  generarCsv,
} from "./csv";

describe("Utilidades CSV Centralizadas (AUD-12)", () => {
  describe("sanitizarCsv y escaparCsv", () => {
    it("retorna comillas vacías ante null o undefined", () => {
      expect(sanitizarCsv(null)).toBe('""');
      expect(sanitizarCsv(undefined)).toBe('""');
      expect(escaparCsv(null)).toBe('""');
      expect(escaparCsv(undefined)).toBe('""');
    });

    it("procesa cadenas de texto estándar correctamente entre comillas", () => {
      expect(sanitizarCsv("Cartagena de Indias")).toBe('"Cartagena de Indias"');
      expect(sanitizarCsv("Plan de Acción")).toBe('"Plan de Acción"');
    });

    it("escapa comillas dobles internas duplicándolas según RFC 4180", () => {
      expect(sanitizarCsv('Mesa "Centro Histórico"')).toBe('"Mesa ""Centro Histórico"""');
      expect(sanitizarCsv('"Texto entre comillas"')).toBe('"""Texto entre comillas"""');
    });

    it("convierte tipos numéricos y booleanos de forma transparente", () => {
      expect(sanitizarCsv(42)).toBe('"42"');
      expect(sanitizarCsv(0)).toBe('"0"');
      expect(sanitizarCsv(1050000.5)).toBe('"1050000.5"');
      expect(sanitizarCsv(true)).toBe('"true"');
      expect(sanitizarCsv(false)).toBe('"false"');
    });

    it("neutraliza inyección de fórmulas con prefijo '=' anteponiendo comilla simple", () => {
      expect(sanitizarCsv("=1+1")).toBe('"\'=1+1"');
      expect(sanitizarCsv("=SUM(A1:A10)")).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizarCsv("=cmd|' /C calc'!A0")).toBe('"\'=cmd|\' /C calc\'!A0"');
    });

    it("neutraliza inyección de fórmulas con prefijo '+' anteponiendo comilla simple", () => {
      expect(sanitizarCsv("+12345")).toBe('"\' +12345"'.replace(" ", ""));
      expect(sanitizarCsv("+cmd|' /C calc'!A0")).toBe('"\' +cmd|\' /C calc\'!A0"'.replace(" ", ""));
    });

    it("neutraliza inyección de fórmulas con prefijo '-' anteponiendo comilla simple", () => {
      expect(sanitizarCsv("-100")).toBe('"\' -100"'.replace(" ", ""));
      expect(sanitizarCsv("-2+3*cmd|' /C calc'!A0")).toBe('"\' -2+3*cmd|\' /C calc\'!A0"'.replace(" ", ""));
    });

    it("neutraliza inyección de fórmulas con prefijo '@' anteponiendo comilla simple", () => {
      expect(sanitizarCsv("@SUM(A1:B1)")).toBe('"\'@SUM(A1:B1)"');
      expect(sanitizarCsv("@import")).toBe('"\'@import"');
    });

    it("neutraliza caracteres de control de tabulación '\\t' y retorno de carro '\\r' al inicio", () => {
      expect(sanitizarCsv("\tDATO")).toBe('"\'\tDATO"');
      expect(sanitizarCsv("\rDATO")).toBe('"\'\rDATO"');
    });

    it("neutraliza prefijos peligrosos precedidos por espacios en blanco", () => {
      expect(sanitizarCsv(" =SUM(A1)")).toBe('"\' =SUM(A1)"');
      expect(sanitizarCsv("   +100")).toBe('"\'   +100"');
      expect(sanitizarCsv("  @macro")).toBe('"\'  @macro"');
    });
  });

  describe("formatearFilaCsv", () => {
    it("convierte una lista de valores en una fila separada por punto y coma por defecto", () => {
      const fila = formatearFilaCsv(["ID-01", "Cartagena", 100, "=DANGER"]);
      expect(fila).toBe('"ID-01";"Cartagena";"100";"\'=DANGER"');
    });

    it("admite separador personalizado (coma)", () => {
      const fila = formatearFilaCsv(["ID-01", "Cartagena"], ",");
      expect(fila).toBe('"ID-01","Cartagena"');
    });
  });

  describe("generarCsv", () => {
    it("construye un CSV estructurado con encabezados, filas y BOM UTF-8", () => {
      const encabezados = ["Código", "Nombre", "Avance"];
      const filas = [
        ["PAS-01", "Seguridad", 85],
        ["PAS-02", "Convivencia", "=100%"],
      ];

      const csv = generarCsv(encabezados, filas);
      expect(csv.startsWith("\uFEFF")).toBe(true);

      const lineas = csv.replace("\uFEFF", "").split("\r\n");
      expect(lineas.length).toBe(3);
      expect(lineas[0]).toBe('"Código";"Nombre";"Avance"');
      expect(lineas[1]).toBe('"PAS-01";"Seguridad";"85"');
      expect(lineas[2]).toBe('"PAS-02";"Convivencia";"\'=100%"');
    });

    it("admite deshabilitar el BOM UTF-8 y cambiar separador a coma", () => {
      const csv = generarCsv(["A", "B"], [[1, 2]], { incluirBom: false, separador: "," });
      expect(csv.startsWith("\uFEFF")).toBe(false);
      expect(csv).toBe('"A","B"\r\n"1","2"');
    });
  });
});
