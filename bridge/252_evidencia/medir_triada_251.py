import time
import app.core.database as dbmod

orig = dbmod.create_async_engine
def _parche_medicion(url, **kw):  # diagnóstico en proceso local: timeout 30 s
    kw["connect_args"] = {"timeout": 30, "command_timeout": 30}
    return orig(url, **kw)
dbmod.create_async_engine = _parche_medicion

from fastapi.testclient import TestClient
from app.core.config import Settings
from app.main import create_app

client = TestClient(create_app(Settings()))
t0 = time.perf_counter()
r = client.get("/api/v1/compromisos/triada/resumen")
t1 = time.perf_counter()
print(f"STATUS: {r.status_code}  TIEMPO: {t1-t0:.2f}s  BYTES: {len(r.content)}")
print(r.text[:300])
