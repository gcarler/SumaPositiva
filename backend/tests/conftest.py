"""Contexto reproducible de integración, exclusivo de una base polis_test*."""

import asyncio
import os
from pathlib import Path

# Configuración uniforme de entorno de pruebas para aislamiento forense (AUD-06 / OBS-09 / AUD-07)
os.environ.setdefault("POLIS_ENVIRONMENT", "test")
os.environ.setdefault("POLIS_JWT_SECRET_KEY", "polis_secreto_super_seguro_cartagena_2026")
os.environ.setdefault("POLIS_IP_SALT", "polis_salt_habeas_data_2026")
os.environ.setdefault(
    "POLIS_TEST_DATABASE_URL",
    "postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/polis_test",
)

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command


@pytest.fixture(scope="session")
def prepared_test_database():
    url = os.getenv("POLIS_TEST_DATABASE_URL")
    if not url:
        yield None
        return
    if not (make_url(url).database or "").startswith("polis_test"):
        pytest.fail("POLIS_TEST_DATABASE_URL debe apuntar a una base exclusiva polis_test*")
    # También las pruebas que instancian Settings() deben usar la base aislada.
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("POLIS_DATABASE_URL", url)
        # La suite de límites usa valores explícitos bajos; las regresiones no comparten cuota.
        patch.setenv("POLIS_IDENTIDAD_LIMITE_IP", "10000")
        patch.setenv("POLIS_IDENTIDAD_LIMITE_CUENTA", "1000")
        patch.setenv("POLIS_SESION_ANONIMA_LIMITE_IP", "10000")
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        command.upgrade(config, "head")
        yield url


@pytest.fixture(autouse=True)
def reset_in_memory_rate_limits():
    """Limpia contadores en memoria entre tests para evitar 429 cruzados en la suite."""
    try:
        from app.modules.sesion.router import _limite_ip_memoria
        _limite_ip_memoria.clear()
    except Exception:
        pass
    yield
    try:
        from app.modules.sesion.router import _limite_ip_memoria
        _limite_ip_memoria.clear()
    except Exception:
        pass


@pytest.fixture
def database_url(prepared_test_database):
    if not prepared_test_database:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva polis_test*")
    return prepared_test_database


@pytest.fixture(autouse=True)
def integration_context(request, prepared_test_database):
    if not {"database_url", "url_bd", "sessions"}.intersection(request.fixturenames):
        return
    if not prepared_test_database:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva polis_test*")

    async def prepare_context():
        engine = create_async_engine(prepared_test_database, hide_parameters=True)
        try:
            async with engine.begin() as connection:
                # La prueba de migraciones reconstruye las tablas entre escenarios.
                # Esta línea es dato de pruebas; no pertenece a las semillas del producto.
                await connection.execute(
                    text("""
                    INSERT INTO motor_politicas.lineas_estrategicas
                        (fase_id, dimension_id, codigo, titulo, descripcion)
                    SELECT fase.id, dimension.id, 'PRUEBA-INTEGRACION',
                        'Línea exclusiva de pruebas', 'Contexto para pruebas de persistencia'
                    FROM motor_politicas.fases_politica AS fase
                    CROSS JOIN motor_politicas.dimensiones_seguridad_humana AS dimension
                    WHERE NOT EXISTS (SELECT 1 FROM motor_politicas.lineas_estrategicas)
                    ORDER BY fase.codigo, dimension.codigo
                    LIMIT 1
                """)
                )
        finally:
            await engine.dispose()

    asyncio.run(prepare_context())


@pytest.fixture
def cabeceras_gestion(prepared_test_database):
    """Cuenta y sesión reales de autoridad en la base aislada, sin bypass de seguridad."""
    import uuid

    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.core.transactions import transaction
    from app.modules.identidad.repository import IdentidadRepository
    from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
    from app.modules.identidad.service import IdentidadService

    if not prepared_test_database:
        pytest.skip("Configura una base exclusiva de pruebas")

    async def iniciar():
        engine = create_async_engine(prepared_test_database, hide_parameters=True)
        try:
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            correo = f"gestion-{uuid.uuid4().hex}@example.org"
            async with sessions() as session:
                service = IdentidadService(session)
                usuario = await service.registrar_usuario(
                    UsuarioCreacion(
                        correo=correo,
                        contrasena="PruebaGestion2026*",
                        nombres="Gestión",
                        apellidos="Prueba",
                    )
                )
                async with transaction(session):
                    repo = IdentidadRepository(session)
                    cuenta = await repo.obtener_usuario_por_id(usuario.id)
                    rol = await repo.obtener_rol_por_codigo("autoridad_distrital")
                    cuenta.rol_id, cuenta.rol = rol.id, rol
                    await repo.guardar()
                return (
                    await service.autenticar_usuario(
                        LoginPeticion(correo=correo, contrasena="PruebaGestion2026*")
                    )
                ).token_acceso
        finally:
            await engine.dispose()

    return {"Authorization": f"Bearer {asyncio.run(iniciar())}"}


@pytest.fixture
def provisionar_usuario(prepared_test_database):
    """Promoción controlada en la base aislada; nunca habilita autorregistro privilegiado."""
    import uuid

    async def provisionar(client, datos):
        assert prepared_test_database is not None
        rol = datos.get("codigo_rol", "ciudadano")
        datos_publicos = {clave: valor for clave, valor in datos.items() if clave != "codigo_rol"}
        respuesta = client.post("/api/v1/identidad/registro", json=datos_publicos)
        assert respuesta.status_code == 201, respuesta.text
        assert respuesta.json()["codigo_rol"] == "ciudadano"
        assert respuesta.json()["id"]
        # Validar rol y permisos en persistencia, no solo en la respuesta de registro.
        engine = create_async_engine(prepared_test_database, hide_parameters=True)
        try:
            async with engine.connect() as connection:
                rol_real = await connection.scalar(
                    text("""
                        SELECT rol.codigo FROM autenticacion.usuarios AS usuario
                        JOIN autenticacion.roles AS rol ON rol.id = usuario.rol_id
                        WHERE usuario.id = :id
                    """),
                    {"id": uuid.UUID(respuesta.json()["id"])},
                )
                assert rol_real == "ciudadano"
        finally:
            await engine.dispose()
        engine = create_async_engine(prepared_test_database, hide_parameters=True)
        try:
            async with engine.begin() as connection:
                rol_id = await connection.scalar(
                    text("SELECT id FROM autenticacion.roles WHERE codigo = :rol"), {"rol": rol}
                )
                assert rol_id is not None
                await connection.execute(
                    text("UPDATE autenticacion.usuarios SET rol_id = :rol_id WHERE id = :id"),
                    {"rol_id": rol_id, "id": uuid.UUID(respuesta.json()["id"])},
                )
        finally:
            await engine.dispose()
        return respuesta

    return provisionar


@pytest.fixture
def provisionar_usuario_sync(provisionar_usuario):
    def provisionar(client, datos):
        return asyncio.run(provisionar_usuario(client, datos))

    return provisionar
