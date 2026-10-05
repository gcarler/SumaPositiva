"use client";

import { useState, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Filter,
  Plus,
  LayoutGrid,
  TableProperties,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { ActoresKpis } from "@/features/actores/components/actores-kpis";
import { ActoresMatriz } from "@/features/actores/components/actores-matriz";
import { ActoresDataGrid } from "@/features/actores/components/actores-datagrid";
import { useActoresStore } from "@/features/actores/state/actores-store";
import type {
  CuadranteMatriz,
  PosturaActor,
  TerritorioActor,
  TipoActor,
} from "@/features/actores/models/actor";

export function ActoresView() {
  const [modoVista, setModoVista] = useState<"matriz" | "datagrid">("matriz");
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const editable = puedeEditar(sesion, "actores");

  const cargarActores = useActoresStore((s) => s.cargarActores);
  const filtros = useActoresStore((s) => s.filtros);
  const setFiltros = useActoresStore((s) => s.setFiltros);
  const limpiarFiltros = useActoresStore((s) => s.limpiarFiltros);

  useEffect(() => {
    cargarActores();
  }, [cargarActores]);

  const hayFiltrosActivos =
    filtros.busqueda !== "" ||
    filtros.tipo !== "todos" ||
    filtros.territorio !== "todos" ||
    filtros.postura !== "todos" ||
    filtros.cuadrante !== "todos" ||
    filtros.dimension !== "todas";

  return (
    <div className="space-y-6">
      {/* Cabecera institucional */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Gobernanza participativa · Decreto 037/26"
          title="Mapeo y Caracterización de Actores"
          description="Identificación, caracterización estratégica y matriz relacional (Poder vs. Interés) de actores territoriales, gremiales, comunitarios e institucionales de Cartagena."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Conmutador de modo de vista */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
            <Button
              variant={modoVista === "matriz" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setModoVista("matriz")}
              className="h-8 gap-1.5 text-xs"
              aria-pressed={modoVista === "matriz"}
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
              <span>Matriz 2x2</span>
            </Button>
            <Button
              variant={modoVista === "datagrid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setModoVista("datagrid")}
              className="h-8 gap-1.5 text-xs"
              aria-pressed={modoVista === "datagrid"}
            >
              <TableProperties className="size-3.5" aria-hidden="true" />
              <span>Directorio</span>
            </Button>
          </div>

          {/* Botón de creación con Zero-Modals */}
          {editable && (
            <Button
              size="sm"
              className="gap-2 bg-ember text-text-inverse hover:bg-ember-hover"
              onClick={() => openPanel("actor-editor", {})}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Nuevo Actor</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de resumen */}
      <ActoresKpis />

      {/* Barra de Filtros y Búsqueda */}
      <div className="space-y-3 rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Filter className="size-3.5 text-ember" aria-hidden="true" />
            <span>Filtros y Búsqueda de Actores Estratégicos</span>
          </div>
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-7 text-xs text-text-secondary hover:text-text-primary gap-1.5"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Búsqueda por texto libre */}
          <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-2">
            <Search
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Buscar por nombre, sigla, líder, barrio..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ busqueda: e.target.value })}
              className="pl-8 text-xs"
            />
          </div>

          {/* Filtro por Tipo de Actor */}
          <div>
            <Select
              value={filtros.tipo}
              onValueChange={(val) =>
                setFiltros({ tipo: val as TipoActor | "todos" })
              }
            >
              <SelectTrigger className="text-xs" aria-label="Filtrar por tipo de actor">
                <SelectValue placeholder="Tipo de actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="comunitario">Comunitario / Vecinal</SelectItem>
                <SelectItem value="institucional">Institucional / Público</SelectItem>
                <SelectItem value="sociedad_civil">Sociedad Civil / ONG</SelectItem>
                <SelectItem value="gremial_privado">Gremial / Sector Privado</SelectItem>
                <SelectItem value="academia">Academia / Centros</SelectItem>
                <SelectItem value="poblacional_diferencial">Poblacional / Protección Diferencial</SelectItem>
                <SelectItem value="cooperacion_internacional">Cooperación Internacional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Territorio */}
          <div>
            <Select
              value={filtros.territorio}
              onValueChange={(val) =>
                setFiltros({ territorio: val as TerritorioActor | "todos" })
              }
            >
              <SelectTrigger className="text-xs" aria-label="Filtrar por territorio">
                <SelectValue placeholder="Territorio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los territorios</SelectItem>
                <SelectItem value="distrital">Distrital (Todo Cartagena)</SelectItem>
                <SelectItem value="localidad_1">Localidad 1 (Histórica y Caribe Norte)</SelectItem>
                <SelectItem value="localidad_2">Localidad 2 (Virgen y Turística)</SelectItem>
                <SelectItem value="localidad_3">Localidad 3 (Industrial y de la Bahía)</SelectItem>
                <SelectItem value="rural_insular">Zona Corregimental e Insular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Cuadrante Matriz */}
          <div>
            <Select
              value={filtros.cuadrante}
              onValueChange={(val) =>
                setFiltros({ cuadrante: val as CuadranteMatriz | "todos" })
              }
            >
              <SelectTrigger className="text-xs" aria-label="Filtrar por cuadrante matriz">
                <SelectValue placeholder="Cuadrante Matriz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los cuadrantes</SelectItem>
                <SelectItem value="aliados_clave">1. Aliados Clave (P+ / I+)</SelectItem>
                <SelectItem value="incidencia_estrategica">2. Incidencia Estratégica (P+ / I-)</SelectItem>
                <SelectItem value="base_social">3. Base Social (P- / I+)</SelectItem>
                <SelectItem value="monitoreo">4. Monitoreo (P- / I-)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Postura */}
          <div>
            <Select
              value={filtros.postura}
              onValueChange={(val) =>
                setFiltros({ postura: val as PosturaActor | "todos" })
              }
            >
              <SelectTrigger className="text-xs" aria-label="Filtrar por postura">
                <SelectValue placeholder="Postura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las posturas</SelectItem>
                <SelectItem value="promotor_aliado">Promotor / Aliado</SelectItem>
                <SelectItem value="neutral_expectante">Neutral / Expectante</SelectItem>
                <SelectItem value="critico_opositor">Crítico / Opositor</SelectItem>
                <SelectItem value="vulnerable_reclamante">Vulnerable / Reclamante</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Renderizado condicional según modo de visualización */}
      {modoVista === "matriz" ? <ActoresMatriz /> : <ActoresDataGrid />}
    </div>
  );
}
