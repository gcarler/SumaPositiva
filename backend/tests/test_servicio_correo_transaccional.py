"""Pruebas del servicio integral de correo transaccional (Encargo 272).

Cubre los cuatro flujos: registro con bienvenida y verificación, recuperación de
contraseña, constancia de radicación y respaldo ciudadano ("me gusta") con
resumen de actividad. Sin correo real: transporte y entrega simulados.
"""

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate
from app.modules.aportes.service import AporteService
from app.modules.geodatos.models import Territorio
from app.modules.identidad.correo import CorreoIdentidad
from app.modules.identidad.models import TokenAccion, Usuario
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.schemas import SujetoAutenticadoContexto, UsuarioCreacion
from app.modules.identidad.security import crear_token_acceso
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.service import NotificacionService
from app.modules.notificaciones.worker import NotificacionWorker
from app.modules.politicas.models import FasePolitica, LineaEstrategica

pytestmark = pytest.mark.anyio


class CorreoControlado(CorreoIdentidad):
    """Transporte de identidad controlado: valida sin 503 y registra sin SMTP real."""

    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        self.envios: list[tuple[str, str, str]] = []

    def comprobar_configuracion(self) -> None:
        return None

    async def enviar(self, destinatario: str, proposito: str, token: str) -> None:
        self.envios.append((destinatario, proposito, token))


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
    res_fase = await session.execute(select(FasePolitica).limit(1))
    fase = res_fase.scalar_one()
    res_ter = await session.execute(select(Territorio).limit(1))
    territorio = res_ter.scalar_one()

    res_linea = await session.execute(select(LineaEstrategica).where(LineaEstrategica.fase_id == fase.id).limit(1))
    linea = res_linea.scalar_one_or_none()
    if not linea:
        linea = LineaEstrategica(
            fase_id=fase.id,
            codigo="LN-TEST-CORREO",
            titulo="Linea Estrategica para Correo Transaccional",
            descripcion="Linea de apoyo a pruebas de correo transaccional",
            orden=1,
        )
        session.add(linea)
        await session.flush()
        await session.refresh(linea)
    return {"territorio_id": territorio.id, "linea_id": linea.id}


async def _notificacion(session, **criterios):
    stmt = select(NotificacionTransaccional)
    if "destinatario" in criterios:
        stmt = stmt.where(NotificacionTransaccional.destinatario_correo == criterios["destinatario"])
    if "tipo_evento" in criterios:
        stmt = stmt.where(NotificacionTransaccional.tipo_evento == criterios["tipo_evento"])
    if "radicado" in criterios:
        stmt = stmt.where(NotificacionTransaccional.codigo_radicado == criterios["radicado"])
    res = await session.execute(stmt.order_by(NotificacionTransaccional.creado_en.desc()))
    return res.scalars().first()


def _token_del_enlace(html: str) -> str:
    inicio = html.index("token=") + len("token=")
    return html[inicio : html.index('"', inicio)]


async def _registrar(session) -> Usuario:
    from app.modules.identidad.service import IdentidadService

    correo = f"vecina-{uuid.uuid4().hex}@example.org"
    return await IdentidadService(session).registrar_usuario(
        UsuarioCreacion(
            correo=correo,
            contrasena="PlataformaPOLIS2026*",
            nombres="Vecina",
            apellidos="Del Pozon",
        )
    )


def _sujeto_autenticado(usuario, sesion_id) -> SujetoAutenticadoContexto:
    return SujetoAutenticadoContexto(
        sujeto_id=usuario.id,
        sesion_id=sesion_id,
        rol="ciudadano",
        nivel_identidad="declarada",
        permisos=[],
        es_anonimo=False,
    )


async def _usuario_con_sesion(session):
    usuario = await _registrar(session)
    repo = IdentidadRepository(session)
    sesion_real = await repo.crear_sesion(usuario.id, datetime.now(UTC) + timedelta(hours=1), "huella-prueba")
    await session.flush()
    return usuario, sesion_real.id


# ---------------------------------------------------------------------------
# Flujo 1: registro de nuevo usuario (bienvenida + verificación de cuenta)
# ---------------------------------------------------------------------------


async def test_registro_persiste_bienvenida_y_token_verificar(session):
    usuario = await _registrar(session)

    bienvenida = await _notificacion(session, destinatario=usuario.correo, tipo_evento="registro_bienvenida")
    assert bienvenida is not None
    assert bienvenida.estado_envio == "pendiente"
    assert "Alcaldía Mayor de Cartagena de Indias" in bienvenida.cuerpo_html
    assert "Verificar mi cuenta" in bienvenida.cuerpo_html
    assert "accion=verificar" in bienvenida.cuerpo_html

    # El enlace porta el token; el token vive solo como hash en tokens_accion.
    token = _token_del_enlace(bienvenida.cuerpo_html)
    assert len(token) >= 32
    registro = await session.get(TokenAccion, hashlib.sha256(token.encode()).hexdigest())
    assert registro is not None
    assert registro.proposito == "verificar"
    assert registro.usuario_id == usuario.id
    assert token not in str(registro.__dict__)


async def test_rollback_no_deja_correo_espurio_en_outbox(session, otra_sesion):
    """EDD: escritura effective + fallo posterior => rollback completo del outbox."""
    correo = f"espurio-{uuid.uuid4().hex}@example.org"
    settings = Settings(_env_file=None, environment="test")

    with pytest.raises(RuntimeError, match="fallo posterior"):
        async with transaction(session):
            await NotificacionService(session, settings=settings).enviar_bienvenida_registro(
                destinatario=correo,
                nombre="Ciudadano en Riesgo",
                enlace_verificacion=f"https://polis.test/#accion=verificar&token={'y' * 43}",
                minutos=30,
            )
            raise RuntimeError("fallo posterior a la escritura")

    _, sesion = otra_sesion()
    try:
        total = await sesion.scalar(
            select(NotificacionTransaccional.id).where(NotificacionTransaccional.destinatario_correo == correo)
        )
        assert total is None, "Un correo espurio sobrevivió al rollback"
    finally:
        await sesion.close()


async def test_exito_confirma_outbox_visible_desde_otra_sesion(session, otra_sesion):
    correo = f"visible-{uuid.uuid4().hex}@example.org"
    settings = Settings(_env_file=None, environment="test")
    async with transaction(session):
        await NotificacionService(session, settings=settings).enviar_recuperacion_contrasena(
            destinatario=correo,
            enlace_restablecer=f"https://polis.test/#accion=recuperar&token={'z' * 43}",
            minutos=30,
        )

    _, sesion = otra_sesion()
    try:
        fila = await _notificacion(sesion, destinatario=correo, tipo_evento="recuperacion_contrasena")
        assert fila is not None
    finally:
        await sesion.close()


# ---------------------------------------------------------------------------
# Flujo 2: recuperación de contraseña
# ---------------------------------------------------------------------------


async def test_recuperacion_encola_html_institucional_con_token(session):
    usuario = await _registrar(session)
    from app.modules.identidad.service import IdentidadService

    servicio_identity = IdentidadService(session)
    transporte = CorreoControlado(Settings(_env_file=None, environment="test"))
    respuesta = await servicio_identity.solicitar_correo(usuario.correo, "recuperar", transporte)
    assert respuesta.mensaje

    aviso = await _notificacion(session, destinatario=usuario.correo, tipo_evento="recuperacion_contrasena")
    assert aviso is not None
    assert aviso.estado_envio == "pendiente"
    assert "Restablecer mi contrase" in aviso.cuerpo_html
    assert "accion=recuperar" in aviso.cuerpo_html
    minutos = Settings(_env_file=None, environment="test").identidad_token_minutos
    assert f"caduca en {minutos} minutos" in aviso.cuerpo_html

    token = _token_del_enlace(aviso.cuerpo_html)
    registro = await session.get(TokenAccion, hashlib.sha256(token.encode()).hexdigest())
    assert registro is not None
    assert registro.usuario_id == usuario.id
    assert registro.proposito == "recuperar"
    assert token not in str(registro.__dict__)


async def test_recuperacion_correo_inexistente_no_deja_outbox_ni_token(session):
    from app.modules.identidad.service import IdentidadService

    transporte = CorreoControlado(Settings(_env_file=None, environment="test"))
    await IdentidadService(session).solicitar_correo("fantasma-inbox@example.org", "recuperar", transporte)
    assert transporte.envios == []
    assert await _notificacion(session, destinatario="fantasma-inbox@example.org") is None


# ---------------------------------------------------------------------------
# Flujo 3: constancia de radicación de propuesta ciudadana
# ---------------------------------------------------------------------------


async def test_constancia_radicacion_html_institucional(session, contexto_base):
    service = AporteService(AporteRepository(session))
    correo_lider = f"lider-{uuid.uuid4().hex}@cartagena.gov.co"
    propuesta = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Ampliaci\u00f3n de alumbrado comunitario frente a cancha",
            descripcion="Instalaci\u00f3n de luminarias solares para v\u00edas nocturnas",
            autor_nombre="Junta de Acci\u00f3n Comunal",
            es_anonimo=False,
            correo_contacto=correo_lider,
        )
    )
    aviso = await _notificacion(session, destinatario=correo_lider, tipo_evento="radicacion")
    assert aviso is not None
    assert aviso.codigo_radicado == propuesta.codigo_radicado
    assert propuesta.codigo_radicado in aviso.asunto
    assert "C-150 de 2015" in aviso.cuerpo_html
    assert f"/seguimiento?radicado={propuesta.codigo_radicado}" in aviso.cuerpo_html


# ---------------------------------------------------------------------------
# Flujo 4: respaldo ciudadano ("me gusta") y resumen de actividades
# ---------------------------------------------------------------------------


async def test_apoyo_notifica_autor_y_constancia_participante(session, contexto_base):
    aportes = AporteService(AporteRepository(session))
    autor_correo = f"vocera-{uuid.uuid4().hex}@cartagena.gov.co"
    propuesta = await aportes.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Parque seguro para la infancia de La Boquilla",
            descripcion="Sombr\u00edos, iluminaci\u00f3n y apropiaci\u00f3n comunitaria del espacio",
            autor_nombre="Madre Comunitaria",
            es_anonimo=False,
            correo_contacto=autor_correo,
        )
    )
    usuario, sesion_id = await _usuario_con_sesion(session)
    respuesta = await aportes.alternar_apoyo(propuesta.id, _sujeto_autenticado(usuario, sesion_id))
    assert respuesta.apoyado is True
    assert respuesta.apoyos_contador == 1

    aviso_autor = await _notificacion(
        session, destinatario=autor_correo, tipo_evento="apoyo_propuesta", radicado=propuesta.codigo_radicado
    )
    assert aviso_autor is not None
    assert "Nuevo respaldo ciudadano recibido" in aviso_autor.cuerpo_html

    constancia = await _notificacion(
        session, destinatario=usuario.correo, tipo_evento="actividad_ciudadana", radicado=propuesta.codigo_radicado
    )
    assert constancia is not None
    assert "Su respaldo ciudadano fue registrado" in constancia.cuerpo_html
    assert "/plataforma" in constancia.cuerpo_html


async def test_apoyo_anonimo_solo_avisa_al_autor(session, contexto_base):
    aportes = AporteService(AporteRepository(session))
    autor_correo = f"ollas-{uuid.uuid4().hex}@cartagena.gov.co"
    propuesta = await aportes.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Ollas comunitarias del barrio vecinal",
            descripcion="Comedores de apoyo para la poblaci\u00f3n en inseguridad alimentaria",
            autor_nombre="Fundadora Comunitaria",
            es_anonimo=False,
            correo_contacto=autor_correo,
        )
    )
    sesion_anonima_id = uuid.uuid4()
    sujeto = SujetoAutenticadoContexto(
        sujeto_id=sesion_anonima_id,
        sesion_id=sesion_anonima_id,
        rol="ciudadano",
        nivel_identidad="declarada",
        permisos=[],
        es_anonimo=True,
    )
    respuesta = await aportes.alternar_apoyo(propuesta.id, sujeto)
    assert respuesta.apoyado is True

    assert (await _notificacion(session, tipo_evento="apoyo_propuesta", radicado=propuesta.codigo_radicado)) is not None
    sin_constancia = await _notificacion(session, tipo_evento="actividad_ciudadana", radicado=propuesta.codigo_radicado)
    assert sin_constancia is None, "No debe notificarse actividad a un sujeto an\u00f3nimo"


async def test_retirar_apoyo_no_genera_notificaciones_nuevas(session, contexto_base):
    aportes = AporteService(AporteRepository(session))
    autor_correo = f"veeduria-{uuid.uuid4().hex}@cartagena.gov.co"
    propuesta = await aportes.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="C\u00e1maras comunitarias de acompa\u00f1amiento",
            descripcion="Veedur\u00eda barrial coordinada con la Polic\u00eda Metropolitana",
            autor_nombre="Veedor Comunitario",
            es_anonimo=False,
            correo_contacto=autor_correo,
        )
    )
    usuario, sesion_id = await _usuario_con_sesion(session)
    respuesta = await aportes.alternar_apoyo(propuesta.id, _sujeto_autenticado(usuario, sesion_id))
    assert respuesta.apoyado is True
    autor_antes = await _notificacion(
        session, destinatario=autor_correo, tipo_evento="apoyo_propuesta", radicado=propuesta.codigo_radicado
    )
    participante_antes = await _notificacion(
        session, destinatario=usuario.correo, tipo_evento="actividad_ciudadana", radicado=propuesta.codigo_radicado
    )

    retirada = await aportes.retirar_apoyo(propuesta.id, _sujeto_autenticado(usuario, sesion_id))
    assert retirada.apoyos_contador == 0

    autor_despues = await _notificacion(
        session, destinatario=autor_correo, tipo_evento="apoyo_propuesta", radicado=propuesta.codigo_radicado
    )
    participante_despues = await _notificacion(
        session, destinatario=usuario.correo, tipo_evento="actividad_ciudadana", radicado=propuesta.codigo_radicado
    )
    assert autor_despues is autor_antes
    assert participante_despues is participante_antes


# ---------------------------------------------------------------------------
# Worker: intención persistida con entrega simulada sin SMTP
# ---------------------------------------------------------------------------


async def test_worker_entrega_simulada_eventos_nuevos(session):
    settings = Settings(_env_file=None, environment="test")
    async with transaction(session):
        notificacion = await NotificacionService(session, settings=settings).enviar_aviso_nuevo_apoyo_autor(
            correo_autor=f"worker-{uuid.uuid4().hex}@example.org",
            radicado="POL-2026-0001",
            titulo="Propuesta para entrega simulada del worker",
            apoyos_totales=5,
            enlace_seguimiento="https://polis.test/seguimiento?radicado=POL-2026-0001",
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


# ---------------------------------------------------------------------------
# API: consulta pública por radicado e historial con permiso
# ---------------------------------------------------------------------------


async def test_endpoint_radicado_disponible(session, contexto_base):
    service = AporteService(AporteRepository(session))
    propuesta = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Senda peatonal de hogar a escuela",
            descripcion="Reurbanizaci\u00f3n del sendero con prioridad de pico infantil",
            autor_nombre="Comit\u00e9 de Madres",
            es_anonimo=False,
        )
    )
    app = create_app(Settings(_env_file=None, environment="test"))
    with TestClient(app) as client:
        respuesta = client.get(f"/api/v1/notificaciones/radicado/{propuesta.codigo_radicado}")
        assert respuesta.status_code == 200
        assert respuesta.json()["titulo"] == "Senda peatonal de hogar a escuela"


async def test_historial_expone_tipos_nuevos(session, monkeypatch):
    from app.modules.identidad import deps

    async def sujeto_controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps, "cargar_sujeto_vigente", sujeto_controlado)

    settings = Settings(_env_file=None, environment="test")
    token = crear_token_acceso(
        sujeto_id=uuid.uuid4(),
        rol="auditor_forense",
        nivel_identidad="declarada",
        permisos=["auditoria:leer"],
        settings=settings,
    )
    async with transaction(session):
        await NotificacionService(session, settings=settings).enviar_aviso_nuevo_apoyo_autor(
            correo_autor=f"historial-{uuid.uuid4().hex}@example.org",
            radicado="POL-2026-0001",
            titulo="Propuesta de auditor\u00eda de eventos nuevos",
            apoyos_totales=7,
            enlace_seguimiento="https://polis.test/seguimiento?radicado=POL-2026-0001",
        )
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        respuesta = client.get("/api/v1/notificaciones/historial", params={"tipo_evento": "apoyo_propuesta"})
        assert respuesta.status_code == 200
        datos = respuesta.json()
        assert datos["total"] >= 1
        assert any(el["tipo_evento"] == "apoyo_propuesta" for el in datos["elementos"])
