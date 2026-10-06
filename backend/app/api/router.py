from fastapi import APIRouter

from app.modules.aportes.router import router as aportes_router
from app.modules.auditoria.router import router as auditoria_router
from app.modules.compromisos.router import router as compromisos_router
from app.modules.evidencia.router import router as evidencia_router
from app.modules.formularios.router import router as formularios_router
from app.modules.geodatos.router import router as geodatos_router
from app.modules.health.router import router as health_router
from app.modules.ia.router import router as ia_router
from app.modules.identidad.router import router as identidad_router
from app.modules.indicadores.router import router as indicadores_router
from app.modules.instrumentos.router import router as instrumentos_router
from app.modules.mesas.router import router as mesas_router
from app.modules.noticias.router import router as noticias_router
from app.modules.participacion.router import router as participacion_router
from app.modules.politicas.router import router as politicas_router
from app.modules.presupuesto.router import router as presupuesto_router
from app.modules.sesion.router import router as sesion_router
from app.modules.testimonios.router import router as testimonios_router
from app.modules.comunicaciones.router import router as comunicaciones_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(aportes_router)
api_router.include_router(sesion_router)
api_router.include_router(politicas_router)
api_router.include_router(identidad_router)
api_router.include_router(evidencia_router)
api_router.include_router(mesas_router)
api_router.include_router(instrumentos_router)
api_router.include_router(ia_router)
api_router.include_router(geodatos_router)

api_router.include_router(presupuesto_router)
api_router.include_router(indicadores_router)
api_router.include_router(formularios_router)
api_router.include_router(participacion_router)
api_router.include_router(testimonios_router)
api_router.include_router(auditoria_router)
api_router.include_router(compromisos_router)
api_router.include_router(noticias_router)
api_router.include_router(comunicaciones_router)
