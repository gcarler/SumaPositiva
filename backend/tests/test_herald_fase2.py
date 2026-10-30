"""Pruebas de POLIS Herald Fase 2 (Encargo 273): trazabilidad y fe pública por correo.

Cubre los flujos de usuarios externos (edición de perfil, cambio de contraseña y
edición de propuesta radicada) y de usuarios internos (bitácora del administrador,
comprobante del gestor de mesa y del comunicador, alerta de pendientes a gestores),
más el rollback del outbox y la entrega simulada por el worker. Sin correo real.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate, PropuestaCiudadanaUpdate
from app.modules.aportes.service import AporteService
from app.modules.comunicaciones.schemas import TareaComunicacionCrear
from app.modules.comunicaciones.service import ComunicacionesService
from app.modules.identidad.models import Rol, Usuario
from app.modules.identidad.schemas import (
    CambiarContrasena,
    PerfilEdicion,
    SujetoAutenticadoContexto,
    UsuarioAdministrado,
)
from app.modules.identidad.service import IdentidadService
from app.modules.mesas.repository import MesaRepository
from app.modules.mesas.schemas import MesaCrear
from app.modules.mesas.service import MesaService
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.service import NotificacionService
from app.modules.notificaciones.worker import NotificacionWorker

pytestmark = pytest.mark.anyio

CONTRASENA_PRUEBA = "PlataformaPOLIS2026*"


@pytest.fixture
async def session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


@pytest.fixture
def otra_sesion(database_url: str):
    """Sesión independiente para observar éxito/rollback desde fuera del caso de uso."""

    def abrir():
        engine = create_async_engine(database_url, pool_pre_ping=True)
        return engine, async_sessionmaker(engine, expire_on_commit=False)()

    return abrir


@pytest.fixture
async def contexto_base(session):
    from app.modules.geodatos.models import Territorio
    from app.modules.politicas.models import FasePolitica, LineaEstrategica

    fase = (await session.execute(select(FasePolitica).limit(1))).scalar_one()
    territorio = (await session.execute(select(Territorio).limit(1))).scalar_one()
    linea = (
        await session.execute(select(LineaEstrategica).where(LineaEstrategica.fase_id == fase.id).limit(1))
    ).scalar_one_or_none()
    if not linea:
        linea = LineaEstrategica(
            fase_id=fase.id,
            codigo="LN-TEST-HERALD",
            titulo="Linea Estrategica para Herald Fase 2",
            descripcion="Linea de apoyo a pruebas del Herald institucional",
            orden=1,
        )
        session.add(linea)
        await session.flush()
        await session.refresh(linea)
    return {"territorio_id": territorio.id, "linea_id": linea.id}


async def _buscar(session, destinatario: str, tipo_evento: str) -> NotificacionTransaccional | None:
    res = await session.execute(
        select(NotificacionTransaccional)
        .where(
            NotificacionTransaccional.destinatario_correo == destinatario,
            NotificacionTransaccional.tipo_evento == tipo_evento,
        )
        .order_by(NotificacionTransaccional.creado_en.desc())
    )
    return res.scalars().first()


async def _registrar(session, contrasena: str = CONTRASENA_PRUEBA) -> Usuario:
    from app.modules.identidad.schemas import UsuarioCreacion

    correo = f"herald-{uuid.uuid4().hex}@example.org"
    lectura = await IdentidadService(session).registrar_usuario(
        UsuarioCreacion(correo=correo, contrasena=contrasena, nombres="Ciudadana", apellidos="Herald")
    )
    return await session.get(Usuario, lectura.id)


def _sujeto(usuario: Usuario, rol: str = "ciudadano") -> SujetoAutenticadoContexto:
    return SujetoAutenticadoContexto(
        sujeto_id=usuario.id,
        sesion_id=uuid.uuid4(),
        rol=rol,
        nivel_identidad="declarada",
        permisos=[],
        es_anonimo=False,
    )


async def _cambiar_rol(session, usuario: Usuario, codigo_rol: str) -> None:
    rol = (await session.execute(select(Rol).where(Rol.codigo == codigo_rol))).scalar_one()
    usuario.rol_id = rol.id
    await session.flush()


async def _rol_temporal(session, usuario: Usuario, codigo_rol: str) -> Callable[[], Awaitable[None]]:
    """Asciende el usuario a un rol institucional y devuelve la restauración al cerrar."""
    rol_original = usuario.rol_id
    await _cambiar_rol(session, usuario, codigo_rol)

    async def restaurar() -> None:
        # Se restaura la clave foránea en la misma instancia (sin refresh síncrono:
        # el acceso diferido en sesión asíncrona elevaría MissingGreenlet).
        usuario.rol_id = rol_original
        await session.flush()
        await session.commit()

    return restaurar


# ---------------------------------------------------------------------------
# Externos 1: edición de perfil (aviso de seguridad)
# ---------------------------------------------------------------------------


async def test_editar_perfil_encola_aviso_seguridad(session):
    usuario = await _registrar(session)
    await IdentidadService(session).editar_perfil(
        PerfilEdicion(nombres="María del Carmen", apellidos="Estrada Palacio"),
        _sujeto(usuario),
    )

    aviso = await _buscar(session, usuario.correo, "perfil_actualizado")
    assert aviso is not None
    assert aviso.estado_envio == "pendiente"
    assert "Alcaldía Mayor de Cartagena de Indias" in aviso.cuerpo_html
    assert "Aviso de seguridad" in aviso.cuerpo_html
    assert "Nombres" in aviso.cuerpo_html and "Apellidos" in aviso.cuerpo_html
    assert "UTC" in aviso.cuerpo_html
    assert "no reconoció" in aviso.cuerpo_html
    assert aviso.codigo_radicado.startswith("SEGURIDAD-")


# ---------------------------------------------------------------------------
# Externos 2: cambio de contraseña (confirmación + revocación de sesiones)
# ---------------------------------------------------------------------------


async def test_cambiar_contrasena_encola_confirmacion_herald(session):
    usuario = await _registrar(session)
    await IdentidadService(session).cambiar_contrasena(
        CambiarContrasena(contrasena_actual=CONTRASENA_PRUEBA, contrasena="CartagenaHerald2026*"),
        _sujeto(usuario),
    )

    aviso = await _buscar(session, usuario.correo, "contrasena_cambiada")
    assert aviso is not None
    assert aviso.estado_envio == "pendiente"
    assert "Cambio de contraseña" in aviso.asunto
    assert "Sesiones activas revocadas" in aviso.cuerpo_html
    assert "UTC" in aviso.cuerpo_html


# ---------------------------------------------------------------------------
# Rollback: la acción revierte ⇒ ningún correo sobrevive en el outbox
# ---------------------------------------------------------------------------


async def test_rollback_aviso_seguridad_no_deja_fila(session, otra_sesion):
    correo = f"rollback-seg-{uuid.uuid4().hex}@example.org"
    settings = Settings(_env_file=None, environment="test")

    with pytest.raises(RuntimeError, match="fallo posterior"):
        async with transaction(session):
            await NotificacionService(session, settings=settings).enviar_aviso_seguridad_perfil(
                destinatario=correo,
                nombre="Ciudadano en Riesgo",
                accion="Actualización de datos de perfil",
                campos=["Nombres"],
            )
            raise RuntimeError("fallo posterior a la escritura")

    _, sesion = otra_sesion()
    try:
        assert await _buscar(sesion, correo, "perfil_actualizado") is None, "Aviso espurio sobrevivió al rollback"
    finally:
        await sesion.close()


async def test_rollback_comprobante_gestion_no_deja_fila(session, otra_sesion):
    correo = f"rollback-gestion-{uuid.uuid4().hex}@example.org"
    settings = Settings(_env_file=None, environment="test")

    with pytest.raises(RuntimeError, match="fallo posterior"):
        async with transaction(session):
            await NotificacionService(session, settings=settings).enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Gestor de Mesa",
                rol="facilitador_mesa",
                accion="Creación de mesa de trabajo",
                detalle_accion="Mesa creada durante la prueba de rollback",
            )
            raise RuntimeError("fallo posterior a la escritura")

    _, sesion = otra_sesion()
    try:
        assert await _buscar(sesion, correo, "gestion_institucional") is None, (
            "Comprobante espurio sobrevivió al rollback"
        )
    finally:
        await sesion.close()


# ---------------------------------------------------------------------------
# Externos 3: edición de propuesta radicada (constancia con radicado único)
# ---------------------------------------------------------------------------


async def test_editar_propuesta_encola_constancia_actualizacion(session, contexto_base):
    aportes = AporteService(AporteRepository(session))
    correo_autor = f"autora-{uuid.uuid4().hex}@cartagena.gov.co"
    propuesta = await aportes.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Iluminación de la calle del mercado",
            descripcion="Luminarias solares para el pasaje comercial",
            autor_nombre="Junta del Mercado",
            es_anonimo=False,
            correo_contacto=correo_autor,
        )
    )

    await aportes.actualizar_propuesta(
        propuesta.id,
        PropuestaCiudadanaUpdate(titulo="Iluminación del mercado de la heroica"),
    )

    constancia = await _buscar(session, correo_autor, "propuesta_actualizada")
    assert constancia is not None
    assert constancia.codigo_radicado == propuesta.codigo_radicado
    assert propuesta.codigo_radicado in constancia.asunto
    assert "Campos actualizados" in constancia.cuerpo_html
    assert "Título" in constancia.cuerpo_html
    assert f"/seguimiento?radicado={propuesta.codigo_radicado}" in constancia.cuerpo_html


async def test_cambio_de_estado_no_duplica_constancia_de_edicion(session, contexto_base):
    aportes = AporteService(AporteRepository(session))
    correo_autor = f"estado-{uuid.uuid4().hex}@cartagena.gov.co"
    propuesta = await aportes.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Punto de agua potable en la cancha",
            descripcion="Bebedero y conexión para el sector norte",
            autor_nombre="Junta de Acción",
            es_anonimo=False,
            correo_contacto=correo_autor,
        )
    )

    await aportes.actualizar_propuesta(propuesta.id, PropuestaCiudadanaUpdate(estado="incorporado"))

    assert await _buscar(session, correo_autor, "propuesta_actualizada") is None
    assert await _buscar(session, correo_autor, "priorizacion") is not None


# ---------------------------------------------------------------------------
# Internos 1: alerta de pendientes hacia los gestores de mesa al radicar
# ---------------------------------------------------------------------------


async def test_radicacion_publicada_alerta_a_gestores(session, contexto_base):
    gestor = await _registrar(session)
    restaurar = await _rol_temporal(session, gestor, "facilitador_mesa")
    try:
        aportes = AporteService(AporteRepository(session))
        propuesta = await aportes.crear_propuesta(
            PropuestaCiudadanaCreate(
                linea_id=contexto_base["linea_id"],
                titulo="Cancha de la Boquilla con alumbrado",
                descripcion="Rehabilitación integral del escenario deportivo",
                autor_nombre="Madre Comunitaria",
                es_anonimo=False,
                correo_contacto=f"autor-{uuid.uuid4().hex}@cartagena.gov.co",
            )
        )

        alerta = await _buscar(session, gestor.correo, "alerta_pendientes")
        assert alerta is not None
        assert propuesta.codigo_radicado in alerta.cuerpo_html
        assert "C-150 de 2015" in alerta.cuerpo_html
        assert alerta.estado_envio == "pendiente"
    finally:
        # Aislamiento: no se dejan gestores institucionales residuales en la base.
        await restaurar()


# ---------------------------------------------------------------------------
# Internos 2: bitácora del administrador de identidades
# ---------------------------------------------------------------------------


async def test_editar_usuario_encola_bitacora_del_administrador(session):
    administrador = await _registrar(session)
    restaurar = await _rol_temporal(session, administrador, "administrador_identidades")
    try:
        usuario_objetivo = await _registrar(session)

        actor = _sujeto(administrador, rol="administrador_identidades")
        await IdentidadService(session).editar_usuario(
            usuario_objetivo.id,
            UsuarioAdministrado(
                nombres="Usuaria",
                apellidos="Modificada",
                codigo_rol="ciudadano",
                activo=True,
                motivo="Rotación de responsables del canal institucional",
            ),
            actor,
        )

        bitacora = await _buscar(session, administrador.correo, "gestion_institucional")
        assert bitacora is not None
        assert "Modificación de usuario" in bitacora.cuerpo_html
        assert "Rotación de responsables del canal institucional" in bitacora.cuerpo_html
        assert "administrador_identidades" in bitacora.cuerpo_html
        assert "UTC" in bitacora.cuerpo_html
    finally:
        # Aislamiento: la suite de identidad exige no tener un administrador residual.
        await restaurar()


# ---------------------------------------------------------------------------
# Internos 3: comprobante del gestor al crear una mesa
# ---------------------------------------------------------------------------


async def test_crear_mesa_encola_comprobante_al_gestor(session):
    gestor = await _registrar(session)
    sufijo = uuid.uuid4().hex[:6]
    servicio = MesaService(MesaRepository(session))

    await servicio.crear_mesa_raiz(
        MesaCrear(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"MESA-273-{sufijo}",
            shortcode_ciudadano=f"mesa_273_{sufijo}",
            nombre="Mesa de pruebas Herald Fase 2",
        ),
        sujeto=_sujeto(gestor),
    )

    comprobante = await _buscar(session, gestor.correo, "gestion_institucional")
    assert comprobante is not None
    assert "Creación de mesa de trabajo" in comprobante.cuerpo_html
    assert f"MESA-273-{sufijo}" in comprobante.cuerpo_html
    assert "Funcionario" in comprobante.cuerpo_html


# ---------------------------------------------------------------------------
# Internos 4: comprobante del comunicador al publicar tarea
# ---------------------------------------------------------------------------


async def test_crear_tarea_comunicaciones_encola_comprobante(session):
    comunicador = await _registrar(session)

    await ComunicacionesService(session).crear(
        TareaComunicacionCrear(
            codigo=f"TC-273-{uuid.uuid4().hex[:6]}",
            etapa="Radicación de propuestas",
            territorio="La Boquilla",
            titulo="Campaña informativa del Herald",
            descripcion="Divulgación del canal de correo transaccional",
            fecha_inicio=date(2026, 11, 2),
            fecha_fin=date(2026, 11, 30),
        ),
        _sujeto(comunicador),
    )

    comprobante = await _buscar(session, comunicador.correo, "gestion_institucional")
    assert comprobante is not None
    assert "Publicación de tarea de comunicación" in comprobante.cuerpo_html
    assert "Campaña informativa del Herald" in comprobante.cuerpo_html


# ---------------------------------------------------------------------------
# Worker: intención persistida con entrega simulada sin SMTP
# ---------------------------------------------------------------------------


async def test_worker_entrega_simulada_eventos_herald(session):
    settings = Settings(_env_file=None, environment="test")
    correo = f"worker-herald-{uuid.uuid4().hex}@example.org"
    async with transaction(session):
        notificacion = await NotificacionService(session, settings=settings).enviar_comprobante_gestion_interna(
            destinatario=correo,
            nombre_actor="Funcionaria Herald",
            rol="facilitador_mesa",
            accion="Registro de acta comunitaria",
            detalle_accion="Acta 07 guardada en borrador",
            pendientes=["Acta en borrador pendiente de cierre"],
        )
    await session.refresh(notificacion)
    assert notificacion.estado_envio == "pendiente"

    resultado = await NotificacionWorker(session, settings).procesar_uno(
        notificacion_id=notificacion.id, lease_segundos=60
    )
    assert resultado is not None
    assert resultado.estado == "simulado"

    await session.refresh(notificacion)
    assert notificacion.estado_envio == "simulado"
    assert notificacion.simulado_en is not None
