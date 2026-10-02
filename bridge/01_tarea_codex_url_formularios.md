TAREA NUEVA — URL pública y compartible por formulario

Cada formulario creado en POLIS debe tener una URL pública única que se pueda compartir
por WhatsApp, Telegram, redes sociales o correo electrónico. Al abrir esa URL, el ciudadano
ve el formulario listo para responder, sin necesidad de estar en la plataforma.

══════════════════════════════════════════════════════════════

## 1. RUTA PÚBLICA — /f/[slug]

Crear la ruta dinámica: `src/app/f/[slug]/page.tsx`

URL de ejemplo: https://seguridadhumanaintegral.org/f/diagnostico-barrio-turbaco

Cuando el ciudadano abre esa URL ve la página pública del formulario con:
- Encabezado institucional (logo + nombre política)
- Título y descripción del formulario
- El formulario completo renderizado con `<FormularioResponder />`
- Botón "Enviar respuesta"
- Mensaje de confirmación al enviar

La ruta debe:
- Hacer `generateStaticParams()` para los formularios publicados (SSG)
- Si el formulario no existe → 404
- Si el formulario está en estado "borrador" y el usuario no tiene sesión → redirigir a `/`
- Si el formulario está "publicado" → acceso público total, sin login

══════════════════════════════════════════════════════════════

## 2. MODELO — agregar `slug` y `urlPublica` al formulario

**Archivo:** `src/features/formularios/models/formulario.ts`

Añadir a `ConfiguracionFormulario`:
```ts
slug: string;           // kebab-case único, ej: "diagnostico-barrio-turbaco-2026"
urlPublica: string;     // "https://seguridadhumanaintegral.org/f/diagnostico-barrio-turbaco-2026"
```

Y en el store, al crear un formulario (`crearFormulario`), generar automáticamente:
```ts
const slug = generarSlug(input.titulo);       // ver función abajo
const urlPublica = `https://seguridadhumanaintegral.org/f/${slug}`;
```

Función generarSlug:
```ts
function generarSlug(titulo: string): string {
  const base = titulo
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const sufijo = Date.now().toString(36).slice(-4); // 4 chars únicos
  return `${base}-${sufijo}`;
}
```

══════════════════════════════════════════════════════════════

## 3. PANEL DE FORMULARIO — sección "Compartir"

**Archivo:** `src/features/formularios/panels/formulario-analitica.tsx`
(o donde esté el panel de gestión del formulario)

Añadir una sección "Compartir formulario" con:

```
┌─────────────────────────────────────────────┐
│ 🔗 Compartir formulario                      │
│                                             │
│ [https://seguridadhumanaintegral.org/f/...] │
│                              [📋 Copiar]     │
│                                             │
│  [WhatsApp]  [Telegram]  [Correo]  [QR]    │
└─────────────────────────────────────────────┘
```

Botones de compartir:
- **WhatsApp**: `https://wa.me/?text=Participa+en+%22{titulo}%22%0A{urlPublica}`
- **Telegram**: `https://t.me/share/url?url={urlPublica}&text={titulo}`
- **Correo**: `mailto:?subject={titulo}&body=Te+invito+a+participar:%0A{urlPublica}`
- **Copiar URL**: `navigator.clipboard.writeText(urlPublica)` → toast "¡URL copiada!"
- **QR**: generar QR con la librería `qrcode` (o `qrcode.react` si ya está instalada,
  si no, usar la API pública `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={url}`)

══════════════════════════════════════════════════════════════

## 4. VISTA DE FORMULARIOS EN /plataforma — mostrar URL

**Archivo:** `src/features/plataforma/views/formularios-view.tsx`

En cada card de formulario publicado, mostrar:
- Chip "🔗 Compartir" que abre el panel con la sección de compartir
- O directamente un botón pequeño de copiar URL

══════════════════════════════════════════════════════════════

## 5. PÁGINA PÚBLICA /f/[slug] — diseño

**Archivo a crear:** `src/app/f/[slug]/page.tsx`

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioPublicoPage } from "@/features/formularios/views/formulario-publico-view";

export async function generateMetadata({ params }): Promise<Metadata> {
  // Buscar formulario por slug en los mocks/store
  // Retornar og:title, og:description para que WhatsApp muestre preview
  return {
    title: `${formulario.titulo} — Seguridad Humana Cartagena`,
    description: formulario.descripcion,
    openGraph: {
      title: formulario.titulo,
      description: formulario.descripcion,
      url: `https://seguridadhumanaintegral.org/f/${params.slug}`,
      siteName: "Política Pública de Seguridad Humana Integral — Cartagena",
      images: [{ url: "https://seguridadhumanaintegral.org/og-image.png" }],
    },
  };
}

export default function Page({ params }) {
  return <FormularioPublicoPage slug={params.slug} />;
}
```

**Archivo a crear:** `src/features/formularios/views/formulario-publico-view.tsx`

Diseño de la página pública:
- Header con logo institucional y nombre: "Política Pública de Seguridad Humana Integral — Cartagena 2026–2036"
- Card central con título, descripción y número de preguntas
- El formulario completo renderizado (reutilizar `<FormularioResponder />` que ya existe)
- Footer: "© Alcaldía de Cartagena — Secretaría de Planeación Distrital"

══════════════════════════════════════════════════════════════

## 6. Mock — actualizar formularios existentes con slug y urlPublica

**Archivo:** `src/features/formularios/state/formularios-store.ts`

Los 2 formularios mock ya existentes deben tener slug y urlPublica:
```ts
// formulario 1
slug: "diagnostico-barrio-2026",
urlPublica: "https://seguridadhumanaintegral.org/f/diagnostico-barrio-2026",

// formulario 2
slug: "priorizacion-dimensiones-2026",
urlPublica: "https://seguridadhumanaintegral.org/f/priorizacion-dimensiones-2026",
```

══════════════════════════════════════════════════════════════

## QA obligatorio

```bash
bun run check   # 0 errores TS
bun run build   # build exitoso — verificar que /f/[slug] aparece en el output
sudo systemctl restart polis-frontend.service

# Verificar rutas
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/f/diagnostico-barrio-2026
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/f/priorizacion-dimensiones-2026
# Ambas deben devolver 200

# Verificar 404 en slug inexistente
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/f/no-existe
# Debe devolver 404
```

## Entrega

```bash
git add -A && git commit -m "feat(formularios): URL pública compartible por formulario

- Ruta /f/[slug] con SSG y metadata OpenGraph para WhatsApp preview
- generarSlug() automático al crear formulario (kebab-case + sufijo único)
- FormularioPublicoPage: página pública institucional con formulario embebido
- Panel compartir: botones WhatsApp, Telegram, correo, copiar URL y QR
- Mocks actualizados con slug y urlPublica
- 404 en slugs no encontrados o formularios en borrador sin sesión"

cat > /root/polis/bridge/02_entrega_codex.md << 'ENTREGA'
# Entrega Codex — URL pública formularios
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Rutas verificadas: /f/diagnostico-barrio-2026 y /f/priorizacion-dimensiones-2026
Estado: CONFORME
ENTREGA
```
