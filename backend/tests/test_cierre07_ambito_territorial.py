"""Pruebas periciales para CIERRE-07: Alcance territorial PBAC de permisos institucionales.

Verifica rigurosamente:
1. Resolución jerárquica de localidad ascendiendo por territorio_padre_id (localidad, barrio, corregimiento, zona insular, distrito).
2. Regla cardinal: "Sin ámbito = Comportamiento actual / Global" (retrocompatibilidad absoluta).
3. Aplicación estricta de políticas de ámbito territorial (localidad, mesa, distrital).
4. Inmunidad de roles exentos (administrador_identidades, auditor_forense, ciudadano).
5. Asentamiento forense inmutable de 'acceso_territorial_denegado' en autenticacion.eventos_identidad.
6. Endpoints administrativos de gestión de ámbitos (GET/POST/DELETE) con RBAC estricto.
7. Herencia de localidad en submesas cuando no definen territorio directo.
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.identidad import models as id_models
from app.modules.identidad.ambito_territorial import (
    resolver_info_territorial_mesa,
    resolver_localidad_territorio,
    verificar_ambito_territorial,
)
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.identidad.security import crear_token_acceso
from app.modules.mesas.models import Mesa

pytestmark = pytest.mark.anyio


@pytest.fixture
def settings(database_url: str):
    return Settings(
        _env_file=None,
        environment="test",
        jwt_secret_key="test_secret_key_cierre07_pbac_32_characters!",
        database_url=database_url,
        ip_salt="test_salt_cierre07_pbac_salt_32_bytes!",
    )


@pytest.fixture
def app(settings):
    return create_app(settings)


@pytest.fixture(autouse=True)
async def cleanup_test_data(database_url: str):
    async def _limpiar():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conn:
                await conn.execute(text("DELETE FROM autenticacion.ambitos_territoriales_usuario;"))
                await conn.execute(text("DELETE FROM mesas_trabajo.mesas WHERE codigo_oficial LIKE 'TEST-%';"))
                await conn.execute(text("DELETE FROM autenticacion.usuarios WHERE correo LIKE '%cierre07%';"))
        except Exception:
            pass
        finally:
            await engine.dispose()

    await _limpiar()
    yield
    await _limpiar()


async def test_cierre07_resolucion_jerarquica_localidades(database_url: str):
    """Condición 1: Resuelve la localidad subiendo por territorio_padre_id en todos los niveles."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Obtener territorios del censo
        stmt = text("SELECT id, codigo, tipo_territorio FROM geodatos.territorios;")
        res = await session.execute(stmt)
        territorios = {row.codigo: row for row in res}

        # 1. Nivel Directo (Localidad)
        loc1 = await resolver_localidad_territorio(session, territorios["LOC-1"].id)
        assert loc1 == "LOC-1"
        loc2 = await resolver_localidad_territorio(session, territorios["LOC-2"].id)
        assert loc2 == "LOC-2"
        loc3 = await resolver_localidad_territorio(session, territorios["LOC-3"].id)
        assert loc3 == "LOC-3"

        # 2. Nivel Barrio (Asciende 1 nivel al padre localidad)
        barrio_centro = await resolver_localidad_territorio(session, territorios["BARRIO-CENTRO"].id)
        assert barrio_centro == "LOC-1"
        barrio_getsemani = await resolver_localidad_territorio(session, territorios["BARRIO-GETSEMANI"].id)
        assert barrio_getsemani == "LOC-1"
        barrio_olaya = await resolver_localidad_territorio(session, territorios["BARRIO-OLAYA"].id)
        assert barrio_olaya == "LOC-2"
        barrio_pozon = await resolver_localidad_territorio(session, territorios["BARRIO-POZON"].id)
        assert barrio_pozon == "LOC-2"
        barrio_mandela = await resolver_localidad_territorio(session, territorios["BARRIO-MANDELA"].id)
        assert barrio_mandela == "LOC-3"

        # 3. Nivel Corregimiento (Asciende 1 nivel al padre localidad)
        corr_boquilla = await resolver_localidad_territorio(session, territorios["CORR-BOQUILLA"].id)
        assert corr_boquilla == "LOC-1"
        corr_bayunca = await resolver_localidad_territorio(session, territorios["CORR-BAYUNCA"].id)
        assert corr_bayunca == "LOC-2"
        corr_pasacaballos = await resolver_localidad_territorio(session, territorios["CORR-PASACABALLOS"].id)
        assert corr_pasacaballos == "LOC-3"

        # 4. Nivel Zona Insular (Asciende 1 nivel al padre localidad)
        ins_rosario = await resolver_localidad_territorio(session, territorios["INS-ROSARIO"].id)
        assert ins_rosario == "LOC-1"
        ins_tierrabomba = await resolver_localidad_territorio(session, territorios["INS-TIERRABOMBA"].id)
        assert ins_tierrabomba == "LOC-1"
        ins_baru = await resolver_localidad_territorio(session, territorios["INS-BARU"].id)
        assert ins_baru == "LOC-3"

        # 5. Nivel Distrito (Transversal, no tiene padre de tipo localidad)
        distrito = await resolver_localidad_territorio(session, territorios["DISTRITO-CTG"].id)
        assert distrito is None

    await engine.dispose()


async def test_cierre07_resolucion_mesa_y_herencia_submesa(database_url: str):
    """Verifica que una mesa resuelva su localidad y que una submesa herede el territorio de su padre."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Obtener ID de BARRIO-OLAYA (LOC-2)
        res = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'BARRIO-OLAYA';"))
        olaya_id = res.scalar_one()

        # Crear mesa raíz de prueba vinculada a BARRIO-OLAYA
        sufijo = uuid.uuid4().hex[:6]
        mesa_padre = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-MESA-{sufijo}",
            shortcode_ciudadano=f"TEST-{sufijo}",
            slug=f"test_mesa_{sufijo}",
            ruta_jerarquica=f"csh.test_mesa_{sufijo}",
            nombre=f"Mesa Prueba Olaya {sufijo}",
            territorio_id=olaya_id,
            aforo_maximo=50,
            total_asistentes=0,
        )
        session.add(mesa_padre)
        await session.flush()

        # Verificar resolución directa de mesa padre
        info_padre = await resolver_info_territorial_mesa(session, mesa_padre.id)
        assert info_padre is not None
        assert info_padre["localidad"] == "LOC-2"
        assert info_padre["codigo_oficial"] == mesa_padre.codigo_oficial

        # Crear submesa sin territorio_id propio
        submesa = Mesa(
            mesa_padre_id=mesa_padre.id,
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-SUBMESA-{sufijo}",
            shortcode_ciudadano=f"TEST-SUB-{sufijo}",
            slug=f"test_submesa_{sufijo}",
            ruta_jerarquica=f"{mesa_padre.ruta_jerarquica}.sub_{sufijo}",
            nombre=f"Submesa Prueba {sufijo}",
            territorio_id=None,
            aforo_maximo=20,
            total_asistentes=0,
        )
        session.add(submesa)
        await session.flush()

        # Verificar que la submesa herede la localidad de su mesa padre
        info_sub = await resolver_info_territorial_mesa(session, submesa.id)
        assert info_sub is not None
        assert info_sub["localidad"] == "LOC-2"
        assert str(info_sub["territorio_id"]) == str(olaya_id)

    await engine.dispose()


async def test_cierre07_regla_cardinal_sin_ambito_es_global(database_url: str):
    """Condición 3: Usuario institucional sin ámbito asignado conserva operación global (retrocompatibilidad)."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Obtener IDs de territorios en LOC-1 y LOC-2
        res1 = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1';"))
        loc1_id = res1.scalar_one()
        res2 = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2';"))
        loc2_id = res2.scalar_one()

        # Crear usuario facilitador SIN registros en ambitos_territoriales_usuario
        usuario_id = uuid.uuid4()
        sujeto = SujetoAutenticadoContexto(
            sujeto_id=usuario_id,
            correo="facilitador_libre@cartagena.gov.co",
            rol="facilitador_mesa",
            permisos={"mesas:abrir", "mesas:acuerdos"},
            nivel_identidad="declarada",
            es_anonimo=False,
            mfa_activo=False,
        )

        # Crear mesas en LOC-1 y LOC-2
        sufijo = uuid.uuid4().hex[:6]
        m1 = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-GL1-{sufijo}",
            shortcode_ciudadano=f"TEST-G1-{sufijo}",
            slug=f"test_gl1_{sufijo}",
            ruta_jerarquica=f"csh.test_gl1_{sufijo}",
            nombre=f"Mesa LOC1 {sufijo}",
            territorio_id=loc1_id,
            aforo_maximo=50,
        )
        m2 = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-GL2-{sufijo}",
            shortcode_ciudadano=f"TEST-G2-{sufijo}",
            slug=f"test_gl2_{sufijo}",
            ruta_jerarquica=f"csh.test_gl2_{sufijo}",
            nombre=f"Mesa LOC2 {sufijo}",
            territorio_id=loc2_id,
            aforo_maximo=50,
        )
        session.add_all([m1, m2])
        await session.flush()

        # Ambos accesos deben ser permitidos sin restricción (retornan True)
        permitido_m1 = await verificar_ambito_territorial(session, sujeto, mesa_id=m1.id)
        assert permitido_m1 is True

        permitido_m2 = await verificar_ambito_territorial(session, sujeto, mesa_id=m2.id)
        assert permitido_m2 is True

        # Acceso por territorio_id directo también permitido
        permitido_t1 = await verificar_ambito_territorial(session, sujeto, territorio_id=loc1_id)
        assert permitido_t1 is True

    await engine.dispose()


async def test_cierre07_pbac_localidad_denegacion_y_auditoria(database_url: str):
    """Condición 4: Usuario con ámbito en LOC-1 puede mutar en LOC-1 y es denegado con 403 y auditoría en LOC-2."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Obtener IDs de territorios
        res1 = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1';"))
        loc1_id = res1.scalar_one()
        res2 = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2';"))
        loc2_id = res2.scalar_one()

        # Crear usuario real en autenticacion.usuarios
        rol_res = await session.execute(select(id_models.Rol).where(id_models.Rol.codigo == "facilitador_mesa"))
        rol = rol_res.scalar_one()

        u_id = uuid.uuid4()
        usuario = id_models.Usuario(
            id=u_id,
            correo=f"facilitador_cierre07_{uuid.uuid4().hex[:6]}@cartagena.gov.co",
            hash_contrasena="hash_dummy",
            nombres="Facilitador",
            apellidos="Localidad 1",
            rol_id=rol.id,
            activo=True,
            correo_verificado_en=datetime.now(UTC),
        )
        session.add(usuario)
        await session.flush()

        # Asignar ámbito en LOC-1
        ambito = id_models.AmbitoTerritorialUsuario(
            usuario_id=u_id,
            tipo_ambito="localidad",
            identificador_territorial="LOC-1",
            activo=True,
        )
        session.add(ambito)
        await session.commit()

        # Sujeto autenticado
        sujeto = SujetoAutenticadoContexto(
            sujeto_id=u_id,
            correo=usuario.correo,
            rol="facilitador_mesa",
            permisos={"mesas:abrir", "mesas:acuerdos"},
            nivel_identidad="declarada",
            es_anonimo=False,
            mfa_activo=False,
        )

        # Crear mesas en LOC-1 y LOC-2
        sufijo = uuid.uuid4().hex[:6]
        m1 = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-L1-{sufijo}",
            shortcode_ciudadano=f"TEST-1-{sufijo}",
            slug=f"test_l1_{sufijo}",
            ruta_jerarquica=f"csh.test_l1_{sufijo}",
            nombre=f"Mesa LOC1 {sufijo}",
            territorio_id=loc1_id,
            aforo_maximo=50,
        )
        m2 = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-L2-{sufijo}",
            shortcode_ciudadano=f"TEST-2-{sufijo}",
            slug=f"test_l2_{sufijo}",
            ruta_jerarquica=f"csh.test_l2_{sufijo}",
            nombre=f"Mesa LOC2 {sufijo}",
            territorio_id=loc2_id,
            aforo_maximo=50,
        )
        session.add_all([m1, m2])
        await session.commit()

        # 1. Mutar mesa en LOC-1 -> PERMITIDO
        ok = await verificar_ambito_territorial(session, sujeto, mesa_id=m1.id)
        assert ok is True

        # 2. Mutar mesa en LOC-2 -> DENEGADO (HTTP 403)
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await verificar_ambito_territorial(
                session,
                sujeto,
                mesa_id=m2.id,
                recurso_tipo="mesa",
                recurso_id=m2.id,
                metodo_http="PATCH",
                ruta_http=f"/api/v1/mesas/{m2.id}",
            )
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["codigo"] == "fuera_de_ambito_territorial"
        assert exc_info.value.detail["ambito_requerido"]["localidad"] == "LOC-2"

        # 3. Verificar evento inmutable de denegación en autenticacion.eventos_identidad
        stmt_ev = (
            select(id_models.EventoIdentidad)
            .where(
                id_models.EventoIdentidad.actor_id == u_id,
                id_models.EventoIdentidad.accion == "acceso_territorial_denegado",
            )
            .order_by(id_models.EventoIdentidad.creado_en.desc())
        )
        res_ev = await session.execute(stmt_ev)
        evento = res_ev.scalar_one_or_none()
        assert evento is not None
        assert evento.detalle["motivo"] == "fuera_de_ambito_territorial"
        assert evento.detalle["recurso_tipo"] == "mesa"
        assert evento.detalle["metodo"] == "PATCH"
        assert evento.detalle["ambito_requerido"]["localidad"] == "LOC-2"
        assert any(a["identificador"] == "LOC-1" for a in evento.detalle["ambitos_asignados"])

    await engine.dispose()


async def test_cierre07_pbac_ambito_mesa_especifica(database_url: str):
    """Verifica que el ámbito de tipo 'mesa' restrinja estrictamente a la mesa designada."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        res1 = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1';"))
        loc1_id = res1.scalar_one()

        rol_res = await session.execute(select(id_models.Rol).where(id_models.Rol.codigo == "facilitador_mesa"))
        rol = rol_res.scalar_one()

        u_id = uuid.uuid4()
        usuario = id_models.Usuario(
            id=u_id,
            correo=f"facilitador_cierre07_mesa_{uuid.uuid4().hex[:6]}@cartagena.gov.co",
            hash_contrasena="hash_dummy",
            nombres="Facilitador",
            apellidos="Mesa Específica",
            rol_id=rol.id,
            activo=True,
            correo_verificado_en=datetime.now(UTC),
        )
        session.add(usuario)

        sufijo = uuid.uuid4().hex[:6]
        m_asignada = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-M-ASIG-{sufijo}",
            shortcode_ciudadano=f"TEST-A-{sufijo}",
            slug=f"test_asig_{sufijo}",
            ruta_jerarquica=f"csh.test_asig_{sufijo}",
            nombre=f"Mesa Asignada {sufijo}",
            territorio_id=loc1_id,
            aforo_maximo=50,
        )
        m_otra = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-M-OTRA-{sufijo}",
            shortcode_ciudadano=f"TEST-O-{sufijo}",
            slug=f"test_otra_{sufijo}",
            ruta_jerarquica=f"csh.test_otra_{sufijo}",
            nombre=f"Mesa Otra {sufijo}",
            territorio_id=loc1_id,
            aforo_maximo=50,
        )
        session.add_all([m_asignada, m_otra])
        await session.flush()

        # Asignar ámbito exclusivo sobre m_asignada por UUID
        ambito = id_models.AmbitoTerritorialUsuario(
            usuario_id=u_id,
            tipo_ambito="mesa",
            identificador_territorial=str(m_asignada.id),
            activo=True,
        )
        session.add(ambito)
        await session.commit()

        sujeto = SujetoAutenticadoContexto(
            sujeto_id=u_id,
            correo=usuario.correo,
            rol="facilitador_mesa",
            permisos={"mesas:abrir"},
            nivel_identidad="declarada",
            es_anonimo=False,
            mfa_activo=False,
        )

        # Puede mutar m_asignada
        assert await verificar_ambito_territorial(session, sujeto, mesa_id=m_asignada.id) is True

        # Denegado en m_otra (misma localidad pero distinta mesa)
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            await verificar_ambito_territorial(session, sujeto, mesa_id=m_otra.id, metodo_http="PATCH")
        assert exc.value.status_code == 403

    await engine.dispose()


async def test_cierre07_inmunidad_roles_exentos(database_url: str):
    """Verifica que administrador_identidades, auditor_forense y ciudadano gocen de inmunidad de ámbito."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        res2 = await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2';"))
        loc2_id = res2.scalar_one()

        sufijo = uuid.uuid4().hex[:6]
        m2 = Mesa(
            tipo_mesa="TERRITORIAL",
            codigo_oficial=f"TEST-INM-{sufijo}",
            shortcode_ciudadano=f"TEST-I-{sufijo}",
            slug=f"test_inm_{sufijo}",
            ruta_jerarquica=f"csh.test_inm_{sufijo}",
            nombre=f"Mesa Inmunidad {sufijo}",
            territorio_id=loc2_id,
            aforo_maximo=50,
        )
        session.add(m2)
        await session.flush()

        # Probar cada rol exento
        for rol_nombre in ("administrador_identidades", "auditor_forense", "ciudadano"):
            sujeto = SujetoAutenticadoContexto(
                sujeto_id=uuid.uuid4(),
                correo=f"{rol_nombre}@cartagena.gov.co",
                rol=rol_nombre,
                permisos={"mesas:abrir"},
                nivel_identidad="declarada",
                es_anonimo=False,
                mfa_activo=False,
            )
            # Debe permitir sin importar que la mesa sea LOC-2
            assert await verificar_ambito_territorial(session, sujeto, mesa_id=m2.id) is True

    await engine.dispose()


async def test_cierre07_endpoints_administrativos_ambitos(app, settings, database_url: str):
    """Verifica endpoints GET/POST/DELETE /api/v1/identidad/usuarios/{id}/ambitos con RBAC y auditoría."""
    engine = create_async_engine(database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # 1. Crear administrador_identidades dedicado para la prueba
        rol_admin = (
            await session.execute(select(id_models.Rol).where(id_models.Rol.codigo == "administrador_identidades"))
        ).scalar_one()
        admin_id = uuid.uuid4()
        admin_correo = f"admin_cierre07_{uuid.uuid4().hex[:6]}@cartagena.gov.co"
        admin_u = id_models.Usuario(
            id=admin_id,
            correo=admin_correo,
            hash_contrasena="hash_dummy",
            nombres="Admin",
            apellidos="Identidades",
            rol_id=rol_admin.id,
            activo=True,
            correo_verificado_en=datetime.now(UTC),
        )
        session.add(admin_u)

        # Crear usuario objetivo (facilitador)
        rol_fac = (
            await session.execute(select(id_models.Rol).where(id_models.Rol.codigo == "facilitador_mesa"))
        ).scalar_one()
        obj_id = uuid.uuid4()
        usuario_obj = id_models.Usuario(
            id=obj_id,
            correo=f"facilitador_cierre07_gestion_{uuid.uuid4().hex[:6]}@cartagena.gov.co",
            hash_contrasena="hash_dummy",
            nombres="Carlos",
            apellidos="Facilitador",
            rol_id=rol_fac.id,
            activo=True,
            correo_verificado_en=datetime.now(UTC),
        )
        session.add(usuario_obj)
        await session.commit()

        from datetime import timedelta

        from app.modules.identidad.repository import IdentidadRepository

        repo = IdentidadRepository(session)
        exp = datetime.now(UTC) + timedelta(hours=8)
        sesion_admin = await repo.crear_sesion(admin_id, exp, "huella_hash_admin")
        sesion_ciudadano = await repo.crear_sesion(obj_id, exp, "huella_hash_ciudadano")
        await session.commit()

        sesion_admin_id = sesion_admin.id
        sesion_ciudadano_id = sesion_ciudadano.id

    await engine.dispose()

    # Tokens JWT
    token_admin = crear_token_acceso(
        admin_id,
        "administrador_identidades",
        "declarada",
        ["usuarios:crear", "usuarios:bloquear"],
        sesion_id=sesion_admin_id,
        settings=settings,
    )
    token_ciudadano = crear_token_acceso(
        obj_id,
        "ciudadano",
        "declarada",
        [],
        sesion_id=sesion_ciudadano_id,
        settings=settings,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Ciudadano intenta listar o asignar ámbitos -> 403 Forbidden
        r_denied = await client.get(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos",
            headers={"Authorization": f"Bearer {token_ciudadano}"},
        )
        assert r_denied.status_code == 403

        # B. Administrador lista ámbitos (inicialmente vacío)
        r_list = await client.get(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r_list.status_code == 200
        assert r_list.json() == []

        # C. Administrador asigna ámbito localidad LOC-1
        r_crear = await client.post(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={
                "tipo_ambito": "localidad",
                "identificador_territorial": "LOC-1",
                "motivo": "Asignación operativa de liderazgo en Localidad 1",
            },
        )
        assert r_crear.status_code == 201
        data_ambito = r_crear.json()
        assert data_ambito["tipo_ambito"] == "localidad"
        assert data_ambito["identificador_territorial"] == "LOC-1"
        assert data_ambito["activo"] is True
        ambito_id = data_ambito["id"]

        # D. Asignación duplicada -> 409 Conflict
        r_dup = await client.post(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={
                "tipo_ambito": "localidad",
                "identificador_territorial": "LOC-1",
                "motivo": "Intento de reasignación",
            },
        )
        assert r_dup.status_code == 409

        # E. Tipo de ámbito no permitido (ej. 'upz' conforme a Observación 3) -> 422 Unprocessable
        r_inv = await client.post(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={
                "tipo_ambito": "upz",
                "identificador_territorial": "UPZ-01",
                "motivo": "Invalido",
            },
        )
        assert r_inv.status_code == 422

        # F. Administrador lista ámbitos (ahora contiene 1 elemento)
        r_list2 = await client.get(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r_list2.status_code == 200
        assert len(r_list2.json()) == 1

        # G. Administrador revoca ámbito
        r_del = await client.delete(
            f"/api/v1/identidad/usuarios/{obj_id}/ambitos/{ambito_id}?motivo=Cese_de_funciones_territoriales",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r_del.status_code == 200
        assert r_del.json()["mensaje"] == "Ámbito territorial revocado exitosamente"

        # H. Verificar eventos de asignación y revocación en base de datos
        engine = create_async_engine(database_url)
        async with AsyncSession(engine, expire_on_commit=False) as session:
            ev_asig = await session.execute(
                select(id_models.EventoIdentidad).where(
                    id_models.EventoIdentidad.accion == "ambito_territorial_asignado",
                    id_models.EventoIdentidad.objetivo_id == obj_id,
                )
            )
            assert ev_asig.scalar_one_or_none() is not None

            ev_rev = await session.execute(
                select(id_models.EventoIdentidad).where(
                    id_models.EventoIdentidad.accion == "ambito_territorial_revocado",
                    id_models.EventoIdentidad.objetivo_id == obj_id,
                )
            )
            assert ev_rev.scalar_one_or_none() is not None
        await engine.dispose()
