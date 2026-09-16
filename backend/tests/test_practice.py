from tests.conftest import register


def create_child(client, headers, name="Emma"):
    return client.post(
        "/api/children",
        json={"name": name, "age": 5, "grade": "Kindergarten"},
        headers=headers,
    ).get_json()


def test_create_letters_practice(client, auth_headers):
    child = create_child(client, auth_headers)
    resp = client.post(
        "/api/practice",
        json={
            "child_id": child["id"],
            "type": "letters",
            "count": 10,
            "config": {"case": "upper", "group": "A-F"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["total_questions"] == 10
    assert len(body["questions"]) == 10
    assert all(q["type"] == "letter" for q in body["questions"])
    assert all("expected_answer" not in q for q in body["questions"])


def test_create_math_practice(client, auth_headers):
    child = create_child(client, auth_headers)
    resp = client.post(
        "/api/practice",
        json={
            "child_id": child["id"],
            "type": "math",
            "count": 5,
            "difficulty": "beginner",
            "config": {"operation": "addition"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert len(body["questions"]) == 5
    assert all(q["type"] == "math" for q in body["questions"])


def test_create_practice_requires_owned_child(client, auth_headers):
    other = register(client, name="Other", email="other3@example.com")
    other_headers = {"Authorization": f"Bearer {other.get_json()['access_token']}"}
    other_child = create_child(client, other_headers)

    resp = client.post(
        "/api/practice",
        json={"child_id": other_child["id"], "type": "numbers", "count": 5},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_create_mixed_practice(client, auth_headers):
    child = create_child(client, auth_headers)
    resp = client.post(
        "/api/practice",
        json={"child_id": child["id"], "type": "mixed", "count": 10},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.get_json()["total_questions"] == 10


def test_get_and_start_practice(client, auth_headers):
    child = create_child(client, auth_headers)
    session = client.post(
        "/api/practice",
        json={"child_id": child["id"], "type": "shapes", "count": 5, "config": {"shapes": ["circle", "square"]}},
        headers=auth_headers,
    ).get_json()

    resp = client.get(f"/api/practice/{session['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "pending"

    resp = client.post(f"/api/practice/{session['id']}/start", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "in_progress"
