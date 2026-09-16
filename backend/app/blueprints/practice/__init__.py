from flask import Blueprint

practice_bp = Blueprint("practice", __name__, url_prefix="/api/practice")

from app.blueprints.practice import routes  # noqa: E402,F401
