import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.testimonios.models import TestimonioComunitario


class TestimoniosRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def obtener_siguiente_codigo(self) -> str:
        """Genera un código secuencial mnemónico TEST-XXX garantizado."""
        sql = text("""
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(codigo_unico FROM 6) AS INTEGER)),
                0
            ) + 1
            FROM participacion_ciudadana.testimonios_comunitarios
            WHERE codigo_unico ~ '^TEST-[0-9]+$';
        """)
        resultado = (await self.session.execute(sql)).scalar() or 1
        return f"TEST-{resultado:03d}"

    async def listar_publicos(
        self,
        territorio_id: uuid.UUID | None = None,
        dimension_id: uuid.UUID | None = None,
        solo_destacados: bool = False,
    ) -> list[TestimonioComunitario]:
        """Consulta pública de la galería ciudadana (solo testimonios aprobados o destacados)."""
        stmt = (
            select(TestimonioComunitario)
            .options(
                selectinload(TestimonioComunitario.territorio),
                selectinload(TestimonioComunitario.dimension),
            )
            .where(TestimonioComunitario.activo.is_(True))
        )

        if solo_destacados:
            stmt = stmt.where(TestimonioComunitario.estado == "DESTACADO")
        else:
            stmt = stmt.where(TestimonioComunitario.estado.in_(["APROBADO", "DESTACADO"]))

        if territorio_id:
            stmt = stmt.where(TestimonioComunitario.territorio_id == territorio_id)
        if dimension_id:
            stmt = stmt.where(TestimonioComunitario.dimension_id == dimension_id)

        # Destacados primero, luego los más recientes
        stmt = stmt.order_by(
            case((TestimonioComunitario.estado == "DESTACADO", 1), else_=2),
            TestimonioComunitario.creado_en.desc(),
        )

        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def listar_gestion(
        self,
        estado: str | None = None,
        territorio_id: uuid.UUID | None = None,
    ) -> list[TestimonioComunitario]:
        """Consulta para el panel de curaduría y moderación de funcionarios."""
        stmt = (
            select(TestimonioComunitario)
            .options(
                selectinload(TestimonioComunitario.territorio),
                selectinload(TestimonioComunitario.dimension),
            )
            .where(TestimonioComunitario.activo.is_(True))
        )

        if estado:
            stmt = stmt.where(TestimonioComunitario.estado == estado.upper())
        if territorio_id:
            stmt = stmt.where(TestimonioComunitario.territorio_id == territorio_id)

        stmt = stmt.order_by(TestimonioComunitario.creado_en.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def obtener_por_id(self, id: uuid.UUID) -> TestimonioComunitario | None:
        stmt = (
            select(TestimonioComunitario)
            .options(
                selectinload(TestimonioComunitario.territorio),
                selectinload(TestimonioComunitario.dimension),
            )
            .where(TestimonioComunitario.id == id, TestimonioComunitario.activo.is_(True))
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def crear(self, testimonio: TestimonioComunitario) -> TestimonioComunitario:
        self.session.add(testimonio)
        await self.session.flush()
        return testimonio

    async def moderar(
        self,
        testimonio: TestimonioComunitario,
        nuevo_estado: str,
        motivo: str | None = None,
        moderador_id: uuid.UUID | None = None,
    ) -> TestimonioComunitario:
        testimonio.estado = nuevo_estado.upper()
        testimonio.motivo_moderacion = motivo
        testimonio.moderado_por_id = moderador_id
        testimonio.moderado_en = datetime.now(UTC)
        await self.session.flush()
        return testimonio

    async def obtener_resumen_metricas(self) -> dict[str, Any]:
        """Calcula los totales de testimonios por estado y por territorio distrital."""
        sql_estados = text("""
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado = 'APROBADO') AS aprobados,
                COUNT(*) FILTER (WHERE estado = 'DESTACADO') AS destacados,
                COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
                COUNT(*) FILTER (WHERE estado = 'RECHAZADO') AS rechazados
            FROM participacion_ciudadana.testimonios_comunitarios
            WHERE activo = true;
        """)
        row = (await self.session.execute(sql_estados)).fetchone()
        total = row[0] or 0
        aprobados = row[1] or 0
        destacados = row[2] or 0
        pendientes = row[3] or 0
        rechazados = row[4] or 0

        sql_territorios = text("""
            SELECT 
                t.id,
                t.codigo,
                t.nombre,
                COUNT(tc.id) AS total_testimonios
            FROM geodatos.territorios t
            LEFT JOIN participacion_ciudadana.testimonios_comunitarios tc
                ON tc.territorio_id = t.id AND tc.activo = true AND tc.estado IN ('APROBADO', 'DESTACADO')
            GROUP BY t.id, t.codigo, t.nombre
            ORDER BY total_testimonios DESC, t.nombre ASC;
        """)
        terr_rows = (await self.session.execute(sql_territorios)).fetchall()
        por_territorio = [
            {
                "territorio_id": str(r[0]),
                "codigo": r[1],
                "nombre": r[2],
                "total_testimonios": int(r[3]),
            }
            for r in terr_rows
        ]

        return {
            "total_testimonios": total,
            "aprobados": aprobados,
            "destacados": destacados,
            "pendientes": pendientes,
            "rechazados": rechazados,
            "por_territorio": por_territorio,
        }
