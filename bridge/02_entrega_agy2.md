# Entrega agy2 — Nuevo Módulo y Menú: "Dimensiones y Dependencias" (POLIS)
Fecha: 2026-10-02T19:23:00Z
Estado: CONFORME

## Resumen Ejecutivo
Se implementó con éxito el nuevo módulo y menú de alto impacto institucional **"Dimensiones y Entidades"** en la plataforma POLIS, conectando de forma interactiva las **7 Dimensiones de Seguridad Humana (Decreto 037 de 2026 del Ministerio del Interior) + Eje Transversal de Crisis** con las **27 dependencias oficiales** de la Alcaldía Mayor de Cartagena de Indias y sus Planes de Acción 2026:

1. **Integración en la Navegación y Menú Principal**:
   - `src/core/navigation/navigation-store.ts`: Ampliación del tipo `VistaApp` para incluir `"dimensiones"`.
   - `src/app/_components/topbar.tsx`: Incorporación de `{ id: "dimensiones", label: "Dimensiones y Entidades", labelCorto: "Dimensiones" }` al arreglo `NAV`, con diseño responsivo, etiquetas adaptables y estado activo destacado.
   - `src/app/page.tsx`: Importación e integración de `<DimensionesView />` con transición suave `AnimatePresence`.

2. **Nueva Vista Interactiva de Nivel Profesional (`src/features/politicas/views/dimensiones-view.tsx`)**:
   - **Cabecera Institucional**: Título *"Dimensiones de Seguridad Humana y Estructura Distrital"*, marco legal (Decreto 037 de 2026 y PDD 2024–2027 *"Cartagena Ciudad de Derechos"*), y métricas consolidadas (8 dimensiones/ejes, 27 dependencias, 38.8% avance promedio auditado al 30 de junio de 2026).
   - **Conmutador de 2 Modos de Exploración**:
     - 🧭 **Modo A: "Por Dimensiones ONU"**: Enfoque temático por derecho y problemática.
     - 🏛️ **Modo B: "Por Dependencias Distritales"**: Enfoque institucional por entidad ejecutora.
   - **Buscador Rápido en Vivo**: Filtrado reactivo en cliente por tema, palabra clave, titular o sigla.

3. **Modo A: Por Dimensiones ONU (Las 7 Dimensiones + Crisis)**:
   - Carrusel de 8 pestañas con código (`D1` a `D8`), ícono vectorial y lema oficial.
   - **🏛️ Ficha de la Entidad Líder (Destacada)**:
     - Distintivo dorado *"ENTIDAD LÍDER LEGALMENTE RESPONSABLE"*.
     - Nombre institucional, sigla, titular del gabinete distrital (Bruno Hernández, Mauricio Rodríguez, Álex Tejada, Camilo Rey, etc.).
     - Misión oficial en el Plan de Acción 2026.
     - Presupuesto asignado 2026 con desglose de fuentes (FONSET, SGP, ICLD, Regalías).
     - Canales directos de atención ciudadana (dirección física, PBX, correo oficial).
     - Botón de auditoría directa que abre el panel lateral Zero-Modals `rendicion-cuentas`.
   - **🤝 Mosaico de Entidades Corresponsables**:
     - Tarjetas individuales para cada entidad con su rol específico y proyecto clave en la dimensión seleccionada.
     - Porcentaje auditado de cumplimiento y botón *"Auditar"*.
   - **📋 Metas Cuatrienales Priorizadas y CTA 1-Clic**:
     - Listado de metas estratégicas cuatrienales de la dimensión.
     - Botón de acción *"Crear Reporte Formal"* que redirige a `/f/reporte-inseguridad` precargando la categoría.

4. **Modo B: Por Dependencias Distritales (Las 27 Entidades Oficiales)**:
   - Filtros por tipología: *Todas las Entidades (27)*, *Secretarías (8)*, *Descentralizados (10)*, *Oficinas Asesoras (4)* y *Alcaldías Locales (3)*.
   - Filtros por semáforo de cumplimiento: *Todos*, *🟢 ≥40%*, *🟡 25–39%*, *🔴 <25%*.
   - Mosaico de tarjetas por dependencia con:
     - Nombre, sigla, tipo institucional y titular.
     - Barra de progreso cromática del avance del Plan de Acción a 30 de junio de 2026.
     - **Matriz de Participación en Dimensiones**: Insignias doradas con corona (`Crown`) para las dimensiones donde es **Líder**, e insignias secundarias para las dimensiones donde es **Corresponsable**.
     - Competencia de seguridad humana y presupuesto asignado.
     - Botón *"Rendición"* que abre `openPanel("rendicion-cuentas", { dependenciaId: dep.id })`.

5. **Base de Datos y Relaciones Enriquecidas (`src/features/politicas/data/dimensiones-detalle.data.ts`)**:
   - Catálogo `DIMENSIONES_DETALLE_2026` con metadatos completos, proyectos de corresponsabilidad y metas cuatrienales.
   - Mapeo `GABINETE_TITULARES` con los nombres y cargos de los miembros del gabinete distrital de Cartagena 2024–2027.
   - Función auxiliar `obtenerEntidadConTitular` que computa dinámicamente roles de líder y corresponsable.

---

## Control de Calidad y Verificación Técnica
- **UI Policy Guard (`node scripts/ui-policy.mjs`)**:
  - Superado con **0 infracciones**.
  - Estricto uso de controles encapsulados `@/shared/ui/button` e `input`.
  - Cero colores Tailwind literales; uso exclusivo de variables y tokens semánticos CSS (`--surface-*`, `--text-*`, `--ember`, `--border`, etc.).
  - Cumplimiento estricto del estándar Zero-Modals (paneles laterales integrados sin diálogos modales flotantes).
- **TypeScript y Linters (`bun run check`)**:
  - `tsc --noEmit`: 0 errores.
  - `eslint .`: 0 errores (1 warning preexistente en react compiler para datagrid).
- **Compilación de Producción (`bun run build`)**:
  - Turbopack compiló exitosamente las 50 rutas estáticas y SSG en 10.3s.
  - Sincronización exitosa de assets estáticos a `.next/standalone/`.
- **Despliegue y Verificación en Vivo**:
  - `sudo systemctl restart polis-frontend.service`: Servicio frontend activo y en ejecución.
  - Verificación `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000` ➔ **200 OK**.
