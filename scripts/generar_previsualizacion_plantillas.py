#!/usr/bin/env python3
"""Script para generar vistas previas HTML de las 17 plantillas de Polis Plataforma con datos realistas."""

import os
import sys
from pathlib import Path

# Añadir backend al sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.modules.notificaciones import plantillas_stack

OUTPUT_DIR = BASE_DIR / "docs" / "plantillas_preview"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PLANTILLAS_CONFIG = [
    {
        "id": "01_registro_bienvenida",
        "num": 1,
        "titulo": "Bienvenida y Activación de Cuenta Ciudadana",
        "tipo_evento": "registro_bienvenida",
        "asunto": "POLIS: Bienvenido(a) a la plataforma distrital - Verifique su cuenta",
        "audiencia": "Ciudadano registrado",
        "obligatoriedad": "OBLIGATORIO (Seguridad / Activación)",
        "render": lambda: plantillas_stack.generar_html_registro_bienvenida(
            nombre="María Eugenia Pérez Morales",
            correo="maria.perez@cartagena.gov.co",
            enlace_activacion="https://seguridadhumanaintegral.org/sesion?accion=verificar&token=tok_bienvenida_demo_2026",
            rol_descripcion="Ciudadano(a) Participante Activo",
        ),
    },
    {
        "id": "02_verificacion_correo",
        "num": 2,
        "titulo": "Verificación de Correo Electrónico Institucional",
        "tipo_evento": "verificacion_correo",
        "asunto": "POLIS: Verificación de correo electrónico institucional",
        "audiencia": "Usuario registrado o funcionario",
        "obligatoriedad": "OBLIGATORIO (Seguridad)",
        "render": lambda: plantillas_stack.generar_html_verificacion_correo(
            nombre="Ing. Carlos Julio Mendoza",
            enlace_verificacion="https://seguridadhumanaintegral.org/sesion?accion=verificar&token=tok_verif_correo_2026",
            minutos_expiracion=60,
        ),
    },
    {
        "id": "03_recuperacion_contrasena",
        "num": 3,
        "titulo": "Recuperación de Contraseña con Token de Uso Único",
        "tipo_evento": "recuperacion_contrasena",
        "asunto": "POLIS: Restablecimiento de contraseña de acceso",
        "audiencia": "Ciudadano o funcionario que solicita recuperar clave",
        "obligatoriedad": "OBLIGATORIO (Seguridad y Acceso)",
        "render": lambda: plantillas_stack.generar_html_recuperacion_contrasena(
            nombre="Dra. Laura Cristina Gómez",
            enlace_restablecer="https://seguridadhumanaintegral.org/sesion?accion=restablecer&token=tok_recuperar_demo_7788",
            minutos_expiracion=30,
        ),
    },
    {
        "id": "04_contrasena_cambiada",
        "num": 4,
        "titulo": "Confirmación de Modificación de Contraseña",
        "tipo_evento": "contrasena_cambiada",
        "asunto": "POLIS: Confirmación de cambio de contraseña exitoso",
        "audiencia": "Usuario autenticado tras cambio de clave",
        "obligatoriedad": "OBLIGATORIO (Seguridad / Detección de intrusión)",
        "render": lambda: plantillas_stack.generar_html_contrasena_cambiada(
            nombre="Dra. Laura Cristina Gómez",
            fecha_hora="31/10/2026 18:45 COT",
            enlace_reporte="https://seguridadhumanaintegral.org/contacto?alerta=clave_no_reconocida",
        ),
    },
    {
        "id": "05_perfil_actualizado",
        "num": 5,
        "titulo": "Constancia de Actualización de Datos de Perfil",
        "tipo_evento": "perfil_actualizado",
        "asunto": "POLIS: Constancia de actualización de perfil de usuario",
        "audiencia": "Usuario autenticado que modifica nombres o apellidos",
        "obligatoriedad": "OBLIGATORIO (Fe Pública / Auditoría)",
        "render": lambda: plantillas_stack.generar_html_perfil_actualizado(
            nombre="Dra. Laura Cristina Gómez Castillo",
            campos_modificados=["Apellidos (Gómez → Gómez Castillo)", "Número de teléfono celular", "Territorio de residencia (San Francisco)"],
            fecha_hora="31/10/2026 19:10 COT",
            enlace_panel="https://seguridadhumanaintegral.org/plataforma",
        ),
    },
    {
        "id": "06_constancia_radicacion",
        "num": 6,
        "titulo": "Constancia Oficial de Radicación con Código QR",
        "tipo_evento": "radicacion",
        "asunto": "POLIS: Constancia de radicación oficial POL-2026-0842",
        "audiencia": "Ciudadano autor de propuesta",
        "obligatoriedad": "OBLIGATORIO (Fe Pública / Sentencia C-150 de 2015)",
        "render": lambda: plantillas_stack.generar_html_constancia_radicacion(
            radicado="POL-2026-0842",
            titulo="Instalación de Sistema de Iluminación y Alarmas Comunitarias en el Barrio San Francisco",
            descripcion="Propuesta ciudadana prioritaria para dotar a la Calle 14 y Carrera 21 de iluminación LED solar autónoma y alarmas sonoras conectadas con el CAI móvil distrital.",
            autor="María Eugenia Pérez Morales",
            dimension="Seguridad Comunitaria y Prevención Social del Delito",
            enlace_verificacion="https://seguridadhumanaintegral.org/aportes/POL-2026-0842",
            fecha_emision="31/10/2026 14:32 COT",
        ),
    },
    {
        "id": "07_propuesta_actualizada",
        "num": 7,
        "titulo": "Constancia de Complementación o Edición de Propuesta",
        "tipo_evento": "propuesta_actualizada",
        "asunto": "POLIS: Actualización de propuesta ciudadana POL-2026-0842",
        "audiencia": "Ciudadano autor de la propuesta",
        "obligatoriedad": "OBLIGATORIO (Trazabilidad documental)",
        "render": lambda: plantillas_stack.generar_html_propuesta_actualizada(
            radicado="POL-2026-0842",
            titulo="Instalación de Sistema de Iluminación y Alarmas Comunitarias en el Barrio San Francisco",
            autor="María Eugenia Pérez Morales",
            campos_modificados=["Descripción ampliada con censo barrial", "Presupuesto preliminar estimado", "Coordenadas georreferenciadas actualizadas"],
            enlace_seguimiento="https://seguridadhumanaintegral.org/aportes/POL-2026-0842",
            fecha_actualizacion="31/10/2026 16:15 COT",
        ),
    },
    {
        "id": "08_cambio_estado",
        "num": 8,
        "titulo": "Notificación de Cambio de Estado en Trámite Institucional",
        "tipo_evento": "cambio_estado",
        "asunto": "POLIS: Actualización de trámite POL-2026-0842 - En Evaluación Técnica",
        "audiencia": "Ciudadano autor de propuesta",
        "obligatoriedad": "OBLIGATORIO (Debido Proceso / CPACA)",
        "render": lambda: plantillas_stack.generar_html_cambio_estado(
            radicado="POL-2026-0842",
            titulo="Instalación de Sistema de Iluminación y Alarmas Comunitarias en el Barrio San Francisco",
            autor="María Eugenia Pérez Morales",
            nuevo_estado="En Evaluación Técnica Distrital",
            descripcion_estado="La Secretaría General y la Secretaría del Interior han admitido la propuesta a la fase de viabilidad técnica y costeo financiero MGA.",
            enlace_seguimiento="https://seguridadhumanaintegral.org/aportes/POL-2026-0842",
            fecha_cambio="31/10/2026 17:00 COT",
        ),
    },
    {
        "id": "09_priorizacion",
        "num": 9,
        "titulo": "Aviso de Propuesta Priorizada e Incorporada al Plan",
        "tipo_evento": "priorizacion",
        "asunto": "POLIS: Propuesta POL-2026-0842 priorizada e incorporada a la política pública",
        "audiencia": "Ciudadano autor de propuesta",
        "obligatoriedad": "OBLIGATORIO (Eficacia participativa)",
        "render": lambda: plantillas_stack.generar_html_priorizacion(
            radicado="POL-2026-0842",
            titulo="Instalación de Sistema de Iluminación y Alarmas Comunitarias en el Barrio San Francisco",
            autor="María Eugenia Pérez Morales",
            instrumento="Plan de Acción Territorial de Seguridad Humana 2026–2036",
            criterio_priorizacion="Voto mayoritario comunitario en Mesa de Trabajo N° 12 y concepto de viabilidad presupuestal positivo (FONSET).",
            enlace_seguimiento="https://seguridadhumanaintegral.org/aportes/POL-2026-0842",
            fecha_incorporacion="31/10/2026 17:30 COT",
        ),
    },
    {
        "id": "10_apoyo_propuesta",
        "num": 10,
        "titulo": "Aviso de Nuevo Respaldo Popular Comunitario",
        "tipo_evento": "apoyo_propuesta",
        "asunto": "POLIS: Su propuesta POL-2026-0842 recibió un nuevo respaldo ciudadano",
        "audiencia": "Ciudadano autor de la propuesta",
        "obligatoriedad": "INFORMATIVO (Participación cívica)",
        "render": lambda: plantillas_stack.generar_html_apoyo_propuesta(
            radicado="POL-2026-0842",
            titulo="Instalación de Sistema de Iluminación y Alarmas Comunitarias en el Barrio San Francisco",
            apoyos_totales=148,
            enlace_seguimiento="https://seguridadhumanaintegral.org/aportes/POL-2026-0842",
            fecha_apoyo="31/10/2026 17:45 COT",
        ),
    },
    {
        "id": "11_actividad_ciudadana",
        "num": 11,
        "titulo": "Constancia de Respaldo Cívico y Participación Ciudadana",
        "tipo_evento": "actividad_ciudadana",
        "asunto": "POLIS: Constancia de su respaldo a la propuesta POL-2026-0842",
        "audiencia": "Ciudadano que emite un voto o apoyo comunitario",
        "obligatoriedad": "INFORMATIVO (Constancia para el votante)",
        "render": lambda: plantillas_stack.generar_html_actividad_ciudadana(
            nombre="Lic. Roberto Antonio Morales",
            radicado="POL-2026-0842",
            titulo="Instalación de Sistema de Iluminación y Alarmas Comunitarias en el Barrio San Francisco",
            accion="Respaldo popular ciudadano verificado en la plataforma distrital",
            enlace_actividades="https://seguridadhumanaintegral.org/plataforma",
            fecha_actividad="31/10/2026 17:45 COT",
        ),
    },
    {
        "id": "12_invitacion_mesa",
        "num": 12,
        "titulo": "Convocatoria Oficial a Mesa Territorial de Diálogo",
        "tipo_evento": "invitacion_mesa",
        "asunto": "POLIS: Convocatoria oficial a la Mesa Territorial MT-012 (Localidad de la Virgen y Turística)",
        "audiencia": "Líderes comunales, ediles y delegados inscritos",
        "obligatoriedad": "INFORMATIVO (Convocatoria pública)",
        "render": lambda: plantillas_stack.generar_html_invitacion_mesa(
            nombre="María Eugenia Pérez Morales",
            codigo_mesa="MT-012",
            nombre_mesa="Mesa Territorial de Seguridad Humana — Localidad de la Virgen y Turística",
            fecha_hora="Viernes, 06 de Noviembre de 2026 · 09:00 AM",
            ubicacion="Institución Educativa Técnica San Francisco de Asís (Auditorio Principal)",
            orden_del_dia=[
                "1. Apertura e instalación por delegados de la Secretaría del Interior.",
                "2. Diagnóstico situacional de seguridad en los barrios San Francisco, Boston y La María.",
                "3. Deliberación y priorización comunitaria de propuestas ciudadanas.",
                "4. Firma de acuerdos y asignación de compromisos interinstitucionales.",
            ],
            enlace_agenda="https://seguridadhumanaintegral.org/asistencia/mt-012",
            facilitador="Sociól. Andrea del Pilar Restrepo (Facilitadora Oficial Distrital)",
        ),
    },
    {
        "id": "13_acta_sesion",
        "num": 13,
        "titulo": "Acta de Sesión Territorial Disponible para Revisión",
        "tipo_evento": "acta_sesion",
        "asunto": "POLIS: Acta de sesión MT-012-2026 disponible para revisión y firma comunitaria",
        "audiencia": "Asistentes y facilitadores de la mesa",
        "obligatoriedad": "INFORMATIVO (Transparencia / Veeduría)",
        "render": lambda: plantillas_stack.generar_html_acta_sesion(
            nombre="María Eugenia Pérez Morales",
            numero_acta="ACTA-MT-012-2026",
            nombre_mesa="Mesa Territorial de Seguridad Humana — Localidad 2",
            estado_acta="Aprobada en Plenaria y Firmada por Delegados",
            resumen_sesion="Sesión comunitaria con participación de 64 líderes comunales. Se concertaron intervenciones de iluminación, frentes barriales y dotación para el centro comunal.",
            acuerdos=[
                "Acuerdo 1: Inicio de obras del corredor de iluminación solar antes del 15 de diciembre.",
                "Acuerdo 2: Reactivación de alarmas comunitarias y enlace permanente con el cuadrante 14.",
                "Acuerdo 3: Creación del comité veedor ciudadano con 5 delegados electos.",
            ],
            enlace_revision="https://seguridadhumanaintegral.org/plataforma/mesas",
            fecha_cierre="31/10/2026 18:00 COT",
        ),
    },
    {
        "id": "14_compromiso_asignado",
        "num": 14,
        "titulo": "Asignación de Compromiso Institucional con Trazabilidad",
        "tipo_evento": "compromiso_asignado",
        "asunto": "POLIS: Asignación de compromiso institucional COM-2026-089 (Alumbrado Público)",
        "audiencia": "Funcionario responsable o veedor ciudadano",
        "obligatoriedad": "OBLIGATORIO (Control de Gestión Pública)",
        "render": lambda: plantillas_stack.generar_html_compromiso_asignado(
            nombre_asignado="Ing. Mauricio Vallejo",
            rol_asignado="Secretaría de Infraestructura / Alumbrado Público",
            codigo_compromiso="COM-2026-089",
            titulo_compromiso="Estudio de factibilidad técnica para instalación de 45 luminarias solares en San Francisco",
            descripcion="Realizar visita técnica de inspección en campo, determinar georreferenciación de postes y emitir concepto previo de contratación con cargo a recursos FONSET.",
            fecha_limite="15/11/2026",
            responsable_seguimiento="Dirección de Convivencia y Seguridad Ciudadana",
            enlace_compromiso="https://seguridadhumanaintegral.org/plataforma/seguimiento",
            es_veedor=False,
        ),
    },
    {
        "id": "15_gestion_institucional",
        "num": 15,
        "titulo": "Registro de Gestión Institucional y Auditoría",
        "tipo_evento": "gestion_institucional",
        "asunto": "POLIS: Comprobante de gestión institucional AUD-2026-1049",
        "audiencia": "Funcionario, auditor o gestor de plataforma",
        "obligatoriedad": "INFORMATIVO (Trazabilidad interna)",
        "render": lambda: plantillas_stack.generar_html_gestion_institucional(
            nombre_funcionario="Dr. Fernando Salazar Ruiz",
            rol="Administrador de Identidades y Auditor Forense",
            accion="Aprobación y certificación de viabilidad jurídica de alternativa",
            id_auditoria="AUD-2026-1049",
            detalle_accion="Certificación de compatibilidad con el Plan de Desarrollo Distrital 'Cartagena Ciudad de Derechos' y Ley 1757 de 2015.",
            enlace_panel="https://seguridadhumanaintegral.org/plataforma/alternativas",
            pendientes_asociados=["Remitir concepto a la Secretaría de Hacienda", "Actualizar semáforo en Geovisor territorial"],
            fecha_accion="31/10/2026 19:20 COT",
        ),
    },
    {
        "id": "16_alerta_pendientes",
        "num": 16,
        "titulo": "Alerta de Compromisos y Tareas Próximas a Vencer",
        "tipo_evento": "alerta_pendientes",
        "asunto": "POLIS: Alerta de compromisos institucionales pendientes de cumplimiento",
        "audiencia": "Facilitadores de mesa, secretarios y directores de despacho",
        "obligatoriedad": "OBLIGATORIO (SLA y Mitigación de Vencimientos)",
        "render": lambda: plantillas_stack.generar_html_alerta_pendientes(
            nombre_facilitador="Andrea del Pilar Restrepo",
            accion="Revisión de actas y compromisos con vencimiento menor a 5 días",
            pendientes=[
                "Acta MT-011: Cargar firmas digitalizadas de los 3 veedores comunales.",
                "Compromiso COM-2026-074: Registrar avance de poda de árboles en sector La Esperanza (Vence en 48 horas).",
                "Ficha Territorial FT-004: Verificar datos consolidados de hurtos con SIEDCO.",
            ],
            enlace_panel="https://seguridadhumanaintegral.org/plataforma",
            fecha_aviso="31/10/2026 19:30 COT",
        ),
    },
    {
        "id": "17_resumen_diario",
        "num": 17,
        "titulo": "Resumen Diario de Despacho y Fe Pública Institucional",
        "tipo_evento": "resumen_diario",
        "asunto": "POLIS: Resumen diario institucional de radicaciones y fe pública (Corte 31/10/2026)",
        "audiencia": "Equipo de Coordinación General, Alcalde Mayor y Secretarios",
        "obligatoriedad": "INFORMATIVO (Observabilidad consolidada)",
        "render": lambda: plantillas_stack.generar_html_resumen_diario(
            nombre_destinatario="Gabinete Distrital de Seguridad Humana",
            fecha_corte="31/10/2026 (00:00 - 23:59 COT)",
            acciones_completadas=[
                "142 constancias de radicación oficial emitidas con código QR y fe pública.",
                "3 actas de mesas territoriales suscritas y publicadas para veeduría comunitaria.",
                "89 respaldos populares verificados en propuestas de iluminación y senderos peatonales.",
                "Tasa de éxito del ejecutor Polis Plataforma: 99.8% (0 encolamientos críticos).",
            ],
            pendientes=[
                "4 propuestas en espera de concepto técnico en la Secretaría de Planeación.",
                "1 mesa territorial programada para mañana en la Localidad Histórica y del Caribe Norte.",
            ],
            enlace_panel="https://seguridadhumanaintegral.org/plataforma/configuracion",
        ),
    },
]

def main():
    print(f"Generando vistas previas HTML de las {len(PLANTILLAS_CONFIG)} plantillas...")

    lista_index = []

    for item in PLANTILLAS_CONFIG:
        nombre_archivo = f"{item['id']}.html"
        ruta_archivo = OUTPUT_DIR / nombre_archivo
        
        # Renderizar HTML de la plantilla
        html_contenido = item["render"]()
        
        # Guardar archivo individual
        with open(ruta_archivo, "w", encoding="utf-8") as f:
            f.write(html_contenido)
            
        print(f"  ✓ [{item['num']:02d}/17] {item['titulo']} -> {nombre_archivo}")
        
        lista_index.append({
            **item,
            "archivo": nombre_archivo,
        })

    # Crear galería interactiva index.html
    generar_galeria_index(lista_index)
    print(f"\n¡Éxito! Galería completa generada en: {OUTPUT_DIR / 'index.html'}")

def generar_galeria_index(items):
    ruta_index = OUTPUT_DIR / "index.html"
    
    botones_nav = "\n".join([
        f"""
        <button class="nav-item" onclick="cargarPlantilla('{item['archivo']}', '{item['num']}', '{item['titulo']}', '{item['asunto']}', '{item['audiencia']}', '{item['obligatoriedad']}', '{item['tipo_evento']}')">
            <span class="badge-num">{item['num']:02d}</span>
            <div class="nav-text">
                <span class="nav-title">{item['titulo']}</span>
                <span class="nav-type">{item['tipo_evento']}</span>
            </div>
        </button>
        """
        for item in items
    ])

    html_galeria = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polis Plataforma — Galería Oficial de Plantillas de Correo Transaccional</title>
    <style>
        :root {{
            --bg-app: #0f172a;
            --surface-panel: #1e293b;
            --surface-hover: #334155;
            --border-color: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent: #0284c7;
            --accent-light: #38bdf8;
            --success: #10b981;
            --warning: #f59e0b;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-app);
            color: var(--text-primary);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }}
        header {{
            background-color: #0284c7;
            background: linear-gradient(135deg, #0369a1 0%, #002855 100%);
            padding: 14px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .brand {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .brand img {{
            height: 38px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }}
        .brand-text h1 {{
            font-size: 17px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.01em;
        }}
        .brand-text p {{
            font-size: 12px;
            color: #bae6fd;
        }}
        .header-meta {{
            font-size: 12px;
            color: #e0f2fe;
            background: rgba(255,255,255,0.1);
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.15);
        }}
        .container {{
            display: flex;
            flex: 1;
            overflow: hidden;
        }}
        aside {{
            width: 380px;
            background-color: var(--surface-panel);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }}
        .sidebar-header {{
            padding: 14px 18px;
            border-bottom: 1px solid var(--border-color);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
        }}
        .nav-item {{
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 18px;
            background: transparent;
            border: none;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: var(--text-primary);
            text-align: left;
            cursor: pointer;
            width: 100%;
            transition: all 0.15s ease;
        }}
        .nav-item:hover {{
            background-color: var(--surface-hover);
        }}
        .nav-item.active {{
            background-color: rgba(2, 132, 199, 0.25);
            border-left: 4px solid var(--accent-light);
        }}
        .badge-num {{
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            font-family: monospace;
            font-size: 11px;
            font-weight: 700;
            color: var(--accent-light);
            padding: 3px 6px;
            border-radius: 4px;
        }}
        .nav-text {{
            flex: 1;
            min-width: 0;
        }}
        .nav-title {{
            display: block;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #ffffff;
        }}
        .nav-type {{
            display: block;
            font-size: 11px;
            color: var(--text-secondary);
            font-family: monospace;
        }}
        main {{
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: #0b0f19;
            overflow: hidden;
        }}
        .preview-toolbar {{
            background-color: #131b2e;
            border-bottom: 1px solid var(--border-color);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }}
        .info-card h2 {{
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 4px;
        }}
        .info-card p {{
            font-size: 12px;
            color: var(--text-secondary);
        }}
        .info-card strong {{
            color: #38bdf8;
        }}
        .actions {{
            display: flex;
            gap: 10px;
            align-items: center;
        }}
        .btn {{
            font-size: 12px;
            font-weight: 600;
            padding: 8px 14px;
            border-radius: 6px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            border: 1px solid var(--border-color);
            background: var(--surface-panel);
            color: #ffffff;
            transition: all 0.15s;
        }}
        .btn:hover {{
            background: var(--surface-hover);
        }}
        .btn-primary {{
            background: #0284c7;
            border-color: #0369a1;
        }}
        .btn-primary:hover {{
            background: #0369a1;
        }}
        .iframe-container {{
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow: auto;
            background: #0b0f19;
        }}
        iframe {{
            width: 100%;
            max-width: 680px;
            height: 100%;
            border: 1px solid #334155;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }}
    </style>
</head>
<body>
    <header>
        <div class="brand">
            <img src="/logo-polis.svg" alt="POLIS">
            <div class="brand-text">
                <h1>Polis Plataforma — Galería Oficial de Plantillas Transaccionales</h1>
                <p>Suite completa de 17 plantillas institucionales HTML con fe pública, QR verificable y tipografía caribeña</p>
            </div>
        </div>
        <div class="header-meta">
            Ples SAS • Alcaldía Mayor de Cartagena • Ley 1757 de 2015
        </div>
    </header>

    <div class="container">
        <aside>
            <div class="sidebar-header">
                17 Plantillas Registradas (Polis Plataforma)
            </div>
            <div id="nav-list">
                {botones_nav}
            </div>
        </aside>

        <main>
            <div class="preview-toolbar">
                <div class="info-card">
                    <h2 id="view-title">Seleccione una plantilla</h2>
                    <p id="view-subject">Asunto: <strong>-</strong></p>
                    <p id="view-meta">Audiencia: - | Obligatoriedad: -</p>
                </div>
                <div class="actions">
                    <a id="btn-raw" href="#" target="_blank" class="btn btn-primary">Abrir en pestaña nueva ↗</a>
                </div>
            </div>
            <div class="iframe-container">
                <iframe id="preview-frame" src="{items[0]['archivo']}"></iframe>
            </div>
        </main>
    </div>

    <script>
        const items = {items!r};
        
        function cargarPlantilla(archivo, num, titulo, asunto, audiencia, obligatoriedad, evento) {{
            document.getElementById('preview-frame').src = archivo;
            document.getElementById('view-title').textContent = `[${{num}}/17] ${{titulo}} (${{evento}})`;
            document.getElementById('view-subject').innerHTML = `Asunto de correo: <strong>${{asunto}}</strong>`;
            document.getElementById('view-meta').textContent = `Destinatario: ${{audiencia}} • Obligatoriedad: ${{obligatoriedad}}`;
            document.getElementById('btn-raw').href = archivo;

            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
            event?.currentTarget?.classList.add('active');
        }}

        // Inicializar con la primera plantilla
        if (items.length > 0) {{
            const primero = items[0];
            cargarPlantilla(primero.archivo, primero.num, primero.titulo, primero.asunto, primero.audiencia, primero.obligatoriedad, primero.tipo_evento);
            const primerBoton = document.querySelector('.nav-item');
            if (primerBoton) primerBoton.classList.add('active');
        }}
    </script>
</body>
</html>
"""
    with open(ruta_index, "w", encoding="utf-8") as f:
        f.write(html_galeria)

if __name__ == "__main__":
    main()
