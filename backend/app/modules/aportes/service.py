"""Servicio de lógica de negocio para la gestión de aportes y participación ciudadana."""

import logging
import uuid

from fastapi import HTTPException, status

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import (
    MisApoyosRespuesta,
    PropuestaCiudadanaCreate,
    PropuestaCiudadanaRead,
    PropuestaCiudadanaUpdate,
    PropuestasPaginadasRead,
    RespuestaToggleApoyo,
)
from app.modules.sesion.schemas import SesionContexto

logger = logging.getLogger("polis.aportes.service")


class AporteService:
    """Lógica de negocio para aportes ciudadanos con enfoque diferencial."""

    def __init__(
        self, repository: AporteRepository, settings: Settings | None = None
    ) -> None:
        self.repository = repository
        self.settings = settings or Settings()

    async def crear_propuesta(
        self,
        datos: PropuestaCiudadanaCreate,
        sesion_contexto: SesionContexto | None = None,
    ) -> PropuestaCiudadanaRead:
        """Valida y registra un nuevo aporte ciudadano con enfoque diferencial."""
        async with transaction(self.repository.session):
            # Salvaguarda de anonimato ciudadano
            if datos.es_anonimo and (not datos.autor_nombre or datos.autor_nombre == ""):
                datos.autor_nombre = "Ciudadano Anónimo"

            # Detección de Salvaguardas Etnicas
            # 1. Por metadatos explícitos
            etnia = datos.metadata_enfoque.etnia
            etnias_especiales = {
                "indigena",
                "afrocolombiano_negro",
                "raizal",
                "palenquero",
                "rrom_gitano",
            }
            if etnia in etnias_especiales:
                datos.ruta_etnica_diferenciada = True

            # 2. Por territorio asociado
            if datos.territorio_id:
                from sqlalchemy import select

                from app.modules.geodatos.models import Territorio

                stmt = select(Territorio).where(Territorio.id == datos.territorio_id)
                resultado = await self.repository.session.execute(stmt)
                territorio = resultado.scalar_one_or_none()

                if territorio and territorio.es_zona_etnica:
                    datos.es_territorio_etnico = True
                    datos.requiere_consulta_previa = True
                    datos.ruta_etnica_diferenciada = True
                    datos.consejo_comunitario = territorio.nombre_consejo_comunitario

            correo_notif = datos.correo_contacto
            propuesta = await self.repository.crear(datos, sesion_contexto=sesion_contexto)

            if correo_notif:
                try:
                    from app.modules.notificaciones.service import NotificacionService

                    notif_service = NotificacionService(
                        self.repository.session, settings=self.settings
                    )
                    await notif_service.enviar_constancia_radicacion(
                        destinatario=correo_notif,
                        radicado=propuesta.codigo_radicado,
                        titulo=propuesta.titulo,
                        descripcion=propuesta.descripcion,
                        autor=propuesta.autor_nombre,
                    )
                except Exception as err:
                    logger.warning(
                        "Fallo no bloqueante al registrar notificacion para radicado %s: %s",
                        propuesta.codigo_radicado,
                        err,
                    )

            return PropuestaCiudadanaRead.model_validate(propuesta)

    async def obtener_propuesta(self, aporte_id: uuid.UUID) -> PropuestaCiudadanaRead:
        """Obtiene un aporte por su ID o lanza 404 si no existe o fue desactivado."""
        propuesta = await self.repository.obtener_por_id(aporte_id)
        if not propuesta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada o inactiva",
            )
        return PropuestaCiudadanaRead.model_validate(propuesta)

    async def listar_propuestas(
        self,
        *,
        dimension_id: uuid.UUID | None = None,
        territorio_id: uuid.UUID | None = None,
        linea_id: uuid.UUID | None = None,
        tipo_aporte: str | None = None,
        estado: str | None = None,
        grupo_etnico: str | None = None,
        genero: str | None = None,
        es_victima_conflicto: bool | None = None,
        sesion_id: uuid.UUID | None = None,
        busqueda: str | None = None,
        solo_activos: bool = True,
        solo_etnicos: bool | None = None,
        requiere_consulta_previa: bool | None = None,
        ruta_etnica_diferenciada: bool | None = None,
        limite: int = 20,
        desplazamiento: int = 0,
    ) -> PropuestasPaginadasRead:
        """Obtiene un listado paginado y filtrado de propuestas ciudadanas."""
        total, elementos = await self.repository.listar(
            dimension_id=dimension_id,
            territorio_id=territorio_id,
            linea_id=linea_id,
            tipo_aporte=tipo_aporte,
            estado=estado,
            grupo_etnico=grupo_etnico,
            genero=genero,
            es_victima_conflicto=es_victima_conflicto,
            sesion_id=sesion_id,
            busqueda=busqueda,
            solo_activos=solo_activos,
            solo_etnicos=solo_etnicos,
            requiere_consulta_previa=requiere_consulta_previa,
            ruta_etnica_diferenciada=ruta_etnica_diferenciada,
            limite=limite,
            desplazamiento=desplazamiento,
        )

        elementos_read = [PropuestaCiudadanaRead.model_validate(el) for el in elementos]
        return PropuestasPaginadasRead(
            total=total,
            limite=limite,
            desplazamiento=desplazamiento,
            elementos=elementos_read,
        )

    async def actualizar_propuesta(
        self, aporte_id: uuid.UUID, cambios: PropuestaCiudadanaUpdate
    ) -> PropuestaCiudadanaRead:
        """Actualiza una propuesta existente y notifica cambios de estado si corresponde."""
        async with transaction(self.repository.session):
            if cambios.estado == "rechazado":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=(
                        "Prohibición técnica: El descarte silencioso está bloqueado (C-150/15). Use"
                        " el mecanismo de devolución de razones motivadas."
                    ),
                )

            propuesta_previa = await self.repository.obtener_por_id(aporte_id, incluir_inactivos=True)
            if not propuesta_previa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada",
                )
            estado_anterior = propuesta_previa.estado

            propuesta = await self.repository.actualizar(aporte_id, cambios)
            if not propuesta:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada",
                )

            if cambios.estado and cambios.estado != estado_anterior:
                correo = (propuesta.metadatos or {}).get("correo_contacto")
                if correo:
                    try:
                        from app.modules.notificaciones.service import NotificacionService

                        notif_service = NotificacionService(
                            self.repository.session, settings=self.settings
                        )
                        await notif_service.enviar_notificacion_cambio_estado(
                            destinatario=correo,
                            radicado=propuesta.codigo_radicado,
                            titulo=propuesta.titulo,
                            nuevo_estado=cambios.estado,
                            observaciones="Actualización en el estado de tramitación en POLIS.",
                        )
                    except Exception as err:
                        logger.warning(
                            "Fallo no bloqueante al notificar cambio de estado para radicado %s: %s",
                            propuesta.codigo_radicado,
                            err,
                        )

            return PropuestaCiudadanaRead.model_validate(propuesta)

    async def desactivar_propuesta(self, aporte_id: uuid.UUID) -> None:
        """Aplica soft-delete a una propuesta ciudadana."""
        async with transaction(self.repository.session):
            desactivado = await self.repository.desactivar(aporte_id)
            if not desactivado:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Propuesta ciudadana con ID {aporte_id} no encontrada para desactivación"
                    ),
                )

    async def apoyar_propuesta(self, aporte_id: uuid.UUID, sujeto) -> PropuestaCiudadanaRead:
        """Suma un respaldo ciudadano a la propuesta garantizando unicidad."""
        async with transaction(self.repository.session):
            from sqlalchemy.exc import IntegrityError

            try:
                propuesta = await self.repository.sumar_apoyo(aporte_id, sujeto)
            except IntegrityError as err:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El participante ya ha respaldado esta propuesta previamente",
                ) from err

            if not propuesta:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada",
                )
            return PropuestaCiudadanaRead.model_validate(propuesta)

    async def alternar_apoyo(self, aporte_id: uuid.UUID, sujeto) -> RespuestaToggleApoyo:
        """Alterna el respaldo popular (suma si no existe, retira si ya existe)."""
        async with transaction(self.repository.session):
            propuesta, apoyado = await self.repository.alternar_apoyo(aporte_id, sujeto)
            if not propuesta:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada",
                )
            mensaje = (
                "¡Respaldo ciudadano registrado con éxito!"
                if apoyado
                else "Respaldo ciudadano retirado con éxito"
            )
            return RespuestaToggleApoyo(
                propuesta_id=propuesta.id,
                apoyado=apoyado,
                apoyos_contador=propuesta.apoyos_contador,
                mensaje=mensaje,
            )

    async def retirar_apoyo(self, aporte_id: uuid.UUID, sujeto) -> PropuestaCiudadanaRead:
        """Retira el respaldo ciudadano de una propuesta."""
        async with transaction(self.repository.session):
            propuesta = await self.repository.retirar_apoyo(aporte_id, sujeto)
            if not propuesta:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada",
                )
            return PropuestaCiudadanaRead.model_validate(propuesta)

    async def obtener_mis_apoyos(self, sujeto) -> MisApoyosRespuesta:
        """Obtiene la lista de UUIDs de propuestas que la sesión actual ha respaldado."""
        ids = await self.repository.obtener_apoyos_sujeto(sujeto)
        return MisApoyosRespuesta(propuestas_apoyadas=ids)


    async def registrar_devolucion_motivada(
        self,
        aporte_id: uuid.UUID,
        datos_devolucion,  # DevolucionRazonCrear
        sujeto,  # SujetoAutenticadoContexto
    ):
        """Registra una devolución motivada (Sentencia C-150 de 2015)."""
        async with transaction(self.repository.session):
            propuesta = await self.repository.obtener_por_id(aporte_id)
            if not propuesta:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Propuesta ciudadana con ID {aporte_id} no encontrada",
                )

            if propuesta.estado == "rechazado":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La propuesta ya se encuentra en estado rechazado.",
                )

            # 1. Actualizar estado saltando validaciones de actualizar_propuesta
            # Lo haremos a traves de SQLAlchemy
            from app.modules.auditoria.models import RegistroAuditoria

            propuesta.estado = "rechazado"
            self.repository.session.add(propuesta)

            # 2. Crear registro de auditoría
            registro = RegistroAuditoria(
                tabla_afectada="participacion_ciudadana.propuestas_ciudadanas",
                registro_id=propuesta.id,
                accion="DEVOLUCION_MOTIVADA",
                usuario_id=sujeto.sujeto_id if not sujeto.es_anonimo else None,
                causal=datos_devolucion.causal,
                justificacion_motivada=datos_devolucion.justificacion_motivada,
                metadatos=datos_devolucion.metadatos,
            )
            self.repository.session.add(registro)
            await self.repository.session.flush()
            await self.repository.session.refresh(registro)

            from app.modules.auditoria.schemas import DevolucionRazonRespuesta

            return DevolucionRazonRespuesta.model_validate(registro)

    async def consultar_historial_devolucion(self, aporte_id: uuid.UUID):
        """Obtiene las razones de rechazo/archivo de la propuesta."""
        from sqlalchemy import select

        from app.modules.auditoria.models import RegistroAuditoria

        stmt = (
            select(RegistroAuditoria)
            .where(
                RegistroAuditoria.tabla_afectada == "participacion_ciudadana.propuestas_ciudadanas",
                RegistroAuditoria.registro_id == aporte_id,
                RegistroAuditoria.accion == "DEVOLUCION_MOTIVADA",
            )
            .order_by(RegistroAuditoria.creado_en.desc())
        )

        result = await self.repository.session.execute(stmt)
        registros = result.scalars().all()

        from app.modules.auditoria.schemas import DevolucionRazonRespuesta

        return [DevolucionRazonRespuesta.model_validate(r) for r in registros]
