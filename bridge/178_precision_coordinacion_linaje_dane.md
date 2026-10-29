# Precisión de coordinación sobre 165 y 173 · Fechas y linaje DANE

26-oct-2026. Cotejo local reproducido por coordinación. Se conservan 165 y 173 como evidencia histórica; este documento corrige sus conclusiones sobre fechas y precisa sus límites.

## Resultado

El original `165_evidencia_linaje_demografico/originales/proyecciones_de_poblacion.html`, SHA-256 `e8e96e490b0cbd99acd6d889127669ae1163dc58dc897d4b63fad38ac1e2f534`, sí contiene fechas visibles: cuatro apariciones de **18-Julio-2025** y ocho de **8-Agosto-2025**. No se encontraron `datePublished` ni `dateModified`. Son comprobaciones distintas. La búsqueda negativa consignada en 173 no permite concluir que esas fechas no existen: no consideraba correctamente las mayúsculas y alternativas del patrón.

Las fechas corresponden a los productos presentados en la página; no acreditan la edición de cada observación TerriData, el corte de toda la página ni una población observada en 2026. Tampoco se deducen de `Last-Modified`, que es un encabezado HTTP de la captura.

El perfil 141 mantiene **354 series, 5.835 filas y 19 etiquetas literales**. Las variantes del Observatorio Nacional de Migraciones, con y sin espacio final, siguen diferenciadas. La tabla de 165 agrupa ambas en una fila y presenta 18 filas; no son 18 etiquetas literales originales ni 19 instituciones acreditadas.

Una coincidencia numérica con un anexo oficial ayuda a identificar un candidato. El linaje exige además territorio, indicador, unidad, universo, periodo, base censal, edición y transformaciones, con referencia a la celda y producto. Un año anterior a 2018 también puede pertenecer a una retroproyección posterior basada en CNPV 2018. El año por sí solo no determina la base censal.

## Reproducción y alcance

Guion: [178_verificar_fechas_dane.py](178_verificar_fechas_dane.py). Resultado ejecutado: [178_evidencia_precision_fechas_dane.json](178_evidencia_precision_fechas_dane.json). El guion comprueba primero el SHA del HTML y el universo de 141, elimina script/style, normaliza espacios y localiza las fechas sin distinguir mayúsculas. Registra los offsets sobre ese texto normalizado. Falla si el original o los conteos difieren. No accede a red, SQL, aplicación ni banco.

```bash
python3 bridge/178_verificar_fechas_dane.py
```

Para guardar otra evidencia puede usarse `--salida` con un archivo inexistente; el guion no sobrescribe resultados. La corrida registrada no descargó anexos ni acreditó el linaje de ninguna de las 354 series. No se modificó el documento diagnóstico.
