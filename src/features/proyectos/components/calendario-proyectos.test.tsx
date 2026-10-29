import { describe, expect, test } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CalendarioProyectos } from "./calendario-proyectos";
import type { ActividadProyecto } from "../models/actividad-proyecto";

/**
 * Validación del calendario mensual con datos demo de ventanas largas
 * de Comunicaciones: una actividad plurianual debe ocupar la celda de
 * cada día de su rango en el mes visible, aun cuando su fecha de inicio
 * caiga en otro mes (regresión del filtro `diasEnPantalla` eliminado).
 */

function isoDe(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * La celda emite un único `title="Comunicaciones: <título>"` por chip:
 * contar el atributo completo evita contar el texto interno (subcadena).
 */
const CHIP_PLURIANUAL = 'title="Comunicaciones: Plan de barrido nocturno en 8 barrios priorizados"';
const CHIP_ABIERTA = 'title="Comunicaciones: Fotoreportaje sobre el desarme comunitario"';

function actividadPlurianual(): ActividadProyecto {
  const y = new Date().getFullYear();
  return {
    id: "comunicaciones:tc-larga",
    modulo_dueno: "comunicaciones",
    recurso_id: "tc-larga",
    codigo: "TC-2026-0041",
    titulo: "Plan de barrido nocturno en 8 barrios priorizados",
    descripcion: "Cobertura plurianual de la vigencia",
    etapa: "Etapa 3: Despliegue Territorial y Temático",
    territorio: "",
    lugar: null,
    fecha_inicio: `${y - 1}-06-01`,
    fecha_fin: `${y + 1}-02-28`,
    hora_inicio: null,
    hora_fin: null,
    estado_nativo: "pendiente",
    estado_canonico: "en_progreso",
    avance_pct: 37,
    responsable: "Reportero Regional",
    permiso_editar: "comunicaciones:gestionar",
  };
}

/** Actividad con ventana abierta que inicia el último día del mes visible. */
function actividadVentanaAbierta(): ActividadProyecto {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  return {
    id: "comunicaciones:tc-abierta",
    modulo_dueno: "comunicaciones",
    recurso_id: "tc-abierta",
    codigo: "TC-2026-019",
    titulo: "Fotoreportaje sobre el desarme comunitario",
    descripcion: "Entrega digital",
    etapa: "Etapa 2: Historias y voces",
    territorio: "Getsemaní",
    lugar: null,
    fecha_inicio: isoDe(hoy.getFullYear(), hoy.getMonth(), ultimoDia),
    fecha_fin: null,
    hora_inicio: null,
    hora_fin: null,
    estado_nativo: "en_progreso",
    estado_canonico: "en_progreso",
    avance_pct: 0,
    responsable: "Reportero Regional",
    permiso_editar: "comunicaciones:gestionar",
  };
}

/** Agendas cortas el día 10 del mes visible (prueban el corte de chips). */
function agendasCortasDelDiez(cantidad: number): ActividadProyecto[] {
  const hoy = new Date();
  const inicio = isoDe(hoy.getFullYear(), hoy.getMonth(), 10);
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `mesas:ag-corta-${i}`,
    modulo_dueno: "mesas" as const,
    recurso_id: `ag-corta-${i}`,
    codigo: `AG-2026-003${i}`,
    titulo: `Mesa de concertación en el corregimiento ${i + 1}`,
    descripcion: "Sesión única",
    etapa: "Mesa de Trabajo",
    territorio: "Corregimientos",
    lugar: "Cancha del corregimiento",
    fecha_inicio: inicio,
    fecha_fin: inicio,
    hora_inicio: "09:00",
    hora_fin: "12:00",
    estado_nativo: "programada",
    estado_canonico: "programada" as const,
    avance_pct: 0,
    responsable: "Facilitador de Mesa",
    permiso_editar: "mesas:abrir",
  }));
}

describe("Calendario mensual con ventanas largas de Comunicaciones", () => {
  test("la ventana plurianual aparece en la celda de cada día visible del mes", () => {
    const hoy = new Date();
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const demos = [
      ...agendasCortasDelDiez(3),
      actividadPlurianual(),
      actividadVentanaAbierta(),
    ];
    const html = renderToString(
      <CalendarioProyectos actividades={demos} onAbrir={() => undefined} />,
    );

    expect(
      html.split(CHIP_PLURIANUAL).length - 1,
      "la ventana plurianual debe aparecer en todas las celdas excepto las que el corte de 3 chips rellenan las agendas cortas",
    ).toBe(diasMes - 1);
    // Día 10: tres agendas cortas + la ventana plurianual = 4 actividades → +1 más.

    // Encabezado del mes en curso (el componente y la prueba comparten ICU).
    const mesNombre = new Date().toLocaleDateString("es-CO", { month: "long" });
    expect(html).toContain(mesNombre);

    // Día 10: tres agendas cortas + la ventana plurianual = 4 actividades.
    expect(html).toMatch(new RegExp(`aria-label="10/[0-9]+: 4 actividades"`));
    expect(html).toContain("+1 más");

    // Último día del mes: ventana plurianual + abierta = 2 actividades.
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    expect(html).toMatch(new RegExp(`aria-label="${ultimoDia}/[0-9]+: 2 actividades"`));
  });

  test("las ventanas abiertas solo marcan su día de inicio, con corte de 3 + «+N más»", () => {
    const hoy = new Date();
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    // 6 agendas cortas + la ventana plurianual = 7 actividades el día 10.
    const demos = [
      ...agendasCortasDelDiez(6),
      actividadPlurianual(),
      actividadVentanaAbierta(),
    ];
    const html = renderToString(
      <CalendarioProyectos actividades={demos} onAbrir={() => undefined} />,
    );

    // La ventana abierta marca una sola celda (la de su inicio).
    expect(html.split(CHIP_ABIERTA).length - 1).toBe(1);
    // La plurianual cubre todo el mes salvo el día 10, que el corte de chips
    // rellena con las seis agendas cortas (3 visibles + «+4 más»).
    expect(html.split(CHIP_PLURIANUAL).length - 1).toBe(diasMes - 1);
    expect(html).toContain("+4 más");
  });
});
