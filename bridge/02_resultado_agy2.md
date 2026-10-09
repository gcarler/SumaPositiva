# INFORME PERICIAL DE EJECUCIÓN — TAREA [GAP-FIX-04]
## HABILITACIÓN DE CRUDS FALTANTES: FICHAS INDICADORES DNP Y MUTACIONES DEL ÁRBOL MGA

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Ejecución:** Viernes, 09 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (Fase 4 del Plan Maestro GAP-FIX)  
**Severidad Mitigada:** ALTA (GAP-04 y GAP-05 erradicados de raíz)  
**Estado de la Entrega:** 100% Ejecutada, Contra-Verificada y Conforme con Quality Gates  

---

## 1. Resumen Ejecutivo de la Intervención [GAP-FIX-04]

En cumplimiento riguroso de las especificaciones técnicas estipuladas en `bridge/01_tarea_activa.md`, `agy2` ha completado la implementación, cableado y validación de los CRUDs faltantes para el módulo de Diagnóstico de POLIS, erradicando los bloqueos operacionales en:
1. **Fichas de Indicadores DNP SINERGIA (`GAP-04`)**: Se habilitó el flujo completo de creación (`POST /api/v1/indicadores/fichas`) y actualización (`PATCH /api/v1/indicadores/fichas/{id}`) con autenticación Bearer token, panel especializado `FichaEditorPanel` (`"ficha-editor"`), botón institucional `+ Nueva Ficha Técnica` en la cabecera de la vista de diagnóstico y botón `Editar` por fila en la tabla de línea base. Se implementó la salvaguarda metodológica DNP que protege la inmutabilidad de la fórmula matemática y línea base en modo edición.
2. **Mutaciones y Conversión Canónica del Árbol MGA (`GAP-05`)**: Se conectaron los endpoints de mutación en PostgreSQL (`POST /api/v1/instrumentos/{id}/convertir-a-objetivos`, `POST /nodos`, `PUT /nodos/{id}` y `DELETE /nodos/{id}`) con la interfaz interactiva `ArbolProblemasView`. El usuario con rol y permiso `instrumentos:gestionar` ahora puede conmutar y generar el árbol de objetivos equivalente en un solo clic, así como agregar, editar y eliminar causas directas/indirectas, efectos directos/indirectos y el problema u objetivo central.

---

## 2. Detalle de Implementación Técnica por Requerimiento

### 2.1. CRUD de Fichas de Indicadores DNP (`GAP-04`)

1. **Modelos DTO en `src/features/diagnostico/models/indicador.ts`**:
   - `FichaIndicadorCrearPayload`: Tipado estricto para `codigo`, `nombre`, `tipo_indicador`, `definicion`, `metodo_calculo`, `unidad_medida`, `sentido_esperado`, `periodicidad`, `linea_base_valor`, `linea_base_anio`, `meta_cuatrienio`, `fuente_datos`, `responsable_reporte`.
   - `FichaIndicadorActualizarPayload`: Tipado estricto para los campos actualizables conforme a la salvaguarda metodológica de FastAPI (`responsable_reporte`, `fuente_datos`, `periodicidad`, `metadatos`).

2. **Servicio API en `src/features/diagnostico/services/indicadores-api.ts`**:
   - `crearFichaIndicador(datos: FichaIndicadorCrearPayload)`: Despacha `POST /indicadores/fichas` inyectando automáticamente el Bearer token de la sesión activa y normalizando la respuesta con `normalizarFicha`.
   - `actualizarFichaIndicador(id: string, datos: FichaIndicadorActualizarPayload)`: Despacha `PATCH /indicadores/fichas/{id}` con autorización Bearer y normalización pericial.

3. **Panel de Edición y Creación `src/features/diagnostico/panels/ficha-editor-panel.tsx`**:
   - Registrado como `"ficha-editor"` en `src/core/panels/panel-store.ts` (`PanelType` y `PanelPropsMap`), en `src/app/_composition/panel-registry.tsx` con carga dinámica y ancho de 680px en `PANEL_WIDTHS`, y habilitado en `src/features/plataforma/models/acceso.ts` (`panelPermitido`).
   - Soporte bi-modal (Creación vs. Edición):
     - **Modo Creación**: Formulario estructurado en 4 secciones (Identificación, Método de Cálculo, Metas y Fuentes) con validación estricta de rangos numéricos y campos obligatorios.
     - **Modo Edición**: Banner pericial de salvaguarda metodológica DNP (Ley 152/94 y C-150/15) que bloquea la modificación de fórmulas matemáticas, líneas base y códigos para proteger la fe pública de la medición, permitiendo actualizar únicamente la gobernanza institucional (responsable, fuentes y periodicidad).

4. **Puntos de Entrada e Integración en UI**:
   - En `src/features/diagnostico/views/diagnostico-view.tsx`: Botón `+ Nueva Ficha Técnica` integrado en la barra de herramientas de la pestaña Línea Base, visible condicionalmente para usuarios con permiso `indicadores:gestionar` o perfil de edición. Al guardar, recarga reactivamente la lista de indicadores y notifica mediante `toast.success`.
   - En `src/features/diagnostico/components/linea-base-tabla.tsx`: Nueva columna de acciones con botón `Editar` (ícono `Pencil`) por fila condicionado a `puedeGestionar`, abriendo el panel de edición con los datos precargados.

### 2.2. Mutaciones y Conversión Canónica del Árbol MGA (`GAP-05`)

1. **Modelos DTO en `src/features/diagnostico/models/mga.ts`**:
   - Tipos canónicos: `TipoRelacionMGA` (`"CENTRAL" | "CAUSA" | "EFECTO" | "MEDIO" | "FIN"`).
   - `NodoInstrumentoCrear`: `tipo_nodo`, `contenido`, `nodo_padre_id`, `tipo_relacion`, `nivel`, `orden`, `metadatos`.
   - `NodoInstrumentoActualizar`: `contenido`, `tipo_nodo`, `nodo_padre_id`, `orden`, `metadatos`, `version_esperada`.

2. **Servicio API en `src/features/diagnostico/services/mga-api.ts`**:
   - `convertirAObjetivos(instrumentoId: string, nombreObjetivos?: string)`: Despacha `POST /instrumentos/{id}/convertir-a-objetivos` con Bearer token (`instrumentos:gestionar`) retornando el `ArbolMGARespuesta` normalizado.
   - `agregarNodoArbol(instrumentoId: string, datos: NodoInstrumentoCrear)`: Despacha `POST /instrumentos/{id}/nodos` con validación de nivel y tipo de relación.
   - `actualizarNodoArbol(instrumentoId: string, nodoId: string, datos: NodoInstrumentoActualizar, ifMatch?: string)`: Despacha `PUT /instrumentos/{id}/nodos/{nodo_id}` soportando control de concurrencia optimista mediante cabecera `If-Match`.
   - `eliminarNodoArbol(instrumentoId: string, nodoId: string)`: Despacha `DELETE /instrumentos/{id}/nodos/{nodo_id}` (retorno 204 No Content).

3. **Interfaz Dinámica en `src/features/diagnostico/components/arbol-problemas-view.tsx`**:
   - **Botón "Convertir a Objetivos"**: Visible en modo de problemas para usuarios con permiso `instrumentos:gestionar` o `diagnostico:gestionar`. Al ser accionado, ejecuta la conversión canónica DNP en backend, actualiza el catálogo distrital, conmuta la vista a `objetivos` y selecciona el nuevo instrumento generado.
   - **Gestión Inline de Nodos**:
     - Botón `+ Agregar Efecto` / `+ Agregar Fin` en cabecera superior y `+ Agregar Causa` / `+ Agregar Medio` en cabecera inferior.
     - Formulario inline con `Textarea` y botones `Guardar` / `Cancelar` para redactar nuevos nodos directos (Nivel 1).
     - Botón `+ Sub-nodo` por cada causa o efecto directo para crear causas o efectos indirectos (Nivel 2).
     - Botón `Editar` (`Pencil`) y `Eliminar` (`Trash2`) en cada nodo (directos, indirectos y nodo central) con edición inline reactiva y confirmación de seguridad.

---

## 3. Pruebas Unitarias Automatizadas

Se ampliaron y validaron las suites unitarias:
1. **`src/features/diagnostico/services/indicadores-api.test.ts` (12 tests verdes)**:
   - Cobertura de normalización y catálogo fallback DNP.
   - Verificación de ausencia de datos ficticios (AUD-14).
   - Verificación de purga pericial de Cartagena (Hito D-0).
   - Test para `crearFichaIndicador` con verificación de payload `POST` y retorno HTTP 201.
   - Test para `actualizarFichaIndicador` con verificación de payload `PATCH` y retorno HTTP 200.
2. **`src/features/diagnostico/services/mga-api.test.ts` (14 tests verdes)**:
   - Cobertura de normalización jerárquica de nodos e instrumentos.
   - Validación sintáctica DNP (detección de soluciones disfrazadas y verbos en infinitivo).
   - Motor determinista de contingencia.
   - Test para `convertirAObjetivos` verificando transformación `ARBOL_PROBLEMAS` -> `ARBOL_OBJETIVOS`.
   - Test para `agregarNodoArbol` verificando creación `POST /nodos`.
   - Test para `actualizarNodoArbol` verificando actualización `PUT /nodos/{id}`.
   - Test para `eliminarNodoArbol` verificando eliminación `DELETE /nodos/{id}`.

Total de tests en el proyecto: **356 pass / 0 fail** en 36 archivos.

---

## 4. Matriz de Quality Gates Validados

| Quality Gate | Herramienta / Comando | Criterio de Aceptación | Resultado Verificado | Estado |
|---|---|---|---|---|
| **UI Policy & a11y** | `bun run ui:check` | 0 violaciones de componentes, tokens, capas y a11y | `POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.` | ✅ APROBADO (0 errores) |
| **Tipado Estricto** | `bun run typecheck` (`tsc --noEmit`) | 0 errores en TypeScript estricto | Cero errores en todo el árbol de dependencias | ✅ APROBADO (0 errores) |
| **Linting** | `bun run lint` (`eslint .`) | 0 advertencias, 0 errores | Cero violaciones ESLint | ✅ APROBADO (0 errores) |
| **Pruebas Unitarias** | `bun test` | 100% de tests pasando (>= 350) | **356 tests pass, 0 fail** (Ran 356 tests across 36 files) | ✅ APROBADO (100% verde) |
| **Compilación de Producción** | `bun run build` | Generación exitosa de todas las rutas Next.js | **190 rutas generadas** (190/190 estáticas/dinámicas) | ✅ APROBADO (Limpio) |
| **Servicio Frontend Activo** | `systemctl restart polis-frontend` | HTTP 200 en `/plataforma/diagnostico` | `curl -s -o /dev/null -w "%{http_code}" .../plataforma/diagnostico` -> **200** | ✅ APROBADO (HTTP 200) |
| **Commit Atómico Local** | `git commit` | Commit en `main` sin `git push` | `f9ce00c feat(diagnostico): [GAP-FIX-04] crud de fichas indicadores dnp y mutaciones del arbol mga` | ✅ APROBADO (Local) |

---

## 5. Control de Integridad y Siguientes Pasos

1. **Protocolo Zero-Push**: No se realizó ningún `git push` a repositorios remotos. Todo el código permanece resguardado en el commit local `f9ce00c` sobre la rama `main`.
2. **Listo para Contra-Auditoría**: Se solicita formalmente al Auditor Forense `agy` la revisión pericial de la Fase 4 para proceder con la homologación o emisión de la siguiente fase del plan de trabajo.
