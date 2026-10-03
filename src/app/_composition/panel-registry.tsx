"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PanelType, PanelPropsMap } from "@/core/panels/panel-store";

/**
 * Registry tipado de paneles — mapa PanelType → Componente.
 * Carga diferida para mantener el bundle inicial ligero.
 */

export interface PanelComponentProps<K extends PanelType = PanelType> {
  entryKey: string;
  props: PanelPropsMap[K];
}

const PoliticaPanel = dynamic(
  () => import("@/features/politicas/panels/politica-panel").then((m) => m.PoliticaPanel),
  { ssr: false }
);
const FasePanel = dynamic(
  () => import("@/features/politicas/panels/fase-panel").then((m) => m.FasePanel),
  { ssr: false }
);
const LineaEditorPanel = dynamic(() => import("@/features/politicas/panels/linea-editor-panel").then(m => m.LineaEditorPanel));
const LineaPanel = dynamic(
  () => import("@/features/politicas/panels/linea-panel").then((m) => m.LineaPanel),
  { ssr: false }
);
const AporteEditorPanel = dynamic(
  () => import("@/features/aportes/panels/aporte-editor-panel").then((m) => m.AporteEditorPanel),
  { ssr: false }
);
const SesionPanel = dynamic(
  () => import("@/features/sesion/panels/sesion-panel").then((m) => m.SesionPanel),
  { ssr: false }
);
const UsuariosPanel = dynamic(
  () => import("@/features/sesion/panels/usuarios-panel").then((m) => m.UsuariosPanel),
  { ssr: false }
);
const UsuarioInvitarPanel = dynamic(
  () => import("@/features/usuarios/panels/usuario-editor-panel").then((m) => m.UsuarioEditorPanel),
  { ssr: false }
);
const UsuarioDetallePanel = dynamic(
  () => import("@/features/usuarios/panels/usuario-detalle-panel").then((m) => m.UsuarioDetallePanel),
  { ssr: false }
);
const MesaPanel = dynamic(
  () => import("@/features/mesas/panels/mesa-panel").then((m) => m.MesaPanel),
  { ssr: false }
);
const PapelografoPanel = dynamic(
  () => import("@/features/mesas/panels/papelografo-panel").then((m) => m.PapelografoPanel),
  { ssr: false }
);
const MesaEditorPanel = dynamic(
  () => import("@/features/mesas/panels/mesa-editor-panel").then((m) => m.MesaEditorPanel),
  { ssr: false }
);
const MesaActaPanel = dynamic(
  () => import("@/features/mesas/panels/mesa-acta-panel").then((m) => m.MesaActaPanel),
  { ssr: false }
);
const TerritorioPanel = dynamic(
  () => import("@/features/geovisor/panels/territorio-panel").then((m) => m.TerritorioPanel),
  { ssr: false }
);

const FormulariosPanel = dynamic(
  () => import("@/features/formularios/panels/formularios-panel").then((m) => m.FormulariosPanel),
  { ssr: false }
);
const FormularioEditorPanel = dynamic(
  () => import("@/features/formularios/panels/formulario-editor-panel").then((m) => m.FormularioEditorPanel),
  { ssr: false }
);
const FormularioAnaliticaPanel = dynamic(
  () => import("@/features/formularios/panels/formulario-analitica-panel").then((m) => m.FormularioAnaliticaPanel),
  { ssr: false }
);

const FormularioPreviewPanel = dynamic(() => import("@/features/formularios/panels/formulario-preview-panel").then(m => m.FormularioPreviewPanel), {ssr: false});
const FormularioRespuestaPanel = dynamic(() => import("@/features/formularios/panels/formulario-respuesta-panel").then(m => m.FormularioRespuestaPanel), {ssr: false});

const ParticipacionMulticanalPanel = dynamic(
  () => import("@/features/participacion/panels/participacion-multicanal-panel").then((m) => m.ParticipacionMulticanalPanel),
  { ssr: false }
);
const EscenarioEditorPanel = dynamic(
  () => import("@/features/participacion/panels/escenario-editor-panel").then((m) => m.EscenarioEditorPanel),
  { ssr: false }
);

const TestimoniosGaleriaPanel = dynamic(
  () => import("@/features/testimonios/panels/testimonios-galeria-panel").then((m) => m.TestimoniosGaleriaPanel),
  { ssr: false }
);
const TestimonioEditorPanel = dynamic(
  () => import("@/features/testimonios/panels/testimonio-editor-panel").then((m) => m.TestimonioEditorPanel),
  { ssr: false }
);
const TestimoniosModeracionPanel = dynamic(
  () => import("@/features/testimonios/panels/testimonios-moderacion-panel").then((m) => m.TestimoniosModeracionPanel),
  { ssr: false }
);

const FasesControlPanel = dynamic(
  () => import("@/features/politicas/panels/fases-control-panel").then((m) => m.FasesControlPanel),
  { ssr: false }
);
const AuditoriaConsolaPanel = dynamic(
  () => import("@/features/auditoria/panels/auditoria-consola-panel").then((m) => m.AuditoriaConsolaPanel),
  { ssr: false }
);

const NoticiaPanel = dynamic(
  () => import("@/features/noticias/panels/noticia-panel").then((m) => m.NoticiaPanel),
  { ssr: false }
);
const NoticiaEditorPanel = dynamic(
  () => import("@/features/noticias/panels/noticia-editor-panel").then((m) => m.NoticiaEditorPanel),
  { ssr: false }
);
const TestimonioNuevoPanel = dynamic(
  () => import("@/features/testimonios/panels/testimonio-nuevo-panel").then((m) => m.TestimonioNuevoPanel),
  { ssr: false }
);
const RendicionCuentasPanel = dynamic(
  () => import("@/features/politicas/panels/rendicion-cuentas-panel").then((m) => m.RendicionCuentasPanel),
  { ssr: false }
);
const FuenteEditorPanel = dynamic(
  () => import("@/features/fuentes/panels/fuente-editor-panel").then((m) => m.FuenteEditorPanel),
  { ssr: false }
);
const ActorEditorPanel = dynamic(
  () => import("@/features/actores/panels/actor-editor-panel").then((m) => m.ActorEditorPanel),
  { ssr: false }
);
const MedicionEditorPanel = dynamic(
  () => import("@/features/diagnostico/panels/medicion-editor-panel").then((m) => m.MedicionEditorPanel),
  { ssr: false }
);
const ValidacionMgaPanel = dynamic(
  () => import("@/features/diagnostico/panels/validacion-mga-panel").then((m) => m.ValidacionMgaPanel),
  { ssr: false }
);
const FichaTerritorialPanel = dynamic(
  () => import("@/features/diagnostico/panels/ficha-territorial-panel").then((m) => m.FichaTerritorialPanel),
  { ssr: false }
);
const AlternativaEditorPanel = dynamic(
  () => import("@/features/alternativas/panels/alternativa-editor-panel").then((m) => m.AlternativaEditorPanel),
  { ssr: false }
);
const EvaluacionViabilidadPanel = dynamic(
  () => import("@/features/alternativas/panels/evaluacion-viabilidad-panel").then((m) => m.EvaluacionViabilidadPanel),
  { ssr: false }
);
const AsignacionPresupuestalPanel = dynamic(
  () => import("@/features/alternativas/panels/asignacion-presupuestal-panel").then((m) => m.AsignacionPresupuestalPanel),
  { ssr: false }
);
const CompromisoEditorPanel = dynamic(
  () => import("@/features/seguimiento/panels/compromiso-editor-panel").then((m) => m.CompromisoEditorPanel),
  { ssr: false }
);
const IndicadorDetallePanel = dynamic(
  () => import("@/features/seguimiento/panels/indicador-detalle-panel").then((m) => m.IndicadorDetallePanel),
  { ssr: false }
);
const DevolucionDetallePanel = dynamic(
  () => import("@/features/seguimiento/panels/devolucion-detalle-panel").then((m) => m.DevolucionDetallePanel),
  { ssr: false }
);

export const PANEL_REGISTRY: Record<
  PanelType,
  ComponentType<PanelComponentProps>
> = {
  politica: PoliticaPanel as ComponentType<PanelComponentProps>,
  fase: FasePanel as ComponentType<PanelComponentProps>,
  "linea-editor": LineaEditorPanel as ComponentType<PanelComponentProps>,
  linea: LineaPanel as ComponentType<PanelComponentProps>,
  aporte: AporteEditorPanel as ComponentType<PanelComponentProps>,
  sesion: SesionPanel as ComponentType<PanelComponentProps>,
  usuarios: UsuariosPanel as ComponentType<PanelComponentProps>,
  "usuario-invitar": ((props: PanelComponentProps) => <UsuarioInvitarPanel {...props} mode="invite" />) as ComponentType<PanelComponentProps>,
  "usuario-editor": ((props: PanelComponentProps) => <UsuarioInvitarPanel {...props} mode="edit" />) as ComponentType<PanelComponentProps>,
  "usuario-detalle": UsuarioDetallePanel as ComponentType<PanelComponentProps>,
  mesa: MesaPanel as ComponentType<PanelComponentProps>,
  papelografo: PapelografoPanel as ComponentType<PanelComponentProps>,
  "mesa-editor": MesaEditorPanel as ComponentType<PanelComponentProps>,
  territorio: TerritorioPanel as ComponentType<PanelComponentProps>,
  formularios: FormulariosPanel as ComponentType<PanelComponentProps>,
  "formulario-editor": FormularioEditorPanel as ComponentType<PanelComponentProps>,
  "formulario-analitica": FormularioAnaliticaPanel as ComponentType<PanelComponentProps>,
  "formulario-preview": FormularioPreviewPanel as ComponentType<PanelComponentProps>,
  "formulario-respuesta": FormularioRespuestaPanel as ComponentType<PanelComponentProps>,
  "participacion-multicanal": ParticipacionMulticanalPanel as ComponentType<PanelComponentProps>,
  "escenario-editor": EscenarioEditorPanel as ComponentType<PanelComponentProps>,
  "testimonios-galeria": TestimoniosGaleriaPanel as ComponentType<PanelComponentProps>,
  "testimonio-editor": TestimonioEditorPanel as ComponentType<PanelComponentProps>,
  "testimonios-moderacion": TestimoniosModeracionPanel as ComponentType<PanelComponentProps>,
  "fases-control": FasesControlPanel as ComponentType<PanelComponentProps>,
  "auditoria-consola": AuditoriaConsolaPanel as ComponentType<PanelComponentProps>,
  noticia: NoticiaPanel as ComponentType<PanelComponentProps>,
  "noticia-editor": NoticiaEditorPanel as ComponentType<PanelComponentProps>,
  "testimonio-nuevo": TestimonioNuevoPanel as ComponentType<PanelComponentProps>,
  "mesa-acta": MesaActaPanel as ComponentType<PanelComponentProps>,
  "rendicion-cuentas": RendicionCuentasPanel as ComponentType<PanelComponentProps>,
  "fuente-editor": FuenteEditorPanel as ComponentType<PanelComponentProps>,
  "actor-editor": ActorEditorPanel as ComponentType<PanelComponentProps>,
  "medicion-editor": MedicionEditorPanel as ComponentType<PanelComponentProps>,
  "validacion-mga": ValidacionMgaPanel as ComponentType<PanelComponentProps>,
  "ficha-territorial": FichaTerritorialPanel as ComponentType<PanelComponentProps>,
  "alternativa-editor": AlternativaEditorPanel as ComponentType<PanelComponentProps>,
  "evaluacion-viabilidad": EvaluacionViabilidadPanel as ComponentType<PanelComponentProps>,
  "asignacion-presupuestal": AsignacionPresupuestalPanel as ComponentType<PanelComponentProps>,
  "compromiso-editor": CompromisoEditorPanel as ComponentType<PanelComponentProps>,
  "indicador-detalle": IndicadorDetallePanel as ComponentType<PanelComponentProps>,
  "devolucion-detalle": DevolucionDetallePanel as ComponentType<PanelComponentProps>,
};

/**
 * Ancho del panel por tipo — fluido y adaptativo a cualquier resolución:
 *   · Base: el ancho histórico (no cambia el look en portátiles 1280–1440).
 *   · Ideal: % del viewport → crece proporcionalmente en pantallas grandes.
 *   · Tope: límite de legibilidad en 4K / ultrawide.
 *   · min(..., 100vw): en móvil el panel siempre ocupa toda la pantalla.
 * El botón Maximizar sigue llevando el panel al 100% del viewport.
 */
export const PANEL_WIDTHS: Record<PanelType, string> = {
  politica: "min(clamp(780px, 52vw, 1120px), 100vw)",
  fase: "min(clamp(720px, 48vw, 1040px), 100vw)",
  "linea-editor": "min(820px, 100vw)",
  linea: "min(clamp(720px, 48vw, 1040px), 100vw)",
  aporte: "min(clamp(640px, 44vw, 920px), 100vw)",
  sesion: "min(clamp(520px, 38vw, 760px), 100vw)",
  usuarios: "min(clamp(720px, 55vw, 1040px), 100vw)",
  "usuario-invitar": "min(clamp(620px, 48vw, 900px), 100vw)",
  "usuario-editor": "min(clamp(620px, 48vw, 900px), 100vw)",
  "usuario-detalle": "min(clamp(620px, 48vw, 900px), 100vw)",
  mesa: "min(clamp(820px, 56vw, 1240px), 100vw)",
  "mesa-acta": "min(clamp(880px, 60vw, 1340px), 100vw)",
  // el papelografo es el lienzo más ancho: el árbol necesita aire
  papelografo: "min(clamp(1080px, 82vw, 1760px), 100vw)",
  "mesa-editor": "min(clamp(560px, 42vw, 800px), 100vw)",
  territorio: "min(clamp(480px, 35vw, 640px), 100vw)",
  formularios: "min(clamp(820px, 56vw, 1240px), 100vw)",
  "formulario-editor": "min(clamp(780px, 52vw, 1120px), 100vw)",
  "formulario-analitica": "min(clamp(720px, 48vw, 1040px), 100vw)",
  "formulario-preview": "min(clamp(640px, 44vw, 920px), 100vw)",
  "formulario-respuesta": "min(clamp(640px, 44vw, 920px), 100vw)",
  "participacion-multicanal": "min(clamp(880px, 60vw, 1340px), 100vw)",
  "escenario-editor": "min(clamp(640px, 44vw, 920px), 100vw)",
  "testimonios-galeria": "min(clamp(820px, 56vw, 1240px), 100vw)",
  "testimonio-editor": "min(clamp(640px, 44vw, 920px), 100vw)",
  "testimonios-moderacion": "min(clamp(840px, 58vw, 1280px), 100vw)",
  "fases-control": "min(clamp(640px, 44vw, 920px), 100vw)",
  "auditoria-consola": "min(clamp(780px, 52vw, 1120px), 100vw)",
  noticia: "min(clamp(780px, 52vw, 1120px), 100vw)",
  "noticia-editor": "min(clamp(820px, 56vw, 1240px), 100vw)",
  "testimonio-nuevo": "min(clamp(640px, 44vw, 920px), 100vw)",
  "rendicion-cuentas": "min(clamp(840px, 58vw, 1280px), 100vw)",
  "fuente-editor": "min(clamp(640px, 48vw, 920px), 100vw)",
  "actor-editor": "min(clamp(640px, 48vw, 920px), 100vw)",
  "medicion-editor": "min(clamp(640px, 48vw, 920px), 100vw)",
  "validacion-mga": "min(clamp(780px, 52vw, 1120px), 100vw)",
  "ficha-territorial": "min(clamp(720px, 50vw, 1040px), 100vw)",
  "alternativa-editor": "min(clamp(720px, 50vw, 1020px), 100vw)",
  "evaluacion-viabilidad": "min(clamp(780px, 52vw, 1100px), 100vw)",
  "asignacion-presupuestal": "min(clamp(680px, 48vw, 980px), 100vw)",
  "compromiso-editor": "min(clamp(720px, 50vw, 1020px), 100vw)",
  "indicador-detalle": "min(clamp(720px, 50vw, 1000px), 100vw)",
  "devolucion-detalle": "min(clamp(720px, 50vw, 1020px), 100vw)",
};
