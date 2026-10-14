# INFORME DE RESULTADO: TAREA [PA-TRANSPARENCIA-03]
## VISOR PÚBLICO CIUDADANO DEL PLAN DE ACCIÓN DNP 2026 (LEY 1474 ART. 74) Y COBERTURA STORYBOOK AXE-CORE MOTOR DNP

**Para:** Coordinador General / Auditor Forense EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 14 de Octubre de 2026  
**Tarea Reportada:** `[PA-TRANSPARENCIA-03] Visor Público Ciudadano del Plan de Acción DNP 2026 y Storybook Motor DNP`  
**Referencia Metodológica y Legal:** Ley 1474 de 2011 (Art. 74 - Estatuto Anticorrupción) · Ley 152 de 1994 (Art. 41) · Kit Financiero DNP / MHCP · Instructivo del Plan de Acción SisPT DNP · WCAG 2.1 AA (axe-core)  
**Commit Local:** `b91bba7` en rama `main` (**Política Zero-Push Cumplida**)  

---

## 🎯 1. Resumen Ejecutivo de la Entrega

Dando cumplimiento a la **Actividad 3** y cierre definitivo del **Plan Maestro del Motor de Procesamiento de Planes de Acción DNP (`PLAN_MAESTRO_MOTOR_PLAN_ACCION_DNP.md`)** asignada en `bridge/01_tarea_activa.md`, se llevó a producción:

1. **Visor Público Ciudadano del Plan de Acción DNP 2026 (`src/features/politicas/panels/rendicion-cuentas-panel.tsx`):**
   - Incorporado un selector de vista accesible mediante `Button variant="unstyled" size="unstyled"`:
     - **Vista 1 (por defecto): `27 Dependencias Distritales`**, preservando intacto todo el ecosistema de búsqueda, filtros de semáforo (en meta, en curso, en alerta), mosaico expandible y canales de atención ciudadana para las dependencias distritales.
     - **Vista 2: `Matriz Plan de Acción DNP 2026 (Ley 1474)`** (`data-testid="tab-publico-plan-accion-dnp"`).
   - Carga instantánea con fallback canónico inmediato desde `ACTIVIDADES_PA_CANONICAS` y sincronización asíncrona mediante `obtenerMatrizPlanAccionApi({ vigencia: 2026 })`.
   - **Tarjeta de Certificación Legal de Transparencia (Art. 74 Ley 1474 de 2011 + Art. 41 Ley 152 de 1994):**
     - Sello oficial visible: `PUBLICADO EL 31 DE ENERO DE 2026 — ESTATUTO ANTICORRUPCIÓN (LEY 1474 ART. 74)`.
     - Badge de aprobación formal: `Aprobado en Consejo de Gobierno`.
     - 4 KPIs ejecutivos auditados:
       - **Total Actividades Programadas:** `12` canónicas.
       - **Verbos Fuertes Validados DNP:** `100%` en infinitivo (`-ar/-er/-ir`).
       - **Inversión Total Programada 2026:** Formato COP ($9.390 Millones), discriminando **Recursos Propios POAI Alcaldía** vs. **Fuentes Externas (SGR, PGN, Cooperación, Crédito)**.
       - **Avance Físico Promedio Ponderado:** `88.0%` a corte de auditoría institucional con barra de progreso semántica.
   - **Buscador Multicriterio y Filtro Rápido por Línea Estratégica:**
     - Botones tipo píldora para `Todas`, `LE-01`..`LE-08` con estilos semánticos interactivos.
     - Buscador por texto en tiempo real sobre código de actividad, código secuencial, descripción, verbo fuerte, entidad responsable, código BPIM o nombre del proyecto.
   - **Listado de 12 Actividades en Tarjetas de Control Social Ciudadano:**
     - Cabecera con código canónico (`PA-2026-L01-01`..`PA-2026-L06-01`), código secuencial (`PA-2026-001`..`PA-2026-012`), código BPIM (`2026130010001`..`2026130010012`), etiqueta de `Tipo de Meta` (`PRODUCTO`, `GESTIÓN`, `ACTIVIDAD`) y badge del **Verbo Fuerte DNP** (`Verbo DNP: Expedir`, `Instalar`, `Colocar`, `Verificar`, `Diseñar`, `Ejecutar`, `Adecuar`, `Crear`, `Adoptar`, `Firmar`, `Identificar`, `Notificar`).
     - Articulación visible con la **Hoja 2 Plan Indicativo PDD** mostrando Columna D (Programa) y Columna E (Meta de Producto), junto al código de Compromiso PAS vinculado.
     - Cuadrícula de seguimiento trimestral con bloques individuales para `T1`, `T2`, `T3` y `T4`.
     - Avance físico (%) con barra de ejecución e inversión programada vs. ejecutada con porcentaje de ejecución financiera y detalle de fuentes y categorías de recursos.
   - **Pie de Auditoría:** Enlace directo mediante `Button asChild variant="outline"` hacia `/plataforma/seguimiento` (*«Abrir Workbench Técnico DNP / SisPT en Plataforma»*) para enlaces sectoriales y auditores.

2. **Historia Storybook WCAG 2.1 AA (`src/app/_stories/plataforma-interna.stories.tsx`):**
   - Añadida la historia exportada `MotorPlanAccionDNP` montando `MotorPlanAccionTab` (modo edición habilitado) y `BancoConocimientoDNPTab` dentro de `PlataformaShell` con su `PanelHost`.
   - Verificación funcional con `play` asegurando visibilidad del Motor, el Kit Financiero MHCP/DNP y el Marco Normativo Territorial.
   - Aprobación al **100% de la suite Storybook axe-core** (`213 / 213 tests passed` en 17 archivos de prueba).

3. **Pruebas Unitarias Frontend (`src/features/politicas/__tests__/rendicion-cuentas-panel.test.tsx`):**
   - 7 pruebas unitarias exhaustivas con 110 asserciones cubriendo:
     - Renderizado de la vista institucional de 27 dependencias oficiales con sus semáforos.
     - Existencia del selector de vista con `data-testid="tab-publico-plan-accion-dnp"`.
     - Exhibición del sello de certificación legal del Estatuto Anticorrupción Ley 1474 Art. 74.
     - Verificación de los 4 KPIs ejecutivos consolidados sobre las 12 actividades.
     - Funcionamiento de los filtros de Línea Estratégica LE-01 a LE-08 y buscador.
     - Verificación de los 12 códigos de actividad (`PA-2026-001`..`PA-2026-012`), 12 códigos BPIM y 12 verbos fuertes DNP en infinitivo.
     - Verificación de la articulación con Hoja 2 (Columnas D y E) y avance trimestral T1-T4.
     - Presencia del botón al Workbench Técnico DNP en Plataforma.

4. **Sincronización de Modelo SQLAlchemy Backend (`backend/app/modules/compromisos/models.py`):**
   - Alineados `__table_args__` incorporando `Index("idx_actividades_pa_metadatos_gin", "metadatos", postgresql_using="gin")`.
   - Ajustada la relación de clave foránea `compromiso_pas_codigo` con `ForeignKey("seguimiento.compromisos_pas.codigo", ondelete="RESTRICT")`.
   - Verificación de `alembic check` sin diferencias pendientes (`AutogenerateDiffsDetected: 0`).

---

## 🏗️ 2. Resumen de Archivos Creados y Modificados

| Archivo | Tipo de Cambio | Propósito |
| :--- | :---: | :--- |
| `src/features/politicas/panels/rendicion-cuentas-panel.tsx` | Modificado | Selector de vistas, Tarjeta Legal Ley 1474, KPIs ejecutivos, filtros LE-01..LE-08, tarjetas de actividades y enlace al workbench |
| `src/features/politicas/__tests__/rendicion-cuentas-panel.test.tsx` | **Creado** | Suite unitaria completa (7 tests, 110 asserciones) para la vista institucional y ciudadana DNP |
| `src/app/_stories/plataforma-interna.stories.tsx` | Modificado | Historia exportada `MotorPlanAccionDNP` con prueba `play` y validación `axe-core` |
| `src/features/seguimiento/services/plan-accion-dnp-api.ts` | Modificado | Exportados alias canónicos `ACTIVIDADES_PLAN_ACCION_CANONICAS` y `obtenerMatrizPlanAccion`, con búsqueda ampliada en fallback |
| `src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx` | Modificado | Exportado alias `BancoConocimientoDnpTab` |
| `backend/app/modules/compromisos/models.py` | Modificado | Alineación de índice GIN en `metadatos` y `ForeignKey` en `compromiso_pas_codigo` con migración 0062 |

---

## 🧪 3. Resultados de los Quality Gates Obligatorios

| Quality Gate | Comando / Suite | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Backend Unit & Flow** | `PYTHONPATH=backend /root/polis/venv/bin/pytest backend/tests/ -k "plan_accion"` | **7 / 7 PASSED** | Cruce Hoja 2, exención Pág. 11, verbos débiles, autocorrección y dictamen |
| **Backend Migraciones** | `PYTHONPATH=. pytest tests/test_identidad_migracion.py tests/test_database_integration.py` | **2 / 2 PASSED** | `alembic check` limpio, 0 diffs detectadas tras alineación de modelo |
| **Frontend Unit** | `bun test` | **601 / 601 PASSED** | 70 archivos en verde (incluyendo 7/7 en `rendicion-cuentas-panel.test.tsx` y 15/15 en `motor-plan-accion.test.tsx`) |
| **Diseño y Tipado** | `bun run check` | **0 ERRORES** | `ui:check` OK, `tsc --noEmit` OK, `eslint .` OK |
| **Storybook & a11y** | `bun run ui:test` | **213 / 213 PASSED** | 100% de historias aprobadas con `axe-core` (incluyendo nueva historia `MotorPlanAccionDNP`) |
| **Compilación Producción** | `bun run build` | **192 / 192 RUTAS** | Next.js Turbopack SSG/SSR compilado exitosamente |
| **Censo Base de Datos** | PostgreSQL `bd_csh` | **100% INTACTO** | 33 mesas, 36 agendas, 11 fichas, 17 actores, 10 compromisos PAS, 12.280 hurtos, 12 actividades PA |
| **Servicios del Sistema** | `systemctl restart polis-backend && systemctl restart polis-frontend` | **ACTIVE (running)** | Backend y Frontend reiniciados limpiamente |
| **Control de Versiones** | `git commit` en rama `main` | **b91bba7** | Commit local realizado bajo la política Zero-Push |

---

## 📋 4. Verificación de Censo Institucional en `bd_csh`

```sql
SELECT 'mesas' AS tabla, count(*) FROM mesas_trabajo.mesas
UNION ALL
SELECT 'agendas', count(*) FROM mesas_trabajo.agendas
UNION ALL
SELECT 'fichas', count(*) FROM indicadores.fichas_tecnicas_indicadores
UNION ALL
SELECT 'actores', count(*) FROM participacion_ciudadana.actores_estrategicos
UNION ALL
SELECT 'compromisos_pas', count(*) FROM seguimiento.compromisos_pas
UNION ALL
SELECT 'estadisticas_hurtos', count(*) FROM geodatos.estadisticas_hurtos
UNION ALL
SELECT 'actividades_pa', count(*) FROM seguimiento.actividades_plan_accion;
```

**Resultado:**
- `mesas`: **33** (inviolable)
- `agendas`: **36** (inviolable)
- `fichas`: **11** (inviolable)
- `actores`: **17** (inviolable)
- `compromisos_pas`: **10** (inviolable)
- `estadisticas_hurtos`: **12.280** (inviolable)
- `actividades_pa`: **12** (inviolable)

---

## 🏁 5. Conclusión y Notificación

La **Actividad 3 (`[PA-TRANSPARENCIA-03]`)** y el **Plan Maestro del Motor de Procesamiento de Planes de Acción DNP** han sido completados en su totalidad. El visor ciudadano en el portal público `/` cumple rigurosamente con el mandato de transparencia del Estatuto Anticorrupción (Ley 1474 de 2011 Art. 74) y la Ley 152 de 1994 (Art. 41), respaldado por una suite de pruebas frontend y backend al 100% y cobertura de accesibilidad `axe-core` en Storybook.
