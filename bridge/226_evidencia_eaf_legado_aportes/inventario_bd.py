"""Inventario efectivo restringido a la base nueva de auditoría."""

import asyncio
import importlib.metadata
import json
import os
import platform
import subprocess
from pathlib import Path

from sqlalchemy import CheckConstraint, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.database import Base
from app.modules.canales import models as canales_models
from app.modules.aportes import models as aportes_models
from app.modules.auditoria import models as auditoria_models
from app.modules.evidencia import models as evidencia_models
from app.modules.notificaciones import models as notificaciones_models

EVIDENCE = Path(__file__).resolve().parent
DATABASE = json.loads((EVIDENCE / "base.json").read_text())["database"]
URL = os.environ["POLIS_TEST_DATABASE_URL"]
assert make_url(URL).database == make_url(os.environ["POLIS_DATABASE_URL"]).database == DATABASE
TABLES = ["participacion_ciudadana.propuestas_ciudadanas", "participacion_ciudadana.apoyos_propuestas", "participacion_ciudadana.evidencias_multimedia", "participacion_ciudadana.notificaciones_transaccionales", "auditoria.registros_auditoria", "mesas_trabajo.fotos_mesa", "participacion_ciudadana.whatsapp_inbox", "participacion_ciudadana.migracion_apoyos_0084"]


async def main():
    result = {"versions": {"python": platform.python_version(), **{p: importlib.metadata.version(p) for p in ("sqlalchemy", "alembic", "asyncpg", "psycopg", "fastapi", "pydantic", "pytest")}}, "metadata": {}}
    for name in TABLES:
        model = Base.metadata.tables[name]
        result["metadata"][name] = {"columns": list(model.columns.keys()), "indexes": sorted(i.name for i in model.indexes), "checks": [{"name": c.name, "sql": str(c.sqltext)} for c in model.constraints if isinstance(c, CheckConstraint)], "comment": model.comment}
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.connect() as connection:
            assert await connection.scalar(text("SELECT current_database()")) == DATABASE
            result["environment"] = dict((await connection.execute(text("SELECT current_database() AS database, current_user AS db_role, version() AS version, pg_backend_pid() AS pid"))).mappings().one())
            queries = {
                "extensions": "SELECT extname, extversion FROM pg_extension ORDER BY extname",
                "alembic_version": "SELECT * FROM public.alembic_version",
                "functions": """SELECT n.nspname AS schema,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef AS security_definer, pg_get_userbyid(p.proowner) AS owner,p.proconfig,p.proacl::text,has_function_privilege(current_user,p.oid,'EXECUTE') AS current_role_execute, EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('participacion_ciudadana','auditoria') OR (n.nspname='public' AND p.proname IN ('generar_uuid_v7','actualizar_marca_temporal')) ORDER BY n.nspname,p.proname""",
                "schema_privileges": """SELECT n.nspname,pg_get_userbyid(n.nspowner) AS owner,has_schema_privilege(current_user,n.oid,'CREATE') AS current_role_create, EXISTS(SELECT 1 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE a.grantee=0 AND a.privilege_type='CREATE') AS public_create FROM pg_namespace n WHERE n.nspname IN ('public','participacion_ciudadana','auditoria') ORDER BY 1""",
                "triggers": """SELECT n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition,p.proname,p.prosecdef FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND n.nspname IN ('participacion_ciudadana','auditoria') ORDER BY 1,2,3""",
                "constraints": """SELECT n.nspname||'.'||c.relname AS table_name,k.conname,k.contype::text AS contype,pg_get_constraintdef(k.oid) AS definition,k.condeferrable,k.condeferred FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('participacion_ciudadana','auditoria') OR (n.nspname='mesas_trabajo' AND c.relname='fotos_mesa') ORDER BY 1,2""",
                "indexes": "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('participacion_ciudadana','auditoria') OR (schemaname='mesas_trabajo' AND tablename='fotos_mesa') ORDER BY 1,2,3",
            }
            for label, sql in queries.items(): result[label] = [dict(r) for r in (await connection.execute(text(sql))).mappings()]
    finally:
        await engine.dispose()
    result["metadata_index_comparison"] = {name: {"missing_indexes": sorted(set(model["indexes"]) - {i["indexname"] for i in result["indexes"] if i["schemaname"] + '.' + i["tablename"] == name}), "metadata_checks": model["checks"], "database_checks": [c for c in result["constraints"] if c["table_name"] == name and c["contype"] == "c"]} for name, model in result["metadata"].items()}
    (EVIDENCE / "inventario_bd.json").write_text(json.dumps(result, indent=2, default=str) + "\n")
    print(json.dumps({"database": DATABASE, "tables_metadata": len(result["metadata"]), "functions": result["functions"], "schema_privileges": result["schema_privileges"], "versions": result["versions"]}, default=str))


asyncio.run(main())
