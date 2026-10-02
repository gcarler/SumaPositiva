import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.core.database import SessionDependency
from app.core.transactions import transaction
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso, requerir_rol
from app.modules.politicas.models import (
    DimensionSeguridadHumana,
    FasePolitica,
    LineaEstrategica,
)
from app.modules.politicas.schemas import (
    DimensionSeguridadHumanaRead,
    FaseConmutarPeticion,
    FaseControlLectura,
    FasePoliticaRead,
    LineaEstrategicaCreate,
    LineaEstrategicaRead,
    LineaEstrategicaUpdate,
)
from app.modules.politicas.service import LineaService

router = APIRouter(prefix="/politicas", tags=["motor-politicas"])


@router.get(
    "/dimensiones",
    response_model=list[DimensionSeguridadHumanaRead],
    summary="Listar dimensiones canónicas de Seguridad Humana",
    description="Retorna las 7 dimensiones canónicas de la Seguridad Humana (ONU/DNP).",
)
async def listar_dimensiones(
    session: SessionDependency,
) -> list[DimensionSeguridadHumanaRead]:
    stmt = select(DimensionSeguridadHumana).order_by(DimensionSeguridadHumana.orden)
    result = await session.execute(stmt)
    dimensiones = result.scalars().all()
    return [DimensionSeguridadHumanaRead.model_validate(d) for d in dimensiones]


@router.get(
    "/fases",
    response_model=list[FasePoliticaRead],
    summary="Listar fases del ciclo de política",
    description="Retorna las fases configuradas del ciclo de planeación de la política pública.",
)
async def listar_fases(
    session: SessionDependency,
) -> list[FasePoliticaRead]:
    stmt = select(FasePolitica).order_by(FasePolitica.orden)
    result = await session.execute(stmt)
    fases = result.scalars().all()
    return [FasePoliticaRead.model_validate(f) for f in fases]


@router.get(
    "/lineas",
    response_model=list[LineaEstrategicaRead],
    summary="Listar líneas estratégicas",
    description="Retorna las líneas estratégicas activas con sus costos y entidades líderes.",
)
async def listar_lineas(
    session: SessionDependency,
) -> list[LineaEstrategicaRead]:
    stmt = (
        select(LineaEstrategica)
        .where(LineaEstrategica.activa.is_(True))
        .order_by(LineaEstrategica.orden)
    )
    result = await session.execute(stmt)
    lineas = result.scalars().all()
    return [LineaEstrategicaRead.model_validate(linea) for linea in lineas]


@router.get(
    "/fases/control",
    response_model=list[FaseControlLectura],
    summary="Listar fases con estado de control DNP",
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def listar_fases_control(
    session: SessionDependency,
) -> list[FaseControlLectura]:
    stmt = (
        select(FasePolitica, func.count(LineaEstrategica.id).label("total_lineas"))
        .outerjoin(LineaEstrategica, LineaEstrategica.fase_id == FasePolitica.id)
        .group_by(FasePolitica.id)
        .order_by(FasePolitica.orden)
    )
    result = await session.execute(stmt)
    filas = result.all()
    salida = []
    for fase, total_lineas in filas:
        reglas = fase.reglas_participacion or {}
        habilitada = bool(reglas.get("habilitada_web", fase.estado == "activa"))
        item = FaseControlLectura(
            **FasePoliticaRead.model_validate(fase).model_dump(),
            habilitada_web=habilitada,
            total_lineas=total_lineas,
        )
        salida.append(item)
    return salida


@router.patch(
    "/fases/{fase_id}/conmutar",
    response_model=FaseControlLectura,
    summary="Conmutar estado o participación web de una fase DNP",
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def conmutar_fase(
    fase_id: uuid.UUID,
    datos: FaseConmutarPeticion,
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
) -> FaseControlLectura:
    async with transaction(session):
        fase = await session.scalar(
            select(FasePolitica).where(FasePolitica.id == fase_id).with_for_update()
        )
        if not fase:
            raise HTTPException(status_code=404, detail="Fase de política no encontrada")

        reglas = dict(fase.reglas_participacion or {})
        if datos.habilitada_web is not None:
            reglas["habilitada_web"] = datos.habilitada_web
            fase.reglas_participacion = reglas

        if datos.estado:
            estados_validos = {"preparatoria", "activa", "en_revision", "cerrada", "archivada"}
            if datos.estado not in estados_validos:
                raise HTTPException(
                    status_code=422,
                    detail="Estado no válido. Debe ser uno de: "
                    + ", ".join(sorted(estados_validos)),
                )
            fase.estado = datos.estado

        session.add(fase)
        await session.flush()

        total_lineas = (
            await session.scalar(
                select(func.count(LineaEstrategica.id)).where(LineaEstrategica.fase_id == fase.id)
            )
            or 0
        )

        habilitada = bool(reglas.get("habilitada_web", fase.estado == "activa"))
        return FaseControlLectura(
            **FasePoliticaRead.model_validate(fase).model_dump(),
            habilitada_web=habilitada,
            total_lineas=total_lineas,
        )


@router.post(
    "/lineas",
    response_model=LineaEstrategicaRead,
    status_code=201,
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def crear_linea(datos: LineaEstrategicaCreate, session: SessionDependency):
    return await LineaService(session).guardar(datos)


@router.put(
    "/lineas/{id}",
    response_model=LineaEstrategicaRead,
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def actualizar_linea(
    id: uuid.UUID, datos: LineaEstrategicaUpdate, session: SessionDependency
):
    return await LineaService(session).guardar(datos, id)


@router.delete(
    "/lineas/{id}", dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))]
)
async def eliminar_linea(id: uuid.UUID, session: SessionDependency):
    return await LineaService(session).eliminar(id)


@router.get(
    "/lineas/gestion",
    response_model=list[LineaEstrategicaRead],
    dependencies=[
        Depends(requerir_rol("autoridad_distrital", "administrador_identidades", "auditor_forense"))
    ],
)
async def listar_lineas_gestion(session: SessionDependency):
    result = await session.execute(select(LineaEstrategica).order_by(LineaEstrategica.orden))
    return [LineaEstrategicaRead.model_validate(linea) for linea in result.scalars()]
