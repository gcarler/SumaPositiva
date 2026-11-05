# ENCARGO 292: Reordenación de Navegación — Mover Menú del Geovisor después de Testimonios

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Solicitud del usuario:** *"tengo una tarea para agy2, piddele que ponga el menú del geovisor despues de testimonios"*
- **Archivo de Entrega Esperado:** `bridge/292_entrega_agy2_reordenar_menu_geovisor.md`

---

## 1. Alcance y Requerimiento

El usuario solicita reubicar la opción de navegación del **Geovisor Territorial** para que aparezca **después de Testimonios** en la barra de navegación principal (Topbar) del sitio público de POLIS.

### Archivo a intervenir:
- [`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx)

### Ajuste en la constante `NAV`:
Actualmente:
```typescript
const NAV: { id: VistaApp; label: string; labelCorto?: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "explorar", label: "Líneas Estratégicas", labelCorto: "Explorar" },
  { id: "dimensiones", label: "Dimensiones y Entidades", labelCorto: "Dimensiones" },
  { id: "mesas", label: "Mesas de Trabajo", labelCorto: "Mesas" },
  { id: "geovisor", label: "Geovisor Territorial", labelCorto: "Geovisor" },
  { id: "noticias", label: "Noticias", labelCorto: "Noticias" },
  { id: "testimonios", label: "Testimonios", labelCorto: "Testimonios" },
];
```

Debe quedar exactamente en el orden:
1. `inicio` ("Inicio")
2. `explorar` ("Líneas Estratégicas")
3. `dimensiones` ("Dimensiones y Entidades")
4. `mesas` ("Mesas de Trabajo")
5. `noticias` ("Noticias")
6. `testimonios` ("Testimonios")
7. `geovisor` ("Geovisor Territorial")

---

## 2. Verificaciones y Quality Gates

1. **Linter de UI y A11y:**
   `node scripts/ui-policy.mjs` (0 violaciones).
2. **Chequeo de Tipos:**
   `bun run typecheck` (0 errores).
3. **Suite de Pruebas Frontend:**
   `bun test` (1609+ pruebas pasando sin regresiones).
4. **Reglas de Entrega:**
   - **NO hacer git commit ni git push.**
   - Registrar la entrega en `bridge/292_entrega_agy2_reordenar_menu_geovisor.md`.
   - Notificar a `agy:0.0` al concluir.
