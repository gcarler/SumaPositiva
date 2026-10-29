import type { TareaComunicacion } from "@/features/comunicaciones/models/tarea-comunicacion";
import type { ArbolPanel } from "@/features/mesas/models/arbol-panel";
import type { ActividadProyecto } from "@/features/proyectos/models/actividad-proyecto";

declare module "@/core/panels/panel-store" {
  interface PanelPropsRegistry {
    politica: { politicaId: string };
    fase: { politicaId: string; faseId: string };
    "linea-editor": { lineaId?: string };
    linea: { politicaId: string; faseId: string; lineaId: string };
    aporte: { politicaId: string; faseId: string; lineaId: string };
    sesion: { accion?: "recuperar" | "verificar" | "magic_link"; token?: string };
    usuarios: Record<string, never>;
    mesa: { mesaId: string; soloLectura?: boolean };
    papelografo: {
      mesaId: string;
      submesaId: string;
      arbol: ArbolPanel;
      fromKey?: string;
    };
    "mesa-editor": { mesaId?: string };
    "agenda-editor": { agendaId?: string };
    territorio: { territorioId: string };
    formularios: { soloRespuesta?: boolean; soloLectura?: boolean };
    "formulario-editor": { formularioId?: string };
    "formulario-analitica": { formularioId: string };
    "formulario-preview": { borradorId: string };
    "formulario-respuesta": { formularioId: string };
    "participacion-multicanal": { canalInicial?: string };
    "escenario-editor": Record<string, never>;
    "testimonios-galeria": { territorioId?: string };
    "testimonio-editor": { testimonioId?: string };
    "testimonios-moderacion": { estadoInicial?: string };
    "fases-control": Record<string, never>;
    "auditoria-consola": Record<string, never>;
    "usuario-invitar": Record<string, never>;
    "usuario-editor": { usuarioId: string };
    "usuario-detalle": { usuarioId: string };
    noticia: { noticiaId: string };
    "noticia-editor": { noticiaId?: string };
    "testimonio-nuevo": Record<string, never>;
    "mesa-acta": { mesaId: string };
    "rendicion-cuentas": {
      dependenciaId?: string;
      vistaInicial?: "dependencias" | "plan_accion_dnp" | "triada_motores";
    };
    "fuente-editor": { fuenteId?: string; soloLectura?: boolean };
    "actor-editor": { actorId?: string; soloLectura?: boolean };
    "medicion-editor": {
      fichaId: string;
      codigoIndicador?: string;
      nombreIndicador?: string;
      unidadMedida?: string;
      soloLectura?: boolean;
      onMedicionGuardada?: () => void;
    };
    "validacion-mga": {
      resultado: {
        evaluacion_id: string;
        politica_id: string;
        es_valido: boolean;
        puntaje_coherencia: number;
        analisis_sintaxis: Array<{
          texto_original: string;
          cumple_sintaxis: boolean;
          tipo_nodo: string;
          sintaxis_esperada: string;
          texto_corregido_sugerido: string;
          observacion_metodologica: string;
        }>;
        problema_central_optimizado: string;
        objetivo_central_derivado: string;
        arbol_problemas_estructurado: Record<string, unknown>;
        arbol_objetivos_derivado: Record<string, unknown>;
        recomendaciones_dnp: string[];
        resumen_ejecutivo: string;
      };
      instrumentoNombre?: string;
      arbolTipo?: "problemas" | "objetivos";
    };
    "ficha-territorial": { territorioId: string; soloLectura?: boolean };
    "alternativa-editor": {
      alternativaId?: string | null;
      modo?: "crear" | "editar" | "ver";
      soloLectura?: boolean;
    };
    "evaluacion-viabilidad": { alternativaId: string; soloLectura?: boolean };
    "asignacion-presupuestal": {
      alternativaId?: string;
      asignacionId?: string;
      soloLectura?: boolean;
      onAsignacionGuardada?: () => void;
    };
    "compromiso-editor": {
      compromisoId?: string | null;
      modo?: "crear" | "editar" | "ver";
      soloLectura?: boolean;
      onGuardado?: () => void;
    };
    "indicador-detalle": {
      indicadorId?: string | null;
      soloLectura?: boolean;
      onMedicionGuardada?: () => void;
    };
    "devolucion-detalle": {
      propuestaId?: string | null;
      soloLectura?: boolean;
      onGuardado?: () => void;
    };
    "ficha-editor": {
      fichaId?: string | null;
      ficha?: unknown;
      soloLectura?: boolean;
      onGuardado?: () => void;
    };
    "dimension-detalle": { dimensionId: string };
    "tarea-comunicacion-editor": {
      tarea: TareaComunicacion | null;
      ordenSugerido: number;
      /** La vista padre reemplaza la fila guardada al recibirla. */
      onGuardada: (tarea: TareaComunicacion) => void;
    };
    /** Ficha de detalle de una actividad del agregado de Proyectos (read-only). */
    "ficha-actividad-proyecto": {
      actividad: ActividadProyecto;
      seccionInicial?: "anexos";
      /** Acción de edición del módulo dueño; la vista decide por permiso. */
      onEditar?: () => void;
    };
  }
}
