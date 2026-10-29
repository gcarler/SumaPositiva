# **OL-CODEX-267**
## **Enlace de «Datos abiertos» al Geovisor**
### **Documentación técnica / E** - No dictamen EAF
**Fecha:** 2026-10-29

# 1. Cambio requerido
En `src/shared/layout/footer.tsx`, el ítem «Datos abiertos» ya no se presenta como texto en preparación.
Se convirtió a un enlace interno hacia `/geovisor` con etiqueta directa «Datos abiertos».

# 2. Implementación
- Se extrajo `"Datos abiertos"` de la lista de enlaces en preparación.
- El elemento pasa de `<span>` a `<Link href="/geovisor">`.
- Se conservan los enlaces restantes:
  - `Trazabilidad`
  - `Marco legal`
  - `Contacto`
- El enlace usa clases semánticas del sistema POLIS:
  - `label-micro`
  - `text-[var(--text-secondary)]`
  - `hover:text-[var(--text-primary)]`
  - `transition-colors`
  - `hover:underline`
- No se modificó contenido, comportamiento ni rutas del Geovisor.

# 3. Verificación
## 3.1 `node scripts/ui-policy.mjs`
- Ejecutado como parte del chequeo de UI antes de `typecheck` y `lint`.
- Resultado: sin errores.

## 3.2 `bun run check`
- Ejecutado:
  - `bun run ui:check`
  - `tsc --noEmit`
  - `eslint .`
- Código de salida: `0`.
- Sin errores de TypeScript, ESLint ni guardas de UI.

# 4. Diffs
```diff
-          {["Datos abiertos", "Trazabilidad", "Marco legal", "Contacto"].map((l) => (
+          <Link
+            href="/geovisor"
+            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
+          >
+            Datos abiertos
+          </Link>
+          {["Trazabilidad", "Marco legal", "Contacto"].map((l) => (
```

# 5. Límites
- No se ejecutó `bun run storybook:build`, `bun run ui:test` ni `bun run build`, porque el cambio es puntual de navegación y el encargo solicitó `bun run check`.
- No se modificaron datos ni backend.
- No se evaluaron rutas externas ni despliegue.
