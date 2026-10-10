import { describe, test, expect, beforeEach, vi } from "vitest";
import { useCadenaValorStore } from "./cadena-valor-store";
import {
  calcularAvancePorcentaje,
  obtenerSemaforoAvance,
} from "../models/indicador-dnp";
import * as cadenaValorApi from "../services/cadena-valor-api";

describe("Tablero de Cadena de Valor y Seguimiento (Hito PAS-2 / AUD-02)", () => {
  beforeEach(() => {
    useCadenaValorStore.getState().restablecer();
    vi.restoreAllMocks();
  });

  describe("Estructura de la Cadena de Valor de Cartagena", () => {
    test("carga exactamente los 8 indicadores oficiales en los 3 eslabones causales", () => {
      const { cadenaValor } = useCadenaValorStore.getState();

      expect(cadenaValor.insumo).toHaveLength(2);
      expect(cadenaValor.producto).toHaveLength(3);
      expect(cadenaValor.resultado).toHaveLength(3);

      const codigosInsumo = cadenaValor.insumo.map((x) => x.codigo);
      expect(codigosInsumo).toContain("IND-INS-01");
      expect(codigosInsumo).toContain("IND-INS-02");

      const codigosProducto = cadenaValor.producto.map((x) => x.codigo);
      expect(codigosProducto).toContain("IND-PROD-01");
      expect(codigosProducto).toContain("IND-PROD-02");
      expect(codigosProducto).toContain("IND-PROD-03");

      const codigosResultado = cadenaValor.resultado.map((x) => x.codigo);
      expect(codigosResultado).toContain("IND-RES-01");
      expect(codigosResultado).toContain("IND-RES-02");
      expect(codigosResultado).toContain("IND-RES-03");
    });

    test("busca indicadores por ID o por código", () => {
      const store = useCadenaValorStore.getState();
      const porCodigo = store.getIndicadorById("IND-RES-01");
      expect(porCodigo).toBeDefined();
      expect(porCodigo?.nombre).toContain("Tasa de Homicidios");
      expect(porCodigo?.tipo_indicador).toBe("resultado");

      const porId = store.getIndicadorById("01a0f7ce-3201-7bd8-819a-d98b2232d04c");
      expect(porId).toBeDefined();
      expect(porId?.codigo).toBe("IND-INS-01");
    });
  });

  describe("Cálculo Metodológico de Avance de Indicadores", () => {
    test("calcula avance para indicador ascendente (recursos, luminarias, frentes)", () => {
      // Línea Base = 1.000, Meta = 4.000, Actual = 2.500 -> 50%
      const avance1 = calcularAvancePorcentaje(2500, 1000, 4000, "ascendente");
      expect(avance1).toBe(50);

      // Línea Base = 0, Meta = 100, Actual = 80 -> 80%
      const avance2 = calcularAvancePorcentaje(80, 0, 100, "ascendente");
      expect(avance2).toBe(80);

      // Línea Base = 0, Meta = 100, Actual = 100 -> 100%
      const avance3 = calcularAvancePorcentaje(100, 0, 100, "ascendente");
      expect(avance3).toBe(100);

      // Línea Base = 0, Meta = 100, Actual = 0 -> 0%
      const avance4 = calcularAvancePorcentaje(0, 0, 100, "ascendente");
      expect(avance4).toBe(0);
    });

    test("calcula avance para indicador descendente (homicidios, hurtos, percepción)", () => {
      // Tasa Homicidios: Línea Base = 32.5, Meta = 25.0, Actual = 28.75 -> 50%
      const avance1 = calcularAvancePorcentaje(28.75, 32.5, 25.0, "descendente");
      expect(avance1).toBe(50);

      // Si se alcanza la meta de 25.0 -> 100%
      const avance2 = calcularAvancePorcentaje(25.0, 32.5, 25.0, "descendente");
      expect(avance2).toBe(100);

      // Si se mantiene en la línea base de 32.5 -> 0%
      const avance3 = calcularAvancePorcentaje(32.5, 32.5, 25.0, "descendente");
      expect(avance3).toBe(0);

      // Percepción: Línea Base = 78.4, Meta = 60.0, Actual = 69.2 -> 50%
      const avance4 = calcularAvancePorcentaje(69.2, 78.4, 60.0, "descendente");
      expect(avance4).toBe(50);
    });

    test("asigna semáforos cromáticos conforme a rangos SINERGIA", () => {
      const verde = obtenerSemaforoAvance(85);
      expect(verde.nivel).toBe("verde");
      expect(verde.badgeVariant).toBe("success");
      expect(verde.colorBarra).toBe("bg-success");

      const ambar = obtenerSemaforoAvance(65);
      expect(ambar.nivel).toBe("ambar");
      expect(ambar.badgeVariant).toBe("warning");
      expect(ambar.colorBarra).toBe("bg-warning");

      const rojo = obtenerSemaforoAvance(35);
      expect(rojo.nivel).toBe("rojo");
      expect(rojo.badgeVariant).toBe("destructive");
      expect(rojo.colorBarra).toBe("bg-danger");
    });
  });

  describe("Carga de Datos y Modo Contingencia (AUD-02)", () => {
    test("marca esContingencia en false cuando el backend responde correctamente", async () => {
      vi.spyOn(cadenaValorApi, "obtenerCadenaValor").mockResolvedValueOnce({
        datos: cadenaValorApi.CADENA_VALOR_CANONICA_CARTAGENA,
        esContingencia: false,
        origen: "api",
      });

      const store = useCadenaValorStore.getState();
      await store.cargarCadenaValor();

      const state = useCadenaValorStore.getState();
      expect(state.esContingencia).toBe(false);
      expect(state.cargando).toBe(false);
      expect(state.error).toBeNull();
    });

    test("activa esContingencia en true cuando el backend está caído o responde con error", async () => {
      vi.spyOn(cadenaValorApi, "obtenerCadenaValor").mockResolvedValueOnce({
        datos: cadenaValorApi.CADENA_VALOR_CANONICA_CARTAGENA,
        esContingencia: true,
        origen: "contingencia",
      });

      const store = useCadenaValorStore.getState();
      await store.cargarCadenaValor();

      const state = useCadenaValorStore.getState();
      expect(state.esContingencia).toBe(true);
      expect(state.cargando).toBe(false);
      expect(state.error).toContain("Modo contingencia");
    });
  });

  describe("Mutaciones y Registro de Mediciones (AUD-02)", () => {
    test("registra una medición cuantitativa y actualiza el valor y porcentaje de avance cuando la API tiene éxito", async () => {
      vi.spyOn(cadenaValorApi, "registrarMedicionIndicador").mockResolvedValueOnce({
        id: "med-001",
        indicador_id: "IND-PROD-01",
        periodo: "2026-S1",
        fecha_corte: "2026-06-30",
        valor_medido: 75,
        avance_acumulado: 54.55,
        registrado_por: "Equipo de Seguridad Distrital",
        creado_en: "2026-06-30T10:00:00Z",
        actualizado_en: "2026-06-30T10:00:00Z",
      });

      const store = useCadenaValorStore.getState();

      const ok = await store.registrarMedicion("IND-PROD-01", {
        periodo: "2026-S1",
        fecha_corte: "2026-06-30",
        valor_medido: 75,
        observaciones: "Entrega de 30 frentes dotados en Olaya Herrera y El Pozón",
        evidencia_documental_url: "https://cartagena.gov.co/evidencias/frentes-s1.pdf",
        registrado_por: "Equipo de Seguridad Distrital",
      });

      expect(ok).toBe(true);

      const actualizado = useCadenaValorStore.getState().getIndicadorById("IND-PROD-01");
      expect(actualizado).toBeDefined();
      expect(actualizado?.valor_actual).toBe(75);
      expect(actualizado?.tiene_mediciones).toBe(true);
      // LB: 45, Meta: 100, Actual: 75 -> ((75 - 45) / 55) * 100 = 54.55%
      expect(Number(actualizado?.porcentaje_avance)).toBeCloseTo(54.55, 1);
    });

    test("AUD-02: un POST fallido de medición NO altera el store, guarda error y retorna false", async () => {
      // Mockear fallo de red o 403 Forbidden del backend
      vi.spyOn(cadenaValorApi, "registrarMedicionIndicador").mockRejectedValueOnce(
        new Error("HTTP 403: El rol auditor_forense no tiene permiso para registrar mediciones")
      );

      const store = useCadenaValorStore.getState();
      const antes = store.getIndicadorById("IND-INS-02");
      const valorAntes = antes?.valor_actual;
      const avanceAntes = antes?.porcentaje_avance;

      // Intentar registrar medición con fallo simulado
      const ok = await store.registrarMedicion("IND-INS-02", {
        periodo: "2026-S2",
        fecha_corte: "2026-12-31",
        valor_medido: 1500000000,
        observaciones: "Intento no autorizado o con error de red",
        registrado_por: "auditor_forense",
      });

      // Debe retornar false
      expect(ok).toBe(false);

      // El store NO debe haber mutado el valor ni el avance
      const despues = useCadenaValorStore.getState().getIndicadorById("IND-INS-02");
      expect(despues?.valor_actual).toBe(valorAntes);
      expect(despues?.porcentaje_avance).toBe(avanceAntes);

      // El store debe registrar el mensaje de error del backend
      expect(useCadenaValorStore.getState().error).toContain("403");
      expect(useCadenaValorStore.getState().guardando).toBe(false);
    });

    test("selecciona y deselecciona indicador activo", () => {
      const store = useCadenaValorStore.getState();
      expect(store.indicadorSeleccionadoId).toBeNull();

      store.seleccionarIndicador("IND-RES-01");
      expect(useCadenaValorStore.getState().indicadorSeleccionadoId).toBe("IND-RES-01");

      store.seleccionarIndicador(null);
      expect(useCadenaValorStore.getState().indicadorSeleccionadoId).toBeNull();
    });

    test("actualiza metadatos institucionales de la ficha de indicador cuando la API responde exitosamente (EDIT-04)", async () => {
      const indicadorExistente = useCadenaValorStore.getState().getIndicadorById("IND-INS-01")!;
      const lbOriginal = indicadorExistente.linea_base_valor;
      const formulaOriginal = indicadorExistente.metodo_calculo;

      vi.spyOn(cadenaValorApi, "actualizarFichaIndicador").mockResolvedValueOnce({
        ...indicadorExistente,
        responsable_reporte: "Secretaría del Interior y Convivencia",
        fuente_datos: "MECAR SIEDCO",
        periodicidad: "Trimestral",
        metadatos: {
          ...indicadorExistente.metadatos,
          contacto_tecnico: "Ing. Enlace",
          email_contacto: "enlace@cartagena.gov.co",
        },
        actualizado_en: "2026-10-04T12:00:00Z",
      });

      const store = useCadenaValorStore.getState();
      const ok = await store.actualizarMetadatosFicha("IND-INS-01", {
        responsable_reporte: "Secretaría del Interior y Convivencia",
        fuente_datos: "MECAR SIEDCO",
        periodicidad: "Trimestral",
        metadatos: {
          contacto_tecnico: "Ing. Enlace",
          email_contacto: "enlace@cartagena.gov.co",
        },
      });

      expect(ok).toBe(true);

      const actualizado = useCadenaValorStore.getState().getIndicadorById("IND-INS-01");
      expect(actualizado?.responsable_reporte).toBe("Secretaría del Interior y Convivencia");
      expect(actualizado?.fuente_datos).toBe("MECAR SIEDCO");
      expect(actualizado?.periodicidad).toBe("Trimestral");
      expect(actualizado?.metadatos?.contacto_tecnico).toBe("Ing. Enlace");
      // Salvaguarda: fórmulas y línea base intactas
      expect(actualizado?.linea_base_valor).toBe(lbOriginal);
      expect(actualizado?.metodo_calculo).toBe(formulaOriginal);
    });

    test("AUD-02: un PATCH fallido de metadatos NO altera el store, guarda error y retorna false", async () => {
      vi.spyOn(cadenaValorApi, "actualizarFichaIndicador").mockRejectedValueOnce(
        new Error("HTTP 400: Salvaguarda institucional: Prohibido modificar fórmula o línea base")
      );

      const store = useCadenaValorStore.getState();
      const antes = store.getIndicadorById("IND-INS-01");
      const respAntes = antes?.responsable_reporte;

      const ok = await store.actualizarMetadatosFicha("IND-INS-01", {
        responsable_reporte: "Intento no permitido",
      });

      expect(ok).toBe(false);

      const despues = useCadenaValorStore.getState().getIndicadorById("IND-INS-01");
      expect(despues?.responsable_reporte).toBe(respAntes);
      expect(useCadenaValorStore.getState().error).toContain("Salvaguarda institucional");
      expect(useCadenaValorStore.getState().guardando).toBe(false);
    });
  });
});
