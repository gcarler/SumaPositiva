import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from app.core.database import SessionDependency
from app.modules.identidad.catalogo import PERMISOS
from app.modules.identidad.correo import CorreoIdentidad, obtener_correo_identidad
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso, requerir_rol
from app.modules.identidad.schemas import (
    AmbitoTerritorialCreacion,
    AmbitoTerritorialLectura,
    CambiarContrasena,
    CorreoPeticion,
    EventoLectura,
    GoogleOAuthPeticion,
    LoginPeticion,
    MensajeRespuesta,
    MfaActivarRespuesta,
    MfaCodigoPeticion,
    MfaDesactivarPeticion,
    MfaEstadoLectura,
    MfaIniciarRespuesta,
    MfaVerificarPeticion,
    PerfilEdicion,
    RecuperarContrasena,
    RolCreacion,
    RolEdicion,
    RolLectura,
    SesionLectura,
    TokenPeticion,
    TokenRespuesta,
    UsuarioAdministrado,
    UsuarioAltaAdministrativa,
    UsuarioCreacion,
    UsuarioLectura,
    UsuariosPagina,
)
from app.modules.identidad.security import validar_configuracion_identidad
from app.modules.identidad.service import IdentidadService

router = APIRouter(prefix="/identidad", tags=["Identidad"])


def obtener_identidad_service(request: Request, session: SessionDependency) -> IdentidadService:
    validar_configuracion_identidad(request.app.state.settings)
    return IdentidadService(session, request.app.state.settings)


IdentidadServiceDep = Annotated[IdentidadService, Depends(obtener_identidad_service)]
CorreoDep = Annotated[CorreoIdentidad, Depends(obtener_correo_identidad)]


def exigir_usuario(sujeto):
    if sujeto.es_anonimo:
        raise HTTPException(403, "Esta operación requiere una cuenta registrada")


@router.post("/registro", response_model=UsuarioLectura, status_code=201)
async def registrar_usuario(datos: UsuarioCreacion, request: Request, service: IdentidadServiceDep):
    await service.limitar(
        "registro", request.client.host if request.client else "local", datos.correo
    )
    return await service.registrar_usuario(datos)


@router.post("/login", response_model=TokenRespuesta)
async def login_usuario(
    datos: LoginPeticion,
    request: Request,
    response: Response,
    service: IdentidadServiceDep,
):
    await service.limitar("login", request.client.host if request.client else "local", datos.correo)
    resultado = await service.autenticar_usuario(datos)
    es_seguro = (
        request.app.state.settings.environment == "production"
        or request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    response.set_cookie(
        key="polis_session",
        value=resultado.token_acceso,
        max_age=request.app.state.settings.jwt_expiracion_horas * 3600,
        httponly=True,
        secure=es_seguro,
        samesite="lax",
        path="/",
    )
    return resultado


@router.post("/oauth/google", response_model=TokenRespuesta)
async def login_google(
    datos: GoogleOAuthPeticion,
    request: Request,
    response: Response,
    service: IdentidadServiceDep,
):
    await service.limitar("login_google", request.client.host if request.client else "local")
    resultado = await service.autenticar_google_oauth(datos)
    es_seguro = (
        request.app.state.settings.environment == "production"
        or request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    response.set_cookie(
        key="polis_session",
        value=resultado.token_acceso,
        max_age=request.app.state.settings.jwt_expiracion_horas * 3600,
        httponly=True,
        secure=es_seguro,
        samesite="lax",
        path="/",
    )
    return resultado


@router.get("/perfil", response_model=UsuarioLectura)
async def obtener_perfil(sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep):
    exigir_usuario(sujeto)
    return await service.obtener_perfil(sujeto.sujeto_id)


@router.patch("/perfil", response_model=UsuarioLectura)
async def editar_perfil(
    datos: PerfilEdicion, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    exigir_usuario(sujeto)
    return await service.editar_perfil(datos, sujeto)


@router.post("/logout", response_model=MensajeRespuesta)
async def logout(
    sujeto: SujetoAutenticadoDep,
    response: Response,
    service: IdentidadServiceDep,
):
    exigir_usuario(sujeto)
    resultado = await service.cerrar_sesiones(sujeto, sujeto.sesion_id)
    response.delete_cookie(key="polis_session", path="/")
    return resultado


@router.get("/sesiones", response_model=list[SesionLectura])
async def sesiones(sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep):
    exigir_usuario(sujeto)
    return await service.listar_sesiones(sujeto)


@router.delete("/sesiones", response_model=MensajeRespuesta)
async def revocar_todas(sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep):
    exigir_usuario(sujeto)
    return await service.cerrar_sesiones(sujeto)


@router.delete("/sesiones/{sesion_id}", response_model=MensajeRespuesta)
async def revocar_sesion(
    sesion_id: uuid.UUID, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    exigir_usuario(sujeto)
    return await service.cerrar_sesiones(sujeto, sesion_id)


@router.post("/contrasena", response_model=MensajeRespuesta)
async def cambiar_contrasena(
    datos: CambiarContrasena, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    exigir_usuario(sujeto)
    return await service.cambiar_contrasena(datos, sujeto)


@router.post("/recuperacion/solicitar", response_model=MensajeRespuesta)
async def solicitar_recuperacion(
    datos: CorreoPeticion, request: Request, service: IdentidadServiceDep, correo: CorreoDep
):
    await service.limitar(
        "recuperar", request.client.host if request.client else "local", datos.correo
    )
    return await service.solicitar_correo(datos.correo, "recuperar", correo)


@router.post("/recuperacion/confirmar", response_model=MensajeRespuesta)
async def confirmar_recuperacion(
    datos: RecuperarContrasena, request: Request, service: IdentidadServiceDep
):
    await service.limitar("confirmar", request.client.host if request.client else "local")
    return await service.consumir_token(datos.token, "recuperar", datos.contrasena)


@router.post("/correo/solicitar", response_model=MensajeRespuesta)
async def solicitar_verificacion(
    sujeto: SujetoAutenticadoDep, request: Request, service: IdentidadServiceDep, correo: CorreoDep
):
    exigir_usuario(sujeto)
    await service.limitar(
        "verificar", request.client.host if request.client else "local", sujeto.sujeto_id
    )
    return await service.solicitar_correo(None, "verificar", correo, sujeto)


@router.post("/correo/confirmar", response_model=MensajeRespuesta)
async def confirmar_verificacion(
    datos: TokenPeticion, request: Request, service: IdentidadServiceDep
):
    await service.limitar("confirmar", request.client.host if request.client else "local")
    return await service.consumir_token(datos.token, "verificar")


@router.post("/magic-link/solicitar", response_model=MensajeRespuesta)
async def solicitar_magic_link(
    datos: CorreoPeticion, request: Request, service: IdentidadServiceDep, correo: CorreoDep
):
    await service.limitar(
        "magic_link_solicitar", request.client.host if request.client else "local", datos.correo
    )
    return await service.solicitar_magic_link(datos.correo, correo)


@router.post("/magic-link/confirmar", response_model=TokenRespuesta)
async def confirmar_magic_link(
    datos: TokenPeticion,
    request: Request,
    response: Response,
    service: IdentidadServiceDep,
):
    await service.limitar(
        "magic_link_confirmar", request.client.host if request.client else "local"
    )
    resultado = await service.consumir_magic_link(datos.token)
    es_seguro = (
        request.app.state.settings.environment == "production"
        or request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    response.set_cookie(
        key="polis_session",
        value=resultado.token_acceso,
        max_age=request.app.state.settings.jwt_expiracion_horas * 3600,
        httponly=True,
        secure=es_seguro,
        samesite="lax",
        path="/",
    )
    return resultado


@router.get(
    "/verificar-nivel",
    response_model=dict,
    dependencies=[Depends(requerir_permiso("aportes:crear", nivel_minimo="declarada"))],
)
async def verificar_nivel(sujeto: SujetoAutenticadoDep):
    return {**sujeto.model_dump(), "mensaje": "Nivel de identidad validado con éxito"}


@router.get(
    "/acceso-restringido",
    response_model=dict,
    dependencies=[Depends(requerir_rol("autoridad_distrital", "auditor_forense"))],
)
async def acceso_restringido(sujeto: SujetoAutenticadoDep):
    return {"mensaje": "Acceso concedido a operaciones críticas"}


@router.get(
    "/usuarios",
    response_model=UsuariosPagina,
    dependencies=[Depends(requerir_permiso("usuarios:leer", "declarada"))],
)
async def listar_usuarios(
    service: IdentidadServiceDep,
    busqueda: str = Query("", max_length=100),
    limite: int = Query(20, ge=1, le=100),
    desplazamiento: int = Query(0, ge=0),
):
    return await service.listar_usuarios(busqueda, limite, desplazamiento)


@router.post(
    "/usuarios",
    response_model=UsuarioLectura,
    status_code=201,
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", "declarada"))],
)
async def crear_usuario(
    datos: UsuarioAltaAdministrativa, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    return await service.crear_usuario_administrado(datos, sujeto)


@router.patch(
    "/usuarios/{usuario_id}",
    response_model=UsuarioLectura,
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", "declarada"))],
)
async def editar_usuario(
    usuario_id: uuid.UUID,
    datos: UsuarioAdministrado,
    sujeto: SujetoAutenticadoDep,
    service: IdentidadServiceDep,
):
    return await service.editar_usuario(usuario_id, datos, sujeto)


@router.post(
    "/usuarios/{usuario_id}/revocar",
    response_model=MensajeRespuesta,
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", "declarada"))],
)
async def revocar_usuario(
    usuario_id: uuid.UUID, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    return await service.revocar_usuario(usuario_id, sujeto)


@router.get(
    "/usuarios/{usuario_id}/ambitos",
    response_model=list[AmbitoTerritorialLectura],
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", "declarada"))],
)
async def listar_ambitos_usuario(
    usuario_id: uuid.UUID,
    service: IdentidadServiceDep,
):
    return await service.listar_ambitos_usuario(usuario_id)


@router.post(
    "/usuarios/{usuario_id}/ambitos",
    response_model=AmbitoTerritorialLectura,
    status_code=201,
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", "declarada"))],
)
async def asignar_ambito_usuario(
    usuario_id: uuid.UUID,
    datos: AmbitoTerritorialCreacion,
    sujeto: SujetoAutenticadoDep,
    service: IdentidadServiceDep,
):
    return await service.asignar_ambito_usuario(usuario_id, datos, sujeto)


@router.delete(
    "/usuarios/{usuario_id}/ambitos/{ambito_id}",
    response_model=MensajeRespuesta,
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", "declarada"))],
)
async def revocar_ambito_usuario(
    usuario_id: uuid.UUID,
    ambito_id: uuid.UUID,
    sujeto: SujetoAutenticadoDep,
    service: IdentidadServiceDep,
    motivo: str = Query(min_length=10, max_length=500),
):
    return await service.revocar_ambito_usuario(usuario_id, ambito_id, motivo, sujeto)


@router.get(
    "/roles",
    response_model=list[RolLectura],
    dependencies=[Depends(requerir_permiso("usuarios:leer", "declarada"))],
)
async def listar_roles(service: IdentidadServiceDep):
    return await service.listar_roles()


@router.get(
    "/permisos",
    response_model=dict[str, str],
    dependencies=[Depends(requerir_permiso("usuarios:leer", "declarada"))],
)
async def listar_permisos():
    return PERMISOS


@router.post(
    "/roles",
    response_model=RolLectura,
    status_code=201,
    dependencies=[Depends(requerir_permiso("roles:gestionar", "declarada"))],
)
async def crear_rol(datos: RolCreacion, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep):
    return await service.crear_rol(datos, sujeto)


@router.patch(
    "/roles/{codigo}",
    response_model=RolLectura,
    dependencies=[Depends(requerir_permiso("roles:gestionar", "declarada"))],
)
async def editar_rol(
    codigo: str, datos: RolEdicion, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    return await service.editar_rol(codigo, datos, sujeto)


@router.delete(
    "/roles/{codigo}",
    response_model=MensajeRespuesta,
    dependencies=[Depends(requerir_permiso("roles:gestionar", "declarada"))],
)
async def eliminar_rol(
    codigo: str,
    sujeto: SujetoAutenticadoDep,
    service: IdentidadServiceDep,
    motivo: str = Query(min_length=10, max_length=500),
):
    return await service.eliminar_rol(codigo, motivo, sujeto)


@router.get(
    "/eventos",
    response_model=list[EventoLectura],
    dependencies=[Depends(requerir_permiso("identidad:auditar", "declarada"))],
)
async def eventos(
    service: IdentidadServiceDep,
    limite: int = Query(20, ge=1, le=100),
    desplazamiento: int = Query(0, ge=0),
):
    return await service.listar_eventos(limite, desplazamiento)


# ==============================================================================
# Endpoints de Autenticación Multifactor (MFA TOTP RFC 6238) [CIERRE-06]
# ==============================================================================


@router.get("/mfa/estado", response_model=MfaEstadoLectura)
async def obtener_estado_mfa(sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep):
    exigir_usuario(sujeto)
    return await service.obtener_estado_mfa(sujeto)


@router.post("/mfa/iniciar", response_model=MfaIniciarRespuesta)
async def iniciar_mfa(sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep):
    exigir_usuario(sujeto)
    return await service.iniciar_mfa(sujeto)


@router.post("/mfa/activar", response_model=MfaActivarRespuesta)
async def activar_mfa(
    datos: MfaCodigoPeticion, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    exigir_usuario(sujeto)
    return await service.activar_mfa(datos, sujeto)


@router.post("/mfa/desactivar", response_model=MensajeRespuesta)
async def desactivar_mfa(
    datos: MfaDesactivarPeticion, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    exigir_usuario(sujeto)
    return await service.desactivar_mfa(datos, sujeto)


@router.post("/mfa/recuperacion/regenerar", response_model=MfaActivarRespuesta)
async def regenerar_codigos_recuperacion(
    datos: MfaCodigoPeticion, sujeto: SujetoAutenticadoDep, service: IdentidadServiceDep
):
    exigir_usuario(sujeto)
    return await service.regenerar_codigos_recuperacion(datos, sujeto)


@router.post("/mfa/verificar", response_model=TokenRespuesta)
async def verificar_mfa(
    datos: MfaVerificarPeticion,
    request: Request,
    response: Response,
    service: IdentidadServiceDep,
):
    await service.limitar(
        "mfa_verificar", request.client.host if request.client else "local"
    )
    resultado = await service.verificar_desafio_mfa(datos)
    es_seguro = (
        request.app.state.settings.environment == "production"
        or request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    response.set_cookie(
        key="polis_session",
        value=resultado.token_acceso,
        max_age=request.app.state.settings.jwt_expiracion_horas * 3600,
        httponly=True,
        secure=es_seguro,
        samesite="lax",
        path="/",
    )
    return resultado

