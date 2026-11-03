"""Pruebas dirigidas de plantillas institucionales POLIS Herald (Encargo 279)."""

import base64
import inspect
from collections.abc import Callable, Sequence
from types import UnionType

from app.modules.notificaciones import plantillas_stack

CARGA_XSS = "<script>alert('xss')</script>"
AMPERANDOS = """Propuesta "vecinal" & <prioritaria> 'comunitaria' &"""

PLANTILLAS = [
    plantillas_stack.generar_html_registro_bienvenida,
    plantillas_stack.generar_html_verificacion_correo,
    plantillas_stack.generar_html_recuperacion_contrasena,
    plantillas_stack.generar_html_contrasena_cambiada,
    plantillas_stack.generar_html_perfil_actualizado,
    plantillas_stack.generar_html_constancia_radicacion,
    plantillas_stack.generar_html_propuesta_actualizada,
    plantillas_stack.generar_html_cambio_estado,
    plantillas_stack.generar_html_priorizacion,
    plantillas_stack.generar_html_apoyo_propuesta,
    plantillas_stack.generar_html_actividad_ciudadana,
    plantillas_stack.generar_html_invitacion_mesa,
    plantillas_stack.generar_html_acta_sesion,
    plantillas_stack.generar_html_compromiso_asignado,
    plantillas_stack.generar_html_gestion_institucional,
    plantillas_stack.generar_html_alerta_pendientes,
    plantillas_stack.generar_html_resumen_diario,
]


def _valor_según_parametro(nombre: str, anotacion: object) -> object:
    """Valor mínimo determinista para una firma, sin depender de la base de datos."""
    texto = f"{CARGA_XSS} {AMPERANDOS}" if nombre not in {"enlace_activacion", "enlace_verificacion"} else CARGA_XSS
    origen = getattr(anotacion, "__origin__", None)
    if origen is Sequence or origen in {list, tuple}:
        return [texto]
    if anotacion is int:
        return 24
    if anotacion is bool:
        return True
    if anotacion is str:
        return texto
    if anotacion in {Callable, inspect.Parameter.empty}:
        return texto
    # `str | None` y tipos equivalentes se omiten porque la plantilla tiene valor por defecto.
    if isinstance(anotacion, UnionType) or origen is not None:
        return texto
    return texto


def ejecutar(generador: Callable[..., str]) -> str:
    campos = {
        nombre: _valor_según_parametro(nombre, parametro.annotation)
        for nombre, parametro in inspect.signature(generador).parameters.items()
        if parametro.default is inspect.Parameter.empty
    }
    return generador(**campos)


def test_catalogo_stack_tiene_17_plantillas_publicas() -> None:
    assert len(PLANTILLAS) == 17
    assert len({generador.__name__ for generador in PLANTILLAS}) == 17


def test_todas_las_plantillas_renderiza_sin_excepciones() -> None:
    resultados = [ejecutar(generador) for generador in PLANTILLAS]

    assert len(resultados) == 17
    for resultado in resultados:
        assert resultado.startswith("<!DOCTYPE html>")
        assert "</html>" in resultado


def test_logo_oficial_y_pie_legal_estan_en_todas_las_plantillas() -> None:
    for generador in PLANTILLAS:
        html_renderizado = ejecutar(generador)

        assert plantillas_stack.LOGO_POLIS_URL in html_renderizado
        assert "POLIS" in html_renderizado
        assert "Alcaldía Mayor de Cartagena de Indias" in html_renderizado
        assert "Secretaría del Interior y Convivencia Ciudadana" in html_renderizado
        assert "Ley 1581 de 2012" in html_renderizado
        assert "CPACA" in html_renderizado
        assert 'width="600"' not in html_renderizado or "max-width:600px" in html_renderizado


def test_todos_los_usuarios_reservados_y_xss_estan_escapedes() -> None:
    for generador in PLANTILLAS:
        html_renderizado = ejecutar(generador)

        assert "<script>alert('xss')</script>" not in html_renderizado
        assert "&lt;script&gt;alert" in html_renderizado
        assert "alert" in html_renderizado


def test_entrada_cita_y_ampersand_quedan_escapedes_en_radicacion() -> None:
    html_renderizado = plantillas_stack.generar_html_constancia_radicacion(
        radicado="POL-2026-ESCAPE",
        titulo=AMPERANDOS,
        descripcion=CARGA_XSS,
        autor="Autor & Comunidad",
        dimension="Participación",
        enlace_verificacion="https://seguridadhumanaintegral.org/seguimiento",
    )

    assert "Propuesta &quot;vecinal&quot; &amp; &lt;prioritaria&gt;" in html_renderizado
    assert "Autor &amp; Comunidad" in html_renderizado


def test_generar_qr_base64_produce_png_data_uri() -> None:
    qr = plantillas_stack.generar_qr_base64("https://seguridadhumanaintegral.org/seguimiento?radicado=POL-2026-QR")

    assert qr is not None
    prefijo, bytes_base64 = qr.split(",", 1)
    assert prefijo == "data:image/png;base64"
    assert bytes_base64
    assert base64.b64decode(bytes_base64).startswith(b"\x89PNG\r\n\x1a\n")


def test_qr_fallback_sin_dependencias_no_rompe_html(monkeypatch) -> None:
    monkeypatch.setattr(plantillas_stack, "_qrcode", None)
    monkeypatch.setattr(plantillas_stack, "_PilImage", None)

    assert plantillas_stack.generar_qr_base64("https://seguridadhumanaintegral.org/seguimiento") is None

    html_renderizado = plantillas_stack.generar_html_constancia_radicacion(
        radicado="POL-2026-SIN-QR",
        titulo=AMPERANDOS,
        descripcion=CARGA_XSS,
        autor="Nombre & Comunidad",
        dimension="Participación",
        enlace_verificacion="https://seguridadhumanaintegral.org/seguimiento",
    )

    assert plantillas_stack.generar_qr_base64("https://example.org") is None
    assert "data:image/png;base64," not in html_renderizado
    assert 'href="https://seguridadhumanaintegral.org/seguimiento"' in html_renderizado
    assert '<a href="' in html_renderizado


def test_constancia_herald_usa_ruta_oficial_y_orden_283() -> None:
    html_renderizado = plantillas_stack.generar_html_constancia_radicacion(
        radicado="POL-2026-HERALD",
        titulo="Ruta segura comunitaria",
        descripcion="Solicitud verificable con QR institucional",
        autor="Coordinación Territorial",
        dimension="Seguridad Personal",
        enlace_verificacion="https://seguridadhumanaintegral.org/aportes/POL-2026-HERALD",
    )

    assert 'href="https://seguridadhumanaintegral.org/aportes/POL-2026-HERALD"' in html_renderizado
    assert "/seguimiento?radicado=" not in html_renderizado
    orden_requerido = [
        ">Entidad</p>",
        ">Política</p>",
        ">Dimensión</p>",
        ">Propuesta</p>",
        ">Autor</p>",
        ">Fecha y hora legal</p>",
    ]
    posiciones = [html_renderizado.index(consulta) for consulta in orden_requerido]
    assert posiciones == sorted(posiciones)


def test_bienvenida_verifica_correo_y_ensenia_ruta_antispoam() -> None:
    html_renderizado = plantillas_stack.generar_html_verificacion_correo(
        "Vecina & Comercio", "https://polis.test/#accion=verificar&token=demo-token", 30
    )

    assert "caduca en 30 minutos" in html_renderizado
    assert "Verificar mi correo electrónico" in html_renderizado
    assert "Correo no deseado" in html_renderizado
    assert '"No es spam"' in html_renderizado
