from tests.conftest import register


def create_child(client, headers, name="Emma", age=5, grade="Kindergarten"):
    return client.post(
        "/api/children",
        json={"name": name, "age": age, "grade": grade, "learning_goals": ["Letters"]},
        headers=headers,
    )


def test_create_and_list_children(client, auth_headers):
    resp = create_child(client, auth_headers)
    assert resp.status_code == 201
    assert resp.get_json()["name"] == "Emma"

    resp = client.get("/api/children", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1


def test_get_update_delete_child(client, auth_headers):
    child = create_child(client, auth_headers).get_json()
    child_id = child["id"]

    resp = client.get(f"/api/children/{child_id}", headers=auth_headers)
    assert resp.status_code == 200

    resp = client.put(f"/api/children/{child_id}", json={"age": 6}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["age"] == 6

    resp = client.delete(f"/api/children/{child_id}", headers=auth_headers)
    assert resp.status_code == 204

    resp = client.get(f"/api/children/{child_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_children_require_auth(client):
    resp = client.get("/api/children")
    assert resp.status_code == 401


def test_parent_cannot_access_other_parents_children(client, auth_headers):
    child = create_child(client, auth_headers).get_json()
    child_id = child["id"]

    other_resp = register(client, name="Other Parent", email="other@example.com")
    other_headers = {"Authorization": f"Bearer {other_resp.get_json()['access_token']}"}

    resp = client.get(f"/api/children/{child_id}", headers=other_headers)
    assert resp.status_code == 404

    resp = client.get("/api/children", headers=other_headers)
    assert resp.status_code == 200
    assert resp.get_json() == []
