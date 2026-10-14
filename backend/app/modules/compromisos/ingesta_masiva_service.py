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
from app.modules.compromisos.ingesta_masiva_excel import ArchivoLeido, IngestorBinarioTriada
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


def _limpiar(valor: Any) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


def _datos_registro(
    archivo: ArchivoLeido, fila: dict[str, Any], lote_id: uuid.UUID, archivo_id: uuid.UUID
) -> RegistroTriadaNormalizado:
    descripcion = _limpiar(fila.get("descripcion_actividad"))
    palabras = (descripcion or "").split(maxsplit=1)
    primera = palabras[0].strip(".,:;()[]{}") if palabras else ""
    verbo = fila.get("verbo_detectado") or (primera.lower() if primera else None)
    return RegistroTriadaNormalizado(
        archivo_id=archivo_id,
        lote_id=lote_id,
        motor_destino=fila["motor_destino"],
        vigencia=archivo.vigencia,
        corte_periodo=archivo.corte,
        entidad_normalizada=_limpiar(fila.get("entidad_normalizada")) or archivo.entidad,
        linea_estrategica=_limpiar(fila.get("linea_estrategica")),
        codigo_meta_pdd=_limpiar(fila.get("codigo_meta_pdd")),
        codigo_bpim=_limpiar(fila.get("codigo_bpim")),
        indicador=_limpiar(fila.get("indicador")),
        descripcion_actividad=descripcion,
        verbo_fuerte_dnp=fila.get("verbo_fuerte_dnp"),
        verbo_detectado=verbo,
        meta_programada_anual=fila.get("meta_programada_anual"),
        meta_ejecutada_anual=fila.get("meta_ejecutada_anual"),
        avance_t1=fila.get("avance_t1"),
        avance_t2=fila.get("avance_t2"),
        avance_t3=fila.get("avance_t3"),
        avance_t4=fila.get("avance_t4"),
        avance_fisico_pct=fila.get("avance_fisico_pct"),
        avance_estrategico_pct=fila.get("avance_estrategico_pct"),
        apropiacion_definitiva_cop=fila.get("apropiacion_definitiva_cop")
        or fila.get("apropiacion_inicial_cop"),
        cdp_cop=fila.get("cdp_cop"),
        compromisos_rp_cop=fila.get("compromisos_rp_cop"),
        obligaciones_cop=fila.get("obligaciones_cop"),
        pagos_tesoreria_cop=fila.get("pagos_tesoreria_cop"),
        hoja_origen=fila.get("hoja_origen"),
        fila_origen_num=fila.get("fila_origen_num"),
        datos_origen=_json_safe(fila.get("datos_origen") or {}),
    )


def _registro_dict(row: RegistroTriadaNormalizado) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "motor": row.motor_destino,
        "vigencia": row.vigencia,
        "corte_periodo": row.corte_periodo,
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
    ) -> dict[str, Any]:
        if not archivos:
            raise HTTPException(
                status_code=422, detail="Debe adjuntar al menos un archivo soportado."
            )
        leidos: list[ArchivoLeido] = []
        errores = []
        for nombre, raw in archivos:
            try:
                leidos.extend(self.ingestor.leer_lote(nombre, raw, vigencia, corte))
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
                    existente = await self.session.scalar(
                        select(ArchivoPlanIngerido)
                        .where(ArchivoPlanIngerido.hash_sha256 == book.sha256)
                        .order_by(ArchivoPlanIngerido.creado_en.desc())
                        .limit(1)
                    )
                    if existente:
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
                                entidad_normalizada=book.entidad,
                                hojas_analizadas=[],
                                mapeo_columnas={},
                                filas_extraidas=0,
                                metadatos={
                                    "deduplicado": True,
                                    "archivo_original_id": str(existente.id),
                                    "lote_original_id": str(existente.lote_id),
                                },
                            )
                        )
                        continue
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
                        entidad_normalizada=book.entidad,
                        hojas_analizadas=metadata_hojas,
                        mapeo_columnas=mapeos,
                        filas_extraidas=sum(len(sheet.filas) for sheet in book.hojas),
                        metadatos={"clasificacion_motores": dict(motores_book)},
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
                        avance_estrategico_pct=row.get("avance_estrategico_pct")
                        or row.get("avance_fisico_pct")
                        or 0,
                    )
                )
            elif motor == "PLAN_ACCION":
                actividades.append(
                    ActividadOperativaTriada(
                        **base,
                        codigo_meta_pdd=str(row.get("codigo_meta_pdd") or ""),
                        descripcion_actividad=str(row.get("descripcion_actividad") or ""),
                        avance_operativo_fisico_pct=row.get("avance_fisico_pct") or 0,
                        formato_origen="INGESTA_BINARIA",
                        porcentaje_verbos_fuertes_dnp=100 if row.get("verbo_fuerte_dnp") else 0,
                    )
                )
            elif motor == "INVERSION_PRESUPUESTAL":
                ejecuciones.append(
                    EjecucionPresupuestalTriada(
                        **base,
                        fuente=str(row.get("fuente_financiacion") or "RECURSOS_PROPIOS"),
                        apropiacion_definitiva_cop=row.get("apropiacion_definitiva_cop")
                        or row.get("apropiacion_inicial_cop")
                        or 0,
                        cdp_acumulado_cop=row.get("cdp_cop") or 0,
                        compromisos_rp_cop=row.get("compromisos_rp_cop") or 0,
                        obligaciones_cop=row.get("obligaciones_cop") or 0,
                        pagos_tesoreria_cop=row.get("pagos_tesoreria_cop") or 0,
                    )
                )
        return cruzar_tres_lecturas(metas, actividades, ejecuciones)

    async def listar_lotes(
        self, limite: int = 50, vigencia: int | None = None, entidad: str | None = None
    ) -> dict[str, Any]:
        stmt = select(LoteIngestaPlan).order_by(LoteIngestaPlan.creado_en.desc()).limit(limite)
        lotes = list((await self.session.scalars(stmt)).all())
        archivo_stmt = select(ArchivoPlanIngerido)
        if vigencia:
            archivo_stmt = archivo_stmt.where(ArchivoPlanIngerido.vigencia == vigencia)
        if entidad:
            archivo_stmt = archivo_stmt.where(
                ArchivoPlanIngerido.entidad_normalizada.ilike(f"%{entidad}%")
            )
        archivos = list(
            (
                await self.session.scalars(
                    archivo_stmt.order_by(ArchivoPlanIngerido.creado_en.desc()).limit(500)
                )
            ).all()
        )
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
                }
                for x in archivos
            ],
            "cobertura_motores": await self._conteo_motores(),
            "filtros": {"vigencia": vigencia, "entidad": entidad},
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
    ) -> dict[str, Any]:
        stmt = select(RegistroTriadaNormalizado).where(
            RegistroTriadaNormalizado.vigencia.between(desde, hasta)
        )
        if entidad:
            stmt = stmt.where(RegistroTriadaNormalizado.entidad_normalizada.ilike(f"%{entidad}%"))
        if linea:
            stmt = stmt.where(RegistroTriadaNormalizado.linea_estrategica.ilike(f"%{linea}%"))
        if bpim:
            stmt = stmt.where(RegistroTriadaNormalizado.codigo_bpim == bpim)
        if motor:
            stmt = stmt.where(RegistroTriadaNormalizado.motor_destino == motor.upper())
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
        by_year: dict[str, dict[str, int]] = {}
        for row in serializados:
            year = by_year.setdefault(str(row["vigencia"]), {m: 0 for m in MOTORES})
            year[row["motor"]] += 1
        grouped = self._cruzar_persistidos(rows)
        return {
            "filtros": {
                "entidad": entidad,
                "linea_estrategica": linea,
                "codigo_bpim": bpim,
                "motor": motor,
                "vigencia_desde": desde,
                "vigencia_hasta": hasta,
            },
            "total_registros": len(rows),
            "serie": by_year,
            "registros": serializados,
            "cruce_tres_lecturas": grouped,
        }

    async def _conteo_motores(self) -> dict[str, int]:
        result = await self.session.execute(
            select(RegistroTriadaNormalizado.motor_destino, func.count()).group_by(
                RegistroTriadaNormalizado.motor_destino
            )
        )
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
