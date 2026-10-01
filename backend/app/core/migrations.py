from alembic.script import ScriptDirectory

from app.core.config import BACKEND_DIR

# Read the migration graph so readiness follows new revisions automatically.
EXPECTED_REVISION = ScriptDirectory(str(BACKEND_DIR / "alembic")).get_current_head()
