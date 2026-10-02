# TAREA URGENTE — Formulario creación/edición de mesas: layout responsivo y adaptativo

## Problema
El panel editor de mesas (`mesa-editor-panel.tsx`) tiene el contenedor fijado en `max-w-2xl`
y no aprovecha el espacio cuando el usuario maximiza el panel. El formulario debe adaptarse
al ancho disponible en cualquier tamaño de pantalla: panel estrecho, panel normal y panel
maximizado (100vw).

## Archivo a modificar
`src/features/mesas/panels/mesa-editor-panel.tsx` — línea 375:
```tsx
// ACTUAL (malo):
<div className="ui-panel-body mx-auto max-w-2xl space-y-6">

// CORRECTO:
<div className="ui-panel-body w-full space-y-6 px-4 sm:px-6 lg:px-8 2xl:px-10">
```

## Cambios de layout requeridos

### 1. Contenedor principal — quitar max-w fija
```tsx
// Línea 375 — reemplazar:
<div className="ui-panel-body mx-auto max-w-2xl space-y-6">
// Por:
<div className="ui-panel-body w-full space-y-6 px-4 sm:px-6 lg:px-8 2xl:px-10">
```

### 2. Sección 1 — campos básicos: grid responsivo
Los campos de fecha y hora deben aprovechar el ancho:
```tsx
// Grid de fecha + hora — hacer adaptativo:
// Panel estrecho (< sm): 1 columna
// Panel normal (sm): 3 columnas
// Panel ancho (lg): 4 columnas
<div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
  {/* nombre: siempre span completo */}
  <FormField className="col-span-full"> nombre </FormField>
  {/* fecha: 1 col en sm, 2 en lg */}
  <FormField className="sm:col-span-1 lg:col-span-2"> fecha </FormField>
  {/* hora inicio */}
  <FormField className="sm:col-span-1"> horaInicio </FormField>
  {/* hora fin */}
  <FormField className="sm:col-span-1"> horaFin </FormField>
  {/* lugar: siempre span completo */}
  <FormField className="col-span-full"> lugar </FormField>
```

### 3. Sección 2 — entidades y responsables: layout en 2 columnas en pantalla ancha
Cuando el panel está maximizado, mostrar entidades y responsables **lado a lado**:
```tsx
// Wrapper de las dos listas:
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  {/* Lista entidades */}
  <div>...</div>
  {/* Lista responsables */}
  <div>...</div>
</div>
```

Cada ítem de entidad/responsable también debe ser responsivo:
```tsx
// Ítem de entidad:
<div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start">
  <Input className="flex-1"> nombre </Input>
  <Select className="w-full sm:w-44"> rol </Select>
  <button> × </button>
</div>
```

### 4. Sección 3 — ubicación: grid 2 columnas en pantalla ancha
```tsx
// ACTUAL:
<div className="grid gap-4 sm:grid-cols-2">
// CORRECTO:
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  <FormField className="col-span-full sm:col-span-2 lg:col-span-2"> urlMapa </FormField>
  <FormField className="col-span-1"> aforo </FormField>
```

### 5. Cabeceras de sección — usar w-full
Los botones colapsables de sección ya tienen `w-full` — verificar que el ícono y texto
usen `flex-1` para ocupar todo el espacio disponible:
```tsx
<button className="flex w-full items-center justify-between gap-3 p-4 text-left ...">
  <div className="flex items-center gap-3 flex-1 min-w-0">
    <Icon />
    <div className="min-w-0">
      <p className="font-semibold truncate">Título</p>
      <p className="text-xs truncate">Subtítulo</p>
    </div>
  </div>
  <ChevronDown />
</button>
```

### 6. Footer del panel — también responsivo
```tsx
// Footer:
<div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
  <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
    Los campos marcados con * son obligatorios.
  </p>
  <div className="flex gap-2 sm:ml-auto">
    <Button variant="outline" className="flex-1 sm:flex-none">Cancelar</Button>
    <Button type="submit" className="flex-1 sm:flex-none">Crear mesa</Button>
  </div>
</div>
```

## QA obligatorio
```bash
bun run check   # 0 errores TS, 0 violaciones ui-policy
bun run build   # build exitoso
sudo systemctl restart polis-frontend.service
```

Verificar visualmente:
- Panel en ancho mínimo (~360px): 1 columna, todo apilado
- Panel normal (~700px): 2-3 columnas
- Panel maximizado (~1440px): 4 columnas en sección 1, entidades y responsables lado a lado, 3 columnas en sección 3

## Entrega
```bash
git add src/features/mesas/panels/mesa-editor-panel.tsx
git commit -m "fix(mesas): editor pro responsivo — layout adaptativo a ancho del panel y pantalla maximizada"

cat > /root/polis/bridge/02_entrega_agy2.md << 'ENTREGA'
# Entrega agy2 — Editor mesas responsivo
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Estado: CONFORME
ENTREGA
```
