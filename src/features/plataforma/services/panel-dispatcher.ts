"use client";

import { usePanelStore, type PanelType } from "@/core/panels/panel-store";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useCadenaValorStore } from "@/features/seguimiento/state/cadena-valor-store";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";

/**
 * Despachador seguro de paneles para la plataforma interna.
 * Valida y asigna los props requeridos por cada contrato antes de abrir el panel.
 */
export function abrirPanelSeguro(
  panelId: PanelType,
  props?: Record<string, unknown>
): boolean {
  const { openPanel } = usePanelStore.getState();

  switch (panelId) {
    case "mesa-acta": {
      const mesaId =
        (props?.mesaId as string | undefined) ||
        useMesasStore.getState().mesas[0]?.id;
      if (mesaId) {
        openPanel("mesa-acta", { mesaId });
        return true;
      }
      return false;
    }
    case "papelografo": {
      const mesas = useMesasStore.getState().mesas;
      const mesaConSubmesa = mesas.find((m) => (m.submesas?.length ?? 0) > 0);
      const mesa = mesaConSubmesa ?? mesas[0];
      const submesa = mesa?.submesas?.[0];
      if (mesa && submesa) {
        openPanel("papelografo", {
          mesaId: mesa.id,
          submesaId: submesa.id,
          arbol: "problemas",
        });
        return true;
      }
      if (mesa) {
        openPanel("mesa", { mesaId: mesa.id });
        return true;
      }
      return false;
    }
    case "formulario-analitica": {
      const formularios = useFormulariosStore.getState().formularios;
      const fid =
        (props?.formularioId as string | undefined) ||
        formularios[0]?.id ||
        "encuesta-seguridad-humana-2026";
      openPanel("formulario-analitica", { formularioId: fid });
      return true;
    }
    case "ficha-territorial": {
      const tid = (props?.territorioId as string | undefined) || "terr-loc-1";
      openPanel("ficha-territorial", { territorioId: tid });
      return true;
    }
    case "territorio": {
      const tid = (props?.territorioId as string | undefined) || "loc-1";
      openPanel("territorio", { territorioId: tid });
      return true;
    }
    case "indicador-detalle": {
      const cv = useCadenaValorStore.getState().cadenaValor;
      const primerId =
        cv.resultado?.[0]?.id ??
        cv.producto?.[0]?.id ??
        cv.insumo?.[0]?.id ??
        "ind-res-01";
      const iid = (props?.indicadorId as string | undefined) || primerId;
      openPanel("indicador-detalle", { indicadorId: iid });
      return true;
    }
    case "devolucion-detalle": {
      const pid = (props?.propuestaId as string | undefined) || "prop-001";
      openPanel("devolucion-detalle", { propuestaId: pid });
      return true;
    }
    case "tarea-comunicacion-editor": {
      openPanel("tarea-comunicacion-editor", {
        tarea: null,
        ordenSugerido:
          typeof props?.ordenSugerido === "number" ? props.ordenSugerido : 1,
        onGuardada:
          typeof props?.onGuardada === "function"
            ? (props.onGuardada as () => void)
            : () => {},
      });
      return true;
    }
    case "validacion-mga": {
      const resultadoPorDefecto = {
        evaluacion_id: "eval-mga-sidebar",
        politica_id: "pol-seguridad-humana",
        es_valido: true,
        puntaje_coherencia: 92,
        analisis_sintaxis: [],
        problema_central_optimizado:
          "Baja garantía territorial de las siete libertades de la seguridad humana integral en el Distrito de Cartagena.",
        objetivo_central_derivado:
          "Fortalecer la garantía territorial de las siete libertades de la seguridad humana integral en el Distrito de Cartagena.",
        arbol_problemas_estructurado: {},
        arbol_objetivos_derivado: {},
        recomendaciones_dnp: [
          "Mantener trazabilidad entre causas directas del árbol MGA y productos del Plan de Acción y Seguimiento (PAS).",
        ],
        resumen_ejecutivo:
          "Validación metodológica DNP/MGA activa sobre la arquitectura causal de la Política Pública.",
      };
      openPanel("validacion-mga", {
        resultado:
          (props?.resultado as typeof resultadoPorDefecto | undefined) ??
          resultadoPorDefecto,
        instrumentoNombre:
          (props?.instrumentoNombre as string | undefined) ??
          "Política Pública de Seguridad Humana Integral",
        arbolTipo: "problemas",
      });
      return true;
    }
    default: {
      try {
        const fallbackOpen = openPanel as unknown as (
          id: string,
          p: Record<string, unknown>
        ) => void;
        fallbackOpen(panelId, props ?? {});
        return true;
      } catch {
        return false;
      }
    }
  }
}
