import hashlib
import json
import re
import unicodedata
import uuid
from datetime import UTC, date, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.core.transactions import transaction
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.mesas.models import ActaComunitaria, Mesa, MesaAgenda, ParticipanteMesa
from app.modules.mesas.repository import MesaRepository
from app.modules.mesas.schemas import (
    ActaCierre,
    ActaCrear,
    ActaRespuesta,
    AgendaActualizar,
    AgendaCrear,
    AgendaRespuesta,
    MesaActualizar,
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

    async def crear_mesa_raiz(
        self,
        datos: MesaCrear,
        sujeto: SujetoAutenticadoContexto | None = None,
    ) -> MesaRespuesta:
        # Generar ruta base usando shortcode
        async with transaction(self.repository.session):
            base_slug = self._sanitizar_ltree(datos.shortcode_ciudadano).strip("_") or "mesa"
            slug = base_slug[:170]
            ruta = f"csh.{slug}"
            shortcode = datos.shortcode_ciudadano

            # Asegurar la unicidad del slug, ruta y shortcode si ya existe una mesa previa
            stmt = select(Mesa).where(
                or_(
                    Mesa.slug == slug,
                    Mesa.ruta_jerarquica == ruta,
                    Mesa.shortcode_ciudadano == shortcode,
                )
            )
            res = await self.repository.session.execute(stmt)
            if res.first() is not None:
                sufijo = uuid.uuid4().hex[:6]
                slug = f"{base_slug[:160]}_{sufijo}"
                ruta = f"csh.{slug}"
                shortcode = f"{datos.shortcode_ciudadano[:40]}_{sufijo}"

            self._validar_ruta_ltree(ruta)

            datos_dict = datos.model_dump()
            mesa = Mesa(**datos_dict)
            mesa.slug = slug
            mesa.ruta_jerarquica = ruta
            mesa.shortcode_ciudadano = shortcode
            mesa_creada = await self.repository.crear(mesa)

            justif = f"Creación de mesa {mesa_creada.codigo_oficial or mesa_creada.nombre}"
            auditoria = RegistroAuditoria(
                tabla_afectada="mesas_trabajo.mesas",
                registro_id=mesa_creada.id,
                accion="mesa:crear",
                usuario_id=sujeto.sujeto_id if sujeto else None,
                causal="tecnica",
                justificacion_motivada=justif[:250],
                metadatos={
                    "mesa_id": str(mesa_creada.id),
                    "codigo_oficial": mesa_creada.codigo_oficial,
                    "shortcode_ciudadano": mesa_creada.shortcode_ciudadano,
                    "slug": mesa_creada.slug,
                    "tipo_mesa": mesa_creada.tipo_mesa,
                },
            )
            self.repository.session.add(auditoria)
            await self.repository.session.flush()

            return MesaRespuesta.model_validate(mesa_creada)

    async def crear_submesa(self, padre_id: uuid.UUID, datos: SubMesaCrear) -> MesaRespuesta:
        async with transaction(self.repository.session):
            padre = await self.repository.obtener_por_id(padre_id)
            if not padre:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa padre no encontrada")

            sufijo = uuid.uuid4().hex[:8]
            base_slug = self._sanitizar_ltree(datos.slug or datos.nombre).strip("_")[:40] or "sub"
            slug_saneado = base_slug if datos.slug else f"{base_slug}_{sufijo}"
            ruta = f"{padre.ruta_jerarquica}.{slug_saneado}"

            datos_dict = datos.model_dump(exclude={"slug"})
            datos_dict["tipo_mesa"] = datos.tipo_mesa or padre.tipo_mesa
            datos_dict["codigo_oficial"] = (
                datos.codigo_oficial or f"{padre.codigo_oficial[:70]}-S{sufijo}"
            )
            datos_dict["shortcode_ciudadano"] = (
                datos.shortcode_ciudadano or f"{padre.shortcode_ciudadano[:30]}-S{sufijo}"
            )
            mesa = Mesa(**datos_dict)
            prefijo_padre = padre.slug or self._sanitizar_ltree(padre.shortcode_ciudadano)
            mesa.slug = f"{prefijo_padre}-{slug_saneado}"[:100]
            mesa.mesa_padre_id = padre.id
            mesa.ruta_jerarquica = ruta

            mesa_creada = await self.repository.crear(mesa)
            return MesaRespuesta.model_validate(mesa_creada)

    async def actualizar_submesa(
        self,
        padre_id: uuid.UUID,
        submesa_id: uuid.UUID,
        datos: MesaActualizar,
        sujeto: SujetoAutenticadoContexto | None = None,
    ) -> MesaRespuesta:
        submesa = await self.repository.obtener_por_id(submesa_id)
        if not submesa or submesa.mesa_padre_id != padre_id:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail="Submesa no encontrada en la mesa indicada",
            )
        return await self.actualizar_mesa(submesa_id, datos, sujeto=sujeto)

    async def actualizar_mesa(
        self,
        mesa_id: uuid.UUID | str,
        datos: MesaActualizar,
        sujeto: SujetoAutenticadoContexto | None = None,
    ) -> MesaRespuesta:
        # Salvaguarda pericial (OBS-21): total_asistentes debe derivar de actas/asistencia
        if datos.total_asistentes is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Salvaguarda pericial: El total de asistentes se deriva exclusivamente del "
                    "registro oficial de actas y listas de asistencia verificadas; no es modificable directamente."
                ),
            )

        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)

        async with transaction(self.repository.session):
            mesa = await self.repository.obtener_para_actualizar(mesa_uuid)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            # Control de propiedad y roles sensibles (OBS-21)
            if sujeto is not None:
                es_admin = sujeto.rol in ("autoridad_distrital", "administrador_identidades")
                if not es_admin:
                    # Facilitador_mesa solo puede editar mesas asignadas a su propio usuario
                    if mesa.facilitador_id is not None and mesa.facilitador_id != sujeto.sujeto_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="No cuenta con autorización para modificar una mesa asignada a otro facilitador.",
                        )
                    # Facilitador_mesa no puede reasignar facilitador_id
                    if datos.facilitador_id is not None and datos.facilitador_id != sujeto.sujeto_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Solo la autoridad distrital cuenta con permisos para reasignar el facilitador de la mesa.",
                        )
                    # Facilitador_mesa no puede alterar el estado oficial
                    if datos.estado is not None and datos.estado != mesa.estado:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Solo la autoridad distrital cuenta con permisos para modificar el estado de la mesa.",
                        )

            campos_modificados: list[str] = []
            if datos.nombre is not None and datos.nombre != mesa.nombre:
                mesa.nombre = datos.nombre
                campos_modificados.append("nombre")

            lugar = datos.lugar_nombre if datos.lugar_nombre is not None else datos.lugar
            if lugar is not None and lugar != mesa.lugar_nombre:
                mesa.lugar_nombre = lugar
                campos_modificados.append("lugar_nombre")

            if datos.fecha is not None and datos.fecha != mesa.fecha:
                mesa.fecha = datos.fecha
                campos_modificados.append("fecha")

            if datos.horario is not None and datos.horario != mesa.horario:
                mesa.horario = datos.horario
                campos_modificados.append("horario")

            aforo = datos.aforo_maximo if datos.aforo_maximo is not None else datos.aforo_esperado
            if aforo is not None and aforo != mesa.aforo_maximo:
                mesa.aforo_maximo = aforo
                campos_modificados.append("aforo_maximo")

            if datos.modalidad is not None and datos.modalidad != mesa.modalidad:
                mesa.modalidad = datos.modalidad
                campos_modificados.append("modalidad")

            if datos.estado is not None and datos.estado != mesa.estado:
                mesa.estado = datos.estado
                campos_modificados.append("estado")

            if datos.tipo_mesa is not None and datos.tipo_mesa != mesa.tipo_mesa:
                mesa.tipo_mesa = datos.tipo_mesa
                campos_modificados.append("tipo_mesa")

            if datos.linea_id is not None and datos.linea_id != mesa.linea_id:
                mesa.linea_id = datos.linea_id
                campos_modificados.append("linea_id")

            if datos.dimension_id is not None and datos.dimension_id != mesa.dimension_id:
                mesa.dimension_id = datos.dimension_id
                campos_modificados.append("dimension_id")

            if datos.territorio_id is not None and datos.territorio_id != mesa.territorio_id:
                mesa.territorio_id = datos.territorio_id
                campos_modificados.append("territorio_id")

            if datos.facilitador_id is not None and datos.facilitador_id != mesa.facilitador_id:
                mesa.facilitador_id = datos.facilitador_id
                campos_modificados.append("facilitador_id")

            # Sincronización y combinación atómica de metadatos JSONB
            nuevos_metadatos = dict(mesa.metadatos or {})
            if datos.metadatos is not None:
                nuevos_metadatos.update(datos.metadatos)
                campos_modificados.append("metadatos")
            if datos.entidad_responsable is not None:
                nuevos_metadatos["entidad"] = datos.entidad_responsable
                campos_modificados.append("entidad_responsable")
            if datos.facilitador_principal is not None:
                nuevos_metadatos["facilitador"] = datos.facilitador_principal
                campos_modificados.append("facilitador_principal")
            if lugar is not None:
                nuevos_metadatos["lugar"] = lugar
            mesa.metadatos = nuevos_metadatos

            mesa.actualizado_en = datetime.now(UTC)

            mesa_actualizada = await self.repository.actualizar_mesa(mesa)

            # Sincronización bidireccional con agenda vinculada (FIX-EDIT-MESA-01)
            if "lugar_nombre" in campos_modificados or "fecha" in campos_modificados or "horario" in campos_modificados:
                agenda = await self.repository.obtener_agenda_para_actualizar_por_mesa_id(mesa_actualizada.id)
                if agenda:
                    if "lugar_nombre" in campos_modificados and mesa_actualizada.lugar_nombre:
                        agenda.lugar = mesa_actualizada.lugar_nombre
                    if "fecha" in campos_modificados and mesa_actualizada.fecha:
                        agenda.fecha = mesa_actualizada.fecha.isoformat()
                    if "horario" in campos_modificados and mesa_actualizada.horario:
                        agenda.hora_inicio = mesa_actualizada.horario
                    agenda.actualizado_en = datetime.now(UTC)
                    await self.repository.actualizar_agenda(agenda)

            # Registro inmutable de auditoría forense (OBS-21)
            auditoria = RegistroAuditoria(
                tabla_afectada="mesas_trabajo.mesas",
                registro_id=mesa_actualizada.id,
                accion="ACTUALIZAR_METADATOS_MESA",
                usuario_id=sujeto.sujeto_id if sujeto else None,
                causal="tecnica",
                justificacion_motivada=f"Actualización de metadatos de mesa {mesa_actualizada.codigo_oficial or mesa_actualizada.nombre}",
                metadatos={
                    "mesa_id": str(mesa_actualizada.id),
                    "codigo_oficial": mesa_actualizada.codigo_oficial,
                    "campos_modificados": campos_modificados,
                },
            )
            self.repository.session.add(auditoria)
            await self.repository.session.flush()
            if "facilitador_id" in campos_modificados:
                await self.repository.session.refresh(mesa_actualizada, attribute_names=["facilitador"])

            return MesaRespuesta.model_validate(mesa_actualizada)

    async def obtener_mesa(self, mesa_id: uuid.UUID | str) -> MesaRespuesta:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        mesa = await self.repository.obtener_por_id(mesa_uuid)
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
        solo_raiz: bool = True,
    ) -> list[MesaRespuesta]:
        if ancestro_ruta is not None:
            self._validar_ruta_ltree(ancestro_ruta)
        mesas = await self.repository.listar(tipo_mesa, estado, fecha, territorio_id, ancestro_ruta, solo_raiz)
        return [MesaRespuesta.model_validate(m) for m in mesas]

    async def listar_submesas(self, mesa_id: uuid.UUID | str) -> list[MesaRespuesta]:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        padre = await self.repository.obtener_por_id(mesa_uuid)
        if not padre:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa padre no encontrada")

        descendientes = await self.repository.buscar_descendientes(padre.ruta_jerarquica, padre.id)
        return [MesaRespuesta.model_validate(m) for m in descendientes]

    # --- Participantes ---

    async def _resolver_mesa_uuid(self, mesa_id: uuid.UUID | str) -> uuid.UUID:
        if isinstance(mesa_id, uuid.UUID):
            return mesa_id
        try:
            return uuid.UUID(str(mesa_id))
        except (ValueError, TypeError, AttributeError):
            pass

        mesa = await self.repository.obtener_por_codigo(str(mesa_id))
        if mesa:
            return mesa.id

        agenda = await self.repository.obtener_agenda_por_id(str(mesa_id).lower())
        if agenda and agenda.mesa_id:
            return agenda.mesa_id

        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

    async def registrar_participante(
        self, mesa_id: uuid.UUID | str, datos: ParticipanteCrear
    ) -> ParticipanteRespuesta:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        async with transaction(self.repository.session):
            # Serializar registro y recuento de asistentes hasta finalizar el caso de uso.
            mesa = await self.repository.obtener_para_actualizar(mesa_uuid)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            existente = await self.repository.obtener_participante(mesa_uuid, datos.sujeto_id)
            if existente:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail="El participante ya se encuentra registrado en esta mesa",
                )

            participante = ParticipanteMesa(
                mesa_id=mesa_uuid,
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
            total = await self.repository.contar_participantes(mesa_uuid)
            mesa.total_asistentes = total
            await self.repository.actualizar_mesa(mesa)

            return ParticipanteRespuesta.model_validate(participante)

    async def listar_participantes(self, mesa_id: uuid.UUID | str) -> list[ParticipanteRespuesta]:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        mesa = await self.repository.obtener_por_id(mesa_uuid)
        if not mesa:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")
        participantes = await self.repository.listar_participantes(mesa_uuid)
        return [ParticipanteRespuesta.model_validate(p) for p in participantes]

    # --- Actas Comunitarias ---

    async def crear_o_actualizar_borrador_acta(
        self, mesa_id: uuid.UUID | str, datos: ActaCrear
    ) -> ActaRespuesta:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        async with transaction(self.repository.session):
            mesa = await self.repository.obtener_para_actualizar(mesa_uuid)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            acta = await self.repository.obtener_acta_por_mesa(mesa_uuid)
            if acta and acta.estado in ("CONCERTADA", "PUBLICADA"):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Violación Forense (Sentencia C-150/15): El acta ya ha sido concertada y es"
                        " inmutable."
                    ),
                )

            participantes = await self.repository.listar_participantes(mesa_uuid)
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
                    mesa_id=mesa_uuid,
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
        self, mesa_id: uuid.UUID | str, datos_cierre: ActaCierre | None = None
    ) -> ActaRespuesta:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        async with transaction(self.repository.session):
            mesa = await self.repository.obtener_para_actualizar(mesa_uuid)
            if not mesa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mesa no encontrada")

            acta = await self.repository.obtener_acta_por_mesa(mesa_uuid)
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

            participantes = await self.repository.listar_participantes(mesa_uuid)
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

    async def obtener_acta(self, mesa_id: uuid.UUID | str) -> ActaRespuesta:
        mesa_uuid = await self._resolver_mesa_uuid(mesa_id)
        acta = await self.repository.obtener_acta_por_mesa(mesa_uuid)
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

    # --- Cronograma y Gestión de Agendas de Mesas (EDIT-02) ---

    async def listar_agendas(
        self,
        tipo: str | None = None,
        estado: str | None = None,
        fecha: date | None = None,
    ) -> list[AgendaRespuesta]:
        agendas = await self.repository.listar_agendas(tipo=tipo, estado=estado, fecha=fecha)
        return [AgendaRespuesta.model_validate(a) for a in agendas]

    async def obtener_agenda(self, agenda_id: str) -> AgendaRespuesta:
        agenda = await self.repository.obtener_agenda_por_id(agenda_id)
        if not agenda:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail=f"Agenda de mesa '{agenda_id}' no encontrada",
            )
        return AgendaRespuesta.model_validate(agenda)

    async def crear_agenda(
        self,
        datos: AgendaCrear,
        sujeto: SujetoAutenticadoContexto | None = None,
    ) -> AgendaRespuesta:
        async with transaction(self.repository.session):
            agenda_id = datos.id or f"m-{uuid.uuid4().hex[:8]}"
            existente = await self.repository.obtener_agenda_por_id(agenda_id)
            if existente:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail=f"Ya existe una mesa programada con ID '{agenda_id}'",
                )

            datos_dict = datos.model_dump()
            datos_dict["id"] = agenda_id
            agenda = MesaAgenda(**datos_dict)
            creada = await self.repository.crear_agenda(agenda)

            # Registro de auditoría forense inmutable (OBS-22)
            agenda_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"mesas_agendas:{creada.id}")
            auditoria = RegistroAuditoria(
                tabla_afectada="mesas_trabajo.mesas_agendas",
                registro_id=agenda_uuid,
                accion="CREAR_AGENDA_MESA",
                usuario_id=sujeto.sujeto_id if sujeto else None,
                causal="tecnica",
                justificacion_motivada=f"Programación de mesa en agenda {creada.id} - {creada.nombre}",
                metadatos={
                    "agenda_id": creada.id,
                    "tipo": creada.tipo,
                    "nombre": creada.nombre,
                    "fecha": str(creada.fecha),
                    "lugar": creada.lugar,
                },
            )
            self.repository.session.add(auditoria)
            await self.repository.session.flush()

            return AgendaRespuesta.model_validate(creada)

    async def actualizar_agenda(
        self,
        agenda_id: str,
        datos: AgendaActualizar,
        sujeto: SujetoAutenticadoContexto | None = None,
    ) -> AgendaRespuesta:
        async with transaction(self.repository.session):
            agenda = await self.repository.obtener_agenda_para_actualizar(agenda_id)
            if not agenda:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    detail=f"Agenda de mesa '{agenda_id}' no encontrada",
                )

            campos_modificados: list[str] = []
            if datos.tipo is not None and datos.tipo != agenda.tipo:
                agenda.tipo = datos.tipo
                campos_modificados.append("tipo")
            if datos.nombre is not None and datos.nombre != agenda.nombre:
                agenda.nombre = datos.nombre
                campos_modificados.append("nombre")
            if datos.territorio is not None and datos.territorio != agenda.territorio:
                agenda.territorio = datos.territorio
                campos_modificados.append("territorio")
            if datos.lugar is not None and datos.lugar != agenda.lugar:
                agenda.lugar = datos.lugar
                campos_modificados.append("lugar")
            if datos.fecha is not None and datos.fecha != agenda.fecha:
                agenda.fecha = datos.fecha
                campos_modificados.append("fecha")
            if datos.hora_inicio is not None and datos.hora_inicio != agenda.hora_inicio:
                agenda.hora_inicio = datos.hora_inicio
                campos_modificados.append("hora_inicio")
            if datos.hora_fin is not None and datos.hora_fin != agenda.hora_fin:
                agenda.hora_fin = datos.hora_fin
                campos_modificados.append("hora_fin")
            if datos.estado is not None and datos.estado != agenda.estado:
                agenda.estado = datos.estado
                campos_modificados.append("estado")
            if datos.dimensiones_onu is not None and datos.dimensiones_onu != agenda.dimensiones_onu:
                agenda.dimensiones_onu = datos.dimensiones_onu
                campos_modificados.append("dimensiones_onu")
            if datos.responsable is not None and datos.responsable != agenda.responsable:
                agenda.responsable = datos.responsable
                campos_modificados.append("responsable")
            if datos.observaciones is not None and datos.observaciones != agenda.observaciones:
                agenda.observaciones = datos.observaciones
                campos_modificados.append("observaciones")
            if "mesa_id" in datos.model_fields_set and datos.mesa_id != agenda.mesa_id:
                agenda.mesa_id = datos.mesa_id
                campos_modificados.append("mesa_id")

            agenda.actualizado_en = datetime.now(UTC)
            actualizada = await self.repository.actualizar_agenda(agenda)

            # Sincronización bidireccional con mesa vinculada (FIX-EDIT-MESA-01)
            if "lugar" in campos_modificados and actualizada.mesa_id:
                mesa_vinculada = await self.repository.obtener_para_actualizar(actualizada.mesa_id)
                if mesa_vinculada and mesa_vinculada.lugar_nombre != actualizada.lugar:
                    mesa_vinculada.lugar_nombre = actualizada.lugar
                    nuevos_meta = dict(mesa_vinculada.metadatos or {})
                    nuevos_meta["lugar"] = actualizada.lugar
                    mesa_vinculada.metadatos = nuevos_meta
                    mesa_vinculada.actualizado_en = datetime.now(UTC)
                    await self.repository.actualizar_mesa(mesa_vinculada)

            # Registro de auditoría forense inmutable (OBS-22)
            agenda_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"mesas_agendas:{actualizada.id}")
            auditoria = RegistroAuditoria(
                tabla_afectada="mesas_trabajo.mesas_agendas",
                registro_id=agenda_uuid,
                accion="ACTUALIZAR_AGENDA_MESA",
                usuario_id=sujeto.sujeto_id if sujeto else None,
                causal="tecnica",
                justificacion_motivada=f"Actualización de agenda de mesa {actualizada.id}",
                metadatos={
                    "agenda_id": actualizada.id,
                    "campos_modificados": campos_modificados,
                    "estado": actualizada.estado,
                },
            )
            self.repository.session.add(auditoria)
            await self.repository.session.flush()

            return AgendaRespuesta.model_validate(actualizada)

