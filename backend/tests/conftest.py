import os
import tempfile

import pytest

from app import create_app
from app.config import Config
from app.extensions import db


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret"


@pytest.fixture()
def app():
    application = create_app(TestConfig)
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register(client, name="Jane Doe", email="jane@example.com", password="password123"):
    return client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "confirm_password": password},
    )


@pytest.fixture()
def auth_headers(client):
    resp = register(client)
    token = resp.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
