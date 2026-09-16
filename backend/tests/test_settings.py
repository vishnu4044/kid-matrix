def test_me_returns_current_user(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["email"] == "jane@example.com"
    assert body["has_pin"] is False
    assert body["audio_enabled"] is True


def test_update_settings(client, auth_headers):
    resp = client.put("/api/auth/settings", json={"audio_enabled": False}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["audio_enabled"] is False


def test_set_and_verify_pin(client, auth_headers):
    resp = client.put("/api/auth/pin", json={"pin": "1234"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["has_pin"] is True

    resp = client.post("/api/auth/verify-pin", json={"pin": "1234"}, headers=auth_headers)
    assert resp.get_json()["valid"] is True

    resp = client.post("/api/auth/verify-pin", json={"pin": "0000"}, headers=auth_headers)
    assert resp.get_json()["valid"] is False


def test_pin_must_be_four_digits(client, auth_headers):
    resp = client.put("/api/auth/pin", json={"pin": "12"}, headers=auth_headers)
    assert resp.status_code == 400

    resp = client.put("/api/auth/pin", json={"pin": "abcd"}, headers=auth_headers)
    assert resp.status_code == 400


def test_clear_pin(client, auth_headers):
    client.put("/api/auth/pin", json={"pin": "1234"}, headers=auth_headers)
    resp = client.delete("/api/auth/pin", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["has_pin"] is False
