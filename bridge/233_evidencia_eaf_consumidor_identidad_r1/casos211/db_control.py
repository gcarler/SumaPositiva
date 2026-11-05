"""Control/observación de datos sintéticos211 desde otra conexión PostgreSQL.

Entrada/salida por tubería; nonce/token reconstruido no se escribe en artefactos.
"""
import asyncio
import hashlib
import json
import os
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool


async def main():
    data = json.load(sys.stdin)
    correo = data["correo"]
    assert correo.startswith("eaf211-") and correo.endswith("@example.org")
    engine = create_async_engine(os.environ["POLIS_TEST_DATABASE_URL"], poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() as connection:
            database = await connection.scalar(text("select current_database()"))
            assert database == os.environ["POLIS_EAF_DATABASE"]
            usuario = await connection.scalar(text("select id from autenticacion.usuarios where correo=:correo"), {"correo": correo})
            assert usuario
            action = data["accion"]
            if action == "rol":
                assert data["rol"] in {"administrador_identidades", "auditor_forense", "ciudadano"}
                await connection.execute(text("update autenticacion.usuarios set rol_id=(select id from autenticacion.roles where codigo=:rol) where id=:id"), {"rol": data["rol"], "id": usuario})
                print(json.dumps({"usuario_id": str(usuario), "rol": data["rol"], "database": database}))
            elif action == "magic":
                nonce = await connection.scalar(text("select nonce from autenticacion.tokens_accion where usuario_id=:id and proposito='magic_link' and usado_en is null order by expira_en desc limit 1"), {"id": usuario})
                assert nonce
                from app.core.config import Settings
                from app.modules.identidad.correo import token_para_correo
                print(json.dumps({"token": token_para_correo(nonce, Settings())}))
            elif action == "factor":
                row = (await connection.execute(text("select id,activo,secreto_cifrado,codigos_recuperacion,activado_en from autenticacion.usuarios_mfa where usuario_id=:id"), {"id": usuario})).mappings().one_or_none()
                print(json.dumps({"existe": row is not None, "activo": row["activo"] if row else None,
                                  "digest": hashlib.sha256(json.dumps(dict(row),sort_keys=True,default=str).encode()).hexdigest() if row else None,
                                  "codigos": len(row["codigos_recuperacion"]) if row else 0, "database": database,
                                  "pid_observador": await connection.scalar(text("select pg_backend_pid()"))}))
            elif action == "revocar":
                await connection.execute(text("update autenticacion.sesiones_usuario set revocada_en=now() where usuario_id=:id and revocada_en is null"), {"id": usuario})
                print(json.dumps({"revocadas_solo_cuenta_sintetica": True, "database": database}))
            else:
                raise AssertionError("Acción no autorizada")
    finally:
        await engine.dispose()


asyncio.run(main())
