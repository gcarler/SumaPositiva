# Plan Maestro — Fase de Diagnóstico (POLIS)
**Versión**: 1.0 — Revisada y Calibrada por EAF
**Fecha**: 2026-10-03
**Elaborado por**: Antigravity (Orquestador Central / Auditoría Forense EAF)
**Estado**: APROBADO CON CONDICIONES — Listo para delegación a `agy2`

---

## 0. Dictamen de Calidad del Plan (EAF)

### 0.1 Marco de Referencia para la Evaluación

Este plan fue revisado a la luz de los siguientes documentos institucionales del repositorio:

| Fuente | Hallazgo Relevante |
|:---|:---|
| `docs/banco-conocimiento-politica-publica.md` | Marco legal y metodológico completo (C.P. 1991, Ley 1757, MGA DNP, CONPES, MIPG) |
| `docs/plan-trabajo.md` | Inventario real de lo implementado: E1–E6 completadas; infraestructura de datos disponible |
| `backend/alembic/versions/0016_presupuesto_e_indicadores.py` | 8 indicadores sembrados en `bd_csh` (2023); estructura `fichas_tecnicas_indicadores` disponible |
| `backend/app/modules/ia/agentes/agente_diagnostico.py` | Motor MGA ya implementado: valida sintaxis, deriva Árbol de Objetivos desde Problemas |
| Consulta directa a `bd_csh` | `geodatos.indicadores_territorio` = **0 filas** (tabla existe pero vacía); 337 nodos MGA en `motor_instrumentos`; 227 propuestas ciudadanas reales persistidas; 7 Dimensiones ONU sembradas |

---

### 0.2 Hallazgos de Auditoría — Calibración del Plan Original

#### ✅ CONFIRMADO: Punto 1 — La brecha de la Línea Base Cuantitativa ES REAL

**Evidencia del repositorio:**
- La BD tiene `indicadores.fichas_tecnicas_indicadores` con 8 fichas (Tasa de Homicidios: 32.5 por 100k, año base 2023; Tasa de Hurtos: 450.2; Percepción de Inseguridad: 78.4%; etc.). Son datos reales de Cartagena.
- **Sin embargo**: estas fichas están desconectadas de la interfaz de diagnóstico. No existe vista en `/plataforma/` que las exponga, ni que las vincule a las 7 Dimensiones ONU, ni que permita actualizar mediciones con datos 2024–2026. La tabla `geodatos.indicadores_territorio` existe pero tiene **0 registros**.
- **Acción requerida**: Módulo `/plataforma/diagnostico` que exponga estas fichas, permita añadir mediciones recientes (2024–2026) y relacione cada indicador con su Dimensión ONU y Fuente oficial del módulo de Fuentes.

#### ✅ CONFIRMADO Y AMPLIADO: Punto 2 — Triangulación es la brecha más crítica

**Evidencia del repositorio:**
- Existen 227 propuestas ciudadanas reales en `participacion_ciudadana.propuestas_ciudadanas`.
- Existen 337 nodos MGA en `motor_instrumentos.nodos_instrumento` (árboles de problemas de mesas).
- Existen respuestas en `participacion_ciudadana.respuestas_formulario`.
- **Sin embargo**: no hay ningún servicio ni vista que cruce estas tres fuentes para identificar convergencias y alertas críticas por dimensión.
- **Precisión importante**: No construiremos un motor de IA para esto (ya existe `AgenteDiagnostico`). Lo que falta es una **Vista Diagnóstica de Convergencia** (frontend) que use el motor ya existente y presente la síntesis de forma institucional.

#### ✅ CONFIRMADO Y CORREGIDO: Punto 3 — Árbol de Problemas visible: existe pero no está expuesto

**Evidencia del repositorio:**
- La BD tiene 337 nodos MGA reales en `motor_instrumentos.nodos_instrumento`, incluyendo árboles completos para "Convivencia Comunitaria y Desarme Social en Localidad 2" y "Diagnóstico Género y Cuidado".
- El `AgenteDiagnostico` implementado en Python valida sintaxis DNP y deriva objetivos.
- **Sin embargo**: no existe ninguna vista pública ni institucional en `/plataforma/` que muestre el árbol distrital consolidado por Dimensión ONU. Los árboles existen en la BD pero son invisibles para las autoridades distritales.
- **Corrección al plan original**: NO hay que construir un "nuevo motor MGA" (ya existe). Hay que construir **la vista que lo expone y lo conecta al `AgenteDiagnostico`** via la API `/api/v1/ia/diagnostico`.

#### ✅ CONFIRMADO CON MATIZ: Punto 4 — Población Afectada: la BD tiene estructura, falta poblar

**Evidencia del repositorio:**
- `participacion_ciudadana.propuestas_ciudadanas` tiene campo `metadata_enfoque JSONB` (Ley 1448/11, Ley 1618/13, Convenio 169 OIT) — estructura correcta.
- `participacion_ciudadana.escenarios_especiales` tiene desgloses poblacionales en JSONB.
- **Sin embargo**: no existe una ficha de **Población de Referencia/Afectada/Objetivo por Dimensión** accesible desde el módulo de diagnóstico.
- **Matiz importante**: No es un módulo nuevo de persistencia (la estructura ya existe). Es un módulo de visualización y reporte que consolide los datos de enfoque diferencial ya capturados.

#### ✅ CONFIRMADO Y REDUCIDO EN ALCANCE: Punto 5 — Geodiagnóstico Territorial

**Evidencia del repositorio:**
- `geodatos.territorios` tiene 15 entidades distritales con geometrías PostGIS.
- `geodatos.indicadores_territorio` existe con la estructura correcta pero tiene **0 registros**.
- Ya existe un geovisor con paneles territoriales.
- **Corrección al plan original**: No hay que crear un nuevo módulo de geovisor. Hay que: **(a)** poblar `geodatos.indicadores_territorio` con los indicadores territoriales reales de las fuentes y **(b)** agregar una capa diagnóstica al geovisor existente que muestre el perfil de vulnerabilidad por localidad/corregimiento.

#### ✅ CONFIRMADO COMO URGENTE: Punto 6 — Purga del mock de politicas.mock.ts

**Evidencia del repositorio:**
- `src/features/politicas/data/politicas.mock.ts` contiene aportes con textos de "Av. Regional con Calle 44", "corredor ferroviario entre estaciones Norte y Sur", "vías school-street", que son de otra ciudad.
- Existen 227 propuestas ciudadanas reales en la BD de Cartagena que deberían ser el referente.
- **Acción requerida**: Depuración inmediata del mock con contenido 100% de Cartagena.

---

### 0.3 Riesgos Identificados y Mitigaciones

| Riesgo | Nivel | Mitigación en la Especificación |
|:---|:---|:---|
| Crear persistencia paralela (Prisma/mock) para indicadores en vez de usar la API real | ALTO | La tarea debe exigir explícitamente consumo de `/api/v1/indicadores` para las fichas existentes |
| Rediseñar el `AgenteDiagnostico` o crear uno nuevo en frontend | ALTO | La tarea debe prohibir re-implementar lógica de negocio; sólo consumir el endpoint `/api/v1/ia/diagnostico` |
| Modificar migraciones Alembic existentes en producción | CRÍTICO | Todo cambio de BD es sólo semilla de datos via endpoint PUT/POST, nunca migración directa |
| Introducir contenido inventado de Cartagena en el mock | MEDIO | Especificar fuentes concretas (SIEDCO, DANE, CCV 2025) con valores reales aproximados |
| Romper la UI Policy con tablas HTML nativas o estilos ad-hoc | MEDIO | Exigir `bun run check` + `node scripts/ui-policy.mjs` como requisito de entrega |

---

## 1. Hito D-0: Purga Pericial del Mock de Política (URGENTE — Sin Backend)
**Tipo**: Puramente Frontend — Sin backend nuevo, sin migración, sin nuevo módulo
**Justificación normativa**: Ley 1712 de 2014 (Transparencia y Veracidad de la Información Pública); fidelidad territorial con Cartagena de Indias
**Criterio de auditoría EAF**: El texto de todos los aportes del mock debe contener topónimos, entidades, problemáticas o barrios de Cartagena (El Pozón, Olaya Herrera, Nelson Mandela, La Ciénaga de la Virgen, ESCNNA en Centro Histórico, Isla de Tierrabomba, Bazurto, etc.), nunca de otra ciudad.

### Entregables:
1. **`src/features/politicas/data/politicas.mock.ts`** — Reemplazar los aportes ficticios de las Fases 1 y 2 con entre 12 y 18 aportes reales representativos de Cartagena, cubriendo:
   - Localidad 1 (Histórica y del Caribe Norte): Centro Histórico, Manga, Pie de la Popa.
   - Localidad 2 (De la Virgen y Turística): El Pozón, Nelson Mandela, La Boquilla, Olaya Herrera.
   - Localidad 3 (Industrial y de la Bahía): Mamonal, Olaya sector, Bosque.
   - Zona Insular y Rural: Tierrabomba, Barú, Pasacaballos, La Boquilla costera.
   - Tipos de aportes: al menos 2 propuestas, 2 anotaciones y 1 pregunta por localidad.
   - Temáticas reales: ESCNNA, homicidios juveniles, Ciénaga de la Virgen, ESCNNA turístico, fronteras invisibles, violencia de género, informalidad portuaria, alertas SAT.

### Verificación EAF:
- Lectura pericial del mock antes del commit: ningún topónimo de otra ciudad.
- `bun run check` (0 errores).
- `bun run build` (exitoso).
- HTTP 200 en `http://127.0.0.1:3000/`.

---

## 2. Hito D-1: Módulo de Línea Base Diagnóstica (`/plataforma/diagnostico`)
**Tipo**: Frontend + Consumo de API existente (no crear nuevo backend)
**Justificación normativa**: MGA DNP (Sección 3.2, Guía CONPES), Ley Orgánica 152/94 (Art. 3g), MIPG Decreto 1499/17 — Todo diagnóstico de política pública requiere indicadores cuantitativos con fuente, año base y brecha medible.
**APIs a consumir**: `/api/v1/indicadores/fichas` y `/api/v1/indicadores/fichas/{id}/mediciones` (ya existen, ya retornan datos reales)

### Entregables:
1. **`src/app/plataforma/diagnostico/page.tsx`** — Ruta principal del módulo de diagnóstico.
2. **`src/features/diagnostico/views/diagnostico-view.tsx`** — Vista con:
   - Cabecera institucional: "Diagnóstico de la Política Pública de Seguridad Humana Integral — Cartagena 2026"
   - Selector de modo: 🔵 Por Dimensión ONU | 📊 Cuadro de Línea Base | 🗺️ Vista Territorial
3. **`src/features/diagnostico/components/linea-base-tabla.tsx`** — Tabla de indicadores con:
   - Columnas: Código, Indicador, Tipo (Insumo/Producto/Resultado), Dimensión ONU, Línea Base (Valor + Año), Valor Actual, Meta Cuatrienio, Avance %, Fuente Oficial, Acciones.
   - Consumir directamente `/api/v1/indicadores/fichas` con `@tanstack/react-query`.
   - Botón "Registrar Medición" (para `autoridad_distrital` con permiso `indicadores:gestionar`) que abre panel lateral.
4. **`src/features/diagnostico/panels/medicion-panel.tsx`** — Panel Zero-Modals para registrar nuevas mediciones (período, fecha de corte, valor medido, observaciones, URL evidencia). Consumir `POST /api/v1/indicadores/fichas/{id}/mediciones`.
5. **`src/features/diagnostico/components/diagnostico-kpis.tsx`** — KPIs de síntesis:
   - Indicadores con avance ≥ meta (Verde).
   - Indicadores en riesgo 50–99% (Ámbar).
   - Indicadores críticos < 50% (Rojo).
   - Tasa de cobertura de mediciones actualizadas (% con medición en 2025–2026).
6. **Registro en `acceso.ts`**: módulo `diagnostico` visible para `autoridad_distrital`, `auditor_forense`, `administrador_identidades`. Edición de mediciones sólo para `autoridad_distrital`.
7. **Registro en `plataforma-sidebar.tsx`**: ícono `ClipboardList` o `BarChart3`.

### Restricciones Técnicas Auditables (Criterios EAF):
- **Prohibido**: Crear un store Zustand con datos de indicadores embebidos. Los datos vienen exclusivamente de la API.
- **Prohibido**: Modificar migraciones Alembic o crear nuevas tablas (la estructura ya existe).
- **Exigido**: Manejo de estado de carga (skeleton), error (componente de error con reintento) y vacío (estado vacío institucional) siguiendo el patrón existente en `src/features/participacion/`.

### Verificación EAF:
- `bun run check` (0 errores), `node scripts/ui-policy.mjs` (0 infracciones).
- `bun test src/features/plataforma/models/acceso.test.ts` (pruebas actualizadas).
- Integración real con API: `curl http://127.0.0.1:8000/api/v1/indicadores/fichas` retorna los 8 indicadores sembrados.
- HTTP 200 en `http://127.0.0.1:3000/plataforma/diagnostico`.
- `bun run build` exitoso.

---

## 3. Hito D-2: Árbol de Problemas Distrital (`/plataforma/diagnostico/arbol-problemas`)
**Tipo**: Frontend + Consumo de API backend ya existente
**Justificación normativa**: MGA DNP (Sección 3.2) — El problema central, causas y efectos son la columna vertebral de toda política pública. La Sentencia C-150/2015 exige que la ciudadanía pueda consultar en qué evidencia técnica se basa la política.
**APIs a consumir**:
- `GET /api/v1/ia/diagnostico` (o la ruta equivalente del motor IA) para obtener resultados del `AgenteDiagnostico`.
- `GET /api/v1/mesas/{id}` con los instrumentos MGA para recuperar los árboles existentes en `motor_instrumentos`.

### Entregables:
1. **`src/features/diagnostico/components/arbol-problemas-view.tsx`** — Visualizador jerárquico interactivo:
   - Selector de Dimensión ONU (las 7 dimensiones sembradas en la BD).
   - Para cada dimensión: muestra el árbol de nodos (`PROBLEMA_CENTRAL` → `CAUSA_DIRECTA` → `CAUSA_INDIRECTA` → `EFECTO_DIRECTO` → `EFECTO_INDIRECTO`) recuperado de la API de instrumentos.
   - Indicador de validación DNP por nodo: ✅ Cumple sintaxis (sustantivo negativo) | ⚠️ Requiere revisión.
   - Botón "Validar con IA" (para `autoridad_distrital`) → llama a `POST /api/v1/ia/diagnostico` con los nodos de la dimensión seleccionada y presenta el resultado del `AgenteDiagnostico` en un panel lateral.
2. **`src/features/diagnostico/panels/validacion-mga-panel.tsx`** — Panel Zero-Modals con el resultado del `AgenteDiagnostico`:
   - `puntaje_coherencia` (0–100), `problema_central_optimizado`, `recomendaciones_dnp[]`.
   - Árbol de Objetivos derivado automáticamente (medios, fines).
   - Exportación a PDF o JSON para presentar ante el DNP.
3. **`src/features/diagnostico/components/convergencia-diagnostica.tsx`** — Vista de síntesis triangulada:
   - Por dimensión: muestra la cantidad de propuestas ciudadanas que se alinean con cada causa del árbol (dato de `participacion_ciudadana.propuestas_ciudadanas`).
   - Alerta si el árbol de causas NO refleja las problemáticas más votadas por la ciudadanía.
   - Implementar como listado comparativo simple, **no** como motor de IA nuevo.

### Restricciones Técnicas Auditables (Criterios EAF):
- **Prohibido**: Re-implementar la lógica de `AgenteDiagnostico` en JavaScript. Consumir únicamente el endpoint `/api/v1/ia/diagnostico`.
- **Prohibido**: Crear nuevas tablas en la BD. Los nodos MGA se leen desde `GET /api/v1/mesas/{id}` o el endpoint de instrumentos existente.
- **Exigido**: El árbol debe cargar desde la API (con skeleton y manejo de error), no desde datos embebidos.

### Verificación EAF:
- Integración funcional con `POST /api/v1/ia/diagnostico` verificada en vivo.
- `bun run check` (0 errores), `node scripts/ui-policy.mjs` (0 infracciones).
- `bun run build` exitoso. HTTP 200 en ruta. Pruebas de acceso actualizadas.

---

## 4. Hito D-3: Geodiagnóstico Territorial (Ficha por UCG y Corregimiento)
**Tipo**: Frontend + Semilla de datos vía API (no migración)
**Justificación normativa**: C.P. Arts. 1 y 2 (Descentralización y Autonomía Territorial); Ley 1617/13 (Estatuto Distrital de Cartagena); Decreto 037/26 — La seguridad humana es territorial y situada; el diagnóstico no puede ser un promedio plano distrital.
**APIs a consumir**:
- `GET /api/v1/geodatos/territorios` (ya existe, retorna las 15 entidades distritales con geometría).
- `GET /api/v1/geodatos/territorios/{id}` (ficha territorial).
- `PUT /api/v1/geodatos/indicadores-territorio` (si existe) o endpoint para poblar `geodatos.indicadores_territorio` con los 15 territorios.

### Entregables:
1. **`src/features/diagnostico/components/perfil-territorial.tsx`** — Ficha diagnóstica por territorio:
   - Nombre del territorio, Localidad, tipo (urbano/rural/insular).
   - Indicadores clave por territorio: nivel de riesgo (Alto/Medio/Bajo), dimensiones prioritarias identificadas en mesas de esa zona, equipamientos de seguridad (CAI, puestos de salud), déficit institucional.
   - Lista de mesas de trabajo realizadas en ese territorio (datos de `mesas_trabajo.mesas` filtradas por `territorio_id`).
   - Conteo de propuestas ciudadanas geolocalizadas en ese territorio.
2. **`src/features/diagnostico/components/mapa-vulnerabilidad.tsx`** — Capa adicional sobre el geovisor existente: colorear los 15 territorios según nivel de riesgo consolidado (Semáforo: Rojo / Ámbar / Verde), basado en los indicadores de `geodatos.indicadores_territorio`.
3. **Semilla de datos de `geodatos.indicadores_territorio`**: Insertar vía `POST /api/v1/...` (o script directo autorizado) al menos 3 indicadores por territorio para los 15 territorios, especialmente para: Localidad 2 (El Pozón, Nelson Mandela, La Boquilla), Localidad 3 (Mamonal, Bosque) y Zona Insular (Tierrabomba, Barú). Fuentes: SIEDCO Local, Cartagena Cómo Vamos 2025, SAT Defensoría del Pueblo.

### Restricciones Técnicas Auditables (Criterios EAF):
- **Prohibido**: Crear un nuevo módulo de geovisor paralelo. Reutilizar los componentes existentes de `src/features/geovisor/`.
- **Exigido**: Si no existe un endpoint para `PUT /api/v1/geodatos/indicadores-territorio`, consultar si la inserción puede hacerse con el endpoint existente o vía un script de semilla autorizado. **No crear una nueva migración Alembic** sin aprobación del EAF.
- **Exigido**: La semilla de indicadores territoriales debe incluir valores reales de Cartagena (con fuente y año de corte explícitos).

### Verificación EAF:
- `SELECT COUNT(*) FROM geodatos.indicadores_territorio;` debe retornar ≥ 30 registros post-semilla.
- `bun run check` (0 errores), `node scripts/ui-policy.mjs` (0 infracciones).
- `bun run build` exitoso. Perfil de al menos una UCG mostrado correctamente.

---

## 5. Resumen de Hitos, Prioridades y Criterios de Auditoría

| Hito | Nombre | Prioridad | Tipo de Trabajo | Criterio Principal EAF |
|:---|:---|:---|:---|:---|
| **D-0** | Purga Pericial del Mock | 🔴 URGENTE | Frontend solo | 0 topónimos ajenos a Cartagena |
| **D-1** | Línea Base Diagnóstica | 🔴 ALTA | Frontend + API existente | Consumo real de `/api/v1/indicadores/*` |
| **D-2** | Árbol de Problemas MGA | 🟡 ALTA | Frontend + API IA existente | Consumo real de `/api/v1/ia/diagnostico` |
| **D-3** | Geodiagnóstico Territorial | 🟡 MEDIA | Frontend + Semilla de datos | ≥ 30 registros en `geodatos.indicadores_territorio` |

---

## 6. Restricciones Transversales para `agy2` (No Negociables)

Las siguientes restricciones aplican a todos los hitos y serán verificadas en la auditoría EAF:

1. **Zero-Modals**: Toda interacción detallada ocurre en paneles laterales `PanelShell`, nunca en `dialog`, `modal` o `popup` flotantes.
2. **Sin persistencia paralela**: Ningún dato de indicadores, árboles o territorios se almacena en Zustand como dato fijo. Toda la persistencia existe en PostgreSQL y se consume vía API.
3. **Sin migraciones nuevas sin autorización EAF**: Si se detecta que falta un endpoint para una operación necesaria, se notifica al EAF antes de crear nuevas tablas o migraciones.
4. **Tokens Semánticos CSS**: Cero colores hex hardcodeados (`#...`). Usar variables de diseño (`var(--surface-1)`, `var(--ember)`, etc.).
5. **TypeScript estricto**: 0 errores de tipo, sin `any`.
6. **Pruebas de acceso**: `acceso.test.ts` debe actualizarse con el módulo `diagnostico`.
7. **Separación de datos demostrativos y persistidos**: El mock de politicas puede tener datos de demostración, la BD tiene datos reales. No mezclar.
8. **Independencia EAF**: `agy2` no puede autofirmarse el dictamen. Todo check que apruebe es evidencia técnica; el dictamen lo emite el Orquestador (Antigravity EAF) después de verificación independiente.
