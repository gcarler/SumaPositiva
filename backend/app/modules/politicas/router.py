import json
import logging
import os
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select, text

from app.core.database import SessionDependency
from app.core.transactions import transaction
from app.modules.aportes.models import PropuestaCiudadana
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
    HerosConfigRead,
    HerosConfigUpdate,
    LineaEstrategicaCreate,
    LineaEstrategicaRead,
    LineaEstrategicaUpdate,
    LineaPoliticaResumen,
    PoliticaPublicaRead,
)
from app.modules.politicas.service import LineaService

logger = logging.getLogger(__name__)

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
        logger.exception("Error al calcular participantes consolidados para pol-001")
        total_participantes = None

    progresos = await calcular_progreso_real_fases(session)
    stmt_fases = select(FasePolitica).order_by(FasePolitica.orden)
    result_fases = await session.execute(stmt_fases)
    fases = result_fases.scalars().all()

    stmt_lineas = select(LineaEstrategica).where(LineaEstrategica.activa.is_(True)).order_by(LineaEstrategica.orden)
    result_lineas = await session.execute(stmt_lineas)
    lineas = result_lineas.scalars().all()

    # Conteo de aportes ciudadanos activos y no rechazados por línea
    stmt_aportes = (
        select(PropuestaCiudadana.linea_id, func.count(PropuestaCiudadana.id))
        .where(
            PropuestaCiudadana.estado != "rechazado",
            PropuestaCiudadana.activo.is_(True),
        )
        .group_by(PropuestaCiudadana.linea_id)
    )
    res_aportes = await session.execute(stmt_aportes)
    conteos_aportes = dict(res_aportes.all())

    lineas_por_fase: dict[uuid.UUID, list[LineaPoliticaResumen]] = {}
    for linea in lineas:
        lineas_por_fase.setdefault(linea.fase_id, []).append(
            LineaPoliticaResumen(
                id=str(linea.id),
                faseId=str(linea.fase_id),
                codigo=linea.codigo,
                titulo=linea.titulo,
                descripcion=linea.descripcion,
                aportes=[],
                aportesCount=conteos_aportes.get(linea.id, 0),
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
        if f.estado == "preparatoria":
            prog_final = Decimal("0.00")
        elif f.codigo == "FASE_1_DIAGNOSTICO" and f.estado == "activa":
            prog_real = progresos.get(f.codigo)
            prog_final = max(Decimal("15.00"), Decimal(str(prog_real or 0)))
        elif f.codigo in progresos and progresos[f.codigo] is not None:
            prog_final = Decimal(str(progresos[f.codigo]))
        else:
            prog_final = f.progreso_porcentaje or Decimal("0.00")
        prog_float = float(prog_final)

        estado_front = (
            "activa" if f.estado == "activa" else ("completada" if f.estado in ("cerrada", "archivada") else "proxima")
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
        if f.estado == "preparatoria":
            item.progreso_porcentaje = Decimal("0.00")
        elif f.codigo == "FASE_1_DIAGNOSTICO" and f.estado == "activa":
            prog_actual = progresos.get(f.codigo)
            item.progreso_porcentaje = max(Decimal("15.00"), Decimal(str(prog_actual or 0)))
        elif f.codigo in progresos and progresos[f.codigo] is not None:
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
    stmt = select(LineaEstrategica).where(LineaEstrategica.activa.is_(True)).order_by(LineaEstrategica.orden)
    result = await session.execute(stmt)
    lineas = result.scalars().all()

    # Conteo de aportes ciudadanos activos y no rechazados por línea
    stmt_aportes = (
        select(PropuestaCiudadana.linea_id, func.count(PropuestaCiudadana.id))
        .where(
            PropuestaCiudadana.estado != "rechazado",
            PropuestaCiudadana.activo.is_(True),
        )
        .group_by(PropuestaCiudadana.linea_id)
    )
    res_aportes = await session.execute(stmt_aportes)
    conteos_aportes = dict(res_aportes.all())

    salida = []
    for linea in lineas:
        item = LineaEstrategicaRead.model_validate(linea)
        item.aportes_count = conteos_aportes.get(linea.id, 0)
        salida.append(item)
    return salida


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
        if fase.estado == "preparatoria":
            item_base.progreso_porcentaje = Decimal("0.00")
        elif fase.codigo == "FASE_1_DIAGNOSTICO" and fase.estado == "activa":
            prog_actual = progresos.get(fase.codigo)
            item_base.progreso_porcentaje = max(Decimal("15.00"), Decimal(str(prog_actual or 0)))
        elif fase.codigo in progresos and progresos[fase.codigo] is not None:
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
        fase = await session.scalar(select(FasePolitica).where(FasePolitica.id == fase_id).with_for_update())
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
                    detail="Estado no válido. Debe ser uno de: " + ", ".join(sorted(estados_validos)),
                )
            fase.estado = datos.estado

        progresos = await calcular_progreso_real_fases(session)
        if fase.codigo in progresos:
            fase.progreso_porcentaje = progresos[fase.codigo]

        session.add(fase)
        await session.flush()

        total_lineas = (
            await session.scalar(select(func.count(LineaEstrategica.id)).where(LineaEstrategica.fase_id == fase.id))
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
    dependencies=[Depends(requerir_rol("autoridad_distrital", "administrador_identidades", "auditor_forense"))],
)
async def listar_lineas_gestion(session: SessionDependency):
    result = await session.execute(select(LineaEstrategica).order_by(LineaEstrategica.orden))
    return [LineaEstrategicaRead.model_validate(linea) for linea in result.scalars()]


# ============================================================================
# GESTIÓN Y PERSISTENCIA DE HEROS TERRITORIALES PÚBLICOS
# ============================================================================

DEFAULT_HERO_SLIDES = [
    {
        "id": "asamblea-claustro",
        "titulo": "Cabildo Abierto y Foro Ciudadano",
        "subtitulo": (
            "Deliberación comunitaria vinculante y construcción colectiva de la "
            "seguridad humana en Cartagena de Indias."
        ),
        "enfoque": "Cabildo Masivo Territorial",
        "imagenFondo": "/images/hero/hero-asamblea-claustro.webp",
        "ubicacionReal": "Claustro de la Merced — Centro Histórico",
        "altura": "fullscreen",
        "badgeTexto": "Participación Ciudadana Masiva",
        "activa": True,
        "accionPrimaria": {
            "label": "Explorar Diagnóstico",
            "href": "/fases",
        },
    },
    {
        "id": "dialogo-comunitario",
        "titulo": "Diálogo Social y Escucha Barrial",
        "subtitulo": (
            "Encuentros cara a cara en los sectores populares para concertar "
            "compromisos de bienestar y seguridad integral."
        ),
        "enfoque": "Diálogo Barrial Comunitario",
        "imagenFondo": "/images/hero/hero-dialogo-comunitario.webp",
        "ubicacionReal": "Sector El Pozón — Localidad 2 (De la Virgen y Turística)",
        "altura": "fullscreen",
        "badgeTexto": "Presencia Barrial Directa",
        "activa": True,
        "accionPrimaria": {
            "label": "Modo Barrio",
            "href": "/barrio",
        },
    },
    {
        "id": "enfoque-diferencial",
        "titulo": "Enfoque Diferencial, Género y Juventud",
        "subtitulo": (
            "Garantía de derechos, equidad de género sustantiva y liderazgo "
            "transformador de las nuevas generaciones cartageneras."
        ),
        "enfoque": "Mujeres, Jóvenes y Diversidad",
        "imagenFondo": "/images/hero/hero-enfoque-diferencial.webp",
        "ubicacionReal": "Casa de Justicia Chiquinquirá — Localidad 2",
        "altura": "fullscreen",
        "badgeTexto": "Enfoque Diferencial e Inclusivo",
        "activa": True,
        "accionPrimaria": {
            "label": "Ver Compromisos",
            "href": "/alternativas",
        },
    },
    {
        "id": "marco-logico",
        "titulo": "Metodología y Proyectos Comunitarios",
        "subtitulo": (
            "Formulación técnica rigurosa con marco lógico, banco de iniciativas e impacto territorial verificable."
        ),
        "enfoque": "Proyectos Comunitarios y Marco Lógico",
        "imagenFondo": "/images/hero/hero-marco-logico.webp",
        "ubicacionReal": "Centro Comunitario Nelson Mandela — Localidad 3 (Industrial y de la Bahía)",
        "altura": "fullscreen",
        "badgeTexto": "Formulación Técnica Participativa",
        "activa": True,
        "accionPrimaria": {
            "label": "Consultar Banco",
            "href": "/fases",
        },
    },
    {
        "id": "mesa-deliberativa",
        "titulo": "Mesa de Concertación y Transparencia",
        "subtitulo": (
            "Veeduría ciudadana activa, rendición de cuentas pública y trazabilidad institucional inalterable."
        ),
        "enfoque": "Transparencia y Control Social",
        "imagenFondo": "/images/hero/hero-mesa-deliberativa.webp",
        "ubicacionReal": "Palacio de la Proclamación — Plaza de Bolívar",
        "altura": "fullscreen",
        "badgeTexto": "Transparencia y Fe Pública",
        "activa": True,
        "accionPrimaria": {
            "label": "Rendición de Cuentas",
            "href": "/plataforma/rendicion",
        },
    },
]

DEFAULT_HERO_IMAGE_OPTIONS = [
    {
        "id": "asamblea-claustro",
        "titulo": "Cabildo Abierto y Foro Ciudadano",
        "descripcion": (
            "Vista aérea de asamblea y cabildo masivo en patio colonial cartagenero con amplia deliberación ciudadana."
        ),
        "archivo": "/images/hero/hero-asamblea-claustro.webp",
        "thumbnail": "/images/hero/hero-asamblea-claustro-thumb.webp",
        "enfoque": "Cabildo Masivo Territorial",
        "habilitada": True,
        "heroImageId": "asamblea-claustro",
    },
    {
        "id": "dialogo-comunitario",
        "titulo": "Diálogo Social y Rendición de Cuentas",
        "descripcion": (
            "Conversatorio abierto al aire libre con micrófono ciudadano y concertación institucional directa."
        ),
        "archivo": "/images/hero/hero-dialogo-comunitario.webp",
        "thumbnail": "/images/hero/hero-dialogo-comunitario-thumb.webp",
        "enfoque": "Transparencia y Diálogo Directo",
        "habilitada": True,
        "heroImageId": "dialogo-comunitario",
    },
    {
        "id": "enfoque-diferencial",
        "titulo": "Taller Diferencial de Género y Juventud",
        "descripcion": (
            "Espacio inclusivo con el Observatorio de Equidad y organizaciones comunitarias de mujeres y jóvenes."
        ),
        "archivo": "/images/hero/hero-enfoque-diferencial.webp",
        "thumbnail": "/images/hero/hero-enfoque-diferencial-thumb.webp",
        "enfoque": "Inclusión y Género",
        "habilitada": True,
        "heroImageId": "enfoque-diferencial",
    },
    {
        "id": "marco-logico",
        "titulo": "Matriz de Marco Lógico y Proyectos",
        "descripcion": (
            "Mesa comunitaria con líderes y jóvenes formulando proyectos territoriales "
            "con la matriz de relatoría técnica."
        ),
        "archivo": "/images/hero/hero-marco-logico.webp",
        "thumbnail": "/images/hero/hero-marco-logico-thumb.webp",
        "enfoque": "Metodología Participativa & Comunitaria",
        "habilitada": True,
        "heroImageId": "marco-logico",
    },
    {
        "id": "mesa-deliberativa",
        "titulo": "Mesa Redonda y Concertación Temática",
        "descripcion": (
            "Trabajo deliberativo en equipo con carpetas, relatoría y concertación de compromisos ciudadanos."
        ),
        "archivo": "/images/hero/hero-mesa-deliberativa.webp",
        "thumbnail": "/images/hero/hero-mesa-deliberativa-thumb.webp",
        "enfoque": "Mesas Temáticas POLIS",
        "habilitada": True,
        "heroImageId": "mesa-deliberativa",
    },
    {
        "id": "ninguna",
        "titulo": "Solo Retícula Institucional",
        "descripcion": "Fondo minimalista oficial con retícula de puntos de alta legibilidad sin fotografía de fondo.",
        "archivo": "",
        "thumbnail": "",
        "enfoque": "Fondo Minimalista Oficial",
        "habilitada": True,
        "heroImageId": "ninguna",
    },
]


def _obtener_directorio_raiz() -> Path:
    actual = Path(__file__).resolve()
    for parent in actual.parents:
        if (parent / "package.json").exists() and (parent / "backend").exists():
            return parent
    return Path("/root/polis")


def _ruta_archivo_heros() -> Path:
    return _obtener_directorio_raiz() / "data" / "heros_config.json"


def _obtener_config_heros() -> dict:
    ruta = _ruta_archivo_heros()
    if ruta.exists():
        try:
            with open(ruta, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "slides" in data:
                    return data
        except Exception:
            logger.exception("Error al leer heros_config.json, usando valores por defecto")
    return {
        "slides": DEFAULT_HERO_SLIDES,
        "catalogoImagenes": DEFAULT_HERO_IMAGE_OPTIONS,
        "opacidad": 80,
        "modoCarrusel": True,
        "intervaloSegundos": 7,
        "heroImageId": "asamblea-claustro",
        "pageImages": {},
    }


def _guardar_config_heros(data: dict) -> None:
    ruta = _ruta_archivo_heros()
    ruta_dir = ruta.parent
    ruta_dir.mkdir(parents=True, exist_ok=True)
    ruta_tmp = ruta_dir / f"{ruta.name}.tmp"
    with open(ruta_tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    ruta_tmp.replace(ruta)


@router.get(
    "/heros",
    response_model=HerosConfigRead,
    summary="Obtener configuración y diapositivas de los Heros territoriales públicos",
)
async def obtener_heros_config() -> HerosConfigRead:
    config = _obtener_config_heros()
    return HerosConfigRead.model_validate(config)


@router.put(
    "/heros",
    response_model=HerosConfigRead,
    summary="Actualizar configuración y diapositivas de los Heros territoriales públicos",
    dependencies=[Depends(requerir_rol("autoridad_distrital", "administrador_identidades", "auditor_forense"))],
)
async def actualizar_heros_config(datos: HerosConfigUpdate) -> HerosConfigRead:
    payload = datos.model_dump(by_alias=True)
    _guardar_config_heros(payload)
    return HerosConfigRead.model_validate(payload)


@router.post(
    "/heros/subir-imagen",
    summary="Subir fotografía territorial para el Hero",
    dependencies=[Depends(requerir_rol("autoridad_distrital", "administrador_identidades", "auditor_forense"))],
)
async def subir_imagen_hero(
    archivo: Annotated[UploadFile, File()],
) -> dict:
    if not archivo.content_type or not archivo.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos de imagen (WebP, PNG, JPG, JPEG).",
        )
    extension = os.path.splitext(archivo.filename or "imagen.webp")[1].lower()
    if extension not in [".webp", ".png", ".jpg", ".jpeg"]:
        extension = ".webp"

    nuevo_nombre = f"hero-custom-{uuid.uuid4().hex[:10]}{extension}"
    base_dir = _obtener_directorio_raiz()

    dest_public = base_dir / "public" / "images" / "hero"
    dest_public.mkdir(parents=True, exist_ok=True)
    dest_file = dest_public / nuevo_nombre

    contenido = await archivo.read()
    with open(dest_file, "wb") as f:
        f.write(contenido)

    dest_standalone = base_dir / ".next" / "standalone" / "public" / "images" / "hero"
    if dest_standalone.exists():
        with open(dest_standalone / nuevo_nombre, "wb") as f:
            f.write(contenido)

    url_publica = f"/images/hero/{nuevo_nombre}"
    return {"url": url_publica, "nombre": nuevo_nombre}
