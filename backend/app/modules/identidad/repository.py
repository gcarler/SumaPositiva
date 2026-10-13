import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.modules.identidad.models import (
    EventoIdentidad,
    LimiteAcceso,
    Rol,
    SesionUsuario,
    TokenAccion,
    Usuario,
    UsuarioMfa,
)
from app.modules.identidad.schemas import UsuarioCreacion
from app.modules.sesion.models import SesionAnonima


class IdentidadRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def obtener_rol_por_codigo(self, codigo: str) -> Rol | None:
        return await self.session.scalar(select(Rol).where(Rol.codigo == codigo))

    async def obtener_usuario_por_correo(self, correo: str) -> Usuario | None:
        return await self.session.scalar(
            select(Usuario)
            .options(joinedload(Usuario.rol), joinedload(Usuario.mfa))
            .where(func.lower(Usuario.correo) == correo.strip().lower())
        )

    async def obtener_usuario_por_id(
        self, usuario_id: uuid.UUID, *, bloquear=False
    ) -> Usuario | None:
        consulta = (
            select(Usuario)
            .options(joinedload(Usuario.rol), joinedload(Usuario.mfa))
            .where(Usuario.id == usuario_id)
        )
        if bloquear:
            consulta = consulta.with_for_update(of=Usuario).execution_options(
                populate_existing=True
            )
        return await self.session.scalar(consulta)

    async def crear_usuario(
        self,
        datos: UsuarioCreacion,
        hash_contrasena: str,
        rol_id: uuid.UUID,
    ) -> Usuario:
        usuario = Usuario(
            rol_id=rol_id,
            correo=str(datos.correo).lower(),
            hash_contrasena=hash_contrasena,
            nombres=datos.nombres,
            apellidos=datos.apellidos,
            metadatos=datos.metadatos,
        )
        self.session.add(usuario)
        await self.session.flush()
        return await self.obtener_usuario_por_id(usuario.id)

    async def crear_usuario_oauth(
        self,
        correo: str,
        nombres: str,
        apellidos: str,
        rol_id: uuid.UUID,
        nivel_identidad: str,
        hash_contrasena: str,
        metadatos: dict | None = None,
    ) -> Usuario:
        usuario = Usuario(
            rol_id=rol_id,
            correo=correo.lower().strip(),
            hash_contrasena=hash_contrasena,
            nombres=nombres,
            apellidos=apellidos,
            nivel_identidad=nivel_identidad,
            correo_verificado_en=datetime.now(UTC),
            metadatos=metadatos or {},
        )
        self.session.add(usuario)
        await self.session.flush()
        return await self.obtener_usuario_por_id(usuario.id)

    async def guardar(self) -> None:
        await self.session.flush()

    async def registrar_evento(self, accion, actor_id=None, objetivo_id=None, detalle=None) -> None:
        self.session.add(
            EventoIdentidad(
                accion=accion, actor_id=actor_id, objetivo_id=objetivo_id, detalle=detalle or {}
            )
        )
        await self.session.flush()

    async def crear_sesion(self, usuario_id, expira_en, huella_hash) -> SesionUsuario:
        sesion = SesionUsuario(
            id=uuid.uuid4(), usuario_id=usuario_id, creada_en=datetime.now(UTC), expira_en=expira_en
        )
        self.session.add(
            SesionAnonima(
                id=sesion.id,
                huella_hash=huella_hash,
                expira_en=expira_en,
                metadatos={"modo": "cuenta"},
            )
        )
        await self.session.flush()
        self.session.add(sesion)
        await self.session.flush()
        return sesion

    async def obtener_sesion(self, sesion_id) -> SesionUsuario | None:
        return await self.session.get(SesionUsuario, sesion_id)

    async def revocar_sesiones(self, usuario_id, sesion_id=None) -> None:
        consulta = update(SesionUsuario).where(
            SesionUsuario.usuario_id == usuario_id, SesionUsuario.revocada_en.is_(None)
        )
        if sesion_id is not None:
            consulta = consulta.where(SesionUsuario.id == sesion_id)
        await self.session.execute(consulta.values(revocada_en=datetime.now(UTC)))

    async def listar_sesiones(self, usuario_id):
        return (
            await self.session.scalars(
                select(SesionUsuario)
                .where(
                    SesionUsuario.usuario_id == usuario_id,
                    SesionUsuario.revocada_en.is_(None),
                    SesionUsuario.expira_en > datetime.now(UTC),
                )
                .order_by(SesionUsuario.creada_en.desc())
            )
        ).all()

    async def crear_token(self, hash_token, usuario_id, proposito, expira_en, nonce) -> None:
        self.session.add(
            TokenAccion(
                hash_token=hash_token,
                usuario_id=usuario_id,
                proposito=proposito,
                expira_en=expira_en,
                nonce=nonce,
            )
        )
        await self.session.flush()

    async def obtener_token(self, hash_token, proposito, *, bloquear=False) -> TokenAccion | None:
        consulta = select(TokenAccion).where(
            TokenAccion.hash_token == hash_token, TokenAccion.proposito == proposito
        )
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return await self.session.scalar(consulta)

    async def invalidar_tokens(self, usuario_id, proposito) -> None:
        await self.session.execute(
            update(TokenAccion)
            .where(
                TokenAccion.usuario_id == usuario_id,
                TokenAccion.proposito == proposito,
                TokenAccion.usado_en.is_(None),
            )
            .values(usado_en=datetime.now(UTC))
        )

    async def listar_usuarios(self, busqueda, limite, desplazamiento):
        consulta = select(Usuario).options(joinedload(Usuario.rol), joinedload(Usuario.mfa))
        if busqueda:
            # contains autoescape evita interpretar %/_ como comodines introducidos por el usuario.
            consulta = consulta.where(
                func.lower(Usuario.correo).contains(busqueda.lower(), autoescape=True)
            )
        total = await self.session.scalar(select(func.count()).select_from(consulta.subquery()))
        usuarios = (
            await self.session.scalars(
                consulta.order_by(Usuario.creado_en.desc(), Usuario.id)
                .limit(limite)
                .offset(desplazamiento)
            )
        ).all()
        return total, usuarios

    async def listar_roles(self):
        return (await self.session.scalars(select(Rol).order_by(Rol.codigo))).all()

    async def crear_rol(self, codigo, nombre, permisos) -> Rol:
        rol = Rol(codigo=codigo, nombre=nombre, permisos=permisos)
        self.session.add(rol)
        await self.session.flush()
        return rol

    async def eliminar_rol(self, rol) -> None:
        await self.session.delete(rol)
        await self.session.flush()

    async def usuarios_de_rol(self, rol_id) -> int:
        return await self.session.scalar(
            select(func.count()).select_from(Usuario).where(Usuario.rol_id == rol_id)
        )

    async def serializar_administracion(self) -> None:
        # Lock transaccional común: evita eliminar/desactivar simultáneamente al último admin.
        await self.session.execute(text("SELECT pg_advisory_xact_lock(726015021)"))

    async def contar_administradores(self, excluir=None) -> int:
        consulta = (
            select(func.count())
            .select_from(Usuario)
            .join(Rol)
            .where(Usuario.activo.is_(True), Rol.codigo == "administrador_identidades")
        )
        if excluir:
            consulta = consulta.where(Usuario.id != excluir)
        return await self.session.scalar(consulta)

    async def listar_eventos(self, limite, desplazamiento):
        return (
            await self.session.scalars(
                select(EventoIdentidad)
                .order_by(EventoIdentidad.creado_en.desc(), EventoIdentidad.id)
                .limit(limite)
                .offset(desplazamiento)
            )
        ).all()

    async def consumir_limite(self, clave, ventana):
        ahora = datetime.now(UTC)
        expira = ahora + timedelta(seconds=ventana)
        consulta = insert(LimiteAcceso).values(clave=clave, intentos=1, expira_en=expira)
        consulta = consulta.on_conflict_do_update(
            index_elements=[LimiteAcceso.clave],
            set_={
                "intentos": case(
                    (LimiteAcceso.expira_en <= ahora, 1), else_=LimiteAcceso.intentos + 1
                ),
                "expira_en": case(
                    (LimiteAcceso.expira_en <= ahora, expira), else_=LimiteAcceso.expira_en
                ),
            },
        ).returning(LimiteAcceso.intentos)
        # Retención acotada: eliminar contadores vencidos hace más de una ventana.
        await self.session.execute(
            delete(LimiteAcceso).where(LimiteAcceso.expira_en < ahora - timedelta(seconds=ventana))
        )
        return await self.session.scalar(consulta)

    async def obtener_mfa_usuario(
        self, usuario_id: uuid.UUID, *, bloquear=False
    ) -> UsuarioMfa | None:
        consulta = select(UsuarioMfa).where(UsuarioMfa.usuario_id == usuario_id)
        if bloquear:
            consulta = consulta.with_for_update(of=UsuarioMfa)
        return await self.session.scalar(consulta)

    async def guardar_mfa_usuario(
        self,
        usuario_id: uuid.UUID,
        secreto_cifrado: str,
        codigos_recuperacion: list[str],
    ) -> UsuarioMfa:
        mfa = await self.obtener_mfa_usuario(usuario_id, bloquear=True)
        ahora = datetime.now(UTC)
        if mfa:
            mfa.secreto_cifrado = secreto_cifrado
            mfa.codigos_recuperacion = codigos_recuperacion
            mfa.activo = False
            mfa.activado_en = None
            mfa.intentos_fallidos = 0
            mfa.bloqueado_hasta = None
            mfa.ultimo_uso_en = None
            mfa.ultimo_paso_totp = None
            mfa.actualizado_en = ahora
        else:
            mfa = UsuarioMfa(
                usuario_id=usuario_id,
                secreto_cifrado=secreto_cifrado,
                activo=False,
                codigos_recuperacion=codigos_recuperacion,
                ultimo_paso_totp=None,
            )
            self.session.add(mfa)
        await self.session.flush()
        return mfa

    async def desactivar_mfa_usuario(self, usuario_id: uuid.UUID) -> bool:
        mfa = await self.obtener_mfa_usuario(usuario_id, bloquear=True)
        if mfa:
            await self.session.delete(mfa)
            await self.session.flush()
            return True
        return False

