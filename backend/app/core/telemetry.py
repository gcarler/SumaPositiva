"""POLIS — Módulo de Telemetría HTTP en Memoria.
Thread-safe, bajo overhead, sin dependencias externas y sin registro de PII.
"""

import collections
import threading
import time
from typing import Any


class TelemetryTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._started_at = time.time()
        self._total_requests = 0
        self._status_2xx = 0
        self._status_3xx = 0
        self._status_4xx = 0
        self._status_5xx = 0
        self._latencies: collections.deque[float] = collections.deque(maxlen=200)

    def record_request(self, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self._total_requests += 1
            if 200 <= status_code < 300:
                self._status_2xx += 1
            elif 300 <= status_code < 400:
                self._status_3xx += 1
            elif 400 <= status_code < 500:
                self._status_4xx += 1
            elif 500 <= status_code < 600:
                self._status_5xx += 1

            self._latencies.append(duration_ms)

    def get_metrics(self) -> dict[str, Any]:
        with self._lock:
            uptime = round(time.time() - self._started_at, 1)
            total = self._total_requests
            err_count = self._status_5xx
            error_rate = round((err_count / total * 100), 2) if total > 0 else 0.0
            avg_latency = (
                round(sum(self._latencies) / len(self._latencies), 2)
                if self._latencies
                else 0.0
            )
            return {
                "uptime_seconds": uptime,
                "total_requests": total,
                "requests_2xx": self._status_2xx,
                "requests_3xx": self._status_3xx,
                "requests_4xx": self._status_4xx,
                "requests_5xx": self._status_5xx,
                "error_rate_pct": error_rate,
                "avg_latency_ms": avg_latency,
            }

    def reset(self) -> None:
        with self._lock:
            self._started_at = time.time()
            self._total_requests = 0
            self._status_2xx = 0
            self._status_3xx = 0
            self._status_4xx = 0
            self._status_5xx = 0
            self._latencies.clear()


global_telemetry = TelemetryTracker()
