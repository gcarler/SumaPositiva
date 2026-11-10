# ENCARGO 308: Sistema Integral de Preparación, Ejecución y Documentación de Mesas de Trabajo (Logística, Compromisos, Asistencia al Azar, Notas y Evidencias Multimedia)

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-07 · **Estado:** ASIGNADO
- **Origen:** Requerimiento del usuario:
  > *"Necesito que verifiques con agy2 si las mesas permite la inclusión de notas observaciones recarga de imágenes compromisos responsables logísticos es decir todo aquello que se requería para hacer una mesa Pero además para documentar la asistencia al azar la relatoría el contenido o sea toda esa estructura de preparación, ejecución y documentación de una mesa de trabajos ... si no tiene ese esquema o ese motor diseñado, por favor diséñalo y aplícalo"*
- **Regla rectora de decisión:** *"ANTE UNA OPCIÓN, SI NO TE RESPONDO ESCOGE SIEMPRE LA MAS PRO, NO LA MAS FACIL O LA DE MENOS TRABAJO"*.
- **Entrega esperada:** `bridge/308_entrega_agy2_motor_mesas_logistica_compromisos_relatoria.md`

---

## 1. Diagnóstico del Estado Actual en `src/features/mesas/`

Al auditar la implementación actual de mesas:
- **Lo que ya existe:**
  1. Asistencia básica: QR en puerta, registro manual con 12 enfoques diferenciales, quórum en vivo y exportación CSV.
  2. Submesas: creación de submesas y papelógrafo con árbol de problemas y soluciones.
  3. Relatoría: modo narrativo, matriz y generación de borrador técnico.
  4. Adjuntos: componente genérico de archivos (`AdjuntosZona`).
  5. Responsables: lista básica de entidades y personas (con flag facilitador).
- **Lo que FALTA o requiere el nuevo motor integral de 3 fases:**
  1. **Motor Logístico y de Preparación:** No hay checklist operativo de insumos (sonido, silletería, papelógrafos, refrigerios, señalización), ni roles logísticos dedicados (coordinador logístico, soporte A/V, registro, accesibilidad).
  2. **Notas y Observaciones de Campo / Bitácora:** No hay un sistema estructurado de notas de preparación, observaciones del facilitador y bitácora de incidencias territoriales en tiempo real.
  3. **Compromisos y Acuerdos con Trazabilidad:** El acta genera un JSON, pero en la vista operativa de la mesa no existe un gestor ágil de compromisos con actor responsable, persona encargada, fecha límite, tipo y estado de cumplimiento.
  4. **Asistencia al Azar y Sorteo Cívico (Democracia Deliberativa / Minipúblicos):** No hay mecanismo para registrar convocatoria por sorteo aleatorio ni herramienta para sorteo al azar de turnos de palabra en plenaria o muestreo de verificación.
  5. **Galería Enriquecida de Evidencias Multimedia con Recarga:** El actual `AdjuntosZona` es una lista plana. Se requiere una galería fotográfica categorizada (Apertura, Plenaria, Trabajo en Submesas, Papelógrafo, Cierre), con visualización previa (lightbox/zoom), opción de **recargar/reemplazar imágenes** y sello explícito de despojo pericial de metadatos EXIF/GPS (Ley 1581/2012).

---

## 2. Especificación Técnica de la Solución (Arquitectura en 3 Fases)

Debes diseñar e implementar en `src/features/mesas/` una arquitectura completa y profesional dividida en el ciclo metodológico completo de una mesa deliberativa:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CICLO INTEGRAL DE LA MESA DE TRABAJO POLIS                     │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ FASE 1: PREPARACIÓN  │ FASE 2: EJECUCIÓN    │ FASE 3: DOCUMENTACIÓN Y CIERRE│
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ • Objetivos y Agenda │ • QR en Puerta       │ • Relatoría y Matriz de Árbol │
│ • Checklist Logístico│ • Enfoque Diferencial│ • Galería de Evidencias (Foto)│
│ • Equipo Logístico   │ • Sorteo al Azar     │ • Matriz de Compromisos       │
│ • Notas Previas      │ • Submesas y Papelog.│ • Acta C-150 Sellada SHA-256  │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

### 2.1. Modelos de Datos (`src/features/mesas/models/mesas.ts`)
Extiende la interfaz `MesaDeTrabajo` y crea los siguientes tipos fuertemente tipados:

1. **Logística y Preparación:**
   ```typescript
   export interface ItemChecklistLogistico {
     id: string;
     categoria: "espacio" | "audiovisual" | "materiales" | "refrigerios" | "seguridad_accesibilidad";
     tarea: string;
     completado: boolean;
     responsable?: string;
   }

   export interface ResponsableLogistico {
     id: string;
     nombre: string;
     rolLogistico: "coordinador_general" | "audiovisuales_sonido" | "registro_puerta" | "hidratacion_refrigerios" | "accesibilidad_primeros_auxilios";
     telefono?: string;
     entidad?: string;
   }

   export interface LogisticaMesa {
     checklist: ItemChecklistLogistico[];
     equipoLogistico: ResponsableLogistico[];
     observacionesLogistica?: string;
     estadoPreparacion: "pendiente" | "en_progreso" | "listo";
   }
   ```

2. **Compromisos de la Mesa:**
   ```typescript
   export type TipoCompromiso = "inversion_distrital" | "acuerdo_comunitario" | "gestion_institucional" | "seguimiento_normativo";
   export type EstadoCompromiso = "pendiente" | "en_ejecucion" | "cumplido" | "en_riesgo";

   export interface CompromisoMesa {
     id: string;
     codigo: string; // ej. COMP-01
     descripcion: string;
     entidadResponsable: string;
     personaResponsable?: string;
     fechaLimite?: string;
     tipo: TipoCompromiso;
     estado: EstadoCompromiso;
     avancePorcentaje?: number;
     observaciones?: string;
   }
   ```

3. **Asistencia al Azar y Sorteo Cívico:**
   ```typescript
   export interface ConfiguracionSorteoAzar {
     metodoConvocatoria: "abierta" | "sorteo_civico_aleatorio" | "delegacion_comunitaria" | "mixta";
     estratificacion?: string; // ej. "Cuotas por UCG y género"
     intervencionesSorteo: Array<{
       asistenteId: string;
       nombre: string;
       horaSorteo: string;
       duracionMinutos: number;
       tema?: string;
     }>;
     muestraAleatoriaAuditoria?: string[]; // IDs de asistentes seleccionados al azar para verificación
   }
   ```

4. **Notas y Bitácora del Facilitador:**
   ```typescript
   export interface NotaMesa {
     id: string;
     autor: string;
     rolAutor: string;
     momento: "preparacion" | "plenaria_apertura" | "submesas" | "plenaria_cierre" | "post_mesa";
     contenido: string;
     creadoEn: string;
     esPrivada?: boolean;
   }
   ```

5. **Galería de Evidencias Multimedia:**
   ```typescript
   export type CategoriaFotoMesa = "apertura" | "plenaria" | "submesas" | "papelografo" | "acta_cierre" | "general";

   export interface FotoEvidenciaMesa {
     id: string;
     nombre: string;
     categoria: CategoriaFotoMesa;
     url: string;
     tamanoBytes: number;
     subidoEn: string;
     subidoPor?: string;
     exifDespojado: boolean; // Cumplimiento Ley 1581/2012
     descripcion?: string;
   }
   ```

### 2.2. Estado Global (`src/features/mesas/state/mesas-store.ts`)
Añade acciones atómicas y tipadas para:
- `actualizarLogistica(mesaId, logistica)`
- `toggleChecklistLogistico(mesaId, itemId)`
- `agregarCompromiso(mesaId, compromiso)`, `actualizarCompromiso(...)`, `eliminarCompromiso(...)`
- `ejecutarSorteoIntervencion(mesaId, asistenteId, tema)`
- `generarMuestraAleatoriaAsistencia(mesaId, tamanoMuestra)`
- `agregarNotaMesa(mesaId, nota)`, `eliminarNotaMesa(...)`
- `agregarFotoEvidencia(mesaId, foto)`, `eliminarFotoEvidencia(...)`, `recargarFotoEvidencia(mesaId, fotoId, nuevaFoto)`

### 2.3. Componentes y Paneles UI (`src/features/mesas/`)
1. **Nuevo componente / panel:** `src/features/mesas/components/mesa-logistica-panel.tsx` o integrarlo elegantemente como sección en `src/features/mesas/panels/mesa-panel.tsx`.
2. **Componente de Compromisos:** `src/features/mesas/components/mesa-compromisos-tabla.tsx` con badges de estado, filtro por entidad y edición rápida.
3. **Componente de Sorteo al Azar:** `src/features/mesas/components/mesa-sorteo-azar.tsx` con botón accesible para "Sortear Turno de Palabra", selector aleatorio animado respetando `prefers-reduced-motion`, y cálculo muestral representativo.
4. **Galería Multimedia:** `src/features/mesas/components/mesa-galeria-evidencias.tsx` con tarjetas visuales, selector de categoría, reemplazo/recarga de imagen y badge verde de despojo pericial de metadatos EXIF.
5. **Sección de Bitácora / Notas:** Bloque interactivo con filtro por momento metodológico y marcas temporales.

---

## 3. Accesibilidad y Reglas de Calidad ("LA MAS PRO")

- **Accesibilidad WCAG 2.1 AA:** Roles semánticos adecuados (`role="region"`, `role="list"`, `role="tab"`), contraste de color tokenizado (`var(--surface-*)`, `var(--text-*)`, `var(--ember)`). Cero violaciones en `axe-core`.
- **Motion accesible:** Usar `framer-motion` con respeto estricto a `prefers-reduced-motion`.
- **Integridad Zero-Modals:** Diseñar mediante paneles laterales (`PanelShell`), acordeones colapsables o tabs fluidos de navegación en la mesa.
- **Sin efectos colaterales:** No modificar backend, no ejecutar migraciones, no realizar commits ni push.

---

## 4. Criterios de Aceptación y Pruebas Requeridas

Debes crear una suite de pruebas exhaustiva:
- `src/features/mesas/components/mesa-logistica-compromisos.test.tsx` (o modularizadas según tus archivos creados).
- Probar:
  1. Renderizado de checklist logístico y toggle de ítems.
  2. Adición y cambio de estado de compromisos.
  3. Ejecución del sorteo aleatorio de intervenciones entre asistentes registrados.
  4. Carga y reemplazo/recarga de fotos de evidencia con despojo EXIF.
  5. Registro de notas de campo y bitácora.
- Ejecutar y reportar la salida limpia de:
  ```bash
  cd /root/polis
  node scripts/ui-policy.mjs
  bun run typecheck
  bun run lint
  bun test src/features/mesas
  ```

Registra el informe final en `bridge/308_entrega_agy2_motor_mesas_logistica_compromisos_relatoria.md`.
