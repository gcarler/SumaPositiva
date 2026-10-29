# OL-FUENTES-SHA-01 · Cotejo de inventario, solo lectura

26-oct-2026. El usuario autorizó consolidar las fuentes y utilizar los agentes. Mientras coordinación y EAF cierran las remediaciones, realizar un cotejo acotado de las tres pruebas fallidas por hash en183/global18.

Leer `bridge/183_evidencia_edd_aportes/backend_check_fallos_clasificados.json`, `backend/tests/test_inventario_fuentes_polis.py`, `backend/tests/test_catalogo_fuentes_versionado.py`, `backend/scripts/cargar_catalogo_fuentes.py`, el inventario activo y el archivo discrepante `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json`. Comparar únicamente como lectura con capturas/historia locales disponibles. No buscar en red ni acceder a SQL.

Únicas escrituras: `bridge/207_cotejo_ollamacodex_hash_inventario.md` y `bridge/207_evidencia_ollamacodex_hash_inventario.json`. No app/tests/src/docs, banco, cachés o inventarios. No pytest, commit, push o despliegue. No corregir el hash esperado para forzar aprobación. No ejecutar sincronizadores.

Entregar: rutas, SHA/bytes medidos, SHA esperado y ubicación exacta donde se declara; todas las discrepancias del inventario comprobadas localmente (no limitarse a la primera si puede recorrerlo en lectura), si existe un original conservado cuyo SHA coincida y cómo lo localizó, diferencias semánticas demostrables entre versiones disponibles y causa desconocida donde no se pruebe. Proponer cómo versionar una nueva captura preservando el inventario anterior y sus originales; distinguir dato oficial, archivo derivado y resumen mutable. No afirmar que se cambió o se aceptó una fuente ni dictamen EAF.

Antes de terminar vuelve a hashear entradas para demostrar que no cambiaste nada. Notifica a `=codex:0.0` por tmux y congela tus dos entregables.
