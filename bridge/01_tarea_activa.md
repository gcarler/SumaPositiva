# TAREA ACTIVA: [FEAT-HERO-01] INTEGRACIÓN DE HERO BACKDROP DE POLÍTICA PÚBLICA Y SELECTOR INTERACTIVO EN PLATAFORMA

**Fecha**: 2026-10-08  
**Asignada a**: `agy2` (Desarrollador / EDD)  
**Supervisor / Auditor**: `agy` (Coordinador / Auditor Forense EAF)  
**Solicitud del Usuario**:
> *"necesito pedirte un favor, voy a compartirte unas iamgenes con una carpeta de dirve y necesito que selecciones las mejores iamgens y las mas a fines a un proceso de participación de una politica publica, porque me estan pidiendo fotos en la plafaforma, algo así como un hero, el hero puede estar en la parte de atas del contenido https://drive.google.com/drive/u/1/folders/1CU1A5fVjOrUAxM6byrFZFUvpqQqu_shs por favor dale la tarea a polis, la idea es que el sitio publico d ela plataforma no sufra muchos cambios, y las imagenes las podemos optimizar para web, selecciona las mas dicientes a una politica publica. y crea en la /plataforma la posibilidad de poder cambiar las imagenes del sistio publico. toda esta tarea asignasela a tmux a -t agy2"*

---

## 🎯 1. Diagnóstico y Assets de Imágenes Ya Optimizados

La coordinación técnica (`agy`) ya ha examinado y procesado con filtro Lanczos y compresión WebP q=82 las **5 mejores imágenes** extraídas del repositorio territorial de formulación de política pública, ubicadas físicamente y listas en `/root/polis/public/images/hero/`:

1. **`hero-marco-logico.webp`** (166 KB, thumb 12 KB, 1920x1080):
   - **Contenido**: Mesa comunitaria de trabajo con mujeres líderes y jóvenes diligenciando con lápiz la *"Matriz de marco lógico para formular proyectos"* (Objetivo, Acciones, Apoyo institucional, Resultados).
   - **Alineación**: 100% metodológica con el marco MGA/DNP de POLIS.
2. **`hero-asamblea-claustro.webp`** (295 KB, thumb 21 KB, 1920x1080):
   - **Contenido**: Vista aérea de cabildo y foro ciudadano en patio colonial cartagenero, con panelistas en tarima y auditorio de ciudadanos deliberando.
   - **Alineación**: Máxima expresión de deliberación masiva territorial en Cartagena.
3. **`hero-dialogo-comunitario.webp`** (157 KB, thumb 15 KB, 1920x1080):
   - **Contenido**: Conversatorio abierto al aire libre con micrófono y rendición de cuentas directa con la ciudadanía.
   - **Alineación**: Diálogo social y concertación transparente.
4. **`hero-mesa-deliberativa.webp`** (141 KB, thumb 10 KB, 1920x1080):
   - **Contenido**: Mesa redonda participativa de mujeres y jóvenes con carpetas, esquemas y relatoría comunitaria.
   - **Alineación**: Mesas temáticas de concertación de POLIS.
5. **`hero-enfoque-diferencial.webp`** (111 KB, thumb 18 KB, 1280x720):
   - **Contenido**: Taller diferencial de género y juventud con el Observatorio para la Equidad y Desarrollo en Cartagena.
   - **Alineación**: Inclusión, equidad de género y enfoque diferencial.

---

## 🛠️ 2. Requerimientos Técnicos y de UX/UI

### 2.1. Store Zustand de Configuración del Hero con Persistencia Local
- **Crear**: `src/features/politicas/state/hero-store.ts` (o `src/features/plataforma/state/hero-config-store.ts` exportable).
- **Estructura y Opciones**:
  ```ts
  export interface HeroImageOption {
    id: string;
    titulo: string;
    descripcion: string;
    archivo: string;
    thumbnail: string;
    enfoque: string;
  }
  ```
- **Catálogo de 6 opciones**:
  1. `marco-logico` (Recomendada por defecto)
  2. `asamblea-claustro`
  3. `dialogo-comunitario`
  4. `mesa-deliberativa`
  5. `enfoque-diferencial`
  6. `ninguna` (Opción institucional limpia: solo retícula de puntos, sin foto).
- **Estado**:
  - `heroImageId`: string (default `"marco-logico"`).
  - `opacidad`: number (default `18`, escala de 5 a 40%).
  - Acciones: `setHeroImageId(id: string)`, `setOpacidad(opacidad: number)`, `resetearHeroConfig()`.
- **Persistencia**: Usar Zustand `persist` con `createJSONStorage(() => localStorage)` bajo la clave `"polis_hero_config"`. Manejar hidratación de forma segura para evitar diferencias de renderizado inicial (por ejemplo inicializando con `"marco-logico"` o con hook hidratado).

### 2.2. Integración Sutil en el Hero de la Landing Pública
- **Archivo**: `src/features/politicas/views/inicio-view.tsx`
- **Requisitos Críticos de Diseño**:
  - **REGLA DE ORO DEL USUARIO**: *"la idea es que el sitio publico d ela plataforma no sufra muchos cambios, y el hero puede estar en la parte de atas del contenido"*.
  - No modificar la retícula, ni los textos, ni los badges, ni la disposición del hero institucional existente.
  - La fotografía debe posicionarse de manera ambiental detrás del contenido:
    - Contenedor con `position: absolute; inset: 0; pointer-events-none overflow-hidden select-none z-0`.
    - La imagen debe cubrir el área con `object-cover object-center w-full h-full`.
    - Opacidad calibrada (ej. `style={{ opacity: opacidad / 100 }}`), combinada con una capa de gradiente elegante:
      - En modo oscuro / tema general: gradientes sutiles a `var(--surface-0)` y a `bg-background` que protegen el 100% de la legibilidad de títulos, subtítulos, badges y estadísticas (WCAG AAA).
      - La imagen da profundidad, calidez humana y realismo territorial sin distraer ni recargar visualmente.
    - Si `heroImageId === "ninguna"`, no se renderiza la imagen, manteniéndose únicamente la retícula de puntos estándar (`bg-dotgrid`).

### 2.3. Selector Interactivo en `/plataforma/configuracion`
- **Archivo**: `src/features/plataforma/views/configuracion-view.tsx`
- **Implementación**:
  - Incorporar una sección dedicada y destacada:
    - Cabecera: `CabeceraSeccion` con icono de imagen/paisaje (e.g. `ImageIcon` o `Palette`), Título: `"Identidad Visual de la Portada Pública"`, Detalle: `"Selecciona la fotografía territorial del Hero del portal ciudadano y calibra su intensidad ambiental."`.
  - Cuadrícula de tarjetas visuales (grid responsive de 1 a 3 columnas):
    - Cada tarjeta muestra la miniatura de la fotografía (`thumbnail`), título metodológico, badge de enfoque, y descripción concisa.
    - Indicador de estado: La imagen activa exhibe un borde acentuado (`border-ember`), un badge `"Activa en el portal"` con icono de check.
    - Tarjeta clickeable o botón `"Activar como portada"` con feedback inmediato vía `toast.success`.
    - Opción especial `"Solo retícula institucional"` para volver al fondo minimalista original.
  - Control de intensidad / opacidad:
    - Selector numérico o slider o botones rápidos: `10% (Sutil)`, `18% (Recomendado)`, `25% (Marcado)`, `35% (Vibrante)`.
  - Botón de conveniencia:
    - `"Previsualizar portal público (/) "` con icono de enlace externo, permitiendo al administrador abrir la landing y validar el efecto de inmediato.

---

## 🔒 3. Protocolo de Quality Gates

Antes de entregar, `agy2` debe verificar obligatoriamente:
1. `bun run check`: 0 errores en `ui-policy.mjs`, `tsc --noEmit` y `eslint .`.
2. `bun test`: Suite completa de pruebas en verde.
3. `bun run build`: Empaquetado de producción de Turbopack exitoso (190 rutas).
4. `systemctl restart polis-frontend`: Servicio frontend reiniciado y corriendo en el puerto 3000.
5. Verificación de endpoints con `curl`:
   - `curl -s -I http://127.0.0.1:3000` -> 200 OK
   - `curl -s -I http://127.0.0.1:3000/plataforma/configuracion` -> 200 OK
6. Commit local atómico en `main` con mensaje descriptivo (e.g., `feat(hero): seleccion y configuracion de imagenes territoriales para el portal publico (FEAT-HERO-01)`). **ESTRICTAMENTE PROHIBIDO `git push`**.
7. Registro de resultados en `bridge/02_resultado_agy2.md` y notificación a la sesión `agy`.
