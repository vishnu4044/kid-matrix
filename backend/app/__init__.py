import os

from flask import Flask

from app.config import Config
from app.extensions import db, jwt, cors
from app.errors import error_response


def create_app(config_object: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if db_uri.startswith("sqlite:///") and ":memory:" not in db_uri:
        db_path = db_uri.replace("sqlite:///", "", 1)
        if not os.path.isabs(db_path):
            # Flask-SQLAlchemy resolves relative sqlite paths against app.instance_path,
            # not the process cwd, so resolve to an absolute path ourselves.
            db_path = os.path.abspath(os.path.join(os.getcwd(), db_path))
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app.models import User, Child, PracticeSession, Question, Answer, Progress, AIInteraction  # noqa: F401

    from app.blueprints.auth import auth_bp
    from app.blueprints.children import children_bp
    from app.blueprints.practice import practice_bp
    from app.blueprints.ai import ai_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(children_bp)
    app.register_blueprint(practice_bp)
    app.register_blueprint(ai_bp)

    with app.app_context():
        db.create_all()

    @jwt.unauthorized_loader
    def unauthorized(reason):
        return error_response("UNAUTHORIZED", "Missing or invalid token", 401)

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return error_response("INVALID_TOKEN", "Invalid token", 401)

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return error_response("TOKEN_EXPIRED", "Token has expired", 401)

    @app.errorhandler(404)
    def not_found(e):
        return error_response("NOT_FOUND", "Resource not found", 404)

    @app.errorhandler(500)
    def internal_error(e):
        return error_response("INTERNAL_ERROR", "Something went wrong", 500)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app
