# Motor territorial · TerriData y ficha de contexto para políticas

24 de octubre de 2026. Estado: reconocimiento y plan de integración; no motor implementado ni cobertura nacional acreditada.

## Guía recibida y evidencia

Se descargó y leyó completa la guía «Transferencia técnica | TerriData → fichas territoriales propias», aportada en Google Docs. Copia y SHA: `75_guia_motor_territorial_terridata/guia_original.txt` y `procedencia_guia.json`.

Las referencias a código BdeC_IP son observaciones del autor de la guía. En este trabajo no se revisó ni ejecutó ese repositorio. La guía distingue diseño existente y propuestas; no deben trasladarse sus contingencias sintéticas, sustituciones territoriales o limitaciones conocidas a POLIS.

## Brecha en POLIS

- `registro_descargas_polis.py:185` registra un anexo XLSX/ZIP de Cartagena, con ID `local:dnp_terridata_13001` y nombre esperado específico. No constituye un adaptador territorial parametrizado.
- `adquisicion_fuentes_polis.py` conserva capturas técnicas; el manifiesto actual declara `DIVIPOLA:13001`. La capacidad de descargar una URL no acredita soporte para otras entidades o departamentos.
- El inventario 48 incluye una serie TerriData seleccionada para Cartagena, con 82 filas en aquel consolidado y varios indicadores/unidades. Ese recorte no demuestra una ficha territorial completa.
- La taxonomía 7D tiene correspondencias para indicadores TerriData; no es un perfil territorial neutro ni una resolución nacional de identidades.
- El evaluador SisPT menciona cierre de brechas/TerriData; esa mención no implementa extracción, catálogo DIVIPOLA, objeto canónico de ficha ni sus exportaciones.

La evidencia es la lectura de estos componentes, no una auditoría de la base ni ejecución de todos los motores.

## Lugar en el ciclo de la política

```text
territorio + tipo de política
  → resolver identidad y nivel territorial con catálogo versionado
  → adquirir o reutilizar originales TerriData verificables
  → validar, normalizar y consultar por corte
  → ficha territorial canónica + brechas y límites
  → seleccionar/refinar fuentes nacionales y territoriales de la política
  → armonizar y contrastar sin duplicar datos por canal
  → análisis sectorial, formulación, seguimiento y revisión
```

La ficha territorial es un contexto transversal y una salida derivada, no una nueva institución fuente. TerriData es canal de obtención; DANE u otro productor declarado sigue identificado por observación. El mismo indicador obtenido directamente y vía TerriData debe cotejarse por linaje/versiones; no contarse dos veces como evidencia independiente ni sumarse.

El ciclo es iterativo: nuevas fuentes o versiones pueden corregir la ficha. El ámbito, la naturaleza institucional y el tipo observado/proyectado/estimado son dimensiones diferentes.

## Contratos que deben fijarse

### Identidad territorial

País, código oficial como texto, tipo territorial, nombre oficial, departamento/jurisdicción superior cuando aplique, versión y evidencia del catálogo. La relación se verifica con DIVIPOLA del DANE; no por coincidencia de nombres ni rellenado automático de ceros. Código departamental, código municipal y posibles códigos internos del proveedor se mantienen separados. La convención XX000 descrita en la guía no se presenta como código municipal oficial.

Cartagena, Santa Catalina (Bolívar), Sahagún (Córdoba) y Bogotá D.C. son casos de interés, no prueba de cobertura. Sus códigos y relaciones deben resolverse desde el catálogo elegido, sin inventarlos en configuraciones de ejemplo.

### Observación territorial

Serie: identidad territorial, indicador exacto y versión de su definición, clasificación original, unidad de medida, productor, canal y desagregaciones existentes. Observación: periodo, valores numérico y cualitativo originales, naturaleza de la observación, archivo/miembro/fila y transformaciones. Una unidad de medida no identifica por sí sola unidad de observación.

Usar `naturaleza_observacion` (observado/proyección/estimación/sintético/no determinada) y un campo distinto para naturaleza del custodio. No clasificar como observado solo por publicar en TerriData. Nulos, ceros y números ambiguos se distinguen; año inválido se rechaza o retiene, nunca se rellena con un año inventado. El parseo numérico conserva texto original y regla versionada, sin pasar importes por float binario.

### Ficha canónica

Una única `FichaTerritorial` reúne identidad, corte, versiones de fuente, indicadores/series seleccionados, naturaleza, comparadores compatibles, faltantes y advertencias. El agente puede interpretar referencias del objeto, sin sustituir hechos o rellenar faltantes. HTML/PDF/XLSX/Markdown derivan de ese mismo objeto; no vuelven a consultar o calcular cada uno por su cuenta.

Debe distinguirse corte de observaciones (periodo) de corte de conocimiento (versiones disponibles). Sin vintages históricos no se afirma reconstrucción de lo conocido años atrás. Para población se conserva base censal y vintage; se respeta la distinción solicitada por el usuario entre base 2005 para periodos anteriores a 2018 y CNPV 2018/proyecciones correspondientes desde 2018, sin retroproyectar una edición actual como si hubiese sido conocida entonces.

## Tareas ordenadas y criterios de salida

| ID | Tarea | Salida revisable | Condición para avanzar |
|---|---|---|---|
| MT-01 | Contrastar guía y componentes actuales | Este reconocimiento, guía versionada y brechas | Distinguir implementado/propuesto y alcance de la captura actual |
| MT-02 | Obtener/versionar catálogo oficial de identidades y reglas del proveedor | Original, SHA, fecha, tipos territoriales y correspondencias | Ceros, homónimos, jerarquía y ausencia de entidad se resuelven sin inventar |
| MT-03 | Parametrizar adquisición por entidad/tipo y comprobar rutas públicas | Piloto con original, metadatos HTTP y manifiesto | HTML de error no se trata como ZIP/TXT; no cambiar rutas silenciosamente |
| MT-04 | Parser TXT/ZIP y respaldo XLSX por esquema constatado | Observaciones válidas y cuarentena con fila/causa | Identidad del contenido, codificación, columnas, unidades y periodos explícitos; límites ZIP/CRC; ninguna extracción de rutas arbitrarias |
| MT-05 | Persistencia canónica e historia en PostgreSQL, mediante Alembic | Diseño de tablas, migración y servicio transaccional | Staging validado antes de activar; idempotencia, rollback e historia comprobados en polis_test* cuando se autorice la verificación |
| MT-06 | Consultas por corte, naturaleza y serie exacta | Consulta reproducible con entradas/salidas y evidencia | Filtrar antes de elegir último dato; departamento no se sustituye por su capital; sin promediar tasas o porcentajes |
| MT-07 | Construir la ficha canónica neutra | JSON de contexto territorial y faltantes | Cada valor reconstruible hasta productor/canal/archivo/fila; sin siete dimensiones SH obligatorias |
| MT-08 | Exportadores y visualización de ficha | Formatos derivados del JSON con gráficos pertinentes | Consistencia de valores/periodos/fuentes y lectura posterior de archivos finales; N/D con motivo, no cero por defecto |
| MT-09 | Articular planificador, motores y agentes | Consumidor real del perfil territorial con trazas | Fuentes pertinentes por política, deduplicación por linaje y condiciones de comparabilidad conservadas |
| MT-10 | Lote representativo, luego cobertura nacional | Manifiesto por entidad, reanudación y cobertura por dimensión/periodo | Contar objetivos, intentos, válidos, ingeridos, fichas, faltantes y fallos por separado; catálogo no equivale a integración |

No se ejecuta un lote nacional como primer paso. La ficha usa gráficos cuando los datos lo permitan, conservando tablas de respaldo y procedencia donde sean útiles. DEA requiere entradas/salidas comparables y solución válida; fallo o insuficiencia produce no evaluable. No hay eficiencia perfecta de respaldo ni atribución causal automática.

## Integración con el trabajo en curso

- OpenCode OP-FUENTES-01: especificación catálogo→planificador. Debe considerar que una fuente nacional puede entregar datos territoriales y que la ficha de contexto requiere identidad y cobertura verificadas. Mantiene sus archivos 72 como único ámbito de escritura.
- Ollamacodex OL-CONCILIA-01: núcleo puro de contraste. Debe poder recibir observaciones territoriales compatibles; no debe incorporar descarga TerriData ni construir la ficha. Mantiene sus cuatro archivos asignados.
- Coordinación: reconocimiento territorial y diseño de la integración, sin editar los archivos exclusivos de ambos agentes.

## Límites y cautelas de implementación

No copiar la SQLite paralela de la guía como persistencia productiva de POLIS; el almacén canónico de la aplicación sigue PostgreSQL/PostGIS y las migraciones siguen Alembic. El piloto técnico puede conservar artefactos bajo `bridge/` sin promoverlos al banco.

No se modifican todavía esquema, API, permisos, catálogos activos, fuentes, frontend ni documentos de diagnóstico. Las rutas de descarga descritas por la guía son patrones a comprobar, no un contrato de API ni una garantía de cobertura. La eventual ficha se identifica como **elaboración propia con fuentes citadas**, no como ficha emitida/certificada por DNP.

Referencias: [TerriData DNP](https://terridata.dnp.gov.co/), [DIVIPOLA DANE](https://www.dane.gov.co/index.php/sistema-estadistico-nacional-sen/normas-y-estandares/nomenclaturas-y-clasificaciones/nomenclaturas/codificacion-de-la-division-politico-administrativa-de-colombia-divipola). Su consulta confirma el contexto de estos servicios, no la descarga nacional o la ejecución del motor propuesto.


## Comprobación técnica del archivo piloto

Se consultó la ruta TXT/ZIP de Cartagena descrita en la guía: HTTP 200, un miembro `TerriData13001.txt`, 13 columnas y 12.899 filas tabulares, sin filas de ancho inconsistente. El contenido declara entidad `13001` y departamento `13`; esto no sustituye la validación con catálogo DIVIPOLA. El ZIP pasó lectura, límites y CRC durante la inspección. Se conservó original, SHA, metadatos HTTP y manifiesto bajo `bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230`.

Esta es una inspección de adquisición y estructura, no ingesta normalizada ni generación de ficha. Incluye filas cualitativas y metadatos; 12.899 filas no equivalen a 12.899 indicadores distintos ni cifras ya validadas. El campo Mes publica también `0`, que debe conservarse crudo y tratarse según regla temporal del proveedor; no se impone como mes calendario. Las filas de descripción general llevan años convencionales y no deben convertirse automáticamente en series estadísticas. El perfil estructural queda separado de datos promovidos.
