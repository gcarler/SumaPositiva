import { beforeEach, describe, expect, it } from "vitest";
import { usePanelStore } from "./panel-store";

describe("pila genérica de paneles", () => {
  beforeEach(() => usePanelStore.getState().closeAll());

  it("conserva la relación tipo-props, maximiza y cierra por clave", () => {
    const store = usePanelStore.getState();
    store.openPanel("politica", { politicaId: "politica-1" });
    const parent = usePanelStore.getState().entries[0]!;
    store.openPanel("fase", { politicaId: "politica-1", faseId: "fase-1" });
    const child = usePanelStore.getState().entries[1]!;

    usePanelStore.getState().toggleMaximized(child.key);
    expect(usePanelStore.getState().entries[1]?.maximized).toBe(true);
    usePanelStore.getState().closeToKey(parent.key);
    expect(usePanelStore.getState().entries.map((entry) => entry.key)).toEqual([
      parent.key,
    ]);
    expect(parent).toMatchObject({
      type: "politica",
      props: { politicaId: "politica-1" },
    });
  });

  it("mantiene un máximo de cinco paneles y cierra la pila completa", () => {
    for (let index = 0; index < 7; index += 1) {
      usePanelStore.getState().openPanel("testimonio-nuevo", {});
    }

    expect(usePanelStore.getState().entries).toHaveLength(5);
    usePanelStore.getState().closeAll();
    expect(usePanelStore.getState().entries).toEqual([]);
  });
});
