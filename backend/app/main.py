import logging
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.router import api_router
from app.core.config import Settings
from app.core.database import Database
from app.core.sentry import init_sentry
from app.core.telemetry import global_telemetry

logger = logging.getLogger("polis.http")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    init_sentry(settings)
    log_level = settings.log_level
    if settings.environment == "production" and log_level == "DEBUG":
        log_level = "INFO"
    logging.basicConfig(level=log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        database = Database(settings)
        app.state.database = database
        app.state.settings = settings
        try:
            yield
        finally:
            await database.engine.dispose()

    application = FastAPI(
        title="POLIS API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs" if settings.environment != "production" else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if settings.environment != "production" else None,
    )
    application.state.settings = settings
    application.state.database = Database(settings)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_efectivos,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization", "Accept", "If-None-Match"],
        expose_headers=["ETag", "X-Polis-Cache"],
    )

    @application.exception_handler(IntegrityError)
    async def handle_integrity_error(request: Request, exc: IntegrityError):
        logger.warning(
            "Conflicto de integridad de datos en %s %s: %s",
            request.method,
            request.url.path,
            str(exc.orig) if hasattr(exc, "orig") and exc.orig else str(exc),
        )
        return JSONResponse(
            status_code=409,
            content={
                "detail": (
                    "Conflicto de integridad de datos: el recurso ya existe o infringe "
                    "una restricción de unicidad distrital."
                )
            },
        )

    @application.exception_handler(Exception)
    async def handle_unhandled_exception(request: Request, exc: Exception):
        logger.error(
            "Excepción no controlada en %s %s: %s",
            request.method,
            request.url.path,
            exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": (
                    "Error interno del servidor. La incidencia ha sido registrada para "
                    "revisión técnica institucional."
                )
            },
        )

    @application.middleware("http")
    async def security_headers_and_cookies_middleware(request: Request, call_next):
        response = await call_next(request)
        is_https = (
            request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        )
        is_prod = settings.environment == "production"

        # Cabeceras universales de protección perimetral en todos los entornos
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=(self)"
        )
        # CSP restrictiva propia de endpoints API.
        response.headers.setdefault(
            "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
        )

        if is_prod or is_https:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )

        if "set-cookie" in response.headers:
            raw_headers = response.raw_headers
            nuevos_headers = []
            for nombre, valor in raw_headers:
                if nombre.lower() == b"set-cookie":
                    cookie_str = valor.decode("latin1", errors="replace")
                    if "samesite" not in cookie_str.lower():
                        cookie_str += "; SameSite=Lax"
                    if (is_prod or is_https) and "secure" not in cookie_str.lower():
                        cookie_str += "; Secure"
                    nuevos_headers.append((nombre, cookie_str.encode("latin1")))
                else:
                    nuevos_headers.append((nombre, valor))
            response.raw_headers = nuevos_headers

        return response

    @application.middleware("http")
    async def log_request(request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        duration_ms = (perf_counter() - started) * 1000
        global_telemetry.record_request(response.status_code, duration_ms)
        # Log route templates, not query strings or citizen-supplied content.
        route = request.scope.get("route")
        logger.info(
            "method=%s route=%s status=%s duration_ms=%.1f",
            request.method,
            getattr(route, "path", "unmatched"),
            response.status_code,
            duration_ms,
        )
        return response

    from app.modules.actores.router import router as actores_router
    from app.modules.alternativas.router import router as alternativas_router
    from app.modules.fuentes.router import router as fuentes_router

    application.include_router(api_router)
    application.include_router(actores_router, prefix="/api/v1")
    application.include_router(fuentes_router, prefix="/api/v1")
    application.include_router(alternativas_router, prefix="/api/v1")
    return application


app = create_app()
