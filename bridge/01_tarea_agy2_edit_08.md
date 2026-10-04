# Tarea EDIT-08: Cableado de Asistencia Pública Directa a PostgreSQL

**Prioridad**: **ALTA** (Persistencia Real de Participación y Quórum)  
**Clasificación**: Fullstack Integration & Civic Registration  
**Responsable**: agy2 (EDD)  
**Supervisor**: EAF  

---

## 1. Diagnóstico Pericial del Hallazgo

En la auditoría forense de conectividad se identificó que el flujo de asistencia ciudadana en mesas presenciales está desacoplado de la base de datos central:

1. **Persistencia Local Aislada (`src/features/mesas/state/asistencia-store.ts`)**:
   - La página pública `/asistencia/[mesaId]` en [`src/app/asistencia/[mesaId]/asistencia-cliente.tsx`](file:///root/polis/src/app/asistencia/[mesaId]/asistencia-cliente.tsx) registra al ciudadano asistente únicamente en el store de Zustand con middleware `persist` (`localStorage`).
   - Los datos quedan atrapados en el navegador del dispositivo donde se abrió la planilla. Si el facilitador o el ciudadano refresca la caché o usa otro dispositivo, los registros no se consolidan centralmente.

2. **Infraestructura Backend Preexistente sin Conectar**:
   - En el backend ya existe la tabla relacional `mesas_trabajo.participantes_mesa` con su modelo SQLAlchemy `ParticipanteMesa` ([`backend/app/modules/mesas/models.py:163`](file:///root/polis/backend/app/modules/mesas/models.py#L163)).
   - Existen los endpoints REST oficiales:
     - `POST /api/v1/mesas/{mesa_id}/participantes` (Registro de asistente con rol, documento, enfoque diferencial, organización).
     - `GET /api/v1/mesas/{mesa_id}/participantes` (Consulta de lista de asistentes).
   - El servicio `MesaService` calcula el quórum legal deliberativo y la cantidad de asistentes oficiales a partir de esta tabla.

---

## 2. Alcance y Especificación Técnica

1. **Servicio Frontend de Asistencia (`src/features/mesas/services/asistencia-api.ts`)**:
   - Implementar las funciones de integración HTTP:
     - `registrarAsistenteMesa(mesaId: string, datos: NuevoAsistenteInput): Promise<ParticipanteRespuesta>` que invoque `POST /api/v1/mesas/${mesaId}/participantes`.
     - `listarAsistentesMesa(mesaId: string): Promise<ParticipanteRespuesta[]>` que invoque `GET /api/v1/mesas/${mesaId}/participantes`.

2. **Cableado del Flujo de Registro (`src/app/asistencia/[mesaId]/asistencia-cliente.tsx` y `asistencia-store.ts`)**:
   - Modificar `registrarAsistente` para que ejecute la llamada asíncrona a la API.
   - **Resiliencia Offline / Contingencia**: Si la API falla (ej. sin cobertura celular en el territorio de la mesa), guardar en `localStorage` con marca `pendiente_sincronizacion: true`, mostrar mensaje al usuario de que su asistencia quedó radicada localmente y permitir sincronizar cuando haya conexión.
   - Si la API responde exitosamente, confirmar el registro con el ID oficial de PostgreSQL.

3. **Pruebas Automatizadas**:
   - Pruebas frontend (`bun test`) verificando:
     - Registro exitoso conectado con la API.
     - Comportamiento ante caída de red (preservación en local sin pérdida de datos).
   - Pruebas backend (`pytest`) asegurando que el POST de participante valida correctamente los campos y genera el snapshot adecuado.

---

## 3. Criterios de Aceptación Forense

1. Un registro de asistencia enviado desde `/asistencia/[mesaId]` se inserta efectivamente en `mesas_trabajo.participantes_mesa` en la base de datos de pruebas PostgreSQL.
2. `bun run check` (UI policy, TypeScript estricto, ESLint) con **0 errores**.
3. `bun test` aprueba 100% de las suites.
4. Cero afectación a los módulos de Codex.
5. Commit atómico con rutas explícitas:
   `git commit -m "feat(mesas): cablear planilla publica de asistencia con persistencia real en PostgreSQL (EDIT-08)"`
