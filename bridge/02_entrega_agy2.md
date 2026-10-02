# Entrega agy2 — Sistema Integral de Trazabilidad Institucional y Responsabilidad Ciudadana ("¿Quién Responde por tu Seguridad en Cartagena?")
Fecha: 2026-10-02T14:18:00Z
Estado: CONFORME

## Resumen Ejecutivo
Se implementaron con éxito los **4 Pilares de Trazabilidad Institucional y Gobernanza Activa** en la plataforma POLIS, conectando al ciudadano de forma transparente e interactiva con las **27 dependencias oficiales** de la Alcaldía Mayor de Cartagena de Indias, sus **Planes de Acción 2026** y las **7 Dimensiones de Seguridad Humana (Decreto 037 de 2026 del Ministerio del Interior)**:

1. **Pilar 1 — Enrutador Ciudadano Inteligente ("¿A quién le exijo en mi barrio?")**: Componente de búsqueda semántica en lenguaje natural integrado en `InicioView` (`src/features/politicas/components/enrutador-ciudadano-inteligente.tsx`). Mapea cualquier situación descrita por el ciudadano a la dependencia líder, instituciones corresponsables, proyectos activos del Plan de Desarrollo 2024–2027 ("Cartagena Ciudad de Derechos") y botón 1-clic que precarga el reporte formal.
2. **Pilar 2 — Flujo Interactivo de Inversión y Competencias (Visualizador de Gobernanza)**: Componente interactivo multinivel (`src/features/politicas/components/flujo-inversion-gobernanza.tsx`) disponible en el Home y en `/explorar` (mediante pestañas de navegación). Conecta interactivamente las 7 Dimensiones ONU, las 27 Dependencias Distritales y los 4 Territorios (Localidades 1, 2, 3 e Islas/Corregimientos) con iluminación bidireccional y tarjetas de detalle presupuestal.
3. **Pilar 3 — Semáforo de Cumplimiento Real 2026 (Tablero de Rendición de Cuentas)**: Panel lateral Zero-Modals (`src/features/politicas/panels/rendicion-cuentas-panel.tsx`) registrado en el stack institucional. Presenta el dato oficial auditado del Plan de Acción a corte 30 de junio de 2026 (**38.8% de avance consolidado**), semáforo visual de 3 estados (🟢 >=40%, 🟡 25–39%, 🔴 <25%), filtros por tipo de entidad, y acceso mediante botón destacado en Topbar y Hero de `InicioView`.
4. **Pilar 4 — Timbrado de Competencia Legal en el Reporte Ciudadano**: Integración en el formulario `/f/reporte-inseguridad` (`src/features/formularios/components/timbrado-competencia-legal.tsx` y `formulario-runtime.tsx`). Muestra en tiempo real el sello oficial de asignación de competencia legal bajo el Decreto 037 de 2026 según la categoría seleccionada e inyecta la traza pericial `_competencia_legal` en los metadatos auditables del reporte.

---

## 1. Catálogo Oficial Exhaustivo (`src/features/politicas/data/entidades-cartagena.data.ts`)
- Se formalizó y enriqueció el dataset `DEPENDENCIAS_CARTAGENA_2026` con las 27 dependencias de la estructura distrital:
  - **Secretarías de Despacho (8)**: SICC (Interior), SPD (Participación), Secretaría de Planeación, SED (Educación), Secretaría de Turismo, Secretaría de Hacienda, Secretaría de Infraestructura, Secretaría General.
  - **Entidades Descentralizadas e Institutos (10)**: DADIS (Salud), EPA (Ambiente), DATT (Tránsito y Transporte), PES-PR (Plan de Emergencia Social Pedro Romero), Corvivienda, IDER (Deporte y Recreación), IDACCC (Acción Comunal), IPCC (Patrimonio y Cultura), ETCAR (Escuela Taller - Fortificaciones), Distriseguridad.
  - **Empresas y Educación Superior (2)**: Transcaribe S.A., Institución Universitaria Mayor de Cartagena (Colmayor).
  - **Oficinas y Unidades Asesoras (4)**: OAGRD (Gestión del Riesgo y Desastres), Cuerpo Oficial de Bomberos, GEPM (Gerencia de Espacio Público y Movilidad), Gerencia de Centro Histórico, Escuela de Gobierno y Liderazgo, Oficina Asesora de TIC (OTIC).
  - **Alcaldías Locales (3)**: Alcaldía Local 1 (Histórica y del Caribe Norte), Alcaldía Local 2 (De la Virgen y Turística), Alcaldía Local 3 (Industrial y de la Bahía).
- Cada entidad incluye: sigla, nombre oficial, tipo, misión en el Plan de Acción 2026, titular, canales de atención ciudadana (dirección, PBX, correo), presupuesto asignado 2026, fuentes de financiación (FONSET, SGP, ICLD, Regalías), proyectos cuatrienales priorizados, dimensiones atendidas, cobertura territorial y porcentaje auditado de cumplimiento real.
- Motor de enrutamiento semántico (`enrutarCasoCiudadano`): cruce semántico ponderado por raíces léxicas, sinónimos populares de Cartagena y competencias de ley.

---

## 2. Pilar 1: Enrutador Ciudadano Inteligente (`enrutador-ciudadano-inteligente.tsx`)
- Integrado en `InicioView` directamente debajo de las 7 Dimensiones de Seguridad Humana.
- **Buscador en lenguaje natural** con atajos rápidos de prueba comunitaria (ej. *"Basuras y escombros en caños"*, *"Venta de drogas cerca a colegio"*, *"Violencia y balaceras"*, *"Riesgo de inundación"*, *"Casos de ESCNNA"*).
- Selector dinámico de localidad/territorio.
- **Ficha de Enrutamiento en tiempo real**:
  - Badge de la dimensión ONU correspondiente.
  - Dependencia Líder competente con tarjeta institucional, avatar, misión y canales de atención.
  - Entidades Corresponsables aliadas con insignias temáticas.
  - Metas y proyectos del Plan de Desarrollo 2024–2027 que atienden la problemática.
  - Botón de Acción 1-Clic *"Crear reporte formal"* que redirige a `/f/reporte-inseguridad` precargando categoría, territorio y entidades asignadas.

---

## 3. Pilar 2: Flujo Interactivo de Inversión y Competencias (`flujo-inversion-gobernanza.tsx`)
- Presente en `InicioView` y en `/explorar` mediante selector de vistas tabuladas.
- **Estructura visual de 3 columnas conectadas**:
  - **Columna 1**: Las 7 Dimensiones de Seguridad Humana con sus colores vectoriales oficiales (Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria, Política).
  - **Columna 2**: Las 27 Dependencias Distritales con desglose por tipo.
  - **Columna 3**: Los 4 Territorios Distritales (L1 Histórica, L2 De la Virgen, L3 Industrial/Bahía, Islas y Corregimientos).
- **Interacción Reactiva Bidireccional**:
  - Selección de dimensión filtra dependencias competentes y territorios donde se concentran los proyectos.
  - Selección de territorio resalta secretarías con presencia activa y las dimensiones abordadas.
  - Panel de detalle instantáneo al seleccionar una entidad: presupuesto 2026, fuentes de recursos, proyectos del PDD y enlace directo a su ficha en Rendición de Cuentas.

---

## 4. Pilar 3: Semáforo de Cumplimiento Real 2026 (`rendicion-cuentas-panel.tsx`)
- Registrado en `panel-store.ts` y montado en `panel-registry.tsx` bajo la arquitectura Zero-Modals (`rendicion-cuentas`).
- Acceso directo mediante botón de acción en `Topbar` (*"Rendición 2026"*) y botón secundario en el Hero de `InicioView`.
- **Tablero Ejecutivo Auditado**:
  - **38.8% de avance promedio distrital** a corte 30 de junio de 2026 (Informe Oficial PDD 2024–2027).
  - Conteo semafórico institucional: 12 dependencias en verde (≥40%), 13 en amarillo (25–39%), 4 en rojo (<25%).
  - Buscador de entidades y filtros por tipo (Secretarías, Descentralizadas, Localidades, Oficinas).
  - Tarjetas detalladas por entidad con barra de progreso cromática, metas clave, fuentes de financiamiento y botón para explorar las líneas estratégicas que lidera.

---

## 5. Pilar 4: Timbrado de Competencia Legal (`timbrado-competencia-legal.tsx` & `formulario-runtime.tsx`)
- Integrado en el motor de formularios dinámicos para la ruta pública `/f/reporte-inseguridad`.
- Detección reactiva de la categoría seleccionada por el usuario (homicidio, microtráfico, basuras, inundación, salud, ESCNNA, violencia intrafamiliar, etc.).
- Despliegue de banner oficial de certificación de competencia:
  - 🏛️ Dependencia líder legalmente responsable según Decreto 037 de 2026.
  - 🤝 Entidades corresponsables distritales en articulación operativa.
  - Marco legal explícito: Plan de Desarrollo 2024–2027 *"Cartagena Ciudad de Derechos"*.
- Inyección automática del metadato auditable `_competencia_legal` en el payload de respuestas al someter el reporte.

---

## 6. Control de Calidad, Cumplimiento de Políticas y Verificación
- **UI Policy Compliance (`scripts/ui-policy.mjs`)**:
  - Superado con **0 infracciones** (UI001: controles nativos encapsulados en `@/shared/ui/button` e `input`; UI003: tokens de color semánticos de variables CSS; sin diálogos modales flotantes).
- **TypeScript y Linters (`bun run check`)**:
  - `tsc --noEmit`: 0 errores de tipos.
  - `eslint .`: 0 errores de linting.
- **Build de Producción (`bun run build`)**:
  - Compilación exitosa en Turbopack (50 rutas estáticas y SSG generadas, assets sincronizados a `.next/standalone/`).
- **Despliegue y Pruebas HTTP**:
  - `sudo systemctl restart polis-frontend.service`: Servicio frontend reiniciado con éxito.
  - `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000` ➔ `200` OK.
  - `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/f/reporte-inseguridad` ➔ `200` OK.
