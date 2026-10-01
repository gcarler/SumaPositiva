"""Dependencias inyectables de FastAPI para autenticación opcional y requerida de sesión."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.modules.sesion.schemas import SesionContexto
from app.modules.sesion.security import decodificar_token_sesion


def extraer_token_de_cabeceras(
    authorization: str | None = None,
    x_sesion_anonima: str | None = None,
) -> str | None:
    """Extrae el token JWT desde el encabezado Authorization o X-Sesion-Anonima."""
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if x_sesion_anonima:
        return x_sesion_anonima.strip()
    return None


async def obtener_sesion_opcional(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_sesion_anonima: Annotated[str | None, Header(alias="X-Sesion-Anonima")] = None,
) -> SesionContexto | None:
    """Reconoce opcionalmente la sesión anónima o verificada en cualquier endpoint."""
    token = extraer_token_de_cabeceras(authorization, x_sesion_anonima)
    if not token:
        return None

    from app.modules.identidad.deps import cargar_sujeto_vigente
    from app.modules.identidad.security import decodificar_token_acceso
    from app.modules.sesion.repository import SesionRepository

    settings = request.app.state.settings
    contexto = decodificar_token_acceso(token, settings)
    if contexto:
        sujeto = await cargar_sujeto_vigente(request, contexto)
        async with request.app.state.database.sessions() as session:
            registro = await SesionRepository(session).obtener_por_id(sujeto.sesion_id)
            if not registro or not registro.activa:
                raise HTTPException(401, "Sesión cívica inválida")
            return SesionContexto(
                sesion_id=registro.id,
                huella_hash=registro.huella_hash,
                expira_en=registro.expira_en,
                rol=sujeto.rol,
                es_anonimo=False,
            )
    return decodificar_token_sesion(token, settings)


async def obtener_sesion_requerida(
    sesion: Annotated[SesionContexto | None, Depends(obtener_sesion_opcional)],
) -> SesionContexto:
    """Exige una sesión cívica activa (anónima o verificada) para proceder."""
    if sesion is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token de sesión cívica válido para participar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return sesion


SesionOpcionalDep = Annotated[SesionContexto | None, Depends(obtener_sesion_opcional)]
SesionRequeridaDep = Annotated[SesionContexto, Depends(obtener_sesion_requerida)]
