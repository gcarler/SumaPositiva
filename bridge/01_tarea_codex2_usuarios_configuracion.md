# BIENVENIDO AL EQUIPO — codex2

Eres un nuevo agente de desarrollo de POLIS, la Plataforma de Participación Ciudadana
de la Política Pública de Seguridad Humana Integral de Cartagena 2026–2036.

## Tu entorno
- Proyecto: `/root/polis` (Next.js 16, React 19, Bun, Zustand, TanStack Query)
- Bridge (comunicación): `/root/polis/bridge/`
  - Tus tareas entran como `01_tarea_codex2_*.md`
  - Tu entrega va en `02_entrega_codex2.md`
- Agentes activos: agy2 (frontend), codex (formularios), freebuff (geovisor)

## Estudia el proyecto antes de empezar

Lee estos archivos clave para entender la arquitectura:

```bash
cat /root/polis/src/core/navigation/navigation-store.ts
cat /root/polis/src/features/plataforma/models/acceso.ts
cat /root/polis/src/app/plataforma/layout.tsx
cat /root/polis/src/features/sesion/state/session-store.ts
git -C /root/polis log --oneline -10
ls /root/polis/src/features/
ls /root/polis/src/app/plataforma/
```

Reglas de arquitectura que DEBES respetar:
- **Zero-Modals**: toda interacción en paneles laterales (`openPanel`), NUNCA `<Dialog>` centrado
- **Tokens CSS**: `var(--surface-1)`, `var(--ember)`, `var(--border)`, `var(--text-primary)`, etc.
- **TypeScript strict**: cero `any` explícito o implícito
- **Sin datos inventados**: métricas de participación = 0 hasta que sean reales

---

## TU TAREA — Módulo de Usuarios y Roles (Gestión de Identidades)

La vista `/plataforma/usuarios` existe pero está incompleta. Necesita un módulo
de gestión de usuarios **super pro** que permita al administrador ver, crear,
editar y gestionar los roles y permisos de los usuarios de la plataforma.

### Roles del sistema (ya definidos en `acceso.ts`):
- `autoridad_distrital` — Ve todo, no edita
- `facilitador_mesa` — Gestiona mesas y submesas
- `auditor_forense` — Solo lectura total
- `administrador_identidades` — Gestiona usuarios y roles
- `ciudadano` — No accede a /plataforma

### Lo que debes construir:

#### 1. Store de usuarios (`src/features/usuarios/state/usuarios-store.ts`)
```ts
export interface UsuarioPlatafoma {
  id: string;
  nombre: string;
  correo: string;
  rol: RolPlatafoma;
  activo: boolean;
  creadoEn: string;
  ultimoAcceso?: string;
  foto?: string;
  modulos: string[];  // ["mesas", "formularios", "geovisor"]
}
```

Con mock de 8 usuarios (mezcla de roles reales de Cartagena).

#### 2. Vista de usuarios (`src/features/plataforma/views/usuarios-view.tsx`)
Rediseñar completamente:

```
┌──────────────────────────────────────────────────────────────┐
│ KPI row:                                                     │
│  [8 Usuarios activos] [3 Facilitadores] [2 Auditores] [1 Admin]│
├──────────────────────────────────────────────────────────────┤
│ Búsqueda + Filtro por rol + [+ Invitar usuario]             │
├──────────────────────────────────────────────────────────────┤
│ Tabla / Lista de usuarios:                                   │
│  Avatar | Nombre | Correo | Rol (badge) | Último acceso | ⚙️  │
│  ─────────────────────────────────────────────────────────   │
│  🟢 Ana Pérez  ana@...  [Facilitadora]  hace 2h      [Edit] │
│  🟢 Carlos R.  car@...  [Auditor]       hace 1d      [Edit] │
│  🔴 Juan M.    jua@...  [Autoridad]     Nunca         [Edit] │
└──────────────────────────────────────────────────────────────┘
```

- Tabla responsiva: en móvil → cards apiladas
- Indicador 🟢/🔴 de activo/inactivo
- Badge de rol con color por tipo:
  - `administrador_identidades` → `--ember` naranja
  - `facilitador_mesa` → verde
  - `auditor_forense` → azul
  - `autoridad_distrital` → morado
- Botón "Invitar usuario" → abre panel `usuario-invitar`
- Clic en fila → abre panel `usuario-detalle`

#### 3. Panel invitar/editar usuario (`src/features/usuarios/panels/usuario-editor-panel.tsx`)
Formulario Zero-Modals en panel lateral:
- Nombre completo
- Correo electrónico
- Rol (select con los 4 roles)
- Módulos a los que tiene acceso (checkboxes: Mesas, Formularios, Geovisor, Noticias, Testimonios, Usuarios, Contenido, Configuración)
- Activo / Inactivo (toggle)
- Botón "Guardar" / "Invitar"
- Al guardar → toast "Usuario actualizado" / "Invitación enviada"

#### 4. Panel detalle usuario (`src/features/usuarios/panels/usuario-detalle-panel.tsx`)
- Foto de perfil (iniciales si no hay foto)
- Nombre, correo, rol
- Módulos asignados como badges
- Último acceso (fecha relativa: "hace 2 horas")
- Historial de actividad (mock: últimas 5 acciones)
- Botones: "Editar rol" → abre editor | "Desactivar cuenta" | "Restablecer acceso"

#### 5. Registrar paneles en `panel-registry.tsx`
```tsx
"usuario-invitar" → UsuarioEditorPanel (modo invitar)
"usuario-editor"  → UsuarioEditorPanel (modo editar)
"usuario-detalle" → UsuarioDetallePаnel
```

#### 6. También: completar módulo Configuración (`configuracion-view.tsx`)
La vista de configuración existe pero está básica. Añadir secciones:

```
┌──────────────────────────────────────────────────────────────┐
│ Configuración de la plataforma                               │
├─────────────────────┬────────────────────────────────────────┤
│ 🎨 Apariencia       │  Tema: [Claro] [Oscuro]               │
├─────────────────────┼────────────────────────────────────────┤
│ 🔔 Notificaciones   │  Email resumen semanal: [On/Off]       │
├─────────────────────┼────────────────────────────────────────┤
│ 📊 Política Pública │  Nombre: [Seguridad Humana Integral]   │
│                     │  Vigencia: [2026–2036]                 │
│                     │  Decreto: [037 de 2026]                │
├─────────────────────┼────────────────────────────────────────┤
│ 🗺️  Geovisor        │  Centro del mapa: [lat] [lng]          │
│                     │  Zoom inicial: [13]                    │
├─────────────────────┼────────────────────────────────────────┤
│ 🔐 Seguridad        │  Sesión Google OAuth: [configurar]     │
│                     │  Dominio institucional: [@cartagena...]│
└─────────────────────┴────────────────────────────────────────┘
```

---

## QA obligatorio
```bash
cd /root/polis
bun run check   # 0 errores TS, 0 violaciones ui-policy
bun run build   # build exitoso
sudo systemctl restart polis-frontend.service
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/usuarios
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/configuracion
# Ambas deben devolver 200
```

## Entrega
```bash
git add -A
git commit -m "feat(plataforma): módulo usuarios/roles pro + configuración completa

- UsuariosGestionView: KPIs, tabla responsiva con badges de rol, búsqueda y filtros
- UsuarioEditorPanel: invitar/editar con roles, módulos y toggle activo
- UsuarioDetallePаnel: perfil completo con historial de actividad
- ConfiguracionView: secciones apariencia, notificaciones, política, geovisor, seguridad
- Store de usuarios con 8 mocks realistas de Cartagena
- Paneles registrados en panel-registry"

cat > /root/polis/bridge/02_entrega_codex2.md << 'ENTREGA'
# Entrega codex2 — Módulo Usuarios y Configuración
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Rutas: /plataforma/usuarios 200 · /plataforma/configuracion 200
Estado: CONFORME
ENTREGA
```
