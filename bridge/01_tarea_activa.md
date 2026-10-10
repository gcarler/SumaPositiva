# TAREA ACTIVA: [SAN-TERM-01] SANEAMIENTO Y ERRADICACIÓN INTEGRAL DE MARCAS "DNP" Y "MGA" EN LA PLATAFORMA POLIS

**Fecha:** 2026-10-10  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Instrucción expresa de Supervisión / Usuario ("no puedes usar los nombres DNP o MGA ni nada de eso por el estilo porque DNP es: Departamento Nacional de Planeación; MGA es Metodología General Ajustada. Esos nombres son propios y no aplican en la plataforma")  
**Severidad:** ALTA (Cumplimiento de Identidad Territorial, Rigor Metodológico y Soberanía Institucional de POLIS)  

---

## 🎯 1. Objetivo y Fundamento Institucional

El usuario y la supervisión han emitido una directriz taxativa: **DNP** (*Departamento Nacional de Planeación*) y **MGA** (*Metodología General Ajustada*) son denominaciones, marcas y sistemas propios del orden nacional que **no corresponden a la identidad ni al alcance de POLIS**, la cual es una plataforma distrital de participación y formulación territorial.

Por ende, se debe realizar un saneamiento integral en toda la interfaz de usuario, navegación, paneles, componentes, vistas, textos de ayuda, tooltips, modales, descripciones, breadcrumbs y fixtures, reemplazando dichas siglas por la terminología metodológica propia y neutral de POLIS.

---

## 📋 2. Matriz Obligatoria de Sustitución Terminológica

| Término Prohibido | Término Oficial POLIS (Sustituto Aprobado) | Contexto de Aplicación |
| :--- | :--- | :--- |
| **Papelógrafo MGA** | **Papelógrafo** / **Papelógrafo de Mesas** | Sidebar institucional, navegación, títulos de panel |
| **Generar borrador DNP** | **Generar borrador técnico** / **Memoria técnica** | Botones de relatoría y mesas |
| **Matriz DNP / Marco Lógico** | **Matriz de Problemas y Soluciones** / **Matriz de Relatoría** | Pestañas de papelógrafo y relatoría de mesa |
| **Control de Fases DNP** | **Control de Fases de Política** / **Fases de la Política** | Menú lateral institucional y panel de fases |
| **Fases DNP en curso** | **Fases de formulación en curso** | Vistas de inicio y métricas de políticas |
| **Indicadores DNP** | **Fichas de Indicadores** / **Indicadores de Seguimiento** | Menú lateral, cabeceras, tablas y filtros |
| **Ficha Técnica DNP** | **Ficha Técnica de Indicador** / **Ficha de Indicador** | Paneles de detalle y modales de edición |
| **Banco de Alternativas MGA** | **Banco de Alternativas de Solución** | Menú, breadcrumbs y paneles de alternativas |
| **Diagnóstico MGA** / **Validación MGA** | **Diagnóstico Territorial** / **Validación Metodológica** | Paneles de diagnóstico y árbol causal |
| **Línea Base DNP** | **Línea Base de Diagnóstico** | Paneles y tablas de indicadores base |
| **Metodología DNP · Cadena de Valor** | **Metodología de Cadena de Valor** | Tableros de seguimiento y rendición de cuentas |
| **Agente IA DNP** | **Agente IA de Evaluación Metodológica** | Auditoría y evaluación de propuestas/devolución |
| **Ley 1757 / DNP** | **Ley 1757 de Participación Ciudadana** | Desglose de enfoques diferenciales y quórum |

---

## 🛠️ 3. Alcance de Archivos y Tareas Específicas

### 3.1. Navegación Global y Sidebar (`src/app/`)
1. **`src/app/_components/sidebar-institucional.tsx`**:
   - Reemplazar etiqueta `Control de Fases DNP` por `Control de Fases de Política`.
   - Reemplazar etiqueta `Papelógrafo MGA` por `Papelógrafo`.
   - Reemplazar etiqueta `Indicadores DNP` por `Fichas de Indicadores`.
2. **`src/app/_components/sidebar-institucional.test.ts`**:
   - Actualizar los títulos de suites y aserciones para reflejar los nuevos textos ("Papelógrafo", "Fichas de Indicadores", etc.).
3. **`src/app/_composition/panel-registry.tsx`**:
   - Mantener el ID técnico del panel pero verificar que títulos y labels no expongan "MGA" ni "DNP".

### 3.2. Mesas de Trabajo y Papelógrafo (`src/features/mesas/`)
1. **`src/features/mesas/panels/papelografo-panel.tsx`**:
   - Cambiar encabezado y selector: `Vista Matriz DNP / Marco Lógico` -> `Vista Matriz de Diagnóstico y Relatoría` o `Vista Matriz / Marco Lógico`.
2. **`src/features/mesas/panels/mesa-panel.tsx`**:
   - Cambiar botón: `Generar borrador DNP` -> `Generar borrador técnico`.
   - Cambiar toast: `"Borrador técnico de relatoría generado conforme a lineamientos DNP."` -> `"Borrador técnico de relatoría generado exitosamente."`.
   - Cambiar label: `Participación por Enfoque Diferencial (Ley 1757 / DNP):` -> `Participación por Enfoque Diferencial (Ley 1757):`.
   - Cambiar subsección: `Memoria técnica y relatoría narrativa (Redacción formal DNP / CONPES)` -> `Memoria técnica y relatoría narrativa formal`.
3. **`src/features/mesas/components/matriz-arbol-relatoria.tsx`**:
   - Cambiar títulos que contengan `(DNP / CONPES)` o `MML DNP` por `(Marco Lógico y Relatoría Técnica)`.
4. **`src/features/mesas/panels/mesa-acta-panel.tsx`**:
   - Cambiar `Desglose Poblacional y Étnico (Ley 1757 / DNP):` -> `Desglose Poblacional y Étnico (Ley 1757):`.
5. **`src/features/mesas/data/agenda-contenido.data.ts`**:
   - Reemplazar menciones en textos de agenda comunitaria como `papelógrafos DNP` por `papelógrafos de mesas de trabajo` o `papelógrafos comunitarios`.

### 3.3. Diagnóstico y Alternativas (`src/features/diagnostico/` y `src/features/alternativas/`)
1. **`src/features/alternativas/`**:
   - En `alternativa-editor-panel.tsx`, `asignacion-presupuestal-panel.tsx`, `evaluacion-viabilidad-panel.tsx`, breadcrumbs: cambiar `Banco de Alternativas MGA` por `Banco de Alternativas de Solución`.
   - En tablas y vistas: sanear etiquetas visibles al usuario.
2. **`src/features/diagnostico/`**:
   - En `medicion-editor-panel.tsx`: cambiar breadcrumb `Línea Base DNP` por `Línea Base de Diagnóstico`.
   - En `validacion-mga-panel.tsx`: cambiar breadcrumb `Diagnóstico MGA` por `Diagnóstico Territorial`.

### 3.4. Seguimiento, Cadena de Valor e Indicadores (`src/features/seguimiento/`)
1. **`src/features/seguimiento/panels/indicador-detalle-panel.tsx`**:
   - Cambiar títulos: `Ficha Técnica DNP` -> `Ficha Técnica de Indicador`.
   - Cambiar etiquetas: `Tarjeta de Metadatos Clave DNP` -> `Tarjeta de Metadatos Técnicos`.
   - Cambiar salvaguarda: `Salvaguarda Metodológica DNP` -> `Salvaguarda Metodológica de Indicadores`.
2. **`src/features/seguimiento/components/cadena-valor-tab.tsx`**:
   - Cambiar banner: `Metodología DNP · Cadena de Valor` -> `Metodología de Cadena de Valor y Gestión por Resultados`.
   - Cambiar botón: `Ver Ficha Técnica DNP` -> `Ver Ficha Técnica de Indicador`.
3. **`src/features/seguimiento/components/rendicion-cuentas-tab.tsx`**:
   - Cambiar label: `Dictamen Oficial del Agente IA DNP` -> `Dictamen Oficial del Agente IA de Evaluación Metodológica`.
4. **`src/features/seguimiento/views/seguimiento-view.tsx`**:
   - Cambiar pestañas y textos: `Cadena de Valor SINERGIA (DNP)` -> `Cadena de Valor y Seguimiento`.

### 3.5. Políticas e Inicio (`src/features/politicas/`)
1. **`src/features/politicas/views/inicio-view.tsx` y `explorar-view.tsx`**:
   - Cambiar `Fases DNP en curso` -> `Fases de política en curso`.
   - Cambiar `Filtro por Fase DNP` -> `Filtro por Fase de Política`.
   - Cambiar `Metodología DNP & CONPES` -> `Metodología de Ciclo de Políticas Públicas`.
2. **`src/features/politicas/panels/fases-control-panel.tsx`**:
   - Cambiar breadcrumb `Fases DNP` -> `Fases de la Política`.

---

## 🛡️ 4. Quality Gates Inviolables

Antes de entregar y solicitar contra-auditoría pericial:
1. `bun run check`: Cero errores en UI-Policy, TypeScript estricto (`tsc --noEmit`) y ESLint (`eslint .`).
2. `bun test`: 100% de tests pasando (mínimo 367 tests pasando, 0 fallas; actualizar las aserciones de pruebas que esperaban los textos antiguos).
3. `bun run build`: Compilación limpia en Next.js Turbopack (190 rutas generadas).
4. `systemctl restart polis-frontend polis-backend`: Reinicio y verificación de ambos servicios activos.
5. Verificación HTTP en vivo: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/mesas` -> 200.
6. Disciplina de Control de Versiones:
   - Commit atómico local en `main` sin `git push`:
     `fix(branding): [SAN-TERM-01] erradicar denominaciones ajenas DNP y MGA en UI de plataforma POLIS`
7. Registrar informe detallado de ejecución en `bridge/02_resultado_agy2.md` y notificar a `agy`.
