# Entrega codex2 — Delegación granular por módulo
Fecha: 2026-10-02T13:49:12Z
Commit de implementación: 8d84e76043e38b3119743ecde22cefbd333e3e6b

## Resultado

- Los roles personalizados reciben navegación y permisos de edición por módulo, derivados de sus permisos actuales del backend.
- El editor real de Roles y Permisos agrupa el catálogo por áreas y deja asignar acciones específicas; el editor de usuarios permite asignar esos perfiles.
- Se añadieron permisos de lectura/gestión de Geovisor, Contenido y Configuración al catálogo validado por la API.
- Se cubrió con pruebas el caso `admin_formularios`, que administra Formularios sin ver Mesas ni Usuarios; también el rol lector de Geovisor y el límite entre Configuración y control de fases.
- `autoridad_distrital`, `facilitador_mesa`, `auditor_forense`, `administrador_identidades` y `ciudadano` conservan su matriz propia.

## Validación

- `bunx vitest run --project plataforma`: 24 pruebas aprobadas.
- Historia `identidad.stories.tsx`: 21 pruebas aprobadas.
- ESLint de los archivos modificados: aprobado.
- `bun run storybook:build`: aprobado.
- Ruff en catálogo y prueba backend: aprobado.
- `backend/tests/test_identidad_completa.py`: 2 aprobadas, 22 omitidas porque `POLIS_TEST_DATABASE_URL` no está configurada.
- `bun run check` no completa: UI003 reporta 116 incumplimientos en archivos concurrentes de asistencia/actas; TypeScript también falla en `src/app/asistencia/[mesaId]/page.tsx` (`description` no está definido).
- `bun run build` falla en el mismo error TypeScript de asistencia.
- Las historias generales tienen 192 aprobadas y 2 fallidas en flujos existentes de creación de Mesa y Formulario.
- Las rutas locales `/plataforma/usuarios` y `/plataforma/configuracion` respondieron 500 al consultarlas. No reinicié el servicio porque el build de Next no terminó correctamente.

Estado: implementación lista; QA global bloqueado por errores concurrentes fuera de alcance.
