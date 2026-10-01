from typing import Literal

from pydantic import BaseModel


class LivenessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "polis-api"


class ReadinessResponse(BaseModel):
    status: Literal["ready", "unavailable"]
    database: Literal["ok", "unavailable"]
    migrations: Literal["ok", "pending", "unknown"]
    extensions: Literal["ok", "missing", "unknown"]
