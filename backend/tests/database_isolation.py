"""Selección explícita del destino de las pruebas que reconstruyen el esquema."""

from sqlalchemy.engine import make_url


def validar_base_migraciones(database_url: str, migrations_url: str) -> str:
    principal = make_url(database_url)
    migraciones = make_url(migrations_url)
    for url in (principal, migraciones):
        if url.get_backend_name() != "postgresql" or not (url.database or "").startswith("polis_test"):
            raise ValueError("Ambas bases deben ser PostgreSQL exclusivas polis_test*")
    if principal.database == migraciones.database:
        raise ValueError("Migraciones requiere otra base; no puede reconstruir la base de la suite")
    return migrations_url
