# ENCARGO 321: AUDITORÍA DE CALIDAD EXHAUSTIVA AL 100% DE LA PLATAFORMA POLIS

- **Destinatario:** Subagente `agy2` (tmux `agy2:0`)
- **Emisor:** Coordinación General Antigravity
- **Fecha:** 2026-11-09 · **Estado:** ASIGNADO EN EJECUCIÓN
- **Referencia del Usuario:**
  > *"pidele a agy2 que le haga una claida exhustiva a la plataforma, mejor dicho un aauditoria de calidad al 100%"*
- **Reglas Rectoras:**
  - Base de datos de producción `bd_csh` estrictamente congelada en migración 0096. Cero migraciones Alembic.
  - Cero operaciones `git commit` o `git push` sin autorización expresa.
  - Cero infracciones en `node scripts/ui-policy.mjs`.

---

## 1. Diagnóstico y Objetivo del Encargo

El usuario ha solicitado una **auditoría de calidad exhaustiva al 100%** sobre la totalidad de la plataforma POLIS (Frontend, Backend, Experiencia de Usuario, Documentos Oficiales, Servicios Productivos y Salvaguardas de Datos).

Subagente `agy2` debe realizar una inspección forense e integral que evalúe y certifique cada una de las capas del sistema conforme a los estándares de calidad vigentes.

---

## 2. Alcance de la Auditoría en 10 Dimensiones de Calidad

`agy2` debe auditar sistemáticamente las siguientes 10 dimensiones:

### Dimensión 1: Sistema de Diseño y Cumplimiento de Políticas UI
- Ejecutar y validar `node scripts/ui-policy.mjs`: controles interactivos accesibles, uso exclusivo de tokens semánticos (sin clases Tailwind arbitrarias como `bg-blue-500` o `text-gray-700`), capas `surface-1`/`surface-2`, inventario de componentes y cobertura de historias de Storybook.
- **Regla 10 de Iconografía:** Verificar la erradicación total de iconos con dibujos, comida, juegos o estilo caricatura (`Handshake`, `Coffee`, `Dice5`, `Sparkles`, `VenetianMask`, `HeartHandshake`, etc.). Confirmar uso exclusivo de iconos minimalistas y sofisticados de Lucide (`Users2`, `Package`, `Shuffle`, `BadgeCheck`, `PenLine`, `FileText`, `GitBranch`, `UserRound`, `Shield`, `Quote`, `Network`).
- Verificar vigencia de [`docs/kit-ui-rules.md`](file:///root/polis/docs/kit-ui-rules.md) y [`docs/design-system.md`](file:///root/polis/docs/design-system.md).

### Dimensión 2: Calidad Estática de Código (Typecheck y Linter)
- TypeScript: `tsc --noEmit` / `bun run typecheck` &rarr; **0 errores**.
- Linter: `eslint .` / `bun run lint` &rarr; **0 errores, 0 advertencias**.
- Verificar que no existan variables sin uso (`@typescript-eslint/no-unused-vars`) ni castings forzados inseguros.

### Dimensión 3: Cobertura de Suites de Pruebas Frontend (`bun test`)
- Ejecutar la suite completa de pruebas unitarias y de integración frontend:
  - `bun test src/features/mesas/` (172+ pruebas).
  - `bun test src/features/plataforma/` (80+ pruebas).
  - `bun test src/features/sesion/`.
  - `bun test src/features/actores/`.
  - `bun test src/features/noticias/`.
  - `bun test src/features/testimonios/`.
  - `bun test src/features/seguridad-humana/`.
  - `bun test src/features/politicas/`.
  - `bun test src/shared/`.
- Registrar total de pruebas ejecutadas, aserciones y tasa de éxito (100% esperado).

### Dimensión 4: Cobertura de Suites de Pruebas Backend (`pytest`)
- Ejecutar la suite de pruebas del backend en `/root/polis/backend`:
  - `uv run pytest tests/test_acta_pdf.py` (verificación de PDF estilo Google Docs).
  - `uv run pytest tests/test_actores_estrategicos.py`.
  - `uv run pytest tests/test_sm_core.py`.
  - `uv run pytest tests/test_herald_salud_resumen.py`.
- Registrar estado de passing/skipped y confirmar ausencia de fallos críticos.

### Dimensión 5: Alternador de Vistas y Nomenclatura «Matriz» (RevoGrid)
- Verificar en [`src/shared/ui/collection-view.tsx`](file:///root/polis/src/shared/ui/collection-view.tsx) que `CollectionViewToggle` presenta los 3 botones accesibles uno al lado del otro:
  `[ Lista ]  [ Cuadrícula ]  [ Matriz ]`
- Confirmar que se eliminó cualquier referencia a «Cuadrícula RevoGrid» en UI, etiquetas `aria-label` y comentarios de código.
- Verificar en [`src/features/plataforma/views/mesas-view.tsx`](file:///root/polis/src/features/plataforma/views/mesas-view.tsx) que la selección de `Matriz` monta el catálogo [`MesasMatrizCatalogoRevogrid`](file:///root/polis/src/features/mesas/components/mesas-matriz-catalogo-revogrid.tsx).
- Verificar que las acciones de exportación a `Copiar TSV` y `Descargar CSV` funcionen correctamente.
- Comprobar que dentro de la relatoría técnica de cada mesa ([`matriz-arbol-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-arbol-relatoria.tsx)) la pestaña se llame exclusivamente `Matriz`.

### Dimensión 6: Elaboración Editorial de Documentos Descargables (Estilo Google Docs)
- Auditar [`backend/app/modules/mesas/acta_pdf.py`](file:///root/polis/backend/app/modules/mesas/acta_pdf.py) y el documento oficial descargable:
  - Exactamente 3 páginas balanceadas en formato Carta (`letter`).
  - Márgenes de 2.0 cm (ancho útil de 17.59 cm).
  - Jerarquía tipográfica con interlineado 1.41.
  - Tablas ejecutivas con bordes tenues de 0.5 pt (`#E2E8F0`) y fondos suaves (`#F8FAFC`).
  - Callout boxes con acento lateral de 3.0 pt en azul cívico y verde transformación.
  - Paginación de dos pasadas `ActaNumberedCanvas` (*«Página X de Y»*).
  - Contenido territorial exhaustivo: 11 secciones (Preámbulo Ley 1757/2015, Metodología, Árbol de Problemas, Árbol de Soluciones, Matriz de Compromisos, Relatoría, Logística, Sello SHA-256, QR nítido y 4 firmas solemnes).

### Dimensión 7: Navegación, Sesión y Delimitación de Roles
- Auditar la protección de rutas técnicas en [`PlataformaShell`](file:///root/polis/src/features/plataforma/components/plataforma-shell.tsx).
- Confirmar que los usuarios ciudadanos no autenticados o con rol ciudadano acceden normalmente al portal cívico (`/`, `/seguridad-humana`, `/geovisor`, etc.) y que la vista pública de mesas permite consulta en modo solo lectura sin expulsar al usuario.
- Verificar los flujos de autenticación: Login con contraseña, Magic Link (enlace directo al correo y consumo mediante URL hash `#accion=magic_link&token=...`) y diagnóstico de Google OAuth.
- Verificar que los roles administrativos (`administrador_identidades`, `autoridad_distrital`) conservan acceso pleno a todos sus módulos correspondientes.

### Dimensión 8: Responsividad y Ergonomía Visual (Desktop y Móvil)
- Sidebar colapsable en [`plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx):
  - Transición fluida entre modo expandido (`lg:w-64`) y modo iconos compacto (`lg:w-16`).
  - Persistencia de la preferencia en `localStorage` vía [`configuracion-store.ts`](file:///root/polis/src/features/plataforma/state/configuracion-store.ts).
  - Tooltips accesibles en modo colapsado.
- Barra superior y topbar pública: visualización correcta en pantallas grandes (1440px), medianas (1024px) y móviles (375px).

### Dimensión 9: Estado de Infraestructura y Servicios Productivos
- Comprobar estado y latencia de los servicios systemd:
  - `systemctl status polis-frontend.service` (Next.js en puerto 3000).
  - `systemctl status polis-backend.service` (FastAPI en puerto 8000).
  - `systemctl status polis-herald.service` (Worker outbox de notificaciones).
- Verificar respuesta HTTP 200 en `https://seguridadhumanaintegral.org/plataforma/mesas` y cabeceras de seguridad CSP, HSTS, X-Content-Type-Options y X-Frame-Options.

### Dimensión 10: Integridad de Base de Datos y Salvaguardas de Repositorio
- Certificar que la base de datos `bd_csh` permanece en la migración 0096 sin desviaciones ni tablas huérfanas.
- Confirmar que no se han ejecutado `git commit` ni `git push` no autorizados.

---

## 3. Entregable Esperado

1. **Dictamen Formal de Auditoría al 100%:**
   - Crear el archivo: [`bridge/321_dictamen_auditoria_calidad_exhaustiva_100.md`](file:///root/polis/bridge/321_dictamen_auditoria_calidad_exhaustiva_100.md).
   - Estructura: Resumen ejecutivo, evaluación detallada de las 10 dimensiones con comandos y salidas comprobables, matriz de veredictos (*CONFORME / NO CONFORME / OBSERVACIÓN*), certificación final de calidad.
2. **Actualización del Control Central de Tareas:**
   - Registrar el Encargo 321 y su dictamen en [`bridge/01_tarea_activa.md`](file:///root/polis/bridge/01_tarea_activa.md).
