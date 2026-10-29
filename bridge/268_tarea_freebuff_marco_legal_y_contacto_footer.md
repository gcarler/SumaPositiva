# Encargo 268: Implementación de Páginas "Marco Legal" y "Contacto" y Conexión en Footer

**Fecha:** 29 de octubre de 2026  
**Origen:** Solicitud del usuario administrador general  
**Asignado a:** FREEBUFF (`=freebuff:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Archivos a crear / modificar:**  
- `src/app/marco-legal/page.tsx` (crear)  
- `src/app/contacto/page.tsx` (crear)  
- `src/shared/layout/footer.tsx` (modificar enlaces)  
**Entregable esperado:** `bridge/268_entrega_freebuff_marco_legal_y_contacto_footer.md`

---

## 1. Requerimiento del Usuario

> "hay una opción en el footer que se llama: "marco legal (en preparación)" con toda la información que tenemos hagamos uno... y lo conectams a esa opción y tambien hagamos una para contacto aunque los datos no esten definidos, asignale esa tarea a freebuff"

---

## 2. Especificación Técnica

### A. Página de Marco Legal (`src/app/marco-legal/page.tsx`)
Crear una página institucional completa, legible, accesible y con los tokens de diseño de POLIS (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`). Debe consolidar todo el andamiaje jurídico y doctrinal del proyecto:

1. **Fundamentos Constitucionales:**
   - **Art. 1, 2, 74, 103 y 209 de la Constitución Política de Colombia de 1991**: Estado social de derecho participativo, fines esenciales del Estado, derecho fundamental de acceso a información pública, soberanía popular y principios de la función administrativa.
2. **Marco Normativo Nacional:**
   - **Ley Estatutaria 1757 de 2015:** Promoción y protección del derecho a la participación democrática y control social.
   - **Ley 1712 de 2014:** Transparencia y Acceso a la Información Pública Nacional, principio de máxima divulgación y datos abiertos.
   - **Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013:** Protección de Datos Personales (Habeas Data). Tratamiento ético, despojo pericial de metadatos EXIF/GPS en evidencias comunitarias, anonimización por defecto y salvaguardas para líderes sociales y comunales.
   - **Ley 2294 de 2022 (PND "Colombia Potencia Mundial de la Vida"):** Transformación hacia la Seguridad Humana y Justicia Social.
3. **Marco Normativo Distrital (Cartagena de Indias):**
   - **Acuerdo Distrital 139 de 2024:** Plan de Desarrollo Distrital *"Cartagena, Ciudad de Derechos"* (2024–2027), con su **Línea Estratégica 1: Seguridad Humana**.
   - **Decreto Distrital 037 de 2026:** Formulación participativa e implementación de la Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC) del Distrito de Cartagena.
4. **Marco Internacional de Seguridad Humana:**
   - **Resolución 66/290 de la Asamblea General de la ONU (2012):** Consenso doctrinal de Seguridad Humana (*libertad frente al miedo, libertad frente a la necesidad, libertad para vivir con dignidad*).
   - **Informe PNUD (1994):** Enfoque centrado en las personas y las 7 dimensiones integrales (Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria, Política).
   - **Agenda 2030 y ODS:** Metas asociadas a los ODS 1, 2, 3, 5, 8, 10, 11, 13, 16.
5. **Salvaguardas de No Revictimización y Principio de Acción sin Daño:**
   - Garantías de confidencialidad y protección integral para víctimas y líderes comunitarios en el proceso participativo.

---

### B. Página de Contacto y Atención Ciudadana (`src/app/contacto/page.tsx`)
Crear una página institucional de contacto y canales de participación:

1. **Datos de la Entidad Convocante:**
   - **Alcaldía Mayor de Cartagena de Indias — Secretaría del Interior y Convivencia Ciudadana / Secretaría de Planeación Distrital**.
   - **Sede:** Centro Histórico, Plaza de la Aduana, Calle de la Inquisición #30-31, Cartagena de Indias, D.T. y C., Bolívar, Colombia.
   - **Horario Oficial de Atención:** Lunes a Viernes de 8:00 a.m. a 12:00 m. y de 2:00 p.m. a 5:00 p.m.
   - **Correo Institucional / PQRSD:** `seguridadhumana@cartagena.gov.co` (o canal virtual de atención ciudadana).
2. **Mesas de Trabajo Territoriales:**
   - Mención orientadora hacia las 35 mesas de trabajo en las 3 localidades urbanas y la zona rural e insular de Cartagena.
3. **Formulario de Contacto y Buzón Ciudadano:**
   - Campos: Nombre completo, correo o teléfono, territorio/localidad de pertenencia, tipo de mensaje (consulta, aporte metodológico, solicitud institucional) y cuerpo del mensaje.
   - Manejo de estado cliente, validación de campos requeridos y mensaje de confirmación/éxito accesible.

---

### C. Actualización del Footer (`src/shared/layout/footer.tsx`)
- Conectar `<Link href="/marco-legal">Marco legal</Link>` como enlace activo.
- Conectar `<Link href="/contacto">Contacto</Link>` como enlace activo.
- Conservar los estilos de diseño `label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline`.
- Dejar únicamente `"Trazabilidad"` con la etiqueta `(en preparación)`.

---

### D. Restricciones Operativas (Instrucción de Despliegue de Codex)
- **NO reconstruir `.next` en caliente mientras `polis-frontend.service` lo sirve.**
- Para validar estáticamente: ejecutar `bun run check` (TypeScript, ESLint y UI-policy).
- Si se requiere probar build, usar directorio temporal aislado (`POLIS_NEXT_DIST_DIR=/tmp/build_test`).
- Generar el informe de entrega en `bridge/268_entrega_freebuff_marco_legal_y_contacto_footer.md`.
