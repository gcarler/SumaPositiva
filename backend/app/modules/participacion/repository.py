import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.participacion.models import EscenarioEspecial


class ParticipacionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def obtener_metricas_consolidadas(self) -> dict[str, Any]:
        """Calcula el Gran Total Distrital deduplicado (Canal 1 ∪ Canal 2) + Canal 3."""
        # 1. Sujetos únicos Canal 1 (Web)
        sql_web_unicos = text("""
            SELECT COUNT(DISTINCT id_identificado) FROM (
                SELECT CAST(sesion_id AS text) AS id_identificado 
                FROM participacion_ciudadana.propuestas_ciudadanas 
                WHERE sesion_id IS NOT NULL AND activo = true
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM participacion_ciudadana.apoyos_propuestas 
                WHERE sujeto_id IS NOT NULL
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM participacion_ciudadana.respuestas_formulario 
                WHERE sujeto_id IS NOT NULL
            ) web_sujetos;
        """)
        total_web_unicos = (await self.session.execute(sql_web_unicos)).scalar() or 0

        # 2. Sujetos únicos Canal 2 (Mesas)
        sql_mesas_unicos = text("""
            SELECT COUNT(DISTINCT id_identificado) FROM (
                SELECT CAST(sujeto_id AS text) AS id_identificado 
                FROM mesas_trabajo.participantes_mesa 
                WHERE sujeto_id IS NOT NULL
                UNION
                SELECT CAST(usuario_id AS text)
                FROM mesas_trabajo.participantes_mesa 
                WHERE usuario_id IS NOT NULL
            ) mesas_sujetos;
        """)
        total_mesas_unicos = (await self.session.execute(sql_mesas_unicos)).scalar() or 0

        # 3. Deduplicación Canal 1 ∪ Canal 2
        sql_unificados = text("""
            SELECT COUNT(DISTINCT id_identificado) FROM (
                SELECT CAST(sesion_id AS text) AS id_identificado 
                FROM participacion_ciudadana.propuestas_ciudadanas 
                WHERE sesion_id IS NOT NULL AND activo = true
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM participacion_ciudadana.apoyos_propuestas 
                WHERE sujeto_id IS NOT NULL
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM participacion_ciudadana.respuestas_formulario 
                WHERE sujeto_id IS NOT NULL
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM mesas_trabajo.participantes_mesa 
                WHERE sujeto_id IS NOT NULL
                UNION
                SELECT CAST(usuario_id AS text) 
                FROM mesas_trabajo.participantes_mesa 
                WHERE usuario_id IS NOT NULL
            ) unificados;
        """)
        participantes_unicos_identificados = (await self.session.execute(sql_unificados)).scalar() or 0

        # 4. Total Asistentes Canal 3 (Escenarios Especiales)
        sql_escenarios = text("""
            SELECT COALESCE(SUM(total_asistentes), 0)
            FROM participacion_ciudadana.escenarios_especiales
            WHERE estado = 'REALIZADO';
        """)
        total_canal_escenarios = (await self.session.execute(sql_escenarios)).scalar() or 0

        # 5. Gran total distrital
        gran_total = participantes_unicos_identificados + total_canal_escenarios

        # Totales brutos por canal
        total_canal_web = total_web_unicos
        total_canal_mesas = total_mesas_unicos

        # Desglose territorial agregado
        sql_territorial = text("""
            SELECT 
                t.nombre AS territorio,
                t.codigo AS codigo_territorio,
                COALESCE(web_c.conteo, 0) + COALESCE(mesas_c.conteo, 0) + COALESCE(esc_c.conteo, 0) AS total_participacion
            FROM geodatos.territorios t
            LEFT JOIN (
                SELECT territorio_id, COUNT(*) AS conteo
                FROM participacion_ciudadana.propuestas_ciudadanas
                WHERE territorio_id IS NOT NULL AND activo = true
                GROUP BY territorio_id
            ) web_c ON web_c.territorio_id = t.id
            LEFT JOIN (
                SELECT m.territorio_id, COUNT(p.id) AS conteo
                FROM mesas_trabajo.mesas m
                JOIN mesas_trabajo.participantes_mesa p ON p.mesa_id = m.id
                WHERE m.territorio_id IS NOT NULL
                GROUP BY m.territorio_id
            ) mesas_c ON mesas_c.territorio_id = t.id
            LEFT JOIN (
                SELECT territorio_id, SUM(total_asistentes) AS conteo
                FROM participacion_ciudadana.escenarios_especiales
                WHERE territorio_id IS NOT NULL AND estado = 'REALIZADO'
                GROUP BY territorio_id
            ) esc_c ON esc_c.territorio_id = t.id
            ORDER BY total_participacion DESC, t.nombre ASC;
        """)
        territorios_res = (await self.session.execute(sql_territorial)).fetchall()
        desglose_territorial = [
            {"territorio": r[0], "codigo": r[1], "total_participacion": int(r[2])}
            for r in territorios_res
        ]

        # Porcentajes relativos
        pct_web = round((total_canal_web / gran_total * 100), 2) if gran_total > 0 else 0.0
        pct_mesas = round((total_canal_mesas / gran_total * 100), 2) if gran_total > 0 else 0.0
        pct_esc = round((total_canal_escenarios / gran_total * 100), 2) if gran_total > 0 else 0.0

        return {
            "gran_total_participantes_distrital": gran_total,
            "participantes_unicos_identificados": participantes_unicos_identificados,
            "total_canal_web": total_canal_web,
            "total_canal_mesas": total_canal_mesas,
            "total_canal_escenarios": total_canal_escenarios,
            "porcentaje_canal_web": pct_web,
            "porcentaje_canal_mesas": pct_mesas,
            "porcentaje_canal_escenarios": pct_esc,
            "desglose_territorial_agregado": desglose_territorial,
        }

    async def obtener_desglose_canal_web(self) -> dict[str, Any]:
        """Desagregación analítica web por Línea Estratégica, Dimensión y Territorio."""
        # Totales
        sql_totales = text("""
            SELECT 
                (SELECT COUNT(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE activo = true),
                (SELECT COUNT(*) FROM participacion_ciudadana.apoyos_propuestas),
                (SELECT COUNT(*) FROM participacion_ciudadana.respuestas_formulario);
        """)
        totales_res = (await self.session.execute(sql_totales)).fetchone()
        total_aportes = totales_res[0] or 0
        total_apoyos = totales_res[1] or 0
        total_respuestas = totales_res[2] or 0

        # Participantes únicos web
        sql_unicos = text("""
            SELECT COUNT(DISTINCT id_identificado) FROM (
                SELECT CAST(sesion_id AS text) AS id_identificado 
                FROM participacion_ciudadana.propuestas_ciudadanas 
                WHERE sesion_id IS NOT NULL AND activo = true
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM participacion_ciudadana.apoyos_propuestas 
                WHERE sujeto_id IS NOT NULL
                UNION
                SELECT CAST(sujeto_id AS text) 
                FROM participacion_ciudadana.respuestas_formulario 
                WHERE sujeto_id IS NOT NULL
            ) u;
        """)
        unicos_web = (await self.session.execute(sql_unicos)).scalar() or 0

        # Por Línea Estratégica
        sql_lineas = text("""
            SELECT 
                l.id,
                l.codigo,
                l.titulo,
                d.codigo AS dimension_codigo,
                d.nombre AS dimension_nombre,
                COUNT(p.id) AS total_aportes,
                COALESCE(SUM(p.apoyos_contador), 0) AS total_apoyos
            FROM motor_politicas.lineas_estrategicas l
            JOIN motor_politicas.dimensiones_seguridad_humana d ON d.id = l.dimension_id
            LEFT JOIN participacion_ciudadana.propuestas_ciudadanas p 
                ON p.linea_id = l.id AND p.activo = true
            GROUP BY l.id, l.codigo, l.titulo, d.codigo, d.nombre
            ORDER BY total_aportes DESC, l.codigo ASC;
        """)
        lineas_res = (await self.session.execute(sql_lineas)).fetchall()
        por_linea = [
            {
                "linea_id": str(r[0]),
                "codigo": r[1],
                "titulo": r[2],
                "dimension_codigo": r[3],
                "dimension_nombre": r[4],
                "total_aportes": int(r[5]),
                "total_apoyos": int(r[6]),
            }
            for r in lineas_res
        ]

        # Por Dimensión
        sql_dimensiones = text("""
            SELECT 
                d.id,
                d.codigo,
                d.nombre,
                COUNT(p.id) AS total_aportes
            FROM motor_politicas.dimensiones_seguridad_humana d
            LEFT JOIN participacion_ciudadana.propuestas_ciudadanas p 
                ON p.dimension_id = d.id AND p.activo = true
            GROUP BY d.id, d.codigo, d.nombre
            ORDER BY total_aportes DESC, d.codigo ASC;
        """)
        dim_res = (await self.session.execute(sql_dimensiones)).fetchall()
        por_dimension = [
            {
                "dimension_id": str(r[0]),
                "codigo": r[1],
                "nombre": r[2],
                "total_aportes": int(r[3]),
            }
            for r in dim_res
        ]

        # Por Territorio
        sql_territorio = text("""
            SELECT 
                t.id,
                t.codigo,
                t.nombre,
                COUNT(p.id) AS total_aportes
            FROM geodatos.territorios t
            LEFT JOIN participacion_ciudadana.propuestas_ciudadanas p 
                ON p.territorio_id = t.id AND p.activo = true
            GROUP BY t.id, t.codigo, t.nombre
            ORDER BY total_aportes DESC, t.nombre ASC;
        """)
        terr_res = (await self.session.execute(sql_territorio)).fetchall()
        por_territorio = [
            {
                "territorio_id": str(r[0]),
                "codigo": r[1],
                "nombre": r[2],
                "total_aportes": int(r[3]),
            }
            for r in terr_res
        ]

        return {
            "total_aportes": total_aportes,
            "total_apoyos": total_apoyos,
            "total_respuestas_formularios": total_respuestas,
            "participantes_unicos_web": unicos_web,
            "por_linea_estrategica": por_linea,
            "por_dimension": por_dimension,
            "por_territorio": por_territorio,
        }

    async def obtener_desglose_canal_mesas(self) -> dict[str, Any]:
        """Desagregación jerárquica territorial por mesa principal, submesas y actas."""
        # Conteos globales de mesas
        sql_conteos = text("""
            SELECT 
                COUNT(*) FILTER (WHERE mesa_padre_id IS NULL) AS principales,
                COUNT(*) FILTER (WHERE mesa_padre_id IS NOT NULL) AS submesas,
                (SELECT COUNT(*) FROM mesas_trabajo.participantes_mesa) AS total_participantes,
                (SELECT COUNT(DISTINCT sujeto_id) FROM mesas_trabajo.participantes_mesa) AS unicos_participantes,
                (SELECT COUNT(*) FROM mesas_trabajo.actas_comunitarias WHERE estado IN ('CONCERTADA', 'PUBLICADA')) AS actas_cerradas
            FROM mesas_trabajo.mesas;
        """)
        conteos = (await self.session.execute(sql_conteos)).fetchone()
        tot_principales = conteos[0] or 0
        tot_submesas = conteos[1] or 0
        tot_participantes = conteos[2] or 0
        unicos_participantes = conteos[3] or 0
        actas_cerradas = conteos[4] or 0

        # Jerarquía completa de mesas principales con sus submesas
        sql_jerarquia = text("""
            SELECT 
                m.id,
                m.codigo_oficial,
                m.nombre,
                m.ruta_jerarquica::text AS path,
                m.tipo_mesa,
                t.nombre AS territorio_nombre,
                COUNT(DISTINCT p.id) AS asistentes_conteo,
                EXISTS(SELECT 1 FROM mesas_trabajo.actas_comunitarias a WHERE a.mesa_id = m.id AND a.estado IN ('CONCERTADA', 'PUBLICADA')) AS acta_firmada
            FROM mesas_trabajo.mesas m
            LEFT JOIN geodatos.territorios t ON t.id = m.territorio_id
            LEFT JOIN mesas_trabajo.participantes_mesa p ON p.mesa_id = m.id
            WHERE m.mesa_padre_id IS NULL
            GROUP BY m.id, m.codigo_oficial, m.nombre, m.ruta_jerarquica, m.tipo_mesa, t.nombre
            ORDER BY m.nombre ASC;
        """)
        principales_res = (await self.session.execute(sql_jerarquia)).fetchall()

        # Cargar submesas
        sql_sub = text("""
            SELECT 
                m.id,
                m.mesa_padre_id,
                m.codigo_oficial,
                m.nombre,
                m.ruta_jerarquica::text AS path,
                m.tipo_mesa,
                COUNT(DISTINCT p.id) AS asistentes_conteo
            FROM mesas_trabajo.mesas m
            LEFT JOIN mesas_trabajo.participantes_mesa p ON p.mesa_id = m.id
            WHERE m.mesa_padre_id IS NOT NULL
            GROUP BY m.id, m.mesa_padre_id, m.codigo_oficial, m.nombre, m.ruta_jerarquica, m.tipo_mesa
            ORDER BY m.nombre ASC;
        """)
        submesas_res = (await self.session.execute(sql_sub)).fetchall()
        submesas_por_padre: dict[uuid.UUID, list[dict[str, Any]]] = {}
        for s in submesas_res:
            p_id = s[1]
            submesas_por_padre.setdefault(p_id, []).append(
                {
                    "id": str(s[0]),
                    "codigo": s[2],
                    "nombre": s[3],
                    "path": s[4],
                    "tipo_mesa": s[5],
                    "asistentes_conteo": int(s[6]),
                }
            )

        jerarquia = []
        for p in principales_res:
            p_uuid = p[0]
            jerarquia.append(
                {
                    "id": str(p[0]),
                    "codigo": p[1],
                    "nombre": p[2],
                    "path": p[3],
                    "tipo_mesa": p[4],
                    "territorio_nombre": p[5],
                    "asistentes_conteo": int(p[6]),
                    "acta_firmada": bool(p[7]),
                    "submesas": submesas_por_padre.get(p_uuid, []),
                }
            )

        return {
            "total_mesas_principales": tot_principales,
            "total_submesas": tot_submesas,
            "total_participantes": tot_participantes,
            "participantes_unicos_mesas": unicos_participantes,
            "total_actas_cerradas": actas_cerradas,
            "jerarquia_mesas": jerarquia,
        }

    async def listar_escenarios_especiales(
        self,
        tipo: str | None = None,
        territorio_id: uuid.UUID | None = None,
        estado: str | None = None,
    ) -> list[EscenarioEspecial]:
        stmt = select(EscenarioEspecial).options(selectinload(EscenarioEspecial.territorio))
        if tipo:
            stmt = stmt.where(EscenarioEspecial.tipo_escenario == tipo)
        if territorio_id:
            stmt = stmt.where(EscenarioEspecial.territorio_id == territorio_id)
        if estado:
            stmt = stmt.where(EscenarioEspecial.estado == estado)
        stmt = stmt.order_by(EscenarioEspecial.fecha.desc(), EscenarioEspecial.creado_en.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def obtener_escenario_por_id(self, id: uuid.UUID) -> EscenarioEspecial | None:
        stmt = (
            select(EscenarioEspecial)
            .options(selectinload(EscenarioEspecial.territorio))
            .where(EscenarioEspecial.id == id)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def crear_escenario_especial(self, escenario: EscenarioEspecial) -> EscenarioEspecial:
        self.session.add(escenario)
        await self.session.flush()
        return escenario

    async def obtener_resumen_escenarios(self) -> dict[str, Any]:
        """Conteo agregado por tipo de escenario especial."""
        sql = text("""
            SELECT 
                tipo_escenario,
                COUNT(*) AS total_escenarios,
                COALESCE(SUM(total_asistentes), 0) AS total_asistentes
            FROM participacion_ciudadana.escenarios_especiales
            WHERE estado = 'REALIZADO'
            GROUP BY tipo_escenario;
        """)
        rows = (await self.session.execute(sql)).fetchall()
        por_tipo = {r[0]: int(r[2]) for r in rows}
        total_escenarios = sum(int(r[1]) for r in rows)
        total_asistentes = sum(int(r[2]) for r in rows)
        return {
            "total_escenarios": total_escenarios,
            "total_asistentes": total_asistentes,
            "por_tipo": por_tipo,
        }
