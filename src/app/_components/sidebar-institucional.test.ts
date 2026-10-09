/**
 * POLIS — Suite de Pruebas Unitarias de Navegación Institucional (GAP-FIX-03)
 * Verificación forense:
 * 1. Erradicación total de botones inertes con toast.info (GAP-03).
 * 2. Resolución dinámica de mesas y submesas en papelógrafo MGA (GAP-10).
 * 3. Apertura de paneles operacionales reales (analítica, actas, costeo, rendición).
 * 4. Navegación a rutas administrativas (/plataforma/*).
 * 5. Mapeo íntegro de permisos institucionales por módulo.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import {
  construirModulosInstitucionales,
  PERMISOS_MODULO,
  type ModuloItem,
  type SubModuloItem,
} from "./sidebar-institucional";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import type { MesaDeTrabajo } from "@/features/mesas/models/mesas";
import type { Formulario } from "@/features/formularios/models/formulario";

describe("Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03)", () => {
  const navigateToMock = vi.fn();
  const navigateToPlataformaMock = vi.fn();
  const openPanelMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "info").mockImplementation(() => "" as unknown as string | number);
    vi.spyOn(toast, "error").mockImplementation(() => "" as unknown as string | number);
    vi.spyOn(toast, "success").mockImplementation(() => "" as unknown as string | number);

    // Estado inicial limpio
    useMesasStore.setState({ mesas: [] });
    useFormulariosStore.setState({ formularios: [] });
  });

  const obtenerModulos = () =>
    construirModulosInstitucionales({
      navigateTo: navigateToMock,
      navigateToPlataforma: navigateToPlataformaMock,
      openPanel: openPanelMock,
    });

  const buscarSubmodulo = (modulos: ModuloItem[], subId: string): SubModuloItem | undefined => {
    for (const m of modulos) {
      if (m.submodulos) {
        const sub = m.submodulos.find((s) => s.id === subId);
        if (sub) return sub;
      }
    }
    return undefined;
  };

  const buscarModulo = (modulos: ModuloItem[], modId: string): ModuloItem | undefined => {
    return modulos.find((m) => m.id === modId);
  };

  describe("1. Erradicación Absoluta de Botones Inertes con toast.info (GAP-03)", () => {
    test("ningún módulo principal invoca toast.info al ser accionado", () => {
      const modulos = obtenerModulos();
      for (const m of modulos) {
        if (m.onClick) {
          m.onClick();
        }
      }
      expect(toast.info).not.toHaveBeenCalled();
    });

    test("ningún submódulo invoca toast.info al ser accionado", () => {
      const modulos = obtenerModulos();
      for (const m of modulos) {
        if (m.submodulos) {
          for (const sub of m.submodulos) {
            sub.onClick();
          }
        }
      }
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe("2. Analítica y Métricas de Formularios (forms_analitica — GAP-03)", () => {
    test("despliega panel 'formulario-analitica' con ID real si existen formularios", () => {
      const mockForm: Formulario = {
        id: "form-cartagena-001",
        titulo: "Encuesta de Seguridad Ciudadana",
        descripcion: "Diagnóstico participativo",
        estado: "activo",
        secciones: [],
        preguntas: [],
        configuracion: {
          slug: "encuesta-seguridad",
          urlPublica: "/f/form-cartagena-001",
          mensajeConfirmacion: "Gracias por participar",
          permitirEdicion: false,
          requiereAutenticacion: false,
          mostrarBarraProgreso: false,
          ordenAleatorio: false,
        },
        respuestasCount: 0,
        creadoEn: "2026-03-01T00:00:00Z",
        actualizadoEn: "2026-03-01T00:00:00Z",
      };
      useFormulariosStore.setState({ formularios: [mockForm] });

      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "forms_analitica");
      expect(sub).toBeDefined();

      sub!.onClick();

      expect(openPanelMock).toHaveBeenCalledTimes(1);
      expect(openPanelMock).toHaveBeenCalledWith("formulario-analitica", {
        formularioId: "form-cartagena-001",
      });
      expect(toast.info).not.toHaveBeenCalled();
    });

    test("despliega selector 'formularios' si la lista está vacía", () => {
      useFormulariosStore.setState({ formularios: [] });

      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "forms_analitica");
      expect(sub).toBeDefined();

      sub!.onClick();

      expect(openPanelMock).toHaveBeenCalledTimes(1);
      expect(openPanelMock).toHaveBeenCalledWith("formularios", {});
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe("3. Resolución Dinámica de Mesas en Papelógrafo MGA (mesas_papelografo — GAP-10)", () => {
    test("resuelve dinámicamente ID de mesa y submesa real sin valores mockeados fijos", () => {
      const mesaDinamica: MesaDeTrabajo = {
        id: "mesa-territorial-olaya-77",
        nombre: "Mesa Sector Olaya Herrera",
        fecha: "2026-03-10",
        lugar: "Claustro La Merced",
        entidad: "Secretaría del Interior",
        facilitador: "Dr. Carlos Mendoza",
        totalAsistentes: 45,
        estado: "en_curso",
        plenaria: { acuerdos: "Acuerdos prioritarios" },
        submesas: [
          {
            id: "submesa-seguridad-comunitaria-99",
            nombre: "Submesa Seguridad y Convivencia",
            tema: "Seguridad",
            participantes: 20,
            arbolProblemas: { problemaCentral: "Inseguridad", causas: [], efectos: [] },
            arbolSoluciones: { objetivoCentral: "Convivencia", medios: [], fines: [] },
          },
        ],
      };
      useMesasStore.setState({ mesas: [mesaDinamica] });

      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "mesas_papelografo");
      expect(sub).toBeDefined();

      sub!.onClick();

      expect(navigateToMock).toHaveBeenCalledWith("mesas");
      expect(openPanelMock).toHaveBeenCalledWith("papelografo", {
        mesaId: "mesa-territorial-olaya-77",
        submesaId: "submesa-seguridad-comunitaria-99",
        arbol: "problemas",
      });
      // Verificación estricta anti-mock
      expect(openPanelMock).not.toHaveBeenCalledWith("papelografo", expect.objectContaining({
        mesaId: "mesa-001",
      }));
    });

    test("abre panel 'mesa' si la mesa no cuenta aún con submesas configuradas", () => {
      const mesaSinSub: MesaDeTrabajo = {
        id: "mesa-sin-sub-05",
        nombre: "Mesa Preliminar",
        fecha: "2026-03-12",
        lugar: "Alcaldía Local",
        entidad: "Distrito",
        facilitador: "Facilitador",
        totalAsistentes: 10,
        estado: "programada",
        plenaria: { acuerdos: "" },
        submesas: [],
      };
      useMesasStore.setState({ mesas: [mesaSinSub] });

      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "mesas_papelografo");
      expect(sub).toBeDefined();

      sub!.onClick();

      expect(navigateToMock).toHaveBeenCalledWith("mesas");
      expect(openPanelMock).toHaveBeenCalledWith("mesa", {
        mesaId: "mesa-sin-sub-05",
      });
    });
  });

  describe("4. Actas Inmutables C-150 (mesas_actas — GAP-03)", () => {
    test("abre 'mesa-acta' con mesa que tenga sha256Acta pericial registrado", () => {
      const mesaConActa: MesaDeTrabajo = {
        id: "mesa-acta-cerrada-12",
        nombre: "Mesa Cabildo Histórico",
        fecha: "2026-02-28",
        lugar: "Centro de Convenciones",
        entidad: "Distrito",
        facilitador: "Facilitador Oficial",
        totalAsistentes: 80,
        estado: "cerrada",
        sha256Acta: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        plenaria: { acuerdos: "Acuerdos suscritos" },
        submesas: [],
      };
      useMesasStore.setState({ mesas: [mesaConActa] });

      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "mesas_actas");
      expect(sub).toBeDefined();

      sub!.onClick();

      expect(openPanelMock).toHaveBeenCalledWith("mesa-acta", {
        mesaId: "mesa-acta-cerrada-12",
      });
      expect(toast.info).not.toHaveBeenCalled();
    });

    test("redirige a 'mesas' si no hay mesas en el sistema", () => {
      useMesasStore.setState({ mesas: [] });

      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "mesas_actas");
      expect(sub).toBeDefined();

      sub!.onClick();

      expect(navigateToMock).toHaveBeenCalledWith("mesas");
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe("5. Presupuesto FONSET y Cadena MGA (presupuesto — GAP-03)", () => {
    test("abre 'asignacion-presupuestal' operativamente en lugar de toast inerte", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "presupuesto");
      expect(mod).toBeDefined();

      mod!.onClick!();

      expect(openPanelMock).toHaveBeenCalledWith("asignacion-presupuestal", {});
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe("6. Indicadores DNP SINERGIA (indicadores — GAP-03)", () => {
    test("abre 'rendicion-cuentas' operativamente en lugar de toast inerte", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "indicadores");
      expect(mod).toBeDefined();

      mod!.onClick!();

      expect(openPanelMock).toHaveBeenCalledWith("rendicion-cuentas", {});
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe("7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03)", () => {
    test("navega a /plataforma/usuarios", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "usuarios");
      expect(mod).toBeDefined();

      mod!.onClick!();
      expect(navigateToPlataformaMock).toHaveBeenCalledWith("usuarios");
    });

    test("navega a /plataforma/diagnostico", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "diagnostico");
      expect(mod).toBeDefined();

      mod!.onClick!();
      expect(navigateToPlataformaMock).toHaveBeenCalledWith("diagnostico");
    });

    test("navega a /plataforma/fuentes", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "fuentes");
      expect(mod).toBeDefined();

      mod!.onClick!();
      expect(navigateToPlataformaMock).toHaveBeenCalledWith("fuentes");
    });

    test("navega a /plataforma/actores", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "actores");
      expect(mod).toBeDefined();

      mod!.onClick!();
      expect(navigateToPlataformaMock).toHaveBeenCalledWith("actores");
    });

    test("navega a /plataforma raíz", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "plataforma");
      expect(mod).toBeDefined();

      mod!.onClick!();
      expect(navigateToPlataformaMock).toHaveBeenCalledWith();
    });
  });

  describe("8. Apertura de Paneles Operativos Especializados", () => {
    test("politicas_fases abre 'fases-control'", () => {
      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "politicas_fases");
      expect(sub).toBeDefined();
      sub!.onClick();
      expect(openPanelMock).toHaveBeenCalledWith("fases-control", {});
    });

    test("forms_creados abre 'formularios'", () => {
      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "forms_creados");
      expect(sub).toBeDefined();
      sub!.onClick();
      expect(openPanelMock).toHaveBeenCalledWith("formularios", {});
    });

    test("forms_builder abre 'formulario-editor'", () => {
      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "forms_builder");
      expect(sub).toBeDefined();
      sub!.onClick();
      expect(openPanelMock).toHaveBeenCalledWith("formulario-editor", {});
    });

    test("asistencia_consolidado abre 'participacion-multicanal'", () => {
      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "asistencia_consolidado");
      expect(sub).toBeDefined();
      sub!.onClick();
      expect(openPanelMock).toHaveBeenCalledWith("participacion-multicanal", { canalInicial: "consolidado" });
    });

    test("testimonios_curaduria abre 'testimonios-moderacion'", () => {
      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "testimonios_curaduria");
      expect(sub).toBeDefined();
      sub!.onClick();
      expect(openPanelMock).toHaveBeenCalledWith("testimonios-moderacion", {});
    });

    test("testimonios_nuevo abre 'testimonio-editor'", () => {
      const modulos = obtenerModulos();
      const sub = buscarSubmodulo(modulos, "testimonios_nuevo");
      expect(sub).toBeDefined();
      sub!.onClick();
      expect(openPanelMock).toHaveBeenCalledWith("testimonio-editor", {});
    });

    test("auditoria abre 'auditoria-consola'", () => {
      const modulos = obtenerModulos();
      const mod = buscarModulo(modulos, "auditoria");
      expect(mod).toBeDefined();
      mod!.onClick!();
      expect(openPanelMock).toHaveBeenCalledWith("auditoria-consola", {});
    });
  });

  describe("9. Integridad y Cobertura de Permisos Institucionales", () => {
    test("todos los módulos tienen permisos formalizados en PERMISOS_MODULO", () => {
      const modulos = obtenerModulos();
      for (const m of modulos) {
        expect(PERMISOS_MODULO[m.id]).toBeDefined();
        expect(Array.isArray(PERMISOS_MODULO[m.id])).toBe(true);
        expect(PERMISOS_MODULO[m.id].length).toBeGreaterThan(0);
      }
    });
  });
});
