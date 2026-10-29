import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status

from app.core.transactions import transaction
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.indicadores.models import FichaTecnicaIndicador, MedicionIndicador
from app.modules.indicadores.repository import IndicadoresRepository
from app.modules.indicadores.schemas import (
    CadenaValorRespuesta,
    FichaIndicadorActualizar,
    FichaIndicadorCrear,
    FichaIndicadorRespuesta,
    MedicionIndicadorCrear,
    MedicionIndicadorRespuesta,
)


class IndicadoresService:
    def __init__(self, repository: IndicadoresRepository) -> None:
        self.repository = repository

    async def listar_fichas(self) -> Sequence[FichaTecnicaIndicador]:
        return await self.repository.listar_fichas()

    async def obtener_ficha(self, id: uuid.UUID) -> FichaTecnicaIndicador | None:
        return await self.repository.obtener_ficha(id)

    async def actualizar_ficha(
        self,
        id: uuid.UUID,
        datos: FichaIndicadorActualizar,
        usuario_id: uuid.UUID | None = None,
    ) -> FichaIndicadorRespuesta:
        # Salvaguarda metodológica institucional: prohibido alterar fórmula matemática o línea base histórica
        salvaguardas = {
            "linea_base_valor": datos.linea_base_valor,
            "linea_base_anio": datos.linea_base_anio,
            "metodo_calculo": datos.metodo_calculo,
            "formula": datos.formula,
        }
        intentos = [k for k, v in salvaguardas.items() if v is not None]
        if intentos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Salvaguarda institucional: Prohibido modificar la fórmula matemática o la línea base histórica "
                    f"oficial ({', '.join(intentos)}). Estos parámetros oficiales son inmutables."
                ),
            )

        if datos.metadatos and any(
            k in datos.metadatos for k in ("linea_base_valor", "linea_base_anio", "metodo_calculo", "formula")
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Salvaguarda institucional: Prohibido sobreescribir atributos "
                    "matemáticos o línea base oficial en metadatos."
                ),
            )

        async with transaction(self.repository.session):
            ficha = await self.repository.obtener_ficha_para_actualizar(id)
            if not ficha:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ficha técnica no encontrada")

            campos_modificados: list[str] = []
            if datos.responsable_reporte is not None:
                ficha.responsable_reporte = datos.responsable_reporte.strip()
                campos_modificados.append("responsable_reporte")
            if datos.fuente_datos is not None:
                ficha.fuente_datos = datos.fuente_datos.strip()
                campos_modificados.append("fuente_datos")
            if datos.periodicidad is not None:
                ficha.periodicidad = datos.periodicidad.strip()
                campos_modificados.append("periodicidad")
            if datos.metadatos is not None:
                metadatos_actuales = dict(ficha.metadatos or {})
                metadatos_actuales.update(datos.metadatos)
                ficha.metadatos = metadatos_actuales
                campos_modificados.append("metadatos")

            ficha.actualizado_en = datetime.now(UTC)
            resultado = await self.repository.actualizar_ficha(ficha)

            # Registro de auditoría forense inmutable
            auditoria = RegistroAuditoria(
                tabla_afectada="indicadores.fichas_tecnicas_indicadores",
                registro_id=resultado.id,
                accion="ACTUALIZAR_METADATOS_FICHA_INDICADOR",
                usuario_id=usuario_id,
                causal="tecnica",
                justificacion_motivada=(
                    f"Actualización de metadatos institucionales de ficha técnica {resultado.codigo}"
                ),
                metadatos={
                    "ficha_id": str(resultado.id),
                    "codigo": resultado.codigo,
                    "campos_modificados": campos_modificados,
                    "responsable_reporte": resultado.responsable_reporte,
                    "fuente_datos": resultado.fuente_datos,
                    "periodicidad": resultado.periodicidad,
                },
            )
            self.repository.session.add(auditoria)
            await self.repository.session.flush()

            return FichaIndicadorRespuesta.model_validate(resultado)

    async def crear_ficha(self, datos: FichaIndicadorCrear) -> FichaIndicadorRespuesta:
        async with transaction(self.repository.session):
            ficha = FichaTecnicaIndicador(
                codigo=datos.codigo,
                nombre=datos.nombre,
                tipo_indicador=datos.tipo_indicador,
                linea_estrategica_id=datos.linea_estrategica_id,
                dimension_id=datos.dimension_id,
                nodo_instrumento_id=datos.nodo_instrumento_id,
                definicion=datos.definicion,
                metodo_calculo=datos.metodo_calculo,
                unidad_medida=datos.unidad_medida,
                sentido_esperado=datos.sentido_esperado,
                periodicidad=datos.periodicidad,
                linea_base_valor=datos.linea_base_valor,
                linea_base_anio=datos.linea_base_anio,
                meta_cuatrienio=datos.meta_cuatrienio,
                meta_anualizada=datos.meta_anualizada,
                fuente_datos=datos.fuente_datos,
                responsable_reporte=datos.responsable_reporte,
                metadatos=datos.metadatos,
                valor_actual=datos.linea_base_valor,
                porcentaje_avance=Decimal("0"),
            )
            resultado = await self.repository.crear_ficha(ficha)
            return FichaIndicadorRespuesta.model_validate(resultado)

    async def registrar_medicion(self, id: uuid.UUID, datos: MedicionIndicadorCrear) -> MedicionIndicadorRespuesta:
        async with transaction(self.repository.session):
            ficha = await self.repository.obtener_ficha(id)
            if not ficha:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ficha técnica no encontrada")

            if ficha.meta_cuatrienio == ficha.linea_base_valor:
                porcentaje = Decimal("0.0")
            else:
                if ficha.sentido_esperado == "ascendente":
                    porcentaje = (
                        (datos.valor_medido - ficha.linea_base_valor) / (ficha.meta_cuatrienio - ficha.linea_base_valor)
                    ) * 100
                else:
                    porcentaje = (
                        (ficha.linea_base_valor - datos.valor_medido) / (ficha.linea_base_valor - ficha.meta_cuatrienio)
                    ) * 100

            ficha.valor_actual = datos.valor_medido
            ficha.porcentaje_avance = porcentaje
            ficha.metadatos = {
                **(ficha.metadatos or {}),
                "tiene_mediciones": True,
                "fecha_corte_ultimo_reporte": str(datos.fecha_corte),
                "periodo_ultimo_reporte": datos.periodo,
            }

            medicion = MedicionIndicador(
                indicador_id=ficha.id,
                periodo=datos.periodo,
                fecha_corte=datos.fecha_corte,
                valor_medido=datos.valor_medido,
                avance_acumulado=porcentaje,
                observaciones=datos.observaciones,
                evidencia_documental_url=datos.evidencia_documental_url,
                registrado_por=datos.registrado_por,
                es_demostracion=datos.es_demostracion,
            )
            resultado = await self.repository.registrar_medicion(medicion, ficha)
            return MedicionIndicadorRespuesta.model_validate(resultado)

    async def obtener_cadena_valor(self) -> CadenaValorRespuesta:
        res = await self.repository.obtener_cadena_valor()
        return CadenaValorRespuesta(insumo=res["insumo"], producto=res["producto"], resultado=res["resultado"])
