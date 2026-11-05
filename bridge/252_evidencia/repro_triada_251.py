from fastapi.testclient import TestClient
from app.core.config import Settings
from app.main import create_app

app = create_app(Settings())
client = TestClient(app)  # raise_server_exceptions=True: propagar el stack real
try:
    r = client.get("/api/v1/compromisos/triada/resumen")
    print("STATUS:", r.status_code)
    print(r.text[:800])
except Exception:
    import traceback
    traceback.print_exc()
