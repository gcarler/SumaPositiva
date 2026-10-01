"""Canal operativo para crear el primer administrador, sin privilegios públicos."""

import argparse
import asyncio
import getpass

from app.core.config import Settings
from app.core.database import Database
from app.core.transactions import transaction
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.schemas import UsuarioCreacion
from app.modules.identidad.security import obtener_hash_contrasena


async def crear_administrador(datos: UsuarioCreacion, motivo: str, settings: Settings):
    database = Database(settings)
    try:
        async with database.sessions() as session:
            repo = IdentidadRepository(session)
            async with transaction(session):
                await repo.serializar_administracion()
                if await repo.contar_administradores():
                    raise ValueError(
                        "Ya existe un administrador activo; utiliza la administración web"
                    )
                if await repo.obtener_usuario_por_correo(str(datos.correo)):
                    raise ValueError(
                        "El correo ya existe; el bootstrap no promueve cuentas históricas"
                    )
                rol = await repo.obtener_rol_por_codigo("administrador_identidades")
                if not rol:
                    raise ValueError("Aplica las migraciones antes del bootstrap")
                usuario = await repo.crear_usuario(
                    datos, obtener_hash_contrasena(datos.contrasena), rol.id
                )
                await repo.registrar_evento(
                    "bootstrap_administrador",
                    None,
                    usuario.id,
                    {"motivo": motivo, "canal": "CLI operativo"},
                )
                return usuario.id
    finally:
        await database.engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--correo", required=True)
    parser.add_argument("--nombres", required=True)
    parser.add_argument("--apellidos", required=True)
    parser.add_argument("--motivo", required=True)
    args = parser.parse_args()
    if len(args.motivo.strip()) < 10:
        parser.error("El motivo requiere al menos 10 caracteres")
    contrasena = getpass.getpass("Contraseña del primer administrador: ")
    if contrasena != getpass.getpass("Confirma la contraseña: "):
        parser.error("Las contraseñas no coinciden")
    datos = UsuarioCreacion(
        correo=args.correo, nombres=args.nombres, apellidos=args.apellidos, contrasena=contrasena
    )
    try:
        usuario_id = asyncio.run(crear_administrador(datos, args.motivo, Settings()))
    except ValueError as error:
        parser.error(str(error))
    print(f"Administrador creado: {usuario_id}")


if __name__ == "__main__":
    main()
