# OP-DANE-PREFLIGHT-02-R1 · Precisión del preflight 230

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Sin red. 230 y sus archivos conservados íntegros. Solo lectura de 230/preflight.json.

## 1) Content-Length en HEAD
- **Hecho:** `HEAD` devuelve `Content-Length: 131609579` (presente en `bridge/230_preflight_opencode_dane_edad_sexo/preflight.json`). 
- **Corrección a 230:** El informe afirmaba erróneamente ausencia de Content-Length. Debe distinguirse: **tamaño anunciado por HEAD** = 131,609,579 bytes; **cuerpo HEAD recibido** = 0 bytes (registrado como `body_len: 0`); **único byte recibido** en `GET Range: bytes=0-0` = 1 byte con `206 Partial Content` y `Content-Range: bytes 0-0/131609579`.
- **Fecha HTTP vs publicación:** Cabeceras `Date`/`Last-Modified` son del servidor/captura; **no equivalen** a fecha de publicación del producto.

## 2) Tamaños y presupuesto
| Escenario | Cálculo | Resultado |
|---|---|---|
| Pendiente anunciado | HEAD Content-Length | **131,609,579 bytes (~125.5 MiB)** |
| Por archivo (189 límite) | vs 64 MiB (67,108,864) | **Excede 64 MiB** |
| Individual vs lote 128 MiB | vs 134,217,728 | **Menor que 128 MiB individualmente** |
| Lote 189 + pendiente | 6,714,476 + 131,609,579 | **138,324,055 bytes (~132.0 MiB)** → **Supera 128 MiB** |
| Originales 189 reales | verificado | XLS 1,910,272; XLSX 3,948,350; PDF 855,854 (total 6,714,476) |

Nada acredita expansión al descomprimir XLSX; presupuesto debe evaluarse por separado para archivo individual y para lote.

## 3) Rango vs streaming completo
- **Acreditado:** `Accept-Ranges: bytes` y `206` con `Content-Range`. Descarga **por rangos** es técnicamente posible.
- **No necesario universalmente:** Una **captura completa en streaming** también puede ser viable con un perfil acotado suficiente y validación íntegra. No se ejecutó ninguna descarga completa ni se aumentaron límites.
- **Advertencia:** Respuesta parcial **no** es original descargado ni valida el XLSX.

## 4) Alcance del guion 230 (limitaciones)
Revisado `bridge/230_preflight_opencode_dane_edad_sexo/preflight.py`:
- Declara `MAX_REDIRECTS=3` pero **no implementa seguimiento con contador/historial** (lógica simplificada).
- Declara `MAX_TOTAL=512KiB` pero **no acumula presupuesto global** entre pasos; usa `max_body` por solicitud.
- Lee `read(max_body+1)` y **trunca** el contador en práctica; **no certifica** control de plazo total.
- Guarda **todas las cabeceras** (no solo whitelist autorizada en 229).
- **No registró** hora exacta de inicio ni URL final separada; **no registrar URL final distinta** no implica que no haya ocurrido. Limitar a lo realmente registrado.
- Corrida observada: 0 redirecciones, solo 1 byte GET. **No certifica** comportamiento ante otras respuestas.

## 5) Vista de metadatos (autorizada)
Cabeceras autorizadas presentes: `Date`, `Content-Type`, `Content-Length`, `Last-Modified`, `Accept-Ranges`, `Content-Range` (en 206). SHA JSON primario: `11ef389b9e39a464fde52e19c0f9e16dbd1a4c31bb4a8906739d623cd2b65705`. SHA guion 230: `69b5fe27b95f195baa7fe299d24514b3eb2348a76a13aed53e5bce88bd933b67`.

## Conclusión
Correcciones documentales únicamente. Sin modificar 189/195/201/230. Sin nuevas consultas. El tamaño anunciado justifica exceder 64 MiB e insuficiencia del lote 128 MiB; ambas perspectivas deben mantenerse. Rangos acreditados pero no obligatorios. Guion 230 con limitaciones no certificadas para otros casos.
