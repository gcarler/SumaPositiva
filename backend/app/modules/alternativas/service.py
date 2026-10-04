import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.core.transactions import transaction
from app.modules.alternativas.models import BancoAlternativas
from app.modules.alternativas.repository import AlternativasRepository
from app.modules.alternativas.schemas import AlternativaActualizar, AlternativaCrear


class AlternativasService:
    def __init__(self, repository: AlternativasRepository) -> None:
        self.repo = repository

    async def listar_alternativas(
        self,
        busqueda: str | None = None,
        sector: str | None = None,
        linea: str | None = None,
        dimension: str | None = None,
        estado: str | None = None,
        enfoque_etnico: str | None = None,
    ) -> Sequence[BancoAlternativas]:
        return await self.repo.listar(
            busqueda=busqueda,
            sector=sector,
            linea=linea,
            dimension=dimension,
            estado=estado,
            enfoque_etnico=enfoque_etnico,
        )

    async def obtener_alternativa(self, id_o_codigo: str | uuid.UUID) -> BancoAlternativas:
        alt = await self.repo.obtener_por_id_o_codigo(id_o_codigo)
        if not alt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alternativa '{id_o_codigo}' no encontrada.",
            )
        return alt

    async def crear_alternativa(
        self, datos: AlternativaCrear, actor_id: uuid.UUID | None = None
    ) -> BancoAlternativas:
        existente = await self.repo.obtener_por_codigo(datos.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una alternativa con el código '{datos.codigo}'.",
            )

        nueva = BancoAlternativas(
            codigo=datos.codigo.strip().upper(),
            nombre=datos.nombre.strip(),
            descripcion=datos.descripcion.strip(),
            sector=datos.sector,
            linea_estrategica_id=datos.linea_estrategica_id,
            linea_estrategica_codigo=datos.linea_estrategica_codigo,
            dimension_id=datos.dimension_id,
            dimension_codigo=datos.dimension_codigo,
            objetivo_central=datos.objetivo_central,
            territorio_cobertura=datos.territorio_cobertura,
            poblacion_objetivo_estimada=datos.poblacion_objetivo_estimada,
            costo_estimado_cop=datos.costo_estimado_cop,
            horizonte_anios=datos.horizonte_anios,
            fuentes_financiacion_sugeridas=datos.fuentes_financiacion_sugeridas,
            estado=datos.estado,
            requiere_consulta_previa=datos.requiere_consulta_previa,
            territorios_focalizados=datos.territorios_focalizados,
            metadatos=datos.metadatos,
        )

        justificacion = (
            f"Registro de nueva alternativa de solución MGA: {nueva.codigo} — {nueva.nombre} "
            f"(Sector: {nueva.sector}, Costo: ${nueva.costo_estimado_cop:,.2f} COP)."
        )

        async with transaction(self.repo.session):
            creado = await self.repo.crear(nueva)
            await self.repo.registrar_auditoria(
                registro_id=creado.id,
                accion="alternativa_creada",
                justificacion_motivada=justificacion,
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": creado.codigo,
                    "nombre": creado.nombre,
                    "sector": creado.sector,
                    "estado": creado.estado,
                    "costo_estimado_cop": str(creado.costo_estimado_cop),
                },
            )

        return creado

    async def actualizar_alternativa(
        self,
        id_o_codigo: str | uuid.UUID,
        datos: AlternativaActualizar,
        actor_id: uuid.UUID | None = None,
    ) -> BancoAlternativas:
        alt = await self.obtener_alternativa(id_o_codigo)

        cambios_detectados: dict[str, Any] = {}

        if datos.codigo and datos.codigo.strip().upper() != alt.codigo:
            existente = await self.repo.obtener_por_codigo(datos.codigo)
            if existente and existente.id != alt.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe otra iniciativa con el código '{datos.codigo}'.",
                )
            cambios_detectados["codigo"] = {"antes": alt.codigo, "despues": datos.codigo.strip().upper()}
            alt.codigo = datos.codigo.strip().upper()

        if datos.nombre is not None and datos.nombre.strip() != alt.nombre:
            cambios_detectados["nombre"] = {"antes": alt.nombre, "despues": datos.nombre.strip()}
            alt.nombre = datos.nombre.strip()

        if datos.descripcion is not None:
            alt.descripcion = datos.descripcion.strip()

        if datos.sector is not None and datos.sector != alt.sector:
            cambios_detectados["sector"] = {"antes": alt.sector, "despues": datos.sector}
            alt.sector = datos.sector

        if datos.linea_estrategica_id is not None:
            alt.linea_estrategica_id = datos.linea_estrategica_id
        if datos.linea_estrategica_codigo is not None:
            alt.linea_estrategica_codigo = datos.linea_estrategica_codigo
        if datos.dimension_id is not None:
            alt.dimension_id = datos.dimension_id
        if datos.dimension_codigo is not None:
            alt.dimension_codigo = datos.dimension_codigo
        if datos.objetivo_central is not None:
            alt.objetivo_central = datos.objetivo_central
        if datos.territorio_cobertura is not None:
            alt.territorio_cobertura = datos.territorio_cobertura
        if datos.poblacion_objetivo_estimada is not None:
            alt.poblacion_objetivo_estimada = datos.poblacion_objetivo_estimada
        if datos.costo_estimado_cop is not None:
            cambios_detectados["costo_estimado_cop"] = {
                "antes": str(alt.costo_estimado_cop),
                "despues": str(datos.costo_estimado_cop),
            }
            alt.costo_estimado_cop = datos.costo_estimado_cop
        if datos.horizonte_anios is not None:
            alt.horizonte_anios = datos.horizonte_anios
        if datos.fuentes_financiacion_sugeridas is not None:
            alt.fuentes_financiacion_sugeridas = datos.fuentes_financiacion_sugeridas
        if datos.estado is not None and datos.estado != alt.estado:
            cambios_detectados["estado"] = {"antes": alt.estado, "despues": datos.estado}
            alt.estado = datos.estado
        if datos.requiere_consulta_previa is not None:
            alt.requiere_consulta_previa = datos.requiere_consulta_previa
        if datos.territorios_focalizados is not None:
            alt.territorios_focalizados = datos.territorios_focalizados

        if datos.metadatos is not None:
            actual = dict(alt.metadatos or {})
            actual.update(datos.metadatos)
            alt.metadatos = actual

        alt.actualizado_en = datetime.now(UTC)

        justificacion = (
            datos.justificacion_motivada
            or f"Actualización de alternativa MGA {alt.codigo}: {', '.join(cambios_detectados.keys()) or 'metadatos'}."
        )

        async with transaction(self.repo.session):
            actualizado = await self.repo.actualizar(alt)
            await self.repo.registrar_auditoria(
                registro_id=actualizado.id,
                accion="alternativa_actualizada",
                justificacion_motivada=justificacion,
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": actualizado.codigo,
                    "cambios": cambios_detectados,
                },
            )

        return actualizado

    async def eliminar_alternativa(
        self, id_o_codigo: str | uuid.UUID, actor_id: uuid.UUID | None = None
    ) -> None:
        alt = await self.obtener_alternativa(id_o_codigo)

        # Regla de Integridad Referencial de Dominio: No eliminar si hay compromisos vinculados
        vinculados = await self.repo.contar_compromisos_vinculados(alt.codigo)
        if vinculados > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"No es posible eliminar la alternativa '{alt.codigo}' porque se encuentra "
                    f"vinculada a {vinculados} compromiso(s) institucional(es) del PAS."
                ),
            )

        justificacion = f"Eliminación de alternativa MGA '{alt.codigo}' ({alt.nombre}) del Banco Distrital."

        async with transaction(self.repo.session):
            await self.repo.registrar_auditoria(
                registro_id=alt.id,
                accion="alternativa_eliminada",
                justificacion_motivada=justificacion,
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": alt.codigo,
                    "nombre": alt.nombre,
                    "sector": alt.sector,
                },
            )
            await self.repo.eliminar(alt)
