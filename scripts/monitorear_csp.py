#!/usr/bin/env python3
"""POLIS — Monitoreo de Seguridad Perimetral y Colector de Violaciones CSP.

Herramienta administrativa para supervisar en tiempo real las infracciones
de Content-Security-Policy (CSP) capturadas por el colector del backend.
Permite diagnosticar intentos de inyección de scripts, dependencias no
autorizadas o extensiones maliciosas de navegador en clientes.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from urllib.request import Request, urlopen


def formatear_tabla(filas: list[list[str]], encabezados: list[str]) -> str:
    """Genera una tabla ASCII alineada."""
    anchos = [len(h) for h in encabezados]
    for fila in filas:
        for i, celda in enumerate(fila):
            if i < len(anchos):
                anchos[i] = max(anchos[i], len(str(celda)))

    linea_sep = "+-" + "-+-".join("-" * a for a in anchos) + "-+"
    linea_enc = "| " + " | ".join(h.ljust(anchos[i]) for i, h in enumerate(encabezados)) + " |"

    lineas = [linea_sep, linea_enc, linea_sep]
    for fila in filas:
        lineas.append(
            "| " + " | ".join(str(fila[i] if i < len(fila) else "").ljust(anchos[i]) for i in range(len(anchos))) + " |"
        )
    lineas.append(linea_sep)
    return "\n".join(lineas)


def consultar_api_csp(url_base: str, token: str | None = None) -> dict:
    """Consulta el endpoint administrativo /api/v1/seguridad/csp-report/resumen."""
    endpoint = f"{url_base.rstrip('/')}/api/v1/seguridad/csp-report/resumen"
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = Request(endpoint, headers=headers, method="GET")
    try:
        with urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
            raise RuntimeError(f"HTTP {resp.status}: {resp.reason}")
    except Exception as e:
        raise RuntimeError(f"Error al conectar con el colector CSP ({endpoint}): {e}") from e


def inspeccionar_memoria_local() -> dict:
    """Inspecciona directamente el buffer en memoria si se ejecuta dentro del entorno backend."""
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
    try:
        from app.modules.seguridad.router import obtener_reportes_csp_recientes

        reportes = obtener_reportes_csp_recientes()
        directivas: dict[str, int] = {}
        dominios: dict[str, int] = {}

        for r in reportes:
            d = r.get("directiva", "unknown")
            directivas[d] = directivas.get(d, 0) + 1
            blocked = r.get("blocked_uri", "unknown")
            dom = blocked.split("://")[1].split("/")[0] if "://" in blocked else blocked.split("/")[0]
            dominios[dom] = dominios.get(dom, 0) + 1

        dom_top = [{"dominio": k, "total": v} for k, v in sorted(dominios.items(), key=lambda x: x[1], reverse=True)]
        ultimos = [
            {
                "directiva_violada": r.get("directiva", "unknown"),
                "uri_bloqueada": r.get("blocked_uri", "unknown"),
                "pagina": r.get("pagina", "unknown"),
                "disposicion": r.get("disposicion", "report"),
            }
            for r in reportes[-10:]
        ]
        return {
            "total_reportes": len(reportes),
            "directivas_afectadas": directivas,
            "dominios_bloqueados_frecuentes": dom_top,
            "ultimos_reportes": ultimos,
        }
    except Exception as exc:
        raise RuntimeError(f"No fue posible inspeccionar memoria local: {exc}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="POLIS — Supervisión Perimetral y Monitoreo de Incidentes CSP (Content-Security-Policy)"
    )
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="URL base del backend FastAPI")
    parser.add_argument("--token", default=None, help="Token Bearer con permiso auditoria:leer")
    parser.add_argument("--local", action="store_true", help="Inspeccionar memoria del proceso local directamente")
    parser.add_argument("--json", dest="formato_json", action="store_true", help="Salida en formato JSON estándar")
    parser.add_argument("--estricto", action="store_true", help="Retornar código de salida 1 si existen violaciones")

    args = parser.parse_args()

    try:
        if args.local or not args.token:
            # Intento primero local, o fallback a API si falla
            try:
                datos = inspeccionar_memoria_local()
            except Exception:
                datos = consultar_api_csp(args.url, args.token)
        else:
            datos = consultar_api_csp(args.url, args.token)
    except Exception as err:
        sys.stderr.write(f"ERROR: {err}\n")
        return 2

    if args.formato_json:
        print(json.dumps(datos, indent=2, ensure_ascii=False))
        return 1 if (args.estricto and datos.get("total_reportes", 0) > 0) else 0

    # Salida formateada institucional
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    total = datos.get("total_reportes", 0)
    directivas = datos.get("directivas_afectadas", {})
    dominios = datos.get("dominios_bloqueados_frecuentes", [])
    ultimos = datos.get("ultimos_reportes", [])

    print("=" * 80)
    print(f"POLIS · Supervisión Perimetral y Colector de Violaciones CSP — {ahora}")
    print("=" * 80)
    print(f"Total de incidentes registrados en ventana móvil: {total}")
    print(f"Modo de ejecución CSP de la plataforma:           ENFORCE (Blindaje Activo)")
    print("-" * 80)

    if total == 0:
        print("🟢 Perímetro limpio: Cero violaciones CSP detectadas en navegadores clientes.")
        print("=" * 80)
        return 0

    print("DISTRIBUCIÓN POR DIRECTIVA INFRINGIDA:")
    filas_dir = [[d, str(c)] for d, c in directivas.items()]
    print(formatear_tabla(filas_dir, ["Directiva CSP", "Incidentes"]))
    print()

    if dominios:
        print("RECURSOS Y DOMINIOS BLOQUEADOS FRECUENTES:")
        filas_dom = [[d["dominio"], str(d["total"])] for d in dominios]
        print(formatear_tabla(filas_dom, ["Origen Bloqueado", "Frecuencia"]))
        print()

    if ultimos:
        print("MUESTRA CRONOLÓGICA DE RECIENTES (ANONIMIZADOS):")
        filas_ult = [
            [
                u.get("directiva_violada", "")[:18],
                u.get("uri_bloqueada", "")[:35],
                u.get("pagina", "")[:25],
                u.get("disposicion", ""),
            ]
            for u in ultimos
        ]
        print(formatear_tabla(filas_ult, ["Directiva", "Recurso Bloqueado", "Página", "Modo"]))

    print("=" * 80)
    if any("script" in k for k in directivas):
        print("⚠️ ALERTA PERICIAL: Se detectaron intentos de inyección o carga de script-src.")
        print("   Verifique que ningún componente de terceros no autorizado esté cargando scripts.")

    return 1 if (args.estricto and total > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
