"""Plantillas HTML institucionales completas para POLIS Herald (Encargo 279).

Suite autocontenida para no acoplarse a ediciones concurrentes de
``plantillas_eventos.py``. Se usa el logo oficial publicitado, tablas,
estilos inline y escape HTML sobre todos los datos provenientes de usuarios.
"""

import base64
import html
import io
from collections.abc import Sequence
from datetime import datetime
from zoneinfo import ZoneInfo

try:
    import qrcode as _qrcode
    from qrcode.image.pil import PilImage as _PilImage
except Exception:  # pragma: no cover - permite operar donde no existan las dependencias.
    _qrcode = None
    _PilImage = None


ZONA_BOGOTA = ZoneInfo("America/Bogota")
LOGO_POLIS_URL = "https://seguridadhumanaintegral.org/logo-polis.svg"
_FUENTES = "'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif"


def _fecha_bogota(valor: str | None = None) -> str:
    """Fecha visible en hora oficial de Colombia; acepta sello opcional de dominio."""
    if valor:
        return valor
    return datetime.now(ZONA_BOGOTA).strftime("%d/%m/%Y %H:%M")


def _texto(valor: object) -> str:
    """Escapa todo texto no confiable sin permitir etiquetas."""
    return html.escape(str(valor), quote=True)


def _lista_segura(items: Sequence[str]) -> str:
    segmentos = "".join(
        f'<li style="margin:0 0 8px 0; font-size:14px; line-height:1.65; color:#334155;">{_texto(item)}</li>'
        for item in items
    )
    return f'<ul style="margin:0 0 18px 0; padding-left:22px;">{segmentos}</ul>'


def _parrafo(texto_html: str) -> str:
    return f'<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#334155;">{texto_html}</p>'


def _etiqueta(texto_no_confiable: str) -> str:
    return html.escape(str(texto_no_confiable).upper(), quote=True)


def _tarjeta(filas: Sequence[tuple[str, str | int]]) -> str:
    celdas = []
    largo = len(filas)
    for indice, (etiqueta, dato) in enumerate(filas):
        margen = f"margin:0 0 {14 if indice < largo - 1 else 0}px 0;"
        celdas.append(
            '<p style="margin:0 0 4px 0; font-size:11px; font-weight:700; color:#64748b; '
            'text-transform:uppercase; letter-spacing:0.05em;">'
            f"{_texto(etiqueta)}</p>"
            f'<p style="{margen} font-size:14px; line-height:1.55; color:#1f2937; overflow-wrap:anywhere;">'
            f"{_texto(dato)}</p>"
        )
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:20px;">'
        f'<tr><td style="padding:16px;">{"".join(celdas)}</td></tr></table>'
    )


def _destacado(texto: str, fondo: str = "#eff6ff", color: str = "#1e40af") -> str:
    return (
        f'<div style="background-color:{fondo}; border:1px solid #bfdbfe; border-radius:8px; '
        'padding:18px; margin-bottom:18px; text-align:center;">'
        f'<p style="margin:0; font-size:18px; font-weight:700; color:{color}; overflow-wrap:anywhere;">'
        f"{_texto(texto)}</p></div>"
    )


def _boton(enlace: object, texto: str) -> str:
    return (
        f'<a href="{_texto(enlace)}" style="display:inline-block; background-color:#0369a1; color:#ffffff; '
        'text-decoration:none; font-size:14px; font-weight:700; padding:12px 24px; border-radius:8px;">'
        f"{_texto(texto)}</a>"
    )


def _lista_compacta(texto: str) -> str:
    estilo = "font-size:13px; font-weight:700; color:#475569; text-transform:uppercase;"
    return f'<span style="{estilo}">{_texto(texto)}</span>'


def generar_qr_base64(url: str) -> str | None:
    """Genera un QR PNG institucional; retorna None ante dependencia o fallo."""
    if not isinstance(url, str) or not url.strip() or _qrcode is None or _PilImage is None:
        return None
    try:
        imagen = _qrcode.make(url.strip(), image_factory=_PilImage, box_size=6, border=2)
        buffer = io.BytesIO()
        imagen.save(buffer, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    except Exception:
        return None


def _codigo_qr(enlace: object, radicado: object) -> str:
    """Devuelve código QR visible por HTTPS (compatible con Gmail) y botón institucional."""
    etiqueta = html.escape(str(radicado), quote=True)
    enlace_limpio = html.escape(str(enlace).strip(), quote=True)
    url_qr_remota = f"https://seguridadhumanaintegral.org/api/v1/notificaciones/qr/{etiqueta}.png"

    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" align="center" '
        'style="background-color:#ffffff; border:1px solid #cbd5e1; border-radius:8px; '
        'margin:0 auto 18px auto; padding:16px; text-align:center;">'
        '<tr><td style="text-align:center;">'
        f'<img src="{url_qr_remota}" width="148" height="148" '
        f'alt="Código QR institucional del radicado {etiqueta}" '
        'style="display:block; margin:0 auto 12px auto; border:0; outline:none; text-decoration:none;">'
        '<p style="margin:0 0 12px 0;"><span style="font-size:11px; font-weight:700; color:#475569; '
        'text-transform:uppercase; letter-spacing:0.05em;">Escanee con su móvil para validar radicado</span></p>'
        f'<p style="margin:0 0 12px 0; font-size:16px; font-weight:700; color:#0f172a;">{etiqueta}</p>'
        f'<a href="{enlace_limpio}" style="display:inline-block; background-color:#0369a1; color:#ffffff; '
        'text-decoration:none; font-size:13px; font-weight:700; padding:10px 20px; border-radius:6px;">'
        "Abrir verificación oficial</a>"
        "</td></tr></table>"
    )


def _cabecera_logotipo(subtitulo: object) -> str:
    return (
        '<tr><td style="background-color:#0f172a; padding:24px 28px; border-bottom:4px solid #0284c7;" '
        'align="center">'
        '<img src="'
        + LOGO_POLIS_URL
        + '" width="150" alt="POLIS: Plataforma para la construcción de políticas públicas" '
        'style="display:block; height:auto; max-width:150px;">'
        '<p style="margin:10px 0 0 0; font-size:12px; font-weight:700; letter-spacing:0.04em; color:#7dd3fc; '
        'text-transform:uppercase;">polis | plataforma para la construccion de politicas publicas</p>'
        f'<p style="margin:6px 0 0 0; font-size:13px; color:#cbd5e1;">{_texto(subtitulo)}</p>'
        "</td></tr>"
    )


def _pie_legal() -> str:
    return (
        '<tr><td style="background-color:#f1f5f9; padding:20px 28px; border-top:1px solid #e2e8f0; '
        'font-size:11px; line-height:1.6; color:#475569; text-align:center;">'
        '<p style="margin:0 0 6px 0; font-weight:700;">Alcaldía Mayor de Cartagena de Indias'
        "<br>Secretaría del Interior y Convivencia Ciudadana</p>"
        '<p style="margin:0 0 4px 0;">POLIS es una plataforma desarrollada y de propiedad de '
        '<a href="https://ples.com.co" style="color:#0284c7; text-decoration:none; font-weight:600;">Ples SAS</a>.</p>'
        "<p>Tratamiento de datos bajo Habeas Data, Ley 1581 de 2012, y el Código de Procedimiento "
        "Administrativo y de Contencioso Administrativo (CPACA).</p></td></tr>"
    )


def _documento(titulo_pagina: str, subtitulo: str, contenido: str) -> str:
    return (
        '<!DOCTYPE html>\n<html lang="es">\n<head><meta charset="utf-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        f"<title>{_texto(titulo_pagina)}</title></head>\n"
        '<body style="margin:0; padding:0; background-color:#eef2f7; color:#1e293b; '
        f'font-family:{_FUENTES};">\n'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eef2f7">\n'
        '<tr><td align="center" style="padding:24px 16px;">\n'
        '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%; '
        "max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; "
        'overflow:hidden;">\n'
        f"{_cabecera_logotipo(subtitulo)}\n"
        '<tr><td style="padding:28px;">\n'
        f'<h1 style="margin:0 0 18px; font-size:20px; line-height:1.35; color:#0f172a;">{_texto(titulo_pagina)}</h1>\n'
        f"{contenido}\n</td></tr>\n"
        f"{_pie_legal()}\n"
        "</table>\n</td></tr>\n</table>\n</body>\n</html>"
    )


def _seccion_orden(texto: str, items: Sequence[str]) -> str:
    return _lista_compacta(texto) + _lista_segura(items)


def _tabla_actividades(acciones: Sequence[str]) -> str:
    filas = "".join(
        f'<tr><td style="padding:12px 0; border-bottom:1px solid #e2e8f0; font-size:14px; '
        f'line-height:1.55; color:#334155;">{_texto(item)}</td></tr>'
        for item in acciones
    )
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="margin-bottom:18px; border:1px solid #e2e8f0; border-radius:8px;">'
        f"<tbody>{filas or ''}</tbody></table>"
    )


def generar_html_registro_bienvenida(nombre: str, correo: str, enlace_activacion: str, rol_descripcion: str) -> str:
    """Template 1: alta cívica y credencial de participación verificable."""
    contenido = (
        _parrafo(f"Estimado(a) <strong>{_texto(nombre)}</strong>: le damos la bienvenida a Sistema Distrital POLIS.")
        + _tarjeta(
            [
                ("Cuenta participativa", correo),
                ("Credencial de participación", rol_descripcion),
            ]
        )
        + _parrafo(
            "Ingrese desde un dispositivo confiable, verifique su correo y conserve su "
            "credencial con fe pública de participación."
        )
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_activacion, "Activar mi credencial POLIS")}</p>'
        + _parrafo(
            "Si usted no creó la cuenta, ignore este mensaje y "
            "<strong>no comparta la clave ni acepte apoyo remoto</strong>. "
            "Puede reportar la actividad dentro de la plataforma."
        )
    )
    return _documento("Bienvenida y credencial cívica", "Registro ciudadano · Cuentas e identidad", contenido)


def generar_html_verificacion_correo(
    nombre: str, enlace_verificacion: str, minutos_expiracion: int, aviso_spam: bool = True
) -> str:
    """Template 2: verificación de correo con enlace de un solo uso para activar cuenta."""
    contenido = (
        _parrafo(f"Estimado(a) <strong>{_texto(nombre)}</strong>: confirme su correo institucional de contacto.")
        + _tarjeta(
            [
                ("Validez del enlace", f"Uso único · caduca en {_texto(minutos_expiracion)} minutos"),
                ("Objetivo", "Acreditar el canal oficial de participación y notificaciones"),
            ]
        )
        + f'<p style="text-align:center; margin:18px 0;">'
        f"{_boton(enlace_verificacion, 'Verificar mi correo electrónico')}</p>"
        + _parrafo("No reenvíe este enlace. Si no solicitó la verificación, no se requiere ninguna acción adicional.")
    )
    if aviso_spam:
        contenido += _parrafo(
            "Si no ve el correo, revise <strong>Spam o Correo no deseado</strong> y marque el "
            'mensaje como <strong>"No es spam"</strong> para recibir las próximas constancias oficiales.'
        )
    return _documento("Verificación de correo", "Cuenta POLIS · Validación institucional", contenido)


def generar_html_recuperacion_contrasena(nombre: str, enlace_restablecer: str, minutos_expiracion: int) -> str:
    """Template 3: flujo de seguridad para restablecer la contraseña con uso único."""
    contenido = (
        _parrafo(
            f"Estimado(a) <strong>{_texto(nombre)}</strong>: registramos una solicitud de recuperación de contraseña."
        )
        + _tarjeta(
            [
                ("Uso del enlace", "Un solo uso"),
                ("Expiración", f"{_texto(minutos_expiracion)} minutos"),
            ]
        )
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_restablecer, "Restablecer mi contraseña")}</p>'
        + _parrafo(
            "Si usted no realizó la solicitud, ignore este mensaje y no utilice el enlace. "
            "Ninguna dependencia de POLIS le pedirá passwords por teléfono o mensaje directo."
        )
    )
    return _documento("Recuperación de contraseña", "Acceso seguro · Polis Plataforma", contenido)


def generar_html_contrasena_cambiada(nombre: str, fecha_hora: str, enlace_reporte: str) -> str:
    """Template 4: aviso obligatorio tras el cambio exitoso de contraseña."""
    contenido = (
        _parrafo(f"Estimado(a) <strong>{_texto(nombre)}</strong>: la contraseña de su cuenta quedó actualizada.")
        + _tarjeta(
            [
                ("Fecha y hora oficial", fecha_hora),
                ("Estado", "Contraseña cambiada · sesiones anteriores revocadas"),
            ]
        )
        + _parrafo(
            "Si usted no ejecutó esta acción, presione el botón de reporte. "
            "No comparta contraseñas ni códigos de recuperación con terceros."
        )
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_reporte, "Reportar acción no reconocida")}</p>'
    )
    return _documento("Cambio de contraseña", "Cuenta POLIS · Acceso seguro", contenido)


def generar_html_perfil_actualizado(
    nombre: str, campos_modificados: Sequence[str], fecha_hora: str, enlace_panel: str
) -> str:
    """Template 5: trazabilidad de cambios en perfil y roles institucionales."""
    items = list(campos_modificados) or ["Sin campos de perfil modificados"]
    contenido = (
        _parrafo(f"Estimado(a) <strong>{_texto(nombre)}</strong>: se actualizó su perfil institucional.")
        + _seccion_orden("Campos actualizados", items)
        + _tarjeta([("Fecha y hora oficial", fecha_hora)])
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_panel, "Revisar mi perfil")}</p>'
        + _parrafo("Si los cambios no fueron autorizados, revise el panel y reporte la anomalía inmediatamente.")
    )
    return _documento("Perfil actualizado", "Polis Plataforma · Trazabilidad de cuenta", contenido)


def generar_html_constancia_radicacion(
    radicado: str,
    titulo: str,
    descripcion: str,
    autor: str,
    dimension: str,
    enlace_verificacion: str,
    fecha_emision: str | None = None,
    entidad: str = "Alcaldía Mayor de Cartagena de Indias",
    politica: str | None = None,
) -> str:
    """Template 6: constancia de fe pública con QR y sello oficial en hora de Bogotá."""
    politica_final = politica or "Política Pública de Seguridad y Convivencia Ciudadana"
    contenido = (
        _destacado(f"Radicado {radicado}")
        + _tarjeta(
            [
                ("Entidad", entidad),
                ("Política", politica_final),
                ("Dimensión", dimension),
                ("Propuesta", titulo),
                ("Autor", autor),
                ("Fecha y hora legal", _fecha_bogota(fecha_emision)),
            ]
        )
        + _parrafo(f"<strong>Resumen:</strong> {_texto(descripcion)}")
        + _codigo_qr(enlace_verificacion, radicado)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_verificacion, "Consultar estado oficial")}</p>'
    )
    return _documento("Constancia de radicación", "Participación ciudadana · Fe pública", contenido)


def generar_html_propuesta_actualizada(
    radicado: str,
    titulo: str,
    autor: str,
    campos_modificados: Sequence[str],
    enlace_seguimiento: str,
    fecha_actualizacion: str | None = None,
    entidad: str = "Alcaldía Mayor de Cartagena de Indias",
    politica: str = "Política Pública de Seguridad y Convivencia Ciudadana",
) -> str:
    """Template 7: constancia de la edición o complementación del aporte radicado."""
    contenido = (
        _parrafo("Su propuesta fue actualizada o complementada mientras sigue bajo su radicado oficial.")
        + _tarjeta(
            [
                ("Entidad", entidad),
                ("Política", politica),
                ("Radicado", radicado),
                ("Propuesta", titulo),
                ("Contacto", autor),
                ("Fecha oficial", _fecha_bogota(fecha_actualizacion)),
            ]
        )
        + _seccion_orden("Campos complementados", campos_modificados)
        + _codigo_qr(enlace_seguimiento, radicado)
        + f'<p style="text-align:center; margin:18px 0;">'
        f"{_boton(enlace_seguimiento, 'Ver seguimiento y versión actual')}</p>"
    )
    return _documento("Propuesta actualizada", "Trazabilidad del aporte ciudadano", contenido)


def generar_html_cambio_estado(
    radicado: str,
    titulo: str,
    autor: str,
    nuevo_estado: str,
    descripcion_estado: str,
    enlace_seguimiento: str,
    fecha_cambio: str | None = None,
) -> str:
    """Template 8: notificación de trámite ciudadano (deliberación, admitida, concepto o rechazo)."""
    contenido = (
        _destacado(f"Nuevo estado: {nuevo_estado}")
        + _tarjeta(
            [
                ("Radicado", radicado),
                ("Propuesta", titulo),
                ("Contacto", autor),
                ("Fecha oficial", _fecha_bogota(fecha_cambio)),
            ]
        )
        + _parrafo(f"<strong>Estado del trámite:</strong> {_texto(descripcion_estado)}")
        + _codigo_qr(enlace_seguimiento, radicado)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_seguimiento, "Abrir expediente ciudadano")}</p>'
    )
    return _documento("Actualización de trámite", "Polis Plataforma · Respuesta institucional", contenido)


def generar_html_priorizacion(
    radicado: str,
    titulo: str,
    autor: str,
    instrumento: str,
    criterio_priorizacion: str,
    enlace_seguimiento: str,
    fecha_incorporacion: str | None = None,
) -> str:
    """Template 9: constancia formal de incorporación del aporte al instrumento distrital."""
    contenido = (
        _destacado("Su propuesta fue priorizada e incorporada")
        + _tarjeta(
            [
                ("Radicado", radicado),
                ("Propuesta", titulo),
                ("Contacto", autor),
                ("Instrumento de política", instrumento),
                ("Criterio de priorización", criterio_priorizacion),
                ("Fecha oficial", _fecha_bogota(fecha_incorporacion)),
            ]
        )
        + _codigo_qr(enlace_seguimiento, radicado)
        + f'<p style="text-align:center; margin:18px 0;">'
        f"{_boton(enlace_seguimiento, 'Ver priorización institucional')}</p>"
    )
    return _documento("Priorización de propuesta", "Participación formal · Polis Plataforma", contenido)


def generar_html_apoyo_propuesta(
    radicado: str,
    titulo: str,
    apoyos_totales: int,
    enlace_seguimiento: str,
    fecha_apoyo: str | None = None,
) -> str:
    """Template 10: aviso al autor sobre respaldo ciudadano y su constancia."""
    contenido = (
        _parrafo("Su propuesta ciudadana registró un nuevo respaldo autenticado.")
        + _tarjeta(
            [
                ("Radicado", radicado),
                ("Propuesta", titulo),
                ("Apoyos registrados", apoyos_totales),
                ("Fecha oficial", _fecha_bogota(fecha_apoyo)),
            ]
        )
        + _codigo_qr(enlace_seguimiento, radicado)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_seguimiento, "Consultar trámite y apoyos")}</p>'
    )
    return _documento("Nuevo respaldo ciudadano", "Participación autenticada · Polis Plataforma", contenido)


def generar_html_actividad_ciudadana(
    nombre: str,
    radicado: str,
    titulo: str,
    accion: str,
    enlace_actividades: str,
    fecha_actividad: str | None = None,
) -> str:
    """Template 11: constancia de actividad del participante en una iniciativa comunitaria."""
    contenido = (
        _parrafo(f"Gracias por participar, <strong>{_texto(nombre)}</strong>. Su actividad quedó registrada.")
        + _tarjeta(
            [
                ("Actividad registrada", accion),
                ("Radicado", radicado),
                ("Iniciativa", titulo),
                ("Fecha oficial", _fecha_bogota(fecha_actividad)),
            ]
        )
        + _codigo_qr(enlace_actividades, radicado)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_actividades, "Panel de actividades POLIS")}</p>'
    )
    return _documento("Constancia de actividad", "Registro ciudadano de participación", contenido)


def generar_html_invitacion_mesa(
    nombre: str,
    codigo_mesa: str,
    nombre_mesa: str,
    fecha_hora: str,
    ubicacion: str,
    orden_del_dia: Sequence[str],
    enlace_agenda: str,
    facilitador: str,
) -> str:
    """Template 12: convocatoria con datos de mesa, hora local y agenda verificable."""
    contenido = (
        _parrafo(f"Estimado(a) <strong>{_texto(nombre)}</strong>: usted tiene convocatoria oficial a mesa de trabajo.")
        + _tarjeta(
            [
                ("Código de la mesa", codigo_mesa),
                ("Nombre de la mesa", nombre_mesa),
                ("Facilitación oficial", facilitador),
                ("Fecha y hora", fecha_hora),
                ("Lugar o enlace", ubicacion),
            ]
        )
        + _seccion_orden("Orden del día", orden_del_dia)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_agenda, "Abrir agenda de la mesa")}</p>'
        + _parrafo("Las conclusiones y actas se registran con radicado institucional para su revisión comunitaria.")
    )
    return _documento("Invitación a mesa territorial", "Gobernación comunitaria · Polis Plataforma", contenido)


def generar_html_acta_sesion(
    nombre: str,
    numero_acta: str,
    nombre_mesa: str,
    estado_acta: str,
    resumen_sesion: str,
    acuerdos: Sequence[str],
    enlace_revision: str,
    fecha_cierre: str | None = None,
) -> str:
    """Template 13: mensaje de acta disponible para observación y firma comunitaria."""
    contenido = (
        _parrafo("El acta de la mesa fue registrada y está disponible para revisión comunitaria.")
        + _tarjeta(
            [
                ("Número de acta", numero_acta),
                ("Mesa", nombre_mesa),
                ("Estado del acta", estado_acta),
                ("Fecha oficial", _fecha_bogota(fecha_cierre)),
            ]
        )
        + _parrafo(f"<strong>Resumen:</strong> {_texto(resumen_sesion)}")
        + _seccion_orden("Acuerdos registrados", acuerdos)
        + _codigo_qr(enlace_revision, numero_acta)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_revision, "Revisar acta y observaciones")}</p>'
    )
    return _documento("Acta de sesión", "Gobernanza comunitaria · Polis Plataforma", contenido)


def generar_html_compromiso_asignado(
    nombre_asignado: str,
    rol_asignado: str,
    codigo_compromiso: str,
    titulo_compromiso: str,
    descripcion: str,
    fecha_limite: str,
    responsable_seguimiento: str,
    enlace_compromiso: str,
    es_veedor: bool = False,
) -> str:
    """Template 14: asignación formal de compromiso, fecha límite y rol de seguimiento."""
    contenido = (
        _parrafo(
            f"Estimado(a) <strong>{_texto(nombre_asignado)}</strong>: se le asignó formalmente el "
            f"compromiso {_texto(codigo_compromiso)}."
        )
        + _tarjeta(
            [
                ("Código", codigo_compromiso),
                ("Compromiso", titulo_compromiso),
                ("Rol", rol_asignado),
                ("Fecha límite", fecha_limite),
                ("Responsable de seguimiento", responsable_seguimiento),
            ]
        )
        + _parrafo(f"<strong>Descripción:</strong> {_texto(descripcion)}")
        + _parrafo(
            "Reporte el avance con evidencia dentro de POLIS antes de la fecha límite. "
            f"Su perfil aparece como {'veedor' if es_veedor else 'funcionario'} en la trazabilidad."
        )
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_compromiso, "Abrir panel de compromiso")}</p>'
    )
    return _documento("Compromiso asignado", "Gobernanza institucional y veeduría · Polis Plataforma", contenido)


def generar_html_gestion_institucional(
    nombre_funcionario: str,
    rol: str,
    accion: str,
    id_auditoria: str,
    detalle_accion: str,
    enlace_panel: str,
    pendientes_asociados: Sequence[str] | None = None,
    fecha_accion: str | None = None,
) -> str:
    """Template 15: comprobante interno con identificador de auditoría y pendientes."""
    contenido = (
        _parrafo(
            f"Estimado(a) <strong>{_texto(nombre_funcionario)}</strong>: la plataforma registró la "
            f"acción bajo su responsabilidad."
        )
        + _tarjeta(
            [
                ("ID de auditoría", id_auditoria),
                ("Funcionario", nombre_funcionario),
                ("Rol institucional", rol),
                ("Acción ejecutada", accion),
                ("Detalle", detalle_accion),
                ("Fecha oficial", _fecha_bogota(fecha_accion)),
            ]
        )
        + _seccion_orden("Pendientes asociados", list(pendientes_asociados or ["No se registraron pendientes"]))
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_panel, "Abrir panel institucional")}</p>'
    )
    return _documento("Comprobante de gestión", "Bitácora institucional · Polis Plataforma", contenido)


def generar_html_alerta_pendientes(
    nombre_facilitador: str,
    accion: str,
    pendientes: Sequence[str],
    enlace_panel: str,
    fecha_aviso: str | None = None,
) -> str:
    """Template 16: alerta de pendientes institucionales dentro del término legal."""
    contenido = (
        _parrafo(
            f"Estimado(a) <strong>{_texto(nombre_facilitador)}</strong>: existen pendientes dentro de "
            f"su competencia institucional."
        )
        + _tarjeta(
            [
                ("Acción requerida", accion),
                ("Fecha y hora", _fecha_bogota(fecha_aviso)),
            ]
        )
        + _seccion_orden("Pendientes prioritarios", pendientes)
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_panel, "Atender pendientes POLIS")}</p>'
    )
    return _documento("Alerta de pendientes", "Gestión de mesas · Polis Plataforma", contenido)


def generar_html_resumen_diario(
    nombre_destinatario: str,
    fecha_corte: str,
    acciones_completadas: Sequence[str],
    pendientes: Sequence[str],
    enlace_panel: str,
) -> str:
    """Template 17: resumen diario matinal de gestión institucional y mesas."""
    contenido = (
        _parrafo(f"{_texto(nombre_destinatario)}, este es el consolidado diario de su gestión en POLIS.")
        + _tarjeta([("Corte del resumen", fecha_corte), ("Hora de referencia", "07:00 America/Bogota")])
        + _lista_compacta("Acciones completadas")
        + _tabla_actividades(acciones_completadas)
        + _lista_compacta("Pendientes para el día")
        + _lista_segura(pendientes or ["Sin pendientes registrados"])
        + f'<p style="text-align:center; margin:18px 0;">{_boton(enlace_panel, "Abrir diario institucional")}</p>'
    )
    return _documento("Resumen diario POLIS", "Operación institucional · Polis Plataforma 07:00", contenido)
