import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import type { MesaDeTrabajo } from "@/features/mesas/models/mesas";
import {
  MesasMatrizCatalogoRevogrid,
  mesasAFilasMatriz,
  mesasAFilasMatrizMetodologica,
} from "./mesas-matriz-catalogo-revogrid";
import { CollectionViewToggle } from "@/shared/ui/collection-view";

function crearMesasMock(): MesaDeTrabajo[] {
  return [
    {
      id: "mesa-uuid-001",
      nombre: "Mesa Territorial Nelson Mandela",
      codigoOficial: "MT-L01-01",
      shortcodeCiudadano: "mt-001",
      estado: "en_curso",
      fecha: "2026-10-15",
      horario: "09:00 - 12:00",
      lugar: "Polideportivo Central",
      entidad: "Localidad 1 - Histórica y del Caribe Norte",
      facilitador: "Dra. Sandra Martínez",
      totalAsistentes: 45,
      plenaria: { acuerdos: "Acuerdos de convivencia aprobados" },
      submesas: [],
      dimensionOnu: "Seguridad Personal y Convivencia",
      arbolProblemas: {
        problemaCentral: "Déficit de alumbrado e inseguridad en corredores escolares",
        causas: [],
        efectos: [],
      },
    },
    {
      id: "mesa-uuid-002",
      nombre: "Mesa Territorial El Pozón",
      codigoOficial: "MT-L02-04",
      shortcodeCiudadano: "mt-002",
      estado: "programada",
      fecha: null,
      horario: undefined,
      lugar: "",
      entidad: "",
      facilitador: "",
      totalAsistentes: 0,
      plenaria: { acuerdos: "" },
      submesas: [],
    },
  ];
}

describe("MesasMatrizCatalogoRevogrid — Matriz de Mesas Territoriales", () => {
  describe("Transformación de datos (mesasAFilasMatriz)", () => {
    test("mapea atributos de mesas a filas de matriz bidimensional", () => {
      const mesas = crearMesasMock();
      const filas = mesasAFilasMatriz(mesas);

      expect(filas).toHaveLength(2);
      expect(filas[0]).toEqual({
        id: "mesa-uuid-001",
        codigoOficial: "MT-L01-01",
        nombre: "Mesa Territorial Nelson Mandela",
        estado: "EN CURSO",
        fecha: "2026-10-15",
        horario: "09:00 - 12:00",
        lugarNombre: "Polideportivo Central",
        territorio: "Localidad 1 - Histórica y del Caribe Norte",
        facilitadorNombre: "Dra. Sandra Martínez",
        totalAsistentes: 45,
        dimensionOnu: "Seguridad Personal y Convivencia",
        problemaCentral: "Déficit de alumbrado e inseguridad en corredores escolares",
      });
    });

    test("aplica fallbacks seguros cuando los campos opcionales vienen vacíos", () => {
      const mesas = crearMesasMock();
      const filas = mesasAFilasMatriz(mesas);

      expect(filas[1].estado).toBe("PROGRAMADA");
      expect(filas[1].fecha).toBe("Por definir");
      expect(filas[1].horario).toBe("Por definir");
      expect(filas[1].lugarNombre).toBe("Sede territorial");
      expect(filas[1].territorio).toBe("Distrito de Cartagena");
      expect(filas[1].facilitadorNombre).toBe("Por asignar");
      expect(filas[1].totalAsistentes).toBe(0);
      expect(filas[1].dimensionOnu).toBe("Multidimensional");
      expect(filas[1].problemaCentral).toBe("");
    });

    test("mesasAFilasMatrizMetodologica despliega múltiples problemas, causas, efectos y soluciones por cada mesa", () => {
      const mesas = crearMesasMock();
      mesas[0].arbolProblemas = {
        problemaCentral: "Problema 1: Déficit de alumbrado escolar",
        problemas: [
          {
            id: "prob-2",
            texto: "Problema 2: Microtráfico en entornos deportivos",
            dimensionOnu: "Seguridad Comunitaria y Cohesión Social",
          },
        ],
        causas: [
          {
            id: "c-1",
            texto: "Luminarias dañadas",
            hijos: [],
            metadatos: { problemaId: "principal", criticidad: "alta" },
          },
          {
            id: "c-2",
            texto: "Falta de vigilancia comunitaria",
            hijos: [],
            metadatos: { problemaId: "prob-2", criticidad: "media" },
          },
        ],
        efectos: [
          {
            id: "e-1",
            texto: "Deserción estudiantil nocturna",
            hijos: [],
            metadatos: { problemaId: "principal" },
          },
        ],
      };
      mesas[0].arbolSoluciones = {
        objetivoCentral: "Garantizar entornos escolares seguros",
        medios: [
          {
            id: "m-1",
            texto: "Instalación de luminarias LED solares",
            hijos: [],
            metadatos: { problemaId: "principal" },
          },
          {
            id: "m-2",
            texto: "Frentes de seguridad deportiva barrial",
            hijos: [],
            metadatos: { problemaId: "prob-2" },
          },
        ],
        fines: [
          {
            id: "f-1",
            texto: "Retorno seguro de estudiantes",
            hijos: [],
            metadatos: { problemaId: "principal" },
          },
        ],
      };

      const filasMetodologicas = mesasAFilasMatrizMetodologica(mesas);
      // Mesa 1 tiene 2 problemas (1 fila para P1 y 1 fila para P2) + Mesa 2 tiene 1 fila base = 3 filas
      expect(filasMetodologicas).toHaveLength(3);
      expect(filasMetodologicas[0].problemaNumero).toBe("P1");
      expect(filasMetodologicas[0].problemaCentral).toBe("Problema 1: Déficit de alumbrado escolar");
      expect(filasMetodologicas[0].causaTexto).toBe("Luminarias dañadas");
      expect(filasMetodologicas[0].efectoTexto).toBe("Deserción estudiantil nocturna");
      expect(filasMetodologicas[0].solucionTexto).toBe("Instalación de luminarias LED solares");
      expect(filasMetodologicas[0].finTexto).toBe("Retorno seguro de estudiantes");

      expect(filasMetodologicas[1].problemaNumero).toBe("P2");
      expect(filasMetodologicas[1].problemaCentral).toBe("Problema 2: Microtráfico en entornos deportivos");
      expect(filasMetodologicas[1].causaTexto).toBe("Falta de vigilancia comunitaria");
      expect(filasMetodologicas[1].solucionTexto).toBe("Frentes de seguridad deportiva barrial");
    });
  });

  describe("Nomenclatura y Controles de Vista", () => {
    test("CollectionViewToggle con permitirMatriz renderiza botones minimalistas accesibles con tooltip para Lista, Cuadrícula y Matriz", () => {
      const onValueChange = vi.fn();
      const html = renderToString(
        <CollectionViewToggle
          value="matriz"
          onValueChange={onValueChange}
          label="Vista de las mesas de trabajo"
          permitirMatriz
        />,
      );

      // Debe incluir los 3 botones accesibles con sus atributos de tooltip/title
      expect(html).toContain('title="Vista en lista"');
      expect(html).toContain('title="Vista en cuadrícula"');
      expect(html).toContain('title="Vista en matriz"');

      // Etiquetas accesibles aria-label completas
      expect(html).toContain('aria-label="Vista en lista"');
      expect(html).toContain('aria-label="Vista en cuadrícula"');
      expect(html).toContain('aria-label="Vista en matriz"');

      // La vista 'matriz' NUNCA debe llamarse 'Cuadrícula RevoGrid'
      expect(html).not.toContain("Cuadrícula RevoGrid");
      expect(html).not.toContain("cuadrícula revogrid");
    });

    test("MesasMatrizCatalogoRevogrid renderiza cabecera formal y botones de exportación", () => {
      const mesas = crearMesasMock();
      const onAbrirMesa = vi.fn();
      const html = renderToString(
        <MesasMatrizCatalogoRevogrid mesas={mesas} onAbrirMesa={onAbrirMesa} />,
      );

      expect(html).toContain("Matriz de Mesas Territoriales");
      expect(html).toMatch(/2.*mesas/);
      expect(html).toContain("Copiar TSV");
      expect(html).toContain("Descargar CSV");
      expect(html).toContain("Edición Directa Activa");
      expect(html).toContain("Buscar en la matriz");
      expect(html).toContain("data-testid=\"barra-desarrollo-problemas-matriz\"");
      expect(html).toContain("title=\"Agregar un nuevo problema a la mesa seleccionada\"");
      expect(html).toContain("title=\"Agregar una nueva causa al problema seleccionado\"");
      expect(html).toContain("title=\"Agregar un nuevo efecto al problema seleccionado\"");
      expect(html).toContain("title=\"Agregar una nueva solución propuesta al problema seleccionado\"");
      expect(html).toContain("title=\"Agregar un nuevo resultado o fin esperado\"");
      expect(html).toContain("Cadena Completa");
      expect(html).not.toContain("Cuadrícula RevoGrid");
    });

    test("MesasMatrizCatalogoRevogrid en modo readOnly muestra indicador de Solo Lectura", () => {
      const mesas = crearMesasMock();
      const onAbrirMesa = vi.fn();
      const html = renderToString(
        <MesasMatrizCatalogoRevogrid mesas={mesas} onAbrirMesa={onAbrirMesa} readOnly={true} />,
      );

      expect(html).toContain("Solo Lectura");
      expect(html).not.toContain("Edición Directa Activa");
    });
  });
});
