"""Transactional use cases for bulk Triada workbook ingestion and reporting."""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select

from app.core.transactions import transaction
from app.modules.compromisos.ingesta_masiva_excel import (
    ENTIDADES_CANONICAS_CARTAGENA,
    ArchivoLeido,
    IngestorBinarioTriada,
)
from app.modules.compromisos.models import (
    ArchivoPlanIngerido,
    LoteIngestaPlan,
    RegistroTriadaNormalizado,
)
from app.modules.compromisos.schemas import (
    ActividadOperativaTriada,
    EjecucionPresupuestalTriada,
    MetaEstrategicaTriada,
)
from app.modules.compromisos.taxonomia_seguridad import DIMENSIONES, PERIODOS, inferir_taxonomia
from app.modules.compromisos.triada_motores import cruzar_tres_lecturas

RAIZ_INGESTA = Path("/root/polis/data/planes_accion").resolve()
MOTORES = ("PLAN_DESARROLLO", "PLAN_ACCION", "INVERSION_PRESUPUESTAL")


def _json_safe(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _limpiar(valor: Any, max_length: int | None = None) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto[:max_length] if texto and max_length else texto or None


def _numero_no_negativo(valor: Any) -> float:
    try:
        return max(0.0, float(valor or 0))
    except (TypeError, ValueError):
        return 0.0


def _porcentaje(valor: Any) -> float:
    try:
        numero = float(valor or 0)
    except (TypeError, ValueError):
        return 0.0
    return numero if 0 <= numero <= 100 else 0.0


def _porcentaje_opcional(valor: Any) -> float | None:
    try:
        numero = float(valor) if valor is not None else None
    except (TypeError, ValueError):
        return None
    return numero if numero is not None and 0 <= numero <= 100 else None


async def _fusionar_etiquetas_archivo(
    session, archive: ArchivoPlanIngerido, incoming: dict[str, Any]
) -> None:
    metadata = dict(archive.metadatos or {})
    for key in ("rutas_drive", "drive_file_ids", "dimensiones_seguridad_humana"):
        metadata[key] = list(
            dict.fromkeys([*(metadata.get(key) or []), *(incoming.get(key) or [])])
        )
    archive.dimensiones_seguridad_humana = metadata["dimensiones_seguridad_humana"]
    archive.metadatos = {
        **metadata,
        **{
            key: value
            for key, value in incoming.items()
            if key not in {"rutas_drive", "drive_file_ids", "dimensiones_seguridad_humana"}
        },
    }
    rows = await session.scalars(
        select(RegistroTriadaNormalizado).where(RegistroTriadaNormalizado.archivo_id == archive.id)
    )
    for row in rows:
        row.dimensiones_seguridad_humana = archive.dimensiones_seguridad_humana
        data = dict(row.datos_origen or {})
        source = dict(data.get("_dimensiones_seguridad") or {})
        source["dimensiones_seguridad_humana"] = archive.dimensiones_seguridad_humana
        for key in ("rutas_drive", "drive_file_ids"):
            source[key] = list(
                dict.fromkeys([*(source.get(key) or []), *(metadata.get(key) or [])])
            )
        data["_dimensiones_seguridad"] = source
        row.datos_origen = data


def _datos_registro(
    archivo: ArchivoLeido, fila: dict[str, Any], lote_id: uuid.UUID, archivo_id: uuid.UUID
) -> RegistroTriadaNormalizado:
    descripcion = _limpiar(fila.get("descripcion_actividad"))
    palabras = (descripcion or "").split(maxsplit=1)
    primera = palabras[0].strip(".,:;()[]{}") if palabras else ""
    verbo = (fila.get("verbo_detectado") or (primera.lower() if primera else None) or "")[:50]
    return RegistroTriadaNormalizado(
        archivo_id=archivo_id,
        lote_id=lote_id,
        motor_destino=fila["motor_destino"],
        vigencia=archivo.vigencia,
        corte_periodo=archivo.corte,
        entidad_normalizada=_limpiar(fila.get("entidad_normalizada"), 180)
        or _limpiar(archivo.entidad, 180),
        linea_estrategica=_limpiar(fila.get("linea_estrategica")),
        codigo_meta_pdd=_limpiar(fila.get("codigo_meta_pdd")),
        codigo_bpim=_limpiar(fila.get("codigo_bpim"), 100),
        indicador=_limpiar(fila.get("indicador")),
        descripcion_actividad=descripcion,
        verbo_fuerte_dnp=fila.get("verbo_fuerte_dnp"),
        verbo_detectado=verbo,
        meta_programada_anual=fila.get("meta_programada_anual"),
        meta_ejecutada_anual=fila.get("meta_ejecutada_anual"),
        avance_t1=_porcentaje_opcional(fila.get("avance_t1")),
        avance_t2=_porcentaje_opcional(fila.get("avance_t2")),
        avance_t3=_porcentaje_opcional(fila.get("avance_t3")),
        avance_t4=_porcentaje_opcional(fila.get("avance_t4")),
        avance_fisico_pct=_porcentaje_opcional(fila.get("avance_fisico_pct")),
        avance_estrategico_pct=_porcentaje_opcional(fila.get("avance_estrategico_pct")),
        apropiacion_definitiva_cop=fila.get("apropiacion_definitiva_cop")
        or fila.get("apropiacion_inicial_cop"),
        cdp_cop=fila.get("cdp_cop"),
        compromisos_rp_cop=fila.get("compromisos_rp_cop"),
        obligaciones_cop=fila.get("obligaciones_cop"),
        pagos_tesoreria_cop=fila.get("pagos_tesoreria_cop"),
        hoja_origen=fila.get("hoja_origen"),
        fila_origen_num=fila.get("fila_origen_num"),
        datos_origen=_json_safe(
            {
                **(fila.get("datos_origen") or {}),
                "_dimensiones_seguridad": archivo.metadatos_fuente or {},
            }
        ),
        dimensiones_seguridad_humana=(archivo.metadatos_fuente or {}).get(
            "dimensiones_seguridad_humana", []
        ),
        periodo_gobierno=(archivo.metadatos_fuente or {}).get("periodo_gobierno"),
    )


def _registro_dict(row: RegistroTriadaNormalizado) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "motor": row.motor_destino,
        "vigencia": row.vigencia,
        "corte_periodo": row.corte_periodo,
        "dimensiones_seguridad_humana": row.dimensiones_seguridad_humana,
        "periodo_gobierno": row.periodo_gobierno,
        "entidad": row.entidad_normalizada,
        "linea_estrategica": row.linea_estrategica,
        "codigo_meta_pdd": row.codigo_meta_pdd,
        "codigo_bpim": row.codigo_bpim,
        "indicador": row.indicador,
        "descripcion_actividad": row.descripcion_actividad,
        "verbo_fuerte_dnp": row.verbo_fuerte_dnp,
        "verbo_detectado": row.verbo_detectado,
        "meta_programada_anual": float(row.meta_programada_anual)
        if row.meta_programada_anual is not None
        else None,
        "meta_ejecutada_anual": float(row.meta_ejecutada_anual)
        if row.meta_ejecutada_anual is not None
        else None,
        "avance_t1": float(row.avance_t1) if row.avance_t1 is not None else None,
        "avance_t2": float(row.avance_t2) if row.avance_t2 is not None else None,
        "avance_t3": float(row.avance_t3) if row.avance_t3 is not None else None,
        "avance_t4": float(row.avance_t4) if row.avance_t4 is not None else None,
        "avance_fisico_pct": float(row.avance_fisico_pct)
        if row.avance_fisico_pct is not None
        else None,
        "avance_estrategico_pct": float(row.avance_estrategico_pct)
        if row.avance_estrategico_pct is not None
        else None,
        "apropiacion_definitiva_cop": float(row.apropiacion_definitiva_cop)
        if row.apropiacion_definitiva_cop is not None
        else None,
        "cdp_cop": float(row.cdp_cop) if row.cdp_cop is not None else None,
        "compromisos_rp_cop": float(row.compromisos_rp_cop)
        if row.compromisos_rp_cop is not None
        else None,
        "obligaciones_cop": float(row.obligaciones_cop)
        if row.obligaciones_cop is not None
        else None,
        "pagos_tesoreria_cop": float(row.pagos_tesoreria_cop)
        if row.pagos_tesoreria_cop is not None
        else None,
        "hoja_origen": row.hoja_origen,
        "fila_origen_num": row.fila_origen_num,
    }


class IngestaMasivaService:
    def __init__(self, session):
        self.session = session
        self.ingestor = IngestorBinarioTriada()

    async def ingerir(
        self,
        archivos: list[tuple[str, bytes]],
        *,
        origen: str,
        vigencia: int | None = None,
        corte: str | None = None,
        persistir: bool = True,
        metadatos_por_archivo: dict[str, dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        if not archivos:
            raise HTTPException(
                status_code=422, detail="Debe adjuntar al menos un archivo soportado."
            )
        leidos: list[ArchivoLeido] = []
        errores = []
        for nombre, raw in archivos:
            try:
                metadatos = (metadatos_por_archivo or {}).get(nombre) or inferir_taxonomia(
                    nombre.rsplit("!/", 1)[0], nombre.rsplit("!/", 1)[-1]
                )
                leidos.extend(self.ingestor.leer_lote(nombre, raw, vigencia, corte, metadatos))
            except Exception as exc:
                errores.append({"nombre_archivo": nombre, "error": str(exc)[:500]})
        if not leidos and not errores:
            raise HTTPException(status_code=422, detail="No se procesaron archivos compatibles.")
        codigo = f"TRIADA-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
        counts: Counter[str] = Counter()
        total_rows = sum(len(sheet.filas) for book in leidos for sheet in book.hojas)
        total_sheets = sum(len(book.hojas) for book in leidos)
        persistidos = 0
        deduplicados = []
        lote = LoteIngestaPlan(
            codigo_lote=codigo,
            origen=origen,
            total_archivos=len(leidos) + len(errores),
            archivos_exitosos=len(leidos),
            archivos_con_error=len(errores),
            total_hojas_procesadas=total_sheets,
            total_registros_normalizados=total_rows,
            resumen_motores={},
        )
        registros_cruce = [fila for book in leidos for hoja in book.hojas for fila in hoja.filas]
        cross = self._cruzar_filas(registros_cruce)
        if persistir:
            async with transaction(self.session):
                self.session.add(lote)
                await self.session.flush()
                for book in leidos:
                    meta_book = dict(book.metadatos_fuente or {})
                    huella = meta_book.get("huella_tabular_sha256")
                    existente = await self.session.scalar(
                        select(ArchivoPlanIngerido)
                        .where(ArchivoPlanIngerido.hash_sha256 == book.sha256)
                        .order_by(ArchivoPlanIngerido.creado_en.desc())
                        .limit(1)
                    )
                    clon_mismo_corte = None
                    clon_otro_corte = None
                    if not existente and huella and book.entidad and book.vigencia is not None:
                        candidatos = list(
                            (
                                await self.session.scalars(
                                    select(ArchivoPlanIngerido).where(
                                        ArchivoPlanIngerido.entidad_normalizada == book.entidad,
                                    )
                                )
                            ).all()
                        )
                        for candidato in candidatos:
                            if (candidato.metadatos or {}).get("huella_tabular_sha256") != huella:
                                continue
                            if (
                                candidato.vigencia == book.vigencia
                                and candidato.corte_periodo == book.corte
                            ):
                                clon_mismo_corte = candidato
                                break
                            clon_otro_corte = clon_otro_corte or candidato
                    if existente:
                        await _fusionar_etiquetas_archivo(self.session, existente, meta_book)
                        deduplicados.append(
                            {
                                "nombre_archivo": book.nombre,
                                "archivo_id": str(existente.id),
                                "lote_original": str(existente.lote_id),
                            }
                        )
                        self.session.add(
                            ArchivoPlanIngerido(
                                lote_id=lote.id,
                                nombre_archivo=book.nombre,
                                formato_extension=book.extension,
                                hash_sha256=book.sha256,
                                perfil_detectado=book.perfil,
                                confianza_deteccion=book.confianza,
                                vigencia=book.vigencia,
                                corte_periodo=book.corte,
                                entidad_normalizada=_limpiar(book.entidad, 180),
                                hojas_analizadas=[],
                                mapeo_columnas={},
                                filas_extraidas=0,
                                metadatos={
                                    "deduplicado": True,
                                    "archivo_original_id": str(existente.id),
                                    "lote_original_id": str(existente.lote_id),
                                    **(book.metadatos_fuente or {}),
                                },
                                dimensiones_seguridad_humana=(book.metadatos_fuente or {}).get(
                                    "dimensiones_seguridad_humana", []
                                ),
                                periodo_gobierno=(book.metadatos_fuente or {}).get(
                                    "periodo_gobierno"
                                ),
                            )
                        )
                        continue
                    if clon_mismo_corte:
                        await _fusionar_etiquetas_archivo(self.session, clon_mismo_corte, meta_book)
                        clone_info = {
                            "hash_sha256": book.sha256,
                            "nombre_archivo": book.nombre,
                            "lote_id": str(lote.id),
                        }
                        canonical_meta = dict(clon_mismo_corte.metadatos or {})
                        clones = canonical_meta.setdefault("clones_tabulares_fusionados", [])
                        if clone_info not in clones:
                            clones.append(clone_info)
                        clon_mismo_corte.metadatos = canonical_meta
                        self.session.add(
                            ArchivoPlanIngerido(
                                lote_id=lote.id,
                                nombre_archivo=book.nombre,
                                formato_extension=book.extension,
                                hash_sha256=book.sha256,
                                perfil_detectado=book.perfil,
                                confianza_deteccion=book.confianza,
                                vigencia=book.vigencia,
                                corte_periodo=book.corte,
                                entidad_normalizada=book.entidad,
                                hojas_analizadas=[],
                                mapeo_columnas={},
                                filas_extraidas=0,
                                metadatos={
                                    **meta_book,
                                    "deduplicado_tabular": True,
                                    "archivo_canonico_id": str(clon_mismo_corte.id),
                                },
                                dimensiones_seguridad_humana=meta_book.get(
                                    "dimensiones_seguridad_humana", []
                                ),
                                periodo_gobierno=meta_book.get("periodo_gobierno"),
                            )
                        )
                        deduplicados.append(
                            {
                                "nombre_archivo": book.nombre,
                                "archivo_id": str(clon_mismo_corte.id),
                                "huella_tabular_sha256": huella,
                                "tipo": "CLON_TABULAR_MISMO_CORTE",
                            }
                        )
                        continue
                    if clon_otro_corte:
                        meta_otro = dict(clon_otro_corte.metadatos or {})
                        meta_otro["cortes_con_mismo_contenido"] = list(
                            dict.fromkeys(
                                [*(meta_otro.get("cortes_con_mismo_contenido") or []), book.corte]
                            )
                        )
                        clon_otro_corte.metadatos = meta_otro
                        meta_book["alerta_calidad"] = "CONTENIDO_IDENTICO_OTRO_CORTE"
                        meta_book["corte_clonado_de"] = {
                            "archivo_id": str(clon_otro_corte.id),
                            "corte_periodo": clon_otro_corte.corte_periodo,
                        }
                    motores_book: Counter[str] = Counter()
                    mapeos = {hoja.nombre: hoja.mapeo for hoja in book.hojas}
                    metadata_hojas = []
                    for hoja in book.hojas:
                        metadata_hojas.append(
                            {
                                "nombre": hoja.nombre,
                                "fila_encabezado": hoja.encabezado,
                                "motores": hoja.clasificacion,
                                "filas": len(hoja.filas),
                            }
                        )
                        motores_book.update(hoja.clasificacion)
                    dbfile = ArchivoPlanIngerido(
                        lote_id=lote.id,
                        nombre_archivo=book.nombre,
                        formato_extension=book.extension,
                        hash_sha256=book.sha256,
                        perfil_detectado=book.perfil,
                        confianza_deteccion=book.confianza,
                        vigencia=book.vigencia,
                        corte_periodo=book.corte,
                        entidad_normalizada=_limpiar(book.entidad, 180),
                        hojas_analizadas=metadata_hojas,
                        mapeo_columnas=mapeos,
                        filas_extraidas=sum(len(sheet.filas) for sheet in book.hojas),
                        metadatos={
                            "clasificacion_motores": dict(motores_book),
                            **meta_book,
                        },
                        dimensiones_seguridad_humana=(book.metadatos_fuente or {}).get(
                            "dimensiones_seguridad_humana", []
                        ),
                        periodo_gobierno=(book.metadatos_fuente or {}).get("periodo_gobierno"),
                    )
                    self.session.add(dbfile)
                    await self.session.flush()
                    for hoja in book.hojas:
                        for fila in hoja.filas:
                            self.session.add(_datos_registro(book, fila, lote.id, dbfile.id))
                            counts[fila["motor_destino"]] += 1
                    persistidos += 1
                lote.resumen_motores = {motor: counts[motor] for motor in MOTORES}
                lote.total_registros_normalizados = sum(counts.values())
                await self.session.flush()
        else:
            for book in leidos:
                for hoja in book.hojas:
                    for fila in hoja.filas:
                        counts[fila["motor_destino"]] += 1
        serie: dict[str, dict[str, int]] = {}
        for book in leidos:
            if book.vigencia:
                year = serie.setdefault(str(book.vigencia), {m: 0 for m in MOTORES})
                for sheet in book.hojas:
                    for row in sheet.filas:
                        year[row["motor_destino"]] += 1
        return {
            "codigo_lote": codigo,
            "origen": origen,
            "persistido": persistir,
            "archivos_procesados": len(leidos),
            "archivos_persistidos": persistidos,
            "archivos_con_error": errores,
            "archivos_deduplicados": deduplicados,
            "hojas_clasificadas": [
                {
                    "archivo": b.nombre,
                    "hojas": [
                        {
                            "nombre": h.nombre,
                            "fila_encabezado": h.encabezado,
                            "motores": h.clasificacion,
                            "registros": len(h.filas),
                        }
                        for h in b.hojas
                    ],
                }
                for b in leidos
            ],
            "conteo_registros_motor": {motor: counts[motor] for motor in MOTORES},
            "comparativa_interanual_2016_2026": serie,
            "cruce_tres_lecturas": cross,
            "resumen": {
                "archivos": len(leidos) + len(errores),
                "hojas": total_sheets,
                "registros": total_rows,
                "archivos_duplicados": len(deduplicados),
            },
        }

    @staticmethod
    def _cruzar_filas(filas: list[dict[str, Any]]) -> dict[str, Any]:
        metas, actividades, ejecuciones = [], [], []
        for row in filas:
            motor = row.get("motor_destino")
            base = {
                "entidad": row.get("entidad_normalizada") or "",
                "linea_estrategica": str(row.get("linea_estrategica") or ""),
                "codigo_bpim": str(row.get("codigo_bpim") or ""),
            }
            if motor == "PLAN_DESARROLLO":
                metas.append(
                    MetaEstrategicaTriada(
                        **base,
                        codigo_meta_pdd=str(row.get("codigo_meta_pdd") or ""),
                        indicador=str(row.get("indicador") or ""),
                        avance_estrategico_pct=_porcentaje(
                            row.get("avance_estrategico_pct") or row.get("avance_fisico_pct")
                        ),
                    )
                )
            elif motor == "PLAN_ACCION":
                actividades.append(
                    ActividadOperativaTriada(
                        **base,
                        codigo_meta_pdd=str(row.get("codigo_meta_pdd") or ""),
                        descripcion_actividad=str(row.get("descripcion_actividad") or ""),
                        avance_operativo_fisico_pct=_porcentaje(row.get("avance_fisico_pct")),
                        formato_origen="INGESTA_BINARIA",
                        porcentaje_verbos_fuertes_dnp=100 if row.get("verbo_fuerte_dnp") else 0,
                    )
                )
            elif motor == "INVERSION_PRESUPUESTAL":
                ejecuciones.append(
                    EjecucionPresupuestalTriada(
                        **base,
                        fuente=str(row.get("fuente_financiacion") or "RECURSOS_PROPIOS"),
                        apropiacion_definitiva_cop=_numero_no_negativo(
                            row.get("apropiacion_definitiva_cop")
                            or row.get("apropiacion_inicial_cop")
                        ),
                        cdp_acumulado_cop=_numero_no_negativo(row.get("cdp_cop")),
                        compromisos_rp_cop=_numero_no_negativo(row.get("compromisos_rp_cop")),
                        obligaciones_cop=_numero_no_negativo(row.get("obligaciones_cop")),
                        pagos_tesoreria_cop=_numero_no_negativo(row.get("pagos_tesoreria_cop")),
                    )
                )
        return cruzar_tres_lecturas(metas, actividades, ejecuciones)

    async def listar_lotes(
        self,
        limite: int = 50,
        vigencia: int | None = None,
        entidad: str | None = None,
        dimension: str | None = None,
        periodo: str | None = None,
    ) -> dict[str, Any]:
        archivo_stmt = select(ArchivoPlanIngerido)
        if vigencia:
            archivo_stmt = archivo_stmt.where(ArchivoPlanIngerido.vigencia == vigencia)
        if entidad:
            archivo_stmt = archivo_stmt.where(
                ArchivoPlanIngerido.entidad_normalizada.ilike(f"%{entidad}%")
            )
        if dimension:
            archivo_stmt = archivo_stmt.where(
                ArchivoPlanIngerido.dimensiones_seguridad_humana.contains([dimension])
            )
        if periodo:
            archivo_stmt = archivo_stmt.where(ArchivoPlanIngerido.periodo_gobierno == periodo)
        archivos = list(
            (
                await self.session.scalars(
                    archivo_stmt.order_by(ArchivoPlanIngerido.creado_en.desc()).limit(2000)
                )
            ).all()
        )
        lote_ids = {archivo.lote_id for archivo in archivos}
        stmt = select(LoteIngestaPlan).order_by(LoteIngestaPlan.creado_en.desc())
        if dimension or periodo:
            stmt = stmt.where(LoteIngestaPlan.id.in_(lote_ids)) if lote_ids else stmt.where(False)
        lotes = list((await self.session.scalars(stmt.limit(limite))).all())
        return {
            "lotes": [
                {
                    "id": str(x.id),
                    "codigo_lote": x.codigo_lote,
                    "origen": x.origen,
                    "total_archivos": x.total_archivos,
                    "archivos_exitosos": x.archivos_exitosos,
                    "archivos_con_error": x.archivos_con_error,
                    "total_hojas_procesadas": x.total_hojas_procesadas,
                    "total_registros_normalizados": x.total_registros_normalizados,
                    "resumen_motores": x.resumen_motores,
                    "creado_en": x.creado_en,
                }
                for x in lotes
            ],
            "archivos": [
                {
                    "nombre_archivo": x.nombre_archivo,
                    "formato": x.formato_extension,
                    "perfil": x.perfil_detectado,
                    "vigencia": x.vigencia,
                    "corte": x.corte_periodo,
                    "entidad": x.entidad_normalizada,
                    "filas": x.filas_extraidas,
                    "hojas": x.hojas_analizadas,
                    "dimensiones_seguridad_humana": x.dimensiones_seguridad_humana,
                    "periodo_gobierno": x.periodo_gobierno,
                }
                for x in archivos
            ],
            "cobertura_motores": await self._conteo_motores(
                vigencia=vigencia, entidad=entidad, dimension=dimension, periodo=periodo
            ),
            "filtros": {
                "vigencia": vigencia,
                "entidad": entidad,
                "dimension": dimension,
                "periodo": periodo,
            },
        }

    async def comparativa(
        self,
        *,
        entidad: str | None = None,
        linea: str | None = None,
        bpim: str | None = None,
        motor: str | None = None,
        desde: int = 2016,
        hasta: int = 2026,
        dimension: str | None = None,
        periodo: str | None = None,
        corte: str | None = None,
    ) -> dict[str, Any]:
        filtros_sql = [RegistroTriadaNormalizado.vigencia.between(desde, hasta)]
        if entidad:
            filtros_sql.append(RegistroTriadaNormalizado.entidad_normalizada.ilike(f"%{entidad}%"))
        if linea:
            filtros_sql.append(RegistroTriadaNormalizado.linea_estrategica.ilike(f"%{linea}%"))
        if bpim:
            filtros_sql.append(RegistroTriadaNormalizado.codigo_bpim == bpim)
        if motor:
            filtros_sql.append(RegistroTriadaNormalizado.motor_destino == motor.upper())
        if dimension:
            filtros_sql.append(
                RegistroTriadaNormalizado.dimensiones_seguridad_humana.contains([dimension])
            )
        if periodo:
            filtros_sql.append(RegistroTriadaNormalizado.periodo_gobierno == periodo)
        if corte:
            filtros_sql.append(RegistroTriadaNormalizado.corte_periodo == corte.upper())
        else:
            filtros_sql.append(
                RegistroTriadaNormalizado.archivo_id.not_in(
                    select(ArchivoPlanIngerido.id).where(
                        ArchivoPlanIngerido.metadatos["alerta_calidad"].astext
                        == "CONTENIDO_IDENTICO_OTRO_CORTE"
                    )
                )
            )
        total_registros = await self.session.scalar(
            select(func.count()).select_from(RegistroTriadaNormalizado).where(*filtros_sql)
        )
        serie_result = await self.session.execute(
            select(
                RegistroTriadaNormalizado.vigencia,
                RegistroTriadaNormalizado.motor_destino,
                func.count(),
            )
            .where(*filtros_sql)
            .group_by(
                RegistroTriadaNormalizado.vigencia,
                RegistroTriadaNormalizado.motor_destino,
            )
        )
        by_year: dict[str, dict[str, int]] = {}
        for year, engine, count in serie_result.all():
            values = by_year.setdefault(str(year), {name: 0 for name in MOTORES})
            values[engine] = count
        stmt = select(RegistroTriadaNormalizado).where(*filtros_sql)
        rows = list(
            (
                await self.session.scalars(
                    stmt.order_by(
                        RegistroTriadaNormalizado.vigencia.asc(),
                        RegistroTriadaNormalizado.entidad_normalizada.asc(),
                    ).limit(5000)
                )
            ).all()
        )
        serializados = [_registro_dict(row) for row in rows]
        grouped = self._cruzar_persistidos(rows)
        return {
            "filtros": {
                "entidad": entidad,
                "linea_estrategica": linea,
                "codigo_bpim": bpim,
                "motor": motor,
                "vigencia_desde": desde,
                "vigencia_hasta": hasta,
                "dimension": dimension,
                "periodo": periodo,
                "corte": corte,
            },
            "total_registros": total_registros or 0,
            "registros_retornados": len(rows),
            "registros_truncados": (total_registros or 0) > len(rows),
            "limite_registros": 5000,
            "cruce_muestra_truncada": (total_registros or 0) > len(rows),
            "serie": by_year,
            "registros": serializados,
            "cruce_tres_lecturas": grouped,
        }

    async def calidad_datos(self) -> dict[str, Any]:
        archivos = list((await self.session.scalars(select(ArchivoPlanIngerido))).all())
        huellas_binarias = {item.hash_sha256 for item in archivos}
        copias_binarias = max(0, len(archivos) - len(huellas_binarias))
        clones = sum(
            len((item.metadatos or {}).get("clones_tabulares_fusionados", [])) for item in archivos
        )
        for item in archivos:
            for clone in (item.metadatos or {}).get("clones_tabulares_fusionados", []):
                if clone.get("hash_sha256"):
                    huellas_binarias.add(clone["hash_sha256"])
        alertas = sum(
            1
            for item in archivos
            if (item.metadatos or {}).get("alerta_calidad") == "CONTENIDO_IDENTICO_OTRO_CORTE"
        )
        canonical_names = list(ENTIDADES_CANONICAS_CARTAGENA)
        total, canonical, entities = (
            await self.session.execute(
                select(
                    func.count(RegistroTriadaNormalizado.id),
                    func.count(RegistroTriadaNormalizado.id).filter(
                        RegistroTriadaNormalizado.entidad_normalizada.in_(canonical_names)
                    ),
                    func.count(func.distinct(RegistroTriadaNormalizado.entidad_normalizada)).filter(
                        RegistroTriadaNormalizado.entidad_normalizada.in_(canonical_names)
                    ),
                )
            )
        ).one()
        return {
            "archivos_unicos_binarios_sha256": len(huellas_binarias),
            "copias_binarias_descartadas": copias_binarias,
            "clones_tabulares_fusionados": clones,
            "archivos_con_alerta_corte_identico": alertas,
            "entidades_oficiales_reconocidas": entities,
            "registros_con_entidad_canonica_pct": round(100 * canonical / total, 2)
            if total
            else 0.0,
        }

    async def resumen_dimensiones(
        self, dimension: str | None = None, periodo: str | None = None
    ) -> dict[str, Any]:
        salida = {}
        for dimension_name in [dimension] if dimension else DIMENSIONES:
            archivos_stmt = (
                select(
                    ArchivoPlanIngerido.periodo_gobierno,
                    func.count(func.distinct(ArchivoPlanIngerido.hash_sha256)),
                )
                .where(
                    ArchivoPlanIngerido.dimensiones_seguridad_humana.contains([dimension_name]),
                    ArchivoPlanIngerido.metadatos["origen_drive"].astext
                    == "GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                )
                .group_by(ArchivoPlanIngerido.periodo_gobierno)
            )
            archivos_por_periodo = dict((await self.session.execute(archivos_stmt)).all())
            registros_stmt = (
                select(
                    RegistroTriadaNormalizado.periodo_gobierno,
                    RegistroTriadaNormalizado.vigencia,
                    RegistroTriadaNormalizado.motor_destino,
                    func.count(),
                )
                .where(
                    RegistroTriadaNormalizado.dimensiones_seguridad_humana.contains(
                        [dimension_name]
                    ),
                    RegistroTriadaNormalizado.archivo_id.not_in(
                        select(ArchivoPlanIngerido.id).where(
                            ArchivoPlanIngerido.metadatos["alerta_calidad"].astext
                            == "CONTENIDO_IDENTICO_OTRO_CORTE"
                        )
                    ),
                )
                .group_by(
                    RegistroTriadaNormalizado.periodo_gobierno,
                    RegistroTriadaNormalizado.vigencia,
                    RegistroTriadaNormalizado.motor_destino,
                )
            )
            if periodo:
                archivos_por_periodo = {
                    key: value for key, value in archivos_por_periodo.items() if key == periodo
                }
                registros_stmt = registros_stmt.where(
                    RegistroTriadaNormalizado.periodo_gobierno == periodo
                )
            conteos = list((await self.session.execute(registros_stmt)).all())
            entidades_stmt = select(RegistroTriadaNormalizado.entidad_normalizada).where(
                RegistroTriadaNormalizado.dimensiones_seguridad_humana.contains([dimension_name]),
                RegistroTriadaNormalizado.entidad_normalizada.is_not(None),
                RegistroTriadaNormalizado.archivo_id.not_in(
                    select(ArchivoPlanIngerido.id).where(
                        ArchivoPlanIngerido.metadatos["alerta_calidad"].astext
                        == "CONTENIDO_IDENTICO_OTRO_CORTE"
                    )
                ),
            )
            if periodo:
                entidades_stmt = entidades_stmt.where(
                    RegistroTriadaNormalizado.periodo_gobierno == periodo
                )
            entidades = sorted(set((await self.session.scalars(entidades_stmt)).all()))
            registros_por_motor = {
                motor: sum(
                    count for _period, _year, found_motor, count in conteos if found_motor == motor
                )
                for motor in MOTORES
            }
            registros_por_periodo = {
                found_period: sum(count for p, _year, _motor, count in conteos if p == found_period)
                for found_period in PERIODOS
            }
            salida[dimension_name] = {
                "archivos_drive": sum(archivos_por_periodo.values()),
                "registros_normalizados": sum(registros_por_motor.values()),
                "registros_por_motor": registros_por_motor,
                "entidades": entidades,
                "cobertura_interanual": {
                    str(year): sum(
                        count
                        for _period, found_year, _motor, count in conteos
                        if found_year == year
                    )
                    for year in range(2016, 2027)
                },
                "periodos": {
                    period: {
                        "archivos": archivos_por_periodo.get(period, 0),
                        "registros": registros_por_periodo.get(period, 0),
                    }
                    for period in PERIODOS
                },
            }
        return salida

    async def _conteo_motores(
        self,
        *,
        vigencia: int | None = None,
        entidad: str | None = None,
        dimension: str | None = None,
        periodo: str | None = None,
    ) -> dict[str, int]:
        stmt = select(RegistroTriadaNormalizado.motor_destino, func.count())
        if vigencia:
            stmt = stmt.where(RegistroTriadaNormalizado.vigencia == vigencia)
        if entidad:
            stmt = stmt.where(RegistroTriadaNormalizado.entidad_normalizada.ilike(f"%{entidad}%"))
        if dimension:
            stmt = stmt.where(
                RegistroTriadaNormalizado.dimensiones_seguridad_humana.contains([dimension])
            )
        if periodo:
            stmt = stmt.where(RegistroTriadaNormalizado.periodo_gobierno == periodo)
        result = await self.session.execute(stmt.group_by(RegistroTriadaNormalizado.motor_destino))
        data = dict(result.all())
        return {motor: data.get(motor, 0) for motor in MOTORES}

    @staticmethod
    def _cruzar_persistidos(rows: list[RegistroTriadaNormalizado]) -> dict[str, Any]:
        filas = []
        for row in rows:
            fila = {
                "motor_destino": row.motor_destino,
                "entidad_normalizada": row.entidad_normalizada,
                "linea_estrategica": row.linea_estrategica,
                "codigo_meta_pdd": row.codigo_meta_pdd,
                "codigo_bpim": row.codigo_bpim,
                "indicador": row.indicador,
                "descripcion_actividad": row.descripcion_actividad,
                "avance_estrategico_pct": float(row.avance_estrategico_pct or 0),
                "avance_fisico_pct": float(row.avance_fisico_pct or 0),
                "verbo_fuerte_dnp": row.verbo_fuerte_dnp,
                "apropiacion_definitiva_cop": float(row.apropiacion_definitiva_cop or 0),
                "cdp_cop": float(row.cdp_cop or 0),
                "compromisos_rp_cop": float(row.compromisos_rp_cop or 0),
                "obligaciones_cop": float(row.obligaciones_cop or 0),
                "pagos_tesoreria_cop": float(row.pagos_tesoreria_cop or 0),
            }
            filas.append(fila)
        return IngestaMasivaService._cruzar_filas(filas)
