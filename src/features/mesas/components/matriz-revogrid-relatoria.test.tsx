import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import type {
  ArbolProblemas,
  ArbolSoluciones,
} from "@/features/mesas/models/mesas";
import {
  MatrizRevogridRelatoria,
  arbolesAFilasRevoGrid,
  sincronizarEdicionesArboles,
} from "./matriz-revogrid-relatoria";
import { MatrizArbolRelatoria } from "./matriz-arbol-relatoria";

function crearArbolesMock(): {
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
} {
  const arbolProblemas: ArbolProblemas = {
    problemaCentral: "Inseguridad y baja cohesión comunitaria en el barrio Nelson Mandela",
    dimensionPrincipal: "Seguridad Personal y Convivencia",
    causas: [
      {
        id: "causa-01",
        texto: "Escaso alumbrado público y zonas oscuras en parques",
        hijos: [
          {
            id: "causa-ind-01",
            texto: "Déficit en el mantenimiento de luminarias de la red distrital",
            hijos: [],
            metadatos: {
              criticidad: "alta",
              dimensionOnu: "Seguridad Personal y Convivencia",
              actorResponsable: "Secretaría General / Alumbrado Público",
              origenSubmesaNombre: "Submesa 1 - Hábitat",
            },
          },
        ],
        metadatos: {
          criticidad: "alta",
          dimensionOnu: "Seguridad Personal y Convivencia",
          actorResponsable: "Secretaría General / Alumbrado Público",
          origenSubmesaNombre: "Submesa 1 - Hábitat",
        },
      },
      {
        id: "causa-02",
        texto: "Falta de oportunidades laborales para jóvenes en riesgo",
        hijos: [],
        metadatos: {
          criticidad: "media",
          dimensionOnu: "Seguridad Económica y Empleo",
          actorResponsable: "Secretaría de Desarrollo Social",
          origenSubmesaNombre: "Submesa 2 - Juventud",
        },
      },
    ],
    efectos: [
      {
        id: "efecto-01",
        texto: "Aumento de hurtos y percepción de temor nocturno",
        hijos: [
          {
            id: "efecto-ind-01",
            texto: "Aislamiento vecinal y desocupación de espacios recreativos",
            hijos: [],
            metadatos: {
              criticidad: "alta",
              dimensionOnu: "Seguridad Comunitaria y Cohesión Social",
            },
          },
        ],
        metadatos: {
          criticidad: "alta",
          dimensionOnu: "Seguridad Personal y Convivencia",
        },
      },
    ],
  };

  const arbolSoluciones: ArbolSoluciones = {
    objetivoCentral: "Fortalecer la convivencia pacífica y la seguridad comunitaria en Nelson Mandela",
    medios: [
      {
        id: "medio-01",
        texto: "Modernización integral del alumbrado con tecnología LED solar",
        hijos: [
          {
            id: "medio-ind-01",
            texto: "Plan distrital de mantenimiento preventivo y comunitario",
            hijos: [],
            metadatos: {
              criticidad: "alta",
              dimensionOnu: "Seguridad Personal y Convivencia",
              actorResponsable: "Alumbrado Público",
            },
          },
        ],
        metadatos: {
          criticidad: "alta",
          dimensionOnu: "Seguridad Personal y Convivencia",
          actorResponsable: "Alcaldía Mayor / Secretaría General",
        },
      },
    ],
    fines: [
      {
        id: "fin-01",
        texto: "Disminución efectiva de los índices delictivos nocturnos",
        hijos: [
          {
            id: "fin-ind-01",
            texto: "Apropiación ciudadana permanente del espacio público recuperado",
            hijos: [],
            metadatos: {
              criticidad: "alta",
              dimensionOnu: "Seguridad Comunitaria y Cohesión Social",
            },
          },
        ],
        metadatos: {
          criticidad: "alta",
          dimensionOnu: "Seguridad Personal y Convivencia",
        },
      },
    ],
  };

  return { arbolProblemas, arbolSoluciones };
}

describe("Encargo 318: Integración de RevoGrid en Matriz de Sistematización y Árbol de Relatoría", () => {
  describe("1. Modelo de Datos y Transformación Tabular (arbolesAFilasRevoGrid)", () => {
    test("mapea la jerarquía completa de problemas y soluciones a filas normalizadas", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const filas = arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones);

      // Esperado:
      // 1 Problema Central +
      // 2 Causas Directas + 1 Causa Indirecta = 3 Causas
      // 1 Efecto Directo + 1 Efecto Indirecto = 2 Efectos
      // 1 Objetivo Central +
      // 1 Medio Directo + 1 Medio Indirecto = 2 Medios
      // 1 Fin Directo + 1 Fin Indirecto = 2 Fines
      // Total = 1 + 3 + 2 + 1 + 2 + 2 = 11 filas
      expect(filas.length).toBe(11);

      // Fila Problema Central
      const filaProblema = filas.find((f) => f.tipoCategoria === "problema_central");
      expect(filaProblema).toBeDefined();
      expect(filaProblema?.tipoNodo).toBe("Problema Central");
      expect(filaProblema?.nivel).toBe("Tronco Central");
      expect(filaProblema?.texto).toContain("Inseguridad y baja cohesión");
      expect(filaProblema?.dimensionOnu).toBe("Seguridad Personal y Convivencia");

      // Fila Objetivo Central
      const filaObjetivo = filas.find((f) => f.tipoCategoria === "objetivo_central");
      expect(filaObjetivo).toBeDefined();
      expect(filaObjetivo?.tipoNodo).toBe("Objetivo Central");
      expect(filaObjetivo?.nivel).toBe("Propósito Central");
      expect(filaObjetivo?.texto).toContain("Fortalecer la convivencia pacífica");

      // Causa directa e indirecta
      const causaDirecta = filas.find((f) => f.id === "causa_causa-01");
      expect(causaDirecta?.tipoNodo).toBe("Causa");
      expect(causaDirecta?.nivel).toBe("Directa (Raíz)");
      expect(causaDirecta?.subMesaOrigen).toBe("Submesa 1 - Hábitat");
      expect(causaDirecta?.actorResponsable).toBe("Secretaría General / Alumbrado Público");

      const causaIndirecta = filas.find((f) => f.id === "causa_ind_causa-ind-01");
      expect(causaIndirecta?.tipoNodo).toBe("Causa");
      expect(causaIndirecta?.nivel).toBe("Indirecta (Subraíz)");
      expect(causaIndirecta?.parentId).toBe("causa-01");

      // Medio directo e indirecto
      const medioDirecto = filas.find((f) => f.id === "medio_medio-01");
      expect(medioDirecto?.tipoNodo).toBe("Medio");
      expect(medioDirecto?.nivel).toBe("Directo (Estratégico)");

      const finIndirecto = filas.find((f) => f.id === "fin_ind_fin-ind-01");
      expect(finIndirecto?.tipoNodo).toBe("Fin");
      expect(finIndirecto?.nivel).toBe("Fin Último / Impacto");
    });

    test("soporta múltiples problemas abordados en una misma mesa y vincula soluciones propuestas", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      arbolProblemas.problemas = [
        {
          id: "prob-adicional-01",
          texto: "Contaminación ambiental en caños perimetrales",
          dimensionOnu: "Seguridad Ambiental y Climática",
          criticidad: "alta",
          actorResponsable: "EPA Cartagena",
        },
      ];
      arbolProblemas.causas[0].metadatos = {
        ...arbolProblemas.causas[0].metadatos,
        problemaId: "prob-adicional-01",
        solucionPropuestaTexto: "Jornadas de limpieza e intervención hidráulica",
      };

      const filas = arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones);
      const filaProbAdicional = filas.find((f) => f.tipoCategoria === "problema_adicional");
      expect(filaProbAdicional).toBeDefined();
      expect(filaProbAdicional?.texto).toBe("Contaminación ambiental en caños perimetrales");
      expect(filaProbAdicional?.dimensionOnu).toBe("Seguridad Ambiental y Climática");

      const filaCausa = filas.find((f) => f.id === "causa_causa-01");
      expect(filaCausa?.problemaAsociado).toBe("Contaminación ambiental en caños perimetrales");
      expect(filaCausa?.solucionPropuesta).toBe("Jornadas de limpieza e intervención hidráulica");

      // Sincronizar edición de problema adicional y solución propuesta en causa
      const { nuevoProblemas, problemasModificado } = sincronizarEdicionesArboles({
        arbolProblemas,
        arbolSoluciones,
        updates: [
          {
            row: filaProbAdicional!,
            prop: "texto",
            val: "Contaminación crítica y sedimentación de caños",
          },
          {
            row: filaCausa!,
            prop: "solucionPropuesta",
            val: "Dragado integral y eco-guardianes comunitarios",
          },
        ],
      });

      expect(problemasModificado).toBe(true);
      expect(nuevoProblemas.problemas?.[0].texto).toBe("Contaminación crítica y sedimentación de caños");
      expect(nuevoProblemas.causas[0].metadatos?.solucionPropuestaTexto).toBe(
        "Dragado integral y eco-guardianes comunitarios",
      );
    });
  });

  describe("2. Renderizado del Subcomponente MatrizRevogridRelatoria", () => {
    test("renderiza métricas, filtros, cuadrícula y botones de exportación", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const onActualizarProblemas = vi.fn();
      const onActualizarSoluciones = vi.fn();

      const html = renderToString(
        <MatrizRevogridRelatoria
          arbolProblemas={arbolProblemas}
          arbolSoluciones={arbolSoluciones}
          onActualizarProblemas={onActualizarProblemas}
          onActualizarSoluciones={onActualizarSoluciones}
          readOnly={false}
          submesasDisponibles={[{ id: "sm-1", nombre: "Submesa 1" }]}
        />,
      );

      // Ribbons métricos
      expect(html).toContain("Total Registros");
      expect(html).toContain("Causas");
      expect(html).toContain("Efectos");
      expect(html).toContain("Medios");
      expect(html).toContain("Fines");

      // Barra de búsqueda y selectores
      expect(html).toContain("Buscar en celdas de la cuadrícula…");
      expect(html).toContain('role="combobox"');

      // Botones de agregado rápido (en modo edición)
      expect(html).toContain("Causa");
      expect(html).toContain("Efecto");
      expect(html).toContain("Medio");
      expect(html).toContain("Fin");

      // Acciones de portapapeles y descarga
      expect(html).toContain("Copiar TSV");
      expect(html).toContain("CSV");

      // Contenedor RevoGrid y nota metodológica
      expect(html).toContain("data-testid=\"revogrid-container\"");
      expect(html).toContain("revo-grid");
      expect(html).toContain("Navegación tipo hoja de cálculo");
    });

    test("en modo readOnly no renderiza los botones de adición directa", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const onActualizarProblemas = vi.fn();
      const onActualizarSoluciones = vi.fn();

      const html = renderToString(
        <MatrizRevogridRelatoria
          arbolProblemas={arbolProblemas}
          arbolSoluciones={arbolSoluciones}
          onActualizarProblemas={onActualizarProblemas}
          onActualizarSoluciones={onActualizarSoluciones}
          readOnly={true}
        />,
      );

      // Botones de agregado rápido ocultos en modo solo lectura
      expect(html).not.toContain("title=\"Agregar nueva causa directa\"");
      expect(html).not.toContain("title=\"Agregar nuevo efecto directo\"");
      // Acciones de consulta como Copiar TSV y CSV siguen disponibles
      expect(html).toContain("Copiar TSV");
      expect(html).toContain("CSV");
    });
  });

  describe("3. Selector de Vista en MatrizArbolRelatoria", () => {
    test("incorpora el conmutador 'Vista Estructurada' y 'Matriz'", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const onActualizarProblemas = vi.fn();
      const onActualizarSoluciones = vi.fn();

      const html = renderToString(
        <MatrizArbolRelatoria
          arbolProblemas={arbolProblemas}
          arbolSoluciones={arbolSoluciones}
          onActualizarProblemas={onActualizarProblemas}
          onActualizarSoluciones={onActualizarSoluciones}
          readOnly={false}
        />,
      );

      // Encabezado con selector de vista
      expect(html).toContain("Vista Estructurada");
      expect(html).toContain("Matriz");
      // Por defecto carga en Vista Estructurada
      expect(html).toContain("Árbol de Problemas");
      expect(html).toContain("Árbol de Soluciones");
      expect(html).toContain("Matriz Integrada MML");
    });
  });

  describe("4. Sincronización de Ediciones (sincronizarEdicionesArboles)", () => {
    test("actualiza el texto de una causa directa en el árbol de problemas", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const filas = arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones);
      const filaCausa = filas.find((f) => f.id === "causa_causa-01")!;

      const { nuevoProblemas, problemasModificado } = sincronizarEdicionesArboles({
        arbolProblemas,
        arbolSoluciones,
        updates: [
          {
            row: filaCausa,
            prop: "texto",
            val: "Causa editada: Falla masiva en iluminación vial",
          },
        ],
      });

      expect(problemasModificado).toBe(true);
      const causaActualizada = nuevoProblemas.causas.find((c) => c.id === "causa-01");
      expect(causaActualizada?.texto).toBe("Causa editada: Falla masiva en iluminación vial");
    });

    test("actualiza metadatos (actorResponsable y criticidad) de una causa indirecta", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const filas = arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones);
      const filaIndirecta = filas.find((f) => f.id === "causa_ind_causa-ind-01")!;

      const { nuevoProblemas, problemasModificado } = sincronizarEdicionesArboles({
        arbolProblemas,
        arbolSoluciones,
        updates: [
          {
            row: filaIndirecta,
            prop: "actorResponsable",
            val: "Empresa de Alumbrado y Energía SAS",
          },
          {
            row: filaIndirecta,
            prop: "criticidad",
            val: "alta",
          },
        ],
      });

      expect(problemasModificado).toBe(true);
      const parent = nuevoProblemas.causas.find((c) => c.id === "causa-01");
      const hijo = parent?.hijos.find((h) => h.id === "causa-ind-01");
      expect(hijo?.metadatos?.actorResponsable).toBe("Empresa de Alumbrado y Energía SAS");
      expect(hijo?.metadatos?.criticidad).toBe("alta");
    });

    test("actualiza el texto del Problema Central y del Objetivo Central", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const filas = arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones);
      const filaProblema = filas.find((f) => f.tipoCategoria === "problema_central")!;
      const filaObjetivo = filas.find((f) => f.tipoCategoria === "objetivo_central")!;

      const {
        nuevoProblemas,
        nuevoSoluciones,
        problemasModificado,
        solucionesModificado,
      } = sincronizarEdicionesArboles({
        arbolProblemas,
        arbolSoluciones,
        updates: [
          {
            row: filaProblema,
            prop: "texto",
            val: "Problema Central redefinido en plenaria",
          },
          {
            row: filaObjetivo,
            prop: "texto",
            val: "Objetivo Central concertado con la comunidad",
          },
        ],
      });

      expect(problemasModificado).toBe(true);
      expect(solucionesModificado).toBe(true);
      expect(nuevoProblemas.problemaCentral).toBe("Problema Central redefinido en plenaria");
      expect(nuevoSoluciones.objetivoCentral).toBe("Objetivo Central concertado con la comunidad");
    });

    test("procesa rangos pegados (batch updates de Excel) modificando múltiples nodos", () => {
      const { arbolProblemas, arbolSoluciones } = crearArbolesMock();
      const filas = arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones);
      const filaMedio = filas.find((f) => f.id === "medio_medio-01")!;
      const filaFin = filas.find((f) => f.id === "fin_fin-01")!;

      const { nuevoSoluciones, solucionesModificado } = sincronizarEdicionesArboles({
        arbolProblemas,
        arbolSoluciones,
        updates: [
          {
            row: filaMedio,
            prop: "texto",
            val: "Medio pegado desde hoja de cálculo",
          },
          {
            row: filaFin,
            prop: "texto",
            val: "Fin pegado desde hoja de cálculo",
          },
        ],
      });

      expect(solucionesModificado).toBe(true);
      expect(nuevoSoluciones.medios[0].texto).toBe("Medio pegado desde hoja de cálculo");
      expect(nuevoSoluciones.fines[0].texto).toBe("Fin pegado desde hoja de cálculo");
    });
  });
});
