import { afterEach, describe, expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { CompromisoEditorPanel } from "./compromiso-editor-panel";
import { useCompromisosStore } from "../state/compromisos-store";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

const anterior = useCompromisosStore.getState();
afterEach(() => useCompromisosStore.setState(anterior));

describe("Compromisos: lista real y apertura con identificador obsoleto", () => {
  test("el estado inicial espera la API sin presentar compromisos provisionales", () => {
    expect(useCompromisosStore.getInitialState().compromisos).toEqual([]);
    expect(useCompromisosStore.getInitialState().cargando).toBe(true);
  });

  test("un ID que salió de la lista no se convierte en creación de compromiso", () => {
    useCompromisosStore.setState({ compromisos: [], cargando: false });
    const html = renderToString(<CompromisoEditorPanel entryKey="regresion-303" props={{ compromisoId: "id-obsoleto", modo: "editar" }} />);
    expect(html).toContain("Compromiso no disponible");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Nuevo Compromiso Institucional");
    expect(html).not.toContain("Actualizar Avance");
  });

  test("un ID existente conserva su ficha en modo edición", () => {
    const compromiso = COMPROMISOS_PAS_CANONICOS[0];
    useCompromisosStore.setState({ compromisos: [compromiso], cargando: false });
    const html = renderToString(<CompromisoEditorPanel entryKey="regresion-303" props={{ compromisoId: compromiso.id, modo: "editar" }} />);
    expect(html).toContain(`Compromiso ${compromiso.codigo}`);
    expect(html).toContain("Valor Acumulado Medido");
    expect(html).not.toContain("Nuevo Compromiso Institucional");
  });
});
