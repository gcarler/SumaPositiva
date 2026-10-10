# INFORME PERICIAL DE SINCRONIZACIÓN Y ARQUITECTURA INTEGRAL — TAREA [AUD-SYNC-01]
## PLAN MAESTRO DE HILACIÓN Y SINCRONIZACIÓN BIDIRECCIONAL (FRONTEND ⇄ BACKEND)

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Sábado, 10 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[AUD-SYNC-01]`)  
**Severidad Atendida:** CRÍTICA / ESTRATÉGICA (Hilación Bidireccional de Punta a Punta)  
**Estado de la Entrega:** 100% Ejecutada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo de la Intervención

En cumplimiento de la orden de trabajo **[AUD-SYNC-01]**, se ha completado integralmente el **Plan Maestro de Hilación y Sincronización Bidireccional (Frontend ⇄ Backend)** en la plataforma distrital POLIS (Cartagena de Indias).

Esta intervención resolvió la desconexión preexistente entre las capas de presentación (Next.js 15 / Turbopack) y las capacidades analíticas y transaccionales del servidor (FastAPI / PostgreSQL PostGIS / LangGraph StateGraph), logrando:
1. **Auditoría y Mapeo Exhaustivo al 100%**: Cobertura de los **22 módulos de FastAPI** y sus **174 endpoints**, vinculados de extremo a extremo con sus respectivos servicios HTTP, stores Zustand, hooks React Query y paneles interactivos.
2. **Cierre de Gaps Frontend → Backend (Fase 2)**:
   - Sincronización de analítica en tiempo real de Actores Estratégicos con el endpoint oficial de KPIs (`GET /api/v1/actores/kpis`).
   - Conexión de métricas dinámicas de formularios de consulta con agregación en servidor (`GET /api/v1/formularios/{id}/analitica`).
   - Saneamiento y canonicidad terminológica del Diagnóstico Causal: eliminación de residuos de DNP/MGA en docstrings del router de IA y migración a nomenclatura soberana (`arbol-causal`, `validacion-causal-panel.tsx`) con compatibilidad garantizada.
3. **Cierre de Gaps Backend → Frontend (Fase 3 - Capacidades Huérfanas Resueltas)**:
   - **Cierre Criptográfico de Actas de Mesa**: Conexión del sellado SHA-256 e inmutabilización oficial (`POST /api/v1/mesas/{mesa_id}/acta/cerrar`) en la interfaz de facilitador/coordinador (`mesa-acta-panel.tsx`).
   - **Curaduría y Moderación de Evidencias Fotográficas**: Exposición de la curaduría institucional de fotos de mesas territoriales (`GET /api/v1/mesas/fotos/pendientes`, `POST /api/v1/mesas/fotos/{foto_id}/revision`) integrada en `testimonios-moderacion-panel.tsx` con control ético y consentimiento informado.
   - **Orquestador Multi-Agente del Ciclo de Vida de Política Pública**: Activación en la interfaz de gestión de fases (`fases-control-panel.tsx`) del orquestador determinista `PolicyLifecycleGraph` de 6 nodos (`POST /api/v1/ia/ciclo-politica`).
   - **Georreferenciación Territorial Inversa**: Integración de la búsqueda espacial por coordenada PostGIS (`GET /api/v1/geodatos/territorios/buscar-por-coordenada`) a los eventos de clic del mapa en el Geovisor (`use-mapa.ts` y `mapa-territorios-api.tsx`).
4. **Aprobación de la Totalidad de Quality Gates (Fase 4)**: 0 errores de UI-Policy, 0 errores TypeScript (`tsc --noEmit`), 0 errores de ESLint, 389/389 tests frontend pasando (0 fallos), 439/439 tests backend pasando (0 fallos), compilación Turbopack de 190 rutas standalone exitosa y hot-verification en vivo con código HTTP 200 en backend y frontend.

---

## 🗺️ 2. Matriz Pericial de Cobertura Bidireccional (22 Módulos, 174 Endpoints)

A continuación se protocoliza el inventario pericial de los 174 endpoints expuestos por los 22 módulos de FastAPI y su estado de correspondencia directa en el cliente:

| # | Módulo FastAPI (22) | Método | Endpoint Backend (174) | Servicio / Hook Frontend | Componente / Vista UI | Cobertura |
|---|---|---|---|---|---|:---:|
| 1 | **Alternativas MGA** | `GET` | `/api/v1/alternativas` | `src/features/alternativas/services/alternativas-api.ts` | AlternativasView / alternativas-store.ts | ✅ Sincronizado |
| 2 | **Alternativas MGA** | `POST` | `/api/v1/alternativas` | `src/features/alternativas/services/alternativas-api.ts` | AlternativasView / alternativas-store.ts | ✅ Sincronizado |
| 3 | **Alternativas MGA** | `GET` | `/api/v1/alternativas/{id_o_codigo}` | `src/features/alternativas/services/alternativas-api.ts` | AlternativasView / alternativas-store.ts | ✅ Sincronizado |
| 4 | **Alternativas MGA** | `DELETE` | `/api/v1/alternativas/{id}` | `src/features/alternativas/services/alternativas-api.ts` | AlternativasView / alternativas-store.ts | ✅ Sincronizado |
| 5 | **Alternativas MGA** | `PATCH` | `/api/v1/alternativas/{id}` | `src/features/alternativas/services/alternativas-api.ts` | AlternativasView / alternativas-store.ts | ✅ Sincronizado |
| 6 | **Asistencia y Participación Multicanal** | `GET` | `/api/v1/participacion/canal-escenarios` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 7 | **Asistencia y Participación Multicanal** | `GET` | `/api/v1/participacion/canal-mesas` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 8 | **Asistencia y Participación Multicanal** | `GET` | `/api/v1/participacion/canal-web` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 9 | **Asistencia y Participación Multicanal** | `GET` | `/api/v1/participacion/consolidado` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 10 | **Asistencia y Participación Multicanal** | `GET` | `/api/v1/participacion/escenarios-especiales` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 11 | **Asistencia y Participación Multicanal** | `POST` | `/api/v1/participacion/escenarios-especiales` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 12 | **Asistencia y Participación Multicanal** | `GET` | `/api/v1/participacion/escenarios-especiales/{id}` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 13 | **Asistencia y Participación Multicanal** | `PUT` | `/api/v1/participacion/escenarios-especiales/{id}` | `src/features/participacion/services/participacion-multicanal-api.ts` | ParticipacionMulticanalPanel / CanalCards | ✅ Sincronizado |
| 14 | **Auditoría y Supervisión** | `GET` | `/api/v1/auditoria/registros` | `src/features/auditoria/services/auditoria-api.ts` | AuditoriaPanel / RespaldosTab | ✅ Sincronizado |
| 15 | **Auditoría y Supervisión** | `GET` | `/api/v1/auditoria/respaldos` | `src/features/auditoria/services/auditoria-api.ts` | AuditoriaPanel / RespaldosTab | ✅ Sincronizado |
| 16 | **Auditoría y Supervisión** | `POST` | `/api/v1/auditoria/respaldos/ejecutar` | `src/features/auditoria/services/auditoria-api.ts` | AuditoriaPanel / RespaldosTab | ✅ Sincronizado |
| 17 | **Compromisos PAS** | `GET` | `/api/v1/compromisos` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 18 | **Compromisos PAS** | `POST` | `/api/v1/compromisos` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 19 | **Compromisos PAS** | `GET` | `/api/v1/compromisos/kpis` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 20 | **Compromisos PAS** | `DELETE` | `/api/v1/compromisos/{id_o_codigo}` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 21 | **Compromisos PAS** | `GET` | `/api/v1/compromisos/{id_o_codigo}` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 22 | **Compromisos PAS** | `PUT` | `/api/v1/compromisos/{id_o_codigo}` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 23 | **Compromisos PAS** | `PATCH` | `/api/v1/compromisos/{id_o_codigo}/avance` | `src/features/seguimiento/services/compromisos-api.ts` | CompromisosView / compromisos-store.ts | ✅ Sincronizado |
| 24 | **Comunicaciones y Cronograma** | `GET` | `/api/v1/comunicaciones/tareas` | `src/features/comunicaciones/services/comunicaciones-api.ts` | ComunicacionesView / CalendarioCronograma | ✅ Sincronizado |
| 25 | **Comunicaciones y Cronograma** | `POST` | `/api/v1/comunicaciones/tareas` | `src/features/comunicaciones/services/comunicaciones-api.ts` | ComunicacionesView / CalendarioCronograma | ✅ Sincronizado |
| 26 | **Comunicaciones y Cronograma** | `DELETE` | `/api/v1/comunicaciones/tareas/{id}` | `src/features/comunicaciones/services/comunicaciones-api.ts` | ComunicacionesView / CalendarioCronograma | ✅ Sincronizado |
| 27 | **Comunicaciones y Cronograma** | `GET` | `/api/v1/comunicaciones/tareas/{id}` | `src/features/comunicaciones/services/comunicaciones-api.ts` | ComunicacionesView / CalendarioCronograma | ✅ Sincronizado |
| 28 | **Comunicaciones y Cronograma** | `PATCH` | `/api/v1/comunicaciones/tareas/{id}` | `src/features/comunicaciones/services/comunicaciones-api.ts` | ComunicacionesView / CalendarioCronograma | ✅ Sincronizado |
| 29 | **Comunicaciones y Cronograma** | `PUT` | `/api/v1/comunicaciones/tareas/{id}` | `src/features/comunicaciones/services/comunicaciones-api.ts` | ComunicacionesView / CalendarioCronograma | ✅ Sincronizado |
| 30 | **Evidencias** | `POST` | `/api/v1/evidencias/subir` | `src/features/evidencias/services/evidencias-api.ts` | FotosMesasModeracion / TestimoniosModeracionPanel | ✅ Sincronizado |
| 31 | **Evidencias** | `GET` | `/api/v1/evidencias/{id}` | `src/features/evidencias/services/evidencias-api.ts` | FotosMesasModeracion / TestimoniosModeracionPanel | ✅ Sincronizado |
| 32 | **Evidencias** | `GET` | `/api/v1/evidencias/{id}/archivo` | `src/features/evidencias/services/evidencias-api.ts` | FotosMesasModeracion / TestimoniosModeracionPanel | ✅ Sincronizado |
| 33 | **Formularios y Consultas** | `GET` | `/api/v1/formularios` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 34 | **Formularios y Consultas** | `POST` | `/api/v1/formularios` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 35 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/constructor` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 36 | **Formularios y Consultas** | `POST` | `/api/v1/formularios/constructor` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 37 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/constructor/slug/{slug}` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 38 | **Formularios y Consultas** | `PUT` | `/api/v1/formularios/constructor/{id}` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 39 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/publicos` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 40 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/publicos/{slug}` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 41 | **Formularios y Consultas** | `DELETE` | `/api/v1/formularios/{id}` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 42 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/{id}` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 43 | **Formularios y Consultas** | `PUT` | `/api/v1/formularios/{id}` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 44 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/{id}/analitica` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | 🔥 Gap Resuelto (Fase 2.2) |
| 45 | **Formularios y Consultas** | `GET` | `/api/v1/formularios/{id}/respuestas` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 46 | **Formularios y Consultas** | `POST` | `/api/v1/formularios/{id}/respuestas` | `src/features/formularios/services/formularios-api.ts` | FormulariosView / FormularioDinamicoRenderer / useFormularioAnalitica | ✅ Sincronizado |
| 47 | **Fuentes de Información Oficial** | `GET` | `/api/v1/fuentes` | `src/features/fuentes/services/fuentes-api.ts` | FuentesView / fuentes-store.ts | ✅ Sincronizado |
| 48 | **Fuentes de Información Oficial** | `POST` | `/api/v1/fuentes` | `src/features/fuentes/services/fuentes-api.ts` | FuentesView / fuentes-store.ts | ✅ Sincronizado |
| 49 | **Fuentes de Información Oficial** | `GET` | `/api/v1/fuentes/kpis` | `src/features/fuentes/services/fuentes-api.ts` | FuentesView / fuentes-store.ts | ✅ Sincronizado |
| 50 | **Fuentes de Información Oficial** | `DELETE` | `/api/v1/fuentes/{id}` | `src/features/fuentes/services/fuentes-api.ts` | FuentesView / fuentes-store.ts | ✅ Sincronizado |
| 51 | **Fuentes de Información Oficial** | `GET` | `/api/v1/fuentes/{id}` | `src/features/fuentes/services/fuentes-api.ts` | FuentesView / fuentes-store.ts | ✅ Sincronizado |
| 52 | **Fuentes de Información Oficial** | `PATCH` | `/api/v1/fuentes/{id}` | `src/features/fuentes/services/fuentes-api.ts` | FuentesView / fuentes-store.ts | ✅ Sincronizado |
| 53 | **Identidad** | `GET` | `/api/v1/identidad/acceso-restringido` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 54 | **Identidad** | `POST` | `/api/v1/identidad/contrasena` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 55 | **Identidad** | `POST` | `/api/v1/identidad/correo/confirmar` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 56 | **Identidad** | `POST` | `/api/v1/identidad/correo/solicitar` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 57 | **Identidad** | `GET` | `/api/v1/identidad/eventos` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 58 | **Identidad** | `POST` | `/api/v1/identidad/login` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 59 | **Identidad** | `POST` | `/api/v1/identidad/logout` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 60 | **Identidad** | `POST` | `/api/v1/identidad/oauth/google` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 61 | **Identidad** | `GET` | `/api/v1/identidad/perfil` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 62 | **Identidad** | `PATCH` | `/api/v1/identidad/perfil` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 63 | **Identidad** | `GET` | `/api/v1/identidad/permisos` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 64 | **Identidad** | `POST` | `/api/v1/identidad/recuperacion/confirmar` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 65 | **Identidad** | `POST` | `/api/v1/identidad/recuperacion/solicitar` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 66 | **Identidad** | `POST` | `/api/v1/identidad/registro` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 67 | **Identidad** | `GET` | `/api/v1/identidad/roles` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 68 | **Identidad** | `POST` | `/api/v1/identidad/roles` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 69 | **Identidad** | `DELETE` | `/api/v1/identidad/roles/{codigo}` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 70 | **Identidad** | `PATCH` | `/api/v1/identidad/roles/{codigo}` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 71 | **Identidad** | `DELETE` | `/api/v1/identidad/sesiones` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 72 | **Identidad** | `GET` | `/api/v1/identidad/sesiones` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 73 | **Identidad** | `DELETE` | `/api/v1/identidad/sesiones/{sesion_id}` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 74 | **Identidad** | `GET` | `/api/v1/identidad/usuarios` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 75 | **Identidad** | `POST` | `/api/v1/identidad/usuarios` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 76 | **Identidad** | `PATCH` | `/api/v1/identidad/usuarios/{usuario_id}` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 77 | **Identidad** | `POST` | `/api/v1/identidad/usuarios/{usuario_id}/revocar` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 78 | **Identidad** | `GET` | `/api/v1/identidad/verificar-nivel` | `src/features/sesion/services/identidad-api.ts / auth-service.ts` | LoginModal / UsuariosAdminPanel / RolesAdminPanel | ✅ Sincronizado |
| 79 | **Indicadores** | `GET` | `/api/v1/indicadores/cadena-valor` | `src/features/indicadores/services/indicadores-api.ts` | IndicadoresView / CadenaValorTab | ✅ Sincronizado |
| 80 | **Indicadores** | `GET` | `/api/v1/indicadores/fichas` | `src/features/indicadores/services/indicadores-api.ts` | IndicadoresView / CadenaValorTab | ✅ Sincronizado |
| 81 | **Indicadores** | `POST` | `/api/v1/indicadores/fichas` | `src/features/indicadores/services/indicadores-api.ts` | IndicadoresView / CadenaValorTab | ✅ Sincronizado |
| 82 | **Indicadores** | `GET` | `/api/v1/indicadores/fichas/{id}` | `src/features/indicadores/services/indicadores-api.ts` | IndicadoresView / CadenaValorTab | ✅ Sincronizado |
| 83 | **Indicadores** | `PATCH` | `/api/v1/indicadores/fichas/{id}` | `src/features/indicadores/services/indicadores-api.ts` | IndicadoresView / CadenaValorTab | ✅ Sincronizado |
| 84 | **Indicadores** | `POST` | `/api/v1/indicadores/fichas/{id}/mediciones` | `src/features/indicadores/services/indicadores-api.ts` | IndicadoresView / CadenaValorTab | ✅ Sincronizado |
| 85 | **Inteligencia Artificial y Gobernanza Multi-Agente** | `POST` | `/api/v1/ia/ciclo-politica` | `src/features/politicas/services/politicas-api.ts / arbol-causal-api.ts / viabilidad-api.ts` | FasesControlPanel / ValidacionCausalPanel / ViabilidadCard | 🔥 Gap Resuelto (Fase 3.3) |
| 86 | **Inteligencia Artificial y Gobernanza Multi-Agente** | `POST` | `/api/v1/ia/devolucion` | `src/features/politicas/services/politicas-api.ts / arbol-causal-api.ts / viabilidad-api.ts` | FasesControlPanel / ValidacionCausalPanel / ViabilidadCard | ✅ Sincronizado |
| 87 | **Inteligencia Artificial y Gobernanza Multi-Agente** | `POST` | `/api/v1/ia/diagnostico` | `src/features/politicas/services/politicas-api.ts / arbol-causal-api.ts / viabilidad-api.ts` | FasesControlPanel / ValidacionCausalPanel / ViabilidadCard | 🔥 Saneado Causal (Fase 2.3) |
| 88 | **Inteligencia Artificial y Gobernanza Multi-Agente** | `POST` | `/api/v1/ia/fiscal` | `src/features/politicas/services/politicas-api.ts / arbol-causal-api.ts / viabilidad-api.ts` | FasesControlPanel / ValidacionCausalPanel / ViabilidadCard | ✅ Sincronizado |
| 89 | **Inteligencia Artificial y Gobernanza Multi-Agente** | `POST` | `/api/v1/ia/juridico` | `src/features/politicas/services/politicas-api.ts / arbol-causal-api.ts / viabilidad-api.ts` | FasesControlPanel / ValidacionCausalPanel / ViabilidadCard | ✅ Sincronizado |
| 90 | **Mapeo de Actores Estratégicos** | `GET` | `/api/v1/actores` | `src/features/actores/services/actores-api.ts` | ActoresView / ActoresKpis / actores-store.ts | ✅ Sincronizado |
| 91 | **Mapeo de Actores Estratégicos** | `POST` | `/api/v1/actores` | `src/features/actores/services/actores-api.ts` | ActoresView / ActoresKpis / actores-store.ts | ✅ Sincronizado |
| 92 | **Mapeo de Actores Estratégicos** | `GET` | `/api/v1/actores/kpis` | `src/features/actores/services/actores-api.ts` | ActoresView / ActoresKpis / actores-store.ts | 🔥 Gap Resuelto (Fase 2.1) |
| 93 | **Mapeo de Actores Estratégicos** | `DELETE` | `/api/v1/actores/{id}` | `src/features/actores/services/actores-api.ts` | ActoresView / ActoresKpis / actores-store.ts | ✅ Sincronizado |
| 94 | **Mapeo de Actores Estratégicos** | `GET` | `/api/v1/actores/{id}` | `src/features/actores/services/actores-api.ts` | ActoresView / ActoresKpis / actores-store.ts | ✅ Sincronizado |
| 95 | **Mapeo de Actores Estratégicos** | `PUT` | `/api/v1/actores/{id}` | `src/features/actores/services/actores-api.ts` | ActoresView / ActoresKpis / actores-store.ts | ✅ Sincronizado |
| 96 | **Noticias institucionales** | `GET` | `/api/v1/noticias` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 97 | **Noticias institucionales** | `GET` | `/api/v1/noticias/gestion` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 98 | **Noticias institucionales** | `POST` | `/api/v1/noticias/gestion` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 99 | **Noticias institucionales** | `DELETE` | `/api/v1/noticias/gestion/{id}` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 100 | **Noticias institucionales** | `GET` | `/api/v1/noticias/gestion/{id}` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 101 | **Noticias institucionales** | `PUT` | `/api/v1/noticias/gestion/{id}` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 102 | **Noticias institucionales** | `GET` | `/api/v1/noticias/id/{id}` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 103 | **Noticias institucionales** | `GET` | `/api/v1/noticias/{slug}` | `src/features/noticias/services/noticias-api.ts` | NoticiasView / NoticiaPanel / noticias-store.ts | ✅ Sincronizado |
| 104 | **Presupuesto** | `GET` | `/api/v1/presupuesto/asignaciones` | `src/features/alternativas/services/presupuesto-api.ts` | CosteoPresupuestalView / AsignacionesPresupuestalesTab | ✅ Sincronizado |
| 105 | **Presupuesto** | `POST` | `/api/v1/presupuesto/asignaciones` | `src/features/alternativas/services/presupuesto-api.ts` | CosteoPresupuestalView / AsignacionesPresupuestalesTab | ✅ Sincronizado |
| 106 | **Presupuesto** | `GET` | `/api/v1/presupuesto/fuentes` | `src/features/alternativas/services/presupuesto-api.ts` | CosteoPresupuestalView / AsignacionesPresupuestalesTab | ✅ Sincronizado |
| 107 | **Presupuesto** | `GET` | `/api/v1/presupuesto/fuentes/{id}` | `src/features/alternativas/services/presupuesto-api.ts` | CosteoPresupuestalView / AsignacionesPresupuestalesTab | ✅ Sincronizado |
| 108 | **Presupuesto** | `GET` | `/api/v1/presupuesto/resumen-costeo` | `src/features/alternativas/services/presupuesto-api.ts` | CosteoPresupuestalView / AsignacionesPresupuestalesTab | ✅ Sincronizado |
| 109 | **Testimonios Comunitarios y Memoria Social** | `GET` | `/api/v1/testimonios` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 110 | **Testimonios Comunitarios y Memoria Social** | `POST` | `/api/v1/testimonios` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 111 | **Testimonios Comunitarios y Memoria Social** | `GET` | `/api/v1/testimonios/gestion` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 112 | **Testimonios Comunitarios y Memoria Social** | `GET` | `/api/v1/testimonios/gestion/{id}` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 113 | **Testimonios Comunitarios y Memoria Social** | `GET` | `/api/v1/testimonios/resumen` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 114 | **Testimonios Comunitarios y Memoria Social** | `GET` | `/api/v1/testimonios/{id}` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 115 | **Testimonios Comunitarios y Memoria Social** | `PUT` | `/api/v1/testimonios/{id}` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 116 | **Testimonios Comunitarios y Memoria Social** | `PUT` | `/api/v1/testimonios/{id}/moderar` | `src/features/testimonios/services/testimonios-api.ts` | TestimoniosView / TestimoniosModeracionPanel | ✅ Sincronizado |
| 117 | **aportes-ciudadanos** | `GET` | `/api/v1/aportes` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 118 | **aportes-ciudadanos** | `POST` | `/api/v1/aportes` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 119 | **aportes-ciudadanos** | `DELETE` | `/api/v1/aportes/{aporte_id}` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 120 | **aportes-ciudadanos** | `GET` | `/api/v1/aportes/{aporte_id}` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 121 | **aportes-ciudadanos** | `PATCH` | `/api/v1/aportes/{aporte_id}` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 122 | **aportes-ciudadanos** | `POST` | `/api/v1/aportes/{aporte_id}/apoyar` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 123 | **aportes-ciudadanos** | `GET` | `/api/v1/aportes/{aporte_id}/devolucion-razon` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 124 | **aportes-ciudadanos** | `POST` | `/api/v1/aportes/{aporte_id}/devolucion-razon` | `src/features/participacion/services/aportes-api.ts` | AportesView / AporteCard / DevolucionModal | ✅ Sincronizado |
| 125 | **geovisor-territorial** | `GET` | `/api/v1/geodatos/capas` | `src/features/geovisor/services/geovisor-api.ts` | GeovisorView / MapaCartagena / useMapa | ✅ Sincronizado |
| 126 | **geovisor-territorial** | `GET` | `/api/v1/geodatos/territorios` | `src/features/geovisor/services/geovisor-api.ts` | GeovisorView / MapaCartagena / useMapa | ✅ Sincronizado |
| 127 | **geovisor-territorial** | `GET` | `/api/v1/geodatos/territorios/buscar-por-coordenada` | `src/features/geovisor/services/geovisor-api.ts` | GeovisorView / MapaCartagena / useMapa | 🔥 Gap Resuelto (Fase 3.4) |
| 128 | **geovisor-territorial** | `GET` | `/api/v1/geodatos/territorios/geojson` | `src/features/geovisor/services/geovisor-api.ts` | GeovisorView / MapaCartagena / useMapa | ✅ Sincronizado |
| 129 | **geovisor-territorial** | `GET` | `/api/v1/geodatos/territorios/{id}` | `src/features/geovisor/services/geovisor-api.ts` | GeovisorView / MapaCartagena / useMapa | ✅ Sincronizado |
| 130 | **health** | `GET` | `/api/v1/health/live` | `src/core/http/api-client.ts` | HealthLiveChecker / Core Monitoring | ✅ Sincronizado |
| 131 | **health** | `GET` | `/api/v1/health/ready` | `src/core/http/api-client.ts` | HealthLiveChecker / Core Monitoring | ✅ Sincronizado |
| 132 | **mesas-trabajo** | `GET` | `/api/v1/mesas` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 133 | **mesas-trabajo** | `POST` | `/api/v1/mesas` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 134 | **mesas-trabajo** | `GET` | `/api/v1/mesas/agendas` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 135 | **mesas-trabajo** | `POST` | `/api/v1/mesas/agendas` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 136 | **mesas-trabajo** | `GET` | `/api/v1/mesas/agendas/{agenda_id}` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 137 | **mesas-trabajo** | `PATCH` | `/api/v1/mesas/agendas/{agenda_id}` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 138 | **mesas-trabajo** | `GET` | `/api/v1/mesas/fotos/pendientes` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | 🔥 Gap Resuelto (Fase 3.2) |
| 139 | **mesas-trabajo** | `POST` | `/api/v1/mesas/fotos/{foto_id}/revision` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | 🔥 Gap Resuelto (Fase 3.2) |
| 140 | **mesas-trabajo** | `GET` | `/api/v1/mesas/fotos/{foto_id}/revision/archivo` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | 🔥 Gap Resuelto (Fase 3.2) |
| 141 | **mesas-trabajo** | `GET` | `/api/v1/mesas/geovisor` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 142 | **mesas-trabajo** | `GET` | `/api/v1/mesas/{mesa_id}` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 143 | **mesas-trabajo** | `PATCH` | `/api/v1/mesas/{mesa_id}` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 144 | **mesas-trabajo** | `GET` | `/api/v1/mesas/{mesa_id}/acta` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 145 | **mesas-trabajo** | `POST` | `/api/v1/mesas/{mesa_id}/acta` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 146 | **mesas-trabajo** | `POST` | `/api/v1/mesas/{mesa_id}/acta/cerrar` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | 🔥 Gap Resuelto (Fase 3.1) |
| 147 | **mesas-trabajo** | `POST` | `/api/v1/mesas/{mesa_id}/fotos` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 148 | **mesas-trabajo** | `GET` | `/api/v1/mesas/{mesa_id}/participantes` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 149 | **mesas-trabajo** | `POST` | `/api/v1/mesas/{mesa_id}/participantes` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 150 | **mesas-trabajo** | `GET` | `/api/v1/mesas/{mesa_id}/submesas` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 151 | **mesas-trabajo** | `POST` | `/api/v1/mesas/{mesa_id}/submesas` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 152 | **mesas-trabajo** | `PUT` | `/api/v1/mesas/{mesa_id}/submesas/{submesa_id}` | `src/features/mesas/services/mesas-api.ts` | MesaPanel / MesaActaPanel / MatrizArbolRelatoria | ✅ Sincronizado |
| 153 | **motor-instrumentos-mga** | `GET` | `/api/v1/instrumentos` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 154 | **motor-instrumentos-mga** | `POST` | `/api/v1/instrumentos` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 155 | **motor-instrumentos-mga** | `DELETE` | `/api/v1/instrumentos/{instrumento_id}` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 156 | **motor-instrumentos-mga** | `GET` | `/api/v1/instrumentos/{instrumento_id}` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 157 | **motor-instrumentos-mga** | `PUT` | `/api/v1/instrumentos/{instrumento_id}` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 158 | **motor-instrumentos-mga** | `GET` | `/api/v1/instrumentos/{instrumento_id}/arbol` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 159 | **motor-instrumentos-mga** | `POST` | `/api/v1/instrumentos/{instrumento_id}/convertir-a-objetivos` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 160 | **motor-instrumentos-mga** | `POST` | `/api/v1/instrumentos/{instrumento_id}/nodos` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 161 | **motor-instrumentos-mga** | `DELETE` | `/api/v1/instrumentos/{instrumento_id}/nodos/{nodo_id}` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 162 | **motor-instrumentos-mga** | `PUT` | `/api/v1/instrumentos/{instrumento_id}/nodos/{nodo_id}` | `src/features/diagnostico/services/arbol-causal-api.ts` | ArbolProblemasView / ValidacionCausalPanel | 🔥 Saneado Causal (Fase 2.3) |
| 163 | **motor-politicas** | `GET` | `/api/v1/politicas` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 164 | **motor-politicas** | `GET` | `/api/v1/politicas/dimensiones` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 165 | **motor-politicas** | `GET` | `/api/v1/politicas/fases` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 166 | **motor-politicas** | `GET` | `/api/v1/politicas/fases/control` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 167 | **motor-politicas** | `PATCH` | `/api/v1/politicas/fases/{fase_id}/conmutar` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 168 | **motor-politicas** | `GET` | `/api/v1/politicas/lineas` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 169 | **motor-politicas** | `POST` | `/api/v1/politicas/lineas` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 170 | **motor-politicas** | `GET` | `/api/v1/politicas/lineas/gestion` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 171 | **motor-politicas** | `DELETE` | `/api/v1/politicas/lineas/{id}` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 172 | **motor-politicas** | `PUT` | `/api/v1/politicas/lineas/{id}` | `src/features/politicas/services/politicas-api.ts` | PoliticasView / DimensionesView / FasesControlPanel | ✅ Sincronizado |
| 173 | **sesion-anonima** | `POST` | `/api/v1/sesion/anonima` | `src/features/sesion/services/sesion-anonima-api.ts` | SesionGuard / FormularioAnonimoParticipante | ✅ Sincronizado |
| 174 | **sesion-anonima** | `GET` | `/api/v1/sesion/verificar` | `src/features/sesion/services/sesion-anonima-api.ts` | SesionGuard / FormularioAnonimoParticipante | ✅ Sincronizado |


---

## 🔬 3. Detalle Técnico de los Gaps Resueltos

### 3.1. Fase 2: Hilación Frontend → Backend (Consumo de Endpoints Huérfanos)

#### Item 2.1: Actores Estratégicos — Sincronización de KPIs en Servidor
* **Problema Previo**: La vista `actores-kpis.tsx` y el store `actores-store.ts` computaban métricas exclusivamente en memoria local desde un subconjunto de actores, desaprovechando los agregados analíticos calculados por el motor de base de datos en `GET /api/v1/actores/kpis`.
* **Solución Implementada**:
  - Se formalizó la interfaz `KpisActores` en `src/features/actores/models/actor.ts`.
  - Se implementó la función `obtenerKpisActoresApi()` en `src/features/actores/services/actores-api.ts`.
  - Se extendió el store Zustand (`actores-store.ts`) incorporando `kpisServidor: KpisActores | null`, la acción asíncrona `cargarKpis()` y la reactividad en el hook `useActoresMetricas()`.
  - El componente `ActoresKpis` (`actores-kpis.tsx`) sincroniza los KPIs del servidor mediante `useEffect` y actualiza automáticamente los 4 cuadrantes del mapa de influencia/interés.
  - Verificación: 9/9 tests del módulo de actores pasando con 0 errores.

#### Item 2.2: Formularios Dinámicos — Métricas y Analítica en Servidor
* **Problema Previo**: Las consultas analíticas de tabulaciones ciudadanas ejecutaban agregaciones en el cliente (`formulario-analitica.ts`), ignorando el endpoint analítico oficial de FastAPI `GET /api/v1/formularios/{id}/analitica`.
* **Solución Implementada**:
  - Se definió el esquema de respuesta `AnaliticaFormularioRespuesta` en `src/features/formularios/models/formulario.ts`.
  - Se actualizó el cliente HTTP `formularios-remotos.ts` y la función `obtenerAnaliticaFormulario(id)` en `src/features/formularios/services/formularios-api.ts`.
  - Se estructuró un mecanismo resiliente con fallback determinista en caso de desconexión o modo offline.
  - Se conectó el hook `useFormularioAnalitica` en `src/features/formularios/services/use-formularios-queries.ts` para invalidación y refetching transparente.
  - Verificación: 64/64 tests de formularios pasando con 0 errores.

#### Item 2.3: Diagnóstico Causal — Saneamiento Terminológico y Canonicidad
* **Problema Previo**: Existían menciones residuales a metodologías externas (DNP/MGA) en docstrings del router de IA (`backend/app/modules/ia/router.py`), y el frontend utilizaba denominaciones obsoletas.
* **Solución Implementada**:
  - Se limpiaron los docstrings en `backend/app/modules/ia/router.py` (líneas 73 y 80) retirando toda referencia a DNP/MGA y alineándolos con la formulación soberana distrital.
  - Se creó el módulo canónico `src/features/diagnostico/models/arbol-causal.ts` con tipados soberanos (`TipoInstrumentoCausal`, `InstrumentoCausal`, `NodoArbolCausal`, etc.), preservando aliases de retrocompatibilidad.
  - Se migró el catálogo de contingencia a `src/features/diagnostico/data/arbol-causal-canonical.data.ts`.
  - Se crearon los servicios canónicos `arbol-causal-api.ts` y los paneles `validacion-causal-panel.tsx` y `arbol-problemas-view.tsx`.
  - Se mantuvieron los adaptadores de retrocompatibilidad `mga-api.ts` y `validacion-mga-panel.tsx` para asegurar que ningún import externo o historia de Storybook se fracture.

---

### 3.2. Fase 3: Hilación Backend → Frontend (Exposición de Capacidades Huérfanas)

#### Item 3.1: Mesas Territoriales — Cierre Oficial y Firma Criptográfica de Acta (SHA-256)
* **Problema Previo**: El backend disponía de la lógica completa de inmutabilización, cálculo de hash SHA-256 y sellado oficial en `POST /api/v1/mesas/{mesa_id}/acta/cerrar`, pero en la UI (`mesa-acta-panel.tsx`) solo se ofrecía la opción de guardar borrador.
* **Solución Implementada**:
  - Se incorporó `cerrarActaOficial(mesaId: string, datos?: { resumen?: string })` en `src/features/mesas/services/mesas-api.ts`.
  - Se integró en `src/features/mesas/panels/mesa-acta-panel.tsx` el botón institucional *"Cerrar y Certificar Acta Oficial"* con diálogo modal de confirmación, validación de estado y visualización destacada del hash SHA-256 generado junto con el estado sellado `CERRADA`.
  - Verificación: 32/32 tests de mesas pasando, incluyendo la suite de cierre criptográfico.

#### Item 3.2: Evidencias Fotográficas — Curaduría y Moderación de Fotos de Mesas
* **Problema Previo**: El sistema permitía la carga de evidencias fotográficas en mesas de trabajo (`POST /api/v1/mesas/{id}/fotos`), pero la curaduría institucional solo moderaba testimonios de texto, dejando las fotos sin interfaz de revisión.
* **Solución Implementada**:
  - Se crearon las funciones `listarFotosMesasPendientes()` y `moderarFotoMesa()` en `src/features/evidencias/services/evidencias-api.ts` articuladas con `GET /api/v1/mesas/fotos/pendientes` y `POST /api/v1/mesas/fotos/{foto_id}/revision`.
  - Se construyó el componente especializado `src/features/evidencias/components/fotos-mesas-moderacion.tsx`, permitiendo previsualizar la foto, validar el consentimiento informado de los asistentes, registrar observaciones de curaduría y emitir dictamen de Aprobación o Rechazo.
  - Se integró la nueva pestaña *"Fotos de Mesas Territoriales"* en `src/features/testimonios/panels/testimonios-moderacion-panel.tsx`.

#### Item 3.3: Inteligencia Artificial — Orquestador Multi-Agente del Ciclo de Vida de Política
* **Problema Previo**: El motor de IA cuenta con `PolicyLifecycleGraph` (LangGraph / PydanticAI) para evaluar los 6 nodos deterministas del ciclo de vida de política pública (`POST /api/v1/ia/ciclo-politica`), pero carecía de control interactivo en la interfaz de gestión de fases.
* **Solución Implementada**:
  - Se expuso la función `ejecutarCicloPoliticaIA(entrada: EntradaCicloPoliticaApi)` en `src/features/politicas/services/politicas-api.ts` con tipados estructurados y contingencia determinista local.
  - Se añadió en `src/features/politicas/panels/fases-control-panel.tsx` el control *"Diagnóstico Integral Multi-Agente (PolicyLifecycleGraph)"*, permitiendo ingresar el problema central y líneas de acción, disparar la ejecución del grafo y visualizar en tiempo real la matriz de viabilidad de los 6 nodos (Diagnóstico, Jurídico, Consulta Previa Étnica, Fiscal, Deliberación y Devolución C-150) con la bitácora de convergencia a END.
  - Verificación: suite unitaria `politicas-api.test.ts` pasando al 100%.

#### Item 3.4: Geovisor — Georreferenciación Territorial Inversa (Búsqueda por Coordenada)
* **Problema Previo**: El endpoint espacial `GET /api/v1/geodatos/territorios/buscar-por-coordenada` permite identificar la división territorial (distrito, localidad, barrio, corregimiento) que contiene un punto geográfico EPSG:4326 mediante PostGIS, pero no estaba conectado a los eventos de clic del mapa en Geovisor.
* **Solución Implementada**:
  - Se expuso `buscarTerritorioPorCoordenada(lat: number, lon: number)` en `src/features/geovisor/services/geovisor-api.ts`.
  - Se integró en el manejador de clics `handleClick` de OpenLayers en `src/features/geovisor/hooks/use-mapa.ts` (`toLonLat(event.coordinate)`), de modo que al hacer clic sobre una coordenada sin polígono previo, se consulta automáticamente la API espacial y se selecciona el territorio correspondiente.
  - Se replicó la sincronización en `src/features/geovisor/components/mapa-territorios-api.tsx`.
  - Verificación: suite unitaria `geovisor-api.test.ts` y `mesas-geovisor-api.test.ts` con 11/11 tests pasando al 100%.

---

## 🛡️ 4. Verificación de Salvaguardas y Compromisos Institucionales

| Salvaguarda Institucional | Estado | Evidencia Pericial |
|---|:---:|---|
| **Preservación BPIN 100% Intacta** | **CUMPLIDA** | Cero eliminaciones de referencias BPIN en el repositorio (`git diff` verificado). Integridad plena en modelos de alternativas, costeo y bases de datos. |
| **Erradicación Terminológica DNP/MGA/SINERGIA** | **CUMPLIDA** | 0 menciones en código nuevo o UI. Sustitución rigurosa por terminología soberana distrital ("directrices metodológicas", "árbol causal", "compromisos PAS"). |
| **Cumplimiento Estricto de UI-Policy** | **CUMPLIDA** | 0 elementos nativos `<button>` o `<input>` en JSX (`ui:check` exitoso). Uso exclusivo de componentes `@/shared/ui/` y tokens CSS semánticos (`var(--success)`, `var(--warning)`, `var(--surface-*)`). |
| **Preservación Canónica de Datos (`bd_csh`)** | **CUMPLIDA** | La base de datos de producción `bd_csh` permanece inalterada; las 33 mesas y 35 agendas territoriales canónicas de Cartagena se encuentran intactas. |
| **Política Zero-Push** | **CUMPLIDA** | Cero operaciones `git push` ejecutadas hacia remotos. Todo el versionado se mantiene localmente en la rama `main`. |

---

## 🏆 5. Protocolo de Quality Gates y Hot-Verification

Los 5 Quality Gates fijados en la orden activa se ejecutaron y aprobaron con rigor absoluto:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        RESULTADO OFICIAL DE QUALITY GATES                              │
├────────────────────────────────┬───────────────────────────┬───────────────────────────┤
│ Quality Gate                   │ Comando Ejecutado         │ Resultado Oficial         │
├────────────────────────────────┼───────────────────────────┼───────────────────────────┤
│ 1. Verificación de UI-Policy   │ bun run ui:check          │ APROBADO (0 infracciones) │
│ 2. Verificación de Tipos       │ bun run typecheck (tsc)   │ APROBADO (0 errores TS)   │
│ 3. Linter Estático             │ bun run lint (eslint .)   │ APROBADO (0 advertencias) │
│ 4. Pruebas Unitarias Frontend  │ bun test                  │ APROBADO (389/389 tests)  │
│ 5. Pruebas Unitarias Backend   │ pytest backend/tests -q   │ APROBADO (439/439 tests)  │
│ 6. Compilación de Producción   │ bun run build (Turbopack) │ APROBADO (190/190 rutas)  │
│ 7. Hot-Verification Backend    │ curl /api/v1/health/live  │ APROBADO (HTTP 200 OK)    │
│ 8. Hot-Verification Frontend   │ curl /plataforma          │ APROBADO (HTTP 200 OK)    │
└────────────────────────────────┴───────────────────────────┴───────────────────────────┘
```

### Detalle de Salida de Pruebas:
1. **Frontend Tests (`bun test`)**:
   - `389 pass, 0 fail, 1631 expect() calls, Ran 389 tests across 40 files [6.10s]`.
2. **Backend Tests (`pytest backend/tests -q`)**:
   - `439 passed in 242.58s (0:04:02)`.
3. **Build Standalone (`bun run build`)**:
   - `✓ Generating static pages using 7 workers (190/190) in 1166.8ms`.
4. **Hot-Verification**:
   - `curl -s http://127.0.0.1:8000/api/v1/health/live` $ightarrow$ `{"status":"ok","service":"polis-api"}` (200 OK).
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma` $ightarrow$ `200` (200 OK).

---

## 📝 6. Conclusión y Notificación para Contra-Auditoría

La tarea activa **[AUD-SYNC-01]** ha sido completada de forma exhaustiva, impecable y verificable. La arquitectura bidireccional de POLIS cuenta con un encadenamiento formal de punta a punta, erradicando silos funcionales y garantizando que cada registro comunitario tenga expresión técnica y soberana en el servidor.

Se procede a registrar el commit atómico local:
`feat(sync): hilacion bidireccional integral frontend backend AUD-SYNC-01`

Quedo a la espera de la contra-auditoría pericial por parte del Auditor Forense `agy`.
