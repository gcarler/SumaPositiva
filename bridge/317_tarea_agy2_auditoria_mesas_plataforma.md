# ENCARGO 317: Auditoría Integral de Acceso y Visualización de Mesas de Trabajo (/plataforma/mesas y Portal Público)

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-09 · **Estado:** ASIGNADO
- **Origen:** Requerimiento explícito del usuario:
  > *"no se deja ver los detalles de la mesas https://seguridadhumanaintegral.org/plataforma/mesas ni todo lo que creeamos para ella poruqe no le pides agy2 que audite todo ese tema"*
- **Regla rectora:** Cero regresiones en quality gates (`bun run check`: `node scripts/ui-policy.mjs`, `bun run typecheck`, `bun run lint`). Cero commits o push directos sin coordinación.

---

## 1. Contexto y Diagnóstico Requerido

El usuario reporta que al ingresar a `https://seguridadhumanaintegral.org/plataforma/mesas` no se pueden ver los detalles de las mesas ni los módulos/componentes creados para ellas.

Se requiere que `agy2` realice una auditoría exhaustiva en tres dimensiones:

### 1.1. Barrera de Autenticación y Delimitación de Acceso a `/plataforma/mesas`
1. **Comportamiento ante usuarios no autenticados / invitados:**
   - En el release actual de producción (`cierre_integral_20261106_303_r3`), cualquier petición a `/plataforma/mesas` sin token o sin sesión se redirige de forma silenciosa e inmediata a `/`.
2. **Comportamiento ante Ciudadanos autenticados (`rol === "ciudadano"`):**
   - En el Encargo 316 se configuró la delimitación estricta en `PlataformaShell` para restringir el acceso al área técnica institucional `/plataforma`.
   - Auditar: ¿Cómo debe acceder un ciudadano o el usuario a la información pública de las mesas? En el portal cívico (`/` -> vista `mesas` -> tarjeta de mesa -> "Detalle" / "Acta"), ¿están expuestos todos los componentes de detalle de la mesa o requieren algún permiso?
3. **Comportamiento ante Formuladores / Facilitadores Institucionales (`puedeEntrar(sesion)`):**
   - Verificar si con roles institucionales (`facilitador_mesa`, `autoridad_distrital`, `coordinador`) se visualiza correctamente `/plataforma/mesas` y se abre el panel lateral (`MesaPanel`).

### 1.2. Integración y Estado de los Componentes Creados para Mesas
Auditar el estado en el árbol de trabajo local (`/root/polis`) vs. el artefacto productivo:
1. **Componentes del Ciclo Metodológico Integral creados en Encargos 308 y 310:**
   - `src/features/mesas/components/mesa-logistica-panel.tsx` (Fase 1: Preparación)
   - `src/features/mesas/components/mesa-sorteo-azar.tsx` (Fase 2: Ejecución y Deliberación)
   - `src/features/mesas/components/mesa-compromisos-tabla.tsx` (Fase 3: Acuerdos y Compromisos)
   - `src/features/mesas/components/mesa-galeria-evidencias.tsx` (Fase 3: Evidencias Multimedia)
   - `src/features/mesas/components/mesa-notas-bitacora.tsx` (Fase 3: Bitácora del Facilitador)
   - `src/features/mesas/panels/mesa-panel.tsx` (Navegación metodológica por fases: Preparación, Ejecución, Cierre, Ciclo Completo)
2. **Causa raíz de la invisibilidad en producción:**
   - El daemon `polis-frontend.service` ejecuta el build independiente `/root/polis-releases/cierre_integral_20261106_303_r3/standalone` del 6 de noviembre de 2026, el cual no contiene ninguno de estos componentes compilados.

### 1.3. Experiencia de Usuario (UX) para Ver Detalles de Mesas
1. ¿Debe el ciudadano poder consultar en modo solo lectura los acuerdos, logística y evidencias de las mesas desde el portal público sin necesidad de loguearse como formulador institucional?
2. ¿Qué ajustes se requieren en `mesas-view.tsx` (portal público) y en `MesasGestionView` (plataforma técnica) para que la experiencia sea intuitiva, fluida y no expulse al usuario?

---

## 2. Entregables Esperados de `agy2`
1. **Dictamen de Auditoría:** `bridge/317_dictamen_auditoria_agy2_mesas_plataforma.md` documentando:
   - Causa raíz del bloqueo/invisibilidad reportado por el usuario.
   - Matriz de visibilidad por rol (invitado, ciudadano, técnico).
   - Verificación de la suite de pruebas unitarias (`bun test src/features/mesas`).
   - Propuesta de solución técnica y plan de despliegue para que el usuario pueda ver los detalles de las mesas inmediatamente.
2. Actualización de `bridge/01_tarea_activa.md`.
