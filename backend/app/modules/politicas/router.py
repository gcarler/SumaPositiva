import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text

from app.core.database import SessionDependency
from app.core.transactions import transaction
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso, requerir_rol
from app.modules.politicas.gating import calcular_progreso_real_fases, verificar_escritura_fase
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
    FasePoliticaResumen,
    LineaEstrategicaCreate,
    LineaEstrategicaRead,
    LineaEstrategicaUpdate,
    LineaPoliticaResumen,
    PoliticaPublicaRead,
)
from app.modules.politicas.service import LineaService

router = APIRouter(prefix="/politicas", tags=["motor-politicas"])


@router.get(
    "",
    response_model=list[PoliticaPublicaRead],
    summary="Listar políticas públicas distritales (Catálogo Canónico Oficial)",
    description=(
        "Retorna la Política Pública de Seguridad Humana Integral de Cartagena de Indias "
        "2026–2036 (Decreto 037 de 2026). Sus atributos identitarios institucionales son canónicos, "
        "mientras que sus fases metodológicas DNP y líneas estratégicas son hidratadas dinámicamente "
        "desde motor_politicas, su progreso porcentual es calculado en tiempo real y sus participantes "
        "únicos son computados desde las fuentes de participación multicanal."
    ),
)
async def listar_politicas(
    session: SessionDependency,
) -> list[PoliticaPublicaRead]:
    """Catálogo canónico oficial de la Política Pública de Cartagena de Indias.
    
    Declara explícitamente los atributos identitarios de pol-001 (Decreto 037 de 2026),
    hidratando dinámicamente fases metodológicas DNP, líneas estratégicas, avance ponderado
    y el número consolidado de participantes únicos deduplicados entre canales.
    """
    # 1. Cómputo dinámico de participantes únicos consolidados (Canales 1, 2 y formularios)
    sql_participantes = text("""
        SELECT COUNT(DISTINCT id_identificado) FROM (
            SELECT CAST(sesion_id AS text) AS id_identificado 
            FROM participacion_ciudadana.propuestas_ciudadanas 
            WHERE sesion_id IS NOT NULL AND activo = true
            UNION
            SELECT CAST(sujeto_id AS text) 
            FROM participacion_ciudadana.apoyos_propuestas 
            WHERE sujeto_id IS NOT NULL
            UNION
            SELECT CAST(sujeto_id AS text) 
            FROM participacion_ciudadana.respuestas_formulario 
            WHERE sujeto_id IS NOT NULL
            UNION
            SELECT CAST(sujeto_id AS text) 
            FROM mesas_trabajo.participantes_mesa 
            WHERE sujeto_id IS NOT NULL
            UNION
            SELECT CAST(usuario_id AS text) 
            FROM mesas_trabajo.participantes_mesa 
            WHERE usuario_id IS NOT NULL
        ) unificados;
    """)
    try:
        conteo_raw = (await session.execute(sql_participantes)).scalar()
        total_participantes: int | None = int(conteo_raw) if conteo_raw is not None else None
    except Exception:
        total_participantes = None

    progresos = await calcular_progreso_real_fases(session)
    stmt_fases = select(FasePolitica).order_by(FasePolitica.orden)
    result_fases = await session.execute(stmt_fases)
    fases = result_fases.scalars().all()

    stmt_lineas = (
        select(LineaEstrategica)
        .where(LineaEstrategica.activa.is_(True))
        .order_by(LineaEstrategica.orden)
    )
    result_lineas = await session.execute(stmt_lineas)
    lineas = result_lineas.scalars().all()

    lineas_por_fase: dict[uuid.UUID, list[LineaPoliticaResumen]] = {}
    for l in lineas:
        lineas_por_fase.setdefault(l.fase_id, []).append(
            LineaPoliticaResumen(
                id=str(l.id),
                faseId=str(l.fase_id),
                codigo=l.codigo,
                titulo=l.titulo,
                descripcion=l.descripcion,
                aportes=[],
            )
        )

    tipo_map = {
        "FASE_1": "diagnostico",
        "FASE_2": "formulacion",
        "FASE_3": "deliberacion",
        "FASE_4": "validacion",
        "FASE_5": "implementacion",
        "FASE_6": "seguimiento",
    }

    fases_resumen: list[FasePoliticaResumen] = []
    for f in fases:
        prog = progresos.get(f.codigo)
        if prog is None:
            prog = f.progreso_porcentaje
        prog_float = float(prog) if prog is not None else 0.0

        estado_front = (
            "activa"
            if f.estado == "activa"
            else ("completada" if f.estado in ("cerrada", "archivada") else "proxima")
        )
        fases_resumen.append(
            FasePoliticaResumen(
                id=str(f.id),
                politicaId="pol-001",
                orden=f.orden,
                nombre=f.nombre,
                tipo=tipo_map.get(f.codigo, "diagnostico"),
                descripcion=f.descripcion or "",
                estado=estado_front,
                progreso=prog_float,
                lineas=lineas_por_fase.get(f.id, []),
            )
        )

    politica = PoliticaPublicaRead(
        id="pol-001",
        slug="seguridad-humana-cartagena",
        titulo="Política Pública de Seguridad Humana Integral de Cartagena 2026–2036",
        participantes=total_participantes,
        fases=fases_resumen,
    )
    return [politica]


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
    description="Retorna las fases configuradas con recálculo dinámico de progreso real (AUD-05).",
)
async def listar_fases(
    session: SessionDependency,
) -> list[FasePoliticaRead]:
    progresos = await calcular_progreso_real_fases(session)
    stmt = select(FasePolitica).order_by(FasePolitica.orden)
    result = await session.execute(stmt)
    fases = result.scalars().all()
    salida = []
    for f in fases:
        item = FasePoliticaRead.model_validate(f)
        if f.codigo in progresos:
            item.progreso_porcentaje = progresos[f.codigo]
        salida.append(item)
    return salida


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
    progresos = await calcular_progreso_real_fases(session)
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
        item_base = FasePoliticaRead.model_validate(fase)
        if fase.codigo in progresos:
            item_base.progreso_porcentaje = progresos[fase.codigo]
        reglas = fase.reglas_participacion or {}
        habilitada = bool(reglas.get("habilitada_web", fase.estado == "activa"))
        item = FaseControlLectura(
            **item_base.model_dump(),
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

        progresos = await calcular_progreso_real_fases(session)
        if fase.codigo in progresos:
            fase.progreso_porcentaje = progresos[fase.codigo]

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
async def crear_linea(
    datos: LineaEstrategicaCreate,
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
):
    await verificar_escritura_fase("FASE_2_FORMULACION", sujeto, session)
    return await LineaService(session).guardar(datos)


@router.put(
    "/lineas/{id}",
    response_model=LineaEstrategicaRead,
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def actualizar_linea(
    id: uuid.UUID,
    datos: LineaEstrategicaUpdate,
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
):
    await verificar_escritura_fase("FASE_2_FORMULACION", sujeto, session)
    return await LineaService(session).guardar(datos, id)


@router.delete(
    "/lineas/{id}",
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def eliminar_linea(
    id: uuid.UUID,
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
):
    await verificar_escritura_fase("FASE_2_FORMULACION", sujeto, session)
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
