"""Script de solo lectura para auditar cuentas institucionales y su procedencia en POLIS.

Inspecciona el directorio de usuarios, roles, estados de activación,
verificación y procedencia histórica sin realizar ninguna operación de escritura.
"""

import argparse
import asyncio
import json
import sys
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.modules.identidad.models import EventoIdentidad, Rol, Usuario

ROLES_INSTITUCIONALES = {
    "administrador_identidades",
    "autoridad_distrital",
    "facilitador_mesa",
    "auditor_forense",
}


async def auditar_cuentas(database_url: str) -> dict[str, Any]:
    """Ejecuta una inspección de solo lectura sobre las cuentas registradas."""
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            # Garantizar aislamiento estricto de solo lectura
            await conn.execute(text("SET TRANSACTION READ ONLY"))

            # 1. Comprobar colisiones de correo no normalizado (LOWER)
            stmt_colisiones = (
                select(func.lower(Usuario.correo).label("correo_norm"), func.count().label("total"))
                .group_by(func.lower(Usuario.correo))
                .having(func.count() > 1)
            )
            res_colisiones = await conn.execute(stmt_colisiones)
            colisiones = [
                {"correo_normalizado": row.correo_norm, "total_cuentas": row.total} for row in res_colisiones.fetchall()
            ]

            # 2. Consultar usuarios con roles
            stmt_usuarios = (
                select(
                    Usuario.id,
                    Usuario.correo,
                    Usuario.nombres,
                    Usuario.apellidos,
                    Usuario.activo,
                    Usuario.correo_verificado_en,
                    Usuario.creado_en,
                    Usuario.metadatos,
                    Rol.codigo.label("rol_codigo"),
                    Rol.nombre.label("rol_nombre"),
                )
                .join(Rol, Usuario.rol_id == Rol.id)
                .order_by(Rol.codigo.asc(), Usuario.creado_en.asc())
            )
            res_usuarios = await conn.execute(stmt_usuarios)
            usuarios = res_usuarios.fetchall()

            # 3. Consultar eventos de origen por usuario en eventos_identidad
            stmt_eventos = select(
                EventoIdentidad.objetivo_id,
                EventoIdentidad.accion,
                EventoIdentidad.detalle,
                EventoIdentidad.creado_en,
            ).order_by(EventoIdentidad.creado_en.asc())
            res_eventos = await conn.execute(stmt_eventos)
            primer_evento_por_usuario: dict[str, dict[str, Any]] = {}
            for ev in res_eventos.fetchall():
                uid_str = str(ev.objetivo_id)
                if uid_str not in primer_evento_por_usuario:
                    primer_evento_por_usuario[uid_str] = {
                        "tipo_evento": ev.accion,
                        "detalles": ev.detalle or {},
                        "creado_en": ev.creado_en.isoformat() if ev.creado_en else None,
                    }

            # 4. Clasificar cuentas y determinar procedencia
            cuentas_institucionales = []
            cuentas_ciudadanas = []
            otras_cuentas = []

            for u in usuarios:
                uid_str = str(u.id)
                metadatos = u.metadatos or {}
                evento_origen = primer_evento_por_usuario.get(uid_str)

                # Detección de procedencia
                if evento_origen and evento_origen["tipo_evento"] == "bootstrap_administrador":
                    procedencia = "Bootstrap administrativo inicial"
                elif evento_origen and evento_origen["tipo_evento"] == "registro_ciudadano":
                    procedencia = "Portal ciudadano público"
                elif evento_origen and evento_origen["tipo_evento"] == "creacion_usuario_administrativo":
                    procedencia = "Delegación administrativa"
                elif metadatos.get("legado") is True:
                    procedencia = "Migración de cuenta legada (0021)"
                elif metadatos.get("origen"):
                    procedencia = f"Metadatos origen: {metadatos.get('origen')}"
                else:
                    procedencia = "Registro del sistema"

                info_cuenta = {
                    "id": uid_str,
                    "correo": u.correo,
                    "nombres": f"{u.nombres} {u.apellidos}".strip(),
                    "rol_codigo": u.rol_codigo,
                    "rol_nombre": u.rol_nombre,
                    "activo": bool(u.activo),
                    "correo_verificado": u.correo_verificado_en is not None,
                    "correo_verificado_en": (u.correo_verificado_en.isoformat() if u.correo_verificado_en else None),
                    "creado_en": u.creado_en.isoformat() if u.creado_en else None,
                    "procedencia": procedencia,
                    "metadatos": metadatos,
                }

                if u.rol_codigo in ROLES_INSTITUCIONALES:
                    cuentas_institucionales.append(info_cuenta)
                elif u.rol_codigo == "ciudadano":
                    cuentas_ciudadanas.append(info_cuenta)
                else:
                    otras_cuentas.append(info_cuenta)

            resumen = {
                "total_cuentas": len(usuarios),
                "total_institucionales": len(cuentas_institucionales),
                "total_ciudadanas": len(cuentas_ciudadanas),
                "total_otros_roles": len(otras_cuentas),
                "administradores_activos": sum(
                    1 for c in cuentas_institucionales if c["rol_codigo"] == "administrador_identidades" and c["activo"]
                ),
                "colisiones_correo": len(colisiones),
            }

            return {
                "exito": True,
                "resumen": resumen,
                "colisiones": colisiones,
                "cuentas_institucionales": cuentas_institucionales,
                "cuentas_ciudadanas": cuentas_ciudadanas,
                "otras_cuentas": otras_cuentas,
            }
    finally:
        await engine.dispose()


def imprimir_tabla(reporte: dict[str, Any]) -> None:
    """Imprime el reporte en formato legible de terminal."""
    resumen = reporte["resumen"]
    print("=" * 80)
    print(" AUDITORÍA PERICIAL DE CUENTAS INSTITUCIONALES Y PROCEDENCIA (POLIS)")
    print("=" * 80)
    print(f"Total de Cuentas:         {resumen['total_cuentas']}")
    print(f"Cuentas Institucionales:  {resumen['total_institucionales']}")
    print(f"Cuentas Ciudadanas:       {resumen['total_ciudadanas']}")
    print(f"Otros Roles:              {resumen['total_otros_roles']}")
    print(f"Administradores Activos:  {resumen['administradores_activos']}")
    print(f"Colisiones Detectadas:    {resumen['colisiones_correo']}")
    print("-" * 80)

    if reporte["colisiones"]:
        print("[!] ALERTA CRÍTICA: Se detectaron colisiones de correo no normalizado:")
        for col in reporte["colisiones"]:
            print(f"    - '{col['correo_normalizado']}': {col['total_cuentas']} registros")
        print("-" * 80)

    print("\nCUENTAS INSTITUCIONALES IDENTIFICADAS:")
    if not reporte["cuentas_institucionales"]:
        print("  (No se encontraron cuentas institucionales)")
    else:
        for c in reporte["cuentas_institucionales"]:
            estado_act = "ACTIVO" if c["activo"] else "INACTIVO"
            estado_ver = "VERIFICADO" if c["correo_verificado"] else "NO_VERIFICADO"
            print(f"• [{c['rol_codigo']}] {c['correo']} — {c['nombres']}")
            print(f"    Estado: {estado_act} | Correo: {estado_ver} | Procedencia: {c['procedencia']}")
            print(f"    ID: {c['id']} | Creado: {c['creado_en']}")

    if reporte["otras_cuentas"]:
        print("\nOTRAS CUENTAS / ROLES PERSONALIZADOS:")
        for c in reporte["otras_cuentas"]:
            print(f"• [{c['rol_codigo']}] {c['correo']} — {c['nombres']} ({c['procedencia']})")

    print("\n" + "=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Auditoría pericial de solo lectura de cuentas institucionales y procedencia."
    )
    parser.add_argument(
        "--database-url",
        help="URL de conexión a PostgreSQL (sobrescribe POLIS_DATABASE_URL)",
    )
    parser.add_argument(
        "--formato",
        choices=["tabla", "json"],
        default="tabla",
        help="Formato de salida (def: tabla)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Atajo para emitir salida en formato JSON",
    )

    args = parser.parse_args()
    settings = Settings()
    db_url = args.database_url or settings.async_database_url

    resultado = asyncio.run(auditar_cuentas(db_url))

    if args.json or args.formato == "json":
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    else:
        imprimir_tabla(resultado)

    # Si hay colisiones de correo, retornar código 1 para alertas en pipelines
    if resultado["resumen"]["colisiones_correo"] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
