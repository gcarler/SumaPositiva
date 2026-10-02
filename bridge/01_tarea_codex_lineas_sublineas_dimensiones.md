# TAREA — Constructor y Gestión de Líneas y Sublíneas Estratégicas vinculadas a las 7 Dimensiones (Decreto 037 de 2026 del Ministerio del Interior)

## 1. Contexto Jurídico y Metodológico
Conforme al **Decreto 037 de 2026 del Ministerio del Interior** (norma nacional que reglamenta la política de convivencia y seguridad ciudadana), a la metodología DNP/CONPES y al Banco de Conocimiento de POLIS, la plataforma debe articular **tres niveles jerárquicos estrictos**:

1. **Nivel 1 — Las 7 Dimensiones de la Seguridad Humana (ONU / Decreto 037 de 2026 MinInterior):**
   - *Seguridad Económica, Seguridad Alimentaria, Seguridad en Salud, Seguridad Ambiental, Seguridad Personal, Seguridad Comunitaria, Seguridad Política*.
   - Son el marco superior permanente que agrupa las intervenciones.

2. **Nivel 2 — Líneas Estratégicas (`LineaEstrategica`):**
   - Medios de Primer Nivel del Árbol de Objetivos y componentes del Plan de Acción (PAS).
   - Están vinculadas obligatoriamente a una de las 7 dimensiones y a una fase DNP.
   - Poseen código (`LE-01`), título, problema abordado, objetivo específico, entidad líder, fuentes de financiación (FONSET, SGP, SGR, etc.) y presupuesto estimado.

3. **Nivel 3 — Sublíneas / Ejes de Acción:**
   - Proyectos específicos y medios fundamentales dentro de cada línea estratégica.
   - Tienen código hijo (`LE-01.1`), título del proyecto/programa, meta cuatrienal, indicador DNP y actor corresponsable.

---

## 2. Requerimientos Técnicos

### A. Backend (FastAPI / SQLAlchemy / Pydantic v2)
En `backend/app/modules/politicas/`:
1. **Esquemas:**
   - Definir `SublineaSchema`: `codigo: str`, `titulo: str`, `descripcion: str`, `meta_cuatrienal: str | None`, `indicador_nombre: str | None`, `actor_coresponsable: str | None`.
   - Extender `LineaEstrategicaCreate` y `LineaEstrategicaUpdate` para aceptar `sublineas: list[SublineaSchema] = []`.
   - En el modelo `LineaEstrategica`, persistir `sublineas` estructuradas en el campo `metadatos["sublineas"]` (o relación), preservando compatibilidad con las migraciones existentes.
2. **Endpoints en `router.py`:**
   - `POST /api/v1/politicas/lineas`: Creación autorizada (`politicas:gestionar`).
   - `PUT /api/v1/politicas/lineas/{id}`: Actualización autorizada (`politicas:gestionar`).
   - `DELETE /api/v1/politicas/lineas/{id}`: Eliminación controlada (bloquear si tiene aportes ciudadanos o registros vinculados).

### B. Frontend — Panel Editor Zero-Modals (`src/features/politicas/panels/linea-editor-panel.tsx`)
Crear el panel de administración con React Hook Form + Zod:
- **Nivel 1 (Dimensión):** Selector visual con chips de las 7 Dimensiones de Seguridad Humana (con sus iconos y colores institucionales).
- **Fase DNP:** Selector de fase (Diagnóstico, Formulación, Plan de Acción).
- **Nivel 2 (Línea Estratégica):**
  - Código (ej. `LE-04`), Título, Descripción y Objetivo Específico.
  - Entidad líder (select con secretarías distritales de Cartagena).
  - Fuentes de financiación (multi-select / checkboxes: FONSET, SGP, SGR, ICLD).
  - Costo estimado ($ COP).
- **Nivel 3 (Sublíneas Dinámicas):**
  - Sección interactiva con `useFieldArray`: botón `+ Agregar Sublínea`.
  - Cada sublínea: Código hijo (`LE-04.1`), Título de la intervención, Meta cuatrienal proyectada e Indicador sugerido.
- **Registro:** Registrar `"linea-editor"` en `panel-registry.tsx` y `panel-store.ts`.

### C. Frontend — Vista de Contenido (`src/features/plataforma/views/contenido-view.tsx`)
En la vista `/plataforma/contenido`:
- Crear la pestaña o sección principal **"Arquitectura de la Política Pública: Dimensiones, Líneas y Sublíneas"**.
- Visualización jerárquica en acordeón / tarjetas por Dimensión:
  - Cada una de las 7 Dimensiones muestra sus Líneas Estratégicas asociadas.
  - Al expandir una Línea Estratégica se despliega su tabla de **Sublíneas de acción**, metas e indicadores.
- Botón **`+ Nueva Línea Estratégica`** que abre el panel `linea-editor`.
- Botones de acción por línea: ✏️ Editar (abre panel con datos precargados) y 🗑️ Eliminar.
- Botón **📊 Exportar Matriz Completa (CSV / JSON)** con los tres niveles jerárquicos.

---

## 3. Control de Calidad
```bash
bun run check
bun run build
sudo systemctl restart polis-frontend.service
sudo systemctl restart polis-backend.service
```

## 4. Entrega
Commit descriptivo y documentación en `/root/polis/bridge/02_entrega_codex.md`.
