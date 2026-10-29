"""Casos sintéticos del parser puro; ejecutar con --noconftest, sin SQL."""

import hashlib
from decimal import Decimal, localcontext

import pytest
from pydantic import ValidationError

from app.modules.compromisos import parser_terridata_polis as parser


def row(**changes):
    values = [
        "XX",
        "Departamento sintético",
        "XXYYY",
        "Entidad sintética",
        "Dimensión sintética",
        "Subcategoría sintética",
        "Indicador sintético",
        "12.50",
        "",
        "2020",
        "1",
        "Productor sintético",
        "unidad sintética",
    ]
    for key, value in changes.items():
        values[parser.ENCABEZADO_ESPERADO.index(key)] = value
    return values


def payload(*rows):
    return (
        "\ufeff" + "|".join(parser.ENCABEZADO_ESPERADO) + "\n" + "\n".join("|".join(values) for values in rows) + "\n"
    ).encode()


def parse(data, identity=None, **capture_changes):
    result = parser.parsear_terridata_txt(
        data,
        parser.MetadatosCapturaTerridata(
            canal_declarado="TerriData",
            origen_declarado="origen-sintetico",
            miembro_texto="sintetico.txt",
            **capture_changes,
        ),
        identity or parser.IdentidadEsperadaTerridata(codigo_entidad="XXYYY"),
    )
    counts = result.conteos
    assert counts.filas_datos == len(result.filas)
    assert counts.filas_datos == counts.filas_aceptadas + counts.filas_retenidas + counts.filas_rechazadas
    assert counts.filas_datos == (
        counts.filas_identidad_concordante_declarada
        + counts.filas_identidad_discordante_declarada
        + counts.filas_identidad_no_contrastable
        + counts.filas_identidad_no_evaluable
    )
    return result


def test_originals_hash_and_decimal_serialization():
    values = row()
    raw = payload(values)
    result = parse(raw, sha256_captura_declarado=hashlib.sha256(raw).hexdigest())
    item = result.filas[0]
    assert item.campos_originales == tuple(values)
    assert item.estado_fila == "aceptada"
    assert item.valor_numerico == Decimal("12.50")
    assert item.orden == 1 and item.linea_final == 2
    assert result.sha256_bytes_txt == hashlib.sha256(raw).hexdigest()
    assert result.model_dump(mode="json")["filas"][0]["valor_numerico"] == "12.50"
    assert result.verificacion.certificacion_divipola == "no_certificada"


@pytest.mark.parametrize("first", [True, False])
def test_invalid_width_does_not_inherit_state(first):
    invalid = ["estructura", "sintética"]
    rows = [invalid, row()] if first else [row(), invalid]
    result = parse(payload(*rows))
    item = result.filas[0 if first else 1]
    assert item.estado_fila == "rechazada"
    assert item.estado_valor_numerico == "no_evaluable_por_estructura"
    assert item.valor_numerico is None
    assert item.estado_identidad == "no_evaluable_por_estructura"
    assert item.campos_originales == tuple(invalid)
    assert result.conteos.filas_aceptadas == result.conteos.filas_rechazadas == 1


@pytest.mark.parametrize(
    ("field", "value", "temporal"),
    [
        ("Año", "sin-año", "anio_no_conforme"),
        ("Mes", "13", "mes_no_conforme"),
        ("Mes", "0", "mes_0_sin_regla_proveedor"),
    ],
)
def test_temporal_pending_retains_original(field, value, temporal):
    result = parse(payload(row(**{field: value})))
    item = result.filas[0]
    assert item.estado_fila == "retiene"
    assert item.estado_temporalidad == temporal
    assert item.campos_originales[parser.ENCABEZADO_ESPERADO.index(field)] == value


def test_qualitative_without_number_and_general_description():
    result = parse(
        payload(row(**{"Dato Numérico": "", "Dato Cualitativo": "texto", "Dimensión": "Descripción general"}))
    )
    item = result.filas[0]
    assert item.estado_fila == "aceptada"
    assert item.valor_numerico is None
    assert item.estado_valor_numerico == "no_presente"
    assert "descripcion_general_no_serie_estadistica_automatica" in item.advertencias
    assert result.conteos.filas_descripcion_general == 1


@pytest.mark.parametrize("value", ["1,20", "1E2", "NaN", "12%", " 12 "])
def test_unaccredited_numeric_format_is_retained(value):
    item = parse(payload(row(**{"Dato Numérico": value}))).filas[0]
    assert item.estado_fila == "retiene"
    assert item.dato_numerico == value
    assert item.valor_numerico is None
    assert item.estado_valor_numerico == "formato_no_regla"


def test_missing_both_values_is_retained():
    result = parse(payload(row(**{"Dato Numérico": "", "Dato Cualitativo": ""})))
    assert result.filas[0].estado_fila == "retiene"
    assert result.conteos.filas_sin_valor_declarado == 1


def test_zero_is_a_value():
    result = parse(payload(row(**{"Dato Numérico": "0"})))
    assert result.filas[0].valor_numerico == Decimal(0)
    assert result.filas[0].estado_fila == "aceptada"
    assert result.conteos.filas_sin_valor_declarado == 0


@pytest.mark.parametrize(
    "identity",
    [
        {"codigo_entidad": "OTRA"},
        {"nivel_territorial": "municipio"},
    ],
)
def test_mismatch_and_unverifiable_identity(identity):
    result = parse(payload(row()), parser.IdentidadEsperadaTerridata(**identity))
    assert result.filas[0].estado_fila == "retiene"
    expected = "discordante_declarada" if "codigo_entidad" in identity else "no_contrastable"
    assert result.filas[0].estado_identidad == expected


@pytest.mark.parametrize("field", parser.CAMPOS_CELDA_OBLIGATORIOS)
def test_required_field_empty_rejects(field):
    result = parse(payload(row(**{field: ""})))
    assert result.filas[0].estado_fila == "rechazada"
    assert result.conteos.filas_campo_obligatorio_vacio == 1


def test_oversized_numeric_is_not_converted():
    value = "9" * (parser.MAXIMO_CELDA + 1)
    item = parse(payload(row(**{"Dato Numérico": value}))).filas[0]
    assert item.estado_fila == "rechazada"
    assert item.estado_valor_numerico == "no_evaluable_por_estructura"
    assert item.dato_numerico == value
    assert item.valor_numerico is None


def test_decimal_is_exact_with_small_ambient_precision():
    value = "12345678901234567890.123456789"
    with localcontext() as context:
        context.prec = 2
        item = parse(payload(row(**{"Dato Numérico": value}))).filas[0]
        assert item.valor_numerico == Decimal(value)
        assert context.prec == 2


def test_hash_mismatch_and_invalid_encoding():
    with pytest.raises(ValueError, match="sha256"):
        parse(payload(row()), sha256_captura_declarado="0" * 64)
    with pytest.raises(ValueError, match="decodifica"):
        parse(b"\xff")


@pytest.mark.parametrize("mode", ["duplicate", "unexpected", "missing"])
def test_wrong_header_rejected(mode):
    headers = list(parser.ENCABEZADO_ESPERADO)
    if mode == "duplicate":
        headers[1] = headers[0]
    elif mode == "unexpected":
        headers[0] = "columna-desconocida"
    else:
        headers.pop()
    with pytest.raises(ValueError, match="Encabezado"):
        parse(("|".join(headers) + "\n").encode())


def test_byte_and_row_limits(monkeypatch):
    raw = payload(row(), row())
    monkeypatch.setattr(parser, "MAXIMO_BYTES_TXT", len(raw) - 1)
    with pytest.raises(ValueError, match="límite"):
        parse(raw)
    monkeypatch.setattr(parser, "MAXIMO_BYTES_TXT", len(raw))
    monkeypatch.setattr(parser, "MAXIMO_FILAS_DATOS", 1)
    with pytest.raises(ValueError, match="filas"):
        parse(raw)


def test_empty_identity_rejected():
    with pytest.raises(ValidationError):
        parser.IdentidadEsperadaTerridata()


# --- Regla optativa decimal_coma_miles_terridata.v1 (FB-TERR-NUM-01) ---

COMA = "decimal_coma_miles_terridata.v1"


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("598,10", "598.10"),
        ("773.653,00", "773653.00"),
        ("1.192.200.042.072,00", "1192200042072.00"),
        ("1192200042072,00", "1192200042072.00"),
        ("-58.011,00", "-58011.00"),
        ("+58,00", "58.00"),
        ("0,00", "0.00"),
        ("000123,00", "123.00"),
        ("653.653.653.653.653.653,00", "653653653653653653.00"),
        ("653653653653653653,00", "653653653653653653.00"),
    ],
)
def test_coma_rule_converts_valid_grammar(texto, esperado):
    result = parse(payload(row(**{"Dato Numérico": texto})), regla_numerica=COMA)
    item = result.filas[0]
    assert item.estado_fila == "aceptada"
    assert item.estado_valor_numerico == "decimal_validado"
    assert item.valor_numerico == Decimal(esperado)
    assert str(item.valor_numerico) == esperado
    assert item.dato_numerico == texto
    assert item.regla_numerica == COMA
    assert result.regla_numerica == COMA
    assert result.version_parser == "terridata_txt.v2"
    assert result.esquema == "polis.parser_terridata.v2"


@pytest.mark.parametrize(
    "texto",
    [
        "598.10",  # punto decimal bajo regla coma: fuera de las dos subformas
        "598,1",  # escala fija 2: sin relleno de ceros
        "1,234",  # tres decimales
        "653.653.653,",  # sin decimales
        "1.2.345,00",  # grupo distinto de tres
        "1234.567,00",  # prefijo de cuatro dígitos con separador
        "653.653.653.653.653.653.653,00",  # 21 enteros > guardia 18
        "1192200042072123456,00",  # 19 enteros > guardia 18
        "1E2",  # exponente
        "$58,00",  # símbolo
        " 58,00",  # espacio
        "−58,00",  # menos Unicode U+2212
        "58.00",  # punto decimal fuera de contexto coma
    ],
)
def test_coma_rule_retains_out_of_rule_with_text_intact(texto):
    result = parse(payload(row(**{"Dato Numérico": texto})), regla_numerica=COMA)
    item = result.filas[0]
    assert item.estado_fila == "retiene"
    assert item.estado_valor_numerico == "formato_no_regla"
    assert item.valor_numerico is None
    assert item.dato_numerico == texto
    assert "numerico_formato_no_compatible:decimal_coma_miles_terridata.v1" in item.advertencias


def test_coma_rule_does_not_activate_without_flag():
    result = parse(payload(row(**{"Dato Numérico": "773.653,00"})))
    item = result.filas[0]
    assert item.estado_fila == "retiene"
    assert item.estado_valor_numerico == "formato_no_regla"
    assert item.regla_numerica == "decimal_simple_v1"
    assert result.conteos.filas_con_valor_numerico_valido == 0


def test_coma_rule_exact_without_ambient_context():
    value = "653.653.653.653.653.653,00"
    with localcontext() as context:
        context.prec = 2
        item = parse(payload(row(**{"Dato Numérico": value})), regla_numerica=COMA).filas[0]
        assert item.valor_numerico == Decimal("653653653653653653.00")
        assert str(item.valor_numerico) == "653653653653653653.00"
        assert context.prec == 2


def test_coma_rule_default_stays_simple_when_field_converted():
    result = parse(payload(row(**{"Dato Numérico": "12.50"})))
    item = result.filas[0]
    assert item.estado_fila == "aceptada"
    assert item.valor_numerico == Decimal("12.50")
    assert item.regla_numerica == "decimal_simple_v1"
    assert any(limite.startswith("regla_numerica=decimal_simple_v1") for limite in result.limites_aplicados)
