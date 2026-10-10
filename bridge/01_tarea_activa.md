# TAREA ACTIVA: [DOC-HILACION-01] MAPEO PERICIAL DE HILACIÓN LÓGICA, HILO CONDUCTOR Y ENCADENAMIENTO FUNCIONAL DE PUNTA A PUNTA EN POLIS

**Fecha:** 2026-10-10  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Requerimiento Expreso de la Supervisión ("quiero que le pidas a agy2 la hilación de cada funcionalidad")  
**Severidad:** ALTA / ESTRATÉGICA (Arquitectura Funcional, Trazabilidad Causal y Comprensión Holística de la Plataforma)  

---

## 🎯 1. Objetivo y Fundamento del Requerimiento

El usuario y la supervisión técnica solicitan formalmente **el mapa maestro de hilación lógica (hilo conductor y encadenamiento funcional)** de la plataforma POLIS.

En el contexto metodológico y operativo de la formulación de políticas públicas participativas, la **"hilación"** describe cómo se conectan, alimentan y transfieren valor los diferentes módulos entre sí: desde que se convoca una jornada en territorio hasta que se rinde cuentas con un documento de política pública adoptado y un plan de acción medible.

`agy2` debe documentar de forma exhaustiva, estructurada y pedagógica en `bridge/02_resultado_agy2.md` el encadenamiento de cada una de las funcionalidades de POLIS.

---

## 📋 2. Estructura Obligatoria del Informe de Hilación

El informe debe cubrir obligatoriamente las siguientes dimensiones:

### 2.1. El Gran Hilo Conductor del Ciclo de Vida (End-to-End)
Narrar y esquematizar la secuencia temporal y lógica completa:
1. **Convocatoria, Agendas y Quórum en Puerta**: Planificación de la jornada, proyección del QR, escaneo ciudadano y registro de asistencias con enfoques diferenciales (Ley 1757).
2. **Deliberación Territorial y Papelógrafo Digital**: Constitución de la mesa, distribución en submesas temáticas, captura del problema central, encadenamiento causal (causas primarias/secundarias: *«¿por qué ocurre?»*), identificación de efectos y derivación de soluciones (objetivo, medios y fines).
3. **Plenaria y Relatoría Técnica**: Registro de acuerdos de plenaria, consolidación de submesas en la Matriz de Diagnóstico y Relatoría, y geodiagnóstico territorial.
4. **Banco de Alternativas de Solución y Presupuesto**: Maduración de las soluciones comunitarias hacia iniciativas viables, costeo plurianual, asignación de fuentes oficiales (FONSET, SGP, SGR, ICLD, BPIN) y dictamen de viabilidad jurídica (LOOT / Consulta Previa) y fiscal (MFMP / Vigencias Futuras).
5. **Formulación de la Política Pública Distrital**: Ensamblaje en la arquitectura de política (Dimensiones ONU, Ejes, Líneas Estratégicas, Programas de Inversión) y gestión del ciclo de fases.
6. **Plan de Acción y Seguimiento (PAS) y Cadena de Valor**: Transformación de metas en compromisos cuantificables, asignación a dependencias responsables, fichas técnicas de indicadores de insumo, producto y resultado, y cargue de mediciones periódicas.
7. **Devolución Ciudadana y Rendición de Cuentas**: Trazabilidad transparente de qué aportes comunitarios fueron incorporados y cuáles no (con justificación técnica asistida por agente IA), expedición de Actas Oficiales en PDF firmadas y balance de participación en audiencias públicas.

---

### 2.2. Matriz Detallada Módulo por Módulo (Ficha de Hilación)
Para **cada una** de las funcionalidades del menú institucional y de la plataforma (`/plataforma/...` y vistas públicas), documentar una ficha con la siguiente estructura:

* **Nombre de la Funcionalidad**: (ej. *Papelógrafo de Mesas*, *Banco de Alternativas*, *Cadena de Valor*, etc.).
* **Ruta Web y Acceso**: (ej. `/plataforma/mesas` $\rightarrow$ panel `papelografo`).
* **Insumo / Entrada (¿Qué lo alimenta?)**: ¿De qué módulo o fuente de datos anterior provienen los datos necesarios para operar esta funcionalidad?
* **Proceso / Actor**: ¿Qué rol opera en este punto (ciudadano, facilitador, autoridad distrital, auditor) y qué acción concreta realiza?
* **Producto / Salida**: ¿Qué registro, modelo o artefacto genera y persiste en la base de datos PostgreSQL (`bd_csh`)?
* **Hilación / Encadenamiento Siguiente (¿A qué alimenta?)**: ¿Hacia qué módulo posterior fluyen los datos y qué habilita su culminación?

Módulos mínimos a incluir:
1. Agendas y Convocatoria Territorial (`/agendas`).
2. Registro de Asistencia QR y Planilla Oficial (`/asistencia/[id]`, `/plataforma/mesas`).
3. Mesas de Trabajo y Acta Viva (`/plataforma/mesas`, `/mesa/[id]`).
4. Submesas y Papelógrafo Digital (`papelografo-panel`).
5. Matriz de Diagnóstico y Relatoría Técnica (`matriz-arbol-relatoria`).
6. Geodiagnóstico y Geovisor Territorial (`/geovisor`, `/plataforma/geovisor`).
7. Banco de Propuestas Ciudadanas y Radicación (`/propuestas`, `/plataforma/propuestas`).
8. Votaciones y Priorización Participativa (`/votaciones`, `/plataforma/votaciones`).
9. Banco de Alternativas de Solución (`/plataforma/alternativas`).
10. Costeo Presupuestal y Asignación de Fuentes (`costeo-presupuestal-view`).
11. Evaluación de Viabilidad Jurídica y Fiscal con IA (`evaluacion-viabilidad-panel`).
12. Centro de Control de Fases de la Política (`fases-control-panel`, `/politicas`).
13. Arquitectura de Líneas Estratégicas y Programas (`linea-editor-panel`).
14. Plan de Acción y Seguimiento PAS (`/plataforma/seguimiento`).
15. Cadena de Valor y Fichas de Indicadores (`cadena-valor-tab`, `indicador-detalle-panel`).
16. Devolución Ciudadana y Respuestas a Propuestas (`/devolucion`, `/plataforma/devolucion`).
17. Rendición de Cuentas y Descarga de Actas Oficiales (`/rendicion-cuentas`, `mesa-acta-panel`).
18. Testimonios y Noticias Comunitarias (`/testimonios`, `/noticias`).
19. Control de Acceso RBAC, Identidades y Roles (`/plataforma/usuarios`, `/plataforma/roles`).
20. Pista de Auditoría Forense Inmutable (`/plataforma/auditoria`).

---

### 2.3. Diagrama Causal de Hilación de Entidades y Datos
Presentar un esquema en texto / ASCII / Mermaid que ilustre la cadena de trazabilidad desde el aporte inicial hasta la rendición de cuentas final:

```
Asistente (QR) ──────┐
                     ▼
Petición/Aporte ──► Mesa / Submesa ──► Papelógrafo (Problema/Causa/Efecto/Solución)
                                              │
                                              ▼
                                   Matriz de Diagnóstico
                                              │
                                              ▼
                                   Alternativa de Solución ◄── Presupuesto (FONSET/BPIN)
                                              │                      │
                                              ▼                      ▼
                                    Viabilidad Jurídica ◄── Viabilidad Fiscal
                                              │
                                              ▼
                                   Línea Estratégica / Programa
                                              │
                                              ▼
                                   Compromiso PAS / Indicador
                                              │
                                              ▼
                                   Devolución & Rendición de Cuentas
```

---

## 🛡️ 3. Entregables y Cierre de Tarea

1. Redactar el documento completo, exhaustivo y pedagógico en `bridge/02_resultado_agy2.md`.
2. Mantener la terminología oficial soberana de POLIS: CERO menciones a `DNP`, `MGA` o `SINERGIA`, y preservar `BPIN` conforme a las directrices vigentes.
3. Generar el commit atómico local en la rama `main` sin `git push`:
   `docs(architecture): [DOC-HILACION-01] mapeo pericial de hilacion logica y encadenamiento funcional en POLIS`
4. Notificar a `agy` para su contra-auditoría pericial y revisión de completitud.
