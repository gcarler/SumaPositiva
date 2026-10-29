"""Transmisión por bloques de anexos y purga auditada de ficheros eliminados.

La purga es de solo lectura en la base: el registro de auditoría del borrado
lógico no se altera. Los ficheros de prueba se crean en un directorio temporal
propio; nunca se tocan los anexos del volumen real.
"""

import hashlib
import io
import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.datastructures import UploadFile

from app.modules.proyectos.service import (
    MAX_BYTES_ANEXO,
    _transmitir_archivo_a_disco,
)
from scripts.limpiar_anexos_eliminados import (
    _resolver_segura,
    purgar_ficheros_eliminados,
)

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def sessions():
    url = os.getenv("POLIS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base polis_test*")
    if not (make_url(url).database or "").startswith("polis_test"):
        pytest.fail("Se requiere una base exclusiva polis_test*")
    engine = create_async_engine(url, hide_parameters=True)
    try:
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()


def _archivo(contenido: bytes) -> UploadFile:
    return UploadFile(filename="anexo_servicio_comunitario.pdf", file=io.BytesIO(contenido))


# ----------------------------------------------------------------------------
# Transmisión por bloques (subida)
# ----------------------------------------------------------------------------


async def test_transmision_escribe_completo_y_calcula_hash(tmp_path):
    contenido = b"%PDF-1.4 Informe institucional de avance POLIS " * 5000
    ruta = tmp_path / "anexo_test.pdf"

    recibido, digesto = await _transmitir_archivo_a_disco(_archivo(contenido), ruta)

    assert ruta.read_bytes() == contenido
    assert recibido == len(contenido)
    assert digesto == hashlib.sha256(contenido).hexdigest()


async def test_transmision_aborta_413_con_limite_tamano(tmp_path):
    ruta = tmp_path / "anexo_enorme.pdf"
    enorme = b"x" * (MAX_BYTES_ANEXO + 1)

    with pytest.raises(HTTPException) as capturada:
        await _transmitir_archivo_a_disco(_archivo(enorme), ruta)

    assert capturada.value.status_code == 413
    # La transmisión compensa su fichero parcial antes de propagar el 413.


async def test_transmision_archivo_vacio(tmp_path):
    ruta = tmp_path / "anexo_vacio.pdf"
    recibido, _ = await _transmitir_archivo_a_disco(_archivo(b""), ruta)
    assert recibido == 0


def test_resolver_segura_confinna_al_directorio(tmp_path):
    dentro = _resolver_segura(None, "seguro.pdf", tmp_path)
    assert dentro == tmp_path / "seguro.pdf"

    fuera = _resolver_segura("/etc/passwd", "seguro.pdf", tmp_path)
    assert fuera is None


# ----------------------------------------------------------------------------
# Purga de ficheros de anexos eliminados (integración con base polis_test*)
# ----------------------------------------------------------------------------

_INSERT_ANEXO = text(
    """
    INSERT INTO participacion_ciudadana.actividades_anexos
        (id, actividad_id, modulo_dueno, recurso_id, nombre_archivo_original,
         nombre_archivo_seguro, ruta_almacenamiento, tipo_mime, tamano_bytes,
         hash_sha256, creado_en, eliminado_en)
    VALUES (:id, :actividad_id, 'comunicaciones', :recurso_id,
            'informe_purga_servicio_comunitario.pdf', :nombre_seguro, :ruta,
            'application/pdf', 1024, :hash_sha256, now() - interval '90 days',
            :eliminado_en)
    """
)


_CORTES = {
    "antiguo": datetime.now(UTC) - timedelta(days=60),
    "reciente": datetime.now(UTC),
}


async def _insertar_anexo_eliminado(
    sessions,
    *,
    id_anexo: uuid.UUID,
    ruta,
    nombre_seguro: str,
    eliminado_en: datetime,
) -> None:
    async with sessions() as session:
        await session.execute(
            _INSERT_ANEXO,
            {
                "id": id_anexo,
                "actividad_id": f"comunicaciones:{uuid.uuid4()}",
                "recurso_id": str(uuid.uuid4()),
                "nombre_seguro": nombre_seguro,
                "ruta": str(ruta),
                "hash_sha256": hashlib.sha256(b"purga de pruebas").hexdigest(),
                "eliminado_en": eliminado_en,
            },
        )
        await session.commit()


async def test_purga_elimina_ficheros_de_anexos_eliminados(sessions, tmp_path):
    id_anexo = uuid.uuid4()
    nombre_seguro = f"{id_anexo.hex}_informe_purga.pdf"
    destino = tmp_path / nombre_seguro
    destino.write_bytes(b"anexo eliminado hace 60 dias")
    await _insertar_anexo_eliminado(
        sessions, id_anexo=id_anexo, ruta=destino, nombre_seguro=nombre_seguro, eliminado_en=_CORTES["antiguo"]
    )

    resultado = await purgar_ficheros_eliminados(sessions, dias_retencion=30, directorio=tmp_path, aplicar=True)

    assert str(id_anexo) in resultado["ficheros_purgados"]
    assert not destino.exists()
    # La base es compartida entre suites: solo se exige sin errores para el
    # anexo propio de esta prueba (filas residuales pueden reportar rutas de
    # corridas anteriores).
    assert not any(e["id"] == str(id_anexo) for e in resultado["errores"])


async def test_purga_conserva_anexos_eliminados_recientes(sessions, tmp_path):
    id_anexo = uuid.uuid4()
    nombre_seguro = f"{id_anexo.hex}_informe_reciente.pdf"
    destino = tmp_path / nombre_seguro
    destino.write_bytes(b"anexo eliminado hoy")
    await _insertar_anexo_eliminado(
        sessions, id_anexo=id_anexo, ruta=destino, nombre_seguro=nombre_seguro, eliminado_en=_CORTES["reciente"]
    )

    resultado = await purgar_ficheros_eliminados(sessions, dias_retencion=30, directorio=tmp_path, aplicar=True)

    assert str(id_anexo) not in resultado["ficheros_purgados"]
    assert destino.exists()


async def test_purga_huerfanos_solo_de_dentro_del_directorio(sessions, tmp_path):
    huerfano = tmp_path / f"{uuid.uuid4().hex}_huerfano_proyectos.pdf"
    huerfano.write_bytes(b"fichero sin fila registrada")
    anterior = _CORTES["antiguo"].timestamp()
    os.utime(huerfano, (anterior, anterior))

    resultado = await purgar_ficheros_eliminados(
        sessions, dias_retencion=30, directorio=tmp_path, incluir_huerfanos=True, aplicar=True
    )

    assert huerfano.name in resultado["huerfanos_purgados"]
    assert not huerfano.exists()


async def test_purga_reporta_ruta_externa_sin_borrar(sessions, tmp_path):
    id_anexo = uuid.uuid4()
    nombre_seguro = f"{id_anexo.hex}_ruta_ajena.pdf"
    fichero_ajeno = tmp_path.parent / f"{id_anexo.hex}_ajeno.pdf"
    fichero_ajeno.write_bytes(b"fuera del directorio de anexos")
    await _insertar_anexo_eliminado(
        sessions,
        id_anexo=id_anexo,
        ruta=fichero_ajeno,
        nombre_seguro=nombre_seguro,
        eliminado_en=_CORTES["antiguo"],
    )
    try:
        resultado = await purgar_ficheros_eliminados(sessions, dias_retencion=30, directorio=tmp_path, aplicar=True)

        assert str(id_anexo) not in resultado["ficheros_purgados"]
        assert fichero_ajeno.exists()
        motivos = {e["motivo"] for e in resultado["errores"]}
        assert "ruta_almacenamiento_fuera_del_directorio" in motivos
    finally:
        fichero_ajeno.unlink(missing_ok=True)
