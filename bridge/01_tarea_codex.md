# TAREA ACTIVA — codex
**Asignada por**: EAF (Antigravity Líder)
**Fecha**: 2026-10-01T18:47Z
**Prioridad**: ALTA

---

## Objetivo
Completar el módulo de **Formularios** de POLIS para que tenga paridad funcional
con Google Forms. El estado actual es un scaffold básico con 5 tipos de pregunta
y sin funcionalidades clave. Hay que completarlo de forma robusta.

## Contexto Técnico
- **Stack**: Next.js 16 / React 19 / TypeScript / Bun / Zustand / TanStack Query
- **Regla Zero-Modals**: toda interacción ocurre en Drawers laterales (PanelShell).
  Nunca modals centrados.
- **Tokens CSS obligatorios**: `--surface-1`, `--text-primary`, `--ember`, `--border`.
  No hardcodear colores.
- **Archivos principales del módulo**:
  - `src/features/formularios/models/formulario.ts` — modelo de datos
  - `src/features/formularios/panels/formulario-editor-panel.tsx` — editor (scaffold)
  - `src/features/formularios/panels/formularios-panel.tsx` — listado
  - `src/features/formularios/panels/formulario-analitica-panel.tsx` — analítica
  - `src/features/formularios/services/formularios-api.ts` — API calls
  - `src/features/formularios/services/use-formularios-queries.ts` — TanStack hooks

---

## Brecha Actual vs. Google Forms

| Funcionalidad | Estado Actual | Estado Objetivo |
|---|---|---|
| Tipos de pregunta | 5 básicos | **12 tipos completos** |
| Lógica condicional | ❌ No existe | ✅ Mostrar/ocultar preguntas según respuesta |
| Reordenar preguntas | ❌ No existe | ✅ Drag & drop o botones ↑↓ |
| Secciones/páginas | ❌ No existe | ✅ Agrupar preguntas en secciones |
| Validaciones por campo | ❌ No existe | ✅ Obligatorio, min/max, regex, rango numérico |
| Vista previa | ❌ No existe | ✅ Panel de vista previa del formulario final |
| Responder formulario | ❌ No existe | ✅ Panel de respuesta ciudadana |
| Confirmación de envío | ❌ No existe | ✅ Mensaje personalizable post-envío |
| Límite de respuestas | ❌ No existe | ✅ Fecha de cierre + cupo máximo |
| Analítica de respuestas | Básica | ✅ Gráficos por pregunta, exportar CSV |
| Imagen en pregunta | ❌ No existe | ✅ URL de imagen en pregunta |
| Descripción de sección | ❌ No existe | ✅ Texto explicativo entre preguntas |

---

## T1 — Ampliar el Modelo de Datos

**Archivo**: `src/features/formularios/models/formulario.ts`

Ampliar `TipoPregunta` y el modelo completo:

```ts
export type TipoPregunta =
  | "texto_corto"        // Input text
  | "texto_largo"        // Textarea
  | "opcion_unica"       // Radio buttons
  | "opcion_multiple"    // Checkboxes
  | "lista_desplegable"  // Select / dropdown
  | "likert"             // Escala 1-5 (o 1-N configurable)
  | "escala_lineal"      // Slider numérico con etiquetas extremos
  | "fecha"              // Date picker
  | "hora"               // Time picker
  | "numero"             // Input numérico con min/max
  | "carga_archivo"      // File upload (imagen/pdf)
  | "seccion"            // Separador de sección (no captura respuesta)
  | "descripcion";       // Bloque de texto informativo (no captura respuesta)

export interface ValidacionCampo {
  obligatoria?: boolean;
  minLongitud?: number;
  maxLongitud?: number;
  minValor?: number;
  maxValor?: number;
  patron?: string;         // regex
  mensajeError?: string;
}

export interface LogicaCondicional {
  preguntaOrigenId: string;
  operador: "igual" | "no_igual" | "contiene" | "mayor_que" | "menor_que";
  valor: string;
  accion: "mostrar" | "ocultar" | "ir_a_seccion";
  preguntaDestinoId?: string;
  seccionDestinoId?: string;
}

export interface PreguntaFormulario {
  id: string;
  tipo: TipoPregunta;
  texto: string;
  descripcion?: string;       // Texto de ayuda bajo la pregunta
  imagenUrl?: string;         // URL de imagen ilustrativa
  obligatoria: boolean;
  opciones?: OpcionRespuesta[];
  validacion?: ValidacionCampo;
  logica?: LogicaCondicional[];
  escalaMin?: number;          // Para likert/escala_lineal
  escalaMax?: number;
  etiquetaMin?: string;        // "Muy en desacuerdo"
  etiquetaMax?: string;        // "Muy de acuerdo"
  enfoqueDiferencial?: boolean;
  orden: number;               // Para reordenar
  seccionId?: string;          // A qué sección pertenece
}

export interface SeccionFormulario {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
}

export interface ConfiguracionFormulario {
  mensajeConfirmacion: string;   // Texto post-envío
  limiteRespuestas?: number;     // null = sin límite
  fechaCierre?: string;          // ISO date
  permitirEdicion: boolean;      // Responder más de una vez
  requiereAutenticacion: boolean;
  mostrarBarraProgreso: boolean;
  ordenAleatorio: boolean;       // Mezclar preguntas
}

export interface Formulario {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "borrador" | "activo" | "cerrado";
  secciones: SeccionFormulario[];
  preguntas: PreguntaFormulario[];
  configuracion: ConfiguracionFormulario;
  respuestasCount: number;
  creadoEn: string;
  actualizadoEn: string;
}

// Respuesta individual de un ciudadano
export interface RespuestaCiudadana {
  id: string;
  formularioId: string;
  sesionId?: string;      // null si anónimo
  respuestas: Record<string, string | string[]>;  // preguntaId -> valor(es)
  enviadoEn: string;
  enfoqueDiferencial?: string;
}
```

---

## T2 — Editor de Formularios Completo

**Archivo**: `src/features/formularios/panels/formulario-editor-panel.tsx`

Reescribir el editor con:

### 2.1 Gestión de Secciones
- Botón "Añadir Sección" crea una `SeccionFormulario`
- Título y descripción editables inline
- Preguntas arrastradas o asignadas a secciones

### 2.2 Constructor de Preguntas (uno por tipo)
Para cada tipo de pregunta, el editor muestra controles específicos:

- **texto_corto / texto_largo**: Placeholder, validación de longitud (min/max chars)
- **opcion_unica / opcion_multiple / lista_desplegable**: 
  - Lista editable de opciones (input inline + botón eliminar)
  - Botón "Añadir opción" y "Añadir 'Otro' (texto libre)"
  - Opción de orden aleatorio
- **likert / escala_lineal**: Configurar min/max numérico y etiquetas de extremos
- **numero**: Configurar min, max y paso (step)
- **fecha / hora**: sin configuración extra
- **carga_archivo**: Tipos permitidos (imagen, pdf, cualquiera)
- **seccion / descripcion**: Solo texto enriquecido

### 2.3 Reordenamiento
- Botones ↑ y ↓ en cada pregunta para mover arriba/abajo dentro de la sección
- (Opcional si hay tiempo: drag & drop con `@dnd-kit/core` si ya está instalado)

### 2.4 Lógica Condicional
En cada pregunta, sección "Lógica" expandible:
- "Mostrar esta pregunta si [pregunta X] [operador] [valor]"
- Controles: `Select pregunta origen` + `Select operador` + `Input valor`

### 2.5 Configuración del Formulario
Sección inferior "Configuración":
- Mensaje de confirmación post-envío (textarea)
- Límite de respuestas (número o ilimitado)
- Fecha de cierre (DatePicker)
- Toggle: Mostrar barra de progreso
- Toggle: Requerir autenticación para responder

### 2.6 Vista Previa
Botón "Vista Previa" en el footer del panel → abre un sub-panel `formulario-preview-panel.tsx`
que renderiza el formulario exactamente como lo verá el ciudadano.

---

## T3 — Panel de Respuesta Ciudadana

**Archivo nuevo**: `src/features/formularios/panels/formulario-respuesta-panel.tsx`

Panel que el ciudadano usa para **responder** el formulario:

- Renderiza pregunta por pregunta (o sección a sección con progreso)
- Aplica lógica condicional: oculta/muestra preguntas según respuestas anteriores
- Validación en tiempo real (campos obligatorios, longitud, rango)
- Barra de progreso si `configuracion.mostrarBarraProgreso`
- Al enviar: muestra `configuracion.mensajeConfirmacion`
- Inputs por tipo:
  - `texto_corto`: `<Input>`
  - `texto_largo`: `<Textarea>`
  - `opcion_unica`: radio buttons accesibles
  - `opcion_multiple`: checkboxes accesibles
  - `lista_desplegable`: `<Select>`
  - `likert`: fila de botones numerados con etiquetas extremos
  - `escala_lineal`: `<input type="range">` con valor numérico visible
  - `fecha`: `<input type="date">`
  - `hora`: `<input type="time">`
  - `numero`: `<Input type="number">` con min/max
  - `carga_archivo`: `<input type="file">` con preview de imagen
  - `seccion` / `descripcion`: solo texto, no input

Registrar el panel en `src/app/_composition/panel-registry.tsx` con id `"formulario-respuesta"`.
Props: `{ formularioId: string }`.

---

## T4 — Analítica Mejorada

**Archivo**: `src/features/formularios/panels/formulario-analitica-panel.tsx`

Mejorar el panel de analítica con:

- **Por cada pregunta** un bloque con:
  - `opcion_unica` / `lista_desplegable`: gráfico de barras horizontal (CSS puro con `width: X%`)
  - `opcion_multiple`: idem con posibilidad de múltiple selección (porcentaje sobre total respuestas)
  - `likert` / `escala_lineal`: promedio + distribución de respuestas
  - `texto_corto` / `texto_largo`: lista de últimas 5 respuestas + total count
  - `numero`: promedio, mínimo, máximo
- **Botón "Exportar CSV"**: genera y descarga un CSV con todas las respuestas
  (usar `Blob` + `URL.createObjectURL`)
- **Sección "Enfoque Diferencial"**: torta/barra de respuestas por población diferencial

---

## T5 — Estado Zustand y Mock de Formularios

**Archivo nuevo**: `src/features/formularios/state/formularios-store.ts`

Crear store Zustand con:

```ts
interface FormulariosState {
  formularios: Formulario[];
  // CRUD
  crearFormulario: (f: Omit<Formulario, 'id' | 'creadoEn' | 'actualizadoEn' | 'respuestasCount'>) => Formulario;
  actualizarFormulario: (id: string, cambios: Partial<Formulario>) => void;
  eliminarFormulario: (id: string) => void;
  // Respuestas
  enviarRespuesta: (r: Omit<RespuestaCiudadana, 'id' | 'enviadoEn'>) => void;
  respuestas: RespuestaCiudadana[];
}
```

Incluir al menos **2 formularios mock** reales para la política de Seguridad Humana:

1. **"Diagnóstico de Seguridad en mi Barrio"**
   - Preguntas: ¿En qué barrio vives? (lista desplegable con BARRIOS_CARTAGENA),
     ¿Cuál es el principal problema de seguridad? (opción única: violencia, hurto, ESCNNA, ambiental, otro),
     ¿Te has sentido inseguro en el último mes? (likert 1-5),
     Describe la situación de seguridad en tu barrio (texto largo),
     ¿Has participado en alguna mesa comunitaria? (opción única: sí/no)
   - 2 secciones: "Datos del Territorio" y "Tu Experiencia"

2. **"Priorización de Líneas Estratégicas"**
   - Preguntas: Ordenar las 7 Dimensiones ONU por prioridad (escala lineal por dimensión),
     ¿Qué propuesta tiene mayor impacto? (opción única),
     Observaciones adicionales (texto largo)

**Importante**: el selector de barrio en el formulario mock debe importar
`BARRIOS_CARTAGENA` de `@/features/geovisor/data/barrios.data.ts` y convertirlos
en `OpcionRespuesta[]` para el tipo `lista_desplegable`.

---

## T6 — Aseguramiento de Calidad y Despliegue

```bash
cd /root/polis

# 1. TypeScript y ESLint
bun run check

# 2. Corregir errores antes de continuar

# 3. Build
bun run build

# 4. Reiniciar frontend
sudo systemctl restart polis-frontend.service
sudo systemctl is-active polis-frontend.service

# 5. Verificar respuesta
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/

# 6. Commit
git add -A && git commit -m "feat(formularios): módulo completo con paridad funcional Google Forms

- Ampliar TipoPregunta a 12 tipos (texto, opciones, likert, fecha, número, archivo, sección)
- Modelo: SeccionFormulario, ValidacionCampo, LogicaCondicional, ConfiguracionFormulario
- FormularioEditorPanel: editor completo con secciones, lógica condicional, reordenamiento, validaciones
- FormularioRespuestaPanel: panel ciudadano con validación en tiempo real y lógica condicional
- FormularioAnaliticaPanel: gráficos por tipo de pregunta + exportar CSV
- FormulariosStore: Zustand con CRUD + 2 mocks reales (diagnóstico barrio + priorización dimensiones)
- Integración con BARRIOS_CARTAGENA para selector de barrio en formularios"
```

---

## Entrega Esperada
Al terminar escribe el resultado en `/root/polis/bridge/02_entrega_codex.md` con:
- Estado T1–T6: ✅ CONFORME / ❌ ERROR
- Tipos de pregunta implementados
- Salida de `bun run check`
- Salida de `bun run build`
- Hash del commit
- Decisiones de diseño relevantes
