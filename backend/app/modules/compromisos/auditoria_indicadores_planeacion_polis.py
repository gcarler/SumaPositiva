"""Trazador documental determinista para metas sin indicador (OL-CODEX-01-R2).

Este módulo no abre sesiones SQL ni consulta servicios externos. Lee catálogos,
inventarios y documentos ya presentes en el repositorio; produce un registro por
meta sin acreditación, sin inferir indicadores ni sustituir su valor por el
nombre de la meta.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import unicodedata
from bisect import bisect_right
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

CAMPOS_LISTA = [
    "catalogo_sha256",
    "meta_id",
    "codigo_plan",
    "codigo_meta",
    "tipo_meta",
    "nombre_meta",
    "nodo_id",
    "linea_nombre",
    "documento_fuente",
    "fila_fuente",
    "estado_revision",
    "motivo",
]

ESQUEMA_INVENTARIO = "polis.inventario_fuentes.v1"
ESQUEMA_CATALOGO = "polis.catalogo_planeacion.v1"
ESQUEMA_SALIDA = "polis.trazador_indicadores_planeacion.v2"


class ErrorTrazadorIndicadores(ValueError):
    """Falla determinista de los insumos o del trazador documental."""


@dataclass(frozen=True)
class CatalogoCargado:
    ruta: str
    sha256: str
    datos: dict[str, Any]
    metas: dict[str, dict[str, Any]]


@dataclass(frozen=True)
class InventarioCargado:
    ruta: str
    sha256: str
    datos: dict[str, Any]
    archivos: list[dict[str, Any]]


@dataclass(frozen=True)
class ListaCargada:
    ruta: str
    sha256: str
    registros: list[dict[str, str]]


@dataclass(frozen=True)
class DocumentoResuelto:
    nombre: str
    candidatos: list[dict[str, Any]]
    validos: list[dict[str, Any]]
    estado_resolucion: str
    ruta_canonica: str | None
    sha256: str | None
    bytes: int | None


def normalizar_texto(valor: str) -> str:
    """Aplica NFC, casefold y colapso de espacios, sin alterar palabras o punct."""
    nfc = unicodedata.normalize("NFC", valor).casefold()
    return " ".join(nfc.split())


def _tokens(texto: str) -> list[tuple[int, int, str]]:
    registros: list[tuple[int, int, str]] = []
    for match in re.finditer(r"\S+", texto):
        registros.append(
            (
                match.start(),
                match.end(),
                unicodedata.normalize("NFC", match.group()).casefold(),
            )
        )
    return registros


def sha256_archivo(ruta: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(ruta).open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            digest.update(bloque)
    return digest.hexdigest()


def _leer_json(ruta: str | Path, sha_esperado: str | None = None) -> tuple[str, dict[str, Any]]:
    camino = Path(ruta)
    if not camino.is_file():
        raise ErrorTrazadorIndicadores(f"Archivo JSON ausente: {camino}")
    contenido = camino.read_bytes()
    sha = hashlib.sha256(contenido).hexdigest()
    if sha_esperado is not None and sha != sha_esperado:
        raise ErrorTrazadorIndicadores(f"SHA alterado en {camino}: {sha} != {sha_esperado}")
    try:
        datos = json.loads(contenido.decode("utf-8"))
    except UnicodeDecodeError as exc:
        raise ErrorTrazadorIndicadores(f"Archivo JSON no es UTF-8: {camino}") from exc
    return sha, datos


def _verificar_informe_inventario(inventario: dict[str, Any]) -> None:
    informe = inventario.get("validacion_inventario")
    if not isinstance(informe, dict):
        return
    if informe.get("estado") not in {"OK", "PROVISIONAL_OK"}:
        raise ErrorTrazadorIndicadores(f"Inventario no verificable: {informe.get('estado')}")


def cargar_catalogo(
    ruta: str | Path,
    sha_esperado: str | None = None,
    total_esperado: int | None = None,
) -> CatalogoCargado:
    """Lee y valida el catálogo inmutable de planeación."""
    camino = Path(ruta)
    if not camino.is_file():
        raise ErrorTrazadorIndicadores(f"Catálogo ausente: {camino}")
    sha, datos = _leer_json(camino, sha_esperado)
    if datos.get("esquema") != ESQUEMA_CATALOGO:
        raise ErrorTrazadorIndicadores("Esquema de catálogo no reconocido")
    metas = datos.get("metas")
    if not isinstance(metas, list):
        raise ErrorTrazadorIndicadores("Catálogo sin lista de metas")
    indice: dict[str, dict[str, Any]] = {}
    for meta in metas:
        if not isinstance(meta, dict) or not meta.get("id"):
            raise ErrorTrazadorIndicadores("Catálogo contiene meta sin id")
        if meta["id"] in indice:
            raise ErrorTrazadorIndicadores(f"ID duplicado en catálogo: {meta['id']}")
        indice[meta["id"]] = meta
    if total_esperado is not None and len(indice) != total_esperado:
        raise ErrorTrazadorIndicadores(f"Catálogo tiene {len(indice)} metas; esperado {total_esperado}")
    return CatalogoCargado(str(camino), sha, datos, indice)


def _validar_archivos_inventario(archivos: list[dict[str, Any]]) -> None:
    for archivo in archivos:
        if not isinstance(archivo, dict):
            raise ErrorTrazadorIndicadores("Inventario contiene archivo no tipado")
        if not isinstance(archivo.get("ruta"), str) or not archivo["ruta"]:
            raise ErrorTrazadorIndicadores("Inventario contiene ruta inválida")
        if not isinstance(archivo.get("sha256"), str) or not archivo["sha256"]:
            raise ErrorTrazadorIndicadores("Inventario contiene SHA inválido")
        if not isinstance(archivo.get("bytes"), int) or archivo["bytes"] < 0:
            raise ErrorTrazadorIndicadores("Inventario contiene bytes inválidos")


def cargar_inventario(ruta: str | Path, sha_esperado: str | None = None) -> InventarioCargado:
    """Lee y valida el inventario inmutable de archivos."""
    camino = Path(ruta)
    if not camino.is_file():
        raise ErrorTrazadorIndicadores(f"Inventario ausente: {camino}")
    sha, datos = _leer_json(camino, sha_esperado)
    if datos.get("esquema") != ESQUEMA_INVENTARIO:
        raise ErrorTrazadorIndicadores("Esquema de inventario no reconocido")
    _verificar_informe_inventario(datos)
    archivos = datos.get("archivos")
    if not isinstance(archivos, list):
        raise ErrorTrazadorIndicadores("Inventario sin lista de archivos")
    _validar_archivos_inventario(archivos)
    return InventarioCargado(str(camino), sha, datos, archivos)


def _metas_esperadas_sin_indicador(catalogo: CatalogoCargado) -> list[dict[str, Any]]:
    """Solo el campo principal ``indicador`` define la elegibilidad."""
    esperadas: list[dict[str, Any]] = []
    for meta in catalogo.metas.values():
        if str(meta.get("indicador") or "").strip():
            continue
        esperadas.append(meta)
    return esperadas


def _comparar_celda_cvs(observado: str, esperado: Any) -> bool:
    if esperado is None:
        return observado == ""
    return observado == str(esperado)


def cargar_lista(
    ruta: str | Path,
    sha_esperado: str | None = None,
    catalogo: CatalogoCargado | None = None,
) -> ListaCargada:
    """Lee y valida la lista de cotejo contra el catálogo."""
    camino = Path(ruta)
    if not camino.is_file():
        raise ErrorTrazadorIndicadores(f"Lista ausente: {camino}")
    contenido = camino.read_bytes()
    sha = hashlib.sha256(contenido).hexdigest()
    if sha_esperado is not None and sha != sha_esperado:
        raise ErrorTrazadorIndicadores(f"SHA alterado en {camino}: {sha} != {sha_esperado}")
    try:
        texto = contenido.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ErrorTrazadorIndicadores(f"Lista no es UTF-8: {camino}") from exc
    lineas = list(csv.reader(io.StringIO(texto, newline="")))
    if not lineas or lineas[0] != CAMPOS_LISTA:
        raise ErrorTrazadorIndicadores("Encabezado de lista no coincide")
    registros: list[dict[str, str]] = []
    for fila in lineas[1:]:
        if len(fila) != len(CAMPOS_LISTA):
            raise ErrorTrazadorIndicadores("Lista contiene fila incompleta o con columnas extra")
        registros.append(dict(zip(CAMPOS_LISTA, fila, strict=True)))
    if catalogo is None:
        return ListaCargada(str(camino), sha, registros)
    _validar_lista_contra_catalogo(registros, catalogo)
    return ListaCargada(str(camino), sha, registros)


def _validar_lista_contra_catalogo(registros: list[dict[str, str]], catalogo: CatalogoCargado) -> None:
    ids_vistos: set[str] = set()
    esperadas = _metas_esperadas_sin_indicador(catalogo)
    ids_esperados = {meta["id"] for meta in esperadas}
    for registro in registros:
        meta_id = registro["meta_id"]
        if meta_id in ids_vistos:
            raise ErrorTrazadorIndicadores(f"ID duplicado en lista: {meta_id}")
        ids_vistos.add(meta_id)
        if meta_id not in catalogo.metas:
            raise ErrorTrazadorIndicadores(f"ID ajeno al catálogo: {meta_id}")
        if meta_id not in ids_esperados:
            raise ErrorTrazadorIndicadores(f"Meta no elegible (indicador presente): {meta_id}")
        meta = catalogo.metas[meta_id]
        chequeos: dict[str, tuple[str, Any]] = {
            "catalogo_sha256": (registro["catalogo_sha256"], catalogo.sha256),
            "codigo_plan": (registro["codigo_plan"], meta.get("codigo_plan")),
            "codigo_meta": (registro["codigo_meta"], meta.get("codigo")),
            "tipo_meta": (registro["tipo_meta"], meta.get("tipo_meta")),
            "nombre_meta": (registro["nombre_meta"], meta.get("nombre")),
            "nodo_id": (registro["nodo_id"], meta.get("linea_id")),
            "linea_nombre": (registro["linea_nombre"], meta.get("linea_nombre")),
            "documento_fuente": (registro["documento_fuente"], meta.get("fuente")),
            "fila_fuente": (registro["fila_fuente"], meta.get("fila_fuente")),
        }
        for campo, (observado, esperado) in chequeos.items():
            if not _comparar_celda_cvs(observado, esperado):
                raise ErrorTrazadorIndicadores(f"Identidad alterada en {meta_id}: campo {campo}")
    if len(registros) != len(ids_esperados):
        raise ErrorTrazadorIndicadores(
            f"Lista tiene {len(registros)} filas; universo elegible tiene {len(ids_esperados)}"
        )
    if ids_esperados - ids_vistos:
        faltan = sorted(ids_esperados - ids_vistos)[:10]
        raise ErrorTrazadorIndicadores(f"Lista omite {len(ids_esperados - ids_vistos)} IDs: {faltan}")


def _normalizar_ruta_para_inventario(ruta: Path, raiz: Path | None) -> PurePosixPath:
    camino = Path(ruta)
    if raiz and camino.is_absolute():
        try:
            camino = camino.resolve().relative_to(Path(raiz).resolve())
        except (ValueError, OSError) as exc:
            raise ErrorTrazadorIndicadores(f"Ruta de catálogo fuera de la raíz: {ruta}") from exc
    return PurePosixPath(camino.as_posix())


def validar_catalogo_en_inventario(
    catalogo: CatalogoCargado,
    inventario: InventarioCargado,
    raiz_de_repositorio: Path | None = None,
) -> None:
    """Confirma que el catálogo usado esté registrado con el mismo SHA."""
    ruta = _normalizar_ruta_para_inventario(Path(catalogo.ruta), raiz_de_repositorio)
    en_inventario = [
        archivo
        for archivo in inventario.archivos
        if archivo.get("ruta") == ruta.as_posix() and archivo.get("sha256") == catalogo.sha256
    ]
    if len(en_inventario) != 1:
        raise ErrorTrazadorIndicadores(f"Catálogo no registrado en inventario: {ruta}")


def _ruta_segura(ruta_inventario: str, raiz_documentos: Path) -> Path:
    """Exige data/planes_desarrollo/ y resuelve symlinks contra esa subraíz."""
    p = PurePosixPath(ruta_inventario)
    if p.is_absolute() or ".." in p.parts or any(part in {"..", ""} for part in p.parts):
        raise ErrorTrazadorIndicadores(f"Ruta insegura en inventario: {ruta_inventario}")
    if len(p.parts) < 3 or p.parts[0] != "data" or p.parts[1] != "planes_desarrollo":
        raise ErrorTrazadorIndicadores(f"Ruta fuera de data/planes_desarrollo: {ruta_inventario}")
    raiz_resuelta = (Path(raiz_documentos) / "data" / "planes_desarrollo").resolve()
    camino = Path(raiz_documentos) / ruta_inventario
    camino_resuelto = camino.resolve()
    try:
        camino_resuelto.relative_to(raiz_resuelta)
    except ValueError as exc:
        raise ErrorTrazadorIndicadores(f"Ruta resuelve fuera de data/planes_desarrollo: {ruta_inventario}") from exc
    return camino_resuelto


def _entrada_archivo(archivo: dict[str, Any], camino: Path) -> tuple[bool, dict[str, Any]]:
    entrada = {
        "ruta": archivo["ruta"],
        "sha256_inventario": archivo["sha256"],
        "bytes_inventario": archivo.get("bytes"),
        "existe": camino.is_file(),
    }
    if not entrada["existe"]:
        entrada["sha256_real"] = None
        entrada["bytes_real"] = None
        return False, entrada
    contenido = camino.read_bytes()
    entrada["sha256_real"] = hashlib.sha256(contenido).hexdigest()
    entrada["bytes_real"] = len(contenido)
    entrada["coincide_sha"] = entrada["sha256_real"] == entrada["sha256_inventario"]
    return entrada["coincide_sha"], entrada


def resolver_documentos(
    documento_fuente: str,
    inventario: InventarioCargado,
    raiz_documentos: Path,
) -> DocumentoResuelto:
    """Resuelve el nombre exacto en data/planes_desarrollo sin elegir copias ambiguas."""
    nombre = unicodedata.normalize("NFKC", documento_fuente).casefold()
    candidatos: list[dict[str, Any]] = []
    for archivo in inventario.archivos:
        ruta_inventario = str(archivo.get("ruta") or "")
        nombre_archivo = PurePosixPath(ruta_inventario).name.casefold()
        if not nombre_archivo or nombre_archivo != nombre:
            continue
        camino = _ruta_segura(ruta_inventario, raiz_documentos)
        valido, entrada = _entrada_archivo(archivo, camino)
        entrada["valido"] = valido
        candidatos.append(entrada)
    validos = [c for c in candidatos if c.get("valido")]
    hashes = {c["sha256_real"] for c in validos}
    if not candidatos:
        estado, camino_canonico, sha_dominante, bytes_dominante = (
            "NO_LOCALIZADO",
            None,
            None,
            None,
        )
    elif not validos:
        estado, camino_canonico, sha_dominante, bytes_dominante = (
            "ARCHIVO_ALTERADO_O_INCOMPLETO",
            None,
            None,
            None,
        )
    elif len(validos) != len(candidatos) or len(hashes) != 1:
        estado, camino_canonico, sha_dominante, bytes_dominante = (
            "AMBIGUA",
            None,
            None,
            None,
        )
    elif len(validos) == 1:
        estado = "RESUELTO"
        camino_canonico = _ruta_canonica(validos)
        sha_dominante = validos[0]["sha256_real"]
        bytes_dominante = validos[0]["bytes_real"]
    else:
        estado = "RESUELTO_DUPLICADO_IDEMPOTENTE"
        camino_canonico = _ruta_canonica(validos)
        sha_dominante = validos[0]["sha256_real"]
        bytes_dominante = validos[0]["bytes_real"]
    return DocumentoResuelto(
        nombre=documento_fuente,
        candidatos=candidatos,
        validos=validos,
        estado_resolucion=estado,
        ruta_canonica=camino_canonico,
        sha256=sha_dominante,
        bytes=bytes_dominante,
    )


def _ruta_canonica(candidatos: list[dict[str, Any]]) -> str:
    return sorted(c["ruta"] for c in candidatos)[0]


def _candidato_publico(doc: DocumentoResuelto) -> dict[str, Any]:
    return {
        "estado_resolucion": doc.estado_resolucion,
        "ruta_canonica": doc.ruta_canonica,
        "sha256": doc.sha256,
        "bytes": doc.bytes,
        "validos": list(doc.validos),
        "candidatos": list(doc.candidatos),
    }


def leer_documento_verificado(documento: DocumentoResuelto, raiz_de_repositorio: Path) -> str | None:
    """Lee bytes una única vez después de resolver y confirma el SHA resuelto."""
    if documento.estado_resolucion not in {"RESUELTO", "RESUELTO_DUPLICADO_IDEMPOTENTE"}:
        return None
    if not documento.ruta_canonica or not documento.sha256:
        raise ErrorTrazadorIndicadores("Documento resuelto con ruta o SHA ausente")
    camino = _ruta_segura(documento.ruta_canonica, raiz_de_repositorio)
    contenido = camino.read_bytes()
    sha_real = hashlib.sha256(contenido).hexdigest()
    if sha_real != documento.sha256:
        raise ErrorTrazadorIndicadores(f"Documento cambió después de resolver: {documento.ruta_canonica}")
    try:
        return contenido.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ErrorTrazadorIndicadores(f"Documento resuelto no es UTF-8: {documento.ruta_canonica}") from exc


def _lineas_con_offsets(texto: str) -> list[tuple[int, int, int, str]]:
    lineas: list[tuple[int, int, int, str]] = []
    offset = 0
    for numero, linea in enumerate(texto.splitlines(keepends=True), 1):
        linea_sin_fin = linea.rstrip("\r\n")
        fin = offset + len(linea_sin_fin)
        lineas.append((numero, offset, fin, linea_sin_fin))
        offset += len(linea)
    return lineas


def _linea_por_offset(lineas: list[tuple[int, int, int, str]], offset: int) -> tuple[int, int, str]:
    inicios = [linea[1] for linea in lineas]
    indice = bisect_right(inicios, offset) - 1
    if indice < 0:
        raise ErrorTrazadorIndicadores("Offset fuera de rango")
    numero, inicio, _, texto_linea = lineas[indice]
    return numero, inicio, texto_linea


def _limite_original(token: str, posicion_norm: int) -> int | None:
    """Solo acepta límites que puedan reconstruirse sobre caracteres originales."""
    if posicion_norm == 0:
        return 0
    normalizado = normalizar_texto(token)
    if posicion_norm == len(normalizado):
        return len(token)
    if token.isascii():
        return posicion_norm
    # Solo los tokens de borde con Unicode y coincidencia parcial requieren
    # prefijos. El último límite incluye marcas combinantes que NFC compone.
    limites = [i for i in range(1, len(token) + 1) if len(normalizar_texto(token[:i])) == posicion_norm]
    return limites[-1] if limites else None


def buscar_coincidencias(nombre_meta: str, texto_documento: str, max_fragmento: int = 240) -> list[dict[str, Any]]:
    """Subcadena NFC/casefold literal, incluso junto a delimitadores Markdown."""
    if max_fragmento < 1:
        raise ErrorTrazadorIndicadores("El límite de fragmento debe ser positivo")
    consulta = normalizar_texto(nombre_meta)
    if not consulta:
        return []
    texto = texto_documento
    tokens = _tokens(texto)
    if not tokens:
        return []
    normalizado = " ".join(t[2] for t in tokens)
    inicios_norm: list[int] = []
    cursor = 0
    for _, _, token_norm in tokens:
        inicios_norm.append(cursor)
        cursor += len(token_norm) + 1
    lineas = _lineas_con_offsets(texto)
    resultados: list[dict[str, Any]] = []
    posicion = 0
    while (inicio_norm := normalizado.find(consulta, posicion)) >= 0:
        fin_norm = inicio_norm + len(consulta)
        posicion = fin_norm
        primero = bisect_right(inicios_norm, inicio_norm) - 1
        ultimo = bisect_right(inicios_norm, fin_norm - 1) - 1
        token_inicio = tokens[primero]
        token_fin = tokens[ultimo]
        borde_inicio = _limite_original(texto[token_inicio[0] : token_inicio[1]], inicio_norm - inicios_norm[primero])
        borde_fin = _limite_original(texto[token_fin[0] : token_fin[1]], fin_norm - inicios_norm[ultimo])
        if borde_inicio is None or borde_fin is None:
            continue
        inicio, fin = token_inicio[0] + borde_inicio, token_fin[0] + borde_fin
        if normalizar_texto(texto[inicio:fin]) != consulta:
            continue
        numero, offset_linea, _ = _linea_por_offset(lineas, inicio)
        numero_fin, offset_linea_fin, _ = _linea_por_offset(lineas, fin - 1)
        margen = max(0, (max_fragmento - (fin - inicio)) // 2)
        inicio_contexto = max(0, min(inicio - margen, len(texto) - max_fragmento))
        fin_contexto = min(len(texto), inicio_contexto + max_fragmento)
        contexto_original = texto[inicio_contexto:fin_contexto]
        fragmento_original = texto[inicio:fin]
        fragmento_recortado = len(fragmento_original) > max_fragmento
        if fragmento_recortado:
            fragmento_original = fragmento_original[:max_fragmento]
        resultados.append(
            {
                "linea_fisica_inicio": numero,
                "linea_fisica_fin": numero_fin,
                "offset_caracter_inicio": inicio,
                "offset_caracter_fin_excl": fin,
                "offset_caracteres_inicio": inicio,
                "offset_caracteres_fin_excl": fin,
                "offset_linea_caracter_inicio": inicio - offset_linea,
                "offset_linea_caracter_fin_excl": fin - offset_linea_fin,
                "columna_caracter_inicio": inicio - offset_linea + 1,
                "columna_caracter_fin_excl": fin - offset_linea_fin + 1,
                "longitud_coincidencia": fin - inicio,
                "fragmento_original": fragmento_original,
                "fragmento_recortado": fragmento_recortado,
                "contexto_original": contexto_original,
                "offset_contexto_inicio": inicio_contexto,
                "offset_contexto_fin_excl": fin_contexto,
                "contexto_recortado": inicio_contexto > 0 or fin_contexto < len(texto),
                "contexto_completo": inicio_contexto == 0 and fin_contexto == len(texto),
                "longitud_contexto": len(contexto_original),
                "tipo_coincidencia": "EXACTA_NORMALIZADA",
            }
        )
    return resultados


def _indicador_catalogo(meta: dict[str, Any]) -> dict[str, Any]:
    datos = meta.get("datos_oficiales") or {}
    llaves_genericas = [
        k for k in datos if isinstance(k, str) and "indic" in unicodedata.normalize("NFKC", k).casefold()
    ]
    return {
        "indicador": meta.get("indicador") or None,
        "indicador_principal_no_vacio": bool(str(meta.get("indicador") or "").strip()),
        "llaves_genericas_indic": llaves_genericas,
    }


def construir_registros(
    lista: ListaCargada,
    catalogo: CatalogoCargado,
    inventario: InventarioCargado,
    raiz_de_repositorio: Path | None = None,
) -> dict[str, Any]:
    """Construye un registro por meta con nulos preservados."""
    raiz = Path(raiz_de_repositorio or Path.cwd())
    cache_documentos: dict[str, DocumentoResuelto] = {}
    registros: list[dict[str, Any]] = []
    for registro in lista.registros:
        meta = catalogo.metas[registro["meta_id"]]
        doc_nombre = registro["documento_fuente"]
        if doc_nombre not in cache_documentos:
            cache_documentos[doc_nombre] = resolver_documentos(doc_nombre, inventario, raiz)
        doc = cache_documentos[doc_nombre]
        texto_documento = leer_documento_verificado(doc, raiz)
        coincidencias: list[dict[str, Any]] = []
        if texto_documento is not None:
            coincidencias = buscar_coincidencias(registro["nombre_meta"], texto_documento)
        if doc.estado_resolucion not in {"RESUELTO", "RESUELTO_DUPLICADO_IDEMPOTENTE"}:
            estado_coincidencia = "SIN_DOCUMENTO_RESUELTO"
        elif not coincidencias:
            estado_coincidencia = "SIN_COINCIDENCIA"
        elif len(coincidencias) == 1:
            estado_coincidencia = "COINCIDENCIA_UNICA"
        else:
            estado_coincidencia = "COINCIDENCIA_MULTIPLE"
        registros.append(
            {
                "meta_id": registro["meta_id"],
                "codigo_plan": registro["codigo_plan"],
                "codigo_meta": meta.get("codigo"),
                "tipo_meta": registro["tipo_meta"],
                "nombre_meta": registro["nombre_meta"],
                "nodo_id": meta.get("linea_id"),
                "linea_nombre": meta.get("linea_nombre"),
                "fila_fuente": meta.get("fila_fuente"),
                "estado_revision": registro["estado_revision"],
                "motivo": registro["motivo"],
                "fuente_solicitada": meta.get("fuente"),
                "documento": _candidato_publico(doc),
                "estado_coincidencia": estado_coincidencia,
                "coincidencias": coincidencias,
                "total_coincidencias": len(coincidencias),
                "indicador_catalogo": _indicador_catalogo(meta),
                "indicador": None,
                "estado_salida": "PENDIENTE_COTEJO_HUMANO",
                "nota": "Encontrar el nombre no acredita un indicador ni una equivalencia.",
            }
        )
    por_plan: dict[str, int] = {}
    por_estado_documento: dict[str, int] = {}
    por_estado_coincidencia: dict[str, int] = {}
    for registro in registros:
        por_plan[registro["codigo_plan"]] = por_plan.get(registro["codigo_plan"], 0) + 1
        estado_doc = registro["documento"]["estado_resolucion"]
        por_estado_documento[estado_doc] = por_estado_documento.get(estado_doc, 0) + 1
        estado_coin = registro["estado_coincidencia"]
        por_estado_coincidencia[estado_coin] = por_estado_coincidencia.get(estado_coin, 0) + 1
    return {
        "esquema_salida": ESQUEMA_SALIDA,
        "version_herramienta": "OL-CODEX-01-R2_CODEX",
        "metodo_busqueda": "SUBCADENA_LITERAL_NFC_CASEFOLD_ESPACIOS_CON_OFFSETS_ORIGINALES",
        "catalogo": {
            "ruta": catalogo.ruta,
            "sha256": catalogo.sha256,
            "total_metas": len(catalogo.metas),
        },
        "inventario": {
            "ruta": inventario.ruta,
            "sha256": inventario.sha256,
            "artefactos": len(inventario.archivos),
        },
        "lista": {
            "ruta": lista.ruta,
            "sha256": lista.sha256,
            "rows": len(lista.registros),
        },
        "resumen": {
            "total_registros": len(registros),
            "por_plan": dict(sorted(por_plan.items())),
            "por_estado_resolucion_documento": dict(sorted(por_estado_documento.items())),
            "por_estado_coincidencia": dict(sorted(por_estado_coincidencia.items())),
            "estado_salida": "PENDIENTE_COTEJO_HUMANO",
        },
        "registros": registros,
    }


def escribir_salidas(
    resultado: dict[str, Any],
    ruta_jsonl: str | Path,
    ruta_resumen: str | Path,
    *,
    rutas_entrada: tuple[Path, ...] = (),
) -> tuple[str, str]:
    """Escribe salida determinista, sin timestamps y sin mutar entradas."""
    camino_jsonl = Path(ruta_jsonl)
    camino_resumen = Path(ruta_resumen)
    if camino_jsonl.resolve() == camino_resumen.resolve():
        raise ErrorTrazadorIndicadores("Las salidas deben tener rutas distintas")
    entradas = {Path(resultado[clave]["ruta"]).resolve() for clave in ("catalogo", "inventario", "lista")} | {
        p.resolve() for p in rutas_entrada
    }
    if any(p.resolve() in entradas for p in (camino_jsonl, camino_resumen)):
        raise ErrorTrazadorIndicadores("Una salida no puede sobrescribir una entrada")
    contenido_jsonl = (
        "\n".join(
            json.dumps(registro, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            for registro in resultado["registros"]
        )
        + "\n"
    )
    resumen = {
        "esquema_salida": resultado["esquema_salida"],
        "catalogo": resultado["catalogo"],
        "inventario": resultado["inventario"],
        "lista": resultado["lista"],
        "resumen": resultado["resumen"],
    }
    contenido_resumen = json.dumps(resumen, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    caminos = [(camino_jsonl, contenido_jsonl.encode("utf-8")), (camino_resumen, contenido_resumen.encode("utf-8"))]
    for camino, contenido in caminos:
        if (camino.exists() or camino.is_symlink()) and not camino.is_file():
            raise ErrorTrazadorIndicadores(f"Salida existente no es un archivo regular: {camino}")
        if camino.is_file():
            existente = camino.read_bytes()
            if existente == contenido:
                continue
            raise ErrorTrazadorIndicadores(f"Salida ya existía con contenido distinto: {camino}")
    for camino, contenido in caminos:
        if camino.is_file():
            continue
        try:
            with camino.open("xb") as archivo:
                archivo.write(contenido)
        except FileExistsError:
            if camino.read_bytes() != contenido:
                raise ErrorTrazadorIndicadores(
                    f"Salida creada concurrentemente con contenido distinto: {camino}"
                ) from None
    return str(camino_jsonl), str(camino_resumen)


def ejecutar_trazador(
    ruta_lista: str | Path,
    ruta_catalogo: str | Path,
    sha_catalogo_esperado: str,
    ruta_inventario: str | Path,
    sha_inventario_esperado: str,
    raiz_de_repositorio: Path | None = None,
    ruta_jsonl: str | Path = "bridge/23_evidencia_codex_indicadores_v4.jsonl",
    ruta_resumen: str | Path = "bridge/23_resumen_codex_indicadores_v4.json",
) -> dict[str, Any]:
    """Ejecuta la cadena completa sobre insumos locales."""
    raiz = Path(raiz_de_repositorio or Path.cwd())
    catalogo = cargar_catalogo(ruta_catalogo, sha_catalogo_esperado, total_esperado=4637)
    inventario = cargar_inventario(ruta_inventario, sha_inventario_esperado)
    validar_catalogo_en_inventario(catalogo, inventario, raiz)
    lista = cargar_lista(ruta_lista, catalogo=catalogo)
    resultado = construir_registros(lista, catalogo, inventario, raiz_de_repositorio=raiz)
    if raiz_de_repositorio is not None:
        ruta_salida_jsonl = raiz / ruta_jsonl
        ruta_salida_resumen = raiz / ruta_resumen
    else:
        ruta_salida_jsonl = Path(ruta_jsonl)
        ruta_salida_resumen = Path(ruta_resumen)
    documentos = tuple(
        raiz / candidato["ruta"]
        for registro in resultado["registros"]
        for candidato in registro["documento"]["candidatos"]
    )
    escribir_salidas(resultado, ruta_salida_jsonl, ruta_salida_resumen, rutas_entrada=documentos)
    return resultado
