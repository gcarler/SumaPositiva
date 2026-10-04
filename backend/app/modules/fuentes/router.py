from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.database import SessionDependency
from app.modules.fuentes.schemas import (
    FuenteInformacionActualizar,
    FuenteInformacionCrear,
    FuenteInformacionRespuesta,
    KpisFuentesRespuesta,
)
from app.modules.fuentes.service import FuentesService
from app.modules.identidad.deps import requerir_permiso
from app.modules.identidad.schemas import SujetoAutenticadoContexto

router = APIRouter(prefix="/fuentes", tags=["Fuentes de Información Oficial"])


def get_fuentes_service(session: SessionDependency) -> FuentesService:
    return FuentesService(session)


FuentesServiceDep = Annotated[FuentesService, Depends(get_fuentes_service)]


@router.get("", response_model=list[FuenteInformacionRespuesta])
async def listar_fuentes(
    service: FuentesServiceDep,
    ambito: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    dimension: str | None = Query(default=None),
    tipo: str | None = Query(default=None),
    buscar: str | None = Query(default=None),
):
    """Consulta el catálogo oficial de fuentes de información y solicitudes radicadas."""
    return await service.listar_fuentes(
        ambito=ambito,
        estado=estado,
        dimension=dimension,
        tipo=tipo,
        busqueda=buscar,
    )


@router.get("/kpis", response_model=KpisFuentesRespuesta)
async def obtener_kpis(service: FuentesServiceDep):
    """Retorna las métricas de cumplimiento, estados de entrega y atención crítica."""
    return await service.obtener_kpis()


@router.get("/{id}", response_model=FuenteInformacionRespuesta)
async def obtener_fuente(id: str, service: FuentesServiceDep):
    """Consulta la ficha técnica y radicado de una fuente por su identificador."""
    return await service.obtener_por_id(id)


@router.post(
    "",
    response_model=FuenteInformacionRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_fuente(
    datos: FuenteInformacionCrear,
    service: FuentesServiceDep,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("fuentes:gestionar", "declarada")),
    ],
):
    """Radica o crea una nueva fuente de información oficial con auditoría inmutable."""
    return await service.crear_fuente(datos, usuario_id=sujeto.sujeto_id)


@router.patch(
    "/{id}",
    response_model=FuenteInformacionRespuesta,
)
async def actualizar_fuente(
    id: str,
    cambios: FuenteInformacionActualizar,
    service: FuentesServiceDep,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("fuentes:gestionar", "declarada")),
    ],
):
    """Actualiza radicados, fechas de entrega, observaciones y estados de una fuente."""
    return await service.actualizar_fuente(id, cambios, usuario_id=sujeto.sujeto_id)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def eliminar_fuente(
    id: str,
    service: FuentesServiceDep,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("fuentes:gestionar", "declarada")),
    ],
):
    """Elimina una fuente de información registrando el evento en auditoría forense."""
    await service.eliminar_fuente(id, usuario_id=sujeto.sujeto_id)
