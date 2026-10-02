"""Casos de uso del constructor y lectura pública por slug."""

import re
import unicodedata
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.formularios.constructor_schemas import DocumentoFormulario
from app.modules.formularios.models import FormularioConsulta
from app.modules.formularios.repository import FormularioRepository

ORIGEN = "https://seguridadhumanaintegral.org"
ESTADOS = {"borrador": "BORRADOR", "activo": "PUBLICADO", "cerrado": "CERRADO"}


def generar_slug(titulo):
    texto = unicodedata.normalize("NFD", titulo.lower())
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    base = re.sub(r"[^a-z0-9\s-]", "", texto).strip()
    base = re.sub(r"[\s-]+", "-", base)[:60].rstrip("-") or "formulario"
    return f"{base}-{uuid.uuid4().hex[:8]}"


class ConstructorService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = FormularioRepository(session)

    async def documento(self, formulario):
        if formulario.documento_constructor:
            doc = DocumentoFormulario.model_validate(formulario.documento_constructor)
        else:
            preguntas = []
            tipos = {"texto_libre": "texto_largo", "escala_likert": "likert"}
            for i, p in enumerate(formulario.esquema_preguntas):
                preguntas.append(
                    {
                        **p,
                        "tipo": tipos.get(p["tipo"], p["tipo"]),
                        "orden": i,
                        "opciones": [{"id": o, "texto": o} for o in p.get("opciones", [])],
                    }
                )
            doc = DocumentoFormulario.model_validate(
                {
                    "titulo": formulario.titulo,
                    "preguntas": preguntas,
                    "configuracion": {},
                }
            )
        doc.id = (
            "reporte-ciudadano-geoespacial"
            if formulario.codigo == "REPORTE-CIUDADANO-GEOESPACIAL"
            else str(formulario.id)
        )
        doc.idPersistido = str(formulario.id)
        doc.origenDatos = "api"
        doc.titulo, doc.descripcion = formulario.titulo, formulario.descripcion
        doc.estado = {v: k for k, v in ESTADOS.items()}[formulario.estado]
        doc.configuracion.fechaCierre = (
            formulario.fecha_cierre.isoformat() if formulario.fecha_cierre else None
        )
        doc.configuracion.slug = formulario.slug
        doc.configuracion.urlPublica = f"{ORIGEN}/f/{formulario.slug}"
        doc.creadoEn, doc.actualizadoEn = (
            formulario.creado_en.isoformat(),
            formulario.actualizado_en.isoformat(),
        )
        doc.respuestasCount = await self.repo.contar_respuestas(formulario.id)
        return doc

    async def listar(self, *, publico=False):
        registros = await self.repo.listar("PUBLICADO" if publico else None)
        return [await self.documento(f) for f in registros]

    async def obtener(self, slug, *, publico=False):
        f = await self.repo.obtener_por_slug(slug)
        if not f:
            raise HTTPException(404, "Formulario no encontrado")
        if publico and f.estado == "BORRADOR":
            raise HTTPException(403, "El formulario es un borrador")
        return await self.documento(f)

    async def guardar(self, datos: DocumentoFormulario, formulario_id=None):
        try:
            async with transaction(self.session):
                if formulario_id:
                    f = await self.repo.obtener_por_id(formulario_id)
                    if not f:
                        raise HTTPException(404, "Formulario no encontrado")
                else:
                    f = FormularioConsulta(
                        codigo="FORM-" + uuid.uuid4().hex, slug=generar_slug(datos.titulo)
                    )
                f.titulo, f.descripcion = datos.titulo.strip(), datos.descripcion
                f.estado = ESTADOS[datos.estado]
                fecha = datos.configuracion.fechaCierre
                f.fecha_cierre = (
                    datetime.fromisoformat(fecha.replace("Z", "+00:00")) if fecha else None
                )
                f.actualizado_en = datetime.now(UTC)
                datos.configuracion.slug = f.slug
                datos.configuracion.urlPublica = f"{ORIGEN}/f/{f.slug}"
                f.documento_constructor = datos.model_dump(mode="json", exclude_none=True)
                f.esquema_preguntas = [
                    p.model_dump(mode="json", exclude_none=True) for p in datos.preguntas
                ]
                if not formulario_id:
                    await self.repo.crear(f)
                await self.repo.guardar(f)
                return await self.documento(f)
        except IntegrityError as error:
            raise HTTPException(
                409, "El identificador del formulario ya está registrado"
            ) from error
