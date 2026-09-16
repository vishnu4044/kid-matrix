from tests.conftest import register


def test_register_success(client):
    resp = register(client)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["user"]["email"] == "jane@example.com"
    assert "access_token" in body


def test_register_password_mismatch(client):
    resp = client.post(
        "/api/auth/register",
        json={
            "name": "Jane",
            "email": "jane@example.com",
            "password": "password123",
            "confirm_password": "different123",
        },
    )
    assert resp.status_code == 400


def test_register_duplicate_email(client):
    register(client)
    resp = register(client)
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "EMAIL_TAKEN"


def test_login_success(client):
    register(client)
    resp = client.post("/api/auth/login", json={"email": "jane@example.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.get_json()


def test_login_wrong_password(client):
    register(client)
    resp = client.post("/api/auth/login", json={"email": "jane@example.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_logout_requires_auth(client):
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 401
