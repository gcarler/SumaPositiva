import uuid
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.comunicaciones.models import TareaComunicacion
from app.modules.formularios.models import FormularioConsulta
from app.modules.mesas.models import MesaAgenda
from app.modules.proyectos.models import ActividadAnexo

# Estados canónicos por módulo: conservan la semántica del módulo dueño y
# traducen a un vocabulario común para la vista agregada.
CANONICO_POR_FORMULARIO = {"BORRADOR": "pendiente", "PUBLICADO": "en_progreso", "CERRADO": "completada"}
CANONICO_POR_AGENDA = {
    "programada": "programada",
    "en_curso": "en_progreso",
    "realizada": "completada",
    "reprogramada": "reprogramada",
    "cancelada": "cancelada",
}
CANONICO_POR_COMUNICACIONES = {
    "pendiente": "pendiente",
    "en_progreso": "en_progreso",
    "completada": "completada",
    "reprogramada": "reprogramada",
}


class ProyectosRepository:
    """Lecturas sobre tablas existentes y gestión de anexos de actividades."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def conteo_anexos_por_actividad(self) -> dict[str, int]:
        """Devuelve un mapa actividad_id -> cantidad de anexos activos."""
        stmt = (
            select(ActividadAnexo.actividad_id, func.count(ActividadAnexo.id))
            .where(ActividadAnexo.eliminado_en.is_(None))
            .group_by(ActividadAnexo.actividad_id)
        )
        res = await self.session.execute(stmt)
        return {str(fila[0]): int(fila[1]) for fila in res.all()}

    async def existe_actividad(self, actividad_id: str) -> tuple[bool, str, str]:
        """Comprueba si una actividad existe en su módulo dueño.

        Retorna (existe, modulo_dueno, recurso_id).
        """
        if ":" not in actividad_id:
            return False, "", ""
        modulo_dueno, _, recurso_id = actividad_id.partition(":")

        if modulo_dueno == "comunicaciones":
            try:
                rec_uuid = uuid.UUID(recurso_id)
            except ValueError:
                return False, modulo_dueno, recurso_id
            stmt = select(func.count(TareaComunicacion.id)).where(TareaComunicacion.id == rec_uuid)
            res = (await self.session.execute(stmt)).scalar_one()
            return res > 0, modulo_dueno, recurso_id

        if modulo_dueno == "mesas":
            stmt = select(func.count(MesaAgenda.id)).where(MesaAgenda.id == recurso_id)
            res = (await self.session.execute(stmt)).scalar_one()
            return res > 0, modulo_dueno, recurso_id

        if modulo_dueno == "formularios":
            try:
                rec_uuid = uuid.UUID(recurso_id)
            except ValueError:
                return False, modulo_dueno, recurso_id
            stmt = select(func.count(FormularioConsulta.id)).where(FormularioConsulta.id == rec_uuid)
            res = (await self.session.execute(stmt)).scalar_one()
            return res > 0, modulo_dueno, recurso_id

        return False, modulo_dueno, recurso_id

    async def listar(
        self,
        *,
        modulo: str | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        conteos = await self.conteo_anexos_por_actividad()

        if modulo is None or modulo == "comunicaciones":
            filas = (await self.session.execute(select(TareaComunicacion))).scalars()
            for t in filas:
                if fecha_desde and t.fecha_fin < fecha_desde:
                    continue
                if fecha_hasta and t.fecha_inicio > fecha_hasta:
                    continue
                act_id = f"comunicaciones:{t.id}"
                yield {
                    "id": act_id,
                    "modulo_dueno": "comunicaciones",
                    "recurso_id": str(t.id),
                    "codigo": t.codigo,
                    "titulo": t.titulo,
                    "descripcion": t.descripcion,
                    "etapa": t.etapa,
                    "territorio": t.territorio,
                    "lugar": None,
                    "fecha_inicio": t.fecha_inicio,
                    "fecha_fin": t.fecha_fin,
                    "hora_inicio": None,
                    "hora_fin": None,
                    "estado_nativo": t.estado,
                    "estado_canonico": CANONICO_POR_COMUNICACIONES.get(t.estado, "pendiente"),
                    "avance_pct": 100.0 if t.estado == "completada" else 0.0,
                    "responsable": t.responsable,
                    "permiso_editar": "comunicaciones:gestionar",
                    "total_anexos": conteos.get(act_id, 0),
                }

        if modulo is None or modulo == "mesas":
            filas = (await self.session.execute(select(MesaAgenda))).scalars()
            for a in filas:
                # Si la agenda no tiene fecha asignada ("Por definir"), se proyecta con
                # la fecha del día para permitir su visibilidad y gestión de anexos en proyectos.
                fecha_act = a.fecha or date.today()
                if fecha_desde and fecha_act < fecha_desde:
                    continue
                if fecha_hasta and fecha_act > fecha_hasta:
                    continue
                act_id = f"mesas:{a.id}"
                yield {
                    "id": act_id,
                    "modulo_dueno": "mesas",
                    "recurso_id": a.id,
                    "codigo": a.id,
                    "titulo": a.nombre,
                    "descripcion": a.observaciones or "",
                    "etapa": a.tipo,
                    "territorio": a.territorio,
                    "lugar": a.lugar,
                    "fecha_inicio": fecha_act,
                    "fecha_fin": a.fecha,
                    "hora_inicio": a.hora_inicio,
                    "hora_fin": a.hora_fin,
                    "estado_nativo": a.estado,
                    "estado_canonico": CANONICO_POR_AGENDA.get(a.estado, "programada"),
                    "avance_pct": 100.0 if a.estado == "realizada" else 0.0,
                    "responsable": a.responsable or "",
                    "permiso_editar": "mesas:abrir",
                    "total_anexos": conteos.get(act_id, 0),
                }

        if modulo is None or modulo == "formularios":
            filas = (await self.session.execute(select(FormularioConsulta))).scalars()
            for f in filas:
                fecha_inicio = f.creado_en.date()
                fecha_fin = f.fecha_cierre.date() if f.fecha_cierre else None
                if fecha_desde and (fecha_fin is None or fecha_fin < fecha_desde) and fecha_inicio < fecha_desde:
                    continue
                if fecha_hasta and fecha_inicio > fecha_hasta:
                    continue
                act_id = f"formularios:{f.id}"
                yield {
                    "id": act_id,
                    "modulo_dueno": "formularios",
                    "recurso_id": str(f.id),
                    "codigo": f.codigo,
                    "titulo": f.titulo,
                    "descripcion": f.descripcion,
                    "etapa": None,
                    "territorio": "",
                    "lugar": None,
                    "fecha_inicio": fecha_inicio,
                    "fecha_fin": fecha_fin,
                    "hora_inicio": None,
                    "hora_fin": None,
                    "estado_nativo": f.estado,
                    "estado_canonico": CANONICO_POR_FORMULARIO.get(f.estado, "pendiente"),
                    "avance_pct": 100.0 if f.estado == "CERRADO" else 0.0,
                    "responsable": "",
                    "permiso_editar": "formularios:gestionar",
                    "total_anexos": conteos.get(act_id, 0),
                }

    async def listar_anexos(self, actividad_id: str) -> list[ActividadAnexo]:
        stmt = (
            select(ActividadAnexo)
            .where(
                ActividadAnexo.actividad_id == actividad_id,
                ActividadAnexo.eliminado_en.is_(None),
            )
            .order_by(ActividadAnexo.creado_en.desc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def obtener_anexo(self, actividad_id: str, anexo_id: uuid.UUID) -> ActividadAnexo | None:
        stmt = select(ActividadAnexo).where(
            ActividadAnexo.id == anexo_id,
            ActividadAnexo.actividad_id == actividad_id,
            ActividadAnexo.eliminado_en.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def crear_anexo(self, anexo: ActividadAnexo) -> ActividadAnexo:
        self.session.add(anexo)
        await self.session.flush()
        await self.session.refresh(anexo)
        return anexo

    async def eliminar_anexo(self, anexo: ActividadAnexo) -> None:
        anexo.eliminado_en = datetime.now(UTC)
        await self.session.flush()
