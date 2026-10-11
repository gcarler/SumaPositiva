"""Rutas FastAPI para la recepción, consulta y gestión de aportes ciudadanos."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.database import SessionDependency
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import (
    EstadoPropuestaLiteral,
    PropuestaCiudadanaCreate,
    PropuestaCiudadanaRead,
    PropuestaCiudadanaUpdate,
    PropuestasPaginadasRead,
    TipoAporteLiteral,
)
from app.modules.aportes.service import AporteService
from app.modules.auditoria.schemas import DevolucionRazonCrear, DevolucionRazonRespuesta
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.sesion.deps import SesionRequeridaDep

router = APIRouter(prefix="/aportes", tags=["aportes-ciudadanos"])


def get_aporte_service(
    session: SessionDependency, request: Request
) -> AporteService:
    """Inyección de dependencias para el servicio de aportes ciudadanos."""
    settings = getattr(request.app.state, "settings", None)
    return AporteService(AporteRepository(session), settings=settings)


AporteServiceDep = Annotated[AporteService, Depends(get_aporte_service)]


@router.post(
    "",
    response_model=PropuestaCiudadanaRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar aporte ciudadano",
    description=(
        "Crea una propuesta, observación o alerta ciudadana "
        "con enfoque diferencial y anclaje territorial."
    ),
)
async def crear_aporte(
    datos: PropuestaCiudadanaCreate,
    sesion: SesionRequeridaDep,
    service: AporteServiceDep,
) -> PropuestaCiudadanaRead:
    return await service.crear_propuesta(datos, sesion_contexto=sesion)


@router.get(
    "",
    response_model=PropuestasPaginadasRead,
    status_code=status.HTTP_200_OK,
    summary="Listar aportes ciudadanos",
    description=(
        "Retorna aportes paginados con filtros opcionales "
        "por dimensión, territorio y enfoque diferencial."
    ),
)
async def listar_aportes(
    service: AporteServiceDep,
    dimension_id: Annotated[
        uuid.UUID | None,
        Query(description="Filtrar por dimensión de Seguridad Humana"),
    ] = None,
    territorio_id: Annotated[
        uuid.UUID | None,
        Query(description="Filtrar por territorio distrital"),
    ] = None,
    linea_id: Annotated[
        uuid.UUID | None,
        Query(description="Filtrar por línea estratégica"),
    ] = None,
    tipo_aporte: Annotated[
        TipoAporteLiteral | None,
        Query(description="Filtrar por tipo de aporte participativo"),
    ] = None,
    estado: Annotated[
        EstadoPropuestaLiteral | None,
        Query(description="Filtrar por estado del aporte"),
    ] = None,
    grupo_etnico: Annotated[
        str | None,
        Query(description="Filtrar por pertenencia étnica"),
    ] = None,
    genero: Annotated[
        str | None,
        Query(description="Filtrar por identidad de género"),
    ] = None,
    es_victima_conflicto: Annotated[
        bool | None,
        Query(description="Filtrar por condición de víctima del conflicto armado"),
    ] = None,
    sesion_id: Annotated[
        uuid.UUID | None,
        Query(description="Filtrar por identificador de sesión originaria"),
    ] = None,
    busqueda: Annotated[
        str | None,
        Query(description="Búsqueda de texto en título y descripción"),
    ] = None,
    solo_etnicos: Annotated[
        bool | None,
        Query(description="Filtrar por territorios étnicos"),
    ] = None,
    requiere_consulta_previa: Annotated[
        bool | None,
        Query(description="Filtrar por requisito de consulta previa"),
    ] = None,
    ruta_etnica_diferenciada: Annotated[
        bool | None,
        Query(description="Filtrar por ruta étnica diferenciada"),
    ] = None,
    solo_activos: Annotated[
        bool,
        Query(description="Filtrar únicamente registros activos (soft-delete)"),
    ] = True,
    limite: Annotated[
        int,
        Query(ge=1, le=100, description="Cantidad máxima de resultados por página"),
    ] = 20,
    desplazamiento: Annotated[
        int,
        Query(ge=0, description="Desplazamiento inicial u offset"),
    ] = 0,
) -> PropuestasPaginadasRead:
    return await service.listar_propuestas(
        dimension_id=dimension_id,
        territorio_id=territorio_id,
        linea_id=linea_id,
        tipo_aporte=tipo_aporte,
        estado=estado,
        grupo_etnico=grupo_etnico,
        genero=genero,
        es_victima_conflicto=es_victima_conflicto,
        sesion_id=sesion_id,
        busqueda=busqueda,
        solo_activos=solo_activos,
        solo_etnicos=solo_etnicos,
        requiere_consulta_previa=requiere_consulta_previa,
        ruta_etnica_diferenciada=ruta_etnica_diferenciada,
        limite=limite,
        desplazamiento=desplazamiento,
    )


@router.get(
    "/{aporte_id}",
    response_model=PropuestaCiudadanaRead,
    status_code=status.HTTP_200_OK,
    summary="Consultar detalle de un aporte",
)
async def obtener_aporte(
    aporte_id: uuid.UUID,
    service: AporteServiceDep,
) -> PropuestaCiudadanaRead:
    return await service.obtener_propuesta(aporte_id)


@router.patch(
    "/{aporte_id}",
    response_model=PropuestaCiudadanaRead,
    status_code=status.HTTP_200_OK,
    summary="Actualizar un aporte ciudadano",
    dependencies=[Depends(requerir_permiso("aportes:priorizar", nivel_minimo="declarada"))],
)
async def actualizar_aporte(
    aporte_id: uuid.UUID,
    cambios: PropuestaCiudadanaUpdate,
    service: AporteServiceDep,
) -> PropuestaCiudadanaRead:
    return await service.actualizar_propuesta(aporte_id, cambios)


@router.delete(
    "/{aporte_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desactivar aporte (soft-delete)",
    dependencies=[Depends(requerir_permiso("aportes:priorizar", nivel_minimo="declarada"))],
)
async def desactivar_aporte(
    aporte_id: uuid.UUID,
    service: AporteServiceDep,
) -> None:
    await service.desactivar_propuesta(aporte_id)


@router.post(
    "/{aporte_id}/apoyar",
    response_model=PropuestaCiudadanaRead,
    status_code=status.HTTP_200_OK,
    summary="Respaldar un aporte ciudadano",
)
async def respaldar_aporte(
    aporte_id: uuid.UUID,
    sujeto: SujetoAutenticadoDep,
    service: AporteServiceDep,
) -> PropuestaCiudadanaRead:
    return await service.apoyar_propuesta(aporte_id, sujeto)


@router.post(
    "/{aporte_id}/devolucion-razon",
    response_model=DevolucionRazonRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir devolución motivada (Sentencia C-150/15)",
    dependencies=[Depends(requerir_permiso("aportes:responder", nivel_minimo="declarada"))],
)
async def devolver_aporte(
    aporte_id: uuid.UUID,
    datos: DevolucionRazonCrear,
    sujeto: SujetoAutenticadoDep,
    service: AporteServiceDep,
):
    return await service.registrar_devolucion_motivada(aporte_id, datos, sujeto)


@router.get(
    "/{aporte_id}/devolucion-razon",
    response_model=list[DevolucionRazonRespuesta],
    status_code=status.HTTP_200_OK,
    summary="Consultar historial de devoluciones",
)
async def obtener_devolucion_aporte(
    aporte_id: uuid.UUID,
    service: AporteServiceDep,
):
    return await service.consultar_historial_devolucion(aporte_id)
