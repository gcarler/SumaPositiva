import uuid
from collections.abc import Sequence
from datetime import UTC, date, datetime

from fastapi import HTTPException, status

from app.core.transactions import transaction
from app.modules.compromisos.models import CompromisoPAS
from app.modules.compromisos.repository import CompromisosRepository
from app.modules.compromisos.schemas import (
    CompromisoPASActualizar,
    CompromisoPASActualizarAvance,
    CompromisoPASCrear,
    KpisSeguimientoRespuesta,
)


class CompromisosService:
    def __init__(self, repository: CompromisosRepository) -> None:
        self.repo = repository

    async def listar_compromisos(
        self,
        busqueda: str | None = None,
        entidad: str | None = None,
        estado: str | None = None,
    ) -> Sequence[CompromisoPAS]:
        return await self.repo.listar(busqueda=busqueda, entidad=entidad, estado=estado)

    async def obtener_compromiso(self, id_o_codigo: str | uuid.UUID) -> CompromisoPAS:
        compromiso = await self.repo.obtener_por_id_o_codigo(id_o_codigo)
        if not compromiso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Compromiso '{id_o_codigo}' no encontrado.",
            )
        return compromiso

    async def crear_compromiso(
        self, datos: CompromisoPASCrear, actor_id: uuid.UUID | None = None
    ) -> CompromisoPAS:
        existente = await self.repo.obtener_por_id_o_codigo(datos.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un compromiso con el código '{datos.codigo}'.",
            )

        meta = datos.meta_cuatrienal_valor if datos.meta_cuatrienal_valor > 0 else 1.0
        if datos.avance_cuatrienal_valor is not None:
            porcentaje = (
                datos.porcentaje_cumplimiento
                if datos.porcentaje_cumplimiento is not None
                else min(100.0, max(0.0, round((datos.avance_cuatrienal_valor / meta) * 100.0, 2)))
            )
            estado = datos.estado if datos.estado != "sin_reporte" else "en_ejecucion"
        else:
            porcentaje = None
            estado = datos.estado

        compromiso = CompromisoPAS(
            codigo=datos.codigo.strip().upper(),
            nombre=datos.nombre.strip(),
            descripcion=datos.descripcion.strip(),
            entidad_responsable=datos.entidad_responsable.strip(),
            linea_estrategica_codigo=datos.linea_estrategica_codigo.strip().upper(),
            alternativa_mga_codigo=datos.alternativa_mga_codigo.strip().upper(),
            indicador_asociado_codigo=datos.indicador_asociado_codigo.strip().upper(),
            meta_cuatrienal_descripcion=datos.meta_cuatrienal_descripcion.strip(),
            meta_cuatrienal_valor=datos.meta_cuatrienal_valor,
            unidad_medida=datos.unidad_medida.strip(),
            avance_cuatrienal_valor=datos.avance_cuatrienal_valor,
            porcentaje_cumplimiento=porcentaje,
            presupuesto_anual_cop=datos.presupuesto_anual_cop,
            vigencias_programadas=datos.vigencias_programadas or [2026, 2027, 2028, 2029],
            estado=datos.estado,
            fecha_corte_ultimo_reporte=datos.fecha_corte_ultimo_reporte,
            metadatos=datos.metadatos,
        )

        async with transaction(self.repo.session):
            creado = await self.repo.crear(compromiso)

            # Registro pericial inmutable en auditoría forense
            await self.repo.registrar_auditoria(
                registro_id=creado.id,
                accion="compromiso_creado",
                justificacion_motivada=f"Creación del compromiso institucional PAS {creado.codigo}: '{creado.nombre}'.",
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": creado.codigo,
                    "entidad": creado.entidad_responsable,
                    "meta": float(creado.meta_cuatrienal_valor),
                    "presupuesto": float(creado.presupuesto_anual_cop),
                },
            )

        return creado

    async def actualizar_avance(
        self,
        id_o_codigo: str | uuid.UUID,
        datos: CompromisoPASActualizarAvance,
        actor_id: uuid.UUID | None = None,
    ) -> CompromisoPAS:
        compromiso = await self.obtener_compromiso(id_o_codigo)

        if datos.avance_cuatrienal_valor is not None:
            meta = float(compromiso.meta_cuatrienal_valor) if compromiso.meta_cuatrienal_valor > 0 else 1.0
            nuevo_avance = float(datos.avance_cuatrienal_valor)
            porcentaje = min(100.0, max(0.0, round((nuevo_avance / meta) * 100.0, 2)))
            compromiso.avance_cuatrienal_valor = nuevo_avance
            compromiso.porcentaje_cumplimiento = porcentaje
        else:
            nuevo_avance = compromiso.avance_cuatrienal_valor
            porcentaje = compromiso.porcentaje_cumplimiento

        if datos.estado:
            nuevo_estado = datos.estado
        elif porcentaje is not None:
            if porcentaje >= 100.0:
                nuevo_estado = "cumplido"
            elif porcentaje < 30.0:
                nuevo_estado = "retrasado"
            elif porcentaje < 50.0:
                nuevo_estado = "en_riesgo"
            else:
                nuevo_estado = "en_ejecucion"
        else:
            nuevo_estado = compromiso.estado

        compromiso.estado = nuevo_estado
        if datos.fecha_corte_ultimo_reporte:
            compromiso.fecha_corte_ultimo_reporte = datos.fecha_corte_ultimo_reporte

        metadatos = dict(compromiso.metadatos or {})
        if datos.observacion_cualitativa:
            metadatos["observacion_cualitativa"] = datos.observacion_cualitativa
        if datos.url_evidencia:
            metadatos["url_evidencia"] = datos.url_evidencia
        metadatos["ultima_modificacion"] = datetime.now(UTC).isoformat()
        compromiso.metadatos = metadatos

        justificacion = (
            f"Actualización de avance de compromiso {compromiso.codigo}: "
            f"avance={nuevo_avance} {compromiso.unidad_medida} ({porcentaje}%), estado={nuevo_estado}."
        )
        if datos.observacion_cualitativa:
            justificacion += f" Observación: {datos.observacion_cualitativa}"

        async with transaction(self.repo.session):
            actualizado = await self.repo.actualizar(compromiso)

            # Registro pericial inmutable en auditoría forense
            await self.repo.registrar_auditoria(
                registro_id=actualizado.id,
                accion="compromiso_actualizado",
                justificacion_motivada=justificacion,
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": actualizado.codigo,
                    "avance_cuatrienal_valor": nuevo_avance,
                    "porcentaje_cumplimiento": porcentaje,
                    "estado": nuevo_estado,
                    "fecha_corte": str(actualizado.fecha_corte_ultimo_reporte),
                },
            )

        return actualizado

    async def actualizar_compromiso(
        self,
        id_o_codigo: str | uuid.UUID,
        datos: CompromisoPASActualizar,
        actor_id: uuid.UUID | None = None,
    ) -> CompromisoPAS:
        compromiso = await self.obtener_compromiso(id_o_codigo)

        campos_actualizados = []
        for campo, valor in datos.model_dump(exclude_unset=True).items():
            if valor is not None:
                setattr(compromiso, campo, valor)
                campos_actualizados.append(campo)

        # Recalcular porcentaje si cambio avance o meta
        if "avance_cuatrienal_valor" in campos_actualizados or "meta_cuatrienal_valor" in campos_actualizados:
            meta = float(compromiso.meta_cuatrienal_valor) if compromiso.meta_cuatrienal_valor > 0 else 1.0
            compromiso.porcentaje_cumplimiento = min(
                100.0, max(0.0, round((float(compromiso.avance_cuatrienal_valor) / meta) * 100.0, 2))
            )

        async with transaction(self.repo.session):
            actualizado = await self.repo.actualizar(compromiso)

            await self.repo.registrar_auditoria(
                registro_id=actualizado.id,
                accion="compromiso_actualizado",
                justificacion_motivada=f"Actualización general de compromiso {actualizado.codigo} (campos: {', '.join(campos_actualizados)}).",
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={"codigo": actualizado.codigo, "campos": campos_actualizados},
            )

        return actualizado

    async def eliminar_compromiso(
        self, id_o_codigo: str | uuid.UUID, actor_id: uuid.UUID | None = None
    ) -> None:
        compromiso = await self.obtener_compromiso(id_o_codigo)
        comp_id = compromiso.id
        codigo = compromiso.codigo

        async with transaction(self.repo.session):
            await self.repo.registrar_auditoria(
                registro_id=comp_id,
                accion="compromiso_eliminado",
                justificacion_motivada=f"Eliminación de compromiso PAS {codigo} de la matriz institucional.",
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={"codigo": codigo},
            )
            await self.repo.eliminar(compromiso)

    async def obtener_kpis(self) -> KpisSeguimientoRespuesta:
        compromisos = await self.repo.listar()
        total = len(compromisos)
        if total == 0:
            return KpisSeguimientoRespuesta(
                totalCompromisos=0,
                compromisosConReporte=0,
                compromisosSinReporte=0,
                compromisosEnEjecucionOCumplidos=0,
                compromisosEnRiesgoORetrasados=0,
                promedioCumplimientoCuatrienal=None,
                presupuestoTotalAnualCop=0.0,
            )

        con_reporte = [
            c for c in compromisos
            if c.porcentaje_cumplimiento is not None and c.estado != "sin_reporte"
        ]
        total_con_reporte = len(con_reporte)
        sin_reporte = total - total_con_reporte

        en_ejecucion_o_cumplidos = sum(
            1 for c in compromisos if c.estado in ("cumplido", "en_ejecucion")
        )
        en_riesgo_o_retrasados = sum(
            1 for c in compromisos if c.estado in ("en_riesgo", "retrasado")
        )
        promedio = (
            round(sum(float(c.porcentaje_cumplimiento) for c in con_reporte) / total_con_reporte, 1)
            if total_con_reporte > 0
            else None
        )
        suma_presupuesto = sum(
            float(c.presupuesto_anual_cop or 0)
            for c in compromisos
            if c.presupuesto_anual_cop is not None
        )

        return KpisSeguimientoRespuesta(
            totalCompromisos=total,
            compromisosConReporte=total_con_reporte,
            compromisosSinReporte=sin_reporte,
            compromisosEnEjecucionOCumplidos=en_ejecucion_o_cumplidos,
            compromisosEnRiesgoORetrasados=en_riesgo_o_retrasados,
            promedioCumplimientoCuatrienal=promedio,
            presupuestoTotalAnualCop=suma_presupuesto,
        )
