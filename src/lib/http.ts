/**
 * POLIS — Primitiva centralizada de HTTP
 * apiFetch: inyección de Bearer token, reintentos con backoff,
 * timeouts y errores tipados. Lista para apuntar a FastAPI.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super("La solicitud excedió el tiempo de espera");
    this.name = "ApiTimeoutError";
  }
}

type RetryConfig = {
  retries: number;
  backoffMs: number;
};

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retry?: Partial<RetryConfig>;
  /** Prefijo base del backend FastAPI (configurable por entorno) */
  baseUrl?: string;
}

const DEFAULT_RETRY: RetryConfig = { retries: 2, backoffMs: 600 };
const DEFAULT_TIMEOUT = 12_000;

/** Token JWT del estado de sesión (se conecta con auth-store cuando exista backend) */
let bearerToken: string | null = null;

export function setBearerToken(token: string | null): void {
  bearerToken = token;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function once<T>(
  url: string,
  opts: ApiFetchOptions,
  signal?: AbortSignal
): Promise<T> {
  const { method = "GET", body, headers = {}, timeoutMs = DEFAULT_TIMEOUT } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Encadenar la señal externa (si existe) con el timeout local
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let detail: unknown = null;
      try {
        detail = await res.json();
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      const message =
        (detail as { detail?: string } | null)?.detail ??
        `Error ${res.status}: ${res.statusText}`;
      throw new ApiError(res.status, message, detail);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      throw new ApiTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Primitiva única de comunicación con el backend.
 * - GET sin reintentos destructivos; mutaciones reintentan solo en 5xx/timeout.
 * - Reintentos con backoff simple.
 */
export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {}
): Promise<T> {
  const baseUrl = opts.baseUrl ?? "/api/v1";
  const url = `${baseUrl}${path}`;
  const { retry, ...rest } = opts;
  const cfg: RetryConfig = { ...DEFAULT_RETRY, ...retry };
  const isMutation = (rest.method ?? "GET") !== "GET";

  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    try {
      return await once<T>(url, rest);
    } catch (err) {
      lastError = err;

      if (err instanceof DOMException && err.name === "AbortError") throw err;

      const retryable =
        err instanceof ApiTimeoutError ||
        (err instanceof ApiError && err.status >= 500) ||
        (err instanceof ApiError && err.status === 429);

      if (!retryable || isMutation || attempt === cfg.retries) throw err;

      await delay(cfg.backoffMs * 2 ** attempt);
    }
  }

  throw lastError;
}
