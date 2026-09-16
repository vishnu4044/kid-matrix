import base64
import io

from PIL import Image, ImageDraw


def create_child(client, headers):
    return client.post(
        "/api/children",
        json={"name": "Emma", "age": 5, "grade": "Kindergarten"},
        headers=headers,
    ).get_json()


def inked_canvas_data_url() -> str:
    image = Image.new("RGB", (100, 100), "white")
    draw = ImageDraw.Draw(image)
    draw.line([(10, 10), (90, 90)], fill="black", width=5)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def run_full_session(client, headers, child_id):
    session = client.post(
        "/api/practice",
        json={"child_id": child_id, "type": "letters", "count": 5, "config": {"case": "upper", "group": "A-F"}},
        headers=headers,
    ).get_json()
    client.post(f"/api/practice/{session['id']}/start", headers=headers)
    for q in session["questions"]:
        client.post(
            f"/api/practice/{session['id']}/answers",
            json={"question_id": q["id"], "image_data_url": inked_canvas_data_url()},
            headers=headers,
        )
    return client.post(f"/api/practice/{session['id']}/complete", headers=headers).get_json()


def test_progress_empty_for_new_child(client, auth_headers):
    child = create_child(client, auth_headers)
    resp = client.get(f"/api/children/{child['id']}/progress", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["overall_accuracy"] == 0
    assert body["sessions_completed"] == 0


def test_progress_after_session(client, auth_headers):
    child = create_child(client, auth_headers)
    run_full_session(client, auth_headers, child["id"])

    resp = client.get(f"/api/children/{child['id']}/progress", headers=auth_headers)
    body = resp.get_json()
    assert body["sessions_completed"] == 1
    assert body["questions_completed"] == 5
    assert "letters" in body["subject_progress"]
    assert len(body["topics"]["letters"]) == 5


def test_history_lists_completed_sessions(client, auth_headers):
    child = create_child(client, auth_headers)
    run_full_session(client, auth_headers, child["id"])

    resp = client.get(f"/api/children/{child['id']}/history", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body) == 1
    assert body[0]["status"] == "completed"
    assert "questions" not in body[0]


def test_progress_requires_ownership(client, auth_headers):
    from tests.conftest import register

    other = register(client, name="Other", email="other5@example.com")
    other_headers = {"Authorization": f"Bearer {other.get_json()['access_token']}"}
    other_child = create_child(client, other_headers)

    resp = client.get(f"/api/children/{other_child['id']}/progress", headers=auth_headers)
    assert resp.status_code == 404
