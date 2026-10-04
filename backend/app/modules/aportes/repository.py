"""Repositorio asíncrono para aportes ciudadanos en participacion_ciudadana."""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.aportes.models import PropuestaCiudadana
from app.modules.aportes.schemas import PropuestaCiudadanaCreate, PropuestaCiudadanaUpdate
from app.modules.sesion.schemas import SesionContexto


class AporteRepository:
    """Acceso a datos para propuestas y aportes ciudadanos con enfoque diferencial."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def crear(
        self,
        datos: PropuestaCiudadanaCreate,
        sesion_contexto: SesionContexto | None = None,
    ) -> PropuestaCiudadana:
        """Crea y persiste un nuevo aporte ciudadano."""
        datos_dict = datos.model_dump()
        propuesta = PropuestaCiudadana(**datos_dict)
        if sesion_contexto is not None:
            propuesta.sesion_id = sesion_contexto.sesion_id
            propuesta.huella_hash = sesion_contexto.huella_hash
        self.session.add(propuesta)
        await self.session.flush()
        await self.session.refresh(propuesta)
        return propuesta

    async def obtener_por_id(
        self, aporte_id: uuid.UUID, incluir_inactivos: bool = False
    ) -> PropuestaCiudadana | None:
        """Obtiene un aporte por su identificador UUIDv7."""
        query = select(PropuestaCiudadana).where(PropuestaCiudadana.id == aporte_id)
        if not incluir_inactivos:
            query = query.where(PropuestaCiudadana.activo.is_(True))

        resultado = await self.session.execute(query)
        return resultado.scalar_one_or_none()

    async def listar(
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
    ) -> tuple[int, Sequence[PropuestaCiudadana]]:
        """Lista propuestas ciudadanas con filtros territoriales, sectoriales y diferenciales."""
        condiciones = []

        if solo_activos:
            condiciones.append(PropuestaCiudadana.activo.is_(True))
        if dimension_id is not None:
            condiciones.append(PropuestaCiudadana.dimension_id == dimension_id)
        if territorio_id is not None:
            condiciones.append(PropuestaCiudadana.territorio_id == territorio_id)
        if linea_id is not None:
            condiciones.append(PropuestaCiudadana.linea_id == linea_id)
        if tipo_aporte is not None:
            condiciones.append(PropuestaCiudadana.tipo_aporte == tipo_aporte)
        if estado is not None:
            condiciones.append(PropuestaCiudadana.estado == estado)
        if grupo_etnico is not None:
            condiciones.append(PropuestaCiudadana.metadata_enfoque["etnia"].astext == grupo_etnico)
        if genero is not None:
            condiciones.append(PropuestaCiudadana.metadata_enfoque["genero"].astext == genero)
        if es_victima_conflicto is not None:
            condiciones.append(
                PropuestaCiudadana.metadata_enfoque["es_victima_conflicto"].astext
                == str(es_victima_conflicto).lower()
            )
        if sesion_id is not None:
            condiciones.append(PropuestaCiudadana.sesion_id == sesion_id)
        if solo_etnicos:
            condiciones.append(PropuestaCiudadana.es_territorio_etnico.is_(True))
        if requiere_consulta_previa is not None:
            condiciones.append(
                PropuestaCiudadana.requiere_consulta_previa.is_(requiere_consulta_previa)
            )
        if ruta_etnica_diferenciada is not None:
            condiciones.append(
                PropuestaCiudadana.ruta_etnica_diferenciada.is_(ruta_etnica_diferenciada)
            )
        if busqueda:
            termino = f"%{busqueda}%"
            condiciones.append(
                (PropuestaCiudadana.titulo.ilike(termino))
                | (PropuestaCiudadana.descripcion.ilike(termino))
            )

        # Contar total con filtros
        conteo_query = select(func.count(PropuestaCiudadana.id))
        if condiciones:
            conteo_query = conteo_query.where(*condiciones)
        total_resultado = await self.session.execute(conteo_query)
        total = total_resultado.scalar_one()

        # Obtener página
        datos_query = (
            select(PropuestaCiudadana)
            .options(selectinload(PropuestaCiudadana.territorio))
            .order_by(PropuestaCiudadana.creado_en.desc())
            .limit(limite)
            .offset(desplazamiento)
        )
        if condiciones:
            datos_query = datos_query.where(*condiciones)

        resultado = await self.session.execute(datos_query)
        elementos = resultado.scalars().all()

        return total, elementos

    async def actualizar(
        self, aporte_id: uuid.UUID, cambios: PropuestaCiudadanaUpdate
    ) -> PropuestaCiudadana | None:
        """Actualiza atributos de una propuesta existente."""
        propuesta = await self.obtener_por_id(aporte_id, incluir_inactivos=True)
        if not propuesta:
            return None

        cambios_dict = cambios.model_dump(exclude_unset=True)
        for clave, valor in cambios_dict.items():
            setattr(propuesta, clave, valor)

        await self.session.flush()
        await self.session.refresh(propuesta)
        return propuesta

    async def desactivar(self, aporte_id: uuid.UUID) -> bool:
        """Aplica soft-delete marcando activo=False."""
        propuesta = await self.obtener_por_id(aporte_id, incluir_inactivos=False)
        if not propuesta:
            return False

        propuesta.activo = False
        await self.session.flush()
        return True

    async def sumar_apoyo(
        self, aporte_id: uuid.UUID, sujeto: Any = None
    ) -> PropuestaCiudadana | None:
        """Incrementa el contador de respaldo popular mediante inserción única de apoyo."""
        propuesta = await self.obtener_por_id(aporte_id, incluir_inactivos=False)
        if not propuesta:
            return None

        from app.modules.aportes.models import ApoyoPropuesta

        if sujeto is None:
            sujeto_id = uuid.uuid4()
            tipo_sujeto = "sesion_anonima"
        else:
            sujeto_id = sujeto.sujeto_id
            tipo_sujeto = "sesion_anonima" if getattr(sujeto, "es_anonimo", False) else "usuario"

        apoyo = ApoyoPropuesta(
            propuesta_id=propuesta.id,
            sujeto_id=sujeto_id,
            tipo_sujeto=tipo_sujeto,
        )
        self.session.add(apoyo)
        await self.session.flush()

        await self.session.refresh(propuesta)
        return propuesta
