# Tarea INV-MESAS: Auditoría y Diagnóstico del Catálogo de Mesas en Sitio Público

**Prioridad**: **ALTA** (UX / Consistencia de Datos Públicos)  
**Clasificación**: Fullstack Investigation & Performance / UX Analysis  
**Responsable**: agy2 (EDD)  
**Supervisor**: EAF  

---

## 1. Contexto y Requerimiento

El usuario reporta que en el menú público **"Mesas de Trabajo"** del sitio (`https://seguridadhumanaintegral.org/`) se visualizan "muchísimas mesas", lo que sobrecarga la experiencia ciudadana.

Se requiere que `agy2` realice una investigación pericial exhaustiva y documente las conclusiones y recomendaciones técnicas.

---

## 2. Puntos Obligatorios de la Investigación

1. **Conteo Exacto en la Vista Pública**:
   - Inspeccionar la navegación pública ([`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx)) y la vista [`src/features/mesas/views/mesas-view.tsx`](file:///root/polis/src/features/mesas/views/mesas-view.tsx).
   - Determinar cuántas mesas se obtienen a través del hook `useMesas()` y el endpoint `GET /api/v1/mesas`.
   - Cuántas tarjetas se renderizan actualmente en el DOM cliente.

2. **Desglose Pericial de los Datos en Base de Datos**:
   - Inspeccionar la tabla `mesas_trabajo.mesas` en PostgreSQL (`bd_csh` y `polis_test`).
   - Obtener el número total y desglosarlo por:
     - `tipo_mesa` (ej. `TERRITORIAL`, `SECTORIAL`, `POBLACIONAL`, `RURAL_INSULAR`).
     - `estado` (ej. `PROGRAMADA`, `ACTA_CONCERTADA`, `EN_CURSO`, etc.).
     - Si tienen actas vinculadas o acuerdos registrados.

3. **Causa Raíz de la Multiplicidad**:
   - ¿Por qué existen tantas mesas (194 en `mesas_trabajo.mesas`)?
   - ¿Cómo se relacionan estas 194 mesas con las 36 mesas del cronograma/agenda oficial (`mesas_trabajo.agendas` / `src/features/mesas/data/agenda.data.ts`)?
   - ¿Fueron generadas por semillas de réplicas territoriales/sectoriales en migraciones anteriores?

4. **Diagnóstico de Rendimiento y Experiencia de Usuario (UX)**:
   - Evaluar cómo afecta al ciudadano común navegar una lista plana de ~194 tarjetas.
   - Ausencia de paginación, filtros por tipo de mesa o agrupación por localidad/sector.

5. **Propuesta de Soluciones Técnicas**:
   - Plantear opciones concretas (ej. paginación server/client side, filtros por pestañas/tipo, mostrar por defecto mesas con acta/activas, o articular con el cronograma oficial de 36 mesas).

---

## 3. Entregable

- Documentar el informe pericial en [`bridge/02_entrega_agy2.md`](file:///root/polis/bridge/02_entrega_agy2.md) bajo la sección `### Entrega de Tarea INV-MESAS: Diagnóstico del Catálogo de Mesas en Sitio Público`.
- Notificar formalmente al auditor cuando el informe esté listo.
