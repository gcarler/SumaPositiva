> **SUPERADO por la v2 ejecutable:** `bridge/000_plan_maestro_indicadores_seguridad_humana_20261105_v2.md` (corrige taxonomía 7D, escala territorial y añade paquetes con criterios de aceptación). Esta v1 se conserva solo como visión.

# Plan de trabajo maestro — Indicadores de Seguridad Humana para Cartagena

**Objetivo:** construir un sistema de lectura territorial basado en indicadores oficiales y verificados para entender Cartagena no solo como mapa de delito, sino como mapa de vulnerabilidad, capacidad institucional, desigualdad y seguridad humana integral.

**Estado:** plan operativo pendiente de implementación.

---

## FASE 0 · Diagnóstico y limpieza de fuentes

### Objetivo
Saber exactamente qué información existe, de dónde viene, qué cobertura tiene y qué huecos hay.

### Tareas
1. **Inventario completo de fuentes**
   - DANE
   - Policía Nacional / SIEDCO
   - Fiscalía General de la Nación
   - Medicina Legal
   - DNP / TerriData
   - ICBF
   - INS / SIVICAP
   - IDEAM / SISAIRE
   - Unidad para las Víctimas
   - Procuraduría
   - Planes de Desarrollo
   - Cartografía distrital
2. **Validación de fuentes**
   - Verificar custodio
   - Verificar licencia
   - Verificar cobertura territorial
   - Verificar periodo de corte
   - Verificar trazabilidad
3. **Normalización del dominio**
   - Normalizar `territorio_id`
   - Normalizar barrio / corregimiento / UCG
   - Normalizar período
   - Normalizar unidad de medida
   - Normalizar `dimension_id`

### Producto esperado
- Inventario operativo de fuentes.
- Mapa de cobertura por fuente.
- Tabla de huecos de datos.
- Informe de calidad de datos.

---

## FASE 1 · Arquitectura de datos y modelo analítico

### Objetivo
Crear un modelo canónico para construir indicadores reproducibles y auditables.

### Tareas
1. Definir el esquema base del indicador:
   - ID del indicador
   - Código
   - Nombre
   - Definición
   - Fórmula
   - Unidad
   - Nivel territorial
   - Fuencia
   - Periodicidad
   - Año base
   - Metadatos
2. Definir reglas de cobertura territorial.
3. Definir reglas de verificación.
4. Definir cómo se maneja la falta de desagregación:
   - Si no existe desagregación → pintar Distrito completo.
   - Si existe desagregación → pintar barrio / corregimiento / UCG.
5. Definir reglas para datos no comparables.

### Producto esperado
- Modelo canónico de indicadores.
- Diccionario de datos.
- Reglas de calidad para la tabla `indicadores_territorio`.

---

## FASE 2 · Matriz de indicadores operativos

### Objetivo
Generar el catálogo completo de indicadores por dimensión, con fórmulas y fuente.

### Dimensiones priorizadas
1. Seguridad Personal
2. Seguridad Comunitaria
3. Seguridad Económica
4. Seguridad Ambiental
5. Seguridad Alimentaria
6. Seguridad en Salud
7. Seguridad Política

### Trabajo
Cada indicador debe quedar definido con:
- Fórmula
- Fuente
- Unidad
- Nivel territorial
- Periodo
- Interpretabilidad
- Riesgo metodológico
- Estado actual
- Año base

### Ejemplo de indicadores candidatos
- Tasa de homicidios por 100.000 hab.
- Tasa de violencia intrafamiliar por 100.000 hab.
- Tasa de lesiones intencionales por 100.000 hab.
- Tasa de pobreza monetaria.
- Proporción de población en NBI.
- Población sin servicio de agua potable.
- Índice de Riesgo de Calidad de Agua (IRCA).
- Incidencia de dengue por 100.000 hab.
- Cobertura PAE por barrio.
- Densidad institucional por UCG.
- Avance físico de metas territoriales.

### Producto esperado
- Matriz completa de 50–80 indicadores.
- Fórmulas explícitas.
- Priorización por factibilidad.

---

## FASE 3 · Cruce analítico

### Objetivo
Transformar datos en lectura crítica territorial.

### Cruces prioritarios
- Pobreza × inseguridad alimentaria
- Violencia intrafamiliar × presencia de programas comunitarios
- Déficit habitacional × victimización
- Presupuesto público × avance físico de metas
- Calidad de agua × salud preventiva
- Presupuesto × cobertura social
- Densidad institucional × homicidios
- Presupuesto social per cápita × incidencia de pobreza

### Producto esperado
- Matriz de cruces analíticos.
- Interpretación de patrones territoriales.
- Hipótesis para revisión jurídica.

---

## FASE 4 · Integración en el Geovisor

### Objetivo
Hacer visible la lectura crítica dentro del sistema POLIS.

### Trabajo
1. Cargar indicadores dinámicos desde la base de datos.
2. Permitir multilayer / múltiples indicadores activos.
3. Construir capas analíticas.
4. Construir índices compuestos.
5. Construir mapa de vulnerabilidad social.
6. Integrar ranking por territorio.
7. Integrar series temporales.
8. Crear panel comparativo por dimensión.
9. Crear panel por barrio / corregimiento / UCG.
10. Crear panel de cruces analíticos.

### Producto esperado
- Geovisor con lectura de seguridad humana.
- Capas oficiales integradas.
- Analítica territorial en tiempo real.
- Dashboard de cruce analítico.

---

## FASE 5 · Auditoría, pruebas y trazabilidad

### Objetivo
Garantizar que cada indicador sea defendible.

### Trabajo
1. Pruebas unitarias.
2. Pruebas de persistencia.
3. Validación de fórmulas.
4. Validación de cobertura.
5. Validación de fuente.
6. Auditar el linaje de datos.
7. Reglas de revisión legal.
8. Reglas de revisión metodológica.
9. Reglas de revisión técnica.

### Producto esperado
- Informe de trazabilidad.
- Informe de validación.
- Registro de auditoría.
- Dictamen metodológico.

---

## Regla de oro
Un indicador no se certifica solo por aparecer en el Geovisor. Se certifica solo cuando tiene:

1. fuente verificable,
2. nivel territorial claro,
3. corte temporal explícito,
4. unidad de medida definida,
5. fórmula reproducible,
6. justificación metodológica,
7. trazabilidad de origen.

---

## Siguiente paso
Construir la **matriz completa de indicadores operativos** con fórmula, fuente, cobertura territorial y ruta de implementación en el Geovisor.

