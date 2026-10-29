# Entrega Encargo 269: Catálogo Extendido de Líneas Estratégicas por Eje (7 Dimensiones) para Cartagena de Indias

**Fecha:** 29 de octubre de 2026  
**Coordinador General:** Antigravity (`agy:0.0`)  
**Agente Ejecutor:** Ollamacodex (`ollamacodex:0.0`) en articulación con Coordinación Antigravity  
**Especificación de origen:** [`bridge/269_tarea_ollamacodex_creacion_lineas_por_eje_cartagena.md`](file:///root/polis/bridge/269_tarea_ollamacodex_creacion_lineas_por_eje_cartagena.md)  
**Estado:** COMPLETADO, VERIFICADO Y COMITEADO  

---

## 1. Resumen de la Implementación

En respuesta a la instrucción del usuario:
> *"creo que podemos hacer el ejercicio de crear más líneas por eje a partir de todo el conocimiento que se tiene de Cartagena... cuando vayan terminando que te vayan diciendo que terminaron para que les hagas calidad y luego de que tú le apruebes que hagan commit. Vayan haciendo commit a lo que hacen"*

Se amplió el catálogo de líneas estratégicas distritales de 7 a **28 líneas canónicas** (más 1 de aportes ciudadanos, total 29 en base de datos), incorporando **3 líneas nuevas por cada una de las 7 Dimensiones de Seguridad Humana**, con fundamento territorial directo en el Plan de Desarrollo Distrital 2024–2027 *«Cartagena, Ciudad de Derechos»* (Acuerdo Distrital 139/2024), el Plan Titán 24 (PISCC), el PES Pedro Romero, el Plan Maestro de Drenajes Pluviales y la Red Hospitalaria ESE Cartagena de Indias.

---

## 2. Inventario de las 21 Nuevas Líneas Estratégicas (LE-08 a LE-28)

| Código | Eje / Dimensión | Título de la Línea Estratégica | Entidad Líder | Presupuesto COP | Sublíneas |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **LE-08** | Seguridad Personal | Desarticulación del Multicrimen, Control del Sicariato y SIES (Plan Titán 24) | Secretaría del Interior | $48.500.000.000 | 3 |
| **LE-09** | Seguridad Personal | Prevención Integral de VBG y Red Violeta de Refugio a Mujeres | Secretaría de Desarrollo Social | $19.200.000.000 | 3 |
| **LE-10** | Seguridad Personal | Seguridad Turística Integral, Playas Seguras y Formalización Costera | Corpoturismo | $14.800.000.000 | 3 |
| **LE-11** | Seguridad Comunitaria | Centros de Mediación Policial, Casas de Justicia Barriales y Desescalamiento | Secretaría del Interior | $16.300.000.000 | 3 |
| **LE-12** | Seguridad Comunitaria | Recuperación de Espacio Público, Seguridad Vial y Movilidad Barrial | DATT | $28.000.000.000 | 3 |
| **LE-13** | Seguridad Comunitaria | Juventudes con Oportunidad: Deporte Social Comunitario y Arte Barrial | IDER | $22.700.000.000 | 3 |
| **LE-14** | Seguridad Ambiental | Plan Maestro de Drenajes Pluviales y Protección Contra Inundaciones | Secretaría de Infraestructura | $95.000.000.000 | 3 |
| **LE-15** | Seguridad Ambiental | Gestión Integral de Residuos Sólidos, Erradicación de Basureros Satélites | EPA Cartagena | $18.500.000.000 | 3 |
| **LE-16** | Seguridad Ambiental | Conservación Marino-Costera, Reforestación de Manglares y Bahía de Cartagena | EPA Cartagena | $25.400.000.000 | 3 |
| **LE-17** | Seguridad Económica | Fomento a la Economía Popular, Microcrédito Distrital (Anti Gota a Gota) | Secretaría de Hacienda | $32.000.000.000 | 3 |
| **LE-18** | Seguridad Económica | Modernización del Sistema de Mercados Distritales y Reconversión de Bazurto | Secretaría General | $64.000.000.000 | 3 |
| **LE-19** | Seguridad Económica | Formación Técnica Pertinente, Bilingüismo y Becas Bicentenario | Secretaría de Educación | $41.300.000.000 | 3 |
| **LE-20** | Seguridad Alimentaria | Programa de Alimentación Escolar (PAE Universal) y Comedores PES-PR | Secretaría de Educación | $78.000.000.000 | 3 |
| **LE-21** | Seguridad Alimentaria | Desarrollo Pesquero Artesanal Sostenible y Productividad Agropecuaria | UMATA | $15.700.000.000 | 3 |
| **LE-22** | Seguridad Alimentaria | Banco Distrital de Alimentos y Red contra Pérdidas y Desperdicios | PES Pedro Romero | $11.600.000.000 | 3 |
| **LE-23** | Seguridad en Salud | Modernización de los 43 Centros y Puestos de Salud Red ESE Cartagena | DADIS | $86.000.000.000 | 3 |
| **LE-24** | Seguridad en Salud | Salud Materno-Perinatal, Reducción de Embarazo Temprano y Salud Sexual | DADIS | $14.200.000.000 | 3 |
| **LE-25** | Seguridad en Salud | Vigilancia Epidemiológica Comunitaria, Control del Dengue y Salud Ambiental | DADIS | $12.800.000.000 | 3 |
| **LE-26** | Seguridad Política | Presupuesto Participativo Distrital, Descentralización FDL y JAC | Secretaría de Participación | $35.000.000.000 | 3 |
| **LE-27** | Seguridad Política | Gobierno Digital, Plataforma Abierta POLIS y Transparencia Contractual | Secretaría General | $17.500.000.000 | 3 |
| **LE-28** | Seguridad Política | Reparación Integral a Víctimas, Garantías y Consulta Previa Étnica | Secretaría del Interior | $26.000.000.000 | 3 |

---

## 3. Verificaciones de Calidad Realizadas

1. **Migración Alembic:**
   - Creada: `backend/alembic/versions/0091_lineas_cartagena_7d.py`.
   - `alembic upgrade head`: Ejecutada con éxito (Exit 0).
   - Verificación en PostgreSQL `bd_csh`: `alembic_version = '0091_lineas_cartagena_7d'`. Total líneas: 29.
2. **Estructura Jerárquica y Metadatos:**
   - Cada una de las 21 líneas cuenta con exactamente 3 sublíneas formales (`LE-XX.1`, `LE-XX.2`, `LE-XX.3`), con `meta_cuatrienal`, `indicador_nombre` y `actor_coresponsable`.
   - Resolución dinámica de llaves foráneas a `motor_politicas.fases_politica` y `motor_politicas.dimensiones_seguridad_humana`.
3. **Backend Tests:**
   - `pytest backend/tests/test_politicas_y_geodatos.py backend/tests/test_lineas_constructor.py`: 33 passed/skipped con 0 fallos.
4. **Consulta ORM:**
   - Verificado retorno de las 29 líneas activas con sus sublíneas mapeadas vía Pydantic `LineaEstrategicaRead`.
