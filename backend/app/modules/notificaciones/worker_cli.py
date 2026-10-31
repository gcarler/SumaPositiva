"""Ejecutor continuo del outbox transaccional (POLIS Herald).

Uso:
    python -m app.modules.notificaciones.worker_cli                # servicio continuo
    python -m app.modules.notificaciones.worker_cli --una-vez      # drena y termina (cron / diagnóstico)

Garantía de seguridad: en producción SIN ``POLIS_SMTP_HOST`` el ejecutor se niega a arrancar
(código de salida 2). Motivo: sin SMTP el transporte marca las filas como ``simulado``, estado
terminal; consumir la cola así descartaría en silencio los correos de registro y recuperación
de contraseña de ciudadanos reales. Con la negativa, las filas permanecen ``pendiente`` y se
entregan en cuanto se configure el relé.
"""

import argparse
import asyncio
import logging
import signal
import sys
from collections import Counter

from app.core.config import Settings
from app.core.database import Database
from app.modules.notificaciones.worker import NotificacionWorker

logger = logging.getLogger("polis.herald")

SALIDA_CONFIGURACION = 2


class ConfiguracionInvalida(RuntimeError):
    """El entorno no permite entregar correo real de forma segura."""


def verificar_configuracion(settings: Settings, *, permitir_simulado: bool = False) -> None:
    if settings.environment != "production" or permitir_simulado:
        return
    if not settings.smtp_host:
        raise ConfiguracionInvalida(
            "POLIS_SMTP_HOST no está configurado: en producción el ejecutor no arranca para no marcar "
            "como 'simulado' (terminal) correos reales. Configure el relé SMTP o use --permitir-simulado."
        )
    if "example.org" in settings.smtp_remitente.lower():
        raise ConfiguracionInvalida(
            "POLIS_SMTP_REMITENTE conserva el valor de ejemplo (example.org); configure un remitente "
            "institucional con SPF/DKIM válidos."
        )


async def drenar(
    sessions,
    settings: Settings,
    *,
    transporte=None,
    concurrencia: int = 4,
    lote: int = 200,
) -> Counter:
    """Procesa hasta ``lote`` notificaciones con ``concurrencia`` consumidores independientes.

    Cada consumidor usa su propia sesión; ``FOR UPDATE SKIP LOCKED`` en el worker garantiza que
    nunca dos consumidores reclamen la misma fila.
    """
    resultados: Counter = Counter()
    restante = lote
    candado = asyncio.Lock()

    async def consumidor() -> None:
        nonlocal restante
        while True:
            async with candado:
                if restante <= 0:
                    return
                restante -= 1
            async with sessions() as session:
                resultado = await NotificacionWorker(session, settings).procesar_uno(transporte=transporte)
            if resultado is None:
                return
            resultados[resultado.estado] += 1

    await asyncio.gather(*(consumidor() for _ in range(max(1, concurrencia))))
    return resultados


async def ejecutar(args: argparse.Namespace) -> int:
    settings = Settings()
    try:
        verificar_configuracion(settings, permitir_simulado=args.permitir_simulado)
    except ConfiguracionInvalida as error:
        logger.error("%s", error)
        return SALIDA_CONFIGURACION

    detener = asyncio.Event()
    bucle = asyncio.get_running_loop()
    for senal in (signal.SIGTERM, signal.SIGINT):
        bucle.add_signal_handler(senal, detener.set)

    database = Database(settings)
    logger.info(
        "POLIS Herald iniciado: smtp=%s concurrencia=%s intervalo=%ss",
        settings.smtp_host or "(simulado)",
        args.concurrencia,
        args.intervalo,
    )
    try:
        while not detener.is_set():
            try:
                resultados = await drenar(database.sessions, settings, concurrencia=args.concurrencia, lote=args.lote)
                if resultados:
                    logger.info("Ciclo de entrega: %s", dict(resultados))
            except Exception:  # un fallo de BD no debe matar el servicio; el siguiente ciclo reintenta
                logger.exception("Fallo en el ciclo de entrega; se reintenta")
            if args.una_vez:
                break
            try:
                await asyncio.wait_for(detener.wait(), timeout=args.intervalo)
            except TimeoutError:
                pass
    finally:
        await database.engine.dispose()
        logger.info("POLIS Herald detenido")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Ejecutor del outbox de correo transaccional POLIS Herald")
    parser.add_argument("--una-vez", action="store_true", help="Drena la cola una vez y termina")
    parser.add_argument("--intervalo", type=float, default=10.0, help="Segundos entre ciclos (def. 10)")
    parser.add_argument("--concurrencia", type=int, default=4, help="Consumidores simultáneos (def. 4)")
    parser.add_argument("--lote", type=int, default=200, help="Máximo de correos por ciclo (def. 200)")
    parser.add_argument(
        "--permitir-simulado",
        action="store_true",
        help="Permite arrancar en producción sin SMTP (marca filas como 'simulado'; solo diagnóstico)",
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    return asyncio.run(ejecutar(args))


if __name__ == "__main__":
    sys.exit(main())
