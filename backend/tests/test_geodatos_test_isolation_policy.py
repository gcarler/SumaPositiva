"""Regresión de la conexión fuera de alcance detectada por EAF-COM-01."""

import ast
from pathlib import Path


def test_geodatos_uses_only_the_database_fixture():
    path = Path(__file__).with_name("test_geodatos_analitica_hurtos.py")
    module = ast.parse(path.read_text())
    engines = [
        node
        for node in ast.walk(module)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "create_async_engine"
    ]
    assert engines, "La regresión requiere observar las conexiones de la prueba"
    assert all(
        len(node.args) == 1 and isinstance(node.args[0], ast.Name) and node.args[0].id == "database_url"
        for node in engines
    ), "Cada engine debe recibir directamente el DSN de la fixture aislada"
    literals = [
        node.value for node in ast.walk(module) if isinstance(node, ast.Constant) and isinstance(node.value, str)
    ]
    assert not any(".env" in value or "://" in value and value.startswith("postgres") for value in literals)


def test_conftest_does_not_create_a_fallback_database_url():
    module = ast.parse(Path(__file__).with_name("conftest.py").read_text())
    for node in ast.walk(module):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Subscript) and ast.unparse(target.value) == "os.environ":
                    assert not isinstance(target.slice, ast.Constant) or target.slice.value != "POLIS_TEST_DATABASE_URL"
        if isinstance(node, ast.Call) and ast.unparse(node.func) == "os.environ.setdefault" and node.args:
            assert not isinstance(node.args[0], ast.Constant) or node.args[0].value != "POLIS_TEST_DATABASE_URL"
    assert not any(
        isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value.endswith(".env")
        for node in ast.walk(module)
    )
