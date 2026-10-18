import hashlib
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.engine import make_url

from app.core.database import SessionDependency
from app.modules.compromisos.agentes_inteligentes_pdd import (
    ConsultaAgentesPDD,
    InterpretarFragmentoPDD,
    arquitectura_agentes_ia,
    ejecutar_consulta_pdd,
    interpretar_fragmento,
)
from app.modules.compromisos.dea_econometria_service import DeaEconometriaService
from app.modules.compromisos.google_workspace_sync_service import (
    CHART_DIR,
    CHART_NAMES,
    GoogleWorkspaceSyncService,
)
from app.modules.compromisos.ingesta_masiva_excel import detectar_extension_archivo
from app.modules.compromisos.ingesta_masiva_service import RAIZ_INGESTA, IngestaMasivaService
from app.modules.compromisos.inteligencia_triada_service import InteligenciaTriadaService
from app.modules.compromisos.motor_multiagente_pdd import (
    AgenteArticulacionPlanAccionBPIM,
    ejecutar_sistema_multiagente_pdd,
    obtener_estado_sistema_multiagente_pdd,
)
from app.modules.compromisos.pdd_dea_service import (
    PddDeaService,
    _cached,
    _read_disk_cache,
    obtener_dea_cartagena_4_niveles,
    obtener_tablero_dea_cartagena,
    pre_serialized_response,
)
from app.modules.compromisos.pdt_dictamen_ejecutivo import generar_dictamen_ejecutivo_pdt
from app.modules.compromisos.pdt_persistencia_pg import (
    listar_dictamenes_hallazgos_pdt_pg,
    obtener_historial_auditoria_pdt_pg,
    registrar_dictamen_hallazgo_pdt_pg,
)
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
    HoshinKanriEspecificacionRespuesta,
    HoshinKanriMatrizXRespuesta,
    KpisSeguimientoRespuesta,
    MatrizPlanAccionRespuesta,
    PdtAiEvaluatorEjecutarRequest,
    PdtAiEvaluatorValidarCheckpointRequest,
    PdtAiInformeIntegralSpdResponse,
    PdtDea4NivelesCartagenaRespuesta,
    PdtDictamenEjecutivoRespuesta,
    PdtDictamenesHallazgosRespuesta,
    PdtDictaminarHallazgoRequest,
    PdtDictaminarHallazgoRespuesta,
    PdtHistorialAuditoriaRespuesta,
    PdtRevisionPorMetaRespuesta,
    PdtTableroAlcaldeArmonizacionDeaRespuesta,
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

try:
    from .pdt_ai_evaluator_graph import (
        ejecutar_pdt_ai_evaluator,
        obtener_especificacion_pdt_ai_evaluator,
        validar_checkpoint_pdt_ai_evaluator,
    )
except ImportError:  # pragma: no cover - cargado perezosamente si aún está en construcción
    ejecutar_pdt_ai_evaluator = None  # type: ignore[assignment]
    obtener_especificacion_pdt_ai_evaluator = None  # type: ignore[assignment]
    validar_checkpoint_pdt_ai_evaluator = None  # type: ignore[assignment]

# Workers load their durable PDD payload index during import, before accepting requests.
_read_disk_cache()


async def _precargar_caches_pesados(session=None) -> None:
    try:
        cache_pdt = (
            Path(__file__).resolve().parents[4]
            / "data"
            / "planes_desarrollo"
            / "cache_pdt_ai_evaluator.json"
        )
        if cache_pdt.is_file():
            from .pdt_ai_evaluator_graph import (
                ejecutar_pdt_ai_evaluator as _warm_pdt_ai_evaluator,
            )

            await _warm_pdt_ai_evaluator(session, force_refresh=False)
    except Exception:
        pass


@asynccontextmanager
async def _compromisos_lifespan(_app):
    from app.core.config import Settings

    settings = Settings()
    if settings.environment == "production":
        # Parse the durable payload index before declaring the worker ready so the
        # first request does not pay the JSON disk-load cost.
        _read_disk_cache()
        from sqlalchemy import text

        from app.core.database import Database

        database = getattr(_app.state, "database", None)
        owns_database = database is None
        if owns_database:
            database = Database(settings)
        try:
            async with database.sessions() as session:
                await session.execute(text("SELECT 1"))
                pdd = PddDeaService(session)
                await pdd.catalogo_y_conciliacion_ppi()
                await pdd.cumplimiento_metas()
                await pdd.frontera_dea_pdd()
                await pdd.econometria_comparada_pdd()
                await pdd.explorador_programas_y_seguridad_humana()
                await pdd.laboratorio_prescriptivo_pdd()
                await pdd.resumen_ejecutivo()
                await pdd.comparativo_seguridad_humana_pdd_only(incluir_detalle=False)
                inteligencia = InteligenciaTriadaService(session)
                await inteligencia.patologias_dnp()
                await inteligencia.continuidad_gobiernos()
                await inteligencia.radar_transparencia()
                await inteligencia.alineacion_territorial()
                await inteligencia.simulador_cierre()
                await inteligencia.resumen_ejecutivo()
                await _precargar_caches_pesados(session)
        finally:
            if owns_database:
                await database.engine.dispose()
    yield


router = APIRouter(prefix="/compromisos", tags=["Compromisos PAS"], lifespan=_compromisos_lifespan)


def _pdd_bind_key(request: Request) -> str:
    return str(make_url(request.app.state.settings.async_database_url))


def _pdd_http_cache_key(request: Request, key: str) -> str:
    scope = hashlib.sha256(_pdd_bind_key(request).encode()).hexdigest()
    return f"{scope}/{key}"


async def _pdd_payload(request: Request, cache_parts: tuple[str, ...], method: str, **kwargs):
    key = (_pdd_bind_key(request), *cache_parts)
    if cached := _cached(key):
        return cached
    async with request.app.state.database.sessions() as session:
        return await getattr(PddDeaService(session), method)(**kwargs)


@router.get(
    "/triada/google-workspace/graficas/{nombre_archivo}",
    summary="Servir gráficas PNG públicas del informe técnico de diagnóstico",
    include_in_schema=True,
)
async def google_workspace_grafica(nombre_archivo: str):
    if nombre_archivo not in CHART_NAMES:
        raise HTTPException(status_code=404, detail="Gráfica no encontrada")
    path = CHART_DIR / nombre_archivo
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Gráfica aún no generada")
    return FileResponse(path, media_type="image/png", filename=nombre_archivo)


@router.get(
    "/triada/google-workspace/estado",
    summary="Estado de carpetas y archivos nativos de Google Workspace",
)
async def google_workspace_estado():
    return await GoogleWorkspaceSyncService().obtener_estado_workspace()


@router.post(
    "/triada/google-workspace/sincronizar",
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Publicar matrices y análisis de Triada en los archivos nativos existentes",
)
async def google_workspace_sincronizar(session: SessionDependency, sujeto: SujetoAutenticadoDep):
    return await GoogleWorkspaceSyncService(session).sincronizar_workspace()


@router.post(
    "/triada/google-workspace/sincronizar-pdd-only",
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Publicar exclusivamente la comparación PDD y el anexo PDL separado",
)
async def google_workspace_sincronizar_pdd_only(
    session: SessionDependency, sujeto: SujetoAutenticadoDep
):
    return await GoogleWorkspaceSyncService(session).sincronizar_pdd_only()


@router.get(
    "/triada/pdd-dea/seguridad-humana-comparativo",
    summary="Comparación de estructura, PPI y metas PDD por frontalidad y siete dimensiones",
)
async def pdd_seguridad_humana_comparativo(
    request: Request,
    incluir_detalle: bool = Query(False, description="Incluir arreglos crudos de nodos y metas"),
):
    if incluir_detalle:
        async with request.app.state.database.sessions() as session:
            payload = await PddDeaService(session).comparativo_seguridad_humana_pdd_only(
                incluir_detalle=True
            )
    else:
        payload = await _pdd_payload(
            request,
            ("pdd-dea", "comparativo-sh", "resumen"),
            "comparativo_seguridad_humana_pdd_only",
            incluir_detalle=False,
        )
    if not incluir_detalle:
        return pre_serialized_response(
            _pdd_http_cache_key(request, "pdd-dea/comparativo-sh/resumen"),
            payload,
            request.headers.get("if-none-match"),
        )
    return pre_serialized_response(
        _pdd_http_cache_key(request, "pdd-dea/comparativo-seguridad-humana/detalle"),
        payload,
        request.headers.get("if-none-match"),
    )


@router.post(
    "/triada/pdd-dea/ejecutar-sistema-multiagente",
    dependencies=[Depends(requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada"))],
    summary="Absorber PDD/PDL, reconstruir el diagnóstico y actualizar Matriz_PDM y Analisis",
)
async def ejecutar_multiagente_pdd(sujeto: SujetoAutenticadoDep):
    return await ejecutar_sistema_multiagente_pdd(publicar=True, persistir=True)


@router.get(
    "/triada/pdd-dea/estado-sistema-multiagente",
    summary="Consultar cobertura, puertas de calidad y bitácora de los cinco agentes PDD",
)
async def estado_multiagente_pdd():
    state = await obtener_estado_sistema_multiagente_pdd()
    state["motor_cognitivo_ia"] = {
        "activo": True,
        "orquestador": "LangGraph StateGraph",
        "framework_agentes": "PydanticAI",
        "agentes_cognitivos": 6,
        "herramientas_bd": 5,
    }
    return state


@router.get(
    "/triada/pdd-dea/arquitectura-agentes-ia",
    summary="Especificación y cobertura viva del motor cognitivo neurosimbólico PDD",
)
async def arquitectura_motor_agentes_pdd(session: SessionDependency):
    return await arquitectura_agentes_ia(session)


@router.post(
    "/triada/pdd-dea/consultar-agentes-pdd",
    summary="Consultar PDD/PDL mediante agentes PydanticAI y grafo LangGraph",
)
async def consultar_agentes_pdd(
    consulta: ConsultaAgentesPDD,
    session: SessionDependency,
):
    return await ejecutar_consulta_pdd(session, consulta)


@router.post(
    "/triada/pdd-dea/interpretar-fragmento-pdd",
    summary="Interpretar un fragmento PDD con extracción MGA/CREMA y taxonomía SH",
)
async def interpretar_fragmento_pdd(
    solicitud: InterpretarFragmentoPDD,
    session: SessionDependency,
):
    return await interpretar_fragmento(session, solicitud)


@router.get(
    "/triada/pdd-dea/cruce-multiagente-pa-bpim",
    summary="Cruce PDD/PDL, Planes de Acción y cadena MGA/BPIM",
)
async def cruce_multiagente_pa_bpim():
    return await AgenteArticulacionPlanAccionBPIM().ejecutar()


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
async def pdd_dea_catalogo(request: Request):
    payload = await _pdd_payload(request, ("pdd-dea", "catalogo"), "catalogo_y_conciliacion_ppi")
    return pre_serialized_response(
        _pdd_http_cache_key(request, "pdd-dea/catalogo"),
        payload,
        request.headers.get("if-none-match"),
    )


@router.get("/triada/pdd-dea/cumplimiento-metas", summary="Cumplimiento deduplicado de metas PDD")
async def pdd_dea_cumplimiento(
    request: Request,
    plan: str | None = Query(None, pattern="^(PDD_2016_2019|PDD_2020_2023|PDD_2024_2027|TODOS)$"),
):
    payload = await _pdd_payload(
        request,
        ("pdd-dea", "cumplimiento", plan or "TODOS"),
        "cumplimiento_metas",
        plan=plan,
    )
    key = f"pdd-dea/cumplimiento/{plan or 'TODOS'}"
    return pre_serialized_response(
        _pdd_http_cache_key(request, key), payload, request.headers.get("if-none-match")
    )


@router.get(
    "/triada/pdd-dea/frontera-dea-pdd", summary="Frontera DEA exploratoria por plan de desarrollo"
)
async def pdd_dea_frontera(
    request: Request,
    plan: str | None = Query(None, pattern="^(PDD_2016_2019|PDD_2020_2023|PDD_2024_2027|TODOS)$"),
    insumo: str = Query("conciliado_ppi", pattern="^(conciliado_ppi|reportado)$"),
):
    payload = await _pdd_payload(
        request,
        ("pdd-dea", "frontera", plan or "TODOS", insumo),
        "frontera_dea_pdd",
        plan=plan,
        insumo=insumo,
    )
    key = f"pdd-dea/frontera/{plan or 'TODOS'}/{insumo}"
    return pre_serialized_response(
        _pdd_http_cache_key(request, key), payload, request.headers.get("if-none-match")
    )


@router.get(
    "/triada/pdd-dea/econometria-comparada-pdd",
    summary="Comparación econométrica descriptiva entre PDD",
)
async def pdd_dea_econometria(request: Request):
    payload = await _pdd_payload(request, ("pdd-dea", "econometria"), "econometria_comparada_pdd")
    return pre_serialized_response(
        _pdd_http_cache_key(request, "pdd-dea/econometria"),
        payload,
        request.headers.get("if-none-match"),
    )


@router.get(
    "/triada/pdd-dea/explorador-programas-y-seguridad-humana",
    summary="Explorador oficial de programas y monitor de Seguridad Humana",
)
async def pdd_dea_explorador(request: Request):
    payload = await _pdd_payload(
        request,
        ("pdd-dea", "explorador"),
        "explorador_programas_y_seguridad_humana",
    )
    return pre_serialized_response(
        _pdd_http_cache_key(request, "pdd-dea/explorador"),
        payload,
        request.headers.get("if-none-match"),
    )


@router.get(
    "/triada/pdd-dea/resumen-ejecutivo", summary="Resumen ejecutivo del laboratorio PDD DEA"
)
async def pdd_dea_resumen(request: Request):
    payload = await _pdd_payload(request, ("pdd-dea", "resumen"), "resumen_ejecutivo")
    return pre_serialized_response(
        _pdd_http_cache_key(request, "pdd-dea/resumen"),
        payload,
        request.headers.get("if-none-match"),
    )


@router.get(
    "/triada/pdd-dea/laboratorio-prescriptivo",
    summary="Laboratorio prescriptivo PDD con Network DEA, escenarios y trazabilidad",
)
async def pdd_dea_laboratorio_prescriptivo(request: Request):
    payload = await _pdd_payload(
        request,
        ("pdd-dea", "laboratorio-prescriptivo"),
        "laboratorio_prescriptivo_pdd",
    )
    return pre_serialized_response(
        _pdd_http_cache_key(request, "pdd-dea/laboratorio-prescriptivo"),
        payload,
        request.headers.get("if-none-match"),
    )


def _cargar_pdt_ai_evaluator_fns():
    global ejecutar_pdt_ai_evaluator
    global obtener_especificacion_pdt_ai_evaluator
    global validar_checkpoint_pdt_ai_evaluator
    if (
        obtener_especificacion_pdt_ai_evaluator is None
        or ejecutar_pdt_ai_evaluator is None
        or validar_checkpoint_pdt_ai_evaluator is None
    ):
        from . import pdt_ai_evaluator_graph as _pdt_mod

        ejecutar_pdt_ai_evaluator = _pdt_mod.ejecutar_pdt_ai_evaluator
        obtener_especificacion_pdt_ai_evaluator = _pdt_mod.obtener_especificacion_pdt_ai_evaluator
        validar_checkpoint_pdt_ai_evaluator = _pdt_mod.validar_checkpoint_pdt_ai_evaluator
    return (
        obtener_especificacion_pdt_ai_evaluator,
        ejecutar_pdt_ai_evaluator,
        validar_checkpoint_pdt_ai_evaluator,
    )


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/especificacion",
    summary="Especificación arquitectónica y metodológica GBR/LangGraph del motor PDT-AI-EVALUATOR",
)
async def pdt_ai_evaluator_especificacion():
    import inspect

    fn_espec, _, _ = _cargar_pdt_ai_evaluator_fns()
    resultado = fn_espec()
    if inspect.isawaitable(resultado):
        return await resultado
    return resultado


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/diagnostico",
    summary="Diagnóstico multidimensional PDT-AI-EVALUATOR (DEA, NLP, LISA, Predictivo e ISRI)",
)
async def pdt_ai_evaluator_diagnostico(
    db: SessionDependency,
    thread_id: str = Query(default="pdt-cartagena-2024-2027"),
    force_refresh: bool = Query(default=False),
):
    _, fn_ejecutar, _ = _cargar_pdt_ai_evaluator_fns()
    return await fn_ejecutar(db, thread_id=thread_id, force_refresh=force_refresh)


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/dictamen-ejecutivo",
    response_model=PdtDictamenEjecutivoRespuesta,
    summary="Dictamen pericial ejecutivo PDT por dependencia y sector GBR",
)
async def pdt_ai_evaluator_dictamen_ejecutivo(
    db: SessionDependency,
    dependencia: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    force_refresh: bool = Query(default=False),
):
    _, fn_ejecutar, _ = _cargar_pdt_ai_evaluator_fns()
    diagnostico = await fn_ejecutar(db, force_refresh=force_refresh)
    return generar_dictamen_ejecutivo_pdt(diagnostico, dependencia=dependencia, sector=sector)


@router.post(
    "/triada/pdd-dea/pdt-ai-evaluator/ejecutar",
    summary="Ejecutar grafo de estados LangGraph PDT-AI-EVALUATOR sobre el corpus territorial",
)
async def pdt_ai_evaluator_ejecutar(
    db: SessionDependency,
    payload: Annotated[PdtAiEvaluatorEjecutarRequest | None, Body()] = None,
):
    req = payload or PdtAiEvaluatorEjecutarRequest()
    _, fn_ejecutar, _ = _cargar_pdt_ai_evaluator_fns()
    return await fn_ejecutar(
        db,
        jurisdiction=req.jurisdiction,
        time_horizon=req.time_horizon,
        thread_id=req.thread_id,
        force_refresh=req.force_refresh,
    )


@router.post(
    "/triada/pdd-dea/pdt-ai-evaluator/checkpoint/validar",
    summary="Intervención Human-in-the-Loop sobre el Checkpointer del grafo PDT-AI-EVALUATOR",
)
async def pdt_ai_evaluator_validar_checkpoint(
    payload: PdtAiEvaluatorValidarCheckpointRequest,
):
    import inspect

    _, _, fn_validar = _cargar_pdt_ai_evaluator_fns()
    resultado = fn_validar(
        payload.thread_id,
        aprobado=payload.aprobado,
        auditor=payload.auditor,
        observaciones=payload.observaciones,
    )
    if inspect.isawaitable(resultado):
        return await resultado
    return resultado


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/historial-auditoria",
    response_model=PdtHistorialAuditoriaRespuesta,
    summary="Historial transaccional PostgreSQL de corridas PDT-AI-EVALUATOR y auditoría HITL",
)
async def pdt_ai_evaluator_historial_auditoria(
    db: SessionDependency,
    thread_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    return await obtener_historial_auditoria_pdt_pg(db, thread_id=thread_id, limit=limit)


@router.post(
    "/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta/dictaminar-hallazgo",
    response_model=PdtDictaminarHallazgoRespuesta,
    summary="Registrar dictamen y acción PDCA para un hallazgo de meta",
)
async def pdt_ai_evaluator_dictaminar_hallazgo(
    payload: PdtDictaminarHallazgoRequest,
    db: SessionDependency,
):
    try:
        result = await registrar_dictamen_hallazgo_pdt_pg(**payload.model_dump(), db=db)
        await db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta/dictamenes-hallazgos",
    response_model=PdtDictamenesHallazgosRespuesta,
    summary="Consultar dictámenes de revisión por hallazgo",
)
async def pdt_ai_evaluator_listar_dictamenes_hallazgos(
    db: SessionDependency,
    codigo_plan: str | None = Query(default=None),
    codigo_meta: str | None = Query(default=None),
    estado_revision: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    return await listar_dictamenes_hallazgos_pdt_pg(
        db=db,
        codigo_plan=codigo_plan,
        codigo_meta=codigo_meta,
        estado_revision=estado_revision,
        limit=limit,
    )


def _cargar_hoshin_kanri_fns():
    import importlib

    module = importlib.import_module(".pdt_hoshin_kanri", package="app.modules.compromisos")
    return (
        module.obtener_especificacion_hoshin_kanri_pdt,
        module.construir_matriz_x_hoshin_kanri_pdt,
    )


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/4-niveles",
    response_model=PdtDea4NivelesCartagenaRespuesta,
    summary="Evaluación DEA jerárquica de cuatro niveles para Cartagena",
)
async def pdt_dea_cartagena_4_niveles(
    db: SessionDependency,
    nivel: str | None = Query(default=None),
    orientacion: str = Query(default="input"),
    sector: str | None = Query(default=None),
):
    return await obtener_dea_cartagena_4_niveles(
        nivel=nivel, orientacion=orientacion, sector=sector, db=db
    )


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/tablero-alcalde-armonizacion",
    response_model=PdtTableroAlcaldeArmonizacionDeaRespuesta,
    summary="Alertas de eficiencia y benchmarks para el Tablero Alcalde",
)
async def pdt_dea_cartagena_tablero_alcalde(
    db: SessionDependency,
    orientacion: str = Query(default="input"),
    sector: str | None = Query(default=None),
):
    return await obtener_tablero_dea_cartagena(orientacion=orientacion, sector=sector, db=db)


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/informe-integral-spd",
    response_model=PdtAiInformeIntegralSpdResponse,
    summary="Informe integral auditable del PDT-AI-EVALUATOR para la SPD",
)
async def pdt_ai_evaluator_informe_integral_spd(
    plan_codigo: str = Query(default="PDD_2024_2027"),
    orientacion_dea: str = Query(default="input"),
    incluir_exportables: bool = Query(default=True),
):
    from app.modules.compromisos.pdt_informe_integral_spd import (
        generar_informe_integral_spd_cartagena,
    )

    return await generar_informe_integral_spd_cartagena(
        plan_codigo=plan_codigo,
        orientacion_dea=orientacion_dea,
        incluir_exportables=incluir_exportables,
    )


async def _invocar_hoshin(fn, **kwargs):
    import inspect

    parameters = inspect.signature(fn).parameters
    call_kwargs = {name: value for name, value in kwargs.items() if name in parameters}
    result = fn(**call_kwargs)
    return await result if inspect.isawaitable(result) else result


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/hoshin-kanri/especificacion",
    response_model=HoshinKanriEspecificacionRespuesta,
    summary="Especificación metodológica Hoshin Kanri y Matriz X para PDT",
)
async def pdt_hoshin_kanri_especificacion():
    fn_especificacion, _ = _cargar_hoshin_kanri_fns()
    return await _invocar_hoshin(fn_especificacion)


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/hoshin-kanri/matriz-x",
    response_model=HoshinKanriMatrizXRespuesta,
    summary="Matriz X Hoshin Kanri del Plan de Desarrollo Territorial",
)
async def pdt_hoshin_kanri_matriz_x(
    db: SessionDependency,
    codigo_plan: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    dependencia: str | None = Query(default=None),
    force_refresh: bool = Query(default=False),
):
    _, fn_matriz = _cargar_hoshin_kanri_fns()
    diagnostic = None
    if force_refresh:
        _, fn_ejecutar, _ = _cargar_pdt_ai_evaluator_fns()
        diagnostic = await fn_ejecutar(db, force_refresh=True)
    return await _invocar_hoshin(
        fn_matriz,
        db=db,
        session=db,
        diagnostico=diagnostic,
        codigo_plan=codigo_plan,
        sector=sector,
        dependencia=dependencia,
        force_refresh=force_refresh,
    )


def _cargar_revision_por_meta_fn():
    import importlib

    module = importlib.import_module(".pdt_revision_por_meta", package="app.modules.compromisos")
    return module.construir_matriz_revision_por_meta_pdt, module


async def _invocar_revision_por_meta(fn, **kwargs):
    import asyncio
    import inspect

    parameters = inspect.signature(fn).parameters
    call_kwargs = {name: value for name, value in kwargs.items() if name in parameters}
    if inspect.iscoroutinefunction(fn):
        return await fn(**call_kwargs)
    result = await asyncio.to_thread(fn, **call_kwargs)
    return await result if inspect.isawaitable(result) else result


def _normalizar_revision_por_meta(resultado: dict, module, filtros: dict) -> dict:
    resultado = resultado if isinstance(resultado, dict) else {}
    specification = module.obtener_especificacion_revision_por_meta()
    dimensions = resultado.get("catalogo_10_dimensiones")
    if dimensions is None:
        dimensions = [
            {"dimension": name, **details}
            for name, details in specification.get("diez_dimensiones_revision", {}).items()
        ]
    reviewers = resultado.get("catalogo_7_revisores")
    if reviewers is None:
        reviewers = [
            {"rol": name, **details}
            for name, details in specification.get("siete_roles_revisores", {}).items()
        ]
    metas = resultado.get("matriz_metas", resultado.get("metas_auditadas", []))
    summary = resultado.get("resumen_ejecutivo_revision")
    if summary is None:
        summary = resultado.get("resumen_auditoria") or {
            "total_metas_plan": resultado.get("total_metas_plan", len(metas)),
            "total_metas_filtradas": resultado.get("total_metas_filtradas", len(metas)),
            "metas_devueltas": resultado.get("metas_devueltas", len(metas)),
        }
    reviewers_report = resultado.get("informe_7_revisores")
    if reviewers_report is None:
        reviewers_report = {
            "roles": reviewers,
            "revisiones_por_meta": [
                {
                    "codigo_meta": item.get("codigo_meta"),
                    "revisores": item.get("dictamen_7_revisores", {}),
                }
                for item in metas
                if item.get("dictamen_7_revisores")
            ],
        }
    return {
        **resultado,
        "sistema": resultado.get("sistema", "PDT-AI-EVALUATOR-REVISION-10D-META"),
        "generado_en": str(resultado.get("generado_en") or ""),
        "filtros_aplicados": resultado.get("filtros_aplicados") or filtros,
        "total_metas_evaluadas": int(
            resultado.get("total_metas_evaluadas", resultado.get("metas_devueltas", len(metas)))
            or 0
        ),
        "catalogo_10_dimensiones": dimensions,
        "catalogo_7_revisores": reviewers,
        "resumen_ejecutivo_revision": summary,
        "informe_7_revisores": reviewers_report,
        "matriz_metas": metas,
    }


@router.get(
    "/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta",
    response_model=PdtRevisionPorMetaRespuesta,
    summary="Revisión integral por meta PDD en 10 dimensiones y 7 revisores",
)
async def pdt_ai_evaluator_revision_por_meta(
    db: SessionDependency,
    codigo_plan: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    dependencia: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    force_refresh: bool = Query(default=False),
):
    fn_revision, module = _cargar_revision_por_meta_fn()
    diagnostico = None
    if force_refresh:
        _, fn_ejecutar, _ = _cargar_pdt_ai_evaluator_fns()
        diagnostico = await fn_ejecutar(db, force_refresh=True)
    filters = {
        "codigo_plan": codigo_plan,
        "sector": sector,
        "dependencia": dependencia,
        "limit": limit,
        "force_refresh": force_refresh,
    }
    resultado = await _invocar_revision_por_meta(
        fn_revision,
        db=db,
        diagnostico=diagnostico,
        codigo_plan=codigo_plan or "PDD_2024_2027",
        sector=sector,
        dependencia=dependencia,
        limit=limit,
        force_refresh=force_refresh,
    )
    return _normalizar_revision_por_meta(resultado, module, filters)
