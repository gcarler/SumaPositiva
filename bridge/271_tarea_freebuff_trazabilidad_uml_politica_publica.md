# ENCARGO 271: Vista de Trazabilidad y Diagrama UML del Ciclo de Vida de una Política Pública

**Destinatario:** `freebuff` (`=freebuff:0.0`)  
**Emisor:** Coordinación General Antigravity (`agy:0.0`)  
**Fecha:** 2026-10-29  
**Estado:** ASIGNADO / EN EJECUCIÓN  

---

## 1. Contexto y Requerimiento del Usuario

El usuario solicita:
> *"asiganle a otro agente la tarea de desarrollar la trazabilidad... Trazabilidad (en preparación) es decir una vista de un uml de como funciona todo el proceso de principio a fin de uan politica publica"*

Actualmente, en el pie de página institucional ([`src/shared/layout/footer.tsx`](file:///root/polis/src/shared/layout/footer.tsx)), *"Trazabilidad"* es el único elemento que permanece como etiqueta inactiva: `Trazabilidad (en preparación)`.

Se requiere:
1. Activar el enlace en el footer hacia `/trazabilidad`.
2. Crear la página institucional interactiva y responsive [`src/app/trazabilidad/page.tsx`](file:///root/polis/src/app/trazabilidad/page.tsx) con un **diagrama UML y mapa de ciclo de vida completo de principio a fin de una política pública**, articulado con el andamiaje metodológico del DNP y el caso específico de Cartagena de Indias (Decreto 037 de 2026, Acuerdo 139 de 2024 y las 7 Dimensiones de Seguridad Humana).

---

## 2. Alcance Metodológico y Estructura del Diagrama UML

El diagrama debe representar la trazabilidad integral del ciclo de la política pública, modelado con lenguaje visual UML (Diagrama de Actividades con Carriles/Swimlanes y Diagrama de Estados):

### A. Carriles de Actores (Swimlanes UML)
1. **Ciudadanía y Comunidades Territoriales:**
   - Participación en las 35 mesas de trabajo en las 3 localidades urbanas y la zona insular/rural.
   - Radicación multicanal (WhatsApp Inbox, Plataforma Web, formularios, actas comunitarias).
   - Veedurías ciudadanas y control social (Ley 1757/2015).
2. **Equipo Técnico Distrital y Sectorial (Planeación, DADIS, Interior, EPA, etc.):**
   - Diagnóstico participativo, análisis causal (Árbol de Problemas: causas raíces y efectos).
   - Formulación de alternativas (Árbol de Objetivos: medios y fines) y evaluación multicriterio MGA.
   - Definición de Líneas Estratégicas (`LE-01` a `LE-28`), sublíneas, indicadores trazadores y metas.
3. **Nivel Político-Normativo (Alcaldía Mayor y Concejo Distrital):**
   - Viabilidad fiscal y articulación con el Plan Plurianual de Inversiones (PPI) y fuentes (FONSET, SGP, SGR, Recursos Propios).
   - Adopción jurídica mediante acto administrativo vinculante (Decreto Distrital 037/2026 / Acuerdo Distrital).
4. **Entidades Ejecutoras y Operadores:**
   - Formulación de proyectos BPIM, licitaciones transparentes, convenios solidarios con Juntas de Acción Comunal (JAC) y ejecución barrial.
5. **Órganos de Control y Monitoreo (Personería, Contraloría, POLIS AI):**
   - Geovisor territorial en tiempo real, tableros de avance físico-financiero, semáforos anticorrupción (Ley 1474/2011) y retroalimentación cíclica.

---

### B. Las 5 Fases Metodológicas del Ciclo
1. **Fase 1: Alistamiento y Diagnóstico Territorial Participativo:**
   - *Entradas:* Problemas percibidos, estadísticas criminales, Terridata, DANE, actas de las 35 mesas.
   - *Procesos:* Identificación de causa raíz, despojo de metadatos/Habeas Data, geocodificación.
   - *Salidas:* Diagnóstico situacional validado y árbol de problemas.
2. **Fase 2: Formulación y Deliberación de Alternativas:**
   - *Entradas:* Diagnóstico situacional, catálogo de buenas prácticas.
   - *Procesos:* Banco de alternativas, ponderación costo-beneficio, estructuración de las 28 líneas estratégicas bajo las 7 Dimensiones de Seguridad Humana.
   - *Salidas:* Portafolio de líneas y sublíneas con metas e indicadores.
3. **Fase 3: Adopción y Plan de Acción e Inversión (FONSET / MPI):**
   - *Entradas:* Portafolio formulado, proyecciones de ingresos distritales.
   - *Procesos:* Armonización presupuestal, priorización en el Consejo de Gobierno, concertación normativa.
   - *Salidas:* Decreto Distrital vinculante, matriz plurianual de inversión y banco de proyectos BPIM.
4. **Fase 4: Implementación, Contratación y Ejecución Territorial:**
   - *Entradas:* Asignación presupuestal, pliegos contractuales.
   - *Procesos:* Ejecución de obras, compras públicas, despliegue de brigadas de salud y programas sociales.
   - *Salidas:* Actividades concluidas, bienes y servicios públicos entregados a la comunidad.
5. **Fase 5: Seguimiento, Auditoría Social y Rendición de Cuentas:**
   - *Entradas:* Reportes de interventoría, monitoreo en geovisor, denuncias ciudadanas.
   - *Procesos:* Cálculo de avance ponderado, evaluación de impacto social y audiencias públicas de rendición de cuentas.
   - *Salidas:* Semáforos de cumplimiento, dictamen de impacto y decisiones de recalibración (bucle de retroalimentación a la Fase 1 o 2).

---

## 3. Experiencia de Usuario y Diseño Visual

La página [`src/app/trazabilidad/page.tsx`](file:///root/polis/src/app/trazabilidad/page.tsx) debe ofrecer:
1. **Layout Responsivo y Centrado:**
   - Contenedor amplio: `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12`.
2. **Vistas Conmutables o Pestañas Interactivas:**
   - **Vista 1: Diagrama Visual de Flujo UML:**
     - Representación gráfica moderna basada en SVG y CSS semántico (cajas de procesos, rombos de decisión con caminos Sí/No, flechas direccionales con conectores visuales y carriles de actores).
     - Diseño responsive: en pantallas de escritorio muestra los swimlanes completos; en móviles permite desplazarse horizontalmente o alternar a una visualización vertical por pasos numerados.
   - **Vista 2: Matriz Detallada de Fases y Artefactos:**
     - Fichas interactivas para cada una de las 5 fases con: *Objetivo, Actores Clave, Entradas, Procesos, Salidas/Entregables, Marco Legal Aplicable y Enlace a los Módulos de POLIS* (ej. Geovisor, Banco de Alternativas, Rendición de Cuentas).
   - **Vista 3: Ciclo de Vida del Dato Ciudadano (Data Lineage):**
     - Explicación gráfica de cómo una propuesta nacida en una mesa de trabajo en Pozón o Barú se convierte en proyecto BPIM, se financia y se supervisa con código de radicado único.
3. **Diseño de Interfaz:**
   - Tarjetas estilizadas con `border border-[var(--border)] bg-[var(--surface-1)]`.
   - Paleta 100% basada en tokens del sistema (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`, `var(--info)`, `var(--success)`).
   - Iconografía representativa de Lucide (`GitFork`, `Layers`, `Workflow`, `FileCheck2`, `ShieldAlert`, `Scale`, etc.).

---

## 4. Modificaciones Requeridas en Código

1. **Footer:**
   - En [`src/shared/layout/footer.tsx`](file:///root/polis/src/shared/layout/footer.tsx), reemplazar el span `Trazabilidad (en preparación)` por:
     ```tsx
     <Link
       href="/trazabilidad"
       className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
     >
       Trazabilidad
     </Link>
     ```
2. **Nueva Ruta:**
   - Crear [`src/app/trazabilidad/page.tsx`](file:///root/polis/src/app/trazabilidad/page.tsx) (y componentes auxiliares si son convenientes, por ejemplo `diagrama-uml-politica.tsx`).

---

## 5. Validaciones Requeridas y Reglas de Coordinación

1. `node scripts/ui-policy.mjs`: Debe pasar con 0 errores (respetar tokens CSS semánticos, no Tailwind literal).
2. `bun run typecheck` (`tsc --noEmit`): Debe finalizar con Exit 0.
3. `bun x eslint` sobre los archivos nuevos y modificados: 0 errores y 0 advertencias.
4. Compilación aislada:
   `POLIS_NEXT_DIST_DIR=.build-test-271 bun run build` (eliminar `.build-test-271` tras validar).
5. **REGLA MANDATORIA DE FLUJO (ORDEN DEL USUARIO):**
   - **NO HACER COMMIT DIRECTO.**
   - Al terminar, preparar informe en `bridge/271_entrega_freebuff_trazabilidad_uml_politica_publica.md`.
   - Notificar a coordinación (`agy:0.0`) vía:
     `tmux send-keys -t agy:0.0 'FREEBUFF-271 terminado: vista de trazabilidad con diagrama UML y enlace en footer implementados y verificados. Listo para revisión de calidad.' Enter`
   - Esperar a la auditoría de calidad de `agy:0.0` antes de proceder al commit.
