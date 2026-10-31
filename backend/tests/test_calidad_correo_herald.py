"""Calidad del servicio de correo transaccional POLIS Herald (transporte, ejecutor y entrega concurrente).

Complementa las suites de los Encargos 272/273, que verifican el *encolado* y las plantillas pero no
la *entrega*: aquí se prueba el MIME real que sale al relé SMTP, la elección SMTP/SMTPS, el tope de
reintentos, la entrega concurrente sin duplicados y la negativa de arrancar en producción sin SMTP.
"""

import email
import uuid
from email import policy

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.modules.notificaciones import correo as modulo_correo
from app.modules.notificaciones.correo import (
    despachar_correo,
    generar_html_constancia_radicacion,
    texto_plano_desde_html,
)
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.worker import MAX_INTENTOS, NotificacionWorker, dominio_remitente
from app.modules.notificaciones.worker_cli import (
    ConfiguracionInvalida,
    drenar,
    verificar_configuracion,
)

REMITENTE = "POLIS <notificaciones@alcaldia.example.gov.co>"


def _settings(**extra) -> Settings:
    return Settings(_env_file=None, environment="test", **extra)


def _html_radicacion() -> str:
    return generar_html_constancia_radicacion(
        radicado="POL-2026-0042",
        titulo="Alumbrado para el barrio",
        descripcion="Solicito luminarias en la calle 5 & 6",
        autor="Ana Pérez",
        enlace_consulta="https://seguridadhumanaintegral.org/seguimiento?radicado=POL-2026-0042",
    )


# ---------------------------------------------------------------------------
# Texto plano derivado del HTML
# ---------------------------------------------------------------------------


def test_texto_plano_conserva_el_contenido_del_evento():
    texto = texto_plano_desde_html(_html_radicacion())
    assert "POL-2026-0042" in texto
    assert "Alumbrado para el barrio" in texto
    assert "calle 5 & 6" in texto  # entidades HTML decodificadas
    assert "https://seguridadhumanaintegral.org/seguimiento?radicado=POL-2026-0042" in texto
    assert "<" not in texto and "font-size" not in texto  # sin marcado ni CSS
    assert "no soporta" not in texto.lower()  # ya no es la frase genérica


def test_texto_plano_nunca_queda_vacio():
    assert texto_plano_desde_html("<html><head><style>x{}</style></head><body></body></html>").strip()


# ---------------------------------------------------------------------------
# Transporte SMTP (sin red: se sustituye smtplib)
# ---------------------------------------------------------------------------


class _SMTPFalso:
    instancias: list["_SMTPFalso"] = []

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port, self.context = host, port, context
        self.llamadas: list[str] = []
        self.mensaje = None
        _SMTPFalso.instancias.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def starttls(self, context=None):
        self.llamadas.append("starttls")

    def login(self, usuario, contrasena):
        self.llamadas.append("login")

    def send_message(self, mensaje):
        self.llamadas.append("send_message")
        self.mensaje = mensaje


@pytest.fixture
def smtp_falso(monkeypatch):
    _SMTPFalso.instancias = []
    monkeypatch.setattr(modulo_correo.smtplib, "SMTP", _SMTPFalso)
    monkeypatch.setattr(modulo_correo.smtplib, "SMTP_SSL", _SMTPFalso)
    return _SMTPFalso


@pytest.mark.anyio
async def test_mime_saliente_es_multipart_con_cabeceras_correctas(smtp_falso):
    estado, error, enviado_en = await despachar_correo(
        destinatario="vecina@example.org",
        asunto="POLIS: Constancia",
        cuerpo_html=_html_radicacion(),
        settings=_settings(smtp_host="relay.local", smtp_remitente=REMITENTE),
        identificador_mensaje="<polis-notificacion-1@alcaldia.example.gov.co>",
    )
    assert (estado, error) == ("enviado", None) and enviado_en is not None
    mensaje = email.message_from_bytes(smtp_falso.instancias[0].mensaje.as_bytes(), policy=policy.default)

    assert mensaje["Date"], "falta Date: algunos filtros penalizan correo sin fecha"
    assert mensaje["Auto-Submitted"] == "auto-generated"
    assert mensaje["Message-ID"] == "<polis-notificacion-1@alcaldia.example.gov.co>"
    assert mensaje["From"] == REMITENTE and mensaje["To"] == "vecina@example.org"

    partes = {p.get_content_type(): p.get_content() for p in mensaje.walk() if not p.is_multipart()}
    assert set(partes) == {"text/plain", "text/html"}
    assert "POL-2026-0042" in partes["text/plain"] and "POL-2026-0042" in partes["text/html"]


@pytest.mark.anyio
async def test_puerto_587_usa_starttls_y_login(smtp_falso):
    await despachar_correo(
        "a@example.org",
        "x",
        "<p>hola</p>",
        _settings(smtp_host="h", smtp_port=587, smtp_usuario="u", smtp_contrasena="p"),
    )
    assert smtp_falso.instancias[0].llamadas == ["starttls", "login", "send_message"]


@pytest.mark.anyio
async def test_puerto_465_usa_tls_implicito_sin_starttls(smtp_falso):
    estado, *_ = await despachar_correo(
        "a@example.org", "x", "<p>hola</p>", _settings(smtp_host="h", smtp_port=465, smtp_usuario="u")
    )
    assert estado == "enviado"
    assert "starttls" not in smtp_falso.instancias[0].llamadas  # SMTPS ya es TLS desde el saludo


@pytest.mark.anyio
async def test_destinatario_con_inyeccion_de_cabeceras_no_se_envia(smtp_falso):
    """Un CRLF en el destinatario no debe poder añadir cabeceras (Bcc) al mensaje."""
    with pytest.raises(ValueError):
        await despachar_correo(
            "victima@example.org\r\nBcc: todos@example.org", "x", "<p>hola</p>", _settings(smtp_host="h")
        )
    assert smtp_falso.instancias == []


# ---------------------------------------------------------------------------
# Dominio del Message-ID y verificación de configuración
# ---------------------------------------------------------------------------


def test_dominio_remitente():
    assert dominio_remitente(_settings(smtp_remitente=REMITENTE)) == "alcaldia.example.gov.co"
    assert dominio_remitente(_settings(smtp_remitente="sin-direccion")) == "polis.invalid"


def _produccion(**extra) -> Settings:
    # model_construct: se prueba la regla del ejecutor sin exigir los secretos de producción completos.
    base = {"environment": "production", "smtp_host": None, "smtp_remitente": REMITENTE}
    base.update(extra)
    return Settings.model_construct(**base)


def test_produccion_sin_smtp_no_arranca():
    with pytest.raises(ConfiguracionInvalida, match="SMTP_HOST"):
        verificar_configuracion(_produccion())


def test_produccion_con_remitente_de_ejemplo_no_arranca():
    with pytest.raises(ConfiguracionInvalida, match="example.org"):
        verificar_configuracion(_produccion(smtp_host="relay", smtp_remitente="POLIS <no-reply@example.org>"))


def test_produccion_correctamente_configurada_arranca():
    verificar_configuracion(_produccion(smtp_host="relay"))


def test_desarrollo_y_bandera_explicita_permiten_simulado():
    verificar_configuracion(_settings())
    verificar_configuracion(_produccion(), permitir_simulado=True)


# ---------------------------------------------------------------------------
# Entrega sobre la base de datos: tope de reintentos y concurrencia
# ---------------------------------------------------------------------------


@pytest.fixture
async def fabrica(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


async def _crear(fabrica, *, estado="pendiente", intentos=0, destinatario=None) -> uuid.UUID:
    async with fabrica() as session:
        fila = NotificacionTransaccional(
            codigo_radicado="POL-2026-CALIDAD",
            destinatario_correo=destinatario or f"calidad-{uuid.uuid4().hex}@example.org",
            tipo_evento="radicacion",
            asunto="Prueba de calidad",
            cuerpo_html="<p>cuerpo</p>",
            estado_envio=estado,
            intentos=intentos,
        )
        session.add(fila)
        await session.commit()
        return fila.id


async def _leer(fabrica, notificacion_id) -> NotificacionTransaccional:
    async with fabrica() as session:
        return (
            await session.execute(
                select(NotificacionTransaccional).where(NotificacionTransaccional.id == notificacion_id)
            )
        ).scalar_one()


@pytest.mark.anyio
async def test_message_id_usa_el_dominio_del_remitente(fabrica):
    notificacion_id = await _crear(fabrica)
    capturas = []

    async def transporte(**kwargs):
        capturas.append(kwargs["identificador_mensaje"])
        return "simulado", None, None

    async with fabrica() as session:
        await NotificacionWorker(session, _settings(smtp_remitente=REMITENTE)).procesar_uno(
            transporte=transporte, notificacion_id=notificacion_id
        )
    assert capturas == [f"<polis-notificacion-{notificacion_id}@alcaldia.example.gov.co>"]


@pytest.mark.anyio
async def test_tope_de_reintentos_deja_la_fila_en_fallido_terminal(fabrica):
    agotada = await _crear(fabrica, estado="fallido", intentos=MAX_INTENTOS)
    viva = await _crear(fabrica, estado="fallido", intentos=MAX_INTENTOS - 1)
    llamadas = []

    async def transporte(**kwargs):
        llamadas.append(kwargs["destinatario"])
        return "fallido", "SMTPException", None

    async with fabrica() as session:
        trabajador = NotificacionWorker(session, _settings())
        assert await trabajador.procesar_uno(transporte=transporte, notificacion_id=agotada) is None
        resultado = await trabajador.procesar_uno(transporte=transporte, notificacion_id=viva)

    assert resultado is not None and resultado.intentos == MAX_INTENTOS
    assert len(llamadas) == 1, "la fila agotada no debe volver a enviarse"
    assert (await _leer(fabrica, agotada)).intentos == MAX_INTENTOS  # intacta, auditable
    # La que acaba de usar su último intento tampoco se reclama de nuevo.
    async with fabrica() as session:
        assert (
            await NotificacionWorker(session, _settings()).procesar_uno(transporte=transporte, notificacion_id=viva)
            is None
        )


@pytest.mark.anyio
async def test_entrega_concurrente_procesa_cada_correo_exactamente_una_vez(fabrica):
    destinatarios = [f"lote-{uuid.uuid4().hex}@example.org" for _ in range(20)]
    ids = [await _crear(fabrica, destinatario=d) for d in destinatarios]
    recibidos: list[str] = []

    async def transporte(**kwargs):
        recibidos.append(kwargs["destinatario"])
        return "enviado", None, __import__("datetime").datetime.now(__import__("datetime").UTC)

    resultados = await drenar(fabrica, _settings(), transporte=transporte, concurrencia=6, lote=500)

    mios = [d for d in recibidos if d in set(destinatarios)]
    assert sorted(mios) == sorted(destinatarios), "cada correo debe enviarse una y solo una vez"
    assert resultados["enviado"] >= len(destinatarios)
    for notificacion_id in ids:
        fila = await _leer(fabrica, notificacion_id)
        assert fila.estado_envio == "enviado" and fila.intentos == 1 and fila.enviado_en is not None
        assert fila.reclamo_token is None


@pytest.mark.anyio
async def test_fallo_de_transporte_programa_reintento_con_espera(fabrica):
    notificacion_id = await _crear(fabrica)

    async def transporte(**kwargs):
        return "fallido", "SMTPServerDisconnected", None

    await drenar(fabrica, _settings(), transporte=transporte, concurrencia=1, lote=500)
    fila = await _leer(fabrica, notificacion_id)
    assert fila.estado_envio == "fallido" and fila.intentos == 1
    assert fila.error_detalle == "SMTPServerDisconnected"
    assert fila.proximo_intento_en is not None
