"use client";

import { useEffect, useRef } from "react";
import { usePanelStore } from "@/core/panels/panel-store";
import { useNavigationStore } from "@/core/navigation/navigation-store";

/**
 * Deep-linking público del panel de detalle de mesa (TCA-06).
 *
 * Contrato de URL: `?mesa=<id>` abre la vista «Mesas de Trabajo» y restaura
 * el panel de la mesa; al cerrar el panel, el parámetro se limpia. La URL se
 * actualiza con `history.replaceState` (sin recargar ni duplicar entradas) y
 * el estado se restaura una sola vez por carga de página — el guardado es a
 * nivel de módulo y no por montaje del componente, para que remontajes del
 * ensamblaje (historias, navegación client-side) no reabran el panel.
 *
 * Nota de verificación: la suite de historias de Storybook no puede simular
 * una recarga real (el replaceState de prueba desincroniza el runtime), por
 * lo que la restauración se revisa por código y la no-regresión queda cubierta
 * por las historias de plataforma al no reabrir paneles en remontajes.
 */

const PARAM_MESA = "mesa";

let restauracionEjecutadaPagina = false;

function urlConMesa(mesaId: string): string {
  const params = new URLSearchParams(window.location.search);
  params.set(PARAM_MESA, mesaId);
  return `${window.location.pathname}?${params.toString()}`;
}

function urlSinMesa(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete(PARAM_MESA);
  const restante = params.toString();
  return restante
    ? `${window.location.pathname}?${restante}`
    : window.location.pathname;
}

export function DeepLinkPanelesPublicos() {
  /* Evita reemplazar la URL en el momento inicial ya restaurado. */
  const restaurado = useRef(restauracionEjecutadaPagina);

  /* 1. Restauración al primer montaje de la página: ?mesa=<id> → vista mesas
        y panel de la mesa. Los remontajes posteriores no repiten la acción. */
  useEffect(() => {
    if (restauracionEjecutadaPagina) return;
    restauracionEjecutadaPagina = true;
    const params = new URLSearchParams(window.location.search);
    const mesaId = params.get(PARAM_MESA);
    if (!mesaId) return;
    const { setVista, vista } = useNavigationStore.getState();
    if (vista !== "mesas") setVista("mesas");
    usePanelStore.getState().openPanel("mesa", { mesaId });
    restaurado.current = true;
  }, []);

  /* 2. Sincronía continua: el panel superior de tipo mesa aparece en la URL
        y su cierre la limpia; los demás paneles no alteran el parámetro. */
  useEffect(() => {
    const desuscribir = usePanelStore.subscribe((state) => {
      const superior = state.entries[state.entries.length - 1];
      const mesaId =
        superior && superior.type === "mesa"
          ? String((superior.props as { mesaId: string }).mesaId)
          : null;
      const urlDeseada = mesaId ? urlConMesa(mesaId) : urlSinMesa();
      const urlActual = `${window.location.pathname}${window.location.search}`;
      if (urlDeseada !== urlActual) {
        window.history.replaceState(null, "", urlDeseada);
      }
    });
    return desuscribir;
  }, []);

  return null;
}
