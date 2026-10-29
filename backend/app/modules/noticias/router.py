import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.noticias.schemas import NoticiaEntrada, NoticiaLectura
from app.modules.noticias.service import NoticiasService

router = APIRouter(prefix="/noticias", tags=["Noticias institucionales"])


def get_noticias_service(session: SessionDependency) -> NoticiasService:
    return NoticiasService(session)


NoticiasServiceDep = Annotated[NoticiasService, Depends(get_noticias_service)]
PuedeLeerContenido = Depends(requerir_permiso("contenido:leer", nivel_minimo="declarada"))
PuedeGestionarContenido = Depends(requerir_permiso("politicas:gestionar", nivel_minimo="declarada"))


@router.get("", response_model=list[NoticiaLectura])
async def listar_publicas(service: NoticiasServiceDep):
    return await service.listar(publicadas=True)


@router.get("/gestion", response_model=list[NoticiaLectura], dependencies=[PuedeLeerContenido])
async def listar_gestion(service: NoticiasServiceDep):
    return await service.listar(publicadas=False)


@router.post(
    "/gestion",
    response_model=NoticiaLectura,
    status_code=status.HTTP_201_CREATED,
    dependencies=[PuedeGestionarContenido],
)
async def crear_noticia(datos: NoticiaEntrada, service: NoticiasServiceDep):
    return await service.crear(datos)


@router.get("/gestion/{id}", response_model=NoticiaLectura, dependencies=[PuedeLeerContenido])
async def obtener_gestion(id: uuid.UUID, service: NoticiasServiceDep):
    return await service.obtener_gestion(id)


@router.put("/gestion/{id}", response_model=NoticiaLectura, dependencies=[PuedeGestionarContenido])
async def actualizar_noticia(id: uuid.UUID, datos: NoticiaEntrada, service: NoticiasServiceDep):
    return await service.actualizar(id, datos)


@router.delete("/gestion/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[PuedeGestionarContenido])
async def eliminar_noticia(id: uuid.UUID, service: NoticiasServiceDep):
    await service.eliminar(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{slug}", response_model=NoticiaLectura)
async def obtener_publicada(slug: str, service: NoticiasServiceDep):
    return await service.obtener_publicada(slug)


@router.get("/id/{id}", response_model=NoticiaLectura)
async def obtener_publicada_por_id(id: uuid.UUID, service: NoticiasServiceDep):
    return await service.obtener_publicada_por_id(id)
