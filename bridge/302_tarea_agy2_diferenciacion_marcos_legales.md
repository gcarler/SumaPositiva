# ENCARGO 302: Diferenciación Estructural del Marco de la Política Pública de Seguridad Humana vs. Marco Legal de la Plataforma POLIS en `/marco-legal`

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05 · **Estado:** ASIGNADO
- **Origen:** Dictamen de usuario:
  > *"el https://seguridadhumanaintegral.org/marco-legal#distrital (Marco legal y doctrinal de POLIS) no es el mismo de marvo de la politica d eseguridad humana, deben existir los dos marcos, eso esta claro, pero n son lo mismo. iuno es el marco legal de lplataforma y otro es el de la politica de seguridad humana integral"*
- **Regla rectora de decisión:** *"ANTE UNA OPCIÓN, SI NO TE RESPONDO ESCOGE SIEMPRE LA MAS PRO, NO LA MAS FACIL O LA DE MENOS TRABAJO"*.
- **Entrega esperada:** `bridge/302_entrega_agy2_diferenciacion_marcos_legales.md`

---

## 1. Diagnóstico y Problema Conceptual a Resolver

Actualmente, `src/app/marco-legal/page.tsx` titula toda la página como **"Marco legal y doctrinal de POLIS"** y fusiona indistintamente en un listado plano de 5 secciones elementos que pertenecen a dos esferas jurídicas e institucionales completamente diferentes:

1. **Marco A — Política Pública de Seguridad Humana Integral y Convivencia Ciudadana (Distrito de Cartagena de Indias):**
   - Fundamento superior: Constitución Política de Colombia 1991 (Dignidad Humana Art. 1, Fines esenciales Art. 2, Derecho a la Vida y Seguridad Personal Art. 11, Derecho a la Paz Art. 22).
   - Marco de Política Pública Nacional: Ley 2294 de 2023 (Plan Nacional de Desarrollo *"Colombia Potencia Mundial de la Vida"*, Eje Seguridad Humana y Justicia Social).
   - Marco Distrital de la Política Pública de Cartagena de Indias:
     * **Acuerdo Distrital 139 de 2024:** Plan de Desarrollo *"Cartagena, Ciudad de Derechos"* (2024–2027), Línea Estratégica 1: Seguridad Humana.
     * **Decreto Distrital 037 de 2026:** Formulación participativa, adopción y seguimiento de la Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC) en las 3 localidades, 15 UCGs, zona rural e insular mediante 35 mesas territoriales.
     * **Decreto Distrital 1070 de 2021:** Ciclo metodológico oficial de formulación de políticas públicas distritales (Secretaría de Planeación Distrital de Cartagena).
   - Doctrina Internacional de Seguridad Humana:
     * **Resolución 66/290 de la Asamblea General de la ONU (2012):** Consenso global de seguridad humana centrado en las personas (libertad frente al miedo, libertad frente a la necesidad, libertad para vivir con dignidad).
     * **Informe sobre Desarrollo Humano del PNUD (1994):** 7 dimensiones canónicas integrales (Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria y Política).
     * **Agenda 2030 y ODS:** ODS 1, 2, 3, 5, 8, 10, 11, 13, 16.
   - Salvaguardas Éticas y Enfoques:
     * Acción sin daño, no revictimización, confidencialidad reforzada para líderes sociales y víctimas del conflicto, enfoque diferencial e interseccional.

2. **Marco B — Plataforma Cívica Digital, Ecosistema de Datos y Fe Pública POLIS (Ples SAS):**
   - Fe pública digital y validez probatoria: **Ley 527 de 1999** (Mensajes de datos, equivalencia funcional, sellado criptográfico SHA-256 de actas ciudadanas y trazabilidad inmutable).
   - Habeas Data y Privacidad Comunitaria Reforzada: **Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013** (Tratamiento ético de datos, sanitización de PII, despojo pericial de metadatos EXIF/GPS en evidencias comunitarias para evitar geolocalización o retaliación contra denunciantes).
   - Transparencia y Acceso a la Información Pública: **Ley 1712 de 2014** (Principio de máxima divulgación, datos abiertos cívicos, trazabilidad activa).
   - Estatuto de Participación Democrática y Veeduría: **Ley Estatutaria 1757 de 2015** (Mecanismos cívicos de deliberación comunitaria, control social y veeduría sobre compromisos).
   - Estándares de Ordenamiento Territorial y Modelado Geoespacial: **Ley 388 de 1997 y Ley 1454 de 2011 (LOOT)** (Modelado espacial de Localidades, UCGs, barrios y corregimientos en PostGIS/OGC).
   - Salvaguarda Étnica y Consulta Previa en Plataforma: **Convenio 169 de la OIT y Art. 330 C.P.** (Alertas preventivas automáticas de Consulta Previa en iniciativas que tocan Consejos Comunitarios Afrodescendientes o Resguardos Indígenas).
   - Viabilidad Fiscal y Presupuestal Automatizada: **Ley 1483 de 2011** (Vigencias futuras excepcionales) y **Ley 418 de 1997 / Ley 1421 de 2010** (FONSET - Fondos de Seguridad).
   - Principios de la Función Administrativa: **Art. 209 C.P.** (Moralidad, eficacia, economía, celeridad, imparcialidad y publicidad).

---

## 2. Requerimientos de Arquitectura de la Solución (UX / UI / Accesibilidad)

Debes implementar una solución de alto nivel ("PRO"), modular y accesible en `src/app/marco-legal/` (y si lo consideras adecuado, componentes de soporte en `src/features/marco-legal/` o en subdirectorio de la ruta):

1. **Jerarquía y Nomenclatura del Encabezado:**
   - La página debe titularse claramente: **"Marcos Jurídicos, Doctrinales y Normativos"** (o similar con máxima precisión institucional).
   - Encabezado con explicación clara de los **dos pilares complementarios pero jurídicamente independientes**:
     * Pilar 1: *Política Pública de Seguridad Humana Integral (Cartagena de Indias)*.
     * Pilar 2: *Plataforma Digital, Gobernanza de Datos y Fe Pública (POLIS / Ples SAS)*.

2. **Navegación e Interacción de Ámbitos (Segmented Switcher / Tabs Accesibles):**
   - Implementa un conmutador de perspectiva accesible (o tabs / selector segmentado) que permita al usuario alternar entre:
     * **Marco de la Política Pública de Seguridad Humana**
     * **Marco Tecnológico y Legal de la Plataforma POLIS**
     * **Vista Completa / Ambos Marcos Integrados**
   - Asegura accesibilidad ARIA completa: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, navegación por teclado con Flechas izquierda/derecha, Home/End.
   - Si no usa tabs y opta por navegación vertical/dos columnas, los dos marcos deben estar claramente delimitados con secciones semánticas diferenciadas, tarjetas de resumen independientes y navegación lateral que distinga ambos bloques.

3. **Preservación Estricta de Enlaces y Anclas Históricas (Retrocompatibilidad URL):**
   - El enlace señalado expresamente por el usuario: `https://seguridadhumanaintegral.org/marco-legal#distrital` **DEBE funcionar de inmediato**, haciendo scroll al marco distrital de la Política Pública de Seguridad Humana (Acuerdo 139/2024, Decreto 037/2026, Decreto 1070/2021).
   - Se deben conservar las anclas existentes: `#distrital`, `#constitucional`, `#nacional`, `#internacional`, `#salvaguardas`.
   - Se deben añadir las nuevas anclas de la plataforma: `#plataforma`, `#fe-publica`, `#datos-privacidad`, `#gobernanza-tecnologica`, `#ordenamiento-territorial`.

4. **Calidad de Marcado y Accesibilidad WCAG 2.1 AA:**
   - Elemento `<main id="main-content">`.
   - No usar `<div>` inválidos en listas de definición si se usan `<dl>`. Solo `<dt>` y `<dd>` (o agrupados en `<div>` puros).
   - Uso estricto de componentes UI Kit `@/shared/ui/` (`Badge`, `Button`, etc.) y tokens CSS `var(--surface-*)`, `var(--text-*)`, `var(--ember)`, `var(--border)`.
   - 0 violaciones axe-core.

5. **Pruebas Automatizadas:**
   - Crear suite de pruebas exhaustiva: `src/app/marco-legal/page.test.tsx` (validando renderizado de ambos marcos, presencia de las normas distritales y de la plataforma, anclas accesibles, conmutación accesible).

---

## 3. Alcance Permitido y Prohibiciones

- **Alcance permitido:**
  - `src/app/marco-legal/**`
  - `src/features/marco-legal/**` (si creas la feature estructurada para los datos y vistas)
  - `src/app/marco-legal/page.test.tsx`
- **Fuera de alcance:**
  - Backend, base de datos, `data/`, Geovisor, Catálogo de Indicadores (`src/features/indicadores`), scripts de despliegue.
- **Prohibiciones estrictas:**
  - Cero `git commit` y cero `git push`.
  - Cero despliegue y cero reinicio de servicios.
  - Cero enlaces `http://` (solo relativos o `https://`).
  - Cero estilos *hardcoded* que no provengan del sistema de diseño POLIS.

---

## 4. Criterios de Aceptación y Comandos de Verificación

Al terminar, debes ejecutar y reportar la salida íntegra de:
```bash
cd /root/polis
node scripts/ui-policy.mjs
bun run typecheck
bun run lint
bun test src/app/marco-legal
bun test ./src/features/indicadores
bun test ./src/app/_components
```

Registra el informe detallado en `bridge/302_entrega_agy2_diferenciacion_marcos_legales.md`.
