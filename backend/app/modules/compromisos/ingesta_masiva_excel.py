"""Binary ingestion of Cartagena action-plan workbooks and their bundled archives."""

from __future__ import annotations

import csv
import hashlib
import io
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

MAX_ARCHIVOS = 200
MAX_BYTES_ARCHIVO = 25 * 1024 * 1024
MAX_BYTES_ZIP = 150 * 1024 * 1024
MAX_FILAS = 250_000
EXTENSIONES = {".xlsx", ".xls", ".csv", ".zip"}
VERBOS_DEBILES_DNP = {
    "apropiar",
    "asegurar",
    "colaborar",
    "consolidar",
    "contribuir",
    "desarrollar",
    "integrar",
    "fomentar",
    "fortalecer",
    "garantizar",
    "implementar",
    "impulsar",
    "mejorar",
    "movilizar",
    "proponer",
    "gestionar",
    "promover",
}

SINONIMOS_COLUMNAS: dict[str, tuple[str, ...]] = {
    "entidad": (
        "dependencia responsable",
        "dependencia",
        "entidad responsable",
        "responsables",
        "responsable",
        "responsable s",
        "entidad",
        "secretaria",
        "organismo",
    ),
    "linea_estrategica": ("linea estrategica", "pilar", "eje estrategico", "dimension"),
    "codigo_meta_pdd": ("codigo meta pdd", "meta pdd", "codigo meta", "cod meta", "meta producto"),
    "codigo_bpim": (
        "codigo bpim",
        "codigo bpin",
        "codigo de proyecto bpim",
        "codigo de proyecto bpin",
        "bpim",
        "bpin",
        "codigo proyecto",
    ),
    "indicador": ("indicador", "nombre indicador", "indicador producto", "indicador resultado"),
    "descripcion_actividad": (
        "descripcion actividad",
        "acciones del proyecto",
        "actividad inicial",
        "actividades de proyecto de inversion viabilizadas en sui fp",
        "actividad",
        "accion",
        "nombre actividad",
    ),
    "proyecto_nombre": ("nombre proyecto", "proyecto de inversion", "proyecto"),
    "meta_programada_anual": (
        "meta programada anual",
        "meta anual",
        "meta programada",
        "programacion anual",
        "programado numerico meta producto",
    ),
    "meta_ejecutada_anual": (
        "meta ejecutada anual",
        "meta ejecutada",
        "ejecucion anual",
        "avance anual",
        "avance anual alcanzado respecto a la vigencia",
    ),
    "avance_t1": ("avance t1", "t1", "primer trimestre", "i trimestre", "trimestre 1"),
    "avance_t2": ("avance t2", "t2", "segundo trimestre", "ii trimestre", "trimestre 2"),
    "avance_t3": ("avance t3", "t3", "tercer trimestre", "iii trimestre", "trimestre 3"),
    "avance_t4": ("avance t4", "t4", "cuarto trimestre", "iv trimestre", "trimestre 4"),
    "avance_fisico_pct": ("avance fisico", "porcentaje avance", "% avance", "avance porcentual"),
    "avance_estrategico_pct": ("avance estrategico", "avance meta pdd", "avance pdd"),
    "apropiacion_inicial_cop": ("apropiacion inicial", "presupuesto inicial"),
    "apropiacion_definitiva_cop": (
        "apropiacion definitiva",
        "presupuesto apropiado",
        "presupuesto asignado",
        "apropiacion vigente",
    ),
    "cdp_cop": ("cdp", "certificado disponibilidad"),
    "compromisos_rp_cop": (
        "compromisos rp",
        "registro presupuestal",
        "rp acumulado",
        "comprometido",
    ),
    "obligaciones_cop": ("obligaciones", "obligado"),
    "pagos_tesoreria_cop": (
        "pagos tesoreria",
        "pagos",
        "ejecucion presupuestal",
        "presupuesto ejecutado",
    ),
    "fuente_financiacion": ("fuente financiacion", "fuente de financiacion", "fuente"),
}

DEPENDENCIAS = {
    "DADIS": "Departamento Administrativo Distrital de Salud",
    "SECRETARIA GENERAL": "Secretaría General",
    "SECRETARIA DE HACIENDA": "Secretaría de Hacienda",
    "SECRETARIA DE PLANEACION": "Secretaría de Planeación",
    "DATT": "Departamento Administrativo de Tránsito y Transporte",
    "EPA": "Establecimiento Público Ambiental",
    "IDER": "Instituto Distrital de Deporte y Recreación",
    "IPCC": "Instituto de Patrimonio y Cultura de Cartagena",
    "OAGR": "Oficina Asesora para la Gestión del Riesgo de Desastres",
    "OADGR": "Oficina Asesora para la Gestión del Riesgo de Desastres",
    "PES-PR": "Plan de Emergencia Social Pedro Romero",
    "SEHACIENDA": "Secretaría de Hacienda",
    "HACIENDA": "Secretaría de Hacienda",
    "SEPLANEACION": "Secretaría de Planeación",
    "PLANEACION": "Secretaría de Planeación",
    "SEC_EDUCACION": "Secretaría de Educación",
    "EDUCACION": "Secretaría de Educación",
    "SPDS-UMATA": "Secretaría de Participación y Desarrollo Social – UMATA",
    "UMATA": "Secretaría de Participación y Desarrollo Social – UMATA",
    "IDACCC": "Instituto de Acción Comunal y Capital Social de Cartagena",
    "UMAYOR": "Alcaldía Mayor de Cartagena",
    "SICC": "Secretaría de Infraestructura y Conectividad de Cartagena",
    "DISTRISEGURIDAD": "Distriseguridad",
    "INFRAESTRUCTURA": "Secretaría de Infraestructura",
    "CORVIVIENDA": "Corvivienda",
    "TRANSCARIBE": "Transcaribe",
}


def _normalizar(texto: Any) -> str:
    plano = unicodedata.normalize("NFKD", str(texto or "").lower())
    plano = "".join(c for c in plano if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", plano).strip()


def normalizar_entidad(valor: str | None, nombre_archivo: str = "") -> str | None:
    texto = _normalizar(valor or "")
    nombre = _normalizar(nombre_archivo)
    combinados = f"{texto} {nombre}"
    if "secretaria general" in combinados:
        return "Secretaría General"
    for sigla, canonica in DEPENDENCIAS.items():
        if _normalizar(sigla) in combinados:
            return canonica
    return (valor or "").strip() or None


def _numero(valor: Any) -> float | None:
    if valor is None or isinstance(valor, bool) or str(valor).strip() == "":
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    raw = str(valor).strip().replace("$", "").replace("%", "").replace(" ", "")
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    elif re.fullmatch(r"-?\d{1,3}(?:\.\d{3})+", raw):
        raw = raw.replace(".", "")
    try:
        return float(raw)
    except ValueError:
        return None


def _mapear(encabezados: list[str]) -> dict[str, int]:
    resultado: dict[str, int] = {}
    normalizados = [_normalizar(valor) for valor in encabezados]
    alias_normalizados = {
        campo: tuple(_normalizar(alias) for alias in alias)
        for campo, alias in SINONIMOS_COLUMNAS.items()
    }
    for campo, aliases in alias_normalizados.items():
        candidatos = [
            (len(alias), alias == header, -i, i)
            for i, header in enumerate(normalizados)
            for alias in aliases
            if header
            and (alias == header or alias in header)
            and not (
                campo in {"codigo_meta_pdd", "indicador"}
                and all(
                    part in header for part in ("componente impulsor", "programa", "meta producto")
                )
            )
            and not (campo == "linea_estrategica" and header.startswith("ponderador "))
        ]
        if candidatos:
            resultado[campo] = max(candidatos)[-1]
    return resultado


def buscar_fila_encabezado(filas: list[list[Any]]) -> tuple[int | None, dict[str, int], list[str]]:
    """Pick the densest semantic row among the first 25 non-empty rows."""
    candidatas: list[tuple[int, int, dict[str, int], list[str]]] = []
    vistos = 0
    for _row_index, fila in enumerate(filas):
        if not any(valor is not None and str(valor).strip() for valor in fila):
            continue
        vistos += 1
        headers = [str(valor).strip() if valor is not None else "" for valor in fila]
        mapeo = _mapear(headers)
        # Penalize duplicate aliases while still using semantic coverage as primary score.
        candidatas.append((len(mapeo), sum(bool(x) for x in headers), mapeo, headers))
        if vistos == 25:
            break
    if not candidatas:
        return None, {}, []
    # Require at least two recognized semantic columns to reject titles and letterheads.
    idx = max(range(len(candidatas)), key=lambda i: (candidatas[i][0], candidatas[i][1], -i))
    score, _, mapeo, headers = candidatas[idx]
    if score < 2:
        return None, {}, []
    row_index = [
        i for i, row in enumerate(filas) if any(v is not None and str(v).strip() for v in row)
    ][:25][idx]
    return row_index, mapeo, headers


def _vigencia(texto: str, defecto: int | None) -> int | None:
    match = re.search(r"(?:20)?(1[6-9]|2[0-7])", texto)
    year = int(match.group()) if match else defecto
    if year is not None and year < 100:
        year += 2000
    return year if year is not None and 2016 <= year <= 2027 else None


def _corte(texto: str, defecto: str | None) -> str:
    normal = _normalizar(texto)
    for numeral, romano, ordinal, nombre in (
        ("1", "i", "primer", "T1"),
        ("2", "ii", "segundo", "T2"),
        ("3", "iii", "tercer", "T3"),
        ("4", "iv", "cuarto", "T4"),
    ):
        if re.search(
            rf"(?:\b(?:t|trimestre)\s*{numeral}\b|\b{romano}\s*trimestre\b|{ordinal} trimestre)",
            normal,
        ):
            return nombre
    if "formulado" in normal or "formulada" in normal:
        return "FORMULADO"
    if any(x in normal for x in ("anual", "diciembre", "cierre")):
        return "ANUAL"
    if any(month in normal for month in ("enero", "febrero", "marzo")):
        return "T1"
    if any(month in normal for month in ("abril", "mayo", "junio")):
        return "T2"
    if any(month in normal for month in ("julio", "agosto", "septiembre")):
        return "T3"
    if any(month in normal for month in ("octubre", "noviembre", "diciembre")):
        return "T4"
    return (defecto or "ANUAL").upper()


def _clasificar(
    nombre_hoja: str,
    mapeo: dict[str, int],
    fila: dict[str, Any],
    nombre_archivo: str = "",
) -> list[str]:
    hoja = _normalizar(nombre_hoja)
    motores: list[str] = []
    has_meta = any(k in mapeo for k in ("codigo_meta_pdd", "indicador", "avance_estrategico_pct"))
    if has_meta and (
        "linea_estrategica" in mapeo or "codigo_meta_pdd" in mapeo or "indicador" in mapeo
    ):
        motores.append("PLAN_DESARROLLO")
    has_operacion = "descripcion_actividad" in mapeo or "meta_programada_anual" in mapeo
    is_pdd_matrix = "pdd" in _normalizar(nombre_archivo) and "matriz" in _normalizar(nombre_archivo)
    legacy_action_table = (
        "proyecto_nombre" in mapeo
        and not is_pdd_matrix
        and "ejecucion presupuestal" not in hoja
        and "poai" not in hoja
        and (
            "plan accion" in _normalizar(nombre_archivo)
            or _normalizar(nombre_archivo).startswith("pa ")
        )
        and "matriz seguimiento pdd" not in _normalizar(nombre_archivo)
    )
    action_sheet = any(
        x in hoja
        for x in (
            "plan accion",
            "seguimiento",
            "cartagena incluyente",
            "cartagena resiliente",
            "cartagena contingente",
        )
    )
    if (
        (has_operacion and not is_pdd_matrix)
        or legacy_action_table
        or (action_sheet and not is_pdd_matrix)
    ):
        motores.append("PLAN_ACCION")
    has_finanzas = any(
        k in mapeo
        for k in (
            "apropiacion_inicial_cop",
            "apropiacion_definitiva_cop",
            "cdp_cop",
            "compromisos_rp_cop",
            "pagos_tesoreria_cop",
        )
    )
    if has_finanzas or any(
        x in hoja for x in ("ejecucion presupuestal", "poai", "proyectos de inversion", "ficha ebi")
    ):
        motores.append("INVERSION_PRESUPUESTAL")
    return motores


def _es_pie_o_subtotal(fila: dict[str, Any]) -> bool:
    texto = _normalizar(" ".join(str(valor) for valor in fila.values() if valor is not None))
    return any(
        termino in texto
        for termino in (
            "total general",
            "subtotal",
            "elaborado por",
            "revisado por",
            "aprobado por",
            "firma responsable",
        )
    )


@dataclass(slots=True)
class HojaLeida:
    nombre: str
    encabezado: int
    mapeo: dict[str, str]
    filas: list[dict[str, Any]]
    clasificacion: list[str]


@dataclass(slots=True)
class ArchivoLeido:
    nombre: str
    extension: str
    sha256: str
    perfil: str
    confianza: float
    vigencia: int | None
    corte: str
    entidad: str | None
    hojas: list[HojaLeida]
    error: str | None = None


class IngestorBinarioTriada:
    def leer_lote(
        self,
        nombre: str,
        contenido: bytes,
        vigencia_defecto: int | None = None,
        corte_defecto: str | None = None,
    ) -> list[ArchivoLeido]:
        if len(contenido) > MAX_BYTES_ZIP:
            raise ValueError("El archivo supera el límite de 150 MiB.")
        if nombre.lower().endswith(".zip"):
            return self._leer_zip(nombre, contenido, vigencia_defecto, corte_defecto)
        return [self._leer_archivo(nombre, contenido, vigencia_defecto, corte_defecto)]

    def _leer_zip(
        self, nombre: str, raw: bytes, vigencia: int | None, corte: str | None
    ) -> list[ArchivoLeido]:
        resultado = []
        acumulado = 0
        with zipfile.ZipFile(io.BytesIO(raw)) as archivo_zip:
            miembros = [
                m
                for m in archivo_zip.infolist()
                if not m.is_dir()
                and PurePosixPath(m.filename).suffix.lower() in EXTENSIONES - {".zip"}
            ]
            if len(miembros) > MAX_ARCHIVOS:
                raise ValueError(f"El ZIP contiene más de {MAX_ARCHIVOS} archivos procesables.")
            for miembro in miembros:
                ruta = PurePosixPath(miembro.filename)
                if "__MACOSX" in ruta.parts or ruta.name.startswith(("~$", ".")):
                    continue
                acumulado += miembro.file_size
                if acumulado > MAX_BYTES_ZIP or miembro.file_size > MAX_BYTES_ARCHIVO:
                    raise ValueError("El ZIP excede los límites de tamaño descomprimido.")
                payload = archivo_zip.read(miembro)
                resultado.append(
                    self._leer_archivo(f"{nombre}!/{miembro.filename}", payload, vigencia, corte)
                )
        if not resultado:
            raise ValueError("El ZIP no contiene libros .xlsx, .xls o .csv válidos.")
        return resultado

    def _leer_archivo(
        self, nombre: str, raw: bytes, vigencia_defecto: int | None, corte_defecto: str | None
    ) -> ArchivoLeido:
        ext = PurePosixPath(nombre.split("!/")[-1]).suffix.lower().lstrip(".")
        if ext not in {"xlsx", "xls", "csv"}:
            raise ValueError(f"Formato no permitido: .{ext}")
        if len(raw) > MAX_BYTES_ARCHIVO:
            raise ValueError("El archivo supera el límite de 25 MiB.")
        hojas_crudas: list[tuple[str, list[list[Any]]]] = []
        if ext == "xlsx":
            from openpyxl import load_workbook

            with zipfile.ZipFile(io.BytesIO(raw)) as workbook_zip:
                miembros = workbook_zip.infolist()
                if (
                    len(miembros) > 20_000
                    or sum(item.file_size for item in miembros) > MAX_BYTES_ZIP
                ):
                    raise ValueError("El libro .xlsx supera los límites de expansión permitidos.")
            libro = load_workbook(io.BytesIO(raw), data_only=True, read_only=True)
            try:
                for sheet in libro.worksheets[:50]:
                    filas = [
                        list(row)
                        for row in sheet.iter_rows(
                            max_row=min(sheet.max_row, MAX_FILAS), values_only=True
                        )
                    ]
                    hojas_crudas.append((sheet.title, filas))
            finally:
                libro.close()
        elif ext == "xls":
            import xlrd

            libro = xlrd.open_workbook(file_contents=raw, on_demand=True)
            for sheet in libro.sheets()[:50]:
                filas = [sheet.row_values(i) for i in range(min(sheet.nrows, MAX_FILAS))]
                hojas_crudas.append((sheet.name, filas))
            libro.release_resources()
        else:
            texto = None
            for encoding in ("utf-8-sig", "utf-8", "latin-1"):
                try:
                    texto = raw.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            try:
                dialect = csv.Sniffer().sniff((texto or "")[:8192], delimiters=",;\t|\n")
            except csv.Error:
                sample = (texto or "")[:8192]
                dialect = csv.excel
                dialect.delimiter = max((",", ";", "\t", "|"), key=sample.count)
            hojas_crudas.append(("CSV", list(csv.reader(io.StringIO(texto or ""), dialect))))
        nombre_corto = nombre.split("!/")[-1]
        nombres_hojas = " ".join(sheet_name for sheet_name, _ in hojas_crudas)
        vigencia = _vigencia(nombre, vigencia_defecto) or _vigencia(nombres_hojas, vigencia_defecto)
        corte = _corte(nombre, corte_defecto)
        if corte == (corte_defecto or "ANUAL").upper() and corte_defecto is None:
            corte = _corte(nombres_hojas, None)
        entidad_archivo = normalizar_entidad(None, nombre_corto)
        hojas: list[HojaLeida] = []
        for sheet_name, rows in hojas_crudas:
            encabezado, mapping, headers = buscar_fila_encabezado(rows)
            if encabezado is None:
                continue
            nombres_canonicos = {campo: headers[pos] for campo, pos in mapping.items()}
            filas_normalizadas = []
            motors_seen: set[str] = set()
            for pos_fila, valores in enumerate(rows[encabezado + 1 :], start=encabezado + 2):
                if not any(v is not None and str(v).strip() for v in valores):
                    continue
                fila = {
                    campo: (valores[idx] if idx < len(valores) else None)
                    for campo, idx in mapping.items()
                }
                if _es_pie_o_subtotal(fila):
                    continue
                entidad = (
                    normalizar_entidad(str(fila.get("entidad") or "") or None, nombre_corto)
                    or entidad_archivo
                )
                descripcion = str(fila.get("descripcion_actividad") or "").strip()
                if not any(str(v).strip() for v in fila.values() if v is not None):
                    continue
                fila.update(
                    {
                        "entidad_normalizada": entidad,
                        "descripcion_actividad": descripcion or None,
                        "verbo_detectado": _normalizar(descripcion).split(" ", maxsplit=1)[0]
                        if descripcion
                        else None,
                        "hoja_origen": sheet_name,
                        "fila_origen_num": pos_fila,
                        "datos_origen": {
                            str(k): v
                            for k, v in zip(headers, valores, strict=False)
                            if k and v is not None
                        },
                    }
                )
                verbo = fila["verbo_detectado"]
                fila["verbo_fuerte_dnp"] = (
                    bool(
                        verbo
                        and verbo.endswith(("ar", "er", "ir"))
                        and verbo not in VERBOS_DEBILES_DNP
                    )
                    if verbo
                    else None
                )
                for key, value in list(fila.items()):
                    if key in SINONIMOS_COLUMNAS and key not in {
                        "entidad",
                        "linea_estrategica",
                        "codigo_meta_pdd",
                        "codigo_bpim",
                        "indicador",
                        "descripcion_actividad",
                        "proyecto_nombre",
                        "fuente_financiacion",
                    }:
                        fila[key] = _numero(value)
                for campo_pct in ("avance_fisico_pct", "avance_estrategico_pct"):
                    porcentaje = fila.get(campo_pct)
                    if porcentaje is None:
                        continue
                    header = _normalizar(nombres_canonicos.get(campo_pct, ""))
                    if 0 <= porcentaje <= 1 and any(
                        token in header for token in ("porcentaje", " pct", " percent")
                    ):
                        porcentaje *= 100
                    fila[campo_pct] = porcentaje if 0 <= porcentaje <= 100 else None
                if fila.get("avance_fisico_pct") is None:
                    trimestre = [fila.get(f"avance_t{i}") for i in range(1, 5)]
                    nums = [v for v in trimestre if v is not None]
                    fila["avance_fisico_pct"] = sum(nums) / len(nums) if nums else None
                motores = _clasificar(sheet_name, mapping, fila, nombre_corto)
                if not motores:
                    continue
                motors_seen.update(motores)
                for motor in motores:
                    filas_normalizadas.append({**fila, "motor_destino": motor})
            if filas_normalizadas:
                hojas.append(
                    HojaLeida(
                        sheet_name,
                        encabezado + 1,
                        nombres_canonicos,
                        filas_normalizadas,
                        sorted(motors_seen),
                    )
                )
        sample_names = " ".join(h.nombre.lower() for h in hojas)
        if not hojas:
            raise ValueError(
                "No se encontró una hoja con columnas semánticas y filas "
                "que alimentar a los motores."
            )
        nombre_normalizado = _normalizar(nombre_corto)
        if "ejecucion presupuestal" in sample_names or "poai" in nombre_normalizado:
            perfil = "EJECUCION_PRESUPUESTAL_HACIENDA"
        elif "pdd" in nombre_normalizado and "matriz" in nombre_normalizado:
            perfil = "MATRIZ_PDD_2024_2027"
        elif "canonico" in nombre_normalizado or "polis" in nombre_normalizado:
            perfil = "PA_CANONICO_DNP_POLIS"
        elif vigencia is not None and vigencia <= 2019:
            perfil = "PA_MONOHOJA_2016_2019"
        elif vigencia is not None and vigencia <= 2023:
            perfil = "PA_HIBRIDO_2020_2023"
        elif vigencia is not None and vigencia <= 2026:
            perfil = "PA_MULTIHOJA_2024_2026"
        else:
            perfil = "PA_CANONICO_DNP_POLIS"
        scores = [len(h.mapeo) for h in hojas]
        confianza = min(1.0, (sum(scores) / max(1, len(scores))) / 12)
        return ArchivoLeido(
            nombre_corto,
            ext,
            hashlib.sha256(raw).hexdigest(),
            perfil,
            confianza,
            vigencia,
            corte,
            entidad_archivo
            or next(
                (
                    f["entidad_normalizada"]
                    for h in hojas
                    for f in h.filas
                    if f.get("entidad_normalizada")
                ),
                None,
            ),
            hojas,
        )


def leer_archivo_desde_directorio(
    path: str, contenido: bytes, vigencia_defecto: int | None = None
) -> list[ArchivoLeido]:
    return IngestorBinarioTriada().leer_lote(path, contenido, vigencia_defecto)
