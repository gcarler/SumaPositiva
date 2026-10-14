import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DimensionesGrid } from "./dimensiones-grid";
import { DimensionDetallePanel } from "../panels/dimension-detalle-panel";
import { DIMENSIONES_DETALLE_2026 } from "../data/dimensiones-detalle.data";
import { usePanelStore } from "@/core/panels/panel-store";

describe("DimensionesGrid & DimensionDetallePanel (DIM-ONU-01)", () => {
  beforeEach(() => {
    usePanelStore.getState().closeAll();
  });

  describe("DimensionesGrid Component", () => {
    test("renderiza las 7 dimensiones ONU canónicas de la Resolución 66/290", () => {
      const html = renderToString(<DimensionesGrid />);

      // Verifica los 7 nombres canónicos
      expect(html).toContain("Seguridad Personal y Ciudadana");
      expect(html).toContain("Seguridad y Convivencia Comunitaria");
      expect(html).toContain("Seguridad Económica y Medios de Vida");
      expect(html).toContain("Seguridad Ambiental y del Entorno");
      expect(html).toContain("Seguridad Alimentaria y Nutricional");
      expect(html).toContain("Seguridad en Salud y Sanitaria");
      expect(html).toContain("Seguridad Política e Institucional");

      // No incluye la dimensión transversal de crisis en la cuadrícula principal
      expect(html).not.toContain("Alertas Tempranas y Gestión del Riesgo");
    });

    test("renderiza los pilares ONU y la interactividad con foco accesible", () => {
      const html = renderToString(<DimensionesGrid />);

      // Pilares conceptuales
      expect(html).toContain("Libertad frente al miedo");
      expect(html).toContain("Libertad frente a la necesidad");
      expect(html).toContain("Libertad frente a la indignidad");

      // Botones accesibles con aria-label y llamada a la acción
      expect(html).toContain('aria-label="Explorar la dimensión 01: Seguridad Personal y Ciudadana. Libertad frente al miedo"');
      expect(html).toContain('aria-label="Explorar la dimensión 05: Seguridad Alimentaria y Nutricional. Libertad frente a la necesidad"');
      expect(html).toContain("Explorar dimensión a fondo");
    });

    test("el store de paneles registra correctamente la apertura de 'dimension-detalle'", () => {
      expect(usePanelStore.getState().entries).toHaveLength(0);

      // Simular apertura para la dimensión personal
      usePanelStore.getState().openPanel("dimension-detalle", { dimensionId: "personal" });

      const entries = usePanelStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe("dimension-detalle");
      expect(entries[0].props).toEqual({ dimensionId: "personal" });

      // Simular apertura para la dimensión ambiental
      usePanelStore.getState().openPanel("dimension-detalle", { dimensionId: "ambiental" });
      const entries2 = usePanelStore.getState().entries;
      expect(entries2).toHaveLength(2);
      expect(entries2[1].props).toEqual({ dimensionId: "ambiental" });
    });
  });

  describe("Integridad de Datos DIMENSIONES_DETALLE_2026", () => {
    test("cuenta con 8 dimensiones (7 ONU + 1 transversal de crisis)", () => {
      expect(DIMENSIONES_DETALLE_2026).toHaveLength(8);
      const ids = DIMENSIONES_DETALLE_2026.map((d) => d.id);
      expect(ids).toContain("personal");
      expect(ids).toContain("comunitaria");
      expect(ids).toContain("economica");
      expect(ids).toContain("ambiental");
      expect(ids).toContain("alimentaria");
      expect(ids).toContain("salud");
      expect(ids).toContain("politica");
      expect(ids).toContain("crisis");
    });

    test("las 7 dimensiones ONU cuentan con pilar ONU, explicación pedagógica y contexto territorial", () => {
      const dimensionesOnu = DIMENSIONES_DETALLE_2026.filter((d) => d.id !== "crisis");
      expect(dimensionesOnu).toHaveLength(7);

      for (const dim of dimensionesOnu) {
        // Pilar ONU
        expect([
          "Libertad frente al miedo",
          "Libertad frente a la necesidad",
          "Libertad frente a la indignidad",
        ]).toContain(dim.pilarOnu);

        // Explicación pedagógica robusta (array de párrafos)
        expect(Array.isArray(dim.queEsExplicacionPedagogica)).toBe(true);
        expect(dim.queEsExplicacionPedagogica.length).toBeGreaterThanOrEqual(2);
        for (const parrafo of dim.queEsExplicacionPedagogica) {
          expect(parrafo.length).toBeGreaterThan(50);
        }

        // Contexto Cartagena
        expect(dim.contextoCartagena).toBeDefined();
        expect(dim.contextoCartagena.length).toBeGreaterThan(50);
      }
    });

    test("las dimensiones tienen amenazas críticas, enfoque diferencial e indicadores trazadores", () => {
      const dimensionesOnu = DIMENSIONES_DETALLE_2026.filter((d) => d.id !== "crisis");

      for (const dim of dimensionesOnu) {
        // Amenazas críticas (mínimo 3)
        expect(dim.amenazasCriticas).toBeDefined();
        expect(dim.amenazasCriticas.length).toBeGreaterThanOrEqual(3);
        for (const amenaza of dim.amenazasCriticas) {
          expect(amenaza.titulo.length).toBeGreaterThan(3);
          expect(amenaza.descripcion.length).toBeGreaterThan(10);
        }

        // Enfoque diferencial
        expect(dim.enfoqueDiferencial).toBeDefined();
        expect(dim.enfoqueDiferencial.length).toBeGreaterThan(30);

        // Indicadores trazadores (mínimo 3 con metas)
        expect(dim.indicadoresTrazadores).toBeDefined();
        expect(dim.indicadoresTrazadores.length).toBeGreaterThanOrEqual(3);
        for (const ind of dim.indicadoresTrazadores) {
          expect(ind.indicador.length).toBeGreaterThan(3);
          expect(ind.lineaBase.length).toBeGreaterThan(1);
          expect(ind.meta2036.length).toBeGreaterThan(1);
        }

        // Rutas de participación ciudadana
        expect(dim.comoParticipar).toBeDefined();
        expect(dim.comoParticipar.length).toBeGreaterThan(30);
      }
    });
  });

  describe("DimensionDetallePanel Component", () => {
    test("renderiza la ficha completa para la dimensión seleccionada (personal)", () => {
      const html = renderToString(
        <DimensionDetallePanel entryKey="test-key" props={{ dimensionId: "personal" }} />
      );

      // Título y paradigma
      expect(html).toContain("Seguridad Personal y Ciudadana");
      expect(html).toContain("Libertad frente al miedo");
      expect(html).toContain("Resolución ONU 66/290");

      // Diagnóstico Cartagena y amenazas
      expect(html).toContain("Diagnóstico Territorial en Cartagena de Indias");
      expect(html).toContain("Amenazas y Vulnerabilidades Críticas que Atiende");
      expect(html).toContain("Sicariato y homicidio juvenil");

      // Enfoque diferencial
      expect(html).toContain("Enfoque Diferencial, Étnico (Ley 70/93) y de Género");

      // Indicadores trazadores
      expect(html).toContain("Indicadores Trazadores Decenales (2026–2036)");

      // Dependencia Líder y rendición
      expect(html).toContain("Gobernanza Distrital y Dependencias Responsables");
      expect(html).toContain("Secretaría del Interior y Convivencia Ciudadana");
      expect(html).toContain("Ver rendición de cuentas y ejecución presupuestal");

      // Incidencia ciudadana
      expect(html).toContain("¿Cómo Puedes Incidir en Esta Dimensión?");
    });

    test("renderiza el selector rápido con las 7 dimensiones ONU", () => {
      const html = renderToString(
        <DimensionDetallePanel entryKey="test-key" props={{ dimensionId: "ambiental" }} />
      );

      // Verifica botones de selección rápida con números y nombres cortos
      expect(html).toContain("Personal");
      expect(html).toContain("Comunitaria");
      expect(html).toContain("Económica");
      expect(html).toContain("Ambiental");
      expect(html).toContain("Alimentaria");
      expect(html).toContain("Salud");
      expect(html).toContain("Política");

      // Verifica contenido de la dimensión ambiental activa
      expect(html).toContain("Seguridad Ambiental y del Entorno");
      expect(html).toContain("Cartagena es una ciudad anfibia");
      expect(html).toContain("Inundaciones pluviales y marea alta");
    });
  });
});
