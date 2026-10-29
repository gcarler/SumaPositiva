import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.core.database import SessionDependency
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.proyectos.schemas import (
    ActividadProyectoLectura,
    AnexoActividadLectura,
    ResumenProyectosLectura,
)
from app.modules.proyectos.service import ProyectosService

router = APIRouter(prefix="/proyectos", tags=["Proyectos"])


def get_proyectos_service(session: SessionDependency) -> ProyectosService:
    return ProyectosService(session)


ProyectosServiceDep = Annotated[ProyectosService, Depends(get_proyectos_service)]
PuedeLeerProyectos = Depends(requerir_permiso("proyectos:leer", nivel_minimo="declarada"))


def puede_gestionar_anexos(sujeto: SujetoAutenticadoDep) -> SujetoAutenticadoContexto:
    """Verifica si el usuario autenticado tiene rol o permisos para gestionar anexos."""
    roles_permitidos = {"administrador_identidades", "autoridad_distrital", "facilitador_mesa"}
    permisos_permitidos = {
        "proyectos:escribir",
        "comunicaciones:gestionar",
        "mesas:abrir",
        "formularios:gestionar",
    }
    if sujeto.rol in roles_permitidos or any(p in sujeto.permisos for p in permisos_permitidos):
        return sujeto
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No cuenta con permisos para adjuntar o eliminar archivos en esta actividad.",
    )


PuedeGestionarAnexos = Depends(puede_gestionar_anexos)


@router.get(
    "/actividades",
    response_model=list[ActividadProyectoLectura],
    dependencies=[PuedeLeerProyectos],
)
async def listar_actividades(
    service: ProyectosServiceDep,
    modulo: Annotated[str | None, Query(description="Fuente: comunicaciones|mesas|formularios")] = None,
    fecha_desde: Annotated[date | None, Query()] = None,
    fecha_hasta: Annotated[date | None, Query()] = None,
) -> list[ActividadProyectoLectura]:
    """Proyección agregada read-only de las actividades de formulación.

    Solo comunicaciones, agendas de mesas y formularios de consulta: el plan
    de acción vive en /api/v1/seguimiento. La escritura sigue siendo
    responsabilidad del módulo dueño; esta vista no muta estado.
    """
    return await service.listar(
        modulo=modulo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.get(
    "/resumen",
    response_model=ResumenProyectosLectura,
    dependencies=[PuedeLeerProyectos],
)
async def resumen_proyectos(service: ProyectosServiceDep) -> ResumenProyectosLectura:
    """Resumen agregado por módulo y por estado canónico."""
    return await service.resumen()


# ==============================================================================
# Gestión de Anexos / Archivos Adjuntos de Actividades
# ==============================================================================


@router.get(
    "/actividades/{actividad_id}/anexos",
    response_model=list[AnexoActividadLectura],
    dependencies=[PuedeLeerProyectos],
)
async def listar_anexos_actividad(
    actividad_id: str,
    service: ProyectosServiceDep,
) -> list[AnexoActividadLectura]:
    """Lista todos los anexos y evidencias documentales adjuntos a una actividad."""
    return await service.listar_anexos(actividad_id)


@router.post(
    "/actividades/{actividad_id}/anexos",
    response_model=AnexoActividadLectura,
    status_code=status.HTTP_201_CREATED,
)
async def subir_anexo_actividad(
    actividad_id: str,
    service: ProyectosServiceDep,
    archivo: Annotated[UploadFile, File(description="Archivo adjunto o evidencia")],
    descripcion: Annotated[str | None, Form(description="Descripción o notas del documento")] = None,
    sujeto: SujetoAutenticadoContexto = PuedeGestionarAnexos,
) -> AnexoActividadLectura:
    """Carga y adjunta un archivo a la actividad especificada."""
    return await service.guardar_anexo(
        actividad_id=actividad_id,
        archivo=archivo,
        descripcion=descripcion,
        sujeto=sujeto,
    )


@router.get(
    "/actividades/{actividad_id}/anexos/{anexo_id}/archivo",
    dependencies=[PuedeLeerProyectos],
)
async def descargar_anexo_actividad(
    actividad_id: str,
    anexo_id: uuid.UUID,
    service: ProyectosServiceDep,
) -> FileResponse:
    """Descarga el archivo físico del anexo con su nombre original."""
    ruta, nombre_original, tipo_mime = await service.obtener_anexo_para_descarga(
        actividad_id=actividad_id,
        anexo_id=anexo_id,
    )
    return FileResponse(
        path=ruta,
        filename=nombre_original,
        media_type=tipo_mime,
        content_disposition_type="attachment",
    )


@router.delete(
    "/actividades/{actividad_id}/anexos/{anexo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def eliminar_anexo_actividad(
    actividad_id: str,
    anexo_id: uuid.UUID,
    service: ProyectosServiceDep,
    sujeto: SujetoAutenticadoContexto = PuedeGestionarAnexos,
) -> None:
    """Elimina (soft-delete) un anexo de la actividad."""
    await service.eliminar_anexo(
        actividad_id=actividad_id,
        anexo_id=anexo_id,
        sujeto=sujeto,
    )
