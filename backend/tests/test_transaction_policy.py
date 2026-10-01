"""Guarda de arquitectura para todos los repositorios, incluidos futuros módulos."""

import ast
from pathlib import Path


def test_repositorios_no_controlan_transacciones():
    modules = Path(__file__).resolve().parents[1] / "app" / "modules"
    violations = []
    for path in modules.rglob("repository.py"):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute)
                and node.func.attr in {"commit", "rollback", "begin", "begin_nested"}
            ):
                violations.append(f"{path.relative_to(modules)}:{node.lineno}: {node.func.attr}")
    assert not violations, "El servicio debe controlar la transacción:\n" + "\n".join(violations)
