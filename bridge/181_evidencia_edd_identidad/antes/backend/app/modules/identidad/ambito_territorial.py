"""Lógica de resolución y verificación de alcance territorial PBAC [CIERRE-07].

Implementa la regla cardinal: "Sin ámbito asignado = Comportamiento actual (Global)".
Resuelve la pertenencia geográfica ascendiendo por territorio_padre_id en geodatos.territorios.
"""

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.identidad.models import AmbitoTerritorialUsuario, EventoIdentidad
from app.modules.identidad.schemas import SujetoAutenticadoContexto

logger = logging.getLogger("polis.identidad.ambito_territorial")


async def resolver_localidad_territorio(session: AsyncSession, territorio_id: uuid.UUID) -> str | None:
    """Resuelve la localidad (LOC-1, LOC-2, LOC-3) ascendiendo por territorio_padre_id."""
    stmt = text("""
        WITH RECURSIVE jerarquia AS (
            SELECT id, codigo, nombre, tipo_territorio, territorio_padre_id, 1 as nivel
            FROM geodatos.territorios
            WHERE id = :territorio_id
            UNION ALL
            SELECT t.id, t.codigo, t.nombre, t.tipo_territorio, t.territorio_padre_id, j.nivel + 1
            FROM geodatos.territorios t
            JOIN jerarquia j ON t.id = j.territorio_padre_id
            WHERE j.tipo_territorio != 'distrito' AND j.nivel < 10
        )
        SELECT codigo
        FROM jerarquia
        WHERE tipo_territorio = 'localidad'
        LIMIT 1;
    """)
    res = await session.execute(stmt, {"territorio_id": territorio_id})
    return res.scalar_one_or_none()


async def resolver_info_territorial_mesa(
    session: AsyncSession, mesa_id_o_uuid: uuid.UUID | str
) -> dict[str, Any] | None:
    """Obtiene metadatos territoriales y la localidad resuelta de una mesa de trabajo."""
    from app.modules.mesas.models import Mesa

    mesa_uuid: uuid.UUID | None = None
    if isinstance(mesa_id_o_uuid, uuid.UUID):
        mesa_uuid = mesa_id_o_uuid
    elif isinstance(mesa_id_o_uuid, str):
        try:
            mesa_uuid = uuid.UUID(mesa_id_o_uuid)
        except ValueError:
            pass

    if mesa_uuid is not None:
        stmt = select(Mesa).where(Mesa.id == mesa_uuid)
    else:
        stmt = select(Mesa).where(Mesa.codigo_oficial == str(mesa_id_o_uuid))

    res = await session.execute(stmt)
    mesa = res.scalar_one_or_none()
    if not mesa:
        return None

    localidad = None
    curr_territorio_id = mesa.territorio_id
    if curr_territorio_id is None and mesa.mesa_padre_id is not None:
        stmt_p = select(Mesa).where(Mesa.id == mesa.mesa_padre_id)
        res_p = await session.execute(stmt_p)
        padre = res_p.scalar_one_or_none()
        if padre and padre.territorio_id:
            curr_territorio_id = padre.territorio_id

    if curr_territorio_id:
        localidad = await resolver_localidad_territorio(session, curr_territorio_id)

    return {
        "mesa_id": str(mesa.id),
        "codigo_oficial": mesa.codigo_oficial,
        "territorio_id": str(curr_territorio_id) if curr_territorio_id else None,
        "localidad": localidad,
        "nombre": mesa.nombre,
    }


async def obtener_ambitos_activos(session: AsyncSession, usuario_id: uuid.UUID) -> list[AmbitoTerritorialUsuario]:
    """Consulta los ámbitos territoriales vigentes del usuario en autenticacion.ambitos_territoriales_usuario."""
    stmt = (
        select(AmbitoTerritorialUsuario)
        .where(
            AmbitoTerritorialUsuario.usuario_id == usuario_id,
            AmbitoTerritorialUsuario.activo.is_(True),
        )
        .order_by(AmbitoTerritorialUsuario.creado_en.asc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


async def verificar_ambito_territorial(
    session: AsyncSession,
    sujeto: SujetoAutenticadoContexto | None,
    *,
    mesa_id: uuid.UUID | str | None = None,
    territorio_id: uuid.UUID | None = None,
    localidad_codigo: str | None = None,
    recurso_tipo: str = "mesa",
    recurso_id: uuid.UUID | str | None = None,
    metodo_http: str = "POST",
    ruta_http: str = "",
) -> bool:
    """Valida la autorización territorial PBAC del actor institucional.

    Aplica rigurosamente la regla cardinal: "Sin ámbito = Comportamiento actual (Global)".
    """
    if not sujeto or sujeto.es_anonimo:
        return True

    # 1. Inmunidad de roles exentos
    ROLES_EXENTOS = {"administrador_identidades", "auditor_forense", "ciudadano"}
    if sujeto.rol in ROLES_EXENTOS:
        return True

    # 2. Regla cardinal de retrocompatibilidad: "Sin ámbito asignado = Global (comportamiento actual)"
    ambitos = await obtener_ambitos_activos(session, sujeto.sujeto_id)
    if not ambitos:
        return True

    # 3. Ámbito distrital explícito
    if any(a.tipo_ambito == "distrital" for a in ambitos):
        return True

    # 4. Evaluación de la mesa / territorio
    mesa_info = None
    if mesa_id is not None:
        mesa_info = await resolver_info_territorial_mesa(session, mesa_id)
        if not mesa_info:
            # Si el recurso no existe, permitir que el endpoint o servicio genere 404 Not Found
            return True
        # Coincidencia por ámbito de tipo 'mesa'
        for a in ambitos:
            if a.tipo_ambito == "mesa" and a.identificador_territorial in (
                mesa_info["mesa_id"],
                mesa_info["codigo_oficial"],
            ):
                return True

        # Coincidencia por ámbito de tipo 'localidad'
        if mesa_info.get("localidad"):
            for a in ambitos:
                if a.tipo_ambito == "localidad" and a.identificador_territorial == mesa_info["localidad"]:
                    return True

    elif territorio_id is not None:
        localidad_res = await resolver_localidad_territorio(session, territorio_id)
        if localidad_res:
            for a in ambitos:
                if a.tipo_ambito == "localidad" and a.identificador_territorial == localidad_res:
                    return True

    elif localidad_codigo is not None:
        for a in ambitos:
            if a.tipo_ambito == "localidad" and a.identificador_territorial == localidad_codigo:
                return True

    # 5. Denegación y registro forense inmutable
    ambito_req: dict[str, Any] = {}
    if mesa_info:
        ambito_req = {
            "tipo": "mesa",
            "identificador": mesa_info["mesa_id"],
            "codigo_oficial": mesa_info["codigo_oficial"],
            "localidad": mesa_info.get("localidad"),
        }
    elif localidad_codigo:
        ambito_req = {"tipo": "localidad", "identificador": localidad_codigo}
    elif territorio_id:
        ambito_req = {"tipo": "territorio", "identificador": str(territorio_id)}

    detalle_evento = {
        "metodo": metodo_http,
        "ruta": ruta_http,
        "recurso_tipo": recurso_tipo,
        "ambito_requerido": ambito_req,
        "ambitos_asignados": [{"tipo": a.tipo_ambito, "identificador": a.identificador_territorial} for a in ambitos],
        "motivo": "fuera_de_ambito_territorial",
    }

    # Registro forense autónomo en eventos_identidad
    obj_uuid: uuid.UUID | None = None
    if recurso_id is not None:
        try:
            obj_uuid = uuid.UUID(str(recurso_id))
        except (ValueError, TypeError):
            pass
    elif mesa_info:
        try:
            obj_uuid = uuid.UUID(mesa_info["mesa_id"])
        except (ValueError, TypeError):
            pass

    try:
        async with AsyncSession(session.bind, expire_on_commit=False) as audit_session:
            evento = EventoIdentidad(
                actor_id=sujeto.sujeto_id,
                objetivo_id=obj_uuid,
                accion="acceso_territorial_denegado",
                detalle=detalle_evento,
            )
            audit_session.add(evento)
            # Límite transaccional separado y acotado: el evento se confirma antes
            # del 403 para conservar la evidencia del acceso denegado aunque el
            # caso de uso de la petición revierta (documentación del plan de
            # remediación T5.5; precedente del contador de intentos en
            # docs/transacciones.md).
            async with transaction(audit_session):
                pass
    except Exception:
        logger.warning(
            "No se pudo registrar el evento de acceso territorial denegado en la transacción separada",
            exc_info=True,
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "codigo": "fuera_de_ambito_territorial",
            "mensaje": (
                "Acceso territorial denegado: su cuenta no cuenta con jurisdicción sobre la mesa o localidad requerida."
            ),
            "ambito_requerido": ambito_req,
        },
    )
