# Tarea agy2 — Fase 3: Plan de Acción y Seguimiento
## Hito PAS-3: Rendición de Cuentas y Devolución Motivada Ciudadana (Sentencia C-150 de 2015 y Ley 1757 de 2015)

**Fecha**: 2026-10-03
**Asignado por**: Antigravity (Orquestador Central / Auditoría Forense EAF)
**Ejecutor**: agy2 (Equipo de Desarrollo EDD)
**Estado**: ASIGNADA — EN EJECUCIÓN INMEDIATA
**Ruta**: `/plataforma/seguimiento` (Pestaña "Rendición de Cuentas y Devolución C-150")
**Marco Normativo**: Sentencia C-150 de 2015 de la Corte Constitucional (deber de motivación sustancial y proscripción del descarte silencioso), Ley Estatutaria 1757 de 2015 (Régimen de Participación Ciudadana y Rendición de Cuentas) y Decreto Distrital 037/2026.

---

### 1. Contexto Jurídico y Metodológico
En el marco de la Sentencia C-150 de 2015, la participación ciudadana no es un mero trámite consultivo ni formal; impone a la administración pública el deber jurídico insoslayable de **rendir cuentas y emitir una devolución motivada de razones**:
- Toda propuesta o aporte comunitario que no sea incorporado en el Plan de Acción y Seguimiento (PAS) debe contar con una justificación expresa y causal taxativa (incompetencia constitucional, inviabilidad presupuestal MFMP, incompatibilidad con la LOOT o duplicidad técnica).
- Está **expresamente prohibido el descarte silencioso**.

El backend de POLIS ya cuenta con soporte nativo operativo:
- `GET /api/v1/participacion/consolidado`: Estadísticas multicanal consolidadas de Cartagena (968 participantes, desglose por canal web, mesas barriales y escenarios especiales, distribución territorial en Centro, Pozón, Olaya, La Boquilla).
- `POST /api/v1/ia/devolucion`: Agente de Devolución Ciudadana Motivada con modelo `ResultadoDevolucion` y validación de causales taxativas bajo la Sentencia C-150/15.
- `GET /api/v1/aportes`: Listado de aportes y propuestas comunitarias radicadas.

---

### 2. Objetivos y Requerimientos de Implementación

#### A. Integración de la Tercera Pestaña en `/plataforma/seguimiento`
En `src/features/seguimiento/views/seguimiento-view.tsx`:
1. Agregar la pestaña:
   - **Tab 3: "Rendición de Cuentas (C-150/15)"** (con icono de trazabilidad cívica o balance institucional).
2. Adaptar la cabecera `PageHeader` para contextualizar los tres pilares del PAS:
   - Pestaña 1: Matriz de Compromisos Institucionales.
   - Pestaña 2: Cadena de Valor SINERGIA DNP.
   - Pestaña 3: Rendición de Cuentas y Devolución Motivada Ciudadana.

#### B. Servicio Frontend de Participación y Devolución (`devolucion-api.ts`)
Crear `src/features/seguimiento/services/devolucion-api.ts`:
- Consumir `GET /api/v1/participacion/consolidado` para obtener métricas territoriales y multicanal.
- Consumir o conectar con `POST /api/v1/ia/devolucion` mediante `apiFetch` de `@/core/http/api-client`.
- Proveer catálogo canónico de contingencia (`PROPUESTAS_DEVOLUCION_CARTAGENA`) con al menos 8 propuestas comunitarias representativas de las mesas territoriales de Cartagena (Pozón, Olaya, Mandela, Ciénaga, Boquilla, Bazurto, Isla Barú, San Diego), especificando:
  - Estado de incorporación (`INCORPORADA_TOTAL`, `INCORPORADA_PARCIAL`, `NO_INCORPORADA_MOTIVADA`).
  - Compromiso PAS articulado (para las incorporadas).
  - Causal taxativa y motivación sustancial (para las no incorporadas, e.g. "Competencia exclusiva de la Agencia Nacional de Infraestructura - ANI" o "Superación de techo de endeudamiento MFMP Ley 819/03").

#### C. Modelos y Tipado (`devolucion.ts`)
Crear `src/features/seguimiento/models/devolucion.ts`:
- Interfaces: `PropuestaDevolucion`, `EstadoIncorporacion`, `ConsolidadoParticipacionData`, `CausalDescarteTaxativa`, `FichaDevolucionC150`.
- Enums/constantes con las causales taxativas de la Sentencia C-150/15:
  - `INCOMPETENCIA_LEGAL_LOOT`: Excede facultades distritales (Ley 1454/11).
  - `RESTRICCION_FISCAL_MFMP`: Incompatible con el Marco Fiscal de Mediano Plazo (Ley 819/03).
  - `REQUERIMIENTO_CONSULTA_PREVIA`: Requiere proceso previo con comunidades étnicas (Convenio 169 OIT).
  - `DUPLICIDAD_PROGRAMATICA`: Atendida por programa preexistente distrital o nacional.
  - `INCOMPATIBILIDAD_NORMATIVA`: Contraria a normas de orden público o protección ambiental.

#### D. Componente Visual de Rendición de Cuentas (`rendicion-cuentas-tab.tsx`)
Crear `src/features/seguimiento/components/rendicion-cuentas-tab.tsx`:
1. **Resumen Estadístico Multicanal de Cartagena**:
   - Tarjetas KPI: Gran Total de Participantes (968), Canal Web (209), Mesas Presenciales (189), Escenarios Especiales (570).
   - Tasa de Incorporación Efectiva: Porcentaje de propuestas que impactaron el PAS.
2. **Matriz de Devolución Motivada Ciudadana**:
   - Barra de búsqueda y filtros por territorio (Pozón, Olaya, Boquilla, etc.) y estado de incorporación.
   - Tabla interactiva con columnas: Código/Título de propuesta, Territorio de origen, Estado de Incorporación (con badges semánticos), Compromiso PAS asociado o Causal de devolución, y Acción ("Ver Ficha de Motivación C-150").
   - Botón *"Evaluar Devolución con IA (C-150)"* para ejecutar el agente de motivación.
   - Botón de exportación en CSV (sanitizado contra inyección de fórmulas) y JSON para veedurías ciudadanas.

#### E. Panel Lateral Zero-Modals: Ficha de Devolución C-150 (`devolucion-detalle-panel.tsx`)
Crear `src/features/seguimiento/panels/devolucion-detalle-panel.tsx`:
- ID: `"devolucion-detalle"`.
- Montado sobre `PanelShell`, registrado en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` (ancho fluido, Regla UI004).
- Detalle de la propuesta: autor, fecha de radicación, mesa de participación, contenido original del ciudadano.
- Veredicto institucional motivado:
  - Análisis técnico y normativo de la administración.
  - Causal jurídica taxativa (Sentencia C-150/15).
  - Alternativa de atención ciudadana o canal de gestión remitido.
- Modo inmutable de solo lectura para el rol `auditor_forense`.

#### F. Store Reactivo y Pruebas Unitarias (`devolucion-store.ts`, `devolucion-store.test.ts`)
- Store Zustand para gestionar la matriz de propuestas, filtrado por territorio y estado, y ejecución de la devolución con IA.
- Pruebas unitarias completas:
  - Filtrado reactivo y conteo estadístico multicanal.
  - Generación de causales taxativas C-150/15.
  - Verificación de proscripción del descarte silencioso (100% de propuestas cuentan con estado y razón).

#### G. Control de Acceso (`acceso.ts`, `acceso.test.ts`)
- En `src/features/plataforma/models/acceso.ts`:
  - Registrar el panel `"devolucion-detalle"` en `panelPermitido` para los roles: `autoridad_distrital`, `auditor_forense`, `administrador_identidades`.
- En `src/features/plataforma/models/acceso.test.ts`:
  - Validar los permisos correspondientes.

---

### 3. Quality Gates Obligatorios
1. `node scripts/ui-policy.mjs`: **0 infracciones**.
2. `bun run typecheck`: **0 errores**.
3. `bun run lint`: **0 errores**.
4. `bun run check`: **Aprobado**.
5. `bun test`: **100% pruebas pasando**.
6. `bun run build`: Compilación Turbopack exitosa.
7. `systemctl restart polis-frontend.service` y verificación HTTP 200 en `http://127.0.0.1:3000/plataforma/seguimiento`.
8. Documentación pericial en `bridge/02_entrega_agy2.md` y commits en Git.
9. **NOTIFICACIÓN OBLIGATORIA A ANTIGRAVITY**:
   `tmux send-keys -t agy "He terminado la entrega del Hito PAS-3 (Rendición de Cuentas y Devolución Motivada C-150/15). Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
