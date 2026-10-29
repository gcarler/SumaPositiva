import ast
from pathlib import Path

import pytest

from tests.database_isolation import validar_base_migraciones


def test_migrations_requires_a_different_database():
    with pytest.raises(ValueError, match="otra base"):
        validar_base_migraciones(
            "postgresql+asyncpg://unused@127.0.0.1/polis_test_principal",
            "postgresql://unused@localhost/polis_test_principal",
        )


@pytest.mark.parametrize("field", ["principal", "migraciones"])
@pytest.mark.parametrize("invalid", ["postgresql://unused@localhost/working", "sqlite:///polis_test.db"])
def test_migrations_rejects_non_test_or_non_postgres_databases(field, invalid):
    principal = "postgresql+asyncpg://unused@127.0.0.1/polis_test_principal"
    migraciones = "postgresql+asyncpg://unused@127.0.0.1/polis_test_migraciones"
    with pytest.raises(ValueError, match="PostgreSQL exclusivas"):
        validar_base_migraciones(
            invalid if field == "principal" else principal,
            invalid if field == "migraciones" else migraciones,
        )


def test_migrations_accepts_two_explicit_test_databases():
    principal = "postgresql+asyncpg://unused@127.0.0.1/polis_test_principal"
    migraciones = "postgresql+asyncpg://unused@127.0.0.1/polis_test_migraciones"
    assert validar_base_migraciones(principal, migraciones) == migraciones


def test_every_downgrade_test_selects_the_migration_database():
    """Una regresión no puede volver a degradar el esquema de la suite principal."""
    cases = []
    for path in Path(__file__).parent.glob("test_*.py"):
        module = ast.parse(path.read_text())
        functions = [node for node in module.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
        helpers = set()
        for function in functions:
            downgrades = [
                node
                for node in ast.walk(function)
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "downgrade"
            ]
            if not downgrades:
                continue
            assert "database_url" in {arg.arg for arg in function.args.args}, (path.name, function.name)
            if function.name.startswith("test_"):
                cases.append((path.name, function.name))
                assert any(ast.unparse(decorator) == "pytest.mark.migration" for decorator in function.decorator_list)
            else:
                helpers.add(function.name)
        for function in functions:
            if function.name.startswith("test_") and helpers & {arg.arg for arg in function.args.args}:
                cases.append((path.name, function.name))
                assert any(ast.unparse(decorator) == "pytest.mark.migration" for decorator in function.decorator_list)
    assert len(cases) >= 8
