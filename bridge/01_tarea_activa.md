# TAREA ACTIVA: [SAN-TERM-02] ERRADICACIÓN DE "SINERGIA" Y "CONPES INSTITUCIONAL" (PRESERVANDO BPIN INTACTO)

**Fecha:** 2026-10-10  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Instrucción expresa del Usuario ("el de BPIN déjalo. Los demás sí puedes cambiarlos, de hecho ¿para qué usar SINERGIA?")  
**Severidad:** MEDIA-ALTA (Identidad Soberana de la Plataforma POLIS y Precisión Jurídico-Institucional)  

---

## 🎯 1. Directriz y Alcance de la Tarea

1. **`BPIN` SE PRESERVA INTACTO AL 100%**:
   - **NO modificar** ninguna mención, variable, label, placeholder o campo relativo a `BPIN` (ej. `Código BPIN`, `codigo_bpin`, etc.). Debe quedar exactamente como está.
2. **`SINERGIA` SE ERRADICA TOTALMENTE EN `src/`**:
   - Sustituir cualquier residuo de `SINERGIA` por la terminología propia de POLIS:
     - `PAS / SINERGIA` $\rightarrow$ `Plan de Acción y Seguimiento (PAS)`.
     - `Cadena de Valor SINERGIA` $\rightarrow$ `Cadena de Valor y Seguimiento`.
     - `rangos SINERGIA` $\rightarrow$ `rangos de semaforización oficial`.
3. **`CONPES DISTRITAL / METODOLOGÍA CONPES` SE SANEAN**:
   - En Cartagena las políticas públicas distritales se adoptan mediante **Decreto Distrital** o acuerdo, tras concepto del **Consejo Distrital de Política Social (CONPOS)**, no como "Documentos CONPES".
   - Sustituir en `src/`:
     - `Fase 4: Validación y Adopción del Documento CONPES Distrital` $\rightarrow$ `Fase 4: Validación y Adopción del Documento de Política Pública Distrital`.
     - `tabulación CONPES` $\rightarrow$ `relatoría técnica`.
     - `recomendaciones para el CONPES distrital` $\rightarrow$ `recomendaciones para la adopción de la política pública distrital`.
     - `adopción de políticas CONPES` $\rightarrow$ `adopción de políticas públicas distritales`.
     - `mesas distritales CONPES` $\rightarrow$ `mesas distritales de seguimiento de políticas públicas`.
   - **PRESERVAR**: Citas textuales a documentos CONPES nacionales vigentes en marcos jurídicos y antecedentes normativos (ej. `CONPES 4040`, `CONPES 3990`, `CONPES 166`, `CONPES 3887`, etc.).

---

## 📋 2. Archivos Específicos a Intervenir

1. **`src/features/seguimiento/views/seguimiento-view.tsx`**:
   - Líneas 262 y 263: Cambiar `(Plan de Acción y Seguimiento PAS / SINERGIA)` por `(Plan de Acción y Seguimiento PAS)`.
   - Línea 424: Cambiar comentario `{/* Tab 2: Cadena de Valor SINERGIA */}` por `{/* Tab 2: Cadena de Valor y Seguimiento */}`.
2. **`src/features/seguimiento/state/cadena-valor-store.ts`**:
   - Línea 68: Cambiar `"Error al cargar la Cadena de Valor SINERGIA"` por `"Error al cargar la Cadena de Valor y Seguimiento"`.
3. **`src/features/seguimiento/state/cadena-valor-store.test.ts`**:
   - Línea 88: Cambiar `"asigna semáforos cromáticos conforme a rangos SINERGIA"` por `"asigna semáforos cromáticos conforme a rangos de semaforización oficial"`.
4. **`src/features/mesas/components/matriz-arbol-relatoria.tsx`**:
   - Línea 602: Cambiar `"Estructuración para tabulación CONPES y cruce territorial"` por `"Estructuración para relatoría técnica y cruce territorial"`.
5. **`src/features/mesas/panels/mesa-panel.tsx`**:
   - Línea 1647: Cambiar `"y recomendaciones para el CONPES distrital…"` por `"y recomendaciones para la adopción de la política pública distrital…"`.
6. **`src/features/politicas/__fixtures__/politicas.fixture.ts`**:
   - Línea 437: Cambiar `"Fase 4: Validación y Adopción del Documento CONPES Distrital"` por `"Fase 4: Validación y Adopción del Documento de Política Pública Distrital"`.
7. **`src/features/politicas/data/entidades-cartagena.data.ts`**:
   - Línea 176: Cambiar `"adopción de políticas CONPES"` por `"adopción de políticas públicas distritales"`.
   - Línea 187: Cambiar `"6 mesas distritales CONPES de seguimiento de políticas públicas"` por `"6 mesas distritales de seguimiento de políticas públicas"`.
   - Línea 211: Cambiar `"conpes"` por `"politica_distrital"`.

---

## 🛡️ 3. Quality Gates Obligatorios

Antes de reportar y entregar a `agy`:
1. `bun run check`: Cero errores en UI-Policy (`node scripts/ui-policy.mjs`), TypeScript estricto (`tsc --noEmit`) y ESLint (`eslint .`).
2. `bun test`: 100% de tests pasando (mínimo 367 pass, 0 fail).
3. `bun run build`: Compilación limpia en Next.js Turbopack (190 rutas generadas).
4. `systemctl restart polis-frontend polis-backend`: Ambos servicios activos.
5. Verificación HTTP en vivo: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/mesas` -> 200.
6. Disciplina de Control de Versiones:
   - Commit atómico local en `main` sin `git push`:
     `fix(branding): [SAN-TERM-02] erradicar SINERGIA y CONPES institucional preservando BPIN`
7. Registrar informe de ejecución en `bridge/02_resultado_agy2.md` y notificar inmediatamente a `agy`.
