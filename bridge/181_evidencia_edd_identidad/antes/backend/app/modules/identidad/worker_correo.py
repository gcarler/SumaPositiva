"""Procesar un lote de mensajes pendientes. Invocar periódicamente desde operación."""

import asyncio

from app.core.config import Settings
from app.core.database import Database
from app.modules.identidad.correo import CorreoIdentidad, procesar_cola_correo


async def ejecutar():
    settings = Settings()
    correo = CorreoIdentidad(settings)
    correo.comprobar_configuracion()
    database = Database(settings)
    try:
        return await procesar_cola_correo(database.sessions, settings, correo)
    finally:
        await database.engine.dispose()


if __name__ == "__main__":
    print(f"Solicitudes procesadas: {asyncio.run(ejecutar())}")
