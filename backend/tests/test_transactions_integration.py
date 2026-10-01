"""Atomicidad real: cada comprobación utiliza una sesión observadora independiente."""

import asyncio
import io
import os
import uuid

import pytest
from PIL import Image
from sqlalchemy import func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.datastructures import Headers, UploadFile

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.aportes.models import PropuestaCiudadana
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate
from app.modules.aportes.service import AporteService
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.auditoria.schemas import DevolucionRazonCrear, DevolucionRazonRespuesta
from app.modules.evidencia.models import EvidenciaMultimedia
from app.modules.evidencia.service import EvidenciaService
from app.modules.identidad.models import Usuario  # noqa: F401 - registra la FK de auditoría/mesas
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.instrumentos.models import Instrumento, NodoInstrumento
from app.modules.instrumentos.repository import InstrumentoRepository
from app.modules.instrumentos.schemas import (
    ConversionObjetivosPeticion,
    InstrumentoCrear,
    NodoInstrumentoCrear,
)
from app.modules.instrumentos.service import InstrumentoService
from app.modules.mesas.models import ActaComunitaria, Mesa, ParticipanteMesa
from app.modules.mesas.repository import MesaRepository
from app.modules.mesas.schemas import ActaCrear, MesaCrear, ParticipanteCrear
from app.modules.mesas.service import MesaService
from app.modules.politicas.models import LineaEstrategica

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


async def crear_arbol(session):
    service = InstrumentoService(InstrumentoRepository(session))
    origen = await service.crear_instrumento(
        InstrumentoCrear(tipo_instrumento="ARBOL_PROBLEMAS", nombre=f"Prueba {uuid.uuid4()}")
    )
    central = await service.agregar_nodo(
        origen.id,
        NodoInstrumentoCrear(tipo_nodo="PROBLEMA_CENTRAL", contenido="Falta de iluminación"),
    )
    await service.agregar_nodo(
        origen.id,
        NodoInstrumentoCrear(
            tipo_nodo="CAUSA_DIRECTA", contenido="Falta de mantenimiento", nodo_padre_id=central.id
        ),
    )
    return service, origen


async def crear_mesa(session):
    key = uuid.uuid4().hex[:12]
    service = MesaService(MesaRepository(session))
    mesa = await service.crear_mesa_raiz(
        MesaCrear(tipo_mesa="TERRITORIAL", codigo_oficial=key, shortcode_ciudadano=key, nombre=key)
    )
    return service, mesa


async def test_repositorio_flush_no_confirma_y_rollback_descarta(sessions):
    async with sessions() as session:
        repo = InstrumentoRepository(session)
        nuevo = await repo.crear_instrumento(
            Instrumento(tipo_instrumento="ARBOL_PROBLEMAS", nombre="Sin confirmar")
        )
        nuevo_id = nuevo.id
        async with sessions() as observer:
            assert await observer.get(Instrumento, nuevo_id) is None
        await session.rollback()
    async with sessions() as observer:
        assert await observer.get(Instrumento, nuevo_id) is None


@pytest.mark.parametrize("error", [ValueError("validación"), asyncio.CancelledError()])
async def test_error_y_cancelacion_revierten_escritura_real(sessions, error):
    async with sessions() as session:
        with pytest.raises(type(error)):
            async with transaction(session):
                nuevo = await InstrumentoRepository(session).crear_instrumento(
                    Instrumento(tipo_instrumento="ARBOL_PROBLEMAS", nombre="Debe revertirse")
                )
                nuevo_id = nuevo.id
                raise error
        assert not session.in_transaction()
    async with sessions() as observer:
        assert await observer.get(Instrumento, nuevo_id) is None


async def test_error_real_de_commit_revierte_todas_las_escrituras(sessions):
    # Restricción diferida: los INSERT pasan y PostgreSQL rechaza el COMMIT.
    table = f"test_commit_{uuid.uuid4().hex}"
    async with sessions() as setup, setup.begin():
        await setup.execute(
            text(
                f"CREATE TABLE public.{table} (valor integer UNIQUE DEFERRABLE INITIALLY DEFERRED)"
            )
        )
    try:
        async with sessions() as session:
            with pytest.raises(IntegrityError):
                async with transaction(session):
                    nuevo = await InstrumentoRepository(session).crear_instrumento(
                        Instrumento(tipo_instrumento="ARBOL_PROBLEMAS", nombre="Commit fallido")
                    )
                    nuevo_id = nuevo.id
                    await session.execute(text(f"INSERT INTO public.{table} VALUES (1), (1)"))
            assert not session.in_transaction()
        async with sessions() as observer:
            assert await observer.get(Instrumento, nuevo_id) is None
            assert await observer.scalar(text(f"SELECT count(*) FROM public.{table}")) == 0
    finally:
        async with sessions() as cleanup, cleanup.begin():
            await cleanup.execute(text(f"DROP TABLE public.{table}"))


async def test_conversion_confirma_arbol_nodos_y_origen_juntos(sessions):
    async with sessions() as session:
        service, origen = await crear_arbol(session)
        # La lectura previa activa autobegin; el caso de uso conserva esa transacción.
        await service.obtener_instrumento(origen.id)
        resultado = await service.convertir_a_objetivos(origen.id, ConversionObjetivosPeticion())
    async with sessions() as observer:
        assert (await observer.get(Instrumento, origen.id)).estado == "CONVERTIDO"
        assert await observer.get(Instrumento, resultado.instrumento.id) is not None
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(NodoInstrumento)
                .where(NodoInstrumento.instrumento_id == resultado.instrumento.id)
            )
            == 2
        )


@pytest.mark.parametrize("etapa", ["nodos", "origen", "respuesta"])
async def test_conversion_fallida_no_deja_arbol_nodos_ni_estado_parcial(
    sessions, monkeypatch, etapa
):
    async with sessions() as session:
        service, origen = await crear_arbol(session)
        original = {
            "nodos": service.repository.crear_nodos_lote,
            "origen": service.repository.actualizar_instrumento,
            "respuesta": service.serializar_arbol,
        }[etapa]

        async def fallar_despues_de_escribir(*args, **kwargs):
            await original(*args, **kwargs)
            raise ValueError("fallo inyectado")

        target, method = {
            "nodos": (service.repository, "crear_nodos_lote"),
            "origen": (service.repository, "actualizar_instrumento"),
            "respuesta": (service, "serializar_arbol"),
        }[etapa]
        monkeypatch.setattr(target, method, fallar_despues_de_escribir)
        with pytest.raises(ValueError, match="fallo inyectado"):
            await service.convertir_a_objetivos(origen.id, ConversionObjetivosPeticion())
        assert not session.in_transaction()
        assert (await service.obtener_instrumento(origen.id)).estado == "EN_CONSTRUCCION"
    async with sessions() as observer:
        assert (await observer.get(Instrumento, origen.id)).estado == "EN_CONSTRUCCION"
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(Instrumento)
                .where(Instrumento.instrumento_origen_id == origen.id)
            )
            == 0
        )
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(NodoInstrumento)
                .where(
                    NodoInstrumento.nodo_origen_id.is_not(None),
                    NodoInstrumento.instrumento_id.in_(
                        select(Instrumento.id).where(Instrumento.instrumento_origen_id == origen.id)
                    ),
                )
            )
            == 0
        )


async def test_participante_y_contador_se_revierten_juntos(sessions, monkeypatch):
    async with sessions() as session:
        service, mesa = await crear_mesa(session)
        original = service.repository.actualizar_mesa

        async def fallar(mesa):
            await original(mesa)
            raise ValueError("fallo contador")

        monkeypatch.setattr(service.repository, "actualizar_mesa", fallar)
        with pytest.raises(ValueError, match="fallo contador"):
            await service.registrar_participante(
                mesa.id, ParticipanteCrear(sujeto_id=str(uuid.uuid4()), nombre_completo="Prueba")
            )
    async with sessions() as observer:
        assert (await observer.get(Mesa, mesa.id)).total_asistentes == 0
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(ParticipanteMesa)
                .where(ParticipanteMesa.mesa_id == mesa.id)
            )
            == 0
        )


async def test_participantes_concurrentes_conservan_contador(sessions):
    async with sessions() as setup:
        _, mesa = await crear_mesa(setup)

    async def registrar():
        async with sessions() as session:
            service = MesaService(MesaRepository(session))
            return await service.registrar_participante(
                mesa.id, ParticipanteCrear(sujeto_id=str(uuid.uuid4()), nombre_completo="Prueba")
            )

    participantes = await asyncio.gather(registrar(), registrar(), registrar())
    assert len({p.id for p in participantes}) == 3
    async with sessions() as observer:
        assert (await observer.get(Mesa, mesa.id)).total_asistentes == 3
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(ParticipanteMesa)
                .where(ParticipanteMesa.mesa_id == mesa.id)
            )
            == 3
        )


async def test_cierre_acta_fallido_revierte_acta_y_mesa(sessions, monkeypatch):
    async with sessions() as session:
        service, mesa = await crear_mesa(session)
        acta = await service.crear_o_actualizar_borrador_acta(
            mesa.id, ActaCrear(numero_acta=uuid.uuid4().hex, resumen_deliberacion="Prueba")
        )
        original = session.refresh

        async def fallar_refresh(modelo, *args, **kwargs):
            await original(modelo, *args, **kwargs)
            raise ValueError("fallo cierre")

        monkeypatch.setattr(session, "refresh", fallar_refresh)
        with pytest.raises(ValueError, match="fallo cierre"):
            await service.cerrar_acta(mesa.id)
    async with sessions() as observer:
        assert (await observer.get(ActaComunitaria, acta.id)).estado == "BORRADOR"
        guardada = await observer.get(Mesa, mesa.id)
        assert guardada.estado == "PROGRAMADA"
        assert guardada.sha256_acta is None


async def test_devolucion_fallida_no_rechaza_propuesta_ni_persiste_auditoria(sessions, monkeypatch):
    async with sessions() as session:
        linea_id = await session.scalar(select(LineaEstrategica.id).limit(1))
        assert linea_id is not None, "La base de pruebas requiere una línea de contexto"
        service = AporteService(AporteRepository(session))
        propuesta = await service.crear_propuesta(
            PropuestaCiudadanaCreate(
                linea_id=linea_id, titulo="Prueba de devolución", descripcion="Caso transaccional"
            )
        )

        def fallar_validacion(*args, **kwargs):
            raise ValueError("respuesta inválida")

        monkeypatch.setattr(DevolucionRazonRespuesta, "model_validate", fallar_validacion)
        sujeto = SujetoAutenticadoContexto(
            sujeto_id=uuid.uuid4(),
            rol="ciudadano_anonimo",
            nivel_identidad="anonima",
            permisos=[],
            es_anonimo=True,
        )
        with pytest.raises(ValueError, match="respuesta inválida"):
            await service.registrar_devolucion_motivada(
                propuesta.id,
                DevolucionRazonCrear(
                    causal="tecnica", justificacion_motivada="Justificación técnica de prueba"
                ),
                sujeto,
            )
    async with sessions() as observer:
        assert (await observer.get(PropuestaCiudadana, propuesta.id)).estado == "publicado"
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(RegistroAuditoria)
                .where(RegistroAuditoria.registro_id == propuesta.id)
            )
            == 0
        )


@pytest.mark.parametrize("fallo", ["restriccion", "commit"])
async def test_evidencia_fallida_limpia_archivo_y_registro(sessions, monkeypatch, tmp_path, fallo):
    async with sessions() as session:
        service = EvidenciaService(
            session, Settings(_env_file=None, environment="test", directorio_subidas=tmp_path)
        )
        if fallo == "commit":

            async def fallar_commit():
                raise ValueError("commit fallido")

            monkeypatch.setattr(session, "commit", fallar_commit)
        image_bytes = io.BytesIO()
        Image.new("RGB", (8, 8)).save(image_bytes, format="PNG")
        image_bytes.seek(0)
        archivo = UploadFile(
            file=image_bytes, filename="prueba.png", headers=Headers({"content-type": "image/png"})
        )
        sujeto = SujetoAutenticadoContexto(
            sujeto_id=uuid.uuid4(),
            rol="ciudadano_anonimo",
            nivel_identidad="anonima",
            permisos=[],
            es_anonimo=True,
        )
        with pytest.raises(IntegrityError if fallo == "restriccion" else ValueError):
            await service.guardar_evidencia(
                archivo, sujeto, propuesta_id=uuid.uuid4() if fallo == "restriccion" else None
            )
        assert list(tmp_path.iterdir()) == []
    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(EvidenciaMultimedia)
                .where(EvidenciaMultimedia.autor_sujeto_id == sujeto.sujeto_id)
            )
            == 0
        )


@pytest.mark.parametrize("caso", ["asignacion", "ficha", "medicion", "formulario"])
async def test_nuevos_modulos_revierten_si_falla_la_respuesta(sessions, monkeypatch, caso):
    from datetime import date

    from app.modules.indicadores.models import FichaTecnicaIndicador, MedicionIndicador
    from app.modules.indicadores.repository import IndicadoresRepository
    from app.modules.indicadores.schemas import (
        FichaIndicadorCrear,
        FichaIndicadorRespuesta,
        MedicionIndicadorCrear,
        MedicionIndicadorRespuesta,
    )
    from app.modules.indicadores.service import IndicadoresService
    from app.modules.presupuesto.models import AsignacionPresupuestal, FuenteFinanciacion
    from app.modules.presupuesto.repository import PresupuestoRepository
    from app.modules.presupuesto.schemas import (
        AsignacionPresupuestalCrear,
        AsignacionPresupuestalRespuesta,
    )
    from app.modules.presupuesto.service import PresupuestoService

    async with sessions() as session:
        ficha = await session.scalar(
            select(FichaTecnicaIndicador).where(FichaTecnicaIndicador.codigo == "IND-INS-01")
        )
        assert ficha is not None
        ficha_id = ficha.id
        valor_anterior = ficha.valor_actual
        avance_anterior = ficha.porcentaje_avance
        if caso == "asignacion":
            fuente_id = await session.scalar(select(FuenteFinanciacion.id).limit(1))
            assert fuente_id is not None
            datos = AsignacionPresupuestalCrear(
                fuente_financiacion_id=fuente_id,
                monto_estimado="1000.00",
                anio_vigencia=date.today().year,
                justificacion="Asignación exclusiva de prueba de rollback",
            )
            servicio = PresupuestoService(PresupuestoRepository(session))

            async def operacion():
                return await servicio.crear_asignacion(datos)

            modelo = AsignacionPresupuestal
            respuesta = AsignacionPresupuestalRespuesta
        elif caso == "ficha":
            datos = FichaIndicadorCrear.model_validate(ficha, from_attributes=True).model_copy(
                update={"codigo": f"ROLLBACK-{uuid.uuid4()}"}
            )
            servicio = IndicadoresService(IndicadoresRepository(session))

            async def operacion():
                return await servicio.crear_ficha(datos)

            modelo = FichaTecnicaIndicador
            respuesta = FichaIndicadorRespuesta
        elif caso == "formulario":
            from app.modules.formularios.models import FormularioConsulta
            from app.modules.formularios.schemas import FormularioCrear, FormularioRespuesta
            from app.modules.formularios.service import FormularioService

            datos = FormularioCrear(
                codigo=f"ROLLBACK-{uuid.uuid4()}",
                titulo="Formulario Rollback",
                descripcion="Prueba rollback formularios",
                esquema_preguntas=[],
            )
            servicio = FormularioService(session)

            async def operacion():
                return await servicio.crear_formulario(datos)

            modelo = FormularioConsulta
            respuesta = FormularioRespuesta
        else:
            datos = MedicionIndicadorCrear(
                periodo="PRUEBA",
                fecha_corte=date.today(),
                valor_medido="3000000000",
                registrado_por="Prueba de rollback",
            )
            servicio = IndicadoresService(IndicadoresRepository(session))

            async def operacion():
                return await servicio.registrar_medicion(ficha_id, datos)

            modelo = MedicionIndicador
            respuesta = MedicionIndicadorRespuesta
        cantidad_anterior = await session.scalar(select(func.count()).select_from(modelo))

        def fallar_validacion(cls, registro):
            # La respuesta se construye después del flush: hay una escritura efectiva.
            assert registro.id is not None
            raise ValueError("Respuesta inválida inyectada después del flush")

        monkeypatch.setattr(respuesta, "model_validate", classmethod(fallar_validacion))
        with pytest.raises(ValueError, match="Respuesta inválida"):
            await operacion()

    async with sessions() as observador:
        assert (
            await observador.scalar(select(func.count()).select_from(modelo)) == cantidad_anterior
        )
        ficha_persistida = await observador.get(FichaTecnicaIndicador, ficha_id)
        assert ficha_persistida.valor_actual == valor_anterior
        assert ficha_persistida.porcentaje_avance == avance_anterior
