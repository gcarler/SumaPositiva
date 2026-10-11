# TAREA ACTIVA: [UX-MOVIL-BARRIO-01] MODO CIUDADANO ULTRALIGERO ("MODO BARRIO")
## VISTA CIUDADANA MOBILE-FIRST Y BAJO CONSUMO DE DATOS (<150 KB) PARA SMARTPHONES DE GAMA DE ENTRADA EN CARTAGENA

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Adopción Territorial y Resiliencia (Tarea 3.1)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / EQUIDAD DIGITAL Y JUSTICIA TERRITORIAL (Acceso universal en barrios populares)

---

## 🎯 1. Justificación y Diagnóstico Estratégico

En los barrios populares y corregimientos de Cartagena de Indias (Olaya Herrera, Nelson Mandela, El Pozón, San Francisco, Bayunca, Pasacaballos, Fredonia, La Boquilla, etc.), la mayoría de los habitantes acceden a Internet mediante **teléfonos inteligentes Android de gama de entrada** (Android Go, 2GB–3GB de RAM) con **planes de datos móviles prepago de 100MB a 500MB** y conectividad intermitente 3G/4G.

La plataforma principal de POLIS cuenta con mapas georreferenciados (Leaflet/Mapbox), paneles apilados de múltiples niveles y visualizaciones ricas que, si bien son excelentes para computadores de escritorio y funcionarios distritales, representan una barrera de datos y rendimiento para un vecino en la calle o un líder barrial.

**Objetivo de la Tarea:**
Implementar el **"Modo Barrio" (`/barrio`)**: una vista web móvil ultraligera, accesible y de consumo mínimo de datos (<150 KB en carga inicial), estructurada bajo la **Arquitectura Cívica de 3 Preguntas**:
1. **¿Qué se acordó en mi barrio?** (Consulta ágil de mesas de diálogo, acuerdos y compromisos territoriales).
2. **¿Qué propones tú?** (Voz directa del territorio: radicación exprés de propuestas con código `POL-2026-XXXX`, soporte anónimo/identificado y me gusta cívicos funcionales).
3. **¿Cómo va el barrio?** (Semáforo de seguridad y convivencia con indicadores reales sin gráficos pesados).

---

## 📋 2. Especificación Técnica de la Implementación

### A. Estructura de Rutas y Módulos
1. **Ruta Pública Dedicada (`src/app/barrio/`)**:
   - `src/app/barrio/page.tsx`: Punto de entrada directo server/client optimizado.
   - `src/app/barrio/layout.tsx`: Layout minimalista sin headers pesados, con navegación de pestañas táctiles inferior o superior fijada (*Acuerdos / Proponer / Semáforo*).
   - Componentes modulares en `src/features/barrio/`:
     * `barrio-selector.tsx`: Selector rápido de territorio distrital (Localidades 1, 2 y 3, barrios populares y corregimientos de Cartagena).
     * `acuerdos-barrio-tab.tsx`: Listado ágil de mesas y acuerdos del territorio seleccionado.
     * `propuesta-barrio-tab.tsx`: Formulario ultraligero de radicación en 1 pantalla + listado de propuestas comunitarias con botón de apoyo cívico reactivo (`useToggleApoyo`).
     * `semaforo-barrio-tab.tsx`: Tarjetas de alto contraste con semáforos de cumplimiento e indicadores de seguridad (homicidios, hurtos, riñas, percepción) provenientes de la API de indicadores.
2. **Navegación y Acceso Global**:
   - En [`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx): Añadir botón de acceso rápido *"Modo Barrio"* con icono `Smartphone` de Lucide, visible tanto en móviles como en escritorio.
   - En [`src/shared/layout/footer.tsx`](file:///root/polis/src/shared/layout/footer.tsx): Enlace destacado a `/barrio` (*"Modo Barrio (Bajo consumo)"*).
   - En la vista principal móvil: Banner cívico no invasivo: *"¿Estás en tu celular con datos prepago? Activa el Modo Barrio para ahorrar megas"*.
   - En `/barrio`: Botón visible para regresar a la "Vista Completa" (`/`).

### B. Funcionalidades Detalladas del Modo Barrio

#### 1. Paso 1: ¿Qué se acordó? (Mesas y Compromisos Territoriales)
- Permite al usuario seleccionar su barrio o corregimiento de una lista canónica (ej. Olaya Herrera, Nelson Mandela, El Pozón, San Francisco, Bayunca, Fredonia, etc.).
- Filtra y presenta las mesas de diálogo distritales realizadas en dicho territorio, mostrando:
  * Fecha y lugar de la mesa.
  * Acuerdos y compromisos concretos pactados con la comunidad.
  * Entidad distrital responsable (Distriseguridad, Secretaría del Interior, etc.).

#### 2. Paso 2: ¿Qué propones tú? (Voz del Barrio + Apoyos Cívicos)
- Formulario directo de radicación comunitaria:
  * Territorio (preseleccionado del selector).
  * Título conciso de la propuesta o alerta comunitaria.
  * Descripción clara de la necesidad barrial.
  * Temática básica (Seguridad y Alarmas, Espacio Público e Iluminación, Juventud y Oportunidades, Convivencia).
  * Modalidad de identidad: "Anónimo (Protegido Ley 1581)" o "Con mi nombre y teléfono".
- Al enviar:
  * Invoca `POST /api/v1/aportes` garantizando sesión activa (`asegurarSesionActiva`).
  * Despliega inmediatamente el **Código de Radicado Oficial `POL-2026-XXXX`** con confirmación visual clara.
  * Botón para *"Compartir en WhatsApp del Barrio"* (`https://wa.me/?text=...`) para que el ciudadano pueda convocar el apoyo de sus vecinos.
- Muro de propuestas del barrio:
  * Muestra las propuestas comunitarias registradas para ese territorio.
  * Botón de apoyo ("Me Gusta") funcional que utiliza la mutación optimista recién certificada (`useToggleApoyo` y `useMisApoyos`).

#### 3. Paso 3: ¿Cómo va el barrio? (Semáforo Ciudadano)
- Visualización de alto contraste sin canvas ni WebGL ni librerías de gráficos pesadas.
- Tarjetas semáforo con colores estándar del kit POLIS (`var(--success)`, `var(--warning)`, `var(--danger)` o equivalentes tokenizados):
  * Tasa de Homicidios Distrital (Medicina Legal / Policía SIEDCO).
  * Frecuencia de Hurtos y Convivencia.
  * Percepción de Seguridad (Cartagena Cómo Vamos).
  * Número de mesas comunitarias y acuerdos alcanzados en el sector.

---

## 🛡️ 3. Salvaguardas Obligatorias e Inviolables

1. **Preservación Inviolable de BPIN:** Prohibido alterar, renombrar o modificar códigos BPIN distritales.
2. **Cero Acrónimos Ajenos:** Estricta prohibición de `DNP`, `MGA` o `SINERGIA`.
3. **UI-Policy Estricta:** Uso riguroso de controles canónicos `@/shared/ui/` (`Button`, `Badge`, `Input`, `FormField`, etc.) y tokens semánticos oficiales (`var(--surface)`, `var(--text-primary)`, `var(--ember)`). 0 violaciones en `node scripts/ui-policy.mjs`.
4. **Presupuesto de Rendimiento (<150 KB):** No importar mapas (`leaflet`, `mapbox`), ni librerías de visualización pesadas (`chart.js`, `recharts`, `three.js`). Solo React, Lucide icons y Tailwind tokenizado.
5. **Inviolabilidad de Producción (`bd_csh`):** Las 33 mesas de diálogo, 36 agendas comunitarias y 11 fichas técnicas en PostgreSQL deben permanecer 100% intactas.
6. **Protocolo Zero-Push:** Todo cambio debe quedar confinado en commits locales atómicos sobre la rama `main`.

---

## 🔬 4. Quality Gates y Criterios de Aceptación

Para autorizar el dictamen pericial de aprobación, deben cumplirse rigurosamente:
1. `bun run ui:check`: Aprobado (0 infracciones).
2. `bun run check`: Aprobado (0 errores TypeScript en `tsc --noEmit`, 0 warnings en `eslint`).
3. `bun test`: Aprobado (393+ tests verdes, agregando pruebas específicas para los componentes de `/barrio`).
4. `pytest`: Aprobado al 100% en backend.
5. `bun run build`: Aprobado sin fallos de compilación en Turbopack (Next.js 16).
6. Verificación en caliente en el navegador / curl con `polis-frontend.service` y `polis-backend.service` activos:
   - Ruta `http://127.0.0.1:3000/barrio` respondiendo HTTP 200 OK.
   - Enlace desde el Topbar funcionando.
   - Radicación comunitaria desde `/barrio` generando código `POL-2026-XXXX`.
7. Registro de informe pericial detallado en `bridge/02_resultado_agy2.md`.
8. Commit atómico local con mensaje canónico: `feat(ux): vista ciudadana ultraligera modo barrio UX-MOVIL-BARRIO-01`.
