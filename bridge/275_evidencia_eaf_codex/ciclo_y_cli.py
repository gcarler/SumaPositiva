"""Ciclo de migración con datos conservados y CLI reales sin SMTP."""

import asyncio
import json
import os
import subprocess
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

E = Path(__file__).resolve().parent
SNAP = E / ".runtime/snapshot"
REPORT = {"commands": [], "checkpoints": []}


def command(name, arguments):
    result = subprocess.run(
        [sys.executable, *arguments],
        cwd=SNAP,
        env=os.environ.copy(),
        capture_output=True,
        text=True,
    )
    REPORT["commands"].append(
        {
            "name": name,
            "arguments": arguments,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    )
    return result


async def checkpoint(engine, label, legacy):
    async with engine.connect() as conn:
        record = {
            "label": label,
            "revision": await conn.scalar(
                text("SELECT version_num FROM alembic_version")
            ),
            "latido": bool(
                await conn.scalar(
                    text("SELECT to_regclass('participacion_ciudadana.herald_latido')")
                )
            ),
            "indice": await conn.scalar(
                text(
                    "SELECT indexdef FROM pg_indexes WHERE schemaname='participacion_ciudadana' AND indexname='uq_notif_resumen_destinatario_dia'"
                )
            ),
            "constraint": await conn.scalar(
                text(
                    "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='chk_notificaciones_tipo_evento'"
                )
            ),
            "legado_conservado": await conn.scalar(
                text(
                    "SELECT count(*) FROM participacion_ciudadana.notificaciones_transaccionales WHERE codigo_radicado=:legacy AND asunto='EAF275-CONSERVAR'"
                ),
                {"legacy": legacy},
            ),
            "resumenes": await conn.scalar(
                text(
                    "SELECT count(*) FROM participacion_ciudadana.notificaciones_transaccionales WHERE tipo_evento='resumen_diario'"
                )
            ),
        }
    REPORT["checkpoints"].append(record)
    assert record["legado_conservado"] == 1
    return record


async def main():
    url = os.environ["POLIS_DATABASE_URL"]
    assert url.rsplit("/", 1)[-1] == "polis_test_eaf_275_codex_probes"
    engine = create_async_engine(url, poolclass=NullPool, hide_parameters=True)
    legacy = "EAF275-MIG-" + uuid.uuid4().hex[:12]
    try:
        async with engine.begin() as conn:
            assert (
                await conn.scalar(text("SELECT current_database()"))
                == "polis_test_eaf_275_codex_probes"
            )
            await conn.execute(
                text(
                    "INSERT INTO participacion_ciudadana.notificaciones_transaccionales(codigo_radicado,destinatario_correo,tipo_evento,asunto,cuerpo_html,estado_envio) VALUES(:legacy,'conservar@example.org','registro_bienvenida','EAF275-CONSERVAR','<p>Fixture</p>','enviado')"
                ),
                {"legacy": legacy},
            )
        assert (
            command(
                "heads", ["-m", "alembic", "-c", "backend/alembic.ini", "heads"]
            ).returncode
            == 0
        )
        before = await checkpoint(engine, "0094_inicial", legacy)
        assert before["resumenes"] >= 1
        for revision in ["0093_herald_gestion", "head", "0093_herald_gestion", "head"]:
            action = "upgrade" if revision == "head" else "downgrade"
            assert (
                command(
                    action + "_" + revision,
                    ["-m", "alembic", "-c", "backend/alembic.ini", action, revision],
                ).returncode
                == 0
            )
            current = await checkpoint(engine, action + "_" + revision, legacy)
            if revision == "head":
                assert (
                    current["latido"]
                    and current["indice"]
                    and "resumen_diario" in current["constraint"]
                )
            else:
                assert (
                    not current["latido"]
                    and not current["indice"]
                    and "resumen_diario" not in current["constraint"]
                    and current["resumenes"] == 0
                )
        command(
            "alembic_check", ["-m", "alembic", "-c", "backend/alembic.ini", "check"]
        )
        email = "cli-eaf275-" + uuid.uuid4().hex[:10] + "@example.org"
        now = datetime.now(UTC)
        day = now.astimezone(ZoneInfo("America/Bogota")).date().isoformat()
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "INSERT INTO autenticacion.usuarios(correo,hash_contrasena,nombres,apellidos,rol_id,activo) SELECT :email,'fixture-sin-login','CLI','EAF275',id,TRUE FROM autenticacion.roles WHERE codigo='auditor_forense'"
                ),
                {"email": email},
            )
            await conn.execute(
                text(
                    "INSERT INTO participacion_ciudadana.notificaciones_transaccionales(codigo_radicado,destinatario_correo,tipo_evento,asunto,cuerpo_html,estado_envio) VALUES('EAF275-CLI',:email,'gestion_institucional','POLIS: EAF275-ACCION-CLI','<p>Fixture</p>','enviado')"
                ),
                {"email": email},
            )

        async def summaries():
            async with engine.connect() as conn:
                return await conn.scalar(
                    text(
                        "SELECT count(*) FROM participacion_ciudadana.notificaciones_transaccionales WHERE tipo_evento='resumen_diario' AND destinatario_correo=:email"
                    ),
                    {"email": email},
                )

        pre = await summaries()
        assert (
            command(
                "cli_simular",
                [
                    "-m",
                    "app.modules.notificaciones.resumen_cli",
                    "--simular",
                    "--fecha",
                    day,
                ],
            ).returncode
            == 0
        )
        post_sim = await summaries()
        assert pre == post_sim == 0
        assert (
            command(
                "cli_primera",
                ["-m", "app.modules.notificaciones.resumen_cli", "--fecha", day],
            ).returncode
            == 0
        )
        assert (
            command(
                "cli_repetida",
                ["-m", "app.modules.notificaciones.resumen_cli", "--fecha", day],
            ).returncode
            == 0
        )
        post_real = await summaries()
        assert post_real == 1
        assert (
            command(
                "worker_con_cola",
                [
                    "-m",
                    "app.modules.notificaciones.worker_cli",
                    "--una-vez",
                    "--lote",
                    "200",
                ],
            ).returncode
            == 0
        )
        async with engine.connect() as conn:
            first = (
                (
                    await conn.execute(
                        text(
                            "SELECT actualizado_en,ultimo_ciclo FROM participacion_ciudadana.herald_latido WHERE id=1"
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert (
            command(
                "worker_cola_vacia",
                ["-m", "app.modules.notificaciones.worker_cli", "--una-vez"],
            ).returncode
            == 0
        )
        async with engine.connect() as conn:
            last = (
                (
                    await conn.execute(
                        text(
                            "SELECT actualizado_en,ultimo_ciclo FROM participacion_ciudadana.herald_latido WHERE id=1"
                        )
                    )
                )
                .mappings()
                .one()
            )
            delivered = await conn.scalar(
                text(
                    "SELECT estado_envio FROM participacion_ciudadana.notificaciones_transaccionales WHERE tipo_evento='resumen_diario' AND destinatario_correo=:email"
                ),
                {"email": email},
            )
        assert delivered == "simulado" and first["ultimo_ciclo"]["procesados"] >= 1
        assert (
            last["ultimo_ciclo"]["procesados"] == 0
            and last["actualizado_en"] > first["actualizado_en"]
        )
        REPORT["cli"] = {
            "fecha_bogota": day,
            "antes": pre,
            "tras_simular": post_sim,
            "tras_dos_ejecuciones": post_real,
            "entrega": delivered,
            "primer_latido": dict(first),
            "latido_vacio": dict(last),
        }
        REPORT["completed"] = True
    finally:
        await engine.dispose()
        (E / "ciclo_y_cli.json").write_text(
            json.dumps(REPORT, default=str, ensure_ascii=False, indent=2) + "\n"
        )
    print(
        json.dumps(
            {
                "completed": REPORT.get("completed", False),
                "commands": [
                    {"name": item["name"], "returncode": item["returncode"]}
                    for item in REPORT["commands"]
                ],
                "cli": REPORT.get("cli"),
            },
            default=str,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
