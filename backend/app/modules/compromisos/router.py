from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, Form, Query, Request, UploadFile, status

from app.core.database import SessionDependency
from app.modules.compromisos.dea_econometria_service import DeaEconometriaService
from app.modules.compromisos.ingesta_masiva_excel import detectar_extension_archivo
from app.modules.compromisos.ingesta_masiva_service import RAIZ_INGESTA, IngestaMasivaService
from app.modules.compromisos.inteligencia_triada_service import InteligenciaTriadaService
from app.modules.compromisos.pdd_dea_service import PddDeaService, pre_serialized_response
from app.modules.compromisos.repository import CompromisosRepository
from app.modules.compromisos.schemas import (
    ActividadPlanAccionActualizarSeguimiento,
    ActividadPlanAccionCrear,
    ActividadPlanAccionRespuesta,
    BancoConocimientoDNPRespuesta,
    CompromisoPASActualizar,
    CompromisoPASActualizarAvance,
    CompromisoPASCrear,
    CompromisoPASRespuesta,
    CruceTresLecturasRespuesta,
    CruzarTresLecturasSolicitud,
    DetectarFormatoPlanAccionSolicitud,
    KpisSeguimientoRespuesta,
    MatrizPlanAccionRespuesta,
    ProcesarLotePlanAccionRespuesta,
    ProcesarLotePlanAccionSolicitud,
    ResumenTriadaRespuesta,
    ValidarRedaccionRespuesta,
    ValidarRedaccionSolicitud,
)
from app.modules.compromisos.service import CompromisosService
from app.modules.compromisos.taxonomia_seguridad import DIMENSIONES, PERIODOS
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.politicas.gating import verificar_escritura_fase


@asynccontextmanager
async def _compromisos_lifespan(_app):
    from app.core.config import Settings

    settings = Settings()
    if settings.environment == "production":
        from app.core.database import Database

        database = Database(settings)
        try:
            async with database.sessions() as session:
                await InteligenciaTriadaService(session).resumen_ejecutivo()
        finally:
            await database.engine.dispose()
    yield


router = APIRouter(prefix="/compromisos", tags=["Compromisos PAS"], lifespan=_compromisos_lifespan)


def get_compromisos_service(session: SessionDependency) -> CompromisosService:
    return CompromisosService(CompromisosRepository(session))


CompromisosServiceDep = Annotated[CompromisosService, Depends(get_compromisos_service)]


@router.post(
    "/triada/ingerir-archivos",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Procesar libros Excel y ZIP de los tres motores de planeación",
)
async def ingerir_archivos_triada(
    files: Annotated[list[UploadFile], File(description="Libros .xlsx, .xls, .csv o .zip")],
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
    vigencia_por_defecto: Annotated[int | None, Form(ge=2016, le=2027)] = None,
    corte_por_defecto: Annotated[str | None, Form(max_length=20)] = None,
    persistir: Annotated[bool, Form()] = True,
):
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    if len(files) > 200:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=413, detail="El lote excede el máximo de 200 archivos adjuntos."
        )
    items = []
    total = 0
    for file in files:
        per_file_limit = (
            150 * 1024 * 1024
            if (file.filename or "").lower().endswith(".zip")
            else 25 * 1024 * 1024
        )
        data = await file.read(per_file_limit + 1)
        if len(data) > per_file_limit:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=413,
                detail="El archivo supera el límite permitido para su formato.",
            )
        total += len(data)
        if total > 150 * 1024 * 1024:
            from fastapi import HTTPException

            raise HTTPException(status_code=413, detail="El lote excede el máximo de 150 MiB.")
        items.append((file.filename or "sin_nombre", data))
        await file.close()
    origen = (
        "UPLOAD_ZIP_MASIVO"
        if any(name.lower().endswith(".zip") for name, _ in items)
        else "UPLOAD_ARCHIVO"
    )
    return await IngestaMasivaService(session).ingerir(
        items,
        origen=origen,
        vigencia=vigencia_por_defecto,
        corte=corte_por_defecto,
        persistir=persistir,
    )


@router.post(
    "/triada/ingerir-directorio",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Procesar un directorio local autorizado de planes de acción",
)
async def ingerir_directorio_triada(
    session: SessionDependency,
    sujeto: SujetoAutenticadoDep,
    subdirectorio: Annotated[str, Form()] = "",
    vigencia_por_defecto: Annotated[int | None, Form(ge=2016, le=2027)] = None,
    persistir: Annotated[bool, Form()] = True,
):
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    from fastapi import HTTPException

    candidate = (RAIZ_INGESTA / subdirectorio).resolve()
    if not candidate.is_relative_to(RAIZ_INGESTA) or ".." in Path(subdirectorio).parts:
        raise HTTPException(
            status_code=400, detail="La ruta debe permanecer dentro de data/planes_accion."
        )
    if not candidate.is_dir():
        raise HTTPException(status_code=404, detail="El directorio autorizado no existe.")
    paths = []
    for path in candidate.rglob("*"):
        if (
            not path.is_file()
            or not path.resolve().is_relative_to(RAIZ_INGESTA)
            or path.name.startswith(("~$", "."))
            or "__MACOSX" in path.parts
        ):
            continue
        if path.suffix.lower() in {".xlsx", ".xls", ".csv", ".zip"}:
            paths.append(path)
        elif not path.suffix and detectar_extension_archivo(path.name, path.read_bytes()) in {
            ".xlsx",
            ".xls",
        }:
            paths.append(path)
    paths.sort()
    if len(paths) > 200:
        raise HTTPException(
            status_code=413, detail="El directorio supera el máximo de 200 archivos."
        )
    total = sum(p.stat().st_size for p in paths)
    if total > 150 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El directorio supera el máximo de 150 MiB.")
    items = [(str(p.relative_to(RAIZ_INGESTA)), p.read_bytes()) for p in paths]
    return await IngestaMasivaService(session).ingerir(
        items, origen="DIRECTORIO_LOCAL", vigencia=vigencia_por_defecto, persistir=persistir
    )


@router.get("/triada/lotes", summary="Consultar lotes y cobertura de ingestión multiformato")
async def listar_lotes_triada(
    session: SessionDependency,
    limite: int = Query(50, ge=1, le=200),
    vigencia: int | None = Query(None, ge=2016, le=2027),
    entidad: str | None = Query(None, max_length=180),
    dimension: str | None = Query(None, max_length=120),
    periodo: str | None = Query(None, max_length=40),
):
    return await IngestaMasivaService(session).listar_lotes(
        limite, vigencia, entidad, dimension, periodo
    )


@router.get(
    "/triada/comparativa-interanual",
    summary="Consultar registros y cruces interanuales persistidos",
)
async def comparativa_interanual_triada(
    session: SessionDependency,
    entidad: str | None = Query(None, max_length=180),
    linea_estrategica: str | None = Query(None, max_length=250),
    codigo_bpim: str | None = Query(None, max_length=100),
    motor: str | None = Query(
        None, pattern="^(PLAN_DESARROLLO|PLAN_ACCION|INVERSION_PRESUPUESTAL)$"
    ),
    vigencia_desde: int = Query(2016, ge=2016, le=2027),
    vigencia_hasta: int = Query(2026, ge=2016, le=2027),
    dimension: str | None = Query(None, max_length=120),
    periodo: str | None = Query(None, max_length=40),
    corte: str | None = Query(None, max_length=20),
):
    if vigencia_desde > vigencia_hasta:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422, detail="vigencia_desde debe ser menor o igual a vigencia_hasta."
        )
    return await IngestaMasivaService(session).comparativa(
        entidad=entidad,
        linea=linea_estrategica,
        bpim=codigo_bpim,
        motor=motor,
        desde=vigencia_desde,
        hasta=vigencia_hasta,
        dimension=dimension,
        periodo=periodo,
        corte=corte,
    )


@router.get(
    "/triada/resumen",
    response_model=ResumenTriadaRespuesta,
    summary="Resumen de los motores articulados y el catálogo de transparencia",
)
async def obtener_resumen_triada_motores(
    service: CompromisosServiceDep,
    cuatrienio: str | None = Query(None, max_length=20),
    vigencia: int | None = Query(None, ge=2016, le=2027),
    entidad: str | None = Query(None, max_length=180),
    fuente: str | None = Query(None, max_length=40),
    dimension: str | None = Query(None, max_length=120),
    periodo: str | None = Query(None, max_length=40),
):
    """Consulta pública, agregada y de solo lectura para transparencia activa."""
    from fastapi import HTTPException

    if dimension and dimension not in DIMENSIONES:
        raise HTTPException(status_code=422, detail="Dimensión de seguridad humana no reconocida.")
    if periodo and periodo not in PERIODOS:
        raise HTTPException(status_code=422, detail="Periodo de gobierno no reconocido.")
    resumen = await service.obtener_resumen_triada(
        cuatrienio, vigencia, entidad, fuente, dimension, periodo
    )
    session = getattr(service.repo, "session", None)
    if session is not None:
        resumen["resumen_dimensiones_seguridad"] = await IngestaMasivaService(
            session
        ).resumen_dimensiones(dimension, periodo)
        resumen["ingesta_masiva"]["calidad_datos"] = await IngestaMasivaService(
            session
        ).calidad_datos()
    resumen["filtros"]["dimension"] = dimension
    resumen["filtros"]["periodo"] = periodo
    return resumen


@router.post(
    "/triada/detectar-formato",
    summary="Detectar y normalizar un Plan de Acción multiformato",
)
async def detectar_formato_plan_accion_multianual(
    datos: Annotated[DetectarFormatoPlanAccionSolicitud | str, Body()],
    service: CompromisosServiceDep,
):
    """Proceso sin persistencia; admite JSON con hojas o el código de una muestra."""
    return service.detectar_formato_plan_accion(datos)


@router.post(
    "/triada/cruzar-lecturas",
    response_model=CruceTresLecturasRespuesta,
    summary="Cruzar avance estratégico, físico operativo y ejecución presupuestal",
)
async def ejecutar_cruce_tres_lecturas(
    datos: CruzarTresLecturasSolicitud,
    service: CompromisosServiceDep,
):
    """Evalúa lotes suministrados por el cliente; no escribe datos institucionales."""
    return await service.cruzar_lecturas_triada(datos)


@router.get("", response_model=list[CompromisoPASRespuesta])
async def listar_compromisos(
    service: CompromisosServiceDep,
    busqueda: str | None = Query(None, description="Búsqueda libre por texto"),
    entidad: str | None = Query(None, description="Filtrar por entidad distrital"),
    estado: str | None = Query(None, description="Filtrar por estado"),
):
    """Listar compromisos institucionales del PAS Cartagena con filtros opcionales.

    NOTA DE AUDITORÍA FORENSE (Ley 1712/14 y Ley 1757/15):
    La lectura de compromisos institucionales, metas y avances es intencionalmente de acceso
    público irrestricto conforme al principio de máxima publicidad y transparencia activa.
    Las operaciones de escritura (POST, PATCH, PUT, DELETE) requieren obligatoriamente
    el permiso institucional 'seguimiento:gestionar'.
    """
    return await service.listar_compromisos(busqueda=busqueda, entidad=entidad, estado=estado)


@router.get("/kpis", response_model=KpisSeguimientoRespuesta)
async def obtener_kpis_seguimiento(service: CompromisosServiceDep):
    """Obtener KPIs consolidados de seguimiento del PAS (acceso público para veedurías cívicas)."""
    return await service.obtener_kpis()


# =============================================================================
# ENDPOINTS MOTOR DE PLANES DE ACCIÓN DNP / SISPT (LEY 152/94 · LEY 1474/11)
# =============================================================================


@router.get(
    "/plan-accion/banco-conocimiento",
    response_model=BancoConocimientoDNPRespuesta,
    summary="Banco de Conocimiento Metodológico y Normativo DNP / SisPT",
)
async def obtener_banco_conocimiento_dnp(service: CompromisosServiceDep):
    """Consulta pública del Banco de Conocimiento oficial DNP: marco normativo,
    cadena de articulación (PDT -> PI -> POAI -> MFMP -> PAC), 7 pasos de elaboración,
    taxonomía de metas/actividades y catálogo de verbos fuertes en infinitivo."""
    return service.obtener_banco_conocimiento()


@router.post(
    "/plan-accion/validar-redaccion",
    response_model=ValidarRedaccionRespuesta,
    summary="Validador Lingüístico Oficial DNP de Actividades",
)
async def validar_redaccion_actividad_dnp(
    datos: ValidarRedaccionSolicitud, service: CompromisosServiceDep
):
    """Verifica que la redacción cumpla la regla DNP del verbo fuerte en infinitivo.

    También detecta los 16 verbos débiles prohibidos (Instructivo DNP, pág. 12).
    """
    return service.validar_redaccion_dnp(datos.descripcion_actividad, datos.tipo_actividad)


@router.post(
    "/plan-accion/procesar-lote",
    response_model=ProcesarLotePlanAccionRespuesta,
    summary="Procesador y Auditor Metodológico de Lotes DNP (Hoja 2 PI -> Hoja 1 PA)",
)
async def procesar_lote_plan_accion_dnp(
    datos: ProcesarLotePlanAccionSolicitud, service: CompromisosServiceDep
):
    """Procesamiento por lotes y auditoría metodológica oficial DNP:
    Cruce automático Hoja 2 (Plan_Indicativo) -> Hoja 1 (Plan_Accion),
    validación de verbos fuertes en infinitivo (con redacción corregida en 1 clic),
    verificación de coherencia de fuentes de financiación (Pág. 13 DNP),
    cálculo de avance físico/ejecución financiera con alertas de desfase
    y emisión del dictamen oficial para aprobación en Consejo de Gobierno (Art. 41 Ley 152/94)."""
    return await service.procesar_lote_plan_accion(datos)


@router.get(
    "/plan-accion/matriz",
    response_model=MatrizPlanAccionRespuesta,
    summary="Matriz Oficial del Plan de Acción (Hoja 1 PA + Hoja 2 Plan Indicativo)",
)
async def obtener_matriz_plan_accion_dnp(
    service: CompromisosServiceDep,
    vigencia: int | None = Query(None, description="Filtrar por vigencia fiscal (ej. 2026)"),
    entidad: str | None = Query(None, description="Filtrar por secretaría u organismo responsable"),
    linea_codigo: str | None = Query(None, description="Filtrar por línea estratégica"),
    tipo_meta: str | None = Query(
        None, description="Filtrar por tipo de meta (META_PRODUCTO, META_GESTION, ACTIVIDAD)"
    ),
    tipo_actividad: str | None = Query(None, description="Filtrar por tipo de actividad"),
    categoria_recursos: str | None = Query(None, description="Filtrar por categoría de recursos"),
    fuente_financiacion: str | None = Query(None, description="Filtrar por fuente de financiación"),
    busqueda: str | None = Query(None, description="Búsqueda libre por texto"),
):
    """Consulta pública de la Matriz Oficial DNP: Resumen Ejecutivo con semáforo de alertas,
    Hoja 1 contiene actividades anuales; Hoja 2 articula compromisos del Plan Indicativo.
    """
    return await service.obtener_matriz_plan_accion(
        vigencia=vigencia,
        entidad=entidad,
        linea_codigo=linea_codigo,
        tipo_meta=tipo_meta,
        tipo_actividad=tipo_actividad,
        categoria_recursos=categoria_recursos,
        fuente_financiacion=fuente_financiacion,
        busqueda=busqueda,
    )


@router.post(
    "/plan-accion/actividades",
    response_model=ActividadPlanAccionRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Crear Actividad en el Plan de Acción con Validación DNP",
)
async def crear_actividad_plan_accion(
    datos: ActividadPlanAccionCrear,
    service: CompromisosServiceDep,
    sujeto: SujetoAutenticadoDep,
    session: SessionDependency,
):
    """Crea una actividad en el Plan de Acción tras validación lingüística DNP."""
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    return await service.crear_actividad(datos, actor_id=sujeto.sujeto_id)


@router.patch(
    "/plan-accion/actividades/{id_o_codigo}/seguimiento",
    response_model=ActividadPlanAccionRespuesta,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Actualizar Seguimiento Trimestral de Actividad en Plan de Acción",
)
async def actualizar_seguimiento_actividad_pa(
    id_o_codigo: str,
    datos: ActividadPlanAccionActualizarSeguimiento,
    service: CompromisosServiceDep,
    sujeto: SujetoAutenticadoDep,
    session: SessionDependency,
):
    """Actualiza avances trimestrales, ejecución presupuestal y evidencias."""
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    return await service.actualizar_seguimiento_actividad(
        id_o_codigo, datos, actor_id=sujeto.sujeto_id
    )


# =============================================================================
# CONSULTA Y OPERACIONES POR ID / CÓDIGO DE COMPROMISOS PAS
# =============================================================================


@router.get("/{id_o_codigo}", response_model=CompromisoPASRespuesta)
async def obtener_compromiso(id_o_codigo: str, service: CompromisosServiceDep):
    """Consultar un compromiso por UUID o código institucional para control social."""
    return await service.obtener_compromiso(id_o_codigo)


@router.post(
    "",
    response_model=CompromisoPASRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
)
async def crear_compromiso(
    datos: CompromisoPASCrear,
    service: CompromisosServiceDep,
    sujeto: SujetoAutenticadoDep,
    session: SessionDependency,
):
    """Crear un nuevo compromiso en el Plan de Acción y Seguimiento con registro de auditoría."""
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    return await service.crear_compromiso(datos, actor_id=sujeto.sujeto_id)


@router.patch(
    "/{id_o_codigo}/avance",
    response_model=CompromisoPASRespuesta,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
)
async def actualizar_avance(
    id_o_codigo: str,
    datos: CompromisoPASActualizarAvance,
    service: CompromisosServiceDep,
    sujeto: SujetoAutenticadoDep,
    session: SessionDependency,
):
    """Actualizar el avance con registro de auditoría forense."""
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    return await service.actualizar_avance(id_o_codigo, datos, actor_id=sujeto.sujeto_id)


@router.put(
    "/{id_o_codigo}",
    response_model=CompromisoPASRespuesta,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
)
async def actualizar_compromiso(
    id_o_codigo: str,
    datos: CompromisoPASActualizar,
    service: CompromisosServiceDep,
    sujeto: SujetoAutenticadoDep,
    session: SessionDependency,
):
    """Actualizar campos generales de un compromiso institucional."""
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    return await service.actualizar_compromiso(id_o_codigo, datos, actor_id=sujeto.sujeto_id)


@router.delete(
    "/{id_o_codigo}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
)
async def eliminar_compromiso(
    id_o_codigo: str,
    service: CompromisosServiceDep,
    sujeto: SujetoAutenticadoDep,
    session: SessionDependency,
):
    """Eliminar un compromiso institucional con registro previo en auditoría forense."""
    await verificar_escritura_fase("FASE_3_PLAN_ACCION", sujeto, session)
    await service.eliminar_compromiso(id_o_codigo, actor_id=sujeto.sujeto_id)


def _validar_filtros_inteligencia(dimension: str | None = None, periodo: str | None = None) -> None:
    from fastapi import HTTPException

    if dimension and dimension not in DIMENSIONES:
        raise HTTPException(status_code=422, detail="Dimensión de seguridad humana no reconocida.")
    if periodo and periodo not in PERIODOS:
        raise HTTPException(status_code=422, detail="Periodo de gobierno no reconocido.")


@router.get("/triada/inteligencia/patologias-dnp", summary="Patologías DNP y efecto espejismo")
async def inteligencia_patologias_dnp(
    session: SessionDependency,
    vigencia: int | None = Query(None, ge=2016, le=2027),
    periodo: str | None = Query(None, max_length=20),
    dimension: str | None = Query(None, max_length=120),
    entidad: str | None = Query(None, max_length=180),
):
    _validar_filtros_inteligencia(dimension, periodo)
    return await InteligenciaTriadaService(session).patologias_dnp(
        vigencia=vigencia, periodo=periodo, dimension=dimension, entidad=entidad
    )


@router.get(
    "/triada/inteligencia/continuidad-gobiernos", summary="Continuidad y ruptura entre gobiernos"
)
async def inteligencia_continuidad_gobiernos(
    session: SessionDependency,
    dimension: str | None = Query(None, max_length=120),
    entidad: str | None = Query(None, max_length=180),
):
    _validar_filtros_inteligencia(dimension)
    return await InteligenciaTriadaService(session).continuidad_gobiernos(
        dimension=dimension, entidad=entidad
    )


@router.get("/triada/inteligencia/radar-transparencia", summary="Radar de cortes y completitud")
async def inteligencia_radar_transparencia(
    session: SessionDependency,
    entidad: str | None = Query(None, max_length=180),
    vigencia: int | None = Query(None, ge=2016, le=2027),
):
    return await InteligenciaTriadaService(session).radar_transparencia(
        entidad=entidad, vigencia=vigencia
    )


@router.get(
    "/triada/inteligencia/alineacion-territorial", summary="Inversión, delitos y demanda ciudadana"
)
async def inteligencia_alineacion_territorial(session: SessionDependency):
    return await InteligenciaTriadaService(session).alineacion_territorial()


@router.get("/triada/inteligencia/buscador", summary="Buscador semántico e inspector de duplicidad")
async def inteligencia_buscador(
    session: SessionDependency,
    q: str = Query("seguridad", min_length=2, max_length=200),
    vigencia: int | None = Query(None, ge=2016, le=2027),
    periodo: str | None = Query(None, max_length=20),
    dimension: str | None = Query(None, max_length=120),
    motor: str | None = Query(
        None, pattern="^(PLAN_DESARROLLO|PLAN_ACCION|INVERSION_PRESUPUESTAL)$"
    ),
    limite: int = Query(50, ge=1, le=200),
):
    _validar_filtros_inteligencia(dimension, periodo)
    return await InteligenciaTriadaService(session).buscador(
        q=q, vigencia=vigencia, periodo=periodo, dimension=dimension, motor=motor, limite=limite
    )


@router.get(
    "/triada/inteligencia/simulador-cierre", summary="Proyección de cierre de gobierno 2027"
)
async def inteligencia_simulador_cierre(
    session: SessionDependency,
    entidad: str | None = Query(None, max_length=180),
    dimension: str | None = Query(None, max_length=120),
):
    _validar_filtros_inteligencia(dimension)
    return await InteligenciaTriadaService(session).simulador_cierre(
        entidad=entidad, dimension=dimension
    )


@router.get(
    "/triada/inteligencia/resumen-ejecutivo", summary="Resumen consolidado de los seis motores"
)
async def inteligencia_resumen_ejecutivo(session: SessionDependency):
    return await InteligenciaTriadaService(session).resumen_ejecutivo()


@router.get("/triada/dea/auditoria-saneamiento", summary="Auditoría DEA del corpus y sus escalas")
async def dea_auditoria_saneamiento(session: SessionDependency):
    return await DeaEconometriaService(session).auditoria_saneamiento()


@router.get("/triada/dea/frontera-eficiencia", summary="Frontera DEA y metas de eficiencia")
async def dea_frontera_eficiencia(
    session: SessionDependency,
    vigencia: int = Query(2025, ge=2020, le=2026),
    modo: str = Query("nucleo_1x2", pattern="^(nucleo_1x2|extendido_2x3|extendida_2x3)$"),
    insumo: str = Query("apropiacion", pattern="^(apropiacion|pagos)$"),
):
    return await DeaEconometriaService(session).frontera_eficiencia(
        vigencia=vigencia, modo=modo, insumo=insumo
    )


@router.get("/triada/dea/malmquist", summary="Productividad Malmquist de años cerrados")
async def dea_malmquist(
    session: SessionDependency,
    desde: int = Query(2020, ge=2020, le=2025),
    hasta: int = Query(2025, ge=2020, le=2025),
):
    from fastapi import HTTPException

    if hasta <= desde:
        raise HTTPException(status_code=422, detail="hasta debe ser mayor que desde")
    return await DeaEconometriaService(session).malmquist(desde=desde, hasta=hasta)


@router.get("/triada/dea/econometria-segunda-etapa", summary="Segunda etapa y pruebas DEA")
async def dea_econometria_segunda_etapa(session: SessionDependency):
    return await DeaEconometriaService(session).econometria_segunda_etapa()


@router.get("/triada/dea/resumen-integral", summary="Resumen integral del laboratorio DEA")
async def dea_resumen_integral(session: SessionDependency):
    return await DeaEconometriaService(session).resumen_integral()


@router.get(
    "/triada/pdd-dea/catalogo-y-conciliacion-ppi",
    summary="Catálogo de planes y conciliación del PPI",
)
async def pdd_dea_catalogo(request: Request, session: SessionDependency):
    payload = await PddDeaService(session).catalogo_y_conciliacion_ppi()
    return pre_serialized_response(
        "pdd-dea/catalogo", payload, request.headers.get("if-none-match")
    )


@router.get("/triada/pdd-dea/cumplimiento-metas", summary="Cumplimiento deduplicado de metas PDD")
async def pdd_dea_cumplimiento(
    request: Request,
    session: SessionDependency,
    plan: str | None = Query(None, pattern="^(PDD_2016_2019|PDD_2020_2023|PDD_2024_2027|TODOS)$"),
):
    service = PddDeaService(session)
    payload = await service.cumplimiento_metas(plan=plan)
    key = f"pdd-dea/cumplimiento/{plan or 'TODOS'}"
    return pre_serialized_response(key, payload, request.headers.get("if-none-match"))


@router.get(
    "/triada/pdd-dea/frontera-dea-pdd", summary="Frontera DEA exploratoria por plan de desarrollo"
)
async def pdd_dea_frontera(
    request: Request,
    session: SessionDependency,
    plan: str | None = Query(None, pattern="^(PDD_2016_2019|PDD_2020_2023|PDD_2024_2027|TODOS)$"),
    insumo: str = Query("conciliado_ppi", pattern="^(conciliado_ppi|reportado)$"),
):
    service = PddDeaService(session)
    payload = await service.frontera_dea_pdd(plan=plan, insumo=insumo)
    key = f"pdd-dea/frontera/{plan or 'TODOS'}/{insumo}"
    return pre_serialized_response(key, payload, request.headers.get("if-none-match"))


@router.get(
    "/triada/pdd-dea/econometria-comparada-pdd",
    summary="Comparación econométrica descriptiva entre PDD",
)
async def pdd_dea_econometria(request: Request, session: SessionDependency):
    payload = await PddDeaService(session).econometria_comparada_pdd()
    return pre_serialized_response(
        "pdd-dea/econometria", payload, request.headers.get("if-none-match")
    )


@router.get(
    "/triada/pdd-dea/explorador-programas-y-seguridad-humana",
    summary="Explorador oficial de programas y monitor de Seguridad Humana",
)
async def pdd_dea_explorador(request: Request, session: SessionDependency):
    payload = await PddDeaService(session).explorador_programas_y_seguridad_humana()
    return pre_serialized_response(
        "pdd-dea/explorador", payload, request.headers.get("if-none-match")
    )


@router.get(
    "/triada/pdd-dea/resumen-ejecutivo", summary="Resumen ejecutivo del laboratorio PDD DEA"
)
async def pdd_dea_resumen(request: Request, session: SessionDependency):
    payload = await PddDeaService(session).resumen_ejecutivo()
    return pre_serialized_response("pdd-dea/resumen", payload, request.headers.get("if-none-match"))


@router.get(
    "/triada/pdd-dea/laboratorio-prescriptivo",
    summary="Laboratorio prescriptivo PDD con Network DEA, escenarios y trazabilidad",
)
async def pdd_dea_laboratorio_prescriptivo(request: Request, session: SessionDependency):
    payload = await PddDeaService(session).laboratorio_prescriptivo_pdd()
    return pre_serialized_response(
        "pdd-dea/laboratorio-prescriptivo", payload, request.headers.get("if-none-match")
    )
