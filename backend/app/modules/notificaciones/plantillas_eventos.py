"""Plantillas HTML institucionales para los nuevos flujos de correo transaccional.

Encargo 272: bienvenida de registro, recuperación de contraseña, apoyo ciudadano
("me gusta") y actividad de participación. Complementan (sin reemplazar) las
plantillas de constancia y cambio de estado en ``correo.py``.

Paleta institucional de Cartagena de Indias: #0f172a azul noche, #0284c7 azul
caribe, #38bdf8 acento y #ffffff de fondo de tarjeta.
"""

import html
from datetime import UTC, datetime


def _cuerpo_institucional(titulo_pagina: str, subtitulo: str, contenido: str, pie: str) -> str:
    """Capa compartida: cabecera azul noche, acento caribe y pie institucional."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(titulo_pagina)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7; padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
<tr>
<td style="background-color:#0f172a; padding:24px 32px; border-bottom:3px solid #0284c7;">
<p style="margin:0; font-size:11px; font-weight:700; letter-spacing:0.1em; color:#38bdf8; text-transform:uppercase;">Alcaldía Mayor de Cartagena de Indias</p>
<h1 style="margin:4px 0 0 0; font-size:18px; font-weight:700; color:#ffffff;">Sistema Distrital POLIS</h1>
<p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">{html.escape(subtitulo)}</p>
</td>
</tr>
<tr><td style="padding:32px;">{contenido}</td></tr>
<tr>
<td style="background-color:#f8fafc; padding:20px 32px; border-top:1px solid #e2e8f0; font-size:11px; line-height:1.5; color:#64748b; text-align:center;">
<p style="margin:0 0 4px 0; font-weight:600; color:#475569;">Alcaldía Mayor de Cartagena de Indias · Secretaría del Interior y Convivencia Ciudadana</p>
<p style="margin:0;">Sistema POLIS para la Seguridad Humana Integral y la Participación Vinculante.</p>
<p style="margin:6px 0;">{html.escape(pie)}</p>
<p style="margin:0; color:#94a3b8; font-size:10px;">Este mensaje es una notificación automática. Por favor no responda directamente a este correo.</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def _parrafo(texto_html: str) -> str:
    return f'<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#334155;">{texto_html}</p>'


def _destacado(fondo: str, borde: str, color: str, etiqueta: str) -> str:
    """Banda destacada centrada (etiqueta corta en mayúscula cursiva institucional)."""
    return (
        f'<div style="background-color:{fondo}; border:1px solid {borde}; border-radius:6px; padding:16px; '
        'margin-bottom:24px; text-align:center;">'
        f'<p style="margin:0; font-size:12px; font-weight:600; color:{color}; text-transform:uppercase; '
        f'letter-spacing:0.05em;">{html.escape(etiqueta)}</p></div>'
    )


def _tarjeta(filas: list[tuple[str, str]]) -> str:
    celdas = "".join(
        '<p style="margin:0 0 4px 0; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">'
        f"{html.escape(etiqueta)}</p>"
        f'<p style="margin:0 0 {14 if indice < len(filas) - 1 else 0}px 0; font-size:13px; line-height:1.5; color:#334155;">'
        f"{html.escape(detalle)}</p>"
        for indice, (etiqueta, detalle) in enumerate(filas)
    )
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:24px;">'
        f'<tr><td style="padding:16px;">{celdas}</td></tr></table>'
    )


def _boton(enlace: str, texto: str) -> str:
    return (
        '<div style="text-align:center; margin:32px 0 24px 0;">'
        f'<a href="{html.escape(enlace)}" target="_blank" style="display:inline-block; background-color:#0284c7; '
        "color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:6px;"
        f'box-shadow:0 2px 4px rgba(2,132,199,0.2);">{html.escape(texto)}</a></div>'
    )


def generar_html_bienvenida_registro(nombre: str, enlace_verificacion: str, minutos: int) -> str:
    """Flujo 1: bienvenida y verificación de cuenta del registro ciudadano."""
    contenido = (
        _destacado("#f0f9ff", "#bae6fd", "#0369a1", "Bienvenido(a) a la plataforma distrital de Seguridad Humana")
        + _parrafo(
            f"Estimado(a) <strong>{html.escape(nombre)}</strong>: le damos la bienvenida al Sistema "
            "Distrital POLIS de la Alcaldía Mayor de Cartagena de Indias, la plataforma de "
            "Participación Vinculante donde su voz alimenta la formulación, trazabilidad y "
            "rendición de cuentas de la política pública."
        )
        + _parrafo(
            "Para activar su cuenta y garantizar la fe pública de su identidad digital, confirme su correo electrónico:"
        )
        + _boton(enlace_verificacion, "Verificar mi cuenta")
        + _tarjeta(
            [
                ("Caducidad del enlace", f"Es de uso único y caduca en {minutos} minutos."),
                (
                    "Nota de seguridad",
                    "Si usted no creó esta cuenta, ignore este mensaje; nunca comparta su contraseña.",
                ),
            ]
        )
    )
    return _cuerpo_institucional(
        "Bienvenida y verificación de cuenta - POLIS",
        "Cartagena Ciudad de Derechos · Registro Ciudadano",
        contenido,
        "Tratamiento de datos conforme a la Ley 1581 de 2012 (Habeas Data).",
    )


def generar_html_recuperacion_contrasena(
    enlace_restablecer: str, minutos: int, nombre_destinatario: str | None = None
) -> str:
    """Flujo 2: recuperación de contraseña institucional de uso único."""
    saludo = (
        f"Estimado(a) <strong>{html.escape(nombre_destinatario)}</strong>:"
        if nombre_destinatario
        else "Estimado(a) ciudadano(a):"
    )
    contenido = (
        _destacado("#fff7ed", "#fed7aa", "#9a3412", "Solicitud de restablecimiento de contraseña")
        + _parrafo(saludo)
        + _parrafo(
            "Recibimos una solicitud para restablecer la contraseña de su cuenta en la "
            "plataforma POLIS. Si usted la realizó, oprima el siguiente botón:"
        )
        + _boton(enlace_restablecer, "Restablecer mi contraseña")
        + _tarjeta(
            [
                ("Caducidad", f"El enlace caduca en {minutos} minutos y solo se usa una vez."),
                (
                    "Aviso de seguridad",
                    "Si NO solicitó el restablecimiento, ignore este mensaje: su contraseña "
                    "actual sigue activa. Nunca compartiremos tokens ni enlaces por teléfono.",
                ),
            ]
        )
    )
    return _cuerpo_institucional(
        "Recuperación de contraseña - POLIS",
        "Cartagena Ciudad de Derechos · Seguridad de Acceso",
        contenido,
        "Tratamiento de datos conforme a la Ley 1581 de 2012 (Habeas Data).",
    )


def generar_html_actividad_apoyo(
    rol_destinatario: str,
    radicado: str,
    titulo: str,
    apoyos_totales: int,
    enlace_seguimiento: str,
    *,
    nombre_destinatario: str | None = None,
    dimension_titulo: str | None = None,
    enlace_actividades: str | None = None,
) -> str:
    """Flujo 4: aviso al autor y constancia de actividad del ciudadano que respaldó.

    ``rol_destinatario`` es ``"autor"`` (el propietario de la propuesta recibe el
    aviso del nuevo respaldo y el total actualizado) o ``"participante"`` (el
    ciudadano que apoyó recibe su constancia y el resumen de actividades).
    """
    es_autor = rol_destinatario == "autor"
    destacado = (
        _destacado("#f0fdf4", "#bbf7d0", "#166534", "Nuevo respaldo ciudadano recibido")
        if es_autor
        else _destacado("#f0f9ff", "#bae6fd", "#0369a1", "Su respaldo ciudadano fue registrado")
    )
    if es_autor:
        intro = _parrafo(
            "Su propuesta ciudadana acaba de recibir un nuevo respaldo en la plataforma de "
            "Participación Vinculante POLIS."
        )
    elif nombre_destinatario:
        intro = _parrafo(
            f"Gracias por participar, {html.escape(nombre_destinatario)}: su respaldo quedó "
            "registrado como constancia de actividad en el Sistema Distrital POLIS."
        )
    else:
        intro = _parrafo(
            "Gracias por participar: su respaldo quedó registrado como constancia de "
            "actividad en el Sistema Distrital POLIS."
        )
    filas: list[tuple[str, str]] = [("Radicado", radicado), ("Propuesta", titulo)]
    if dimension_titulo:
        filas.append(("Dimensión de Seguridad Humana", dimension_titulo))
    filas.append(("Fecha y hora oficial", datetime.now(UTC).strftime("%d/%m/%Y %H:%M UTC")))
    contenido = destacado + intro + _tarjeta(filas) + _boton(enlace_seguimiento, "Ver el progreso de la propuesta")
    if not es_autor and enlace_actividades:
        contenido += _parrafo(
            "Consulte sus actividades y participación en la plataforma: "
            f'<a href="{html.escape(enlace_actividades)}" style="color:#0284c7; font-weight:600;">'
            "Panel de actividades POLIS</a>"
        )
    return _cuerpo_institucional(
        f"Actividad ciudadana - {radicado}",
        "Cartagena Ciudad de Derechos · Participación Vinculante",
        contenido,
        "Respaldo único por persona (1 ciudadano = 1 voto), Ley 1755 de 2015.",
    )


def _lista(items: list[str]) -> str:
    filas = "".join(
        f'<li style="margin:0 0 6px 0; font-size:13px; line-height:1.5; color:#334155;">{html.escape(item)}</li>'
        for item in items
    )
    return f'<ul style="margin:0 0 16px 0; padding-left:20px;">{filas}</ul>'


def _sello_utc() -> str:
    return datetime.now(UTC).strftime("%d/%m/%Y %H:%M UTC")


def generar_html_seguridad_perfil(
    nombre: str,
    accion: str,
    campos: list[str],
    enlace_panel: str | None = None,
) -> str:
    """Aviso de seguridad: actualización de perfil o cambio de contraseña (Herald Fase 2)."""
    contenido = (
        _destacado("#fff7ed", "#fed7aa", "#9a3412", "Aviso de seguridad de su cuenta")
        + _parrafo(
            f"Estimado(a) <strong>{html.escape(nombre)}</strong>: se ejecutó la siguiente acción "
            "en su cuenta del Sistema Distrital POLIS:"
        )
        + _tarjeta(
            [
                ("Acción ejecutada", accion),
                ("Campos modificados", ", ".join(campos) if campos else "Ninguno"),
                ("Fecha y hora oficial", _sello_utc()),
            ]
        )
        + _parrafo(
            "<strong>Si usted no reconoció esta acción:</strong> cambie su contraseña de inmediato "
            "y active el cierre de sesiones desde su panel. La plataforma nunca le solicitará "
            "contraseñas ni tokens por correo."
        )
    )
    if enlace_panel:
        contenido += _boton(enlace_panel, "Revisar mi cuenta")
    return _cuerpo_institucional(
        f"Aviso de seguridad - {accion}",
        "Cartagena Ciudad de Derechos · Seguridad de la Cuenta",
        contenido,
        "Tratamiento de datos conforme a la Ley 1581 de 2012 (Habeas Data).",
    )


def generar_html_gestion_institucional(
    nombre_funcionario: str,
    rol: str,
    accion: str,
    detalle_accion: str,
    pendientes_asociados: list[str],
    enlace_panel: str,
) -> str:
    """Comprobante de acción interna y bitácora del funcionario con pendientes (Herald Fase 2)."""
    contenido = (
        _destacado("#eef2ff", "#c7d2fe", "#3730a3", "Comprobante de gestión institucional")
        + _parrafo(
            f"Estimado(a) <strong>{html.escape(nombre_funcionario)}</strong>: la plataforma registró "
            "la acción ejecutada bajo su responsabilidad con sello de tiempo distrital:"
        )
        + _tarjeta(
            [
                ("Funcionario", nombre_funcionario),
                ("Rol institucional", rol),
                ("Acción ejecutada", accion),
                ("Detalle de la acción", detalle_accion),
                ("Sello de tiempo oficial", _sello_utc()),
            ]
        )
    )
    if pendientes_asociados:
        contenido += _parrafo(
            '<strong style="text-transform:uppercase; letter-spacing:0.05em; font-size:12px; '
            'color:#475569;">Pendientes asociados a su gestión</strong>'
        )
        contenido += _lista(list(pendientes_asociados))
    contenido += _boton(enlace_panel, "Abrir panel de gestión")
    return _cuerpo_institucional(
        f"Comprobante de gestión - {accion}",
        "Cartagena Ciudad de Derechos · Bitácora Institucional",
        contenido,
        "Registro de fe pública conforme a la Sentencia C-150 de 2015 y el Decreto 037 de 2026.",
    )


def generar_html_constancia_actualizacion_propuesta(
    radicado: str,
    titulo: str,
    campos_modificados: list[str],
    enlace_seguimiento: str,
) -> str:
    """Constancia de edición o complementación de una propuesta ya radicada (Herald Fase 2)."""
    contenido = (
        _destacado("#f0f9ff", "#bae6fd", "#0369a1", "Actualización de su propuesta radicada")
        + _parrafo(
            "Su propuesta ciudadana fue editada o complementada. Esta constancia registra los "
            "cambios aplicados sobre el radicado unívoco:"
        )
        + _tarjeta(
            [
                ("Radicado", radicado),
                ("Propuesta", titulo),
                ("Fecha y hora oficial", _sello_utc()),
            ]
        )
        + _parrafo("<strong>Campos actualizados:</strong>")
        + _lista(campos_modificados)
        + _boton(enlace_seguimiento, "Consultar el seguimiento de mi propuesta")
    )
    return _cuerpo_institucional(
        f"Actualización de propuesta {radicado}",
        "Cartagena Ciudad de Derechos · Participación Vinculante",
        contenido,
        "Radicado único e inmutable; fe pública conforme a la Sentencia C-150 de 2015.",
    )
