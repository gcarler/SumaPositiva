import hashlib
import json
import re
import unicodedata
import uuid
from datetime import UTC, date, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.transactions import transaction
from app.modules.mesas.models import ActaComunitaria, Mesa, ParticipanteMesa
from app.modules.mesas.repository import MesaRepository
from app.modules.mesas.schemas import (
    ActaCierre,
    ActaCrear,
    ActaRespuesta,
    MesaCrear,
    MesaRespuesta,
    ParticipanteCrear,
    ParticipanteRespuesta,
    SubMesaCrear,
)


class MesaService:
    def __init__(self, repository: MesaRepository):
        self.repository = repository

    def _sanitizar_ltree(self, etiqueta: str) -> str:
        # Normalizar para ltree: solo alfanuméricos y guiones bajos, max 255 char
        saneado = re.sub(r"[^A-Za-z0-9_]", "_", etiqueta).lower()
        return saneado[:255]

    def _canonizar_json(self, dato: Any) -> str:
        def normalizar(valor: Any) -> Any:
            if isinstance(valor, str):
                return unicodedata.normalize("NFC", valor)
            if isinstance(valor, list):
                return [normalizar(elemento) for elemento in valor]
            if isinstance(valor, dict):
                canonizado = {}
                for clave, contenido in valor.items():
                    if not isinstance(clave, str):
                        raise TypeError("Las claves del payload JSON deben ser cadenas")
                    clave_nfc = unicodedata.normalize("NFC", clave)
                    if clave_nfc in canonizado:
                        raise ValueError("Colisión de claves tras normalización Unicode NFC")
                    canonizado[clave_nfc] = normalizar(contenido)
                return canonizado
            return valor

        return json.dumps(
            normalizar(dato),
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )

    def _calcular_hash_pericial(self, acta: ActaComunitaria) -> str:
        fecha_cierre = acta.fecha_cierre
        if fecha_cierre is not None:
            if fecha_cierre.tzinfo is None:
                fecha_cierre = fecha_cierre.replace(tzinfo=UTC)
            fecha_cierre = fecha_cierre.astimezone(UTC).isoformat(timespec="microseconds")

        payload = {
            "version": "polis-acta-v2",
            "acta_id": str(acta.id) if acta.id else None,
            "mesa_id": str(acta.mesa_id),
            "numero_acta": acta.numero_acta,
            "resumen_deliberacion": acta.resumen_deliberacion,
            "acuerdos": acta.acuerdos,
            "disensos": acta.disensos,
            "compromisos_institucionales": acta.compromisos_institucionales,
            "participantes": acta.metadatos_cierre.get("participantes", []),
            "quorum": {
                "alcanzado": acta.quorum_alcanzado,
                "total_participantes": acta.total_participantes,
            },
            "firma": {
                "facilitador_id": (
                    str(acta.facilitador_firma_id) if acta.facilitador_firma_id else None
                ),
                "nombre_facilitador": acta.nombre_facilitador_firma,
            },
            "cierre": {
                "estado": acta.estado,
                "fecha_cierre": fecha_cierre,
                "metadatos": acta.metadatos_cierre.get("cierre", {}),
            },
        }
        return hashlib.sha256(self._canonizar_json(payload).encode("utf-8")).hexdigest()

    def _validar_ruta_ltree(self, ruta: str) -> None:
        etiquetas = ruta.split(".")
        if (
            len(ruta) > 65_535
            or not etiquetas
            or any(
                not etiqueta
                or len(etiqueta) > 255
                or re.fullmatch(r"[A-Za-z0-9_]+", etiqueta) is None
                for etiqueta in etiquetas
            )
        ):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="La ruta jerárquica no tiene un formato ltree válido",
            )

    def _evaluar_quorum(self, total_participantes: int, aforo_maximo: int) -> bool:
        # Quórum legal deliberativo: mínimo 3 participantes o al menos el 10% del aforo estimado
        return total_participantes >= 3 or (
            aforo_maximo > 0 and total_participantes >= aforo_maximo * 0.10
        )

    async def crear_mesa_raiz(self, datos: MesaCrear) -> MesaRespuesta:
        # Generar ruta base usando shortcode
        async with transaction(self.repository.session):
            slug = self._sanitizar_ltree(datos.shortcode_ciudadano)
            ruta = f"csh.{slug}"

            datos_dict = datos.model_dump()
            mesa = Mesa(**datos_dict)
            mesa.slug = slug
            mesa.ruta_jerarquica = ruta
            mesa_creada = await self.repository.crear(mesa)
            return MesaRespuesta.model_validate(mesa_creada)

    async def crear_submesa(self, padre_id: uuid.UUID, datos: SubMesaCrear) -> MesaRespuesta:
        async with transaction(self.repository.session):
            padre = await self.repository.obtener_por_id(padre_id)
            if not padre:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa padre no encontrada")

            slug_saneado = self._sanitizar_ltree(datos.slug)
            ruta = f"{padre.ruta_jerarquica}.{slug_saneado}"

            datos_dict = datos.model_dump(exclude={"slug"})
            mesa = Mesa(**datos_dict)
            prefijo_padre = padre.slug or self._sanitizar_ltree(padre.shortcode_ciudadano)
            mesa.slug = f"{prefijo_padre}-{slug_saneado}"
            mesa.mesa_padre_id = padre.id
            mesa.ruta_jerarquica = ruta

            mesa_creada = await self.repository.crear(mesa)
            return MesaRespuesta.model_validate(mesa_creada)

    async def obtener_mesa(self, mesa_id: uuid.UUID) -> MesaRespuesta:
        mesa = await self.repository.obtener_por_id(mesa_id)
        if not mesa:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")
        return MesaRespuesta.model_validate(mesa)

    async def listar_mesas(
        self,
        tipo_mesa: str | None = None,
        estado: str | None = None,
        fecha: date | None = None,
        territorio_id: uuid.UUID | None = None,
        ancestro_ruta: str | None = None,
    ) -> list[MesaRespuesta]:
        if ancestro_ruta is not None:
            self._validar_ruta_ltree(ancestro_ruta)
        mesas = await self.repository.listar(tipo_mesa, estado, fecha, territorio_id, ancestro_ruta)
        return [MesaRespuesta.model_validate(m) for m in mesas]

    async def listar_submesas(self, mesa_id: uuid.UUID) -> list[MesaRespuesta]:
        padre = await self.repository.obtener_por_id(mesa_id)
        if not padre:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa padre no encontrada")

        descendientes = await self.repository.buscar_descendientes(padre.ruta_jerarquica, padre.id)
        return [MesaRespuesta.model_validate(m) for m in descendientes]

    # --- Participantes ---

    async def registrar_participante(
        self, mesa_id: uuid.UUID, datos: ParticipanteCrear
    ) -> ParticipanteRespuesta:
        async with transaction(self.repository.session):
            # Serializar registro y recuento de asistentes hasta finalizar el caso de uso.
            mesa = await self.repository.obtener_para_actualizar(mesa_id)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            existente = await self.repository.obtener_participante(mesa_id, datos.sujeto_id)
            if existente:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail="El participante ya se encuentra registrado en esta mesa",
                )

            participante = ParticipanteMesa(
                mesa_id=mesa_id,
                **datos.model_dump(),
            )

            try:
                await self.repository.registrar_participante(participante)
            except IntegrityError as err:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail="El participante ya se encuentra registrado en esta mesa",
                ) from err

            # Actualizar total de asistentes
            total = await self.repository.contar_participantes(mesa_id)
            mesa.total_asistentes = total
            await self.repository.actualizar_mesa(mesa)

            return ParticipanteRespuesta.model_validate(participante)

    async def listar_participantes(self, mesa_id: uuid.UUID) -> list[ParticipanteRespuesta]:
        mesa = await self.repository.obtener_por_id(mesa_id)
        if not mesa:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")
        participantes = await self.repository.listar_participantes(mesa_id)
        return [ParticipanteRespuesta.model_validate(p) for p in participantes]

    # --- Actas Comunitarias ---

    async def crear_o_actualizar_borrador_acta(
        self, mesa_id: uuid.UUID, datos: ActaCrear
    ) -> ActaRespuesta:
        async with transaction(self.repository.session):
            mesa = await self.repository.obtener_para_actualizar(mesa_id)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            acta = await self.repository.obtener_acta_por_mesa(mesa_id)
            if acta and acta.estado in ("CONCERTADA", "PUBLICADA"):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Violación Forense (Sentencia C-150/15): El acta ya ha sido concertada y es"
                        " inmutable."
                    ),
                )

            participantes = await self.repository.listar_participantes(mesa_id)
            total_p = len(participantes)
            quorum = self._evaluar_quorum(total_p, mesa.aforo_maximo)
            snapshot_participantes = [
                {
                    "participante_id": str(participante.id),
                    "rol_en_mesa": participante.rol_en_mesa,
                    "asistencia_confirmada": participante.asistencia_confirmada,
                    "hora_ingreso": participante.hora_ingreso.astimezone(UTC).isoformat(
                        timespec="microseconds"
                    ),
                }
                for participante in participantes
            ]

            if not acta:
                acta = ActaComunitaria(
                    mesa_id=mesa_id,
                    numero_acta=datos.numero_acta,
                    resumen_deliberacion=datos.resumen_deliberacion,
                    acuerdos=datos.acuerdos,
                    disensos=datos.disensos,
                    compromisos_institucionales=datos.compromisos_institucionales,
                    facilitador_firma_id=datos.facilitador_firma_id,
                    nombre_facilitador_firma=datos.nombre_facilitador_firma,
                    quorum_alcanzado=quorum,
                    total_participantes=total_p,
                    sha256_acta="0" * 64,
                    estado="BORRADOR",
                    metadatos_cierre={
                        "version": "polis-acta-v2",
                        "participantes": snapshot_participantes,
                    },
                )
            else:
                acta.numero_acta = datos.numero_acta
                acta.resumen_deliberacion = datos.resumen_deliberacion
                acta.acuerdos = datos.acuerdos
                acta.disensos = datos.disensos
                acta.compromisos_institucionales = datos.compromisos_institucionales
                acta.facilitador_firma_id = datos.facilitador_firma_id
                acta.nombre_facilitador_firma = datos.nombre_facilitador_firma
                acta.total_participantes = total_p
                acta.quorum_alcanzado = quorum
                acta.metadatos_cierre = {
                    "version": "polis-acta-v2",
                    "participantes": snapshot_participantes,
                }

            acta_guardada = await self.repository.guardar_acta(acta)
            acta_guardada.sha256_acta = self._calcular_hash_pericial(acta_guardada)
            acta_guardada = await self.repository.guardar_acta(acta_guardada)
            resp = ActaRespuesta.model_validate(acta_guardada)
            resp.integridad_valida = True
            return resp

    async def cerrar_acta(
        self, mesa_id: uuid.UUID, datos_cierre: ActaCierre | None = None
    ) -> ActaRespuesta:
        async with transaction(self.repository.session):
            mesa = await self.repository.obtener_para_actualizar(mesa_id)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            acta = await self.repository.obtener_acta_por_mesa(mesa_id)
            if not acta:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    detail="No se encontró acta en borrador para concertar",
                )

            if acta.estado in ("CONCERTADA", "PUBLICADA"):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Violación Forense (Sentencia C-150/15): El acta ya se encuentra "
                        "concertada."
                    ),
                )

            if datos_cierre:
                if datos_cierre.numero_acta:
                    acta.numero_acta = datos_cierre.numero_acta
                if datos_cierre.resumen_deliberacion:
                    acta.resumen_deliberacion = datos_cierre.resumen_deliberacion
                if datos_cierre.acuerdos is not None:
                    acta.acuerdos = datos_cierre.acuerdos
                if datos_cierre.disensos is not None:
                    acta.disensos = datos_cierre.disensos
                if datos_cierre.compromisos_institucionales is not None:
                    acta.compromisos_institucionales = datos_cierre.compromisos_institucionales
                if datos_cierre.facilitador_firma_id:
                    acta.facilitador_firma_id = datos_cierre.facilitador_firma_id
                if datos_cierre.nombre_facilitador_firma:
                    acta.nombre_facilitador_firma = datos_cierre.nombre_facilitador_firma

            participantes = await self.repository.listar_participantes(mesa_id)
            total_p = len(participantes)
            quorum = self._evaluar_quorum(total_p, mesa.aforo_maximo)
            snapshot_participantes = [
                {
                    "participante_id": str(participante.id),
                    "rol_en_mesa": participante.rol_en_mesa,
                    "asistencia_confirmada": participante.asistencia_confirmada,
                    "hora_ingreso": participante.hora_ingreso.astimezone(UTC).isoformat(
                        timespec="microseconds"
                    ),
                }
                for participante in participantes
            ]

            acta.total_participantes = total_p
            acta.metadatos_cierre = {
                "version": "polis-acta-v2",
                "participantes": snapshot_participantes,
                "cierre": {"metodo": "api", "version": "polis-acta-v2"},
            }
            acta.quorum_alcanzado = quorum
            acta.estado = "CONCERTADA"
            acta.fecha_cierre = datetime.now(UTC)
            hash_pericial = self._calcular_hash_pericial(acta)
            acta.sha256_acta = hash_pericial

            mesa.total_asistentes = total_p
            mesa.sha256_acta = hash_pericial
            mesa.estado = "ACTA_CONCERTADA"

            await self.repository.session.flush()
            await self.repository.session.refresh(acta)

            resp = ActaRespuesta.model_validate(acta)
            resp.integridad_valida = True
            return resp

    async def obtener_acta(self, mesa_id: uuid.UUID) -> ActaRespuesta:
        acta = await self.repository.obtener_acta_por_mesa(mesa_id)
        if not acta:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, detail="Acta no encontrada para esta mesa"
            )

        integridad = True
        if acta.estado in ("CONCERTADA", "PUBLICADA"):
            version = acta.metadatos_cierre.get("version")
            integridad = (
                version == "polis-acta-v2"
                and self._calcular_hash_pericial(acta) == acta.sha256_acta
            )

        resp = ActaRespuesta.model_validate(acta)
        resp.integridad_valida = integridad
        return resp
