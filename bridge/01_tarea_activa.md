# TAREA ASIGNADA: [T6.5] Centro de Control de Fases DNP, Administración del Sistema y Autenticación Google OAuth
**Fecha/Hora**: 2026-10-01 16:50:25
**Entrega Vinculada**: E6 — Suite Institucional del Funcionario, Gobernanza Multicanal y Sidebar Integral (`docs/plan-trabajo.md`)
**Punto en el Plan**: Entrega 6 — Hito 5
**Rol Responsable en EDD**: `backend / frontend`
**Auditores Asignados del EAF**: `forense-backend`, `forense-frontend`, `forense-legal`, `forense-cicd`

---

## 📖 Módulos Obligatorios del Banco de Conocimiento:
Debes consultar y respetar los estándares definidos en los siguientes módulos antes y durante el desarrollo:
- [x] `knowledge-base/01_MARCO_CONSTITUCIONAL_Y_LEGAL.md`
- [x] `knowledge-base/03_METODOLOGIA_DNP_CONPES_MGA.md`
- [x] `knowledge-base/06_ARQUITECTURA_FUNCIONAL_PLATAFORMA_POLIS.md`

---

## 🎯 Descripción Técnica:
Interruptor maestro de apertura y cierre de fases de participación web DNP, autenticación institucional con Google OAuth 2.0 (SSO) para funcionarios, panel de gestión de roles y permisos PBAC, y consola de auditoría forense inmutable.

---

## 🔒 Reglas Arquitectónicas Inalterables:
1. **Base de Datos Activa**: PostgreSQL 18.6 nativa en `127.0.0.1:5432/bd_csh` (usuario `polis`, configurada en `/root/polis/backend/.env`).
2. **Esquema Spanish-First**: Tablas, columnas, enums, triggers y modelos Pydantic 100% en español estricto.
3. **Claves Primarias**: Uso exclusivo de UUIDv7 mediante `public.generar_uuid_v7()`.
4. **Regla Zero-Modals**: Cero popups modales centrados en frontend. Toda vista/formulario ocurre en Drawers laterales Framer Motion.
5. **Tokens Semánticos**: Uso estricto de variables CSS en Tailwind (`--surface-1`, `--text-primary`, `--ember`, `--border`).

---

## ✅ Criterios de Aceptación (Definición de Terminado):
- [x] Endpoint y panel UI para activar/desactivar fases de participación web en tiempo real.
- [x] Autenticación institucional con Google OAuth 2.0 (POST /api/v1/identidad/oauth/google) con verificación de id_token y asignación de roles PBAC.
- [x] Botón oficial de Google en panel de sesión institucional y gestión segura de roles sin escalamiento.
- [x] Monitoreo de registros de auditoría y respaldo del sistema.

---

## 📋 Protocolo de Entrega para agy2:
1. Implementa los cambios correspondientes.
2. Ejecuta las validaciones técnicas locales (`bun run check`, `bun run build`, o pruebas de backend con `/root/polis/venv/bin/pytest`).
3. Documenta detalladamente los archivos creados o editados en `/root/polis/bridge/02_entrega_agy2.md`.
4. Al concluir, emite en tu consola el mensaje: `ENTREGA LISTA: [T6.5]`.
