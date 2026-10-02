import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.formularios.analitica import tabular_pregunta
from app.modules.formularios.constructor_service import ConstructorService
from app.modules.formularios.constructor_validation import validar_respuestas
from app.modules.formularios.errors import error_integridad
from app.modules.formularios.models import FormularioConsulta, RespuestaFormulario
from app.modules.formularios.repository import FormularioRepository
from app.modules.formularios.schemas import (
    AnaliticaFormularioRespuesta,
    FormularioActualizar,
    FormularioCrear,
    FormularioRespuesta,
    RespuestaFormularioCrear,
    RespuestaFormularioLectura,
)


class FormularioService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = FormularioRepository(session)

    async def listar_formularios(
        self,
        estado: str | None = None,
        dimension_id: uuid.UUID | None = None,
        territorio_id: uuid.UUID | None = None,
    ) -> list[FormularioRespuesta]:
        if estado and estado != "PUBLICADO":
            raise HTTPException(403, "Los borradores solo se consultan desde gestión")
        formularios = await self.repo.listar("PUBLICADO", dimension_id, territorio_id)
        respuestas_dto = []
        for f in formularios:
            conteo = await self.repo.contar_respuestas(f.id)
            dto = FormularioRespuesta.model_validate(f)
            dto.total_respuestas = conteo
            respuestas_dto.append(dto)
        return respuestas_dto

    async def obtener_formulario(self, formulario_id: uuid.UUID) -> FormularioRespuesta:
        f = await self.repo.obtener_por_id(formulario_id)
        if not f:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulario con id {formulario_id} no encontrado",
            )
        if f.estado != "PUBLICADO":
            raise HTTPException(403, "Formulario no publicado")
        conteo = await self.repo.contar_respuestas(f.id)
        dto = FormularioRespuesta.model_validate(f)
        dto.total_respuestas = conteo
        return dto

    async def crear_formulario(self, datos: FormularioCrear) -> FormularioRespuesta:
        async with transaction(self.session):
            existente = await self.repo.obtener_por_codigo(datos.codigo)
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe un formulario con el código '{datos.codigo}'",
                )

            nuevo = FormularioConsulta(
                codigo=datos.codigo,
                slug="consulta-" + uuid.uuid4().hex,
                titulo=datos.titulo,
                descripcion=datos.descripcion,
                dimension_id=datos.dimension_id,
                territorio_id=datos.territorio_id,
                estado=datos.estado,
                esquema_preguntas=[p.model_dump() for p in datos.esquema_preguntas],
                enfoque_diferencial_habilitado=datos.enfoque_diferencial_habilitado,
                permite_evidencias=datos.permite_evidencias,
                fecha_cierre=datos.fecha_cierre,
            )
            try:
                creado = await self.repo.crear(nuevo)
            except IntegrityError as error:
                raise error_integridad(error, "El código del formulario ya existe") from error
            return FormularioRespuesta.model_validate(creado)

    async def actualizar_formulario(
        self, formulario_id: uuid.UUID, datos: FormularioActualizar
    ) -> FormularioRespuesta:
        async with transaction(self.session):
            f = await self.repo.obtener_por_id(formulario_id, bloquear=True)
            if not f:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Formulario con id {formulario_id} no encontrado",
                )

            if f.documento_constructor:
                raise HTTPException(409, "Edite este formulario mediante el constructor")

            if datos.titulo is not None:
                f.titulo = datos.titulo
            if datos.descripcion is not None:
                f.descripcion = datos.descripcion
            if datos.estado is not None:
                f.estado = datos.estado
            if datos.esquema_preguntas is not None:
                if (
                    await self.repo.contar_respuestas(f.id)
                    and [p.model_dump() for p in datos.esquema_preguntas] != f.esquema_preguntas
                ):
                    raise HTTPException(
                        409, "El formulario tiene respuestas: conserve sus preguntas"
                    )
                f.esquema_preguntas = [p.model_dump() for p in datos.esquema_preguntas]
            if "fecha_cierre" in datos.model_fields_set:
                f.fecha_cierre = datos.fecha_cierre

            f.actualizado_en = datetime.now(UTC)
            await self.session.flush()
            conteo = await self.repo.contar_respuestas(f.id)
            dto = FormularioRespuesta.model_validate(f)
            dto.total_respuestas = conteo
            return dto

    async def eliminar_formulario(self, formulario_id: uuid.UUID) -> dict[str, str]:
        async with transaction(self.session):
            f = await self.repo.obtener_por_id(formulario_id, bloquear=True)
            if not f:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Formulario con id {formulario_id} no encontrado",
                )
            if await self.repo.contar_respuestas(f.id):
                raise HTTPException(
                    409, "El formulario tiene respuestas: ciérrelo para conservar el registro"
                )
            await self.repo.eliminar(f)
            return {"mensaje": f"Formulario {formulario_id} eliminado exitosamente"}

    async def enviar_respuesta(
        self,
        formulario_id: uuid.UUID,
        sujeto_id: uuid.UUID,
        datos: RespuestaFormularioCrear,
        *,
        es_anonimo: bool = False,
    ) -> RespuestaFormularioLectura:
        async with transaction(self.session):
            f = await self.repo.obtener_por_id(formulario_id, bloquear=True)
            if not f:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Formulario con id {formulario_id} no encontrado",
                )

            if f.estado != "PUBLICADO":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El formulario no está disponible para respuestas (estado: {f.estado})",
                )

            if f.fecha_cierre and datetime.now(UTC) > f.fecha_cierre:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El periodo de participación para esta consulta ha concluido",
                )

            if datos.evidencias and (f.documento_constructor or not f.permite_evidencias):
                raise HTTPException(
                    422, "Adjunte evidencias únicamente mediante los campos autorizados"
                )
            if f.documento_constructor:
                if (
                    f.documento_constructor["configuracion"].get("respuestaAnonima")
                    and not es_anonimo
                ):
                    raise HTTPException(403, "Este reporte requiere una sesión anónima")
                datos.datos_respuesta = validar_respuestas(
                    f.documento_constructor, datos.datos_respuesta
                )
            else:
                # Conservar números del contrato legado, validando también opciones y escalas.
                documento = (await ConstructorService(self.session).documento(f)).model_dump(
                    mode="json", exclude_none=True
                )
                originales = {
                    p["id"]: datos.datos_respuesta[p["id"]]
                    for p in f.esquema_preguntas
                    if p["id"] in datos.datos_respuesta
                    and datos.datos_respuesta[p["id"]] is not None
                }
                valores = dict(originales)
                for p in f.esquema_preguntas:
                    v = valores.get(p["id"])
                    if (
                        p["tipo"] == "escala_likert"
                        and isinstance(v, (int, float))
                        and not isinstance(v, bool)
                    ):
                        valores[p["id"]] = str(v)
                efectivas = validar_respuestas(documento, valores)
                datos.datos_respuesta = {k: originales[k] for k in efectivas}

            # Verificar si ya existe respuesta del sujeto
            existente = await self.repo.obtener_respuesta_sujeto(formulario_id, sujeto_id)
            if (
                existente
                and f.documento_constructor
                and f.documento_constructor["configuracion"].get("permitirEdicion")
            ):
                existente.datos_respuesta = datos.datos_respuesta
                existente.datos_enfoque = datos.datos_enfoque
                await self.session.flush()
                return RespuestaFormularioLectura.model_validate(existente)
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El participante ya ha enviado una respuesta a esta consulta.",
                )

            limite = (
                (f.documento_constructor or {}).get("configuracion", {}).get("limiteRespuestas")
            )
            if limite and await self.repo.contar_respuestas(f.id) >= limite:
                raise HTTPException(409, "Se alcanzó el límite de respuestas")

            nueva_respuesta = RespuestaFormulario(
                formulario_id=formulario_id,
                sujeto_id=sujeto_id,
                territorio_id=datos.territorio_id or f.territorio_id,
                datos_enfoque=datos.datos_enfoque,
                datos_respuesta=datos.datos_respuesta,
                evidencias=datos.evidencias,
            )

            try:
                guardada = await self.repo.guardar_respuesta(nueva_respuesta)
                return RespuestaFormularioLectura.model_validate(guardada)
            except IntegrityError as error:
                raise error_integridad(
                    error, "El participante ya ha enviado una respuesta"
                ) from error

    async def listar_respuestas(self, formulario_id: uuid.UUID) -> list[RespuestaFormularioLectura]:
        f = await self.repo.obtener_por_id(formulario_id)
        if not f:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulario con id {formulario_id} no encontrado",
            )
        respuestas = await self.repo.listar_respuestas(formulario_id)
        return [RespuestaFormularioLectura.model_validate(r) for r in respuestas]

    async def obtener_analitica(self, formulario_id: uuid.UUID) -> AnaliticaFormularioRespuesta:
        f = await self.repo.obtener_por_id(formulario_id)
        if not f:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulario con id {formulario_id} no encontrado",
            )

        respuestas = await self.repo.listar_respuestas(formulario_id)
        total = len(respuestas)

        tabulacion = {p["id"]: tabular_pregunta(p, respuestas) for p in f.esquema_preguntas}

        # Desglose enfoque diferencial (Ley 1448/11, Ley 1618/13)
        desglose_enfoque: dict[str, dict[str, int]] = {
            "etnia": {},
            "genero": {},
            "grupo_etario": {},
            "victima_conflicto": {"si": 0, "no": 0},
            "discapacidad": {"si": 0, "no": 0},
        }

        for r in respuestas:
            enf = r.datos_enfoque or {}
            etnia = enf.get("etnia", "No especificado")
            desglose_enfoque["etnia"][etnia] = desglose_enfoque["etnia"].get(etnia, 0) + 1

            genero = enf.get("genero", "No especificado")
            desglose_enfoque["genero"][genero] = desglose_enfoque["genero"].get(genero, 0) + 1

            edad = enf.get("grupo_etario", "No especificado")
            desglose_enfoque["grupo_etario"][edad] = (
                desglose_enfoque["grupo_etario"].get(edad, 0) + 1
            )

            if enf.get("victima_conflicto") is True:
                desglose_enfoque["victima_conflicto"]["si"] += 1
            else:
                desglose_enfoque["victima_conflicto"]["no"] += 1

            if enf.get("discapacidad") is True:
                desglose_enfoque["discapacidad"]["si"] += 1
            else:
                desglose_enfoque["discapacidad"]["no"] += 1

        # Desglose territorial
        desglose_territorio: dict[str, int] = {}
        for r in respuestas:
            tid = str(r.territorio_id) if r.territorio_id else "Distrital / Sin asignar"
            desglose_territorio[tid] = desglose_territorio.get(tid, 0) + 1

        return AnaliticaFormularioRespuesta(
            formulario_id=f.id,
            codigo=f.codigo,
            titulo=f.titulo,
            estado=f.estado,
            total_respuestas=total,
            tabulacion_preguntas=tabulacion,
            desglose_enfoque_diferencial=desglose_enfoque,
            desglose_territorial=desglose_territorio,
        )
