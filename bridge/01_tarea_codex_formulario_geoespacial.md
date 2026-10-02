# TAREA — Formulario de Reporte Ciudadano Geoespacial (Casos de Inseguridad)

## Objetivo
Crear un formulario especializado de denuncia ciudadana que permita **espacializar** los
casos reportados — el ciudadano marca el punto exacto en un mapa, selecciona la categoría
del caso, indica la frecuencia y adjunta fotos como evidencia.

## Archivos a crear / modificar

### 1. Nuevo formulario en el store
**Archivo:** `src/features/formularios/state/formularios-store.ts`

Añadir un nuevo formulario pre-configurado con id `"reporte-ciudadano-geoespacial"` y slug
`"reporte-inseguridad"` (urlPublica: `https://seguridadhumanaintegral.org/f/reporte-inseguridad`).

---

### 2. Nuevo tipo de pregunta — `ubicacion_geografica` (ya existe) + `foto_multiple`

El tipo `ubicacion_geografica` ya existe en el modelo. Añadir configuración especial:
- Campo `maxFotos: number` (default 5) en `ConfiguracionPregunta`
- Campo `permitirFotos: boolean` — si true, muestra zona de adjuntar fotos junto al punto del mapa

### 3. Crear el formulario con estas preguntas (en orden):

```ts
const FORMULARIO_REPORTE_INSEGURIDAD = {
  id: "reporte-ciudadano-geoespacial",
  titulo: "Reporte Ciudadano de Casos de Seguridad Humana",
  descripcion: "Ayúdanos a mapear los casos que afectan la seguridad en tu barrio. Tu reporte es anónimo y contribuye al diagnóstico de la Política Pública de Seguridad Humana Integral de Cartagena 2026–2036.",
  slug: "reporte-inseguridad",
  urlPublica: "https://seguridadhumanaintegral.org/f/reporte-inseguridad",
  estado: "publicado",
  preguntas: [
    // P1 — Categoría principal (lista desplegable con 7 dimensiones)
    {
      tipo: "lista_desplegable",
      texto: "¿Qué tipo de situación deseas reportar?",
      requerida: true,
      opciones: [
        "1. Seguridad Personal y Ciudadana",
        "2. Convivencia y Seguridad Comunitaria",
        "3. Seguridad Ambiental y del Entorno",
        "4. Seguridad Económica y Medios de Vida",
        "5. Seguridad Alimentaria y Sanitaria",
        "6. Seguridad Política e Institucional",
        "7. Alertas Tempranas y Gestión de Crisis",
      ]
    },

    // P2 — Subcategoría (condicionada a P1, lógica condicional por dimensión)
    // DIMENSIÓN 1 — Personal
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Seguridad Personal y Ciudadana",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "1. Seguridad Personal y Ciudadana" },
      opciones: [
        // Vida e integridad
        "Homicidio / Asesinato / Sicariato",
        "Atentado con arma de fuego o arma cortopunzante",
        "Heridos / Lesiones personales",
        "Amenazas directas o extorsión (Vacunas, Gota a gota)",
        "Secuestro o retención ilegal",
        // Hurtos
        "Hurto a personas (atraco, raponazo en vía pública)",
        "Hurto a residencias",
        "Hurto a establecimientos comerciales o turísticos",
        "Hurto de vehículos, motocicletas o autopartes",
        "Robos en transporte público o taxis",
        // Microtráfico
        "Punto de venta/distribución de drogas (Olla/expendio)",
        "Consumo y distribución en entornos escolares o parques infantiles",
        "Tráfico, alquiler o porte ilegal de armas de fuego",
        // Trata
        "Explotación Sexual Comercial de NNA (ESCNNA)",
        "Trata de personas (explotación laboral o prostitución forzada)",
        "Inducción de menores al delito o la mendicidad",
      ]
    },

    // DIMENSIÓN 2 — Convivencia
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Convivencia y Seguridad Comunitaria",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "2. Convivencia y Seguridad Comunitaria" },
      opciones: [
        "Violencia intrafamiliar (física, psicológica, económica)",
        "Acoso sexual u hostigamiento en espacio público o transporte",
        "Violencia o discriminación contra población LGBTIQ+",
        "Riñas o enfrentamientos colectivos entre sectores / pandillas",
        "Alteración de la tranquilidad por ruido excesivo",
        "Consumo de alcohol/drogas perturbando espacios públicos familiares",
        "Ocupación o bloqueo indebido de vías públicas o andenes",
        "Tensiones o disputas vecinales graves",
        "Amenazas a líderes comunales, JAC o defensores de DD.HH.",
        "Acoso escolar sistemático (Bullying)",
        "Reclutamiento de jóvenes por estructuras criminales",
      ]
    },

    // DIMENSIÓN 3 — Ambiental
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Seguridad Ambiental y del Entorno",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "3. Seguridad Ambiental y del Entorno" },
      opciones: [
        "Arrojamiento ilegal de basuras en caños, Ciénaga, bahía o playas",
        "Tala o quema de manglares / Deforestación",
        "Contaminación de cuerpos de agua por vertimientos ilegales",
        "Pesca ilegal o tráfico de fauna silvestre protegida",
        "Punto ciego o falta de alumbrado público (zona de alto riesgo)",
        "Lote enmontado o edificación en ruina usada como refugio criminal",
        "Riesgo de inundación por obstrucción de canales o arroyos",
        "Riesgo de erosión costera, deslizamiento o falla geológica",
      ]
    },

    // DIMENSIÓN 4 — Económica
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Seguridad Económica y Medios de Vida",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "4. Seguridad Económica y Medios de Vida" },
      opciones: [
        "Estafa o cobro abusivo a turistas o ciudadanos",
        "Extorsión o cobro de peajes informales a vendedores o comerciantes",
        "Presión o cobro intimidatorio de prestamistas (Gota a gota)",
        "Destrucción o hurto de activos productivos (pesca, lanchas, puestos)",
        "Desalojo forzado o desplazamiento de unidades productivas informales",
      ]
    },

    // DIMENSIÓN 5 — Alimentaria
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Seguridad Alimentaria y Sanitaria",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "5. Seguridad Alimentaria y Sanitaria" },
      opciones: [
        "Focos de insalubridad o plagas (aguas estancadas, criaderos de dengue)",
        "Venta de alimentos en mal estado o licores adulterados",
        "Faltantes o cortes prolongados de agua potable",
        "Alerta por desnutrición aguda en niños o adultos mayores",
        "Fallas graves en comedores comunitarios o programa PAE",
      ]
    },

    // DIMENSIÓN 6 — Política
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Seguridad Política e Institucional",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "6. Seguridad Política e Institucional" },
      opciones: [
        "Abuso de la fuerza o maltrato por servidores públicos o agentes de seguridad",
        "Exigencia de sobornos o corrupción en trámites distritales",
        "Barreras para denunciar o revictimización en entidades públicas",
        "Impedimento del ejercicio del voto o constreñimiento electoral",
        "Restricciones o agresiones contra libertad de expresión o protesta pacífica",
      ]
    },

    // DIMENSIÓN 7 — Alertas tempranas
    {
      tipo: "lista_desplegable",
      texto: "Especifica el caso — Alertas Tempranas y Gestión de Crisis",
      requerida: true,
      condicion: { preguntaId: "P1", valor: "7. Alertas Tempranas y Gestión de Crisis" },
      opciones: [
        "Presencia o panfletos de Grupos Armados Organizados (GAO)",
        "Desplazamiento forzado intraurbano o confinamiento de sectores",
        "Alerta de emergencia por desastre natural o evento climático extremo",
      ]
    },

    // P3 — Frecuencia
    {
      tipo: "opcion_unica",
      texto: "¿Con qué frecuencia ocurre esta situación en el lugar?",
      requerida: true,
      opciones: [
        "Es la primera vez que ocurre",
        "Ocurre ocasionalmente (1-2 veces por mes)",
        "Ocurre frecuentemente (1-2 veces por semana)",
        "Ocurre todos los días",
        "Ya ocurrió y no ha vuelto a pasar",
      ]
    },

    // P4 — Descripción libre
    {
      tipo: "texto_largo",
      texto: "Describe brevemente lo que ocurrió (opcional — no incluyas datos personales)",
      requerida: false,
      placeholder: "Ej.: El miércoles en la noche un grupo de personas...",
      validacion: { maxLength: 500 }
    },

    // P5 — Punto en el mapa + fotos (tipo: ubicacion_geografica con fotos)
    {
      tipo: "ubicacion_geografica",
      texto: "Marca el punto exacto donde ocurre la situación",
      descripcion: "Haz clic en el mapa para ubicar el caso. Puedes arrastrar el marcador para ajustar la posición.",
      requerida: true,
      permitirFotos: true,
      maxFotos: 5,
      labelFotos: "Adjunta fotos del lugar como evidencia (máx. 5, opcionales)",
    },

    // P6 — Localidad / barrio (autocompletado)
    {
      tipo: "lista_desplegable",
      texto: "¿En qué localidad ocurre?",
      requerida: false,
      opciones: [
        "Localidad 1 — Histórica y del Caribe Norte",
        "Localidad 2 — De la Virgen y Turística",
        "Localidad 3 — Industrial y de la Bahía",
        "Zona Rural o Insular",
      ]
    },
  ]
}
```

---

## 4. Componente de la pregunta de ubicación con fotos

**Archivo:** `src/features/formularios/components/pregunta-ubicacion-fotos.tsx`

Este componente extiende el `PreguntaUbicacion` existente añadiendo:

```
┌─────────────────────────────────────────────────────────┐
│  🗺️  Mapa de Cartagena (OpenLayers, centrado en la bahía) │
│  [Clic para marcar el punto de la situación]            │
│                                                         │
│  📍 Punto marcado: Barrio Getsemaní, Localidad 1        │
│  Lat: 10.4234  Lng: -75.5512    [Borrar punto]         │
├─────────────────────────────────────────────────────────┤
│  📷 Adjuntar fotos como evidencia (máximo 5)            │
│                                                         │
│  [Foto 1 thumbnail]  [Foto 2 thumbnail]  [+ Agregar]  │
│                                                         │
│  Tamaño máx por foto: 5 MB · Formatos: JPG, PNG, WebP  │
└─────────────────────────────────────────────────────────┘
```

El mapa debe usar OpenLayers (ya configurado en el proyecto):
- Centro inicial: Cartagena `[10.3910, -75.4794]` zoom 13
- Capa base: OSM
- Al hacer clic: añadir marcador con ícono diferenciado por dimensión de seguridad
- El color del marcador varía según la dimensión seleccionada en P1:
  - Personal/Ciudadana: 🔴 rojo
  - Convivencia: 🟠 naranja
  - Ambiental: 🟢 verde
  - Económica: 🟡 amarillo
  - Alimentaria: 🟣 morado
  - Política: 🔵 azul
  - Alertas: ⚫ negro

Para las fotos:
```tsx
// Input file oculto, accept="image/jpeg,image/png,image/webp"
// Al seleccionar: FileReader → base64 para thumbnail
// Mostrar grid de thumbnails 80×80px con botón × para eliminar
// Máximo 5 fotos — si ya hay 5, ocultar botón "Agregar"
```

---

## 5. Respuestas espaciales — guardar coordenadas + fotos

En el modelo de `RespuestaFormulario`, la respuesta a una pregunta de tipo
`ubicacion_geografica` debe guardar:
```ts
{
  tipo: "ubicacion_geografica",
  valor: {
    lat: number,
    lng: number,
    barrio?: string,
    fotos?: string[],  // array de base64 o blob URLs (máx 5)
  }
}
```

---

## 6. Visualización en el Geovisor

Cuando existan respuestas con coordenadas al formulario `reporte-inseguridad`,
el geovisor de `/plataforma/geovisor` debe poder mostrar los puntos como una capa
de "Reportes Ciudadanos". Esto es una tarea futura — por ahora solo guardar los datos.

---

## QA obligatorio
```bash
bun run check   # 0 errores TS, 0 violaciones ui-policy
bun run build   # build exitoso — verificar que /f/reporte-inseguridad aparece
sudo systemctl restart polis-frontend.service
curl -s -o /dev/null -w "%{http_code}" https://seguridadhumanaintegral.org/f/reporte-inseguridad
# Debe devolver 200
```

Verificar funcionalmente:
1. Abrir https://seguridadhumanaintegral.org/f/reporte-inseguridad
2. Seleccionar dimensión → aparece la subcategoría correspondiente ✅
3. Seleccionar frecuencia ✅
4. Clic en el mapa → marcador de color según dimensión ✅
5. Adjuntar 3 fotos → aparecen thumbnails, botón agregar sigue visible ✅
6. Adjuntar foto 4 y 5 → botón agregar se oculta ✅
7. Intentar adjuntar foto 6 → bloqueado ✅
8. Enviar → toast de confirmación ✅

---

## Entrega
```bash
git add -A
git commit -m "feat(formularios): reporte ciudadano geoespacial — mapa + fotos + taxonomía 7 dimensiones

- Formulario 'reporte-inseguridad' con URL pública /f/reporte-inseguridad
- 7 categorías principales (dimensiones ONU) con subcategorías condicionales
- Pregunta de ubicación en mapa OpenLayers — marcador de color por dimensión
- Adjuntar hasta 5 fotos por punto con thumbnails y validación de tamaño
- Frecuencia de ocurrencia (opción única)
- Respuesta geoespacial: lat/lng + fotos en base64 para análisis posterior"

cat > /root/polis/bridge/02_entrega_codex.md << 'ENTREGA'
# Entrega Codex — Formulario Reporte Geoespacial
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
URL verificada: https://seguridadhumanaintegral.org/f/reporte-inseguridad → 200
Estado: CONFORME
ENTREGA
```
