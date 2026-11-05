# ENCARGO 293: Página Interactiva de Seguridad Humana Integral, Infografía Dinámica y Caja de Herramientas Pedagógica (ABC)

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Solicitud del usuario:**
  *"Vamos a crear una página donde expliquemos este concepto de seguridad humana integral. La idea es que sea súper dinámica, súper fluida y clave si esa página puede contar con una infografía o que cualquier ciudadano o funcionario pueda entender este tema de seguridad humana integral y pueda documentarse. Es decir puede tener documentos de referencia, puede tener un documento que descargue para aprender más sobre la seguridad humana integral, entonces podríamos organizar algo así como una caja de herramientas en ese sitio donde se explica qué es la política de seguridad humana, para qué sirve, cuáles son los alcances, qué no es política de seguridad humana y qué sí es seguridad humana; crear también una pequeña caja de herramientas donde existan diferentes documentos, presentaciones en google sheet (publicadas en formato pdf), documentos que expliquen de una manera elaborada qué es esto de política de seguridad humana integral, un documento que se llame ABC de la política de seguridad humana integral... ese trabajo se lo podemos dar a agy2"*
- **Archivo de Entrega Esperado:** `bridge/293_entrega_agy2_pagina_seguridad_humana_caja_herramientas.md`

---

## 1. Objetivos del Encargo

Diseñar, implementar y desplegar en el frontend de POLIS una nueva página institucional y pedagógica dedicada en la ruta `/seguridad-humana` (accesible para cualquier ciudadano o servidor público), que explique con máxima claridad visual, fluidez y rigor doctrinal el paradigma de la **Seguridad Humana Integral**.

---

## 2. Los Cuatro (4) Productos Obligatorios de Entrega

El usuario ha definido taxativamente los cuatro productos que componen esta entrega:

### 📦 PRODUCTO 1: Punto de Entrada — Opción de Menú y CTA Destacado en el Home
- **Botón / Menú / CTA:** En el Topbar y/o en la vista de Inicio (`src/app/page.tsx` o vista Home), incluir un botón destacado y un Call To Action (CTA) que invite a la ciudadanía y a los funcionarios con el texto explícito:
  - *"Saber más sobre la Política de Seguridad Humana Integral"* (o *"Conoce qué es la Seguridad Humana Integral"*).
- Al hacer clic, debe redirigir fluidamente al Producto 2 (`/seguridad-humana`).

### 📦 PRODUCTO 2: Página Pedagógica en Lenguaje Ciudadano (`/seguridad-humana`)
- Página web completa dentro de la plataforma ([`src/app/seguridad-humana/page.tsx`](file:///root/polis/src/app/seguridad-humana/page.tsx)) redactada en un lenguaje claro, accesible y cercano para cualquier persona sin formación técnica o jurídica.
- Desarrollar las secciones clave:
  1. **¿Qué es la Política de Seguridad Humana Integral?**
  2. **¿Para qué sirve al habitante de Cartagena y a la administración distrital?**
  3. **¿Cuáles son sus alcances territoriales e institucionales?**
  4. **Bloque comparativo didáctico:**
     - *¿Qué NO es la Política de Seguridad Humana?* (desmitificar que sea solo policía, fuerza reactiva o promesas sin presupuesto).
     - *¿Qué SÍ es Seguridad Humana Integral?* (garantía preventiva de derechos, vida digna, participación ciudadana vinculante).

### 📦 PRODUCTO 3: Infografía Gráfica e Interactiva de Seguridad Humana
- Componente infográfico dinámico, visual y pedagógico que sintetice gráficamente el ecosistema:
  - **Los 3 Pilares Universales de la ONU (Resolución 66/290):**
    1. *Libertad frente al miedo*
    2. *Libertad frente a la necesidad*
    3. *Libertad para vivir con dignidad*
  - **Las 7 Dimensiones Integrales:**
    - Iconografía, tarjetas activas y ejemplos cotidianos de Cartagena para cada una: *Personal, Comunitaria, Económica, Ambiental, Alimentaria, Salud y Política*.

### 📦 PRODUCTO 4: Caja de Herramientas Pedagógica y Documental (Toolbox Ciudadano)
- Sección estructurada dentro de `/seguridad-humana` que organice los materiales de estudio y descarga:
  1. **Documento Central de Fuente Propia:** **"ABC de la Política de Seguridad Humana Integral de Cartagena"** (documento elaborado con preguntas frecuentes, glosario y guía de participación, disponible para lectura interactiva y descarga).
  2. **Presentación Oficial Publicada en PDF:** Enlace y visualizador de la presentación ejecutiva sobre el diagnóstico de seguridad humana en Cartagena (`diagnostico27102026.pdf` / Google Slides).
  3. **Documentos de Referencia Internacional (ONU):** Enlaces y fichas de la Resolución 66/290 de la Asamblea General y el Informe Mundial de Desarrollo Humano del PNUD (1994).
  4. **Matriz en Hoja de Cálculo / PDF:** Metas y series históricas de los 8 Planes de Desarrollo Distrital de Cartagena.
  5. **Recursos de Profundización:** Enlace al Marco Legal (`/marco-legal`), al Geovisor (`/geovisor`) y al formulario público de aportes comunitarios.

---

## 3. Verificaciones y Quality Gates Obligatorios

1. **Linter de Tokens y A11y:**
   `node scripts/ui-policy.mjs` (0 violaciones de tokens de color, componentes ni accesibilidad).
2. **Chequeo de Tipos:**
   `bun run typecheck` (0 errores de TypeScript).
3. **Suite de Pruebas Unitarias:**
   `bun test` (1609+ pruebas pasando sin regresiones).
4. **Compilación de Producción:**
   `node scripts/build-polis.mjs` (compilación standalone sin fallas).
5. **Reglas de Entrega:**
   - **NO hacer git commit ni git push.**
   - Registrar la entrega formal en `bridge/293_entrega_agy2_pagina_seguridad_humana_caja_herramientas.md`.
   - Notificar a `agy:0.0` al concluir.
