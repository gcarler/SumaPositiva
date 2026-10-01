import logging
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings
from app.core.database import Database

logger = logging.getLogger("polis.http")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    logging.basicConfig(
        level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )

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
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @application.middleware("http")
    async def log_request(request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        # Log route templates, not query strings or citizen-supplied content.
        route = request.scope.get("route")
        logger.info(
            "method=%s route=%s status=%s duration_ms=%.1f",
            request.method,
            getattr(route, "path", "unmatched"),
            response.status_code,
            (perf_counter() - started) * 1000,
        )
        return response

    application.include_router(api_router)
    return application


app = create_app()
