"""Captura explícita en staging: transporte acotado y productos registrados.

No promueve el banco, no escribe SQL y no acredita aptitud estadística/licencia.
Las consultas actuales son de Cartagena; no se infiere otro municipio del policy_id.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import uuid
from dataclasses import asdict
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx

from app.modules.compromisos.metadatos_socrata_polis import ficha_metadata
from app.modules.compromisos.registro_descargas_polis import FuenteDescarga, registro_descargas

RAIZ = Path(__file__).resolve().parents[4]
MAX_BYTES = 16 * 1024 * 1024
PAGINA = 1000
MAX_PAGINAS = 25
HOSTS = frozenset(
    {
        "www.datos.gov.co",
        "www.dane.gov.co",
        "dane.gov.co",
        "terridata.dnp.gov.co",
        "vgv.unidadvictimas.gov.co",
        "cifras2.unidadvictimas.gov.co",
    }
)


def _url_permitida(url: str) -> None:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in HOSTS
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
    ):
        raise ValueError("URL ajena al registro de fuentes públicas")


def _json(contenido: bytes):
    return json.loads(contenido, parse_float=Decimal)


def _entero(valor) -> int:
    if isinstance(valor, bool) or not re.fullmatch(r"\d+", str(valor)):
        raise ValueError("Conteo no entero o negativo")
    return int(valor)


def _escribir_json(ruta: Path, paquete: dict) -> None:
    with ruta.open("x", encoding="utf-8") as archivo:
        json.dump(paquete, archivo, ensure_ascii=False, sort_keys=True, indent=2, default=str)
        archivo.write("\n")


def productos_desde_plan(plan: dict) -> tuple[str, ...]:
    """Respeta acciones del planificador; una ficha pendiente no activa la red."""
    if plan.get("esquema") != "polis.plan_fuentes_politica.v1":
        raise ValueError("Esquema de plan desconocido")
    base = {k: v for k, v in plan.items() if k != "plan_sha256"}
    sha = hashlib.sha256(
        json.dumps(base, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    if sha != plan.get("plan_sha256"):
        raise ValueError("El plan fue alterado después de producir su SHA")
    seleccion = {d["producto_id"] for d in plan["decisiones"] if d["accion"] == "programar_adquisicion_y_validacion"}
    if not seleccion:
        raise ValueError("El plan no autoriza adquisiciones; completar sus fichas primero")
    return tuple(sorted(seleccion))


class CapturaHTTP:
    def __init__(self, cliente: httpx.AsyncClient, carpeta: Path):
        self.cliente = cliente
        self.carpeta = carpeta
        self.respuestas: list[dict] = []

    async def get(self, url: str, params: dict | None = None) -> bytes:
        """Registra respuestas completas, incluso fallos; valida cada redirección."""
        _url_permitida(url)
        actual = url
        for intento in range(3):
            try:
                for salto in range(4):
                    _url_permitida(actual)
                    async with self.cliente.stream("GET", actual, params=params if salto == 0 else None) as r:
                        if r.is_redirect:
                            if salto == 3 or "location" not in r.headers:
                                raise ValueError("Redirección no resuelta")
                            actual = urljoin(str(r.url), r.headers["location"])
                            continue
                        bloques = bytearray()
                        async for bloque in r.aiter_bytes():
                            bloques.extend(bloque)
                            if len(bloques) > MAX_BYTES:
                                raise ValueError("Respuesta excede el límite de descarga")
                        contenido = bytes(bloques)
                        sha = hashlib.sha256(contenido).hexdigest()
                        nombre = f"{len(self.respuestas):04d}-{sha}.bin"
                        with (self.carpeta / nombre).open("xb") as archivo:
                            archivo.write(contenido)
                        self.respuestas.append(
                            {
                                "url": str(r.url),
                                "http": r.status_code,
                                "capturado_utc": datetime.now(UTC).isoformat(),
                                "sha256": sha,
                                "bytes": len(contenido),
                                "archivo": nombre,
                                "content_type": r.headers.get("content-type"),
                                "etag": r.headers.get("etag"),
                                "last_modified": r.headers.get("last-modified"),
                                "intento": intento + 1,
                            }
                        )
                        r.raise_for_status()
                        return contenido
                raise ValueError("Redirección sin respuesta")
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in {429, 500, 502, 503, 504} or intento == 2:
                    raise
            except (httpx.TimeoutException, httpx.NetworkError):
                if intento == 2:
                    raise
            await asyncio.sleep(0.5 * 2**intento)
            actual = url
        raise ValueError("Reintentos agotados")


def _lista(datos) -> list[dict]:
    if not isinstance(datos, list) or any(not isinstance(fila, dict) for fila in datos):
        raise ValueError("Se esperaba una lista de objetos")
    return datos


async def _socrata(fuente: FuenteDescarga, http: CapturaHTTP) -> dict:
    metadata_url = f"https://www.datos.gov.co/api/views/{fuente.dataset}.json"
    inicial_bytes = await http.get(metadata_url)
    inicial = _json(inicial_bytes)
    if not isinstance(inicial, dict) or inicial.get("id") != fuente.dataset:
        raise ValueError("Identidad de metadatos discrepante")
    publicadas = {c.get("fieldName") for c in inicial.get("columns", [])}
    if faltantes := set(fuente.columnas) - publicadas:
        raise ValueError(f"Columnas esperadas ausentes: {sorted(faltantes)}")
    revision = inicial.get("rowsUpdatedAt")
    if revision is None:
        raise ValueError("La fuente no publicó identificador temporal de revisión")

    async def contar() -> int:
        filas = _lista(_json(await http.get(fuente.url, {"$select": "count(*) as filas", "$where": fuente.filtro})))
        if len(filas) != 1:
            raise ValueError("Conteo filtrado incompleto")
        return _entero(filas[0]["filas"])

    esperadas = await contar()
    total = 0
    filas_agrupadas = 0
    anuales: dict[tuple[int, str], Decimal] = {}
    for pagina in range(MAX_PAGINAS):
        params = {
            "$select": fuente.seleccion,
            "$where": fuente.filtro,
            "$order": fuente.grupo or ":id",
            "$limit": PAGINA,
            "$offset": PAGINA * pagina,
        }
        if fuente.grupo:
            params["$group"] = fuente.grupo
        filas = _lista(_json(await http.get(fuente.url, params)))
        total += len(filas)
        if fuente.grupo:
            filas_agrupadas += sum(_entero(f["filas"]) for f in filas)
        if fuente.producto_id.startswith("local:policia_") and fuente.grupo.startswith("fecha_hecho"):
            for fila in filas:
                texto = str(fila.get("fecha_hecho", ""))
                if re.match(r"^\d{2}/\d{2}/\d{4}(?:$|\s)", texto):
                    anio = datetime.strptime(texto[:10], "%d/%m/%Y").year
                elif re.match(r"^\d{4}-\d{2}-\d{2}(?:$|[T\s])", texto):
                    anio = date.fromisoformat(texto[:10]).year
                else:
                    raise ValueError("Fecha policial no interpretable; conservar captura en cuarentena")
                try:
                    cantidad = Decimal(str(fila["cantidad_reportada"]))
                except InvalidOperation as exc:
                    raise ValueError("Cantidad policial no numérica") from exc
                if not cantidad.is_finite() or cantidad < 0:
                    raise ValueError("Cantidad policial no válida")
                detalle = next((str(fila[c]) for c in fuente.grupo.split(",")[1:] if c in fila), "total")
                llave = (anio, detalle)
                anuales[llave] = anuales.get(llave, Decimal(0)) + cantidad
        if len(filas) > PAGINA:
            raise ValueError("La fuente ignoró el límite de página")
        if len(filas) < PAGINA:
            break
    else:
        raise ValueError("Límite de paginación alcanzado; captura incompleta")
    final = _json(await http.get(metadata_url))
    if not isinstance(final, dict) or final.get("id") != fuente.dataset or final.get("rowsUpdatedAt") != revision:
        raise ValueError("La revisión de filas cambió durante la captura")
    if await contar() != esperadas or (not fuente.grupo and total != esperadas):
        raise ValueError("Conteo filtrado cambió o descarga incompleta")
    if fuente.grupo and filas_agrupadas != esperadas:
        raise ValueError("El detalle agrupado no reconcilia con las filas de origen")
    ficha = ficha_metadata(fuente.dataset, inicial_bytes, [fuente.producto_id.removeprefix("local:")])
    return {
        "filas_origen_filtradas": esperadas,
        "filas_resultado": total,
        "corte_revision_rowsUpdatedAt": revision,
        "ficha_metadata": ficha,
        "alcance": "consulta_agregada" if fuente.grupo else "indicadores_o_mediciones_publicadas",
        "advertencia": "filas, cantidad reportada, personas y oferta no son métricas equivalentes",
        "agregacion_anual_derivada": [
            {"anio": a, "detalle": d, "cantidad_reportada": str(v)} for (a, d), v in sorted(anuales.items())
        ],
    }


async def _arcgis_json(http: CapturaHTTP, url: str, params: dict) -> dict:
    datos = _json(await http.get(url, params))
    if not isinstance(datos, dict) or datos.get("error"):
        raise ValueError("Error o estructura inesperada de ArcGIS")
    return datos


async def _irv(fuente: FuenteDescarga, http: CapturaHTTP, anios: tuple[int, ...]) -> dict:
    servicio = await _arcgis_json(http, fuente.url, {"f": "json"})
    capas = {}
    for capa in servicio.get("layers", []):
        if re.fullmatch(r"IRV\d{4}", capa.get("name", "")):
            anio = int(capa["name"][3:])
            if anio in capas:
                raise ValueError("Capas IRV ambiguas para el año")
            capas[anio] = capa["id"]
    consultados = []
    for anio in sorted(set(anios) & capas.keys()):
        datos = await _arcgis_json(
            http,
            f"{fuente.url}/{capas[anio]}/query",
            {
                "f": "json",
                "where": "MPIO_CCDGO='13001'",
                "returnGeometry": "false",
                "outFields": "MPIO_CCDGO,MPIO_CNMBR,IRV_NESTIMADO,IRV_CCLUSTER,IRV_CYEAR",
            },
        )
        filas = datos.get("features")
        if not isinstance(filas, list) or len(filas) != 1 or datos.get("exceededTransferLimit"):
            raise ValueError("IRV no devolvió exactamente una entidad municipal")
        atributos = filas[0].get("attributes", {})
        if str(atributos.get("MPIO_CCDGO")) != "13001" or str(atributos.get("IRV_CYEAR")) != str(anio):
            raise ValueError("IRV devolvió otro municipio o año")
        consultados.append(anio)
    if not consultados:
        raise ValueError("No hay capas IRV para los años solicitados")
    return {
        "anios_consultados": consultados,
        "anios_sin_capa": sorted(set(anios) - capas.keys()),
        "alcance": "indice_municipal_no_puntos_de_victimizacion",
        "revision_consistente_acreditada": False,
    }


async def _indemnizaciones(fuente: FuenteDescarga, http: CapturaHTTP) -> dict:
    await _arcgis_json(http, fuente.url, {"f": "json"})
    url = fuente.url + "/query"
    filtro = "MPIO_CCDGO='13001'"

    async def contar() -> int:
        datos = await _arcgis_json(http, url, {"f": "json", "where": filtro, "returnCountOnly": "true"})
        return _entero(datos["count"])

    esperadas = await contar()
    total, anios = 0, set()
    for pagina in range(MAX_PAGINAS):
        datos = await _arcgis_json(
            http,
            url,
            {
                "f": "json",
                "where": filtro,
                "returnGeometry": "false",
                "outFields": "MPIO_CCDGO,MPIO_CNMBR,VIGENCIA,GIROS,PERSONAS,VALOR",
                "orderByFields": "OBJECTID",
                "resultOffset": pagina * PAGINA,
                "resultRecordCount": PAGINA,
            },
        )
        filas = datos.get("features")
        if not isinstance(filas, list) or len(filas) > PAGINA:
            raise ValueError("Página ArcGIS inválida")
        for fila in filas:
            atributos = fila.get("attributes", {})
            if str(atributos.get("MPIO_CCDGO")) != "13001":
                raise ValueError("Otro municipio en indemnizaciones")
            anios.add(str(atributos.get("VIGENCIA")))
        total += len(filas)
        if not datos.get("exceededTransferLimit"):
            break
        if not filas:
            raise ValueError("ArcGIS anuncia más registros pero devuelve página vacía")
    else:
        raise ValueError("Captura ArcGIS excede el límite de páginas")
    if total != esperadas or await contar() != esperadas:
        raise ValueError("Conteo ArcGIS inconsistente")
    return {
        "filas_resultado": total,
        "vigencias_publicadas": sorted(anios),
        "revision_consistente_acreditada": False,
        "advertencia": "captura de capa general; cotejo por hecho/unidad/corte pendiente; no sumar con desagregadas",
    }


async def _ruv(fuente: FuenteDescarga, http: CapturaHTTP, fecha_revision: date) -> dict:
    cortes = _lista(_json(await http.get(fuente.url + "/api/ListaFechaCorte", {"idReporte": 5})))
    fechas = []
    for corte in cortes:
        fecha = datetime.strptime(corte["FECHA_CORTE_CORTA"], "%d/%m/%Y").date()
        if fecha <= fecha_revision:
            fechas.append(fecha)
    if not fechas:
        raise ValueError("No se encontró corte publicado anterior a la revisión")
    fecha = max(fechas)
    filas = _lista(
        _json(
            await http.get(
                fuente.url + "/api/Cifras/DatosAbiertos",
                {
                    "idReporte": 5,
                    "nivelTerritorial": 2,
                    "fechaReporte": fecha.strftime("%d/%m/%Y"),
                    "anio": 0,
                    "idDepartamento": "13",
                    "idMunicipio": "13001",
                    "idDireccionTerritorial": 0,
                },
            )
        )
    )
    if not filas:
        raise ValueError("Reporte RUV vacío")
    for fila in filas:
        if str(fila.get("COD_CIUDAD_MUNI")) != "13001" or str(fila.get("COD_ESTADO_DEPTO")) != "13":
            raise ValueError("El reporte RUV contiene otro territorio")
        if fecha.strftime("%d/%m/%Y") not in str(fila.get("FECHA_CORTE", "")):
            raise ValueError("El reporte RUV no corresponde al corte solicitado")
    return {
        "filas_resultado": len(filas),
        "corte_fuente": fecha.isoformat(),
        "revision_consistente_acreditada": False,
        "advertencia": "personas por ocurrencia, declaración y eventos son universos distintos; no sumar como únicos",
    }


async def _extraer(fuente: FuenteDescarga, http: CapturaHTTP, anios: tuple[int, ...], fecha: date) -> dict:
    if fuente.metodo == "socrata":
        return await _socrata(fuente, http)
    if fuente.metodo == "anexo":
        from app.modules.compromisos.descarga_anexos_oficiales_polis import validar_anexo_oficial

        contenido = await http.get(fuente.url)
        return validar_anexo_oficial(contenido, formato=fuente.formato, nombre_xlsx_esperado=fuente.nombre_xlsx)
    if fuente.metodo == "irv":
        return await _irv(fuente, http, anios)
    if fuente.metodo == "indemnizaciones":
        return await _indemnizaciones(fuente, http)
    if fuente.metodo == "ruv":
        return await _ruv(fuente, http, fecha)
    if fuente.metodo == "fiscalia_supervisada":
        from app.modules.compromisos.captura_fiscalia_supervisada_polis import capturar_fiscalia_supervisada

        return await capturar_fiscalia_supervisada(http.carpeta)
    raise ValueError("Método de descarga no registrado")


async def adquirir_fuentes(
    *,
    politica_id: str,
    productos: tuple[str, ...],
    anios: tuple[int, ...],
    fecha_revision: date,
    destino: Path,
    plan: dict | None = None,
) -> dict:
    """Descarga productos explícitos; solo permite evidencia nueva bajo bridge/."""
    registro = registro_descargas()
    if not politica_id.strip() or not productos or len(productos) != len(set(productos)):
        raise ValueError("Política y selección única de productos requeridas")
    if not anios or any(type(a) is not int or not 1900 <= a <= 2200 for a in anios):
        raise ValueError("Horizonte explícito con años válidos requerido")
    if desconocidos := set(productos) - registro.keys():
        raise ValueError(f"Productos sin adaptador autorizado: {sorted(desconocidos)}")
    if plan is not None:
        if plan.get("politica_id") != politica_id or plan.get("fecha_revision") != fecha_revision.isoformat():
            raise ValueError("El plan corresponde a otra política o fecha")
        if set(productos_desde_plan(plan)) != set(productos):
            raise ValueError("La selección no coincide con las adquisiciones previstas en el plan")
    destino = destino.resolve()
    if not destino.is_relative_to((RAIZ / "bridge").resolve()):
        raise ValueError("Este corredor solo escribe evidencia bajo bridge/")
    destino.mkdir(parents=True, exist_ok=True)
    run_id = str(uuid.uuid4())
    carpeta = destino / run_id
    carpeta.mkdir()
    especificaciones = [asdict(registro[p]) for p in sorted(productos)]
    manifiesto = {
        "esquema": "polis.adquisicion_fuentes_staging.v1",
        "run_id": run_id,
        "politica_id": politica_id,
        "territorio": "DIVIPOLA:13001",
        "anios_solicitados": sorted(set(anios)),
        "alcance_horizonte": "selecciona_capas_IRV;otros_productos_conservan_la_serie_o_edicion_publicada_completa",
        "fecha_revision": fecha_revision.isoformat(),
        "inicio_utc": datetime.now(UTC).isoformat(),
        "plan_sha256": plan["plan_sha256"] if plan is not None else None,
        "modo": "por_plan" if plan is not None else "captura_explicita_revisada",
        "configuracion_sha256": hashlib.sha256(json.dumps(especificaciones, sort_keys=True).encode()).hexdigest(),
        "estado": "iniciado",
        "promocion": "no_ejecutada",
        "estado_publicacion": "no_publicable",
        "carpeta": str(carpeta),
        "productos": [],
    }
    archivos_codigo = [
        Path(__file__),
        Path(__file__).with_name("registro_descargas_polis.py"),
        Path(__file__).with_name("descarga_anexos_oficiales_polis.py"),
        Path(__file__).with_name("captura_fiscalia_supervisada_polis.py"),
        RAIZ / "backend/scripts/capturar_fiscalia_supervisada.mjs",
    ]
    manifiesto["codigo_sha256"] = {
        str(p.relative_to(RAIZ)): hashlib.sha256(p.read_bytes()).hexdigest() for p in archivos_codigo
    }
    _escribir_json(carpeta / "solicitud.json", manifiesto)
    semaforo = asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=30, follow_redirects=False) as cliente:

        async def uno(clave: str) -> dict:
            fuente = registro[clave]
            sub = carpeta / clave.removeprefix("local:")
            sub.mkdir()
            http = CapturaHTTP(cliente, sub)
            resultado = {
                "producto_id": clave,
                "configuracion": asdict(fuente),
                "estado": "capturado_pendiente_validacion",
            }
            async with semaforo:
                try:
                    resultado["resultado"] = await _extraer(fuente, http, anios, fecha_revision)
                except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:
                    resultado.update(estado="cuarentena", error=type(exc).__name__, detalle=str(exc)[:300])
            resultado["respuestas"] = http.respuestas
            _escribir_json(sub / "captura.json", resultado)
            return resultado

        manifiesto["productos"] = await asyncio.gather(*(uno(clave) for clave in sorted(productos)))
    manifiesto["estado"] = (
        "captura_parcial"
        if any(p["estado"] == "cuarentena" for p in manifiesto["productos"])
        else "captura_completa_pendiente_validacion"
    )
    manifiesto["fin_utc"] = datetime.now(UTC).isoformat()
    _escribir_json(carpeta / "manifiesto.json", manifiesto)
    return manifiesto
