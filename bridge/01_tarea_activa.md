# TAREA ACTIVA: [QA-FIX-02] RESOLUCIÓN INTEGRAL DE QA-005: DESCARGA DE PDF DE ACTAS, GESTIÓN DE DISPONIBILIDAD CIUDADANA Y ERRADICACIÓN NORMATIVA

**Fecha**: 2026-10-08  
**Asignada a**: `agy2` (Desarrollador / EDD)  
**Supervisor / Auditor**: `agy` (Coordinador / Auditor Forense EAF)  
**Ticket de Referencia en QA Platform (`http://2.25.244.251:4000`)**:
- `QA-005`: "pdf de acta no funciona" (`https://seguridadhumanaintegral.org/plataforma/mesas?mesaId=01a0f5fe-86df-717b-a4d0-5b6605bdf993&ver=acta`)
  - *Descripción*: "debería permitir descargar el pdf, y si no esta listo el pdf, debe informarle al ciudadano que no se encuentra dispoble el acta aun. hay tambien que eliminar el texto: \"Validez legal conforme a Ley 1757 de 2015, Decreto 037 de 2026 y Sentencia C-150 de 2015\""
  - *Evidencia*: Captura oficial en [`uploads/captura_1791441135827_2ajt0y.png`](http://2.25.244.251:4000/uploads/captura_1791441135827_2ajt0y.png)

---

## 🎯 Alcance Técnico y Requerimientos de UX/UI:

### 1. Erradicación Normativa del Decreto 037 y del Texto Literal Reportado por Calidad
- **Archivo**: `src/features/mesas/panels/mesa-acta-panel.tsx`
- **Acciones**:
  - En la línea 111 (propiedad `subtitle` del `PanelShell`):
    Eliminar completamente el texto: `"Validez legal conforme a Ley 1757 de 2015, Decreto 037 de 2026 y Sentencia C-150 de 2015"`.
    Sustituirlo por una descripción institucional dinámica y pulcra:
    - Si el acta está lista: `"Documento Oficial Distrital · Conforme a Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015"`.
    - Si el acta aún no está cerrada: `"Borrador de Trabajo · Sesión en Proceso de Concertación Ciudadana"`.
  - En la línea 249 (párrafo legal del encabezado institucional impreso):
    Eliminar `"Decreto 037 de 2026 del Ministerio del Interior,"` de modo que exprese estrictamente el marco constitucional verídico:
    `"En cumplimiento de la Ley Estatutaria 1757 de 2015 de Participación Ciudadana y las garantías de devolución motivada de la Sentencia C-150 de 2015 de la Corte Constitucional de Colombia."`

### 2. Detección y Modelado de Disponibilidad del Acta Oficial
- **Archivo**: `src/features/mesas/panels/mesa-acta-panel.tsx`
- **Lógica de Disponibilidad**:
  ```ts
  const e = (mesa.estado || "").toLowerCase();
  const actaDisponible = e === "cerrada" || e === "completada" || e === "finalizada" || e === "acta_concertada" || Boolean(mesa.sha256Acta);
  ```
- **Cuando el Acta NO está lista (`!actaDisponible`)**:
  1. En los breadcrumbs/kicker del `PanelShell`, mostrar el badge en tono ámbar: `"BORRADOR PRELIMINAR"` o `"EN CONCERTACIÓN"` en lugar de `"ACTUAL"`.
  2. Desplegar un **Banner Institucional Informativo** destacado en la parte superior del panel (clase `no-print`):
     - Título: *"Acta oficial no disponible para descarga aún"* (icono `AlertCircle` o `Clock`).
     - Mensaje claro al ciudadano: Informar que la mesa se encuentra en estado *Programada* o *En Deliberación*, y que el acta definitiva con su código de verificación digital y radicado oficial en PDF estará disponible para descarga una vez finalizada la sesión y suscrita la concertación comunitaria.
     - Aclarar que la visualización actual corresponde al *borrador preliminar de trabajo*.

### 3. Funcionalidad de Descarga en PDF y Feedback Interactivo
- **Archivo**: `src/features/mesas/panels/mesa-acta-panel.tsx`
- **Comportamiento de los Botones de Acción**:
  - Si el usuario pulsa en el botón principal de descarga (`Descargar PDF`):
    - Si `!actaDisponible`:
      - Disparar `toast.info("Acta oficial no disponible aún", { description: "Esta mesa se encuentra en proceso de concertación. El documento oficial en PDF estará disponible una vez cerrada y formalizada la sesión." })`.
      - Proporcionar la opción de imprimir el borrador de trabajo:
        `toast("¿Deseas imprimir el borrador de trabajo actual?", { action: { label: "Imprimir borrador", onClick: () => window.print() } })` o un botón secundario específico `"Imprimir borrador preliminar"`.
    - Si `actaDisponible`:
      - Iniciar la descarga del documento PDF oficial:
        - Para máxima compatibilidad multiplataforma y cumplimiento de descarga directa de archivo, invocar `window.print()` y además generar/descargar el archivo oficial exportable (`.html`/documento oficial formateado para guardar como `Acta_Oficial_[codigo].pdf` o exportación con nombre determinista).
        - Feedback con `toast.success("Generando descarga del acta oficial...")`.

### 4. Soporte para Enlace Profundo en la Plataforma (`?mesaId=...&ver=acta`)
- **Archivo**: `src/features/plataforma/views/mesas-view.tsx`
- **Acción**:
  - Al montar la vista `MesasGestionView`, leer los parámetros de búsqueda `window.location.search`:
    - Si existe `mesaId` y `ver === "acta"`, invocar automáticamente `openPanel("mesa-acta", { mesaId })`.
    - Si existe `mesaId` sin `ver`, abrir `openPanel("mesa", { mesaId })`.
  - Esto garantiza que enlaces compartidos como el del ticket de QA abran inmediatamente el acta correspondiente.

### 5. Semántica de Botones en `src/features/mesas/panels/mesa-panel.tsx`
- En la vista principal de la mesa (`mesa-panel.tsx`):
  - Evaluar `actaDisponible`:
    - Si está cerrada: Botón dice `📄 Descargar Acta Oficial (PDF)`.
    - Si aún está abierta/programada: Botón dice `📄 Ver Borrador / Acta de Consulta`.

---

## 📋 Quality Gates de Entrega Obligatorios:
1. `bun run check` -> **0 errores** (`ui:check`, `tsc --noEmit`, `eslint .`).
2. `bun test src/features/mesas/` -> **100% pruebas pasando**.
3. `bun run build` -> **Compilación limpia de Next.js** (190 rutas generadas).
4. Reinicio de frontend: `systemctl restart polis-frontend`.
5. Verificación pericial de:
   - `http://127.0.0.1:3000/plataforma/mesas?mesaId=01a0f5fe-86df-717b-a4d0-5b6605bdf993&ver=acta`
   - Erradicación total de `"Decreto 037"` en el panel de acta.
   - Presencia del banner informativo de acta no disponible.
   - Funcionamiento correcto del feedback y botones de PDF.
6. Commit atómico local en la rama `main` (sin git push).
7. Documentar entrega en `bridge/02_resultado_agy2.md`.
8. Solicitar contra-auditoría pericial a `agy`.
