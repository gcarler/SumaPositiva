import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.evidencia.service import EvidenciaService
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.mesas.repository import MesaRepository
from app.modules.mesas.schemas import (
    ActaCierre,
    ActaCrear,
    ActaRespuesta,
    AgendaActualizar,
    AgendaCrear,
    AgendaRespuesta,
    FotoMesaModeracion,
    FotoMesaModeradaRespuesta,
    FotoMesaRevision,
    FotoMesaSubidaRespuesta,
    MesaActualizar,
    MesaCrear,
    MesaGeovisorRespuesta,
    MesaRespuesta,
    ParticipanteCrear,
    ParticipanteRespuesta,
    SubMesaCrear,
)
from app.modules.mesas.service import MesaService

router = APIRouter(prefix="/mesas", tags=["mesas-trabajo"])


def get_mesa_service(session: SessionDependency) -> MesaService:
    return MesaService(MesaRepository(session))


MesaServiceDep = Annotated[MesaService, Depends(get_mesa_service)]


def get_evidencia_service(session: SessionDependency, request: Request) -> EvidenciaService:
    settings = getattr(request.app.state, "settings", None) or Settings()
    return EvidenciaService(session, settings)


EvidenciaServiceDep = Annotated[EvidenciaService, Depends(get_evidencia_service)]


@router.post(
    "",
    response_model=MesaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_mesa(
    datos: MesaCrear,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.crear_mesa_raiz(datos, sujeto=sujeto)


@router.post(
    "/{mesa_id}/submesas",
    response_model=MesaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_submesa(
    mesa_id: uuid.UUID,
    datos: SubMesaCrear,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.crear_submesa(mesa_id, datos, sujeto=sujeto)


@router.get("/geovisor", response_model=list[MesaGeovisorRespuesta])
async def listar_mesas_geovisor(service: EvidenciaServiceDep):
    return await service.listar_mesas_geovisor()


# --- Endpoints de Cronograma y Gestión de Agendas (EDIT-02) ---


@router.get("/agendas", response_model=list[AgendaRespuesta])
async def listar_agendas(
    service: MesaServiceDep,
    tipo: str | None = None,
    estado: str | None = None,
    fecha: date | None = None,
):
    return await service.listar_agendas(tipo=tipo, estado=estado, fecha=fecha)


@router.post(
    "/agendas",
    response_model=AgendaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_agenda(
    datos: AgendaCrear,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.crear_agenda(datos, sujeto=sujeto)


@router.get("/agendas/{agenda_id}", response_model=AgendaRespuesta)
async def obtener_agenda(agenda_id: str, service: MesaServiceDep):
    return await service.obtener_agenda(agenda_id)


@router.patch(
    "/agendas/{agenda_id}",
    response_model=AgendaRespuesta,
)
async def actualizar_agenda(
    agenda_id: str,
    datos: AgendaActualizar,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.actualizar_agenda(agenda_id, datos, sujeto=sujeto)


@router.post(
    "/{mesa_id}/fotos",
    response_model=FotoMesaSubidaRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("mesas:fotos:subir", nivel_minimo="declarada"))],
)
async def subir_foto_mesa(
    mesa_id: uuid.UUID,
    sujeto: SujetoAutenticadoDep,
    service: EvidenciaServiceDep,
    archivo: Annotated[UploadFile, File(description="Imagen JPEG, PNG o WebP")],
    autorizacion_imagen: Annotated[
        bool, Form(description="Confirma que cuenta con autorización para publicar esta imagen")
    ],
):
    return await service.guardar_foto_mesa(mesa_id, archivo, sujeto, autorizacion_imagen)


@router.get(
    "/fotos/pendientes",
    response_model=list[FotoMesaRevision],
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def listar_fotos_pendientes(service: EvidenciaServiceDep):
    return await service.listar_fotos_pendientes()


@router.post(
    "/fotos/{foto_id}/revision",
    response_model=FotoMesaModeradaRespuesta,
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def revisar_foto_mesa(
    foto_id: uuid.UUID,
    datos: FotoMesaModeracion,
    sujeto: SujetoAutenticadoDep,
    service: EvidenciaServiceDep,
):
    return await service.moderar_foto_mesa(foto_id, datos, sujeto)


@router.get(
    "/fotos/{foto_id}/revision/archivo",
    response_class=FileResponse,
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def archivo_foto_revision(
    foto_id: uuid.UUID,
    sujeto: SujetoAutenticadoDep,
    service: EvidenciaServiceDep,
):
    ruta, mime = await service.obtener_archivo_para_revision(foto_id, sujeto)
    return FileResponse(path=ruta, media_type=mime)


@router.get("", response_model=list[MesaRespuesta])
async def listar_mesas(
    service: MesaServiceDep,
    tipo_mesa: str | None = None,
    estado: str | None = None,
    fecha: date | None = None,
    territorio_id: uuid.UUID | None = None,
    ancestro_ruta: str | None = None,
    solo_raiz: bool = True,
):
    return await service.listar_mesas(tipo_mesa, estado, fecha, territorio_id, ancestro_ruta, solo_raiz)


@router.get("/{mesa_id}", response_model=MesaRespuesta)
async def obtener_mesa(mesa_id: str, service: MesaServiceDep):
    return await service.obtener_mesa(mesa_id)


@router.patch(
    "/{mesa_id}",
    response_model=MesaRespuesta,
)
async def actualizar_mesa(
    mesa_id: str,
    datos: MesaActualizar,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.actualizar_mesa(mesa_id, datos, sujeto=sujeto)


@router.put(
    "/{mesa_id}/submesas/{submesa_id}",
    response_model=MesaRespuesta,
)
async def actualizar_submesa(
    mesa_id: uuid.UUID,
    submesa_id: uuid.UUID,
    datos: MesaActualizar,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.actualizar_submesa(mesa_id, submesa_id, datos, sujeto=sujeto)


@router.get("/{mesa_id}/submesas", response_model=list[MesaRespuesta])
async def obtener_submesas(mesa_id: str, service: MesaServiceDep):
    return await service.listar_submesas(mesa_id)


# --- Endpoints de Participantes ---


@router.post(
    "/{mesa_id}/participantes",
    response_model=ParticipanteRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def registrar_participante(
    mesa_id: str,
    datos: ParticipanteCrear,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("asistencia:verificar", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.registrar_participante(mesa_id, datos, sujeto=sujeto)


@router.get(
    "/{mesa_id}/participantes",
    response_model=list[ParticipanteRespuesta],
    dependencies=[Depends(requerir_permiso("asistencia:verificar", nivel_minimo="declarada"))],
)
async def listar_participantes(mesa_id: str, service: MesaServiceDep):
    return await service.listar_participantes(mesa_id)


# --- Endpoints de Actas Comunitarias ---


@router.post(
    "/{mesa_id}/acta",
    response_model=ActaRespuesta,
    status_code=status.HTTP_200_OK,
)
async def crear_o_actualizar_acta(
    mesa_id: str,
    datos: ActaCrear,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:acuerdos", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
):
    return await service.crear_o_actualizar_borrador_acta(mesa_id, datos, sujeto=sujeto)


@router.post(
    "/{mesa_id}/acta/cerrar",
    response_model=ActaRespuesta,
    status_code=status.HTTP_200_OK,
)
async def cerrar_acta(
    mesa_id: str,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("mesas:acuerdos", nivel_minimo="declarada")),
    ],
    service: MesaServiceDep,
    datos_cierre: ActaCierre | None = None,
):
    return await service.cerrar_acta(mesa_id, datos_cierre, sujeto=sujeto)


@router.get("/{mesa_id}/acta", response_model=ActaRespuesta)
async def obtener_acta(mesa_id: str, service: MesaServiceDep):
    return await service.obtener_acta(mesa_id)


@router.get("/{mesa_id}/acta/pdf")
async def descargar_acta_pdf(mesa_id: str, service: MesaServiceDep, request: Request):
    """Genera y descarga el documento oficial de Acta en PDF (DOC-PDF-ACTAS-01)."""
    from fastapi.responses import Response

    url_base = str(request.base_url)
    pdf_bytes, nombre_archivo = await service.obtener_acta_pdf(mesa_id, url_base=url_base)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{nombre_archivo}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )
