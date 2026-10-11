# TAREA ACTIVA: [FEAT-APOYOS-VOTO-01] SISTEMA FUNCIONAL DE RESPALDO CIUDADANO ("ME GUSTA" / APOYOS A PROPUESTAS)
## PARTICIPACIÓN DIRECTA: 1 CIUDADANO = 1 VOTO CON MUTACIÓN OPTIMISTA, PERSISTENCIA EN BD_CSH Y RETIRO DE APOYO

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2.4 — Feedback Loop y Participación Deliberativa  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / USABILIDAD Y DEMOCRACIA PARTICIPATIVA DIRECTA (Mandato Ley 1757 de 2015)

---

## 🎯 1. Justificación y Alcance del Requerimiento

En la deliberación sobre la política distrital de seguridad y convivencia en Cartagena de Indias, la priorización de propuestas ciudadanas requiere que la comunidad respalde activamente ("me gusta" / apoyos cívicos) las iniciativas de mayor impacto para su barrio (alarmas comunitarias, iluminación, frentes de seguridad, alternativas para jóvenes).

**Problema Identificado:**
1. En `src/features/politicas/panels/linea-panel.tsx`, el botón de apoyo alternaba únicamente un estado en memoria (`toggleApoyo` en Zustand) sin persistencia real en la API ni sincronización.
2. Cada vez que el listado de aportes se refrescaba (`dataAportesApi`), `apoyado` volvía a `false` de manera hardcodeada (`apoyado: false`).
3. El endpoint backend `POST /api/v1/aportes/{aporte_id}/apoyar` requería estrictamente `SujetoAutenticadoDep`, arrojando `HTTP 401 Unauthorized` cuando un ciudadano con sesión cívica anónima intentaba votar.
4. No existía soporte para **retirar el apoyo** (unlike / des-apoyar) si el ciudadano cambiaba de opinión, generando `HTTP 409 Conflict`.
5. No existía un endpoint de consulta para conocer cuáles propuestas han sido respaldadas por la sesión actual.

**Objetivo de la Tarea:**
Hacer los "me gusta" / respaldos cívicos **100% funcionales, bidireccionales y persistentes**:
- Cualquier ciudadano con sesión activa (anónima o autenticada) puede dar "Me Gusta" (apoyar) o retirar su apoyo (des-apoyar) a una propuesta.
- Invariante democrático de integridad: **1 ciudadano/sesión = 1 voto** por propuesta.
- Actualización automática del contador `apoyos_contador` en `participacion_ciudadana.propuestas_ciudadanas` mediante el trigger existente `trg_actualizar_contador_apoyos`.
- Consulta pública y autenticada de `mis-apoyos` para mantener la interfaz sincronizada de forma persistente.
- Mutación optimista en el frontend con feedback táctil inmediato (<50ms).

---

## 📋 2. Especificación Técnica de la Tarea

### A. Backend (`backend/app/modules/aportes/`)
1. **Repositorio (`backend/app/modules/aportes/repository.py`)**:
   - `sumar_apoyo(aporte_id, sujeto)`: soportar tanto `SujetoAutenticadoContexto` como `SesionContexto` extrayendo `sujeto_id` o `sesion_id`.
   - `retirar_apoyo(aporte_id, sujeto) -> PropuestaCiudadana | None`: buscar el `ApoyoPropuesta` correspondiente a `(propuesta_id, sujeto_id)`, eliminarlo de la sesión (`self.session.delete(apoyo)`) y hacer flush (el trigger de PostgreSQL decrementa automáticamente `apoyos_contador`).
   - `alternar_apoyo(aporte_id, sujeto) -> tuple[PropuestaCiudadana, bool]`: si ya existe el apoyo lo elimina (retorna `(propuesta, False)`), si no existe lo crea (retorna `(propuesta, True)`).
   - `obtener_apoyos_sujeto(sujeto) -> list[uuid.UUID]`: consulta los `propuesta_id` en `apoyos_propuestas` asociados al `sujeto_id` de la sesión.
2. **Servicio (`backend/app/modules/aportes/service.py`)**:
   - `alternar_apoyo(aporte_id: uuid.UUID, sujeto) -> RespuestaToggleApoyo`.
   - `retirar_apoyo(aporte_id: uuid.UUID, sujeto) -> PropuestaCiudadanaRead`.
   - `obtener_mis_apoyos(sujeto) -> MisApoyosRespuesta`.
3. **Esquemas (`backend/app/modules/aportes/schemas.py`)**:
   - `RespuestaToggleApoyo`: `propuesta_id: UUID`, `apoyado: bool`, `apoyos_contador: int`, `mensaje: str`.
   - `MisApoyosRespuesta`: `propuestas_apoyadas: list[uuid.UUID]`.
4. **Enrutador (`backend/app/modules/aportes/router.py`)**:
   - Modificar `POST /api/v1/aportes/{aporte_id}/apoyar`:
     * Usar `sesion: SesionRequeridaDep` (en lugar de `SujetoAutenticadoDep`) para permitir participación con sesión anónima o autenticada.
     * Invocar `alternar_apoyo` y retornar `RespuestaToggleApoyo` con HTTP 200 OK.
   - Añadir `DELETE /api/v1/aportes/{aporte_id}/apoyar`:
     * Retira explícitamente el apoyo del usuario/sesión si existe.
   - Añadir `GET /api/v1/aportes/mis-apoyos`:
     * Retorna `MisApoyosRespuesta` con la lista de IDs de propuestas apoyadas por la sesión actual.
5. **Políticas y Permisos (`docs/permisos-api.md` & `backend/tests/test_access_policy.py`)**:
   - Documentar y registrar las rutas en la matriz PBAC y en la lista blanca de la suite de pruebas.

### B. Frontend (`src/features/aportes/` y `src/features/politicas/`)
1. **Servicio API (`src/features/aportes/services/aportes-api.ts`)**:
   - `alternarApoyoAporte(aporteId: string): Promise<RespuestaToggleApoyo>`: invoca `POST /aportes/${aporteId}/apoyar`, asegurando la sesión activa previamente con `asegurarSesionActiva()`.
   - `obtenerMisApoyos(): Promise<string[]>`: invoca `GET /aportes/mis-apoyos`, asegurando la sesión activa previamente.
2. **React Query Hooks (`src/features/aportes/services/use-aportes-queries.ts`)**:
   - Hook `useMisApoyos()`: consulta `['mis-apoyos']`.
   - Hook `useToggleApoyo()`: mutación con optimismo instantáneo sobre `['mis-apoyos']` y `['aportes']`.
3. **Panel de Línea y Muro de Aportes (`src/features/politicas/panels/linea-panel.tsx`)**:
   - Integrar `useMisApoyos()` en `LineaPanel`.
   - En `listaAportesCombinada`, calcular `apoyado: misApoyos.includes(el.id)`.
   - `handleApoyar`: invocar `toggleApoyo` y la mutación `useToggleApoyo()`.
   - Notificación sutil con `toast` según el nuevo estado (*"¡Gracias por tu respaldo!"* o *"Apoyo retirado"*).
   - Comportamiento visual de accesibilidad: `aria-pressed={aporte.apoyado}`, texto dinámico (*"Tu apoyo está registrado"* / *"Apoya este aporte"*), contador numérico animado con variante Ember.

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación Inviolable de BPIN:** No alterar identificadores presupuestales BPIN.
2. **Cero Acrónimos Ajenos:** Cero mención a DNP, MGA o SINERGIA en código, modelos o interfaces.
3. **UI-Policy Estricta:** Uso exclusivo de componentes `@/shared/ui/` (`Button`, `Badge`, tokens semánticos oficiales).
4. **Integridad Democrática (1 Ciudadano = 1 Voto):** Imposibilidad estricta de que una misma sesión/sujeto infle artificialmente el contador de una propuesta mediante votos repetidos.
5. **Inviolabilidad de Producción (`bd_csh`):** Las 33 mesas territoriales, 36 agendas comunitarias y 11 fichas técnicas de indicadores deben permanecer 100% intactas.
6. **Protocolo Zero-Push:** Exclusivamente commits locales atómicos en `main`.

---

## 🔬 4. Quality Gates de Aceptación

1. **`bun run ui:check`**: 0 violaciones de tokens, accesibilidad o capas.
2. **`bun run check`**: `tsc --noEmit` y `eslint .` limpios al 100%.
3. **`bun test`**: Suites de frontend aprobadas (incluyendo tests de apoyos y stores).
4. **`pytest`**: Suites de backend aprobadas (incluyendo pruebas de alternancia de apoyos, unicidad y access policy).
5. **`bun run build`**: Compilación Turbopack en modo standalone sin errores (190+ rutas).
6. **Hot-Verification en vivo**:
   - Realizar `POST /api/v1/aportes/{id}/apoyar` con sesión cívica y verificar incremento de `apoyos_contador`.
   - Realizar segundo `POST /api/v1/aportes/{id}/apoyar` y verificar decremento (toggle) a su valor previo.
   - Consultar `GET /api/v1/aportes/mis-apoyos` y validar coherencia de la lista.
   - Verificar persistencia en la tabla `participacion_ciudadana.apoyos_propuestas`.
