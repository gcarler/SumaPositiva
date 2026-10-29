# OP-DANE-PREFLIGHT-02 · Preflight del anexo pendiente

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Sin descargar archivo completo. Sin app/tests/src/banco/SQL/pytest. TLS verificado. 189/195/201/173 intactos.

## Objetivo
`PPED-AreaSexoEdadMun-2018-2042_VP.xlsx` (extraído de `bridge/165_evidencia_linaje_demografico/extraccion_vinculos_165.json` línea 108). URL: `https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaSexoEdadMun-2018-2042_VP.xlsx`

## Cabezas públicas (HEAD)
- **Status:** 200
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Length:** No presente en cabeceras (servidor no lo anuncia)
- **Last-Modified:** `Fri, 08 Aug 2025 22:00:38 GMT`
- **Accept-Ranges:** `bytes`
- **ETag:** No presente
- **Fecha consulta UTC:** `2026-10-26T06:29:19.357295+00:00`
- **Historial redirecciones:** 0 (sin redirecciones)
- **Host/puerto:** `www.dane.gov.co:443` (HTTPS)

**Nota:** No confundir ausencia de Content-Length con tamaño conocido.

## Prueba Range (única, acotada)
- **Request:** `Range: bytes=0-0`
- **Status:** **206 Partial Content**
- **Content-Range:** `bytes 0-0/131609579`
- **Content-Length:** `1` (bytes recibidos en esta respuesta parcial)
- **Bytes recibidos realmente:** **1 byte**
- **Body SHA256:** `5c62e091b8c0565f1bafad0dad5934276143ae2ccef7a5381e8ada5b1a8d26d2`
- **Conclusión:** Servidor acepta Range; tamaño **total anunciado** por Content-Range es **131,609,579 bytes (~125.5 MiB)**. Respuesta parcial **no** es original descargado ni valida XLSX.

## Límites medidos
- **Tamaño declarado (por servidor):** ~125.5 MiB (`bytes 0-0/131609579`)
- **Excede límite actual 189:** 64 MiB por archivo → coincide con el error previo
- **Límite total propuesto 189:** 128 MiB (también insuficiente)
- **Acepta Range:** Sí (206)
- **Redirecciones:** Ninguna
- **Tiempo:** < 30s por operación

## Alternativas explícitas (sin descargar completo)
1. **Descarga por rangos** (byte ranges): viable dado `Accept-Ranges: bytes` y `206`. Requiere gestor de rangos, reensamblado, validación por tramo, manejo de interrupciones. Aún requiere presupuesto total > 125 MiB.
2. **Descarga acotada si disponible**: no hay alternativa publicada en HTML 165 para un extracto municipal por edad/sexo menor a este archivo completo.
3. **Productos distintos**: existen otros archivos municipales/departamentales en el portal, pero **no** equivalentes (diferentes desagregaciones/períodos). No tratarlos como equivalentes ni asignar base/edición por nombre.
4. **Obtener vía otro canal**: fuera del alcance de esta tarea. Sin credenciales.

## Recomendación (técnica, sin dictamen)
- Para captura completa posterior: **necesario presupuesto > 125.5 MiB** y capacidad de descarga por rangos. Los límites actuales (64 MiB/archivo, 128 MiB/lote) son insuficientes.
- **No aumentar automáticamente** límites de backend/validador.
- Validación XLSX completa requiere reensamblado íntegro; lectura por rangos parcial no basta.
- No se ha acreditado linaje semántico; solo evidencia técnica de tamaño/acceso.

## Evidencia
- Guion: `bridge/230_preflight_opencode_dane_edad_sexo/preflight.py`
- Resultado: `bridge/230_preflight_opencode_dane_edad_sexo/preflight.json` (SHA registrado en JSON)
- Límites respetados: HTTPS solo DANE, máx redirecciones 3, timeout 20s, ≤512KiB totales recibidos, sin credenciales.
