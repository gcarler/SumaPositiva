"""Retira DSN/JWT de logs y JUnit antes de publicar la evidencia del evaluador."""

import json
import os
import re
from pathlib import Path

from sqlalchemy.engine import make_url

directory = Path(__file__).resolve().parent
password = make_url(os.environ["POLIS_DATABASE_URL"]).password
counts = {}
for path in sorted([*directory.glob("*.xml"), *directory.glob("*.log")]):
    value = path.read_text()
    if password:
        value = value.replace(password, "[CREDENCIAL_REDACTADA]")
    value, dsn_count = re.subn(r"postgresql(?:\+[a-z0-9]+)?://[^\s\"'<>]+", "[DSN_REDACTADO]", value)
    value, jwt_count = re.subn(r"\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b", "[JWT_REDACTADO]", value)
    path.write_text(value)
    counts[path.name] = {"dsn_redacted": dsn_count, "jwt_redacted": jwt_count}
print(json.dumps(counts))
