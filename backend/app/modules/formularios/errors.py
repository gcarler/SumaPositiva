"""Errores de integridad: un fallo de referencia no es una respuesta duplicada."""

from fastapi import HTTPException


def error_integridad(error, duplicado):
    codigo = getattr(error.orig, "sqlstate", None)
    if codigo == "23505":
        return HTTPException(409, duplicado)
    if codigo == "23503":
        return HTTPException(422, "La referencia a territorio o dimensión no existe")
    if codigo == "23514":
        return HTTPException(422, "Los datos no cumplen las restricciones del formulario")
    return HTTPException(500, "No se pudo registrar la operación del formulario")
