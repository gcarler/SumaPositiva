# TAREA ACTIVA — EDIT-15: CULMINACIÓN AL 100% Y BLINDAJE INTEGRAL DE POLIS

**Asignada a**: agy2  
**Supervisor / Auditor**: agy  
**Objetivo**: Dejar la plataforma POLIS al 100% absoluta de conformidad, calidad y operatividad, cerrando todos los hallazgos pendientes, asegurando que todas las suites de prueba pasen al 100% y depurando datos sintéticos de pruebas.

---

## Alcance Técnico por Hito (Commits Atómicos)

### Hito 1: Líneas Estratégicas para las 3 Dimensiones Restantes (AUD20-H04)
1. **Migración Alembic `0050_sembrar_lineas_alimentaria_salud_politica.py` idempotente**:
   - `revision = "0050_lineas_alim_salud_pol"` (27 caracteres $\le 32$), `down_revision = "0049_fuentes_distritales_esp"`.
   - Inserción idempotente (`ON CONFLICT (codigo) DO NOTHING`) en `motor_politicas.lineas_estrategicas`:
     - **`LE-05`**: *Soberanía Alimentaria, Nutrición Comunitaria y Circuitos Cortos de Abastecimiento*
       - `dimension_id`: UUID de `alimentaria` (`01a0f5dd-532e-7906-90af-31d884eba586`).
       - `entidad_lider`: `'Secretaría de Participación y Desarrollo Social'`.
       - `entidades_coresponsables`: `ARRAY['Plan de Emergencia Social Pedro Romero (PES-PR)', 'UMATA']`.
       - `fuentes_financiacion`: `ARRAY['SGP', 'RECURSOS_PROPIOS']`.
       - `costo_estimado`: `18500000000.00`.
       - `descripcion`: `'Garantía progresiva del derecho humano a la alimentación, comedores comunitarios, ollas comunitarias y circuitos cortos de comercialización campesina y pesquera en Cartagena.'`.
       - `problema_abordado`: `'Inseguridad alimentaria y desnutrición en sectores de pobreza extrema y corregimientos.'`.
       - `objetivo_especifico`: `'Asegurar el acceso a alimentos nutritivos y fortalecer la economía popular agropecuaria y pesquera.'`.
     - **`LE-06`**: *Atención Primaria, Salud Mental Barrial y Reducción del Daño*
       - `dimension_id`: UUID de `salud` (`01a0f5dd-532e-7910-8a72-9b61f5ad2a24`).
       - `entidad_lider`: `'Departamento Administrativo Distrital de Salud (DADIS)'`.
       - `entidades_coresponsables`: `ARRAY['Secretaría de Participación y Desarrollo Social', 'ESE Hospital Local Cartagena de Indias']`.
       - `fuentes_financiacion`: `ARRAY['SGP', 'RECURSOS_PROPIOS', 'FONSET']`.
       - `costo_estimado`: `22000000000.00`.
       - `descripcion`: `'Fortalecimiento de la salud mental comunitaria, prevención del consumo de sustancias psicoactivas, reducción del daño y redes barriales de cuidado emocional.'`.
       - `problema_abordado`: `'Aumento en trastornos de salud mental, consumo problemático no atendido y déficit de centros de escucha barrial.'`.
       - `objetivo_especifico`: `'Desplegar equipos comunitarios de salud mental y mitigar factores de riesgo psicosocial en jóvenes.'`.
     - **`LE-07`**: *Transparencia, Cultura de la Legalidad y Garantías para el Liderazgo Social*
       - `dimension_id`: UUID de `politica` (`01a0f5dd-532e-78f9-9b6a-87d6e649c6df`).
       - `entidad_lider`: `'Secretaría del Interior y Convivencia Ciudadana'`.
       - `entidades_coresponsables`: `ARRAY['Escuela de Gobierno y Liderazgo', 'Instituto Comunal de Cartagena (IDACCC)']`.
       - `fuentes_financiacion`: `ARRAY['FONSET', 'RECURSOS_PROPIOS']`.
       - `costo_estimado`: `9500000000.00`.
       - `descripcion`: `'Protección y garantías para líderes y lideresas sociales, prevención de la corrupción, rendición de cuentas permanente y pedagogía para el control social.'`.
       - `problema_abordado`: `'Estigmatización y amenazas contra defensores de DDHH y barreras para la veeduría ciudadana.'`.
       - `objetivo_especifico`: `'Brindar salvaguardas efectivas a la participación comunitaria y consolidar la transparencia institucional.'`.
   - `downgrade()`: `DELETE FROM motor_politicas.lineas_estrategicas WHERE codigo IN ('LE-05', 'LE-06', 'LE-07');`.

---

### Hito 2: Accesibilidad y Componentes Storybook (`bun run ui:test` -> 206/206 Verde)
1. **`src/features/mesas/views/mesas-view.tsx`**:
   - Cambiar la tarjeta de `<motion.button>` a `<motion.div role="article" aria-label={`Mesa ${mesa.nombre}`} ...>` para erradicar el error axe-core `nested-interactive` ocasionado por tener `<Link>` dentro del botón.
   - En el pie de tarjeta, el llamado a ver detalle debe ser un `<button type="button" onClick={() => openPanel("mesa", { mesaId: mesa.id })}>` accesible.
2. **`src/features/mesas/components/matriz-arbol-relatoria.tsx` y `src/features/mesas/panels/mesa-panel.tsx`**:
   - Agregar `aria-label="Dimensión ONU principal"` a todos los `SelectTrigger` que carezcan de etiqueta textual visible.
   - En `matriz-arbol-relatoria.tsx`, envolver el renderizado de árboles dentro de `<TabsContent value="problemas">`, `<TabsContent value="soluciones">`, `<TabsContent value="mml">` bajo el `<Tabs>` raíz, resolviendo la violación `aria-valid-attr-value` de `aria-controls`.
   - En `mesa-panel.tsx` (línea ~921), agregar `aria-label="Filtrar por enfoque diferencial"` al `SelectTrigger`.
3. **`src/app/_stories/reporte-geoespacial.stories.tsx`**:
   - En la historia `FotosLimite`, interceptar o mockear la petición a `/api/v1/evidencias/subir` para que devuelva un payload válido (`archivo_url: URL.createObjectURL(file)`) en el entorno de pruebas sin backend levantado, permitiendo que la interacción cargue las 5 fotos y verifique `img` sin errores.
4. **Verificación**: `bun run ui:test` debe pasar **206/206 tests (0 fallas)**.

---

### Hito 3: Suite E2E de Flujos Críticos (`bun run check:e2e` -> 9/9 Flujos Verde)
1. **`scripts/preparar_entorno_e2e.py`**:
   - Tras clonar la base `polis_test_e2e`, comprobar si `mesas_trabajo.mesas` tiene al menos una mesa. Si está vacía, sembrar una mesa canónica de prueba con `linea_id = (SELECT id FROM motor_politicas.lineas_estrategicas WHERE codigo = 'LE-01' LIMIT 1)` y acuerdos de plenaria iniciales.
   - Comprobar si `participacion_ciudadana.propuestas_ciudadanas` tiene al menos una propuesta de prueba (`publicado = true`) para que el flujo 7 de devolución motivada C-150 encuentre el aporte y radique la motivación sin error.
2. **Verificación**: `bun run check:e2e` debe completar los 9 flujos con persistencia verificada tras recarga y cero violaciones serias de axe-core.

---

### Hito 4: Erradicación de Fallback Silencioso en `mesas-api.ts`
1. **`src/features/mesas/services/mesas-api.ts`**:
   - En `listarMesas()`: eliminar el fallback silencioso `return fallbackListarMesas()`. Si la API responde array vacío, retornar `[]`. Si la API falla, propagar el error al store para que la UI muestre el aviso correspondiente sin engañar con estados cacheados.
   - En `obtenerMesa()`: propagar el error si la mesa remota no existe.

---

### Hito 5: Depuración de Cuentas Sintéticas en `bd_csh` (Post-Respaldo)
1. **Respaldo Forense Obligatorio**:
   - `su - postgres -c "pg_dump -Fc bd_csh" > backups/bd_csh_pre_edit15_purga_usuarios_$(date +%Y%m%d_%H%M%S).dump`.
2. **Purga Segura de Cuentas Sintéticas**:
   - Eliminar de `autenticacion.usuarios` únicamente los usuarios de prueba sintéticos que **no** tengan referencias de auditoría y cuyo correo no sea `admin@cartagena.gov.co` ni `cgonzalezr1988@gmail.com`:
     ```sql
     DELETE FROM autenticacion.usuarios
     WHERE correo NOT IN ('admin@cartagena.gov.co', 'cgonzalezr1988@gmail.com')
       AND id NOT IN (SELECT DISTINCT usuario_id FROM auditoria.registros_auditoria WHERE usuario_id IS NOT NULL);
     ```
   - Verificar conteo resultante y que las cuentas legítimas y de auditoría permanezcan intactas.

---

## Quality Gates Obligatorios
- `bun run check` (0 errores TS, 0 ESLint, UI tokens conformes).
- `bun test` (303 tests pasando).
- `bun run ui:test` (206 tests de Storybook pasando al 100%).
- `bun run check:e2e` (9 flujos E2E pasando con persistencia).
- `backend/.venv/bin/pytest backend/tests/test_*.py` (100% pasando).
- `alembic check` en `polis_test` (0 diffs).
- Cero `git push` a remoto.
- Documentar informe detallado en `bridge/02_resultado_agy2.md` y notificar a `agy`.
