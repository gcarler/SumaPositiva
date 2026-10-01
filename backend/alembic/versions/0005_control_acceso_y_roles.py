"""Roles y Niveles de Identidad Ciudadana (PBAC).

Revision ID: 0005_control_acceso_y_roles
Revises: 0004_sesion_anonima
Create Date: 2026-10-01 06:51:00.000000
"""

import json

from alembic import op

revision = "0005_control_acceso_y_roles"
down_revision = "0004_sesion_anonima"
branch_labels = None
depends_on = None

permisos_ciudadano = json.dumps(
    ["aportes:crear", "aportes:leer", "aportes:apoyar", "mesas:deliberar"]
)
permisos_facilitador = json.dumps(
    [
        "aportes:crear",
        "aportes:leer",
        "aportes:apoyar",
        "mesas:abrir",
        "mesas:deliberar",
        "mesas:acuerdos",
        "asistencia:verificar",
    ]
)
permisos_autoridad = json.dumps(
    ["aportes:leer", "aportes:responder", "aportes:priorizar", "mesas:leer"]
)
permisos_auditor = json.dumps(["aportes:leer", "auditoria:leer"])

INSTRUCCIONES_UPGRADE = [
    # 1. Esquema
    "CREATE SCHEMA IF NOT EXISTS autenticacion",
    # 2. Tablas
    """
    CREATE TABLE IF NOT EXISTS autenticacion.roles (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        permisos JSONB NOT NULL DEFAULT '[]'::jsonb
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS autenticacion.usuarios (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        rol_id UUID REFERENCES autenticacion.roles(id) ON DELETE RESTRICT NOT NULL,
        correo VARCHAR(255) UNIQUE NOT NULL,
        hash_contrasena VARCHAR(255) NOT NULL,
        nivel_identidad VARCHAR(20) NOT NULL DEFAULT 'declarada',
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_nivel_identidad CHECK (nivel_identidad IN ('declarada', 'autenticada', 'verificada'))
    )
    """,
    # 3. Índices
    "CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON autenticacion.usuarios(rol_id)",
    "CREATE INDEX IF NOT EXISTS idx_usuarios_nivel ON autenticacion.usuarios(nivel_identidad)",
    # 4. Triggers
    "DROP TRIGGER IF EXISTS trg_actualizar_usuarios ON autenticacion.usuarios",
    """
    CREATE TRIGGER trg_actualizar_usuarios
        BEFORE UPDATE ON autenticacion.usuarios
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    # 5. Comentarios
    "COMMENT ON TABLE autenticacion.usuarios IS 'Directorio de participantes con credenciales y niveles de identidad cívica'",
    "COMMENT ON COLUMN autenticacion.usuarios.nivel_identidad IS 'declarada, autenticada o verificada'",
    # 6. Semilla (Roles Canónicos)
    f"INSERT INTO autenticacion.roles (codigo, nombre, permisos) VALUES ('ciudadano', 'Ciudadano Activo', '{permisos_ciudadano}'::jsonb) ON CONFLICT (codigo) DO NOTHING",
    f"INSERT INTO autenticacion.roles (codigo, nombre, permisos) VALUES ('facilitador_mesa', 'Facilitador de Mesa', '{permisos_facilitador}'::jsonb) ON CONFLICT (codigo) DO NOTHING",
    f"INSERT INTO autenticacion.roles (codigo, nombre, permisos) VALUES ('autoridad_distrital', 'Autoridad Distrital', '{permisos_autoridad}'::jsonb) ON CONFLICT (codigo) DO NOTHING",
    f"INSERT INTO autenticacion.roles (codigo, nombre, permisos) VALUES ('auditor_forense', 'Auditor Forense', '{permisos_auditor}'::jsonb) ON CONFLICT (codigo) DO NOTHING",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TABLE IF EXISTS autenticacion.usuarios CASCADE",
    "DROP TABLE IF EXISTS autenticacion.roles CASCADE",
    "DROP SCHEMA IF EXISTS autenticacion CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
