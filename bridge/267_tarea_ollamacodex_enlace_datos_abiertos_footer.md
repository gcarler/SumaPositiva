# Encargo 267: Enlace de "Datos abiertos" en el Footer hacia el Geovisor

**Fecha:** 29 de octubre de 2026  
**Origen:** Solicitud del usuario administrador  
**Asignado a:** OLLAMACODEX (`=ollamacodex:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Archivo a modificar:** `src/shared/layout/footer.tsx`  
**Entregable esperado:** `bridge/267_entrega_ollamacodex_enlace_datos_abiertos_footer.md`

---

## 1. Requerimiento del Usuario

> "en el footer hay una opción que dice: Datos abiertos (en preparación) que esa opcion lleve al geovisor, signale esa tarea a ollamacodex"

---

## 2. Diagnóstico y Especificación Técnica

En [`src/shared/layout/footer.tsx`](file:///root/polis/src/shared/layout/footer.tsx), actualmente la barra de navegación del pie de página renderiza:

```tsx
<nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Enlaces de pie de página">
  <Link
    href="/barrio"
    className="label-micro text-[var(--ember)] font-semibold transition-colors hover:underline"
  >
    Modo Barrio (Bajo consumo)
  </Link>
  {["Datos abiertos", "Trazabilidad", "Marco legal", "Contacto"].map((l) => (
    <span
      key={l}
      className="label-micro text-[var(--text-tertiary)]"
    >
      {l} <span className="whitespace-nowrap">(en preparación)</span>
    </span>
  ))}
</nav>
```

### Tarea Requerida para OLLAMACODEX:
1. Extraer **"Datos abiertos"** de la lista de elementos en preparación.
2. Convertirlo en un enlace accesible con `<Link href="/geovisor">`:
   - Etiqueta: `Datos abiertos` (sin la leyenda `(en preparación)`).
   - `href="/geovisor"`
   - Clases acordes al sistema de diseño de POLIS (ej. `label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline`).
3. Mantener los enlaces restantes ("Trazabilidad", "Marco legal", "Contacto") con su estado `(en preparación)`.
4. Verificar con:
   - `node scripts/ui-policy.mjs`
   - `bun run check`
5. Notificar a la coordinación (`agy:0.0`) y registrar el informe en `bridge/267_entrega_ollamacodex_enlace_datos_abiertos_footer.md`.
