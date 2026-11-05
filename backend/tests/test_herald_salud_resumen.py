"""Pruebas de POLIS Herald Fase 3 (Encargo 275): salud de entregas y resumen diario.

Cubre la función pura de estado (todas las ramas), el latido del ejecutor (ciclo
vacío y fallo de escritura no letal), los endpoints de salud (401/403/200 y sin
fugas de credenciales SMTP), /health/herald sin auth y sin cifras, el reintento
manual (ok/404/409 + auditoría), el resumen diario de pendientes (contenido,
cero correos vacíos, idempotencia, huso America/Bogota, --simular), el escapado
XSS de la plantilla y el ciclo de migración 0093 ↔ 0094. Sin correo real.
"""

import asyncio
import re
import uuid
from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from alembic.config import Config as ConfigAlembic
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from alembic import command
from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.identidad import deps as deps_identidad
from app.modules.identidad.models import Rol, Usuario
from app.modules.identidad.schemas import UsuarioCreacion
from app.modules.identidad.security import crear_token_acceso
from app.modules.identidad.service import IdentidadService
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.plantillas_eventos import generar_html_resumen_diario
from app.modules.notificaciones.resumen_cli import generar_resumen, rango_del_dia
from app.modules.notificaciones.salud import (
    ESTADO_CRITICO,
    ESTADO_DEGRADADO,
    ESTADO_SALUDABLE,
    calcular_estado,
    escribir_latido,
    recolectar_salud,
)
from app.modules.notificaciones.service import NotificacionService
from app.modules.notificaciones.worker import MAX_INTENTOS, NotificacionWorker

pytestmark = pytest.mark.anyio

ZONA = ZoneInfo("America/Bogota")
CONTRASENA_PRUEBA = "PlataformaPOLIS2026*"


@pytest.fixture
async def session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


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
            codigo="LN-TEST-HERALD-275",
            titulo="Linea Estrategica para Herald Fase 3",
            descripcion="Linea de apoyo a pruebas de salud y resumen del Herald",
            orden=1,
        )
        session.add(linea)
        await session.flush()
        await session.refresh(linea)
    return {"territorio_id": territorio.id, "linea_id": linea.id}


async def _registrar(session, nombres: str = "Ciudadana", apellidos: str = "Herald275") -> Usuario:
    correo = f"herald275-{uuid.uuid4().hex}@example.org"
    lectura = await IdentidadService(session).registrar_usuario(
        UsuarioCreacion(correo=correo, contrasena=CONTRASENA_PRUEBA, nombres=nombres, apellidos=apellidos)
    )
    return await session.get(Usuario, lectura.id)


async def _promover_facilitador(session, usuario: Usuario) -> None:
    rol = (await session.execute(select(Rol).where(Rol.codigo == "facilitador_mesa"))).scalar_one()
    usuario.rol_id = rol.id
    await session.flush()


def _sujeto_token(sujeto_id: uuid.UUID, permisos: list[str], settings: Settings) -> str:
    return crear_token_acceso(
        sujeto_id=sujeto_id,
        rol="autoridad_distrital",
        nivel_identidad="declarada",
        permisos=permisos,
        settings=settings,
    )


@pytest.fixture
def sujeto_controlado(monkeypatch):
    """El token forjado no necesita sesión persistida: se salta la verificación de vigencia."""

    async def controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps_identidad, "cargar_sujeto_vigente", controlado)


# ---------------------------------------------------------------------------
# 1. Función pura de estado: cada rama
# ---------------------------------------------------------------------------


def _saludable_kwargs() -> dict:
    return dict(
        smtp_configurado=True,
        es_produccion=True,
        latido_reciente=True,
        pendientes=0,
        agotados=0,
        mas_antiguo_segundos=None,
        enviados_24h=0,
        tasa_exito=None,
    )


def test_estado_saludable_sin_reglas_disparadas():
    estado, motivos = calcular_estado(**_saludable_kwargs())
    assert estado == ESTADO_SALUDABLE
    assert motivos == []


def test_estado_degradado_por_pendiente_antiguo():
    kwargs = _saludable_kwargs()
    kwargs["pendientes"] = 3
    kwargs["mas_antiguo_segundos"] = 700.0
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_DEGRADADO
    assert any("más antigua" in m for m in motivos)


def test_estado_degradado_por_agotados():
    kwargs = _saludable_kwargs()
    kwargs["agotados"] = 2
    kwargs["tasa_exito"] = 0.95
    kwargs["enviados_24h"] = 20
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_DEGRADADO
    assert any(f"{MAX_INTENTOS}" in m for m in motivos)


def test_estado_degradado_por_ejecutor_sin_latido_cola_vacia():
    kwargs = _saludable_kwargs()
    kwargs["latido_reciente"] = False
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_DEGRADADO
    assert any("latido" in m and "cola vacía" in m for m in motivos)


def test_estado_degradado_por_tasa_exito_baja():
    kwargs = _saludable_kwargs()
    kwargs["enviados_24h"] = 12
    kwargs["tasa_exito"] = 0.85
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_DEGRADADO
    assert any("tasa de éxito" in m for m in motivos)


def test_estado_critico_produccion_sin_smtp():
    kwargs = _saludable_kwargs()
    kwargs["smtp_configurado"] = False
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_CRITICO
    assert any("sin SMTP" in m for m in motivos)


def test_estado_critico_ejecutor_sin_latido_con_pendientes():
    kwargs = _saludable_kwargs()
    kwargs["latido_reciente"] = False
    kwargs["pendientes"] = 5
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_CRITICO
    assert any("pendientes de entrega" in m for m in motivos)


def test_estado_critico_agotados_con_tasa_muy_baja():
    kwargs = _saludable_kwargs()
    kwargs["agotados"] = 4
    kwargs["enviados_24h"] = 3
    kwargs["tasa_exito"] = 0.4
    estado, motivos = calcular_estado(**kwargs)
    assert estado == ESTADO_CRITICO
    assert any("agotaron reintentos" in m for m in motivos)


def test_smtp_sin_configurar_en_no_produccion_no_es_critico():
    """Solo producción sin SMTP es crítico; en test/staging es saludable."""
    kwargs = _saludable_kwargs()
    kwargs["smtp_configurado"] = False
    kwargs["es_produccion"] = False
    estado, _ = calcular_estado(**kwargs)
    assert estado == ESTADO_SALUDABLE


def test_estado_sin_cifras_omite_agregados_operativos():
    """Variante pública del endpoint interno: describe la regla sin revelar los agregados (D-1)."""
    kwargs = _saludable_kwargs()
    kwargs.update(
        pendientes=1234,
        agotados=7,
        tasa_exito=0.4,
        enviados_24h=40,
        mas_antiguo_segundos=12345.6,
        latido_reciente=False,
    )
    estado_cifras, motivos_cifras = calcular_estado(**kwargs)
    estado_publico, motivos_publico = calcular_estado(**{**kwargs, "incluir_cifras": False})
    assert estado_cifras == estado_publico == ESTADO_CRITICO
    texto_cifras = " ".join(motivos_cifras)
    texto_publico = " ".join(motivos_publico)
    assert "1234 notificaciones" in texto_cifras
    assert re.search(r"\b\d+\s*notificaciones\b", texto_publico) is None
    assert re.search(r"\b\d+(\.\d+)?\s*segundos\b", texto_publico) is None
    assert "40%" not in texto_publico
    # Los umbrales de cada regla sí se conservan: describen la regla, no el estado real.
    assert "90%" in texto_publico


# ---------------------------------------------------------------------------
# 2. Latido: ciclo vacío y fallo de escritura no letal
# ---------------------------------------------------------------------------


async def test_latido_se_escribe_en_ciclo_vacio(session):
    await escribir_latido(session, {})
    fila = (
        await session.execute(
            text("SELECT actualizado_en, ultimo_ciclo FROM participacion_ciudadana.herald_latido WHERE id = 1")
        )
    ).one()
    assert fila.actualizado_en is not None
    assert fila.ultimo_ciclo == {"procesados": 0, "enviado": 0, "fallido": 0, "simulado": 0}


async def test_latido_es_upsert_de_fila_unica(session):
    # El worker entrega un Counter de estados (sin clave 'procesados'); el latido
    # deriva 'procesados' como suma total del ciclo.
    await escribir_latido(session, {"enviado": 2})
    await escribir_latido(session, {"enviado": 1, "fallido": 1})
    total = (await session.execute(text("SELECT count(*) FROM participacion_ciudadana.herald_latido"))).scalar_one()
    assert total == 1
    ciclo = (await session.execute(text("SELECT ultimo_ciclo FROM participacion_ciudadana.herald_latido"))).scalar_one()
    assert ciclo == {"procesados": 2, "enviado": 1, "fallido": 1, "simulado": 0}


class _SesionRota:
    """Sesión que simula una BD caída: toda escritura falla."""

    def __init__(self) -> None:
        self.info: dict = {}

    async def execute(self, *args, **kwargs):
        raise RuntimeError("BD no disponible")

    async def commit(self):
        return None

    async def rollback(self):
        return None


async def test_fallo_al_escribir_latido_no_interrumpe_la_entrega(session):
    settings = Settings(_env_file=None, environment="test")
    async with transaction(session):
        notificacion = await NotificacionService(session, settings=settings).enviar_bienvenida_registro(
            destinatario=f"latido-{uuid.uuid4().hex}@example.org",
            nombre="Prueba Latido",
            enlace_verificacion="https://polis.test/verificar?token=x",
            minutos=30,
        )
    resultado = await NotificacionWorker(session, settings).procesar_uno(
        notificacion_id=notificacion.id, lease_segundos=60
    )
    assert resultado is not None and resultado.estado == "simulado"

    # La escritura del latido falla (BD caída) pero no propaga la excepción…
    await escribir_latido(_SesionRota(), {"procesados": 1, "simulado": 1})
    # …y la entrega ya realizada permanece intacta.
    await session.refresh(notificacion)
    assert notificacion.estado_envio == "simulado"


async def test_recolectar_salud_refleja_latido_y_cola(session):
    settings = Settings(_env_file=None, environment="test")
    await escribir_latido(session, {"procesados": 0})
    async with transaction(session):
        await NotificacionService(session, settings=settings).enviar_bienvenida_registro(
            destinatario=f"salud-{uuid.uuid4().hex}@example.org",
            nombre="Salud Cola",
            enlace_verificacion="https://polis.test/verificar?token=y",
            minutos=30,
        )
    datos = await recolectar_salud(session, settings)
    assert datos["ejecutor"]["activo"] is True
    assert datos["ejecutor"]["ultimo_latido"] is not None
    assert datos["ejecutor"]["ultimo_ciclo"] == {"procesados": 0, "enviado": 0, "fallido": 0, "simulado": 0}
    assert datos["cola"]["pendientes"] >= 1
    assert datos["cola"]["mas_antiguo_segundos"] is not None
    assert datos["estado"] in {ESTADO_SALUDABLE, ESTADO_DEGRADADO, ESTADO_CRITICO}
    # La tasa solo se calcula con enviados+fallidos de 24 h; si existe, es una razón válida.
    tasa = datos["ultimas_24h"]["tasa_exito"]
    assert tasa is None or 0.0 <= tasa <= 1.0


async def test_latido_viejo_marca_ejecutor_inactivo(session):
    settings = Settings(_env_file=None, environment="test")
    await escribir_latido(session, {"procesados": 0})
    await session.execute(
        text(
            "UPDATE participacion_ciudadana.herald_latido "
            "SET actualizado_en = clock_timestamp() - interval '1 hour' WHERE id = 1"
        )
    )
    await session.commit()
    datos = await recolectar_salud(session, settings)
    assert datos["ejecutor"]["activo"] is False
    assert datos["ejecutor"]["ultimo_latido"] is not None


# ---------------------------------------------------------------------------
# 3. Endpoint /notificaciones/salud: 401 / 403 / 200 sin fugas SMTP
# ---------------------------------------------------------------------------


def _settings_con_smtp_secreto(database_url: str | None = None) -> Settings:
    kwargs = dict(
        _env_file=None,
        environment="test",
        smtp_host="relay-secreto.polis.test",
        smtp_usuario="usuario-secreto-smtp",
        smtp_contrasena="clave-secreta-SMTP-2026",
    )
    if database_url:
        kwargs["database_url"] = database_url
    return Settings(**kwargs)


def test_salud_endpoint_requiere_sesion():
    app = create_app(Settings(_env_file=None, environment="test"))
    with TestClient(app) as client:
        respuesta = client.get("/api/v1/notificaciones/salud")
    assert respuesta.status_code == 401


def test_salud_endpoint_rechaza_sin_permiso(sujeto_controlado):
    settings = Settings(_env_file=None, environment="test")
    token = _sujeto_token(uuid.uuid4(), permisos=[], settings=settings)
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        respuesta = client.get("/api/v1/notificaciones/salud")
    assert respuesta.status_code == 403


def test_salud_endpoint_200_contrato_y_sin_fugas_smtp(sujeto_controlado, database_url):
    settings = _settings_con_smtp_secreto(database_url)
    token = _sujeto_token(uuid.uuid4(), permisos=["auditoria:leer"], settings=settings)
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        respuesta = client.get("/api/v1/notificaciones/salud")
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert set(datos) == {"estado", "motivos", "smtp_configurado", "ejecutor", "cola", "ultimas_24h", "por_tipo"}
    assert datos["estado"] in {"saludable", "degradado", "critico"}
    assert datos["smtp_configurado"] is True
    assert set(datos["ejecutor"]) == {"activo", "ultimo_latido", "ultimo_ciclo"}
    assert set(datos["cola"]) == {
        "pendientes",
        "procesando",
        "fallidos_reintentables",
        "agotados",
        "mas_antiguo_segundos",
    }
    assert set(datos["ultimas_24h"]) == {
        "enviados",
        "simulados",
        "fallidos",
        "tasa_exito",
        "latencia_p50_s",
        "latencia_p95_s",
    }
    # Ni host, ni usuario, ni contraseña SMTP en la respuesta serializada.
    cuerpo = respuesta.text
    assert "relay-secreto.polis.test" not in cuerpo
    assert "usuario-secreto-smtp" not in cuerpo
    assert "clave-secreta-SMTP-2026" not in cuerpo


# ---------------------------------------------------------------------------
# 4. /health/herald: sin auth, solo estado y motivos
# ---------------------------------------------------------------------------


def test_health_herald_sin_auth_y_sin_cifras_ni_pii(database_url):
    settings = _settings_con_smtp_secreto(database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        respuesta = client.get("/api/v1/health/herald")
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert set(datos) == {"estado", "motivos"}
    assert datos["estado"] in {"saludable", "degradado", "critico"}
    assert isinstance(datos["motivos"], list)
    cuerpo = respuesta.text
    assert "relay-secreto.polis.test" not in cuerpo
    assert "usuario-secreto-smtp" not in cuerpo
    assert "clave-secreta-SMTP-2026" not in cuerpo
    # Sin cifras de cola ni correos: nada más allá de estado y motivos.
    assert 'pendientes"' not in cuerpo
    assert "@" not in cuerpo


def test_endpoint_publico_sin_cifras_y_privado_con_cifras(database_url, sujeto_controlado):
    """/health/herald sin agregados de la cola; /notificaciones/salud (autenticada) sí los trae (D-1)."""
    settings = _settings_con_smtp_secreto(database_url)
    marca = uuid.uuid4().hex[:8]

    async def _preparar() -> None:
        engine = create_async_engine(database_url, pool_pre_ping=True)
        try:
            async with engine.begin() as conexion:
                await conexion.execute(
                    text(
                        "UPDATE participacion_ciudadana.herald_latido "
                        "SET actualizado_en = clock_timestamp() - interval '1 hour' WHERE id = 1"
                    )
                )
                await conexion.execute(
                    text(
                        "INSERT INTO participacion_ciudadana.notificaciones_transaccionales "
                        "(codigo_radicado, destinatario_correo, tipo_evento, asunto, cuerpo_html, estado_envio, "
                        "intentos, creado_en) VALUES (:cod, :mail, 'registro_bienvenida', 'PRUEBA D1 EAF', "
                        "'<p>x</p>', 'pendiente', 0, clock_timestamp() - interval '30 minutes')"
                    ),
                    {"cod": f"D1-{marca.upper()}", "mail": f"d1-{marca}@example.org"},
                )
        finally:
            await engine.dispose()

    async def _restaurar() -> None:
        engine = create_async_engine(database_url, pool_pre_ping=True)
        try:
            async with engine.begin() as conexion:
                await conexion.execute(
                    text(
                        "DELETE FROM participacion_ciudadana.notificaciones_transaccionales "
                        "WHERE asunto = 'PRUEBA D1 EAF'"
                    )
                )
                await conexion.execute(
                    text(
                        "UPDATE participacion_ciudadana.herald_latido "
                        "SET actualizado_en = clock_timestamp() WHERE id = 1"
                    )
                )
        finally:
            await engine.dispose()

    asyncio.run(_preparar())
    try:
        token = _sujeto_token(uuid.uuid4(), permisos=["auditoria:leer"], settings=settings)
        app = create_app(settings)
        with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
            cuerpo_publico = client.get("/api/v1/health/herald").text
            cuerpo_privado = client.get("/api/v1/notificaciones/salud").text
    finally:
        asyncio.run(_restaurar())

    # Público: la regla se describe sin el conteo real de la cola ni la antigüedad exacta.
    assert re.search(r"\b\d+\s*notificaciones\b", cuerpo_publico) is None
    assert re.search(r"\b\d+(\.\d+)?\s*segundos\b", cuerpo_publico) is None
    assert f"d1-{marca}@example.org" not in cuerpo_publico
    # Privado autenticado: el mismo estado SÍ trae el conteo (contrato de la sección 3).
    assert re.search(r"\b\d+\s*notificaciones\b", cuerpo_privado) is not None


# ---------------------------------------------------------------------------
# 5. Reintento manual: ok / 404 / 409 + auditoría
# ---------------------------------------------------------------------------


async def _sembrar_notificacion(session, **cambios) -> NotificacionTransaccional:
    valores = dict(
        codigo_radicado=f"REINT-{uuid.uuid4().hex[:10].upper()}",
        destinatario_correo=f"reintento-{uuid.uuid4().hex}@example.org",
        tipo_evento="registro_bienvenida",
        asunto="POLIS: Prueba de reintento manual",
        cuerpo_html="<html><body>Prueba</body></html>",
        estado_envio="fallido",
        intentos=MAX_INTENTOS,
        error_detalle="SMTPServerDisconnected",
    )
    valores.update(cambios)
    notificacion = NotificacionTransaccional(**valores)
    session.add(notificacion)
    await session.flush()
    await session.refresh(notificacion)
    return notificacion


async def test_reintento_manual_ok_y_auditado(session, sujeto_controlado, database_url):
    usuario = await _registrar(session, nombres="Reintento", apellidos="Manual")
    await session.commit()
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    notificacion = await _sembrar_notificacion(session)
    await session.commit()

    token = _sujeto_token(usuario.id, permisos=["usuarios:gestionar"], settings=settings)
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        respuesta = client.post(f"/api/v1/notificaciones/{notificacion.id}/reintentar")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": str(notificacion.id), "estado_envio": "pendiente"}

    # La fila vuelve a la cola con contador limpio (visible desde otra sesión).
    engine = create_async_engine(settings.async_database_url, pool_pre_ping=True)
    try:
        async with engine.connect() as conexion:
            fila = (
                await conexion.execute(
                    text(
                        "SELECT estado_envio, intentos, proximo_intento_en, error_detalle "
                        "FROM participacion_ciudadana.notificaciones_transaccionales WHERE id = :id"
                    ),
                    {"id": notificacion.id},
                )
            ).one()
            assert fila.estado_envio == "pendiente"
            assert fila.intentos == 0
            assert fila.proximo_intento_en is None
            assert fila.error_detalle is None
            # Queda auditado con el actor institucional.
            auditoria = (
                await conexion.execute(
                    text(
                        "SELECT usuario_id, accion FROM auditoria.registros_auditoria "
                        "WHERE registro_id = :id AND accion = 'REINTENTO_MANUAL_HERALD'"
                    ),
                    {"id": notificacion.id},
                )
            ).first()
            assert auditoria is not None
            assert auditoria.usuario_id == usuario.id
    finally:
        await engine.dispose()


async def test_reintento_manual_404_inexistente(session, sujeto_controlado, database_url):
    usuario = await _registrar(session, nombres="Reintento", apellidos="Cuatrocientos4")
    await session.commit()
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    token = _sujeto_token(usuario.id, permisos=["usuarios:gestionar"], settings=settings)
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        respuesta = client.post(f"/api/v1/notificaciones/{uuid.uuid4()}/reintentar")
    assert respuesta.status_code == 404


async def test_reintento_manual_409_no_agotada(session, sujeto_controlado, database_url):
    usuario = await _registrar(session, nombres="Reintento", apellidos="Conflicto")
    await session.commit()
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    # fallido pero aún reintentable por el worker (intentos < MAX_INTENTOS)
    reintentable = await _sembrar_notificacion(session, intentos=3)
    # fila que no está en fallido
    enviada = await _sembrar_notificacion(session, estado_envio="enviado", intentos=1)
    await session.commit()

    token = _sujeto_token(usuario.id, permisos=["usuarios:gestionar"], settings=settings)
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        r1 = client.post(f"/api/v1/notificaciones/{reintentable.id}/reintentar")
        r2 = client.post(f"/api/v1/notificaciones/{enviada.id}/reintentar")
    assert r1.status_code == 409
    assert "agotados" in r1.json()["detail"] or "intentos" in r1.json()["detail"]
    assert r2.status_code == 409


def test_historial_filtro_estado_envio_y_campos_nuevos(sujeto_controlado, database_url):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    token = _sujeto_token(uuid.uuid4(), permisos=["auditoria:leer"], settings=settings)
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        respuesta = client.get(
            "/api/v1/notificaciones/historial",
            params={"estado_envio": "pendiente", "limite": 5},
        )
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert all(el["estado_envio"] == "pendiente" for el in datos["elementos"])
    assert all("intentos" in el and "error_detalle" in el for el in datos["elementos"])


# ---------------------------------------------------------------------------
# 6. Resumen diario: contenido, vacío, idempotencia, huso, --simular
# ---------------------------------------------------------------------------


async def _propuesta_publicada(session, contexto_base) -> str:
    from app.modules.aportes.repository import AporteRepository
    from app.modules.aportes.schemas import PropuestaCiudadanaCreate
    from app.modules.aportes.service import AporteService

    servicio = AporteService(AporteRepository(session), settings=Settings(_env_file=None, environment="test"))
    propuesta = await servicio.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Senda peatonal segura para el resumen diario",
            descripcion="Urbanización del sendero con prioridad de pico infantil",
            autor_nombre="Comité de Madres",
            es_anonimo=False,
            estado="publicado",
        )
    )
    return propuesta.codigo_radicado


async def test_resumen_diario_contenido_correcto(session, contexto_base, monkeypatch):
    from app.modules.notificaciones import resumen_cli

    facilitador = await _registrar(session, nombres="Faci", apellidos="Litador")
    await _promover_facilitador(session, facilitador)
    await session.commit()
    radicado = await _propuesta_publicada(session, contexto_base)

    monkeypatch.setattr(resumen_cli, "_facilitadores_activos", _un_facilitador(facilitador.correo, "Faci Litador"))
    fecha = date(2026, 10, 30)
    destinatarios = await generar_resumen(
        session, Settings(_env_file=None, environment="test"), fecha=fecha, simular=False
    )
    assert facilitador.correo in destinatarios

    fila = (
        await session.execute(
            select(NotificacionTransaccional).where(
                NotificacionTransaccional.destinatario_correo == facilitador.correo,
                NotificacionTransaccional.codigo_radicado == f"RESUMEN-{fecha.isoformat()}",
            )
        )
    ).scalar_one()
    assert fila.tipo_evento == "resumen_diario"
    assert fila.estado_envio == "pendiente"
    # El recuento de pendientes puede acumular propuestas de otras pruebas de la misma base.
    assert re.fullmatch(r"POLIS: Resumen del día 30/10/2026 — 0 acciones, [1-9][0-9]* pendientes", fila.asunto)
    assert "Resumen diario de gestión institucional" in fila.cuerpo_html
    assert radicado in fila.cuerpo_html
    assert "Concepto técnico pendiente" in fila.cuerpo_html
    assert "Faci Litador" in fila.cuerpo_html
    assert "Alcaldía Mayor de Cartagena de Indias" in fila.cuerpo_html


def _un_facilitador(correo: str, nombre: str):
    async def fake(session):
        return [(correo, nombre)]

    return fake


async def test_resumen_diario_no_se_envia_vacio(session, monkeypatch):
    from app.modules.notificaciones import resumen_cli

    monkeypatch.setattr(resumen_cli, "_facilitadores_activos", _sin_facilitadores())
    fecha = date(2026, 1, 5)
    destinatarios = await generar_resumen(
        session, Settings(_env_file=None, environment="test"), fecha=fecha, simular=False
    )
    assert destinatarios == []
    filas = (
        (
            await session.execute(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.codigo_radicado == f"RESUMEN-{fecha.isoformat()}"
                )
            )
        )
        .scalars()
        .all()
    )
    assert filas == []


def _sin_facilitadores():
    async def fake(session):
        return []

    return fake


async def test_resumen_diario_idempotente(session, contexto_base, monkeypatch):
    from app.modules.notificaciones import resumen_cli

    facilitador = await _registrar(session, nombres="Idem", apellidos="Potente")
    await _promover_facilitador(session, facilitador)
    await session.commit()
    await _propuesta_publicada(session, contexto_base)

    monkeypatch.setattr(resumen_cli, "_facilitadores_activos", _un_facilitador(facilitador.correo, "Idem Potente"))
    fecha = date(2026, 10, 29)
    settings = Settings(_env_file=None, environment="test")
    primera = await generar_resumen(session, settings, fecha=fecha, simular=False)
    segunda = await generar_resumen(session, settings, fecha=fecha, simular=False)
    assert facilitador.correo in primera and facilitador.correo in segunda

    filas = (
        (
            await session.execute(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.destinatario_correo == facilitador.correo,
                    NotificacionTransaccional.codigo_radicado == f"RESUMEN-{fecha.isoformat()}",
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(filas) == 1


async def test_resumen_diario_carrera_on_conflict_una_sola_fila(session, database_url):
    """D-2 remediado: en carrera concurrente el índice único gana — una fila, ninguna explosión.

    Con ``ON CONFLICT DO NOTHING`` una llamada obtiene la fila y la otra devuelve
    None (antes la perdedora explotaba con IntegrityError y abortaba el CLI).
    """
    settings = Settings(_env_file=None, environment="test")
    correo = f"carrera-{uuid.uuid4().hex[:10]}@example.org"
    engine_b = create_async_engine(database_url, pool_pre_ping=True)
    sesion_b = async_sessionmaker(engine_b, expire_on_commit=False)

    async def encolar_a() -> NotificacionTransaccional | None:
        async with transaction(session):
            return await NotificacionService(session, settings=settings).enviar_resumen_diario(
                destinatario=correo,
                nombre_funcionario="Carrera",
                fecha_iso="2026-11-02",
                fecha_legible="02/11/2026",
                acciones=["Acción de la carrera"],
                pendientes=["Pendiente de la carrera"],
            )

    async def encolar_b() -> NotificacionTransaccional | None:
        async with sesion_b() as su:
            async with transaction(su):
                return await NotificacionService(su, settings=settings).enviar_resumen_diario(
                    destinatario=correo,
                    nombre_funcionario="Carrera",
                    fecha_iso="2026-11-02",
                    fecha_legible="02/11/2026",
                    acciones=["Acción de la carrera"],
                    pendientes=["Pendiente de la carrera"],
                )

    resultado_a, resultado_b = await asyncio.gather(encolar_a(), encolar_b())
    assert isinstance(resultado_a, NotificacionTransaccional) != isinstance(resultado_b, NotificacionTransaccional)
    ganadora = resultado_a or resultado_b
    assert ganadora is not None
    assert ganadora.estado_envio == "pendiente"
    assert ganadora.codigo_radicado == "RESUMEN-2026-11-02"
    filas = (
        (
            await session.execute(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.destinatario_correo == correo,
                    NotificacionTransaccional.tipo_evento == "resumen_diario",
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(filas) == 1
    await engine_b.dispose()


async def test_resumen_diario_simular_no_encola(session, contexto_base, monkeypatch):
    from app.modules.notificaciones import resumen_cli

    facilitador = await _registrar(session, nombres="Simu", apellidos="Lador")
    await _promover_facilitador(session, facilitador)
    await session.commit()
    await _propuesta_publicada(session, contexto_base)

    monkeypatch.setattr(resumen_cli, "_facilitadores_activos", _un_facilitador(facilitador.correo, "Simu Lador"))
    fecha = date(2026, 10, 28)
    destinatarios = await generar_resumen(
        session, Settings(_env_file=None, environment="test"), fecha=fecha, simular=True
    )
    assert facilitador.correo in destinatarios
    filas = (
        (
            await session.execute(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.codigo_radicado == f"RESUMEN-{fecha.isoformat()}"
                )
            )
        )
        .scalars()
        .all()
    )
    assert filas == []


async def test_resumen_diario_huso_america_bogota(session, monkeypatch):
    """23:30 del 31/10 en Bogotá = 04:30 del 01/11 en UTC: pertenece al 31/10."""
    from app.modules.notificaciones import resumen_cli

    usuario = await _registrar(session, nombres="Huso", apellidos="Bogota")
    await session.commit()
    # 2026-10-31 05:30 America/Bogota (dentro de la ventana de corte 07:00)
    fecha_utc = datetime(2026, 10, 31, 10, 30, tzinfo=UTC)
    servicio = NotificacionService(session, settings=Settings(_env_file=None, environment="test"))
    async with transaction(session):
        await servicio.enviar_comprobante_gestion_interna(
            destinatario=usuario.correo,
            nombre_actor="Huso Bogota",
            rol="facilitador_mesa",
            accion="Registro de acta comunitaria",
            detalle_accion="Acta 044 del 31 de octubre",
        )
    await session.execute(
        text(
            "UPDATE participacion_ciudadana.notificaciones_transaccionales "
            "SET creado_en = :momento WHERE destinatario_correo = :correo AND tipo_evento = 'gestion_institucional'"
        ),
        {"momento": fecha_utc, "correo": usuario.correo},
    )
    await session.commit()

    monkeypatch.setattr(resumen_cli, "_facilitadores_activos", _sin_facilitadores())
    settings = Settings(_env_file=None, environment="test")

    # Corte de las 07:00 en Bogotá: sí incluye la acción de las 05:30.
    destinatarios_31 = await generar_resumen(session, settings, fecha=date(2026, 10, 31), simular=False)
    assert usuario.correo in destinatarios_31
    fila_31 = (
        await session.execute(
            select(NotificacionTransaccional).where(
                NotificacionTransaccional.codigo_radicado == "RESUMEN-2026-10-31",
                NotificacionTransaccional.destinatario_correo == usuario.correo,
            )
        )
    ).scalar_one()
    assert "Registro de acta comunitaria" in fila_31.cuerpo_html

    # Fecha del día siguiente: no vuelve a contar la acción del ciclo anterior.
    destinatarios_01 = await generar_resumen(session, settings, fecha=date(2026, 11, 1), simular=False)
    assert usuario.correo not in destinatarios_01


def test_rango_del_dia_es_bogota_no_utc():
    desde, hasta = rango_del_dia(date(2026, 10, 31))
    assert desde == datetime(2026, 10, 30, 12, 0, tzinfo=ZoneInfo("UTC"))
    assert hasta == datetime(2026, 10, 31, 12, 0, tzinfo=ZoneInfo("UTC"))


# ---------------------------------------------------------------------------
# 7. XSS: los datos de usuario quedan escapados en el HTML del resumen
# ---------------------------------------------------------------------------


def test_resumen_diario_escapa_script_en_nombre_y_acciones():
    html = generar_html_resumen_diario(
        nombre_funcionario='Ana <script>alert("xss")</script> López',
        fecha_legible="31/10/2026",
        acciones=['<script>alert("xss")</script> Acción maliciosa'],
        pendientes=["Pendiente <img src=x onerror=alert(1)>"],
        enlace_panel="https://polis.test/plataforma",
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "<img src=x" not in html
    assert "&lt;img src=x" in html


# ---------------------------------------------------------------------------
# 8. Ciclo de migración 0093 ↔ 0094 (base exclusiva de reconstrucción)
# ---------------------------------------------------------------------------


def _config_alembic() -> ConfigAlembic:
    return ConfigAlembic(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


@pytest.mark.migration
def test_ciclo_migracion_0093_0094(database_url, monkeypatch) -> None:
    """0093 → 0094 → 0093 → 0094 con verificación de tabla, CHECK e índice."""
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = _config_alembic()
    command.upgrade(config, "head")

    async def _verificar_head() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as conexion:
                tabla = await conexion.scalar(text("SELECT to_regclass('participacion_ciudadana.herald_latido')"))
                assert tabla and tabla.endswith("herald_latido")
                tipos = (
                    await conexion.execute(
                        text(
                            "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
                            "WHERE conname = 'chk_notificaciones_tipo_evento'"
                        )
                    )
                ).scalar_one()
                assert "resumen_diario" in tipos
                indice = await conexion.scalar(
                    text(
                        "SELECT indexdef FROM pg_indexes "
                        "WHERE schemaname = 'participacion_ciudadana' "
                        "AND indexname = 'uq_notif_resumen_destinatario_dia'"
                    )
                )
                assert indice and "UNIQUE" in indice and "resumen_diario" in indice
        finally:
            await engine.dispose()

    async def _verificar_0093() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as conexion:
                tabla = await conexion.scalar(text("SELECT to_regclass('participacion_ciudadana.herald_latido')"))
                assert not tabla
                tipos = (
                    await conexion.execute(
                        text(
                            "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
                            "WHERE conname = 'chk_notificaciones_tipo_evento'"
                        )
                    )
                ).scalar_one()
                assert "resumen_diario" not in tipos
        finally:
            await engine.dispose()

    asyncio.run(_verificar_head())
    command.downgrade(config, "0093_herald_gestion")
    asyncio.run(_verificar_0093())
    command.upgrade(config, "head")
    command.downgrade(config, "0093_herald_gestion")
    command.upgrade(config, "head")
    asyncio.run(_verificar_head())
    command.check(config)
