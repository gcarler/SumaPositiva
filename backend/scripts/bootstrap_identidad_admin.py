"""Script idempotente de bootstrap administrativo para el subsistema de identidad de POLIS.

Permite inicializar de forma segura el primer administrador distrital
o verificar el estado administrativo preexistente sin duplicar cuentas ni mutar
credenciales existentes (principio de idempotencia).
"""

import argparse
import asyncio
import getpass
import json
import os
import sys
from typing import Any

from pydantic import EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import Database
from app.core.transactions import transaction
from app.modules.identidad.models import Rol, Usuario
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.schemas import UsuarioCreacion
from app.modules.identidad.security import obtener_hash_contrasena


async def verificar_administradores(session: AsyncSession) -> list[dict[str, Any]]:
    """Consulta los administradores activos existentes en el sistema."""
    repo = IdentidadRepository(session)
    rol_admin = await repo.obtener_rol_por_codigo("administrador_identidades")
    if not rol_admin:
        return []
    
    stmt = (
        select(Usuario)
        .where(Usuario.rol_id == rol_admin.id, Usuario.activo.is_(True))
        .order_by(Usuario.creado_en.asc())
    )
    res = await session.execute(stmt)
    admins = res.scalars().all()
    return [
        {
            "id": str(u.id),
            "correo": u.correo,
            "nombres": u.nombres,
            "apellidos": u.apellidos,
            "creado_en": u.creado_en.isoformat() if u.creado_en else None,
        }
        for u in admins
    ]


async def ejecutar_bootstrap(
    correo: str,
    nombres: str,
    apellidos: str,
    contrasena: str | None,
    motivo: str,
    settings: Settings,
    check_only: bool = False,
) -> dict[str, Any]:
    """Ejecuta el bootstrap administrativo de forma estrictamente idempotente."""
    database = Database(settings)
    try:
        async with database.sessions() as session:
            # 1. Comprobación de roles y migraciones
            repo = IdentidadRepository(session)
            rol_admin = await repo.obtener_rol_por_codigo("administrador_identidades")
            if not rol_admin:
                return {
                    "exito": False,
                    "accion": "error_esquema",
                    "mensaje": "El rol 'administrador_identidades' no existe. Aplique las migraciones antes de ejecutar el bootstrap.",
                    "admins_existentes": [],
                }

            # 2. Consultar administradores activos
            admins_actuales = await verificar_administradores(session)

            if check_only:
                return {
                    "exito": True,
                    "accion": "check_only",
                    "hay_administrador": len(admins_actuales) > 0,
                    "total_administradores": len(admins_actuales),
                    "admins": admins_actuales,
                    "mensaje": (
                        f"Se encontraron {len(admins_actuales)} administradores activos."
                        if admins_actuales
                        else "No existen administradores activos registrados."
                    ),
                }

            # 3. Idempotencia: Si ya existe un administrador activo
            correo_normalizado = correo.strip().lower()
            if admins_actuales:
                coincidencia = next(
                    (a for a in admins_actuales if a["correo"].lower() == correo_normalizado), None
                )
                if coincidencia:
                    return {
                        "exito": True,
                        "accion": "idempotente_sin_cambios",
                        "usuario_id": coincidencia["id"],
                        "correo": coincidencia["correo"],
                        "mensaje": f"El administrador '{coincidencia['correo']}' ya existe y está activo. No se requieren cambios.",
                    }
                else:
                    primer_admin = admins_actuales[0]
                    return {
                        "exito": True,
                        "accion": "idempotente_admin_existente",
                        "usuario_id": primer_admin["id"],
                        "correo": primer_admin["correo"],
                        "mensaje": (
                            f"Ya existe un administrador de identidades activo ({primer_admin['correo']}). "
                            "El bootstrap idempotente no altera cuentas preexistentes; use la administración web para delegar."
                        ),
                    }

            # 4. Verificar colisión con usuario no-administrador
            usuario_existente = await repo.obtener_usuario_por_correo(correo_normalizado)
            if usuario_existente:
                return {
                    "exito": False,
                    "accion": "colision_correo",
                    "mensaje": (
                        f"El correo '{correo_normalizado}' ya se encuentra registrado con otro rol. "
                        "El bootstrap pericial no promueve cuentas existentes automáticamente."
                    ),
                }

            # 5. Validar contraseña
            if not contrasena or len(contrasena) < 8:
                return {
                    "exito": False,
                    "accion": "contrasena_invalida",
                    "mensaje": "La contraseña de bootstrap debe contener al menos 8 caracteres.",
                }
            if len(contrasena.encode("utf-8")) > 72:
                return {
                    "exito": False,
                    "accion": "contrasena_invalida",
                    "mensaje": "La contraseña no debe superar los 72 bytes por restricciones de algoritmo bcrypt.",
                }

            # 6. Creación atómica dentro de transacción serializada
            async with transaction(session):
                await repo.serializar_administracion()
                
                # Re-comprobación bajo bloqueo de tabla
                if await repo.contar_administradores():
                    return {
                        "exito": True,
                        "accion": "idempotente_concurrente",
                        "mensaje": "Un administrador fue creado concurrentemente; no se aplican cambios adicionales.",
                    }

                datos_usuario = UsuarioCreacion(
                    correo=correo_normalizado,
                    nombres=nombres.strip(),
                    apellidos=apellidos.strip(),
                    contrasena=contrasena,
                )
                
                nuevo_admin = await repo.crear_usuario(
                    datos_usuario,
                    obtener_hash_contrasena(contrasena),
                    rol_admin.id,
                )

                await repo.registrar_evento(
                    "bootstrap_administrador",
                    None,
                    nuevo_admin.id,
                    {
                        "motivo": motivo.strip(),
                        "canal": "CLI operativo idempotente",
                        "correo": correo_normalizado,
                    },
                )

                return {
                    "exito": True,
                    "accion": "creado",
                    "usuario_id": str(nuevo_admin.id),
                    "correo": nuevo_admin.correo,
                    "mensaje": f"Administrador '{nuevo_admin.correo}' creado exitosamente bajo rol '{rol_admin.codigo}'.",
                }
    finally:
        await database.engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap administrativo idempotente de identidades POLIS."
    )
    parser.add_argument(
        "--correo",
        default=os.environ.get("POLIS_BOOTSTRAP_ADMIN_EMAIL", "admin@seguridadhumanaintegral.org"),
        help="Correo institucional del administrador (def: admin@seguridadhumanaintegral.org)",
    )
    parser.add_argument(
        "--nombres",
        default="Administrador Distrital",
        help="Nombres del administrador (def: Administrador Distrital)",
    )
    parser.add_argument(
        "--apellidos",
        default="POLIS",
        help="Apellidos del administrador (def: POLIS)",
    )
    parser.add_argument(
        "--contrasena",
        default=os.environ.get("POLIS_BOOTSTRAP_ADMIN_PASSWORD"),
        help="Contraseña (opcional; si no se provee ni está en env se solicitará de forma segura)",
    )
    parser.add_argument(
        "--motivo",
        default="Puesta en operacion oficial autorizada - Decreto 037 de 2026",
        help="Motivo pericial para el registro de auditoría (mínimo 10 caracteres)",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Solo verifica la existencia de administradores sin realizar modificaciones",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Imprime el resultado en formato JSON estructurado",
    )
    parser.add_argument(
        "--database-url",
        help="URL de conexión a PostgreSQL (sobrescribe POLIS_DATABASE_URL)",
    )

    args = parser.parse_args()

    if not args.check_only and len(args.motivo.strip()) < 10:
        parser.error("El motivo requiere al menos 10 caracteres de justificación pericial.")

    contrasena = args.contrasena
    if not args.check_only and not contrasena:
        if sys.stdin.isatty():
            contrasena = getpass.getpass("Contraseña para el administrador inicial: ")
            confirma = getpass.getpass("Confirma la contraseña: ")
            if contrasena != confirma:
                parser.error("Las contraseñas no coinciden.")
        else:
            parser.error(
                "Debe proporcionar --contrasena o la variable POLIS_BOOTSTRAP_ADMIN_PASSWORD en entornos no interactivos."
            )

    settings = Settings()
    if args.database_url:
        settings.database_url = args.database_url

    resultado = asyncio.run(
        ejecutar_bootstrap(
            correo=args.correo,
            nombres=args.nombres,
            apellidos=args.apellidos,
            contrasena=contrasena,
            motivo=args.motivo,
            settings=settings,
            check_only=args.check_only,
        )
    )

    if args.json:
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    else:
        if resultado["exito"]:
            print(f"[OK] {resultado['mensaje']}")
            if "usuario_id" in resultado:
                print(f"     ID de usuario: {resultado['usuario_id']}")
        else:
            print(f"[ERROR] {resultado['mensaje']}", file=sys.stderr)

    sys.exit(0 if resultado["exito"] else 1)


if __name__ == "__main__":
    main()
