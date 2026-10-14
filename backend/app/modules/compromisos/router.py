from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, status

from app.core.database import SessionDependency
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
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.politicas.gating import verificar_escritura_fase

router = APIRouter(prefix="/compromisos", tags=["Compromisos PAS"])


def get_compromisos_service(session: SessionDependency) -> CompromisosService:
    return CompromisosService(CompromisosRepository(session))


CompromisosServiceDep = Annotated[CompromisosService, Depends(get_compromisos_service)]


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
):
    """Consulta pública, agregada y de solo lectura para transparencia activa."""
    return await service.obtener_resumen_triada(cuatrienio, vigencia, entidad, fuente)


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
