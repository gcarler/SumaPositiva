import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Database
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_registro_participantes_y_unicidad(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        # 1. Crear Mesa para el test
        resp_mesa = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-PART-{test_id}",
                "shortcode_ciudadano": f"MTP{test_id}",
                "nombre": "Mesa de Participacion Comunitaria",
                "aforo_maximo": 20,
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert resp_mesa.status_code == 201
        mesa_id = resp_mesa.json()["id"]

        # 2. Registrar Participante 1 (Facilitador)
        resp_p1 = client.post(
            f"/api/v1/mesas/{mesa_id}/participantes",
            json={
                "sujeto_id": f"sujeto_facil_{test_id}",
                "nombre_completo": "Carmen Moderadora",
                "rol_en_mesa": "facilitador",
                "organizacion_comunitaria": "Alcaldía Mayor de Cartagena",
                "asistencia_confirmada": True,
            },
        )
        assert resp_p1.status_code == 201
        p1 = resp_p1.json()
        assert p1["rol_en_mesa"] == "facilitador"
        assert p1["nombre_completo"] == "Carmen Moderadora"

        # 3. Registrar Participante 2 (Relator)
        resp_p2 = client.post(
            f"/api/v1/mesas/{mesa_id}/participantes",
            json={
                "sujeto_id": f"sujeto_relat_{test_id}",
                "nombre_completo": "Roberto Relator",
                "rol_en_mesa": "relator",
                "organizacion_comunitaria": "Universidad de Cartagena",
            },
        )
        assert resp_p2.status_code == 201
        assert resp_p2.json()["rol_en_mesa"] == "relator"

        # 4. Registrar Participante 3 (Ciudadano)
        sujeto_ciudadano = f"sujeto_ciudadano_{test_id}"
        resp_p3 = client.post(
            f"/api/v1/mesas/{mesa_id}/participantes",
            json={
                "sujeto_id": sujeto_ciudadano,
                "nombre_completo": "Ana María Gómez",
                "rol_en_mesa": "ciudadano",
                "organizacion_comunitaria": "JAC Getsemaní",
            },
        )
        assert resp_p3.status_code == 201

        # 5. Validación de Unicidad (uq_participante_mesa): Intento de registrar duplicado
        resp_duplicado = client.post(
            f"/api/v1/mesas/{mesa_id}/participantes",
            json={
                "sujeto_id": sujeto_ciudadano,
                "nombre_completo": "Ana María Gómez Intento 2",
                "rol_en_mesa": "ciudadano",
            },
        )
        assert resp_duplicado.status_code == 409
        assert "ya se encuentra registrado" in resp_duplicado.json()["detail"]

        # 6. Listar participantes
        resp_lista = client.get(f"/api/v1/mesas/{mesa_id}/participantes")
        assert resp_lista.status_code == 200
        participantes = resp_lista.json()
        assert len(participantes) == 3

        # 7. Verificar contador en la mesa
        resp_mesa_actualizada = client.get(f"/api/v1/mesas/{mesa_id}")
        assert resp_mesa_actualizada.status_code == 200
        assert resp_mesa_actualizada.json()["total_asistentes"] == 3


async def test_flujo_acta_comunitaria_y_cierre_sha256(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        # 1. Crear Mesa
        resp_mesa = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "SECTORIAL",
                "codigo_oficial": f"MS-SALUD-{test_id}",
                "shortcode_ciudadano": f"MSS{test_id}",
                "nombre": "Mesa Sectorial de Salud y Bienestar",
                "aforo_maximo": 15,
                "estado": "CONVOCADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert resp_mesa.status_code == 201
        mesa_id = resp_mesa.json()["id"]

        # 2. Registrar 3 participantes para alcanzar quórum
        for i in range(3):
            client.post(
                f"/api/v1/mesas/{mesa_id}/participantes",
                json={
                    "sujeto_id": f"sujeto_{i}_{test_id}",
                    "nombre_completo": f"Participante {i}",
                    "rol_en_mesa": "ciudadano" if i > 0 else "facilitador",
                },
            )

        # 3. Crear borrador de Acta
        numero_acta = f"ACTA-MS-{test_id}-2026"
        acuerdos_iniciales = [
            {
                "num": 1,
                "tema": "Atención Primaria",
                "compromiso": "Ampliación de horario en CAP Bayunca",
            }
        ]
        disensos_iniciales = [
            {
                "num": 1,
                "tema": "Priorización presupuestal",
                "motivo": "Demanda de dotación urgente de ambulancia marítima",
            }
        ]
        compromisos_iniciales = [
            {"entidad": "Dadis", "responsable": "Dirección de Salud", "plazo": "90 días"}
        ]

        resp_borrador = client.post(
            f"/api/v1/mesas/{mesa_id}/acta",
            json={
                "numero_acta": numero_acta,
                ("resumen_deliberacion"): (
                    "Deliberación pública sobre el Plan Decenal de Salud en el Distri"
                    "to de Cartagena."
                ),
                "acuerdos": acuerdos_iniciales,
                "disensos": disensos_iniciales,
                "compromisos_institucionales": compromisos_iniciales,
                "nombre_facilitador_firma": "Dr. Fernando Morales",
            },
        )
        assert resp_borrador.status_code == 200
        borrador = resp_borrador.json()
        assert borrador["estado"] == "BORRADOR"
        assert borrador["numero_acta"] == numero_acta
        assert borrador["total_participantes"] == 3
        assert borrador["quorum_alcanzado"] is True

        # 4. Cerrar y concertar formalmente el Acta
        resp_cierre = client.post(
            f"/api/v1/mesas/{mesa_id}/acta/cerrar",
            json={
                "resumen_deliberacion": (
                    "Deliberación concluida con acuerdos vinculantes según Ley 1757/15."
                )
            },
        )
        assert resp_cierre.status_code == 200
        acta_cerrada = resp_cierre.json()
        assert acta_cerrada["estado"] == "CONCERTADA"
        assert acta_cerrada["fecha_cierre"] is not None
        assert len(acta_cerrada["sha256_acta"]) == 64
        assert acta_cerrada["quorum_alcanzado"] is True

        # 5. Verificar reflejo en la Mesa
        resp_mesa_final = client.get(f"/api/v1/mesas/{mesa_id}")
        assert resp_mesa_final.status_code == 200
        mesa_datos = resp_mesa_final.json()
        assert mesa_datos["estado"] == "ACTA_CONCERTADA"
        assert mesa_datos["sha256_acta"] == acta_cerrada["sha256_acta"]

        # 6. Consultar acta concertada y validar integridad criptográfica
        resp_acta_consulta = client.get(f"/api/v1/mesas/{mesa_id}/acta")
        assert resp_acta_consulta.status_code == 200
        consulta = resp_acta_consulta.json()
        assert consulta["integridad_valida"] is True
        assert consulta["sha256_acta"] == acta_cerrada["sha256_acta"]
        assert consulta["metadatos_cierre"]["version"] == "polis-acta-v2"
        assert len(consulta["metadatos_cierre"]["participantes"]) == 3
        assert consulta["metadatos_cierre"]["cierre"]["metodo"] == "api"

        # 6.1 Verificar determinismo y cobertura de los campos autenticados.
        import copy
        from datetime import datetime, timedelta
        from types import SimpleNamespace

        from app.modules.mesas.service import MesaService

        servicio = MesaService(None)
        acta_hash = SimpleNamespace(
            id=uuid.UUID(acta_cerrada["id"]),
            mesa_id=uuid.UUID(acta_cerrada["mesa_id"]),
            numero_acta=acta_cerrada["numero_acta"],
            resumen_deliberacion=acta_cerrada["resumen_deliberacion"],
            acuerdos=acta_cerrada["acuerdos"],
            disensos=acta_cerrada["disensos"],
            compromisos_institucionales=acta_cerrada["compromisos_institucionales"],
            metadatos_cierre=acta_cerrada["metadatos_cierre"],
            quorum_alcanzado=acta_cerrada["quorum_alcanzado"],
            total_participantes=acta_cerrada["total_participantes"],
            facilitador_firma_id=(
                uuid.UUID(acta_cerrada["facilitador_firma_id"])
                if acta_cerrada["facilitador_firma_id"]
                else None
            ),
            nombre_facilitador_firma=acta_cerrada["nombre_facilitador_firma"],
            estado=acta_cerrada["estado"],
            fecha_cierre=datetime.fromisoformat(acta_cerrada["fecha_cierre"]),
        )
        digest_original = servicio._calcular_hash_pericial(acta_hash)
        assert digest_original == acta_cerrada["sha256_acta"]
        assert servicio._calcular_hash_pericial(acta_hash) == digest_original
        assert servicio._canonizar_json({"texto": "é"}) == servicio._canonizar_json(
            {"texto": "e\u0301"}
        )

        for campo, valor in (
            ("id", uuid.uuid4()),
            ("mesa_id", uuid.uuid4()),
            ("numero_acta", "ACTA-ALTERADA"),
            ("resumen_deliberacion", "Resumen alterado"),
            ("acuerdos", [{"acuerdo": "Alterado"}]),
            ("disensos", [{"disenso": "Alterado"}]),
            ("compromisos_institucionales", [{"compromiso": "Alterado"}]),
            ("quorum_alcanzado", not acta_hash.quorum_alcanzado),
            ("total_participantes", acta_hash.total_participantes + 1),
            ("facilitador_firma_id", uuid.uuid4()),
            ("nombre_facilitador_firma", "Firma alterada"),
            ("fecha_cierre", acta_hash.fecha_cierre + timedelta(seconds=1)),
        ):
            alterada = copy.deepcopy(acta_hash)
            setattr(alterada, campo, valor)
            assert servicio._calcular_hash_pericial(alterada) != digest_original, campo

        for campo_participante, valor_participante in (
            ("participante_id", str(uuid.uuid4())),
            ("rol_en_mesa", "alterado"),
            ("asistencia_confirmada", False),
            ("hora_ingreso", "2000-01-01T00:00:00+00:00"),
        ):
            alterada = copy.deepcopy(acta_hash)
            alterada.metadatos_cierre["participantes"][0][campo_participante] = valor_participante
            assert servicio._calcular_hash_pericial(alterada) != digest_original
        alterada = copy.deepcopy(acta_hash)
        alterada.metadatos_cierre["cierre"]["metodo"] = "alterado"
        assert servicio._calcular_hash_pericial(alterada) != digest_original

        # 7. Rechazo de modificación posterior en la API (Sentencia C-150 de 2015)
        resp_mod_rechazada = client.post(
            f"/api/v1/mesas/{mesa_id}/acta",
            json={
                "numero_acta": numero_acta,
                "resumen_deliberacion": "Intento ilegal de modificación de acta concertada",
            },
        )
        assert resp_mod_rechazada.status_code == 400


async def test_trigger_inmutabilidad_bd_csh(database_url: str, cabeceras_gestion):
    """Verifica que el trigger de BD impida alteración o borrado de actas concertadas."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    db = Database(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        resp_mesa = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "POBLACIONAL",
                "codigo_oficial": f"MP-ETN-{test_id}",
                "shortcode_ciudadano": f"MPE{test_id}",
                "nombre": "Mesa Poblacional Étnica",
            },
        )
        mesa_id = resp_mesa.json()["id"]

        # Registrar 3 participantes
        for i in range(3):
            client.post(
                f"/api/v1/mesas/{mesa_id}/participantes",
                json={
                    "sujeto_id": f"sujeto_etn_{i}_{test_id}",
                    "nombre_completo": f"Comunero {i}",
                },
            )

        # Crear y cerrar acta
        client.post(
            f"/api/v1/mesas/{mesa_id}/acta",
            json={
                "numero_acta": f"ACTA-ETN-{test_id}",
                "resumen_deliberacion": "Concertación con Consejos Comunitarios y Cabildos.",
                "acuerdos": [{"acuerdo": "Garantías de Consulta Previa"}],
            },
        )
        resp_cierre = client.post(f"/api/v1/mesas/{mesa_id}/acta/cerrar")
        assert resp_cierre.status_code == 200
        acta_id = resp_cierre.json()["id"]

    # Conexión directa a BD para probar que el TRIGGER de PostgreSQL bloquea UPDATE y DELETE
    async with db.sessions() as session:
        # Intento de UPDATE directo en BD
        with pytest.raises(Exception) as exc_update:
            await session.execute(
                text(
                    "UPDATE mesas_trabajo.actas_comunitarias SET resumen_del"
                    "iberacion = 'Modificación Maliciosa' WHERE id = :acta_id"
                ),
                {"acta_id": acta_id},
            )
            await session.commit()
        assert "Violación Forense (Sentencia C-150/15)" in str(exc_update.value)

        await session.rollback()

        # Intento de DELETE directo en BD
        with pytest.raises(Exception) as exc_delete:
            await session.execute(
                text("DELETE FROM mesas_trabajo.actas_comunitarias WHERE id = :acta_id"),
                {"acta_id": acta_id},
            )
            await session.commit()
        assert "Violación Forense (Sentencia C-150/15)" in str(exc_delete.value)

    await db.engine.dispose()
