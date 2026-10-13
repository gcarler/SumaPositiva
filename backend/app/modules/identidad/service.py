import asyncio
import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.identidad import mfa as mfa_utils
from app.modules.identidad.catalogo import PERMISOS, ROLES_SISTEMA
from app.modules.identidad.correo import CorreoIdentidad, token_para_correo
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.schemas import (
    CambiarContrasena,
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
    RolCreacion,
    RolEdicion,
    RolLectura,
    SesionLectura,
    TokenRespuesta,
    UsuarioAdministrado,
    UsuarioAltaAdministrativa,
    UsuarioCreacion,
    UsuarioLectura,
    UsuariosPagina,
)
from app.modules.identidad.security import (
    crear_token_acceso,
    crear_token_desafio_mfa,
    decodificar_token_desafio_mfa,
    obtener_hash_contrasena,
    verificar_contrasena,
)

# Igualar el trabajo bcrypt en login con correos inexistentes (sin generar un hash por solicitud).
_HASH_FICTICIO = obtener_hash_contrasena("credencial-ficticia-no-utilizable")


class IdentidadService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None):
        self.repo = IdentidadRepository(session)
        self.settings = settings or Settings()

    async def registrar_usuario(self, datos: UsuarioCreacion) -> UsuarioLectura:
        return await self._crear_usuario(datos, None, codigo_rol="ciudadano")

    async def _crear_usuario(self, datos, actor, *, codigo_rol: str) -> UsuarioLectura:
        try:
            async with transaction(self.repo.session):
                if actor:
                    await self.repo.serializar_administracion()
                if await self.repo.obtener_usuario_por_correo(str(datos.correo)):
                    raise HTTPException(409, "El correo ya se encuentra registrado")
                rol = await self.repo.obtener_rol_por_codigo(codigo_rol)
                if not rol:
                    raise HTTPException(422, "Rol no válido")
                usuario = await self.repo.crear_usuario(
                    datos,
                    await asyncio.to_thread(obtener_hash_contrasena, datos.contrasena),
                    rol.id,
                )
                await self.repo.registrar_evento(
                    "usuario_creado",
                    actor,
                    usuario.id,
                    {"rol": rol.codigo, "motivo": getattr(datos, "motivo", "Registro ciudadano")},
                )
                return UsuarioLectura.model_validate(usuario)
        except IntegrityError as error:
            raise HTTPException(409, "El correo ya se encuentra registrado") from error

    async def crear_usuario_administrado(self, datos: UsuarioAltaAdministrativa, actor):
        rol = await self.repo.obtener_rol_por_codigo(datos.codigo_rol)
        if rol:
            self._validar_permisos(rol.permisos, actor)
        return await self._crear_usuario(datos, actor.sujeto_id, codigo_rol=datos.codigo_rol)

    async def autenticar_usuario(self, peticion: LoginPeticion) -> TokenRespuesta:
        async with transaction(self.repo.session):
            usuario = await self.repo.obtener_usuario_por_correo(str(peticion.correo))
            valido = await asyncio.to_thread(
                verificar_contrasena,
                peticion.contrasena,
                usuario.hash_contrasena if usuario else _HASH_FICTICIO,
            )
            if not usuario or not valido:
                raise HTTPException(
                    401, "Correo o contraseña incorrectos", headers={"WWW-Authenticate": "Bearer"}
                )
            usuario = await self.repo.obtener_usuario_por_id(usuario.id, bloquear=True)
            if not usuario.activo:
                raise HTTPException(403, "Usuario inactivo")

            mfa_obj = usuario.mfa
            if mfa_obj and mfa_obj.activo:
                if mfa_obj.bloqueado_hasta and mfa_obj.bloqueado_hasta > datetime.now(UTC):
                    minutos = max(
                        1,
                        int((mfa_obj.bloqueado_hasta - datetime.now(UTC)).total_seconds() / 60),
                    )
                    raise HTTPException(
                        429,
                        f"Cuenta temporalmente bloqueada por intentos fallidos de MFA. Reintente en {minutos} minutos.",
                    )
                token_desafio = crear_token_desafio_mfa(
                    usuario.id,
                    expira_minutos=self.settings.mfa_token_expira_minutos,
                    settings=self.settings,
                )
                await self.repo.registrar_evento(
                    "mfa_desafio_emitido", usuario.id, usuario.id, {"metodo": "login"}
                )
                return TokenRespuesta(
                    token_acceso="",
                    rol=usuario.rol.codigo,
                    nivel_identidad=usuario.nivel_identidad,
                    permisos=[],
                    expira_en=datetime.now(UTC)
                    + timedelta(minutes=self.settings.mfa_token_expira_minutos),
                    usuario=UsuarioLectura.model_validate(usuario),
                    mfa_requerido=True,
                    token_desafio_mfa=token_desafio,
                )

            expira = datetime.now(UTC) + timedelta(hours=self.settings.jwt_expiracion_horas)
            huella = hmac.new(
                self.settings.ip_salt.encode(), uuid.uuid4().bytes, hashlib.sha256
            ).hexdigest()
            sesion = await self.repo.crear_sesion(usuario.id, expira, huella)
            token = crear_token_acceso(
                usuario.id,
                usuario.rol.codigo,
                usuario.nivel_identidad,
                usuario.rol.permisos,
                sesion_id=sesion.id,
                settings=self.settings,
            )
            await self.repo.registrar_evento("login", usuario.id, usuario.id)
            return TokenRespuesta(
                token_acceso=token,
                rol=usuario.rol.codigo,
                nivel_identidad=usuario.nivel_identidad,
                permisos=usuario.rol.permisos,
                expira_en=expira,
                usuario=UsuarioLectura.model_validate(usuario),
                mfa_requerido=False,
            )

    def _verificar_google_token(self, id_token: str) -> dict:
        """Verificar firma, emisor, caducidad y audiencia; nunca decodificar sin firma."""
        audiencia = self.settings.google_client_id
        if not audiencia or audiencia.startswith("PENDIENTE"):
            raise HTTPException(503, "Acceso con Google no configurado")
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token

            claims = google_id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                audience=audiencia,
                clock_skew_in_seconds=10,
            )
            if not claims.get("sub") or claims.get("email_verified") is not True:
                raise ValueError("Identidad de Google no verificada")
            return claims
        except Exception:
            raise HTTPException(401, "Token de Google inválido o expirado") from None

    async def autenticar_google_oauth(self, peticion: GoogleOAuthPeticion) -> TokenRespuesta:
        claims = await asyncio.to_thread(self._verificar_google_token, peticion.id_token)
        correo = str(claims.get("email", "")).strip().lower()
        if not correo:
            raise HTTPException(400, "El token de Google no contiene un correo electrónico válido")
        if claims.get("email_verified") is False:
            raise HTTPException(400, "El correo de Google no se encuentra verificado")

        # El proveedor autentica la cuenta; el rol institucional lo asigna la administración.
        # Un dominio o texto del correo no concede privilegios ni cambia un rol existente.
        codigo_rol = "ciudadano"
        nivel_identidad = "declarada"
        if not correo.endswith("@gmail.com") and not claims.get("hd"):
            raise HTTPException(403, "Esta cuenta requiere iniciar sesión con correo y contraseña")

        async with transaction(self.repo.session):
            usuario = await self.repo.obtener_usuario_por_correo(correo)
            if usuario:
                usuario = await self.repo.obtener_usuario_por_id(usuario.id, bloquear=True)
                google_sub = (usuario.metadatos or {}).get("google_sub")
                if google_sub and google_sub != claims.get("sub"):
                    raise HTTPException(403, "La cuenta de Google no corresponde a este usuario")
                if not usuario.activo:
                    raise HTTPException(403, "Usuario inactivo")
                if not usuario.correo_verificado_en:
                    usuario.correo_verificado_en = datetime.now(UTC)
            else:
                rol = await self.repo.obtener_rol_por_codigo(codigo_rol)
                if not rol:
                    raise HTTPException(500, f"Rol institucional {codigo_rol} no configurado")

                nombres = claims.get("given_name") or claims.get("name", "Usuario").split()[0]
                apellidos = claims.get("family_name") or (
                    " ".join(claims.get("name", "Google").split()[1:])
                    if len(claims.get("name", "").split()) > 1
                    else "Google"
                )

                usuario = await self.repo.crear_usuario_oauth(
                    correo=correo,
                    nombres=nombres,
                    apellidos=apellidos,
                    rol_id=rol.id,
                    nivel_identidad=nivel_identidad,
                    hash_contrasena=await asyncio.to_thread(
                        obtener_hash_contrasena, uuid.uuid4().hex
                    ),
                    metadatos={"origen": "google_oauth", "google_sub": claims.get("sub")},
                )

            mfa_obj = usuario.mfa
            if mfa_obj and mfa_obj.activo:
                if mfa_obj.bloqueado_hasta and mfa_obj.bloqueado_hasta > datetime.now(UTC):
                    minutos = max(
                        1,
                        int((mfa_obj.bloqueado_hasta - datetime.now(UTC)).total_seconds() / 60),
                    )
                    raise HTTPException(
                        429,
                        f"Cuenta temporalmente bloqueada por intentos fallidos de MFA. Reintente en {minutos} minutos.",
                    )
                token_desafio = crear_token_desafio_mfa(
                    usuario.id,
                    expira_minutos=self.settings.mfa_token_expira_minutos,
                    settings=self.settings,
                )
                await self.repo.registrar_evento(
                    "mfa_desafio_emitido", usuario.id, usuario.id, {"metodo": "google_oauth"}
                )
                return TokenRespuesta(
                    token_acceso="",
                    rol=usuario.rol.codigo,
                    nivel_identidad=usuario.nivel_identidad,
                    permisos=[],
                    expira_en=datetime.now(UTC)
                    + timedelta(minutes=self.settings.mfa_token_expira_minutos),
                    usuario=UsuarioLectura.model_validate(usuario),
                    mfa_requerido=True,
                    token_desafio_mfa=token_desafio,
                )

            expira = datetime.now(UTC) + timedelta(hours=self.settings.jwt_expiracion_horas)
            huella = hmac.new(
                self.settings.ip_salt.encode(), uuid.uuid4().bytes, hashlib.sha256
            ).hexdigest()
            sesion = await self.repo.crear_sesion(usuario.id, expira, huella)
            token = crear_token_acceso(
                usuario.id,
                usuario.rol.codigo,
                usuario.nivel_identidad,
                usuario.rol.permisos,
                sesion_id=sesion.id,
                settings=self.settings,
            )
            await self.repo.registrar_evento(
                "login_oauth_google",
                usuario.id,
                usuario.id,
                {"email": correo, "rol": usuario.rol.codigo, "nivel": usuario.nivel_identidad},
            )

            return TokenRespuesta(
                token_acceso=token,
                rol=usuario.rol.codigo,
                nivel_identidad=usuario.nivel_identidad,
                permisos=usuario.rol.permisos,
                expira_en=expira,
                usuario=UsuarioLectura.model_validate(usuario),
                mfa_requerido=False,
            )

    async def obtener_perfil(self, usuario_id: uuid.UUID) -> UsuarioLectura:
        return UsuarioLectura.model_validate(await self._usuario(usuario_id))

    async def _usuario(self, usuario_id, *, bloquear=False):
        usuario = await self.repo.obtener_usuario_por_id(usuario_id, bloquear=bloquear)
        if not usuario:
            raise HTTPException(404, "Usuario no encontrado")
        return usuario

    async def editar_perfil(self, datos: PerfilEdicion, actor):
        async with transaction(self.repo.session):
            usuario = await self._usuario(actor.sujeto_id, bloquear=True)
            usuario.nombres, usuario.apellidos = datos.nombres, datos.apellidos
            usuario.actualizado_en = datetime.now(UTC)
            await self.repo.guardar()
            await self.repo.registrar_evento("perfil_editado", actor.sujeto_id, usuario.id)
            return UsuarioLectura.model_validate(usuario)

    async def cerrar_sesiones(self, actor, sesion_id=None):
        async with transaction(self.repo.session):
            if sesion_id:
                sesion = await self.repo.obtener_sesion(sesion_id)
                if not sesion or sesion.usuario_id != actor.sujeto_id:
                    raise HTTPException(404, "Sesión no encontrada")
            await self.repo.revocar_sesiones(actor.sujeto_id, sesion_id)
            await self.repo.registrar_evento("sesion_revocada", actor.sujeto_id, actor.sujeto_id)
            return MensajeRespuesta(mensaje="Sesión cerrada")

    async def listar_sesiones(self, actor):
        return [
            SesionLectura(
                id=s.id,
                creada_en=s.creada_en,
                expira_en=s.expira_en,
                actual=s.id == actor.sesion_id,
            )
            for s in await self.repo.listar_sesiones(actor.sujeto_id)
        ]

    async def cambiar_contrasena(self, datos: CambiarContrasena, actor):
        async with transaction(self.repo.session):
            usuario = await self._usuario(actor.sujeto_id, bloquear=True)
            if not await asyncio.to_thread(
                verificar_contrasena, datos.contrasena_actual, usuario.hash_contrasena
            ):
                raise HTTPException(400, "La contraseña actual no es correcta")
            await self._actualizar_contrasena(usuario, datos.contrasena, actor.sujeto_id)
            return MensajeRespuesta(mensaje="Contraseña actualizada. Inicia sesión de nuevo")

    async def _actualizar_contrasena(self, usuario, contrasena, actor_id):
        usuario.hash_contrasena = await asyncio.to_thread(obtener_hash_contrasena, contrasena)
        usuario.actualizado_en = datetime.now(UTC)
        await self.repo.invalidar_tokens(usuario.id, "recuperar")
        await self.repo.revocar_sesiones(usuario.id)
        await self.repo.guardar()
        await self.repo.registrar_evento("contrasena_actualizada", actor_id, usuario.id)

    async def solicitar_correo(self, correo, proposito, transporte: CorreoIdentidad, actor=None):
        transporte.comprobar_configuracion()
        nonce = uuid.uuid4()
        token = token_para_correo(nonce, self.settings)
        async with transaction(self.repo.session):
            usuario = (
                await self._usuario(actor.sujeto_id, bloquear=True)
                if actor
                else await self.repo.obtener_usuario_por_correo(str(correo))
            )
            if (
                usuario
                and usuario.activo
                and (proposito != "verificar" or usuario.correo_verificado_en is None)
            ):
                await self.repo.crear_token(
                    hashlib.sha256(token.encode()).hexdigest(),
                    usuario.id,
                    proposito,
                    datetime.now(UTC) + timedelta(minutes=self.settings.identidad_token_minutos),
                    nonce,
                )
                await self.repo.registrar_evento(
                    "correo_solicitado",
                    actor.sujeto_id if actor else None,
                    usuario.id,
                    {"proposito": proposito},
                )
            # El worker entrega después del commit. La respuesta pública no incluye token,
            # existencia de cuenta ni depende del tiempo de entrega SMTP.
            return MensajeRespuesta(
                mensaje=("Si la cuenta cumple los requisitos, recibirás un enlace por correo")
            )

    async def consumir_token(self, token, proposito, contrasena=None):
        async with transaction(self.repo.session):
            registro = await self.repo.obtener_token(
                hashlib.sha256(token.encode()).hexdigest(), proposito
            )
            if not registro or registro.usado_en or registro.expira_en <= datetime.now(UTC):
                raise HTTPException(400, "Enlace inválido, utilizado o caducado")
            usuario = await self._usuario(registro.usuario_id, bloquear=True)
            registro = await self.repo.obtener_token(registro.hash_token, proposito, bloquear=True)
            if registro.usado_en or registro.expira_en <= datetime.now(UTC):
                raise HTTPException(400, "Enlace inválido, utilizado o caducado")
            if not usuario.activo:
                raise HTTPException(400, "Enlace inválido, utilizado o caducado")
            registro.usado_en = datetime.now(UTC)
            if proposito == "recuperar":
                await self._actualizar_contrasena(usuario, contrasena, usuario.id)
            else:
                usuario.correo_verificado_en = datetime.now(UTC)
                # Verificar correo no acredita nombramiento ni identidad institucional.
                await self.repo.invalidar_tokens(usuario.id, "verificar")
                await self.repo.guardar()
                await self.repo.registrar_evento("correo_verificado", usuario.id, usuario.id)
            return MensajeRespuesta(mensaje="Solicitud completada. Puedes iniciar sesión")

    async def solicitar_magic_link(
        self, correo: str, transporte: CorreoIdentidad
    ) -> MensajeRespuesta:
        transporte.comprobar_configuracion()
        correo_norm = str(correo).strip().lower()
        nonce = uuid.uuid4()
        token = token_para_correo(nonce, self.settings)
        async with transaction(self.repo.session):
            usuario = await self.repo.obtener_usuario_por_correo(correo_norm)
            if not usuario:
                rol = await self.repo.obtener_rol_por_codigo("ciudadano")
                if not rol:
                    raise HTTPException(500, "Rol ciudadano no configurado")
                nombre_base = correo_norm.split("@")[0].replace(".", " ").title()
                usuario = await self.repo.crear_usuario_oauth(
                    correo=correo_norm,
                    nombres=nombre_base or "Ciudadano",
                    apellidos="Cartagena",
                    rol_id=rol.id,
                    nivel_identidad="declarada",
                    hash_contrasena=await asyncio.to_thread(
                        obtener_hash_contrasena, uuid.uuid4().hex
                    ),
                    metadatos={"origen": "magic_link"},
                )
            elif not usuario.activo:
                raise HTTPException(403, "Usuario inactivo")

            expira_token = datetime.now(UTC) + timedelta(minutes=15)
            await self.repo.crear_token(
                hashlib.sha256(token.encode()).hexdigest(),
                usuario.id,
                "magic_link",
                expira_token,
                nonce,
            )
            await self.repo.registrar_evento(
                "magic_link_solicitado",
                None,
                usuario.id,
                {"proposito": "magic_link"},
            )

        return MensajeRespuesta(
            mensaje="Si la cuenta cumple los requisitos, recibirás un enlace de acceso por correo válido por 15 minutos"
        )

    async def consumir_magic_link(self, token: str) -> TokenRespuesta:
        async with transaction(self.repo.session):
            hash_token = hashlib.sha256(token.encode()).hexdigest()
            registro = await self.repo.obtener_token(hash_token, "magic_link")
            if not registro or registro.usado_en or registro.expira_en <= datetime.now(UTC):
                raise HTTPException(400, "Enlace inválido, utilizado o caducado")
            usuario = await self._usuario(registro.usuario_id, bloquear=True)
            registro = await self.repo.obtener_token(registro.hash_token, "magic_link", bloquear=True)
            if registro.usado_en or registro.expira_en <= datetime.now(UTC):
                raise HTTPException(400, "Enlace inválido, utilizado o caducado")
            if not usuario.activo:
                raise HTTPException(403, "Usuario inactivo")

            registro.usado_en = datetime.now(UTC)
            if not usuario.correo_verificado_en:
                usuario.correo_verificado_en = datetime.now(UTC)

            await self.repo.invalidar_tokens(usuario.id, "magic_link")
            await self.repo.guardar()

            mfa_obj = usuario.mfa
            if mfa_obj and mfa_obj.activo:
                if mfa_obj.bloqueado_hasta and mfa_obj.bloqueado_hasta > datetime.now(UTC):
                    minutos = max(
                        1,
                        int((mfa_obj.bloqueado_hasta - datetime.now(UTC)).total_seconds() / 60),
                    )
                    raise HTTPException(
                        429,
                        f"Cuenta temporalmente bloqueada por intentos fallidos de MFA. Reintente en {minutos} minutos.",
                    )
                token_desafio = crear_token_desafio_mfa(
                    usuario.id,
                    expira_minutos=self.settings.mfa_token_expira_minutos,
                    settings=self.settings,
                )
                await self.repo.registrar_evento(
                    "mfa_desafio_emitido", usuario.id, usuario.id, {"metodo": "magic_link"}
                )
                return TokenRespuesta(
                    token_acceso="",
                    rol=usuario.rol.codigo,
                    nivel_identidad=usuario.nivel_identidad,
                    permisos=[],
                    expira_en=datetime.now(UTC)
                    + timedelta(minutes=self.settings.mfa_token_expira_minutos),
                    usuario=UsuarioLectura.model_validate(usuario),
                    mfa_requerido=True,
                    token_desafio_mfa=token_desafio,
                )

            expira = datetime.now(UTC) + timedelta(hours=self.settings.jwt_expiracion_horas)
            huella = hmac.new(
                self.settings.ip_salt.encode(), uuid.uuid4().bytes, hashlib.sha256
            ).hexdigest()
            sesion = await self.repo.crear_sesion(usuario.id, expira, huella)
            jwt_token = crear_token_acceso(
                usuario.id,
                usuario.rol.codigo,
                usuario.nivel_identidad,
                usuario.rol.permisos,
                sesion_id=sesion.id,
                settings=self.settings,
            )
            await self.repo.registrar_evento(
                "login_magic_link",
                usuario.id,
                usuario.id,
                {"email": usuario.correo, "rol": usuario.rol.codigo, "nivel": usuario.nivel_identidad},
            )

            return TokenRespuesta(
                token_acceso=jwt_token,
                rol=usuario.rol.codigo,
                nivel_identidad=usuario.nivel_identidad,
                permisos=usuario.rol.permisos,
                expira_en=expira,
                usuario=UsuarioLectura.model_validate(usuario),
                mfa_requerido=False,
            )

    async def listar_usuarios(self, busqueda, limite, desplazamiento):
        total, usuarios = await self.repo.listar_usuarios(busqueda, limite, desplazamiento)
        return UsuariosPagina(
            total=total, elementos=[UsuarioLectura.model_validate(u) for u in usuarios]
        )

    async def editar_usuario(self, usuario_id, datos: UsuarioAdministrado, actor):
        async with transaction(self.repo.session):
            await self.repo.serializar_administracion()
            usuario = await self._usuario(usuario_id, bloquear=True)
            rol = await self.repo.obtener_rol_por_codigo(datos.codigo_rol)
            if not rol:
                raise HTTPException(422, "Rol no válido")
            if (
                usuario.rol.codigo == "administrador_identidades"
                and (not datos.activo or datos.codigo_rol != "administrador_identidades")
                and not await self.repo.contar_administradores(excluir=usuario.id)
            ):
                raise HTTPException(409, "Debe permanecer al menos un administrador activo")
            self._validar_permisos(rol.permisos, actor)
            if (
                usuario.rol.codigo == "administrador_identidades"
                and actor.rol != usuario.rol.codigo
            ):
                raise HTTPException(403, "Solo un administrador puede modificar otro administrador")
            anterior = {"rol": usuario.rol.codigo, "activo": usuario.activo}
            usuario.rol_id, usuario.rol = rol.id, rol
            usuario.activo = datos.activo
            usuario.nombres, usuario.apellidos = datos.nombres, datos.apellidos
            usuario.actualizado_en = datetime.now(UTC)
            await self.repo.revocar_sesiones(usuario.id)
            await self.repo.guardar()
            await self.repo.registrar_evento(
                "usuario_administrado",
                actor.sujeto_id,
                usuario.id,
                {
                    "antes": anterior,
                    "despues": {"rol": rol.codigo, "activo": datos.activo},
                    "motivo": datos.motivo,
                },
            )
            return UsuarioLectura.model_validate(usuario)

    async def revocar_usuario(self, usuario_id, actor):
        async with transaction(self.repo.session):
            await self._usuario(usuario_id, bloquear=True)
            await self.repo.revocar_sesiones(usuario_id)
            await self.repo.registrar_evento(
                "sesiones_revocadas_admin", actor.sujeto_id, usuario_id
            )
            return MensajeRespuesta(mensaje="Sesiones del usuario revocadas")

    async def listar_eventos(self, limite, desplazamiento):
        from app.modules.identidad.schemas import EventoLectura

        return [
            EventoLectura.model_validate(e)
            for e in await self.repo.listar_eventos(limite, desplazamiento)
        ]

    def _rol_lectura(self, rol):
        return RolLectura(
            id=rol.id,
            codigo=rol.codigo,
            nombre=rol.nombre,
            permisos=rol.permisos,
            sistema=rol.codigo in ROLES_SISTEMA,
        )

    async def listar_roles(self):
        return [self._rol_lectura(r) for r in await self.repo.listar_roles()]

    def _validar_permisos(self, permisos, actor):
        if set(permisos) - PERMISOS.keys():
            raise HTTPException(422, "La lista contiene permisos desconocidos")
        if actor.rol != "administrador_identidades" and set(permisos) - set(actor.permisos):
            raise HTTPException(403, "No puedes conceder permisos que no posees")
        if actor.rol != "administrador_identidades" and set(permisos).intersection(
            {"usuarios:gestionar", "roles:gestionar"}
        ):
            raise HTTPException(403, "Solo el administrador concede permisos administrativos")
        return sorted(set(permisos))

    async def crear_rol(self, datos: RolCreacion, actor):
        permisos = self._validar_permisos(datos.permisos, actor)
        try:
            async with transaction(self.repo.session):
                await self.repo.serializar_administracion()
                if await self.repo.obtener_rol_por_codigo(datos.codigo):
                    raise HTTPException(409, "El código de rol ya existe")
                rol = await self.repo.crear_rol(datos.codigo, datos.nombre, permisos)
                await self.repo.registrar_evento(
                    "rol_creado",
                    actor.sujeto_id,
                    rol.id,
                    {"codigo": rol.codigo, "permisos": permisos, "motivo": datos.motivo},
                )
                return self._rol_lectura(rol)
        except IntegrityError as error:
            raise HTTPException(409, "El código de rol ya existe") from error

    async def editar_rol(self, codigo, datos: RolEdicion, actor):
        permisos = self._validar_permisos(datos.permisos, actor)
        async with transaction(self.repo.session):
            await self.repo.serializar_administracion()
            rol = await self.repo.obtener_rol_por_codigo(codigo)
            if not rol:
                raise HTTPException(404, "Rol no encontrado")
            if codigo in ROLES_SISTEMA:
                raise HTTPException(409, "Los roles del sistema cambian mediante migraciones")
            anterior = rol.permisos
            rol.nombre, rol.permisos = datos.nombre, permisos
            await self.repo.guardar()
            await self.repo.registrar_evento(
                "rol_editado",
                actor.sujeto_id,
                rol.id,
                {"antes": anterior, "despues": permisos, "motivo": datos.motivo},
            )
            return self._rol_lectura(rol)

    async def eliminar_rol(self, codigo, motivo, actor):
        async with transaction(self.repo.session):
            await self.repo.serializar_administracion()
            rol = await self.repo.obtener_rol_por_codigo(codigo)
            if not rol:
                raise HTTPException(404, "Rol no encontrado")
            if codigo in ROLES_SISTEMA or await self.repo.usuarios_de_rol(rol.id):
                raise HTTPException(409, "No se puede eliminar un rol del sistema o asignado")
            await self.repo.registrar_evento(
                "rol_eliminado", actor.sujeto_id, rol.id, {"codigo": codigo, "motivo": motivo}
            )
            await self.repo.eliminar_rol(rol)
            return MensajeRespuesta(mensaje="Rol eliminado")

    async def limitar(self, accion, ip, correo=None):
        excedido = False
        async with transaction(self.repo.session):
            for tipo, valor, maximo in (
                [
                    ("ip", ip, self.settings.identidad_limite_ip),
                    ("cuenta", str(correo).strip().lower(), self.settings.identidad_limite_cuenta),
                ]
                if correo
                else [("ip", ip, self.settings.identidad_limite_ip)]
            ):
                clave = hmac.new(
                    self.settings.ip_salt.encode(),
                    f"{accion}:{tipo}:{valor}".encode(),
                    hashlib.sha256,
                ).hexdigest()
                intentos = await self.repo.consumir_limite(
                    clave, self.settings.identidad_ventana_segundos
                )
                excedido = excedido or intentos > maximo
        if excedido:
            raise HTTPException(
                429,
                "Demasiados intentos. Inténtalo más tarde",
                headers={"Retry-After": str(self.settings.identidad_ventana_segundos)},
            )

    def _rol_exige_mfa(self, codigo_rol: str) -> bool:
        if not self.settings.mfa_roles_exigidos:
            return False
        roles = [
            r.strip().lower()
            for r in self.settings.mfa_roles_exigidos.split(",")
            if r.strip()
        ]
        return codigo_rol.lower() in roles

    async def obtener_estado_mfa(self, actor) -> MfaEstadoLectura:
        usuario = await self._usuario(actor.sujeto_id)
        mfa_obj = usuario.mfa
        activo = bool(mfa_obj and mfa_obj.activo)
        codigos_restantes = (
            len(mfa_obj.codigos_recuperacion) if mfa_obj and mfa_obj.activo else 0
        )
        activado_en = mfa_obj.activado_en if mfa_obj else None
        exigido_por_rol = self._rol_exige_mfa(usuario.rol.codigo)
        return MfaEstadoLectura(
            activo=activo,
            codigos_restantes=codigos_restantes,
            activado_en=activado_en,
            exigido_por_rol=exigido_por_rol,
        )

    async def iniciar_mfa(self, actor) -> MfaIniciarRespuesta:
        async with transaction(self.repo.session):
            usuario = await self._usuario(actor.sujeto_id, bloquear=True)
            secreto_b32 = mfa_utils.generar_secreto_totp()
            secreto_cifrado = mfa_utils.cifrar_secreto_totp(secreto_b32, self.settings)
            await self.repo.guardar_mfa_usuario(usuario.id, secreto_cifrado, [])
            await self.repo.registrar_evento("mfa_iniciado", actor.sujeto_id, usuario.id)
            otpauth_uri = mfa_utils.construir_uri_totp(usuario.correo, secreto_b32)
            qr_base64 = mfa_utils.generar_qr_code_data_uri(otpauth_uri)
            return MfaIniciarRespuesta(
                secreto_b32=secreto_b32,
                otpauth_uri=otpauth_uri,
                qr_code_base64=qr_base64,
            )

    async def activar_mfa(self, datos: MfaCodigoPeticion, actor) -> MfaActivarRespuesta:
        async with transaction(self.repo.session):
            usuario = await self._usuario(actor.sujeto_id, bloquear=True)
            mfa_obj = await self.repo.obtener_mfa_usuario(usuario.id, bloquear=True)
            if not mfa_obj:
                raise HTTPException(400, "Debe iniciar la configuración de MFA antes de activarla")
            secreto_b32 = mfa_utils.descifrar_secreto_totp(mfa_obj.secreto_cifrado, self.settings)
            valido, paso = mfa_utils.verificar_codigo_totp(secreto_b32, datos.codigo)
            if not valido:
                raise HTTPException(400, "Código TOTP inválido. Verifique la sincronización horaria.")

            codigos_recuperacion = mfa_utils.generar_codigos_recuperacion(8)
            hashes = [
                mfa_utils.hashear_codigo_recuperacion(c, self.settings.ip_salt)
                for c in codigos_recuperacion
            ]
            mfa_obj.codigos_recuperacion = hashes
            mfa_obj.activo = True
            mfa_obj.activado_en = datetime.now(UTC)
            mfa_obj.ultimo_paso_totp = paso
            mfa_obj.intentos_fallidos = 0
            mfa_obj.bloqueado_hasta = None
            mfa_obj.actualizado_en = datetime.now(UTC)
            await self.repo.guardar()
            await self.repo.registrar_evento("mfa_activado", actor.sujeto_id, usuario.id)
            return MfaActivarRespuesta(
                mensaje="Autenticación en dos pasos (TOTP) activada exitosamente.",
                codigos_recuperacion=codigos_recuperacion,
            )

    async def desactivar_mfa(self, datos: MfaDesactivarPeticion, actor) -> MensajeRespuesta:
        async with transaction(self.repo.session):
            usuario = await self._usuario(actor.sujeto_id, bloquear=True)
            mfa_obj = await self.repo.obtener_mfa_usuario(usuario.id, bloquear=True)
            if not mfa_obj or not mfa_obj.activo:
                raise HTTPException(400, "MFA no está activo")

            valido = await asyncio.to_thread(
                verificar_contrasena, datos.contrasena, usuario.hash_contrasena
            )
            if not valido:
                raise HTTPException(401, "Contraseña incorrecta para confirmar la desactivación de MFA")

            await self.repo.desactivar_mfa_usuario(usuario.id)
            await self.repo.registrar_evento("mfa_desactivado", actor.sujeto_id, usuario.id)
            return MensajeRespuesta(mensaje="MFA desactivado exitosamente")

    async def regenerar_codigos_recuperacion(
        self, datos: MfaCodigoPeticion, actor
    ) -> MfaActivarRespuesta:
        async with transaction(self.repo.session):
            usuario = await self._usuario(actor.sujeto_id, bloquear=True)
            mfa_obj = await self.repo.obtener_mfa_usuario(usuario.id, bloquear=True)
            if not mfa_obj or not mfa_obj.activo:
                raise HTTPException(400, "MFA no está activo")

            secreto_b32 = mfa_utils.descifrar_secreto_totp(mfa_obj.secreto_cifrado, self.settings)
            valido, paso = mfa_utils.verificar_codigo_totp(
                secreto_b32, datos.codigo, ultimo_paso=mfa_obj.ultimo_paso_totp
            )
            if not valido:
                raise HTTPException(400, "Código TOTP inválido o ya utilizado")

            codigos = mfa_utils.generar_codigos_recuperacion(8)
            hashes = [
                mfa_utils.hashear_codigo_recuperacion(c, self.settings.ip_salt) for c in codigos
            ]
            mfa_obj.codigos_recuperacion = hashes
            mfa_obj.ultimo_paso_totp = paso
            mfa_obj.actualizado_en = datetime.now(UTC)
            await self.repo.guardar()
            await self.repo.registrar_evento(
                "mfa_codigos_regenerados", actor.sujeto_id, usuario.id
            )
            return MfaActivarRespuesta(
                mensaje="Nuevos códigos de recuperación generados exitosamente.",
                codigos_recuperacion=codigos,
            )

    async def verificar_desafio_mfa(self, datos: MfaVerificarPeticion) -> TokenRespuesta:
        usuario_id = decodificar_token_desafio_mfa(datos.token_desafio, self.settings)
        if not usuario_id:
            raise HTTPException(401, "Token de desafío MFA inválido o expirado")

        async with transaction(self.repo.session):
            usuario = await self.repo.obtener_usuario_por_id(usuario_id, bloquear=True)
            if not usuario or not usuario.activo:
                raise HTTPException(403, "Usuario inactivo")

            mfa_obj = await self.repo.obtener_mfa_usuario(usuario.id, bloquear=True)
            if not mfa_obj or not mfa_obj.activo:
                raise HTTPException(400, "MFA no está activo para este usuario")

            ahora = datetime.now(UTC)
            if mfa_obj.bloqueado_hasta and mfa_obj.bloqueado_hasta > ahora:
                minutos = max(
                    1, int((mfa_obj.bloqueado_hasta - ahora).total_seconds() / 60)
                )
                raise HTTPException(
                    429,
                    f"Cuenta bloqueada temporalmente por intentos fallidos de MFA. Reintente en {minutos} minutos.",
                )

            es_valido = False
            es_codigo_recuperacion = False
            paso_exitoso = None
            secreto_b32 = mfa_utils.descifrar_secreto_totp(
                mfa_obj.secreto_cifrado, self.settings
            )

            valido_totp, paso_totp = mfa_utils.verificar_codigo_totp(
                secreto_b32, datos.codigo, ultimo_paso=mfa_obj.ultimo_paso_totp
            )
            if valido_totp:
                es_valido = True
                paso_exitoso = paso_totp
            else:
                ok_rec, restantes = mfa_utils.verificar_y_consumir_codigo_recuperacion(
                    datos.codigo, mfa_obj.codigos_recuperacion, self.settings.ip_salt
                )
                if ok_rec:
                    es_valido = True
                    es_codigo_recuperacion = True
                    mfa_obj.codigos_recuperacion = restantes

            if not es_valido:
                mfa_obj.intentos_fallidos += 1
                if mfa_obj.intentos_fallidos >= self.settings.mfa_max_intentos:
                    mfa_obj.bloqueado_hasta = ahora + timedelta(
                        minutes=self.settings.mfa_bloqueo_minutos
                    )
                    mfa_obj.intentos_fallidos = 0
                    await self.repo.registrar_evento(
                        "mfa_bloqueo_activado",
                        usuario.id,
                        usuario.id,
                        {"motivo": "exceso_intentos_mfa"},
                    )
                    await self.repo.guardar()
                    raise HTTPException(
                        429,
                        "Demasiados intentos fallidos. Cuenta temporalmente bloqueada.",
                    )
                await self.repo.registrar_evento(
                    "mfa_fallido",
                    usuario.id,
                    usuario.id,
                    {"intentos": mfa_obj.intentos_fallidos},
                )
                await self.repo.guardar()
                raise HTTPException(401, "Código de verificación inválido")

            mfa_obj.intentos_fallidos = 0
            mfa_obj.bloqueado_hasta = None
            mfa_obj.ultimo_uso_en = ahora
            if paso_exitoso is not None:
                mfa_obj.ultimo_paso_totp = paso_exitoso
            await self.repo.guardar()

            if es_codigo_recuperacion:
                await self.repo.registrar_evento(
                    "mfa_codigo_recuperacion_usado",
                    usuario.id,
                    usuario.id,
                    {"restantes": len(mfa_obj.codigos_recuperacion)},
                )
            else:
                await self.repo.registrar_evento("mfa_verificado", usuario.id, usuario.id)

            expira = ahora + timedelta(hours=self.settings.jwt_expiracion_horas)
            huella = hmac.new(
                self.settings.ip_salt.encode(), uuid.uuid4().bytes, hashlib.sha256
            ).hexdigest()
            sesion = await self.repo.crear_sesion(usuario.id, expira, huella)
            token = crear_token_acceso(
                usuario.id,
                usuario.rol.codigo,
                usuario.nivel_identidad,
                usuario.rol.permisos,
                sesion_id=sesion.id,
                settings=self.settings,
            )
            return TokenRespuesta(
                token_acceso=token,
                rol=usuario.rol.codigo,
                nivel_identidad=usuario.nivel_identidad,
                permisos=usuario.rol.permisos,
                expira_en=expira,
                usuario=UsuarioLectura.model_validate(usuario),
                mfa_requerido=False,
            )

