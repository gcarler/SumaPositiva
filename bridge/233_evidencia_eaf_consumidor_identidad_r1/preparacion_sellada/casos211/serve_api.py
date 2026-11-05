"""API real y dos seams explícitos para proveedores que aquí no se contactan."""
import hashlib

from fastapi import HTTPException

from app.main import app
from app.modules.identidad.correo import obtener_correo_identidad
from app.modules.identidad.service import IdentidadService


class CorreoSinTransporte:
    def comprobar_configuracion(self):
        return None

    async def enviar(self, *args, **kwargs):
        raise AssertionError("No se permite entregar correo desde el ensayo211")


def google_controlado(self, id_token):
    prefix = "eaf211-controlado:"
    if not id_token.startswith(prefix):
        raise HTTPException(401, "Credencial controlada inválida")
    correo = id_token[len(prefix):]
    if not correo.startswith("eaf211-") or not correo.endswith("@example.org"):
        raise HTTPException(401, "Cuenta fuera del ensayo211")
    return {"sub": hashlib.sha256(correo.encode()).hexdigest(), "email": correo,
            "email_verified": True, "hd": "example.org", "given_name": "EAF211", "family_name": "Sintetico"}


# Solo el verificador del proveedor y la disponibilidad de correo se simulan;
# routers, schemas, autorización, transacciones y PostgreSQL son los reales181.
IdentidadService._verificar_google_token = google_controlado
app.dependency_overrides[obtener_correo_identidad] = lambda: CorreoSinTransporte()
