"""Router REST para el Banco Distrital de Alternativas MGA (EDIT-09).

Permite la consulta pública de iniciativas de solución y la formulación,
actualización y eliminación controlada por la administración distrital,
sujeta a trazabilidad de auditoría forense inmutable y gating de ciclo de vida (Fase 2).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.database import SessionDependency
from app.modules.alternativas.repository import AlternativasRepository
from app.modules.alternativas.schemas import (
    AlternativaActualizar,
    AlternativaCrear,
    AlternativaRead,
)
from app.modules.alternativas.service import AlternativasService
from app.modules.identidad.deps import requerir_permiso
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.politicas.gating import verificar_escritura_fase

router = APIRouter(prefix="/alternativas", tags=["Alternativas MGA"])


def obtener_servicio(db: SessionDependency) -> AlternativasService:
    return AlternativasService(AlternativasRepository(db))


# B008: depósito de servicio como alias Annotated módulo-nivel, conforme al
# patrón del kit (ver SujetoAutenticadoDep en identidad/deps). Se define después
# de obtener_servicio porque la expresión se evalúa en import.
ServicioAlternativasDep = Annotated[AlternativasService, Depends(obtener_servicio)]


@router.get(
    "",
    response_model=list[AlternativaRead],
    summary="Listar alternativas MGA",
    description="Consulta pública de las iniciativas de solución formuladas en el Banco Distrital MGA.",
)
async def listar_alternativas(
    service: ServicioAlternativasDep,
    busqueda: Annotated[str | None, Query(description="Término de búsqueda")] = None,
    sector: Annotated[str | None, Query(description="Filtrar por sector MGA")] = None,
    linea: Annotated[str | None, Query(description="Filtrar por código o ID de línea estratégica")] = None,
    dimension: Annotated[str | None, Query(description="Filtrar por código o ID de dimensión")] = None,
    estado: Annotated[str | None, Query(description="Filtrar por estado de formulación")] = None,
    enfoque_etnico: Annotated[str | None, Query(description="solo_etnicos o no_etnicos")] = None,
) -> list[AlternativaRead]:
    alternativas = await service.listar_alternativas(
        busqueda=busqueda,
        sector=sector,
        linea=linea,
        dimension=dimension,
        estado=estado,
        enfoque_etnico=enfoque_etnico,
    )
    return [AlternativaRead.model_validate(a) for a in alternativas]


@router.get(
    "/{id_o_codigo}",
    response_model=AlternativaRead,
    summary="Obtener detalle de alternativa MGA",
    description="Consulta técnica pública de una alternativa de solución por UUID o código MGA.",
)
async def obtener_alternativa(
    id_o_codigo: str,
    service: ServicioAlternativasDep,
) -> AlternativaRead:
    alt = await service.obtener_alternativa(id_o_codigo)
    return AlternativaRead.model_validate(alt)


@router.post(
    "",
    response_model=AlternativaRead,
    status_code=status.HTTP_201_CREATED,
    summary="Formular nueva alternativa MGA",
    description="Registra una nueva iniciativa de solución en el Banco Distrital. Requiere permiso alternativas:gestionar.",
)
async def crear_alternativa(
    datos: AlternativaCrear,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("alternativas:gestionar", nivel_minimo="declarada")),
    ],
    db: SessionDependency,
) -> AlternativaRead:
    await verificar_escritura_fase("FASE_2_FORMULACION", sujeto, db)
    service = AlternativasService(AlternativasRepository(db))
    creado = await service.crear_alternativa(datos, actor_id=sujeto.sujeto_id)
    return AlternativaRead.model_validate(creado)


@router.patch(
    "/{id}",
    response_model=AlternativaRead,
    summary="Actualizar alternativa MGA",
    description="Actualiza campos o estado de una alternativa con registro inmutable en auditoría forense.",
)
async def actualizar_alternativa(
    id: str,
    datos: AlternativaActualizar,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("alternativas:gestionar", nivel_minimo="declarada")),
    ],
    db: SessionDependency,
) -> AlternativaRead:
    await verificar_escritura_fase("FASE_2_FORMULACION", sujeto, db)
    service = AlternativasService(AlternativasRepository(db))
    actualizado = await service.actualizar_alternativa(id, datos, actor_id=sujeto.sujeto_id)
    return AlternativaRead.model_validate(actualizado)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar alternativa MGA",
    description="Elimina una alternativa verificando previamente que no posea compromisos PAS vinculados.",
)
async def eliminar_alternativa(
    id: str,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("alternativas:gestionar", nivel_minimo="declarada")),
    ],
    db: SessionDependency,
) -> Response:
    await verificar_escritura_fase("FASE_2_FORMULACION", sujeto, db)
    service = AlternativasService(AlternativasRepository(db))
    await service.eliminar_alternativa(id, actor_id=sujeto.sujeto_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
