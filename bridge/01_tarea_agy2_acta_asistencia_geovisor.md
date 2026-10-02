# TAREA — Acta Oficial en PDF, Registro de Asistencia con QR y Capa Geovisor de Mesas

## Objetivo
Implementar los 3 módulos clave para llevar las mesas de trabajo al 100% de operatividad gubernamental y comunitaria en Cartagena:
1. **Acta Oficial en PDF / Impresión Institucional (Decreto 037 / DNP).**
2. **Registro de Asistencia Digital en Puerta (QR + Enfoque Diferencial + Planilla).**
3. **Capa Interactiva de las 33 Mesas en el Geovisor (Semáforo y Ficha de Mesa).**

---

## 1. Acta Oficial en PDF e Impresión (`src/features/mesas/panels/mesa-acta-panel.tsx`)

Crear el panel y vista de impresión oficial de la mesa:
- **Encabezado Institucional:**
  - Membrete: *"Alcaldía Mayor de Cartagena de Indias — Secretaría de Planeación Distrital"*.
  - Título: *"ACTA DE CONSULTA CIUDADANA — POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (2026–2036)"*.
  - Fundamento legal: *"En cumplimiento del Decreto 037 de 2026, la Ley Estatutaria 1757 de 2015 y la Sentencia C-150 de 2015"*.
- **Cuerpo del Acta:**
  - **1. Datos Administrativos:** Código oficial, nombre de la mesa, territorio, fecha, hora inicio/fin, lugar, entidades convocantes, facilitadores y aforo.
  - **2. Participación y Quórum:** Total de asistentes (desglose plenaria vs submesas) y resumen por enfoque diferencial.
  - **3. Acuerdos de la Plenaria de Apertura:** Compromisos de la sesión.
  - **4. Matriz de Marco Lógico (MML):** Tabla de diagnóstico (Causas, Problema Central, Efectos) y soluciones (Medios, Objetivo Central, Fines).
  - **5. Informe y Relatoría Comunitaria:** Memoria técnica de las discusiones.
  - **6. Compromisos y Devolución Ciudadana:** Hoja de ruta acordada con la comunidad.
  - **7. Cuadro de Firmas:**
    - Facilitador Líder
    - Relator Técnico
    - Representante Comunitario / JAC
    - Delegado Enfoque Diferencial
- **Controles en Pantalla:**
  - Botón 🖨️ **"Imprimir / Guardar como PDF"**: Dispara `window.print()` con estilos `@media print` profesionales en formato Carta (oculta navegación, ajusta márgenes, saltos de página limpios y modo blanco/negro de alta legibilidad).
  - Botón 🔗 **"Compartir Acta"** (copiar enlace directo).
- **Integración:**
  - Registrar panel `"mesa-acta"` en `panel-registry.tsx` y `panel-store.ts`.
  - Añadir botón `"📄 Ver Acta Oficial en PDF"` en la cabecera y pie de `MesaPanel`.

---

## 2. Registro de Asistencia Digital con QR en Puerta

### A. Modelo de Asistente (`src/features/mesas/models/asistencia.ts`)
```ts
export type EnfoqueDiferencial =
  | "ninguno"
  | "afrodescendiente"
  | "palenquero"
  | "raizal"
  | "indigena"
  | "rrom"
  | "victima_conflicto"
  | "discapacidad"
  | "adulto_mayor"
  | "juventud"
  | "mujeres"
  | "lgbtiq";

export interface RegistroAsistencia {
  id: string;
  mesaId: string;
  nombreCompleto: string;
  tipoDocumento: "CC" | "TI" | "CE" | "PAS" | "OTRO";
  numeroDocumento: string;
  genero: "mujer" | "hombre" | "no_binario" | "otro";
  enfoqueDiferencial: EnfoqueDiferencial;
  organizacionOBarrio: string;
  telefonoWhatsApp?: string;
  correo?: string;
  horaRegistro: string;
  subMesaAsignada?: string;
}
```

### B. Store de Asistencia (`src/features/mesas/state/asistencia-store.ts`)
- `registros: Record<string, RegistroAsistencia[]>` (por `mesaId`).
- Acciones: `registrarAsistente`, `eliminarRegistro`, `exportarPlanillaCSV`.
- Conteo automático que alimenta `totalAsistentes` de la mesa si está en modo presencial.

### C. Vista Pública Móvil para el Ciudadano (`src/app/asistencia/[mesaId]/page.tsx` o panel)
- Formulario liviano responsive optimizado para teléfonos móviles (320px+).
- Título con el nombre de la mesa y lugar.
- Captura de los 5 datos clave en menos de 30 segundos.
- Confirmación con comprobante digital: *"¡Registro exitoso! Gracias por construir la Seguridad Humana de Cartagena"*.

### D. Panel Administrativo de Asistencia en `MesaPanel`
- Sección "Lista de Asistencia y QR":
  - Código QR generado con `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=...` apuntando al enlace de registro.
  - Botón **"📱 Proyectar QR en Pantalla / Imprimir Cartel"** para pegar en la entrada del salón.
  - Tabla en vivo de asistentes registrados con filtros por enfoque diferencial.
  - Botón **"📥 Descargar Planilla de Asistencia (CSV)"** para legalización de cuentas.

---

## 3. Capa Interactiva de las 33 Mesas en el Geovisor

En `src/features/geovisor/hooks/use-mapa.ts` y componentes del Geovisor:
- Asegurar que las 33 mesas de la agenda (`AGENDA_MESAS` de `agenda.data.ts`) tengan coordenadas geográficas reales en Cartagena (ya tienen territorio/barrio asignado; verificar coordenadas representativas de cada corregimiento, isla o localidad).
- Semáforo visual en el mapa:
  - 🟡 **Amarillo / Ember:** Mesa Programada.
  - 🔵 **Azul:** Mesa en Curso.
  - 🟢 **Verde:** Mesa Realizada / Cerrada.
- Interacción en el mapa:
  - Al hacer clic o hover en un punto de mesa, desplegar popup estilizado con:
    - Nombre de la mesa y territorio.
    - Fecha y horario.
    - Total de asistentes y aforo.
    - Botón **"Ver Detalle / Acta"** que abre directamente `MesaPanel`.

---

## 4. Control de Calidad Obligatorio
```bash
bun run check
bun run build
sudo systemctl restart polis-frontend.service
```

## 5. Entrega
Commit descriptivo y actualización de `/root/polis/bridge/02_entrega_agy2.md`.
