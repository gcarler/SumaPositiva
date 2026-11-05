# Entrega del Encargo 290: Expansión de Cobertura E2E y Smoke Testing de POLIS

**Destinatario:** Coordinador de Calidad e Infraestructura (`agy:0.0`)  
**Agente Responsable:** agy:2 (`MODEL_PLACEHOLDER_M319`)  
**Fecha de Certificación:** 2026-11-04  
**Estado:** ✅ **COMPLETADO SATISFACTORIAMENTE (100%)**

---

## 1. Resumen Ejecutivo y Alcance

En cumplimiento estricto del **Encargo 290** (`bridge/290_tarea_agy2_expansion_cobertura_e2e_smoke.md`), se ha implementado la expansión integral de cobertura de pruebas end-to-end (E2E) y smoke testing automatizado con **Playwright Chromium (Headless)** sobre los cuatro (4) módulos y flujos funcionales no cubiertos previamente en el sistema POLIS.

Todos los ensayos se ejecutaron bajo la salvaguarda de aislamiento total:
* **Entorno Aislado de Red:** Backend en puerto `8100`, Frontend Standalone en puerto `3105`, Proxy Inverso E2E en puerto `3100`.
* **Base de Datos Aislada:** Instancia efímera `polis_test_e2e` clonada atómicamente mediante template, con usuarios y credenciales dinámicas no versionadas. Cero mutaciones o impacto sobre puertos de producción (`8000`, `3000`) o base de datos productiva.
* **Resultados:** 4 de 4 flujos expandidos aprobados con persistencia en base de datos verificada tras recarga de página (100% de éxito).
* **Integración:** La suite canónica original (`scripts/e2e-smoke-flujos-criticos.mjs`) mantiene su aprobación al 100% (9/9 flujos), alcanzando un gran total de **13 flujos críticos y expandidos probados y certificados**.

---

## 2. Módulos y Flujos Expandidos Implementados

### 2.1. Flujo 10: Banco de Alternativas MGA y Evaluación de Viabilidad
* **Ubicación:** `scripts/e2e-smoke-expansion-cobertura.mjs` (`flujoAlternativasMGA`).
* **Navegación:** Inspección de `/plataforma/proyectos` y conmutación a `/plataforma/alternativas`.
* **Interacción:** Apertura de `AlternativaEditorPanel`, diligenciamiento de metadatos de iniciativa MGA (código único, nombre, territorio, población objetivo, horizonte de ejecución y costo estimado COP).
* **Dictamen IA:** Despliegue de `EvaluacionViabilidadPanel`, ejecución de motores de viabilidad jurídica (LOOT / Consulta Previa OIT 169) y viabilidad fiscal (FONSET / Vigencias Futuras Excepcionales Ley 1483/11).
* **Persistencia PostgreSQL:** Recarga total de la vista (`page.reload`) y certificación de persistencia en tabla `motor_politicas.alternativas_solucion`.

### 2.2. Flujo 11: Participación Ciudadana, Radicación y Comprobante Forense QR
* **Ubicación:** `scripts/e2e-smoke-expansion-cobertura.mjs` (`flujoRadicacionCiudadana`).
* **Navegación:** Portal público ciudadano `/barrio` (modo barrio).
* **Interacción:** Conmutación a la pestaña *"2. ¿Qué propones?"*, diligenciamiento de propuesta ciudadana comunitaria con normalización territorial.
* **Radicación Atómica:** Emisión atómica distrital del radicado oficial formal `POL-2026-XXXX` y encolamiento legal de notificación C-150.
* **Validación Pública:** Navegación al portal de fe pública `/aportes/[codigo]` (o `/verificar/[codigo]`), comprobación del sello auténtico de radicación distrital, coincidencia exacta del código radicado, título, estado de trámite (`Radicado Oficial`) y operatividad del buscador de radicados.

### 2.3. Flujo 12: Geovisor Territorial y Filtros Espaciales
* **Ubicación:** `scripts/e2e-smoke-expansion-cobertura.mjs` (`flujoGeovisorTerritorial`).
* **Navegación:** Carga sucesiva de `/plataforma/geovisor` (entorno institucional) y `/geovisor` (geovisor público).
* **Interacción Espacial:** Manipulación del panel de capas y workbench, filtrado por Localidades de Cartagena (`Localidad 1: Histórica y del Caribe Norte`, `Localidad 2`, `Localidad 3`), conmutación de capas temáticas y verificación de ausencia de excepciones o errores JavaScript en consola de navegador.

### 2.4. Flujo 13: Gestión de Usuarios, Roles, PBAC y Password UX (Encargo 280)
* **Ubicación:** `scripts/e2e-smoke-expansion-cobertura.mjs` (`flujoUsuariosYRoles`).
* **Navegación y RBAC:** Sesión con rol `administrador_identidades` y acceso a `/plataforma/usuarios`.
* **Prueba de Accesibilidad Password UX:** Apertura de `UsuarioEditorPanel`, verificación del componente `PasswordInput` accesible:
  - Estado inicial: `type="password"`, `aria-label="Mostrar contraseña"`, `aria-pressed="false"`.
  - Primer clic: alterna a `type="text"`, `aria-label="Ocultar contraseña"`, `aria-pressed="true"`.
  - Segundo clic: retorna a `type="password"`, `aria-label="Mostrar contraseña"`, `aria-pressed="false"`.
* **Creación y PBAC:** Alta de nuevo funcionario institucional, apertura de `UsuarioDetallePanel` y asignación de ámbito territorial PBAC (Localidad 1 con motivo pericial auditado).
* **Persistencia PostgreSQL:** Recarga total de la vista y validación de existencia del usuario y rol en PostgreSQL.

---

## 3. Evidencias de Ejecución de Terminal

### 3.1. Ejecución de la Suite E2E de Expansión (`node scripts/e2e-smoke-expansion-cobertura.mjs`)

```
================================================================================
   POLIS - SUITE SMOKE E2E DE EXPANSIÓN DE COBERTURA (ENCARGO 290)               
================================================================================

[E2E-ENV] 1. Inicializando base de datos aislada y sembrando usuarios dinámicos...
[E2E-ENV] Base de datos polis_test_e2e clonada desde polis_test.
[E2E-ENV] Usuario Autoridad:     test_e2e_autoridad@cartagena.gov.co
[E2E-ENV] Usuario Auditor:       test_e2e_auditor@cartagena.gov.co
[E2E-ENV] Usuario Administrador: test_e2e_admin@cartagena.gov.co
[E2E-ENV] Limpiando procesos en puertos de prueba aislados 8100, 3105 y 3100...
[E2E-ENV] 2. Levantando backend uvicorn en puerto aislado 8100...
[E2E-ENV] 3. Levantando frontend standalone en puerto aislado 3105...
[E2E-ENV] 4. Creando proxy inverso E2E en puerto 3100...
[E2E-ENV] Backend, frontend standalone y proxy inverso listos y saludables.

Iniciando sesión en UI para test_e2e_autoridad@cartagena.gov.co (autoridad_distrital)...

Ejecutando Flujo Expandido 1: Alternativas y Proyectos MGA...
Navegando a /plataforma/proyectos...
Navegando a /plataforma/alternativas...
[E2E] Encontrados 3 inputs de texto en panel alternativa
[E2E] Encontrados 2 textareas en panel alternativa
[E2E] Encontrados 3 inputs numéricos en panel alternativa
Probando evaluación de viabilidad jurídica y fiscal con agentes IA...
Recargando página para certificar persistencia de la alternativa en PostgreSQL...

========================================
[PASS] 10. Banco de Alternativas MGA y Viabilidad - Alternativa ALT-E2E-7810 creada, dictaminada con LOOT/FONSET y persistida en BD
========================================

Ejecutando Flujo Expandido 3: Geovisor Territorial y Filtros Espaciales...

========================================
[PASS] 12. Geovisor Territorial y Filtros Espaciales - Vistas /plataforma/geovisor y /geovisor validadas con filtros territoriales sin errores
========================================

Ejecutando Flujo Expandido 2: Radicación Ciudadana y Comprobante Forense...
[E2E] Código radicado generado exitosamente: POL-2026-0013
Consultando comprobante forense en /aportes/POL-2026-0013...

========================================
[PASS] 11. Radicación Ciudadana y Comprobante QR - Propuesta radicada (POL-2026-0013) y verificada en portal de fe pública
========================================
Iniciando sesión en UI para test_e2e_admin@cartagena.gov.co (administrador_identidades)...

Ejecutando Flujo Expandido 4: Gestión de Usuarios, Roles, PBAC y Password UX...
Probando control de visibilidad de contraseña (mostrar/ocultar)...
Asignando ámbito territorial PBAC para test_e2e_facilitador_2944@cartagena.gov.co...
Recargando página para certificar persistencia del usuario y sus atributos en PostgreSQL...

========================================
[PASS] 13. Gestión de Usuarios, Roles, PBAC y Password UX - Usuario test_e2e_facilitador_2944@cartagena.gov.co creado con PasswordInput accesible, ámbito PBAC asignado y persistido en BD
========================================

================================================================================
🎉 SUITE E2E DE EXPANSIÓN COMPLETADA: 4/4 MÓDULOS APROBADOS AL 100%
================================================================================

[E2E-ENV] Desmontando servicios de prueba aislados...
[E2E-ENV] Limpiando procesos en puertos de prueba aislados 8100, 3105 y 3100...
[E2E-ENV] Entorno desmontado limpiamente.
```

### 3.2. Ejecución de la Suite Smoke E2E Canónica (`node scripts/e2e-smoke-flujos-criticos.mjs`)

```
================================================================================
   POLIS - SUITE SMOKE E2E AISLADA DE FLUJOS CRÍTICOS Y ACCESIBILIDAD (AUD-09)   
================================================================================

[PASS] 1. Login por rol: autoridad_distrital - Sesión confirmada y redirección a /plataforma exitosa
[PASS] 2. Conmutar fase - Persistencia verificada tras recarga y restaurada
[PASS] 3. Editar mesa - Acuerdos concertados persistieron en PostgreSQL
[PASS] 4. Editar línea - Descripción persistió en PostgreSQL y se renderizó tras recarga
[PASS] 5. Editar compromiso - Avance persistió en 35 y observación registrada
[PASS] 6. Registrar medición - Medición de indicador (5200) persistió en PostgreSQL
[PASS] 7. Devolución de un aporte - Devolución motivada radicada y persistida en auditoría forense
[PASS] 8. Modo solo lectura del auditor - Validado en Seguimiento (3 paneles), Mesas y Configuración
[PASS] 9. Auditoría de accesibilidad axe-core ampliada - 0 violaciones críticas/serias en Dashboard, Mesas, Contenido, Seguimiento (3 pestañas), Configuración y Actores

================================================================================
🎉 SUITE SMOKE E2E COMPLETADA CON ÉXITO: 9/9 FLUJOS APROBADOS
================================================================================
```

---

## 4. Verificación de Quality Gates Institucionales

1. **Política de Interfaz y Tokens Semánticos (`node scripts/ui-policy.mjs`):**
   ```
   POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
   ```
   *Resultado: 0 violaciones.*

2. **Chequeo de Tipos TypeScript (`bun run typecheck`):**
   ```
   $ tsc --noEmit
   ```
   *Resultado: 0 errores.*

3. **Pruebas Unitarias y de Integración (`bun test`):**
   ```
   1609 pass
   0 fail
   11411 expect() calls
   Ran 1609 tests across 162 files. [17.60s]
   ```
   *Resultado: 1609 pruebas pasando al 100%.*

4. **Scripts de Ejecución en `package.json`:**
   - `bun run check:e2e`: Flujos críticos canónicos 1 a 9.
   - `bun run check:e2e:expansion`: Flujos expandidos 10 a 13.
   - `bun run check:e2e:all`: Ejecución encadenada de ambos ensayos completos (13 flujos).

---

## 5. Salvaguardas y Control de Versiones

* **NO Commit / NO Push:** En estricto seguimiento de la directriz, no se han efectuado operaciones de commit ni push a ramas remotas.
* **Archivos Creados y Modificados:**
  - `scripts/e2e-smoke-expansion-cobertura.mjs`: Script automatizado de la suite E2E de expansión.
  - `scripts/preparar_entorno_e2e.py`: Soporte para seeder dinámico de rol `administrador_identidades` y línea canónica de participación ciudadana.
  - `package.json`: Incorporación de scripts `"check:e2e:expansion"` y `"check:e2e:all"`.
  - `src/app/aportes/[codigo]/validacion-cliente.tsx`: Mapeo inclusivo del estado `"publicado"` hacia el badge `"Radicado Oficial"` en comprobante forense.
  - `bridge/290_entrega_agy2_expansion_cobertura_e2e_smoke.md`: Informe final y evidencias de entrega.
  - `bridge/01_tarea_activa.md`: Registro de finalización y entrega al coordinador.
