from unittest.mock import patch

import pytest


def create_child(client, headers):
    return client.post(
        "/api/children",
        json={"name": "Emma", "age": 5, "grade": "Kindergarten"},
        headers=headers,
    ).get_json()


def test_generate_practice_requires_api_key(client, auth_headers):
    child = create_child(client, auth_headers)
    resp = client.post(
        "/api/ai/generate-practice",
        json={"child_id": child["id"], "prompt": "Give Emma 5 addition questions"},
        headers=auth_headers,
    )
    # No OPENAI_API_KEY is set in the test environment.
    assert resp.status_code == 503
    assert resp.get_json()["error"]["code"] == "AI_UNAVAILABLE"


@pytest.fixture()
def with_fake_api_key(app):
    app.config["OPENAI_API_KEY"] = "sk-test-fake"
    yield
    app.config["OPENAI_API_KEY"] = ""


def test_generate_practice_persists_valid_ai_response(client, auth_headers, with_fake_api_key):
    child = create_child(client, auth_headers)

    fake_response = {
        "title": "Kindergarten Addition",
        "subject": "math",
        "grade": "Kindergarten",
        "difficulty": "beginner",
        "questions": [
            {"type": "math", "prompt": "2 + 3 = ?", "expected_answer": "5"},
            {"type": "math", "prompt": "1 + 4 = ?", "expected_answer": "5"},
        ],
    }

    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value=fake_response):
        resp = client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma 2 addition questions"},
            headers=auth_headers,
        )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["title"] == "Kindergarten Addition"
    assert body["type"] == "ai"
    assert len(body["questions"]) == 2
    assert body["questions"][0]["type"] == "math"


def test_generate_practice_rejects_malformed_ai_response(client, auth_headers, with_fake_api_key):
    child = create_child(client, auth_headers)

    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value={"nonsense": True}):
        resp = client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma practice"},
            headers=auth_headers,
        )

    assert resp.status_code == 502
    assert resp.get_json()["error"]["code"] == "AI_INVALID_RESPONSE"


def test_tutor_requires_api_key(client, auth_headers):
    resp = client.post("/api/ai/tutor", json={"question": "What should Emma practice?"}, headers=auth_headers)
    assert resp.status_code == 503


def test_tutor_history_persists_per_child(client, auth_headers, with_fake_api_key):
    child = create_child(client, auth_headers)

    with patch("app.services.curriculum_retrieval.retrieve", return_value=[]), patch(
        "app.services.openai_service.OpenAIService.generate_tutor_response",
        return_value="Emma is doing great with letters.",
    ):
        client.post(
            "/api/ai/tutor",
            json={"child_id": child["id"], "question": "How is Emma doing?"},
            headers=auth_headers,
        )

    resp = client.get(f"/api/children/{child['id']}/tutor-history", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body) == 1
    assert body[0]["question"] == "How is Emma doing?"
    assert body[0]["response"] == "Emma is doing great with letters."


def test_tutor_history_excludes_practice_generation_logs(client, auth_headers, with_fake_api_key):
    child = create_child(client, auth_headers)

    fake_response = {
        "title": "Addition Practice",
        "subject": "math",
        "questions": [{"type": "math", "prompt": "1 + 1 = ?", "expected_answer": "2"}],
    }
    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value=fake_response):
        client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma addition"},
            headers=auth_headers,
        )

    resp = client.get(f"/api/children/{child['id']}/tutor-history", headers=auth_headers)
    assert resp.get_json() == []


def test_tutor_history_requires_ownership(client, auth_headers):
    from tests.conftest import register

    other = register(client, name="Other", email="other6@example.com")
    other_headers = {"Authorization": f"Bearer {other.get_json()['access_token']}"}
    other_child = create_child(client, other_headers)

    resp = client.get(f"/api/children/{other_child['id']}/tutor-history", headers=auth_headers)
    assert resp.status_code == 404


def test_tutor_uses_child_context(client, auth_headers, with_fake_api_key):
    child = create_child(client, auth_headers)
    with patch("app.services.curriculum_retrieval.retrieve", return_value=[]), patch(
        "app.services.openai_service.OpenAIService.generate_tutor_response",
        return_value="Based on recent practice, Emma is doing great with letters.",
    ) as mock_tutor:
        resp = client.post(
            "/api/ai/tutor",
            json={"child_id": child["id"], "question": "How is Emma doing?"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert "Emma" in resp.get_json()["response"]
    context_arg = mock_tutor.call_args[0][1]
    assert context_arg["name"] == "Emma"
