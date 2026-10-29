"""Pruebas periciales para CIERRE-02: Runbook, scripts operativos y herramientas de identidad."""

import uuid
from pathlib import Path

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.modules.identidad.models import EventoIdentidad
from scripts.auditar_cuentas_institucionales import auditar_cuentas
from scripts.bootstrap_identidad_admin import ejecutar_bootstrap
from scripts.verificar_configuracion_smtp import (
    auditar_cola_durable,
    validar_configuracion_memoria,
)

pytestmark = pytest.mark.anyio


def test_runbook_despliegue_identidad_documentacion_completa():
    """Valida la existencia y rigurosidad normativa del runbook docs/despliegue-identidad.md."""
    runbook_path = Path(__file__).resolve().parents[2] / "docs" / "despliegue-identidad.md"
    assert runbook_path.exists(), "El runbook docs/despliegue-identidad.md debe existir"

    contenido = runbook_path.read_text(encoding="utf-8")

    # 1. Marco normativo
    assert "Ley Estatutaria 1757 de 2015" in contenido
    assert "Decreto Nacional 037 de 2026" in contenido
    assert "Habeas Data" in contenido or "1581 de 2012" in contenido

    # 2. Secciones mandatorias
    assert "Prerrequisitos y Comprobaciones Previas" in contenido
    assert "Procedimiento de Ejecución Paso a Paso" in contenido
    assert "Respaldo Pericial Pre-Despliegue" in contenido
    assert "Auditoría de Cuentas Preexistentes" in contenido
    assert "Aplicación de Migraciones de Esquema" in contenido
    assert "Bootstrap Administrativo Idempotente" in contenido
    assert "Worker de Correo Durable" in contenido
    assert "Verificaciones Post-Despliegue" in contenido
    assert "Procedimiento de Contingencia y Rollback" in contenido

    # 3. Restricciones periciales
    assert "bd_csh" in contenido
    assert "sha256" in contenido.lower()


def test_verificar_configuracion_smtp_memoria_y_reglas():
    """Evalúa la lógica de comprobación de variables de configuración de correo y worker."""
    # Caso 1: Configuración válida para producción
    settings_prod_valida = Settings(
        environment="production",
        jwt_secret_key="clave_super_secreta_para_produccion_2026_valida!",
        ip_salt="salt_seguro_produccion_habeas_data_32_bytes!",
        identidad_url_publica="https://seguridadhumanaintegral.org",
        smtp_host="smtp.servidor.gov.co",
        smtp_port=587,
        smtp_tls=True,
        smtp_remitente="POLIS <notificaciones@seguridadhumanaintegral.org>",
        identidad_token_minutos=30,
    )
    res_valida = validar_configuracion_memoria(settings_prod_valida)
    assert res_valida["es_valido"] is True
    estados = {c["variable"]: c["estado"] for c in res_valida["chequeos"]}
    assert estados["POLIS_ENVIRONMENT"] == "OK"
    assert estados["POLIS_JWT_SECRET_KEY"] == "OK"
    assert estados["POLIS_IDENTIDAD_URL_PUBLICA"] == "OK"
    assert estados["POLIS_SMTP_TLS"] == "OK"

    # Caso 2: Rechazo en producción si URL no es HTTPS
    settings_invalida_http = Settings(
        environment="production",
        jwt_secret_key="clave_super_secreta_para_produccion_2026_valida!",
        identidad_url_publica="http://inseguro.org",
        smtp_host="smtp.servidor.gov.co",
        smtp_tls=True,
        smtp_remitente="POLIS <no-reply@example.org>",
    )
    res_http = validar_configuracion_memoria(settings_invalida_http)
    assert res_http["es_valido"] is False
    chk_url = next(c for c in res_http["chequeos"] if c["variable"] == "POLIS_IDENTIDAD_URL_PUBLICA")
    assert chk_url["estado"] == "FALLO"

    # Caso 3: Rechazo en producción si SMTP no usa TLS
    settings_invalida_tls = Settings(
        environment="production",
        jwt_secret_key="clave_super_secreta_para_produccion_2026_valida!",
        identidad_url_publica="https://seguridadhumanaintegral.org",
        smtp_host="smtp.servidor.gov.co",
        smtp_tls=False,
        smtp_remitente="POLIS <no-reply@example.org>",
    )
    res_tls = validar_configuracion_memoria(settings_invalida_tls)
    assert res_tls["es_valido"] is False
    chk_tls = next(c for c in res_tls["chequeos"] if c["variable"] == "POLIS_SMTP_TLS")
    assert chk_tls["estado"] == "FALLO"

    # Caso 4: Pydantic exige al menos 32 caracteres en jwt_secret_key
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(
            environment="development",
            jwt_secret_key="corta",
            identidad_url_publica="http://localhost:3000",
            smtp_remitente="POLIS <no-reply@example.org>",
        )

    # Caso 5: Rechazo si clave secreta contiene 'test' en entorno de producción
    settings_clave_test = Settings(
        environment="production",
        jwt_secret_key="clave_de_test_insegura_para_produccion_32bytes!",
        identidad_url_publica="https://seguridadhumanaintegral.org",
        smtp_remitente="POLIS <no-reply@example.org>",
    )
    res_clave_test = validar_configuracion_memoria(settings_clave_test)
    assert res_clave_test["es_valido"] is False
    chk_key = next(c for c in res_clave_test["chequeos"] if c["variable"] == "POLIS_JWT_SECRET_KEY")
    assert chk_key["estado"] == "FALLO"


async def test_verificar_cola_durable_en_base_aislada(database_url: str):
    """Verifica que la herramienta consulte el estado de la cola durable sin escribir en BD."""
    resultado = await auditar_cola_durable(database_url)
    assert resultado["disponible"] is True
    assert "mensajes_pendientes" in resultado
    assert "mensajes_enviados" in resultado
    assert "tokens_consumidos" in resultado
    assert "mensajes_caducados_o_agotados" in resultado


async def test_auditoria_cuentas_institucionales_solo_lectura(database_url: str):
    """Verifica la ejecución de solo lectura y clasificación de cuentas de auditar_cuentas_institucionales."""
    resultado = await auditar_cuentas(database_url)
    assert resultado["exito"] is True
    resumen = resultado["resumen"]
    assert "total_cuentas" in resumen
    assert "total_institucionales" in resumen
    assert "total_ciudadanas" in resumen
    assert "administradores_activos" in resumen
    assert "colisiones_correo" in resumen
    assert isinstance(resultado["cuentas_institucionales"], list)
    assert isinstance(resultado["colisiones"], list)


async def test_bootstrap_identidad_admin_creacion_e_idempotencia(database_url: str):
    """Verifica la creación idempotente del primer administrador y la protección ante duplicados."""
    settings = Settings(database_url=database_url)
    engine = create_async_engine(database_url, hide_parameters=True)

    correo_test = f"admin-cierre02-{uuid.uuid4().hex[:8]}@seguridadhumanaintegral.org"
    clave_test = "ClaveAdminCierre02_2026*"
    motivo_test = "Prueba de certificacion pericial CIERRE-02 para bootstrap"

    admin_creado_id = None

    try:
        # 1. Comprobación check-only antes de bootstrap
        chk_inicial = await ejecutar_bootstrap(
            correo=correo_test,
            nombres="Admin",
            apellidos="Test",
            contrasena=clave_test,
            motivo=motivo_test,
            settings=settings,
            check_only=True,
        )
        assert chk_inicial["exito"] is True
        assert chk_inicial["accion"] == "check_only"

        # 2. Ejecutar creación del administrador
        res_creacion = await ejecutar_bootstrap(
            correo=correo_test,
            nombres="Admin Distrital",
            apellidos="Cierre02",
            contrasena=clave_test,
            motivo=motivo_test,
            settings=settings,
            check_only=False,
        )
        assert res_creacion["exito"] is True
        assert res_creacion["accion"] == "creado"
        admin_creado_id = uuid.UUID(res_creacion["usuario_id"])

        # 3. Idempotencia: Ejecutar de nuevo con el MISMO correo
        res_repetido = await ejecutar_bootstrap(
            correo=correo_test,
            nombres="Admin Distrital",
            apellidos="Cierre02",
            contrasena=clave_test,
            motivo=motivo_test,
            settings=settings,
            check_only=False,
        )
        assert res_repetido["exito"] is True
        assert res_repetido["accion"] == "idempotente_sin_cambios"
        assert res_repetido["usuario_id"] == str(admin_creado_id)

        # 4. Idempotencia: Intentar crear OTRO administrador cuando ya existe uno activo (sin --adicional)
        otro_correo = f"segundo-admin-{uuid.uuid4().hex[:8]}@seguridadhumanaintegral.org"
        res_segundo = await ejecutar_bootstrap(
            correo=otro_correo,
            nombres="Segundo",
            apellidos="Admin",
            contrasena=clave_test,
            motivo=motivo_test,
            settings=settings,
            check_only=False,
            adicional=False,
        )
        assert res_segundo["exito"] is True
        assert res_segundo["accion"] == "idempotente_admin_existente"
        assert res_segundo["usuario_id"] == str(admin_creado_id)

        # 5. Modo adicional: Crear administrador adicional con --adicional=True
        res_adicional = await ejecutar_bootstrap(
            correo=otro_correo,
            nombres="Segundo",
            apellidos="Admin",
            contrasena=clave_test,
            motivo="Creación de administrador adicional autorizada para prueba",
            settings=settings,
            check_only=False,
            adicional=True,
        )
        assert res_adicional["exito"] is True
        assert res_adicional["accion"] == "creado"
        admin2_creado_id = uuid.UUID(res_adicional["usuario_id"])

        # 6. Idempotencia del administrador adicional: Re-ejecutar con el mismo correo adicional
        res_adicional_rep = await ejecutar_bootstrap(
            correo=otro_correo,
            nombres="Segundo",
            apellidos="Admin",
            contrasena=clave_test,
            motivo="Creación de administrador adicional autorizada para prueba",
            settings=settings,
            check_only=False,
            adicional=True,
        )
        assert res_adicional_rep["exito"] is True
        assert res_adicional_rep["accion"] == "idempotente_sin_cambios"
        assert res_adicional_rep["usuario_id"] == str(admin2_creado_id)

        # 7. Verificar eventos de auditoría para ambos administradores
        async with engine.connect() as conn:
            stmt1 = select(EventoIdentidad.detalle).where(
                EventoIdentidad.objetivo_id == admin_creado_id,
                EventoIdentidad.accion == "bootstrap_administrador",
            )
            res_ev1 = await conn.execute(stmt1)
            detalle1 = res_ev1.scalar_one_or_none()
            assert detalle1 is not None, "El evento 'bootstrap_administrador' debe persistirse"
            assert detalle1.get("correo") == correo_test.lower()

            stmt2 = select(EventoIdentidad.detalle).where(
                EventoIdentidad.objetivo_id == admin2_creado_id,
                EventoIdentidad.accion == "bootstrap_administrador_adicional",
            )
            res_ev2 = await conn.execute(stmt2)
            detalle2 = res_ev2.scalar_one_or_none()
            assert detalle2 is not None, "El evento 'bootstrap_administrador_adicional' debe persistirse"
            assert detalle2.get("correo") == otro_correo.lower()
            assert detalle2.get("modo") == "adicional"

    finally:
        # Limpieza pericial: los usuarios de prueba se remueven (eventos_identidad es inmutable/append-only)
        uids_a_borrar = [u for u in [admin_creado_id, locals().get("admin2_creado_id")] if u]
        if uids_a_borrar:
            async with engine.begin() as conn:
                for uid in uids_a_borrar:
                    await conn.execute(
                        text("DELETE FROM autenticacion.usuarios WHERE id = :uid"),
                        {"uid": uid},
                    )
        await engine.dispose()


def test_cli_ejecucion_herramientas(database_url: str):
    """Verifica que las 3 herramientas se ejecuten correctamente desde CLI con códigos de salida adecuados."""
    import json
    import subprocess
    import sys

    backend_dir = str(Path(__file__).resolve().parents[1])

    # 1. verificar_configuracion_smtp --solo-config --json
    cmd_smtp = [
        sys.executable,
        "-m",
        "scripts.verificar_configuracion_smtp",
        "--solo-config",
        "--json",
    ]
    proc_smtp = subprocess.run(cmd_smtp, cwd=backend_dir, capture_output=True, text=True)
    assert proc_smtp.returncode == 0
    data_smtp = json.loads(proc_smtp.stdout)
    assert "chequeos" in data_smtp
    assert data_smtp["es_valido"] is True

    # 2. auditar_cuentas_institucionales --database-url ... --json
    cmd_audit = [
        sys.executable,
        "-m",
        "scripts.auditar_cuentas_institucionales",
        "--database-url",
        database_url,
        "--json",
    ]
    proc_audit = subprocess.run(cmd_audit, cwd=backend_dir, capture_output=True, text=True)
    assert proc_audit.returncode == 0
    data_audit = json.loads(proc_audit.stdout)
    assert data_audit["exito"] is True
    assert "resumen" in data_audit

    # 3. bootstrap_identidad_admin --database-url ... --check-only --json
    cmd_boot = [
        sys.executable,
        "-m",
        "scripts.bootstrap_identidad_admin",
        "--database-url",
        database_url,
        "--check-only",
        "--json",
    ]
    proc_boot = subprocess.run(cmd_boot, cwd=backend_dir, capture_output=True, text=True)
    assert proc_boot.returncode == 0
    data_boot = json.loads(proc_boot.stdout)
    assert data_boot["exito"] is True
    assert data_boot["accion"] == "check_only"

    # 4. bootstrap_identidad_admin con --contrasena por CLI emite advertencia pericial en stderr
    # AUD-2026-10-21 T2: el original construía una variante --check-only (cmd_warn)
    # que nunca se ejecutaba; el comportamiento aquí probado es la advertencia con
    # ejecución activa, que es lo que valida el assert posterior.
    cmd_warn_activa = [
        sys.executable,
        "-m",
        "scripts.bootstrap_identidad_admin",
        "--database-url",
        database_url,
        "--correo",
        f"cli-audit-warn-{uuid.uuid4().hex[:6]}@example.org",
        "--contrasena",
        "ClavePorCLIAdvertencia2026*",
    ]
    try:
        proc_warn = subprocess.run(cmd_warn_activa, cwd=backend_dir, capture_output=True, text=True)
        assert "[ADVERTENCIA DE SEGURIDAD OPERATIVA]" in proc_warn.stderr
    finally:
        import asyncio

        from sqlalchemy.ext.asyncio import create_async_engine

        async def _cleanup():
            eng = create_async_engine(database_url, hide_parameters=True)
            try:
                async with eng.begin() as conn:
                    await conn.execute(text("DELETE FROM autenticacion.usuarios WHERE correo LIKE 'cli-audit-warn-%'"))
            finally:
                await eng.dispose()

        asyncio.run(_cleanup())
