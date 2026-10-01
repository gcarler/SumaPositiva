"""Rutas FastAPI para auditoría forense y supervisión de respaldos del sistema."""

import asyncio
import os
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select

from app.core.database import SessionDependency
from app.core.transactions import transaction
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.auditoria.schemas import (
    EstadoRespaldosSistema,
    RegistroAuditoriaLectura,
    RegistrosAuditoriaPagina,
    RespaldoArchivo,
)
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso

router = APIRouter(prefix="/auditoria", tags=["Auditoría y Supervisión"])
BACKUP_DIR = Path("/root/polis/backups")


@router.get(
    "/registros",
    response_model=RegistrosAuditoriaPagina,
    summary="Listar registros de auditoría forense",
    dependencies=[Depends(requerir_permiso("auditoria:leer", "declarada"))],
)
async def listar_registros_auditoria(
    session: SessionDependency,
    tabla: str | None = Query(None, description="Filtrar por tabla afectada"),
    causal: str | None = Query(None, description="Filtrar por causal motivada"),
    limite: int = Query(50, ge=1, le=200),
    desplazamiento: int = Query(0, ge=0),
) -> RegistrosAuditoriaPagina:
    condiciones = []
    if tabla:
        condiciones.append(RegistroAuditoria.tabla_afectada == tabla)
    if causal:
        condiciones.append(RegistroAuditoria.causal == causal)

    # Conteo total
    stmt_conteo = select(func.count(RegistroAuditoria.id))
    if condiciones:
        stmt_conteo = stmt_conteo.where(*condiciones)
    total = await session.scalar(stmt_conteo) or 0

    # Consulta paginada
    stmt = (
        select(RegistroAuditoria)
        .order_by(RegistroAuditoria.creado_en.desc())
        .limit(limite)
        .offset(desplazamiento)
    )
    if condiciones:
        stmt = stmt.where(*condiciones)

    result = await session.execute(stmt)
    registros = result.scalars().all()

    return RegistrosAuditoriaPagina(
        total=total,
        elementos=[RegistroAuditoriaLectura.model_validate(r) for r in registros],
    )


@router.get(
    "/respaldos",
    response_model=EstadoRespaldosSistema,
    summary="Estado de respaldos del sistema y verificación criptográfica",
    dependencies=[Depends(requerir_permiso("auditoria:leer", "declarada"))],
)
async def obtener_estado_respaldos() -> EstadoRespaldosSistema:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    respaldos: list[RespaldoArchivo] = []
    archivos_dump = sorted(BACKUP_DIR.glob("*.dump"), key=os.path.getmtime, reverse=True)

    for ruta in archivos_dump:
        tamano = ruta.stat().st_size
        mtime = datetime.fromtimestamp(ruta.stat().st_mtime, tz=UTC)
        hash_file = ruta.with_suffix(".dump.sha256")
        hash_str = None
        if hash_file.exists():
            try:
                linea = hash_file.read_text(encoding="utf-8").strip()
                hash_str = linea.split()[0] if linea else None
            except Exception:
                pass

        respaldos.append(
            RespaldoArchivo(
                archivo=ruta.name,
                tamano_bytes=tamano,
                fecha_modificacion=mtime,
                hash_sha256=hash_str,
                estado="verificado" if hash_str else "sin_hash",
            )
        )

    # Espacio en disco
    try:
        total_b, _, free_b = shutil.disk_usage(BACKUP_DIR)
        espacio_libre_mb = round(free_b / (1024 * 1024), 2)
    except Exception:
        espacio_libre_mb = 0.0

    return EstadoRespaldosSistema(
        directorio=str(BACKUP_DIR),
        total_respaldos=len(respaldos),
        ultimo_respaldo=respaldos[0] if respaldos else None,
        respaldos=respaldos,
        espacio_libre_mb=espacio_libre_mb,
    )


@router.post(
    "/respaldos/ejecutar",
    response_model=RespaldoArchivo,
    summary="Ejecutar respaldo en caliente de la base de datos",
    dependencies=[Depends(requerir_permiso("auditoria:leer", "declarada"))],
)
async def ejecutar_respaldo_sistema(
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
) -> RespaldoArchivo:
    script_path = Path("/root/polis/scripts/respaldo_bd.sh")
    if not script_path.exists():
        raise HTTPException(status_code=500, detail="Script de respaldo no encontrado en el sistema")

    proceso = await asyncio.create_subprocess_exec(
        "/bin/bash",
        str(script_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proceso.communicate()

    if proceso.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Fallo al ejecutar respaldo: {stderr.decode('utf-8', errors='ignore')}",
        )

    # Encontrar el archivo más reciente generado
    archivos_dump = sorted(BACKUP_DIR.glob("*.dump"), key=os.path.getmtime, reverse=True)
    if not archivos_dump:
        raise HTTPException(status_code=500, detail="No se encontró el archivo de respaldo generado")

    mas_reciente = archivos_dump[0]
    tamano = mas_reciente.stat().st_size
    mtime = datetime.fromtimestamp(mas_reciente.stat().st_mtime, tz=UTC)
    hash_file = mas_reciente.with_suffix(".dump.sha256")
    hash_str = None
    if hash_file.exists():
        try:
            linea = hash_file.read_text(encoding="utf-8").strip()
            hash_str = linea.split()[0] if linea else None
        except Exception:
            pass

    async with transaction(session):
        registro_aud = RegistroAuditoria(
            tabla_afectada="sistema.respaldos",
            registro_id=uuid.uuid4(),
            accion="respaldo_ejecutado",
            usuario_id=sujeto.sujeto_id,
            causal="tecnica",
            justificacion_motivada=f"Respaldo manual en caliente ejecutado por {sujeto.rol}: {mas_reciente.name}",
            metadatos={
                "archivo": mas_reciente.name,
                "tamano_bytes": tamano,
                "hash_sha256": hash_str,
            },
        )
        session.add(registro_aud)

    return RespaldoArchivo(
        archivo=mas_reciente.name,
        tamano_bytes=tamano,
        fecha_modificacion=mtime,
        hash_sha256=hash_str,
        estado="verificado" if hash_str else "sin_hash",
    )
