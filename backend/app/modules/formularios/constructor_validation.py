"""Validación de respuestas en servidor: visibilidad, secciones y tipos del constructor."""

import base64
import json
import math
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException

from app.modules.formularios.geo_respuesta import validar_fotos


def cumple(regla, respuestas):
    dato = respuestas.get(regla.get("preguntaOrigenId"))
    if dato in (None, "", []):
        return False
    valores = dato if isinstance(dato, list) else [dato]
    valor = regla.get("valor", "")
    iguales = any(v == valor or v.startswith(valor + ":") for v in valores)
    operador = regla.get("operador")
    if operador == "igual":
        return iguales
    if operador == "no_igual":
        return not iguales
    if operador == "contiene":
        return any(valor in v for v in valores)
    try:
        if isinstance(dato, list):
            return False
        a, b = float(dato), float(valor)
        return (a > b if operador == "mayor_que" else a < b) if math.isfinite(a) else False
    except (ValueError, TypeError):
        return False


def efectivas(documento, respuestas):
    preguntas = sorted(documento["preguntas"], key=lambda p: p["orden"])
    visibles, valores = [], {}
    for p in preguntas:
        reglas = [
            r
            for q in preguntas
            for r in q.get("logica", [])
            if r.get("preguntaDestinoId", q["id"]) == p["id"]
        ]
        if all(cumple(r, valores) for r in reglas if r["accion"] == "mostrar") and not any(
            cumple(r, valores) for r in reglas if r["accion"] == "ocultar"
        ):
            visibles.append(p)
            if p["id"] in respuestas:
                valores[p["id"]] = respuestas[p["id"]]
    secciones = sorted(documento["secciones"], key=lambda s: s["orden"])
    accesibles, i = {None}, 0
    while i < len(secciones):
        seccion = secciones[i]["id"]
        accesibles.add(seccion)
        for p in visibles:
            if p.get("seccionId") != seccion:
                continue
            salto = next(
                (
                    r
                    for r in p.get("logica", [])
                    if r["accion"] == "ir_a_seccion" and cumple(r, valores)
                ),
                None,
            )
            if salto:
                destino = next(
                    (
                        j
                        for j, s in enumerate(secciones)
                        if s["id"] == salto.get("seccionDestinoId")
                    ),
                    -1,
                )
                if destino > i:
                    i = destino - 1
                    break
        i += 1
    preguntas = [
        p
        for p in visibles
        if p.get("seccionId") in accesibles and p["tipo"] not in ("seccion", "descripcion")
    ]
    return preguntas, {p["id"]: valores[p["id"]] for p in preguntas if p["id"] in valores}


def validar_respuestas(documento, respuestas):
    # Aceptar el contrato estructurado del punto; las reglas trabajan sobre texto.
    if isinstance(respuestas, dict):
        respuestas = dict(respuestas)
        for p in documento["preguntas"]:
            dato = respuestas.get(p["id"])
            if (
                p["tipo"] == "ubicacion_geografica"
                and p.get("permitirFotos")
                and isinstance(dato, dict)
            ):
                try:
                    if dato["tipo"] != "ubicacion_geografica":
                        raise ValueError("Tipo incorrecto")
                    punto = dato["valor"]
                    respuestas[p["id"]] = json.dumps(
                        {
                            "type": "Point",
                            "coordinates": [punto["lng"], punto["lat"]],
                            "barrio": punto.get("barrio", ""),
                            "fotos": punto.get("fotos", []),
                        }
                    )
                except (KeyError, TypeError, ValueError) as error:
                    raise HTTPException(422, "Punto geográfico inválido") from error
    if not isinstance(respuestas, dict) or any(
        not isinstance(v, (str, list))
        or (isinstance(v, list) and any(not isinstance(item, str) for item in v))
        for v in respuestas.values()
    ):
        raise HTTPException(422, "Las respuestas deben ser texto o listas de texto")
    preguntas, datos = efectivas(documento, respuestas)
    for p in preguntas:
        valor = datos.get(p["id"])
        validacion = p.get("validacion") or {}

        def error(mensaje, titulo=p["texto"]):
            raise HTTPException(422, f"{titulo}: {mensaje}")

        if valor in (None, "", []):
            if p.get("obligatoria") or validacion.get("obligatoria"):
                error("Esta pregunta es obligatoria")
            continue
        tipo = p["tipo"]
        if tipo == "foto_multiple":
            datos[p["id"]] = validar_fotos(valor, p.get("maxFotos", 5))
            continue
        if tipo != "opcion_multiple" and not isinstance(valor, str):
            error("Tipo de respuesta incorrecto")
        if tipo in ("opcion_unica", "opcion_multiple", "lista_desplegable"):
            opciones = p.get("opciones", [])
            lista = valor if tipo == "opcion_multiple" else [valor]
            if not isinstance(lista, list) or len(set(lista)) != len(lista):
                error("Opciones incorrectas o repetidas")
            for v in lista:
                if not any(
                    o["id"] == v
                    or (
                        o.get("esOtro")
                        and v.startswith(o["id"] + ":")
                        and v.split(":", 1)[1].strip()
                    )
                    for o in opciones
                ):
                    error("Opción inválida")
        if tipo in ("texto_corto", "texto_largo"):
            if (p.get("obligatoria") or validacion.get("obligatoria")) and not valor.strip():
                error("Esta pregunta es obligatoria")
            if len(valor) < validacion.get("minLongitud", 0) or len(valor) > validacion.get(
                "maxLongitud", 100000
            ):
                error("Longitud de texto fuera de rango")
            patron = validacion.get("patron")
            if patron and not re.search(patron, valor):
                error("El texto no cumple el patrón")
        if tipo in ("numero", "likert", "escala_lineal"):
            try:
                numero = Decimal(valor)
                if not numero.is_finite():
                    error("Número inválido")
                minimo = validacion.get(
                    "minValor", p.get("escalaMin", 1) if tipo != "numero" else None
                )
                maximo = validacion.get(
                    "maxValor", p.get("escalaMax", 5) if tipo != "numero" else None
                )
                if minimo is not None and numero < Decimal(str(minimo)):
                    error("Número por debajo del mínimo")
                if maximo is not None and numero > Decimal(str(maximo)):
                    error("Número por encima del máximo")
                paso = p.get("paso", 1 if tipo != "numero" else None)
                if paso and (numero - Decimal(str(minimo or 0))) % Decimal(str(paso)) != 0:
                    error("Paso numérico inválido")
            except InvalidOperation:
                error("Número inválido")
        if tipo == "fecha":
            try:
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", valor):
                    error("Fecha inválida")
                date.fromisoformat(valor)
            except ValueError:
                error("Fecha inválida")
        if tipo == "hora" and not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", valor):
            error("Hora inválida")
        if tipo == "ubicacion_geografica":
            try:
                punto = json.loads(valor)
                coords = punto["coordinates"]
                if (
                    punto["type"] != "Point"
                    or len(coords) != 2
                    or any(
                        isinstance(n, bool)
                        or not isinstance(n, (int, float))
                        or not math.isfinite(n)
                        for n in coords
                    )
                    or not (-180 <= coords[0] <= 180 and -90 <= coords[1] <= 90)
                    or ("origen" in punto and punto["origen"] not in ("mapa", "coordenadas", "gps"))
                    or (
                        "referencia" in punto
                        and (
                            not isinstance(punto["referencia"], str)
                            or len(punto["referencia"]) > 240
                        )
                    )
                    or (
                        "precisionMetros" in punto
                        and (
                            isinstance(punto["precisionMetros"], bool)
                            or not isinstance(punto["precisionMetros"], (int, float))
                            or not math.isfinite(punto["precisionMetros"])
                            or punto["precisionMetros"] < 0
                        )
                    )
                ):
                    error("Punto geográfico inválido")
            except (ValueError, TypeError, KeyError):
                error("Punto geográfico inválido")
            if p.get("permitirFotos"):
                fotos = validar_fotos(punto.get("fotos", []), p.get("maxFotos", 5))
                barrio = punto.get("barrio")
                if barrio is not None and (not isinstance(barrio, str) or len(barrio) > 240):
                    error("Barrio inválido")
                datos[p["id"]] = {
                    "tipo": "ubicacion_geografica",
                    "valor": {
                        "lat": coords[1],
                        "lng": coords[0],
                        "fotos": fotos,
                        **({"barrio": barrio} if barrio else {}),
                    },
                }
        if tipo == "carga_archivo":
            try:
                archivo = json.loads(valor)
                mime = archivo["tipo"]
                if (
                    not isinstance(archivo["nombre"], str)
                    or not archivo["nombre"]
                    or not isinstance(mime, str)
                    or not isinstance(archivo["contenido"], str)
                    or not archivo["contenido"].startswith(f"data:{mime};base64,")
                ):
                    error("Archivo inválido")
                contenido = archivo["contenido"].split(",", 1)[1]
                datos_archivo = base64.b64decode(contenido, validate=True)
                if (
                    not datos_archivo
                    or len(datos_archivo) > 2 * 1024 * 1024
                    or len(datos_archivo) != archivo["bytes"]
                ):
                    error("Archivo inválido o superior a 2 MB")
                filtro = p.get("tiposArchivo", "imagen")
                if filtro == "pdf" and mime != "application/pdf":
                    error("Seleccione un PDF")
                if filtro == "imagen" and mime not in (
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                    "image/gif",
                ):
                    error("Seleccione una imagen permitida")
            except (ValueError, TypeError, KeyError, IndexError):
                error("Archivo inválido")
    return datos
