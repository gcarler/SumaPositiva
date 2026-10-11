import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoIndicador = Literal["insumo", "producto", "resultado", "impacto"]
SentidoEsperado = Literal["ascendente", "descendente"]


class FichaIndicadorCrear(BaseModel):
    codigo: str = Field(..., max_length=100)
    nombre: str = Field(..., max_length=250)
    tipo_indicador: TipoIndicador
    linea_estrategica_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    nodo_instrumento_id: uuid.UUID | None = None
    definicion: str
    metodo_calculo: str
    unidad_medida: str = Field(..., max_length=50)
    sentido_esperado: SentidoEsperado = "ascendente"
    periodicidad: str = Field(..., max_length=50)
    linea_base_valor: Decimal
    linea_base_anio: int
    meta_cuatrienio: Decimal
    meta_anualizada: dict[str, Any] = Field(default_factory=dict)
    fuente_datos: str = Field(..., max_length=250)
    responsable_reporte: str = Field(..., max_length=250)
    metadatos: dict[str, Any] = Field(default_factory=dict)


class FichaIndicadorActualizar(BaseModel):
    responsable_reporte: str | None = Field(default=None, max_length=250)
    fuente_datos: str | None = Field(default=None, max_length=250)
    periodicidad: str | None = Field(default=None, max_length=50)
    metadatos: dict[str, Any] | None = None

    # Salvaguarda metodológica institucional: campos capturados para rechazo explícito (HTTP 400)
    linea_base_valor: Any | None = None
    linea_base_anio: Any | None = None
    metodo_calculo: Any | None = None
    formula: Any | None = None

    model_config = ConfigDict(extra="ignore")


class FichaIndicadorRespuesta(FichaIndicadorCrear):
    id: uuid.UUID
    valor_actual: Decimal
    porcentaje_avance: Decimal
    tiene_mediciones: bool = False
    fecha_corte_ultimo_reporte: date | None = None
    periodo_ultimo_reporte: str | None = None
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)


class MedicionIndicadorCrear(BaseModel):
    periodo: str = Field(..., max_length=20)
    fecha_corte: date
    valor_medido: Decimal
    observaciones: str | None = None
    evidencia_documental_url: str | None = Field(default=None, max_length=500)
    registrado_por: str = Field(..., max_length=150)
    es_demostracion: bool = Field(
        default=False, description="Bandera para identificar mediciones de prueba o demostración"
    )


class MedicionIndicadorRespuesta(MedicionIndicadorCrear):
    id: uuid.UUID
    indicador_id: uuid.UUID
    avance_acumulado: Decimal
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)


class CadenaValorRespuesta(BaseModel):
    insumo: list[FichaIndicadorRespuesta]
    producto: list[FichaIndicadorRespuesta]
    resultado: list[FichaIndicadorRespuesta]
