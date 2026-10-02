# TAREA ÉLITE — Sistema Integral de Trazabilidad y Responsabilidad Institucional Ciudadana ("¿Quién Responde por tu Seguridad en Cartagena?")

## Objetivo
Transformar a POLIS en una plataforma pionera de gobernanza y transparencia activa a nivel latinoamericano, implementando los **4 Pilares de Trazabilidad Institucional** que conectan al ciudadano con las **27 dependencias oficiales** de la Alcaldía Mayor de Cartagena, sus **Planes de Acción 2026** y las **7 Dimensiones de Seguridad Humana (Decreto 037 de 2026 del Ministerio del Interior)**.

---

## 1. Catálogo Oficial a Utilizar
Utilizar el catálogo exhaustivo recién formalizado en:
`src/features/politicas/data/entidades-cartagena.data.ts` (`DEPENDENCIAS_CARTAGENA_2026`) que incluye las 27 dependencias:
- SICC (Interior), SPD (Participación), Planeación, SED (Educación), Turismo, Hacienda, Infraestructura, General.
- DADIS, EPA, DATT, PES-PR, Corvivienda, IDER, IDACCC, IPCC, ETCAR, Distriseguridad, Transcaribe, Colmayor.
- OAGRD, Bomberos, GEPM (Espacio Público), Gerencia Centro Histórico, Escuela de Gobierno, OTIC.
- Alcaldías Locales 1, 2 y 3.

---

## 2. PILAR 1: Enrutador Ciudadano Inteligente ("¿A quién le exijo en mi barrio?")
**Archivo:** `src/features/politicas/components/enrutador-ciudadano-inteligente.tsx`
**Ubicación:** Integrado en el Home (`src/features/politicas/views/inicio-view.tsx`), justo debajo del hero o las dimensiones.

- **Diseño UI/UX:**
  - Caja de búsqueda en lenguaje natural destacada con estilo *search hub*:
    *"¿Tienes una situación de seguridad o convivencia en tu barrio? Escribe qué ocurre (ej. basuras en caño que causan inundaciones, muchachas en riesgo en baluartes, venta de drogas cerca a colegio, riñas entre sectores...)"*
  - Selector rápido de territorio (Localidad 1, 2, 3 o Zona Rural/Insular).
- **Lógica de Enrutamiento Inteligente:**
  - Motor semántico en cliente que cruza los términos ingresados con las competencias de las 27 dependencias y las 7 dimensiones ONU.
- **Resultado / Ficha de Enrutamiento:**
  - **Dimensión:** Badge con la dimensión correspondiente (ej. *Seguridad Personal*, *Seguridad Ambiental*).
  - **Ruta de Atención Institucional:**
    - 🏛️ **Dependencia Líder:** Nombre, sigla, misión en el Plan de Acción 2026 y canal de atención/contacto.
    - 🤝 **Entidades Corresponsables:** Institutos aliados legalmente competentes.
  - **Proyectos Activos del Plan de Desarrollo 2024–2027:** Líneas y metas específicas con las que el Distrito atiende ese problema.
  - **Botón de Acción 1-Clic:** *"Crear reporte ciudadano formal"* ➔ redirige a `/f/reporte-inseguridad` precargando la categoría y los responsables asignados.

---

## 3. PILAR 2: Flujo Interactivo de Inversión y Competencias (Visualizador de Gobernanza)
**Archivo:** `src/features/politicas/components/flujo-inversion-gobernanza.tsx`
**Ubicación:** Pestaña o bloque visual interactivo en `InicioView` y en `/explorar`.

- **Diseño Visual de Conexiones Multinivel:**
  - **Columna 1: Las 7 Dimensiones de Seguridad Humana (Decreto 037 MinInterior)** con sus colores vectoriales.
  - **Columna 2: Las Dependencias Distritales (Cartagena)** (SICC, EPA, DADIS, PES-PR, IDER, etc.).
  - **Columna 3: Los Territorios Distritales** (L1 Histórica, L2 De la Virgen, L3 Bahía/Industrial, Islas y Corregimientos).
- **Interacción Dinámica:**
  - Al hacer clic o hover sobre una **Dimensión** (ej. *Seguridad Ambiental*), se iluminan únicamente las entidades con presupuesto y proyectos ambientales (EPA, OAGRD, Infraestructura) y los territorios donde intervienen.
  - Al hacer clic sobre un **Territorio** (ej. *Zona Rural e Insular*), se filtran las secretarías con programas activos en Barú, Tierrabomba o La Boquilla.

---

## 4. PILAR 3: Semáforo de Cumplimiento Real 2026 (Tablero de Rendición de Cuentas)
**Archivo:** `src/features/politicas/panels/rendicion-cuentas-panel.tsx`
**Acceso:** Registrado como panel `"rendicion-cuentas"` en `panel-registry.tsx` y botón destacado *"📊 Rendición de Cuentas 2026"* en el Topbar / Home.

- **Datos Oficiales Auditados:**
  - Muestra el dato real consolidado: **38.8% de avance del Plan de Acción a corte 30 de junio de 2026** (del Informe de Seguimiento PDD "Cartagena Ciudad de Derechos").
- **Mosaico de las 27 Dependencias:**
  - Cada tarjeta de dependencia incluye:
    - Nombre, sigla y tipo (Secretaría, Descentralizado, Localidad).
    - Barra de avance del Plan de Acción 2026.
    - Metas cuatrienales priorizadas.
    - Fuentes de financiamiento asignadas (FONSET, SGP, ICLD, Regalías).
    - Botón para ver las líneas estratégicas que lidera.

---

## 5. PILAR 4: Timbrado de Competencia Legal en el Reporte Ciudadano
**Archivo:** `src/features/formularios/views/formulario-publico-view.tsx` y componentes del reporte.

- En el formulario `/f/reporte-inseguridad`:
  - Cuando el ciudadano selecciona la categoría del caso (ej. *Homicidio/Sicariato*, *Hurto*, *Microtráfico*, *ESCNNA*, *Basuras en cuerpos de agua*, *Insalubridad/Dengue*), aparece dinámicamente un banner institucional con diseño oficial:
    - 🏛️ **Competencia Legal Asignada (Decreto 037 de 2026 MinInterior):**
      - *"Este caso corresponde legalmente a: **[Secretaría Líder]** en articulación con **[Entidades Aliadas]**."*
      - *"Marco de intervención: Plan de Desarrollo 2024–2027 'Cartagena Ciudad de Derechos'."*
  - Al enviar el reporte, la respuesta guarda esta entidad asignada para auditoría ciudadana y seguimiento.

---

## 6. Control de Calidad y Verificación
```bash
bun run check
bun run build
sudo systemctl restart polis-frontend.service
```

## 7. Entrega
Registrar commit descriptivo y actualizar `/root/polis/bridge/02_entrega_agy2.md`.
