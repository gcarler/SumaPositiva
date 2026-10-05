import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
from app.modules.identidad.service import IdentidadService

pytestmark = pytest.mark.anyio


async def _crear_usuario_con_rol(database_url: str, rol_codigo: str):
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    correo = f"{rol_codigo}-{uuid.uuid4().hex[:8]}@example.org"
    password = "PasswordTest2026*"
    async with sessions() as session:
        service = IdentidadService(session)
        usuario = await service.registrar_usuario(
            UsuarioCreacion(
                correo=correo,
                contrasena=password,
                nombres=f"Usuario {rol_codigo}",
                apellidos="Prueba",
            )
        )
        async with transaction(session):
            repo = IdentidadRepository(session)
            cuenta = await repo.obtener_usuario_por_id(usuario.id)
            rol = await repo.obtener_rol_por_codigo(rol_codigo)
            cuenta.rol_id, cuenta.rol = rol.id, rol
            await repo.guardar()

        token_resp = await service.autenticar_usuario(
            LoginPeticion(correo=correo, contrasena=password)
        )
        token = token_resp.token_acceso

    await engine.dispose()
    return usuario.id, {"Authorization": f"Bearer {token}"}


async def test_actualizacion_mesa_autoridad_genera_auditoria_sql(database_url: str, cabeceras_gestion):
    """OBS-21 (a): La mutación de mesas persiste en RegistroAuditoria con trazabilidad de campos modificados."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        # 1. Crear mesa de prueba
        test_code = uuid.uuid4().hex[:6]
        resp_crear = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_code}",
                "shortcode_ciudadano": f"MT{test_code}",
                "nombre": "Mesa Territorial Auditoria",
                "lugar_nombre": "Colegio San Jose",
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert resp_crear.status_code == 201
        mesa = resp_crear.json()
        mesa_id = mesa["id"]

        # 2. Actualizar metadatos
        resp_patch = client.patch(
            f"/api/v1/mesas/{mesa_id}",
            json={
                "lugar": "Sede Comunal Blas de Lezo",
                "horario": "08:30 - 12:30",
                "entidad_responsable": "Secretaría de Participación y Desarrollo Social",
            },
        )
        assert resp_patch.status_code == 200
        mesa_actualizada = resp_patch.json()
        assert mesa_actualizada["lugar_nombre"] == "Sede Comunal Blas de Lezo"
        assert mesa_actualizada["horario"] == "08:30 - 12:30"

    # 3. Verificar persistencia en auditoria.registros_auditoria
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as session:
        res = await session.execute(
            select(RegistroAuditoria)
            .where(
                RegistroAuditoria.registro_id == uuid.UUID(mesa_id),
                RegistroAuditoria.accion == "ACTUALIZAR_METADATOS_MESA",
            )
            .order_by(RegistroAuditoria.creado_en.desc())
        )
        auditoria = res.scalars().first()
        assert auditoria is not None
        assert auditoria.tabla_afectada == "mesas_trabajo.mesas"
        assert auditoria.causal == "tecnica"
        assert "lugar_nombre" in auditoria.metadatos["campos_modificados"]
        assert "horario" in auditoria.metadatos["campos_modificados"]
        assert "entidad_responsable" in auditoria.metadatos["campos_modificados"]
    await engine.dispose()


async def test_salvaguarda_total_asistentes_rechaza_400(database_url: str, cabeceras_gestion):
    """OBS-21 (c): total_asistentes no es editable por PATCH; debe derivar de actas/asistencia."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_code = uuid.uuid4().hex[:6]
        resp_crear = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_code}",
                "shortcode_ciudadano": f"MT{test_code}",
                "nombre": "Mesa Conteo Protegido",
                "lugar_nombre": "Plaza Principal",
            },
        )
        assert resp_crear.status_code == 201
        mesa_id = resp_crear.json()["id"]

        resp_lb = client.patch(
            f"/api/v1/mesas/{mesa_id}",
            json={"total_asistentes": 150},
        )
        assert resp_lb.status_code == 400
        assert "total de asistentes" in resp_lb.json()["detail"].lower()


async def test_facilitador_mesa_control_propiedad_403(database_url: str, cabeceras_gestion):
    """OBS-21 (c): Facilitador no puede editar mesas asignadas a otro facilitador (403 Forbidden)."""
    user_a_id, _ = await _crear_usuario_con_rol(database_url, "facilitador_mesa")
    _, headers_b = await _crear_usuario_con_rol(database_url, "facilitador_mesa")

    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    # 1. Autoridad crea mesa asignada a Facilitador A
    with TestClient(app, headers=cabeceras_gestion) as admin_client:
        test_code = uuid.uuid4().hex[:6]
        resp_crear = admin_client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_code}",
                "shortcode_ciudadano": f"MT{test_code}",
                "nombre": "Mesa Asignada a Facilitador A",
                "lugar_nombre": "Centro Barrial",
                "facilitador_id": str(user_a_id),
            },
        )
        assert resp_crear.status_code == 201
        mesa_id = resp_crear.json()["id"]

    # 2. Facilitador B intenta editar la mesa de Facilitador A -> 403 Forbidden
    with TestClient(app, headers=headers_b) as client_b:
        resp_patch = client_b.patch(
            f"/api/v1/mesas/{mesa_id}",
            json={"horario": "14:00 - 18:00"},
        )
        assert resp_patch.status_code == 403
        assert "otro facilitador" in resp_patch.json()["detail"].lower()


async def test_facilitador_mesa_prohibido_reasignar_facilitador_o_estado_403(
    database_url: str, cabeceras_gestion
):
    """OBS-21 (c): Facilitador asignado no puede reasignar facilitador_id ni alterar estado (403 Forbidden)."""
    user_a_id, headers_a = await _crear_usuario_con_rol(database_url, "facilitador_mesa")
    user_otro_id, _ = await _crear_usuario_con_rol(database_url, "facilitador_mesa")

    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as admin_client:
        test_code = uuid.uuid4().hex[:6]
        resp_crear = admin_client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_code}",
                "shortcode_ciudadano": f"MT{test_code}",
                "nombre": "Mesa Propia de Facilitador A",
                "lugar_nombre": "Parque Comunitario",
                "facilitador_id": str(user_a_id),
                "estado": "PROGRAMADA",
            },
        )
        assert resp_crear.status_code == 201
        mesa_id = resp_crear.json()["id"]

    with TestClient(app, headers=headers_a) as client_a:
        # Intento de reasignar facilitador_id -> 403
        resp_reasignar = client_a.patch(
            f"/api/v1/mesas/{mesa_id}",
            json={"facilitador_id": str(user_otro_id)},
        )
        assert resp_reasignar.status_code == 403
        assert "reasignar el facilitador" in resp_reasignar.json()["detail"].lower()

        # Intento de cambiar estado oficial -> 403
        resp_estado = client_a.patch(
            f"/api/v1/mesas/{mesa_id}",
            json={"estado": "ACTA_CONCERTADA"},
        )
        assert resp_estado.status_code == 403
        assert "modificar el estado" in resp_estado.json()["detail"].lower()


async def test_facilitador_mesa_edita_su_propia_mesa_exitosamente(
    database_url: str, cabeceras_gestion
):
    """OBS-21: Facilitador asignado puede editar metadatos operativos permitidos (lugar, horario, entidad)."""
    user_a_id, headers_a = await _crear_usuario_con_rol(database_url, "facilitador_mesa")

    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as admin_client:
        test_code = uuid.uuid4().hex[:6]
        resp_crear = admin_client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_code}",
                "shortcode_ciudadano": f"MT{test_code}",
                "nombre": "Mesa Territorial Facilitador A",
                "lugar_nombre": "Lugar Original",
                "facilitador_id": str(user_a_id),
            },
        )
        assert resp_crear.status_code == 201
        mesa_id = resp_crear.json()["id"]

    with TestClient(app, headers=headers_a) as client_a:
        resp_patch = client_a.patch(
            f"/api/v1/mesas/{mesa_id}",
            json={
                "lugar": "Centro Cultural La Esperanza",
                "horario": "10:00 - 13:00",
                "entidad_responsable": "Enlace Comunitario Local",
            },
        )
        assert resp_patch.status_code == 200
        datos = resp_patch.json()
        assert datos["lugar_nombre"] == "Centro Cultural La Esperanza"
        assert datos["horario"] == "10:00 - 13:00"

    # Verificar auditoría con usuario_id del facilitador
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as session:
        res = await session.execute(
            select(RegistroAuditoria)
            .where(
                RegistroAuditoria.registro_id == uuid.UUID(mesa_id),
                RegistroAuditoria.accion == "ACTUALIZAR_METADATOS_MESA",
            )
            .order_by(RegistroAuditoria.creado_en.desc())
        )
        auditoria = res.scalars().first()
        assert auditoria is not None
        assert auditoria.usuario_id == user_a_id
    await engine.dispose()


async def test_auditoria_agendas_mesas_crear_y_actualizar(database_url: str, cabeceras_gestion):
    """OBS-22: Creación y actualización de agendas registran en auditoria.registros_auditoria."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    agenda_id = f"aud-ag-{uuid.uuid4().hex[:6]}"
    with TestClient(app, headers=cabeceras_gestion) as client:
        # 1. Crear agenda
        resp_crear = client.post(
            "/api/v1/mesas/agendas",
            json={
                "id": agenda_id,
                "tipo": "territorial",
                "nombre": "Mesa Territorial Auditoria Cronograma",
                "territorio": "Localidad 2",
                "lugar": "Sede Social",
                "fecha": "2026-11-12",
            },
        )
        assert resp_crear.status_code == 201

        # 2. Actualizar agenda
        resp_patch = client.patch(
            f"/api/v1/mesas/agendas/{agenda_id}",
            json={
                "estado": "reprogramada",
                "observaciones": "Ajuste de calendario",
            },
        )
        assert resp_patch.status_code == 200

    # 3. Verificar registros en auditoria
    agenda_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"mesas_agendas:{agenda_id}")
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as session:
        res_crear = await session.execute(
            select(RegistroAuditoria).where(
                RegistroAuditoria.registro_id == agenda_uuid,
                RegistroAuditoria.accion == "CREAR_AGENDA_MESA",
            )
        )
        assert res_crear.scalars().first() is not None

        res_patch = await session.execute(
            select(RegistroAuditoria).where(
                RegistroAuditoria.registro_id == agenda_uuid,
                RegistroAuditoria.accion == "ACTUALIZAR_AGENDA_MESA",
            )
        )
        audit_patch = res_patch.scalars().first()
        assert audit_patch is not None
        assert "estado" in audit_patch.metadatos["campos_modificados"]
    await engine.dispose()


async def test_mesa_facilitador_nombre_join_usuario(database_url: str, cabeceras_gestion):
    """H-11: MesaRespuesta expone facilitador_nombre por join con autenticacion.usuarios."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    # 1. Crear usuario facilitador con nombres y apellidos
    usuario_id, _ = await _crear_usuario_con_rol(database_url, "facilitador_mesa")

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_code = uuid.uuid4().hex[:6]
        # 2. Crear mesa asignando facilitador_id
        resp_crear = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-FAC-{test_code}",
                "shortcode_ciudadano": f"MFAC{test_code}",
                "nombre": f"Mesa con Facilitador {test_code}",
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
                "facilitador_id": str(usuario_id),
            },
        )
        assert resp_crear.status_code == 201, resp_crear.text
        mesa_id = resp_crear.json()["id"]

        # 3. GET /mesas/{id} resuelve facilitador_nombre por join
        resp_get = client.get(f"/api/v1/mesas/{mesa_id}")
        assert resp_get.status_code == 200
        data_get = resp_get.json()
        assert data_get["facilitador_id"] == str(usuario_id)
        assert data_get["facilitador_nombre"] == "Usuario facilitador_mesa Prueba"

        # 4. GET /mesas (listado) también incluye facilitador_nombre
        resp_list = client.get("/api/v1/mesas")
        assert resp_list.status_code == 200
        mesas = resp_list.json()
        encontrada = next((m for m in mesas if m["id"] == mesa_id), None)
        assert encontrada is not None
        assert encontrada["facilitador_nombre"] == "Usuario facilitador_mesa Prueba"

