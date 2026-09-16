import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, '..', 'data', 'kid_matrix.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
    # Model is intentionally hardcoded in app/services/openai_service.py (gpt-4o-mini),
    # not env-configurable — there's exactly one model in play across the app.

    FAISS_INDEX_PATH = os.environ.get("FAISS_INDEX_PATH", os.path.join(BASE_DIR, "..", "data", "faiss"))
    UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BASE_DIR, "..", "uploads"))

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
