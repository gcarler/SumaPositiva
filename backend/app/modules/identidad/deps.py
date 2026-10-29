from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings
from app.modules.identidad.mfa import acreditacion_sesion_mfa, rol_exige_mfa
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.identidad.security import decodificar_token_acceso
from app.modules.sesion.security import decodificar_token_sesion

bearer_scheme = HTTPBearer(auto_error=False)

# La sesión inicial limitada conserva una vía para configurar el primer factor.
# Las rutas de enrolamiento rechazan cualquier factor que ya esté activo.
_OPERACIONES_MFA_PENDIENTE = {
    ("GET", "/api/v1/identidad/perfil"),
    ("GET", "/api/v1/identidad/mfa/estado"),
    ("POST", "/api/v1/identidad/mfa/iniciar"),
    ("POST", "/api/v1/identidad/mfa/activar"),
    ("POST", "/api/v1/identidad/logout"),
}


async def cargar_sujeto_vigente(request, contexto):
    """La firma no basta: consultar sesión, usuario activo y permisos actuales."""
    from datetime import UTC, datetime
    from hmac import compare_digest

    from app.modules.identidad.repository import IdentidadRepository

    async with request.app.state.database.sessions() as session:
        repo = IdentidadRepository(session)
        registro = await repo.obtener_sesion(contexto.sesion_id)
        if (
            not registro
            or registro.usuario_id != contexto.sujeto_id
            or registro.revocada_en
            or registro.expira_en <= datetime.now(UTC)
        ):
            raise HTTPException(401, "Sesión inválida o revocada", headers={"WWW-Authenticate": "Bearer"})
        usuario = await repo.obtener_usuario_por_id(contexto.sujeto_id)
        if not usuario or not usuario.activo:
            raise HTTPException(401, "Sesión inválida o revocada", headers={"WWW-Authenticate": "Bearer"})
        settings = request.app.state.settings
        factor = usuario.mfa
        civica = await repo.obtener_sesion_civica(registro.id)
        verificada = bool(
            factor
            and factor.activo
            and civica
            and civica.activa
            and civica.expira_en > datetime.now(UTC)
            and isinstance(civica.metadatos.get("mfa_acreditacion"), str)
            and compare_digest(
                civica.metadatos["mfa_acreditacion"], acreditacion_sesion_mfa(factor, registro.id, settings)
            )
        )
        pendiente = rol_exige_mfa(usuario.rol.codigo, settings) and not verificada
        if pendiente and (request.method, request.scope["path"]) not in _OPERACIONES_MFA_PENDIENTE:
            raise HTTPException(403, "Debes completar MFA para acceder a esta operación")
        return SujetoAutenticadoContexto(
            sujeto_id=usuario.id,
            sesion_id=registro.id,
            rol=usuario.rol.codigo,
            nivel_identidad=usuario.nivel_identidad,
            permisos=[] if pendiente else usuario.rol.permisos,
            es_anonimo=False,
            mfa_pendiente=pendiente,
            mfa_verificada=verificada,
        )


async def obtener_sujeto_autenticado(
    request: Request,
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> SujetoAutenticadoContexto:
    if not credenciales:
        raise HTTPException(
            401,
            "No se proporcionaron credenciales de autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credenciales.credentials
    settings = getattr(request.app.state, "settings", None) or Settings()
    contexto = decodificar_token_acceso(token, settings)
    if contexto:
        return await cargar_sujeto_vigente(request, contexto)
    try:
        anonimo = decodificar_token_sesion(token, settings)
        return SujetoAutenticadoContexto(
            sujeto_id=anonimo.sesion_id,
            rol="ciudadano_anonimo",
            nivel_identidad="anonima",
            permisos=["aportes:crear", "aportes:leer", "aportes:apoyar"],
            es_anonimo=True,
        )
    except (HTTPException, ValueError, KeyError, TypeError):
        raise HTTPException(
            401, "Credenciales inválidas o token expirado", headers={"WWW-Authenticate": "Bearer"}
        ) from None


SujetoAutenticadoDep = Annotated[SujetoAutenticadoContexto, Depends(obtener_sujeto_autenticado)]


class requerir_rol:
    def __init__(self, *roles: str):
        self.roles = roles

    def __call__(self, sujeto: SujetoAutenticadoDep) -> SujetoAutenticadoContexto:
        if sujeto.rol not in self.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operación denegada. Roles permitidos: {', '.join(self.roles)}",
            )
        return sujeto


class requerir_permiso:
    def __init__(self, permiso: str, nivel_minimo: str = "anonima"):
        self.permiso = permiso
        self.nivel_minimo = nivel_minimo
        self.niveles = {"anonima": 0, "declarada": 1, "autenticada": 2, "verificada": 3}

    def __call__(self, sujeto: SujetoAutenticadoDep) -> SujetoAutenticadoContexto:
        # Verificar nivel de identidad
        nivel_sujeto_idx = self.niveles.get(sujeto.nivel_identidad, -1)
        nivel_minimo_idx = self.niveles.get(self.nivel_minimo, 0)

        if nivel_sujeto_idx < nivel_minimo_idx:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(f"Nivel de identidad insuficiente. Se requiere mínimo '{self.nivel_minimo}'."),
            )

        # Verificar permisos
        if self.permiso not in sujeto.permisos:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permiso '{self.permiso}' denegado.")
        return sujeto
