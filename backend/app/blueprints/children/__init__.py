from flask import Blueprint

children_bp = Blueprint("children", __name__, url_prefix="/api/children")

from app.blueprints.children import routes  # noqa: E402,F401
