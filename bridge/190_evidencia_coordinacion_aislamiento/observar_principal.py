"""Solo lectura: huellas de tablas para comprobar aislamiento de reconstrucciones."""

import asyncio
import json
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    url = os.environ["POLIS_TEST_DATABASE_URL"]
    expected = os.environ["POLIS_EAF_DATABASE"]
    assert make_url(url).database == expected
    engine = create_async_engine(url)
    try:
        async with engine.connect() as connection:
            assert await connection.scalar(text("SELECT current_database()")) == expected
            tables = (await connection.execute(text("""
                SELECT schemaname, tablename FROM pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'public')
                ORDER BY schemaname, tablename
            """))).all()
            fingerprints = {}
            quote = engine.dialect.identifier_preparer.quote_identifier
            for schema, name in tables:
                sql = ("SELECT count(*), encode(public.digest(coalesce(string_agg(to_jsonb(t)::text, "
                       "E'\\n' ORDER BY to_jsonb(t)::text), ''), 'sha256'), 'hex') "
                       f"FROM {quote(schema)}.{quote(name)} AS t")
                count, digest = (await connection.execute(text(sql))).one()
                fingerprints[schema + "." + name] = {"filas": count, "sha256_contenido": digest}
            out = {"database": expected, "tablas": fingerprints}
    finally:
        await engine.dispose()
    with Path(sys.argv[1]).open("x") as file:
        json.dump(out, file, indent=2)
        file.write("\n")
    print(f"Snapshot de solo lectura: {len(fingerprints)} tablas")


asyncio.run(main())
