import { describe, test, expect, beforeEach } from "vitest";
import {
  useGeovisorLayoutStore,
  DEFAULT_DOCK_TABS,
  sanitizeDockTabs,
  findViewDock,
} from "./geovisor-layout-store";

const s = () => useGeovisorLayoutStore.getState();

describe("GeovisorLayoutStore — vistas con pestañas por panel", () => {
  beforeEach(() => s().resetLayout());

  test("distribuye las 8 vistas por defecto en los 4 paneles", () => {
    expect(s().tabs).toEqual(DEFAULT_DOCK_TABS);
    expect(s().activeTab.left).toBe("capas");
    expect(s().activeTab.bottom).toBe("hurtos");
    expect(s().expandedDock).toBeNull();
  });

  test("moveView mueve una vista a otro panel, la activa y abre el destino", () => {
    s().moveView("graficos", "right");
    expect(s().tabs.bottom).toEqual(["hurtos", "datagrid"]);
    expect(s().tabs.right).toEqual(["ficha", "territorio", "graficos"]);
    expect(s().activeTab.right).toBe("graficos");
    expect(s().rightOpen).toBe(true);
  });

  test("moveView reordena dentro del mismo panel", () => {
    s().moveView("mesas", "left", 0);
    expect(s().tabs.left).toEqual(["mesas", "capas"]);
  });

  test("mover la última vista de un panel lo deja vacío y lo oculta", () => {
    s().moveView("filtros", "left");
    expect(s().tabs.top).toEqual([]);
    expect(s().topOpen).toBe(false);
    expect(s().activeTab.top).toBeNull();
  });

  test("closeView quita la vista y openView la restaura en su panel original", () => {
    s().closeView("territorio");
    expect(findViewDock(s().tabs, "territorio")).toBeNull();
    expect(s().tabs.right).toEqual(["ficha"]);

    s().openView("territorio");
    expect(s().tabs.right).toEqual(["ficha", "territorio"]);
    expect(s().activeTab.right).toBe("territorio");
  });

  test("openView activa la vista donde esté acoplada y abre ese panel", () => {
    expect(s().rightOpen).toBe(false);
    s().openView("ficha");
    expect(s().rightOpen).toBe(true);
    expect(s().activeTab.right).toBe("ficha");
  });

  test("cerrar la pestaña activa selecciona una vecina", () => {
    s().setActiveView("bottom", "graficos");
    s().closeView("graficos");
    expect(s().activeTab.bottom).toBe("datagrid");
  });

  test("toggleDockExpanded alterna el panel expandido", () => {
    s().toggleDockExpanded("bottom");
    expect(s().expandedDock).toBe("bottom");
    expect(s().bottomOpen).toBe(true);
    s().toggleDockExpanded("bottom");
    expect(s().expandedDock).toBeNull();
  });

  test("sanitizeDockTabs descarta ids desconocidos y duplicados", () => {
    const clean = sanitizeDockTabs({
      top: ["filtros", "inventada"],
      left: ["filtros", "capas"],
      right: "no-array",
    });
    expect(clean.top).toEqual(["filtros"]);
    expect(clean.left).toEqual(["capas"]);
    expect(clean.right).toEqual([]);
  });

  test("resetLayout restaura las pestañas por defecto", () => {
    s().moveView("datagrid", "top");
    s().resetLayout();
    expect(s().tabs).toEqual(DEFAULT_DOCK_TABS);
  });
});
