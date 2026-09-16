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
            {"type": "math", "target": "5", "math_expression": "2 + 3"},
            {"type": "letter", "target": "A", "math_expression": None},
        ],
    }

    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value=fake_response):
        resp = client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma 2 questions"},
            headers=auth_headers,
        )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["title"] == "Kindergarten Addition"
    assert body["type"] == "ai"
    assert len(body["questions"]) == 2
    # P1: the prompt is built server-side in the exact same format built-in
    # practice uses — never taken from the model directly.
    math_q = next(q for q in body["questions"] if q["type"] == "math")
    letter_q = next(q for q in body["questions"] if q["type"] == "letter")
    assert math_q["prompt"] == "2 + 3 = ?"
    assert math_q["target"] == "5"
    assert letter_q["prompt"] == "Write the letter A"
    assert letter_q["target"] == "A"


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


def test_generate_practice_drops_multiple_choice_and_off_format_questions(client, auth_headers, with_fake_api_key):
    """P1 regression: even if the model schema is somehow satisfied with
    off-format content stuffed into `target` (multiple-choice text, true/false
    phrasing, sentences), those questions must never reach the database — only
    genuinely valid single-target questions should survive."""
    child = create_child(client, auth_headers)

    fake_response = {
        "title": "Mixed bag",
        "subject": "letters",
        "questions": [
            {"type": "letter", "target": "Which letter is a D? A, B, D, E", "math_expression": None},
            {"type": "letter", "target": "Is C a letter? true or false", "math_expression": None},
            {"type": "number", "target": "What comes after 4?", "math_expression": None},
            {"type": "letter", "target": "C", "math_expression": None},  # the one valid question
        ],
    }

    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value=fake_response):
        resp = client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma letter practice"},
            headers=auth_headers,
        )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["total_questions"] == 1
    assert len(body["questions"]) == 1
    assert body["questions"][0]["target"] == "C"
    assert body["questions"][0]["prompt"] == "Write the letter C"


def test_generate_practice_rejects_when_nothing_survives_validation(client, auth_headers, with_fake_api_key):
    child = create_child(client, auth_headers)

    fake_response = {
        "title": "All invalid",
        "subject": "letters",
        "questions": [{"type": "letter", "target": "Which letter comes first?", "math_expression": None}],
    }

    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value=fake_response):
        resp = client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma practice"},
            headers=auth_headers,
        )

    assert resp.status_code == 502
    assert resp.get_json()["error"]["code"] == "AI_INVALID_RESPONSE"


def test_generate_practice_computes_math_answer_itself(client, auth_headers, with_fake_api_key):
    """Never trust the model's arithmetic — the answer is computed server-side
    from the parsed expression, even if the model's own target disagrees."""
    child = create_child(client, auth_headers)

    fake_response = {
        "title": "Addition",
        "subject": "math",
        "questions": [{"type": "math", "target": "999", "math_expression": "2 + 3"}],
    }

    with patch("app.services.openai_service.OpenAIService.generate_practice", return_value=fake_response):
        resp = client.post(
            "/api/ai/generate-practice",
            json={"child_id": child["id"], "prompt": "Give Emma addition"},
            headers=auth_headers,
        )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["questions"][0]["target"] == "5"


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
        "questions": [{"type": "math", "target": "2", "math_expression": "1 + 1"}],
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


def test_tutor_passes_prior_turns_on_followup(client, auth_headers, with_fake_api_key):
    """P4 regression: a follow-up question must be sent with the actual prior
    Q&A as conversation history, so the model can stay consistent instead of
    re-deriving a possibly-different number from scratch each time."""
    child = create_child(client, auth_headers)

    with patch("app.services.curriculum_retrieval.retrieve", return_value=[]), patch(
        "app.services.openai_service.OpenAIService.generate_tutor_response",
        return_value="Emma's letters accuracy is 67.4% overall.",
    ):
        client.post(
            "/api/ai/tutor",
            json={"child_id": child["id"], "question": "How did Emma do today?"},
            headers=auth_headers,
        )

    with patch("app.services.curriculum_retrieval.retrieve", return_value=[]), patch(
        "app.services.openai_service.OpenAIService.generate_tutor_response",
        return_value="As I mentioned, 67.4% overall.",
    ) as mock_followup:
        client.post(
            "/api/ai/tutor",
            json={"child_id": child["id"], "question": "What about her letters specifically?"},
            headers=auth_headers,
        )

    args, _ = mock_followup.call_args
    prior_turns = args[3]
    assert len(prior_turns) == 1
    assert prior_turns[0]["question"] == "How did Emma do today?"
    assert prior_turns[0]["response"] == "Emma's letters accuracy is 67.4% overall."


def test_tutor_context_separates_overall_from_recent_sessions(client, auth_headers, with_fake_api_key):
    """P4 regression: overall_subject_accuracy and recent_sessions must be
    distinct fields so the model isn't left guessing which number answers
    which question."""
    child = create_child(client, auth_headers)

    with patch("app.services.curriculum_retrieval.retrieve", return_value=[]), patch(
        "app.services.openai_service.OpenAIService.generate_tutor_response", return_value="ok"
    ) as mock_tutor:
        client.post(
            "/api/ai/tutor",
            json={"child_id": child["id"], "question": "How is Emma doing?"},
            headers=auth_headers,
        )

    context_arg = mock_tutor.call_args[0][1]
    assert "overall_subject_accuracy" in context_arg
    assert "sessions_today" in context_arg
    assert "recent_sessions" in context_arg
    assert "subject_accuracy" not in context_arg


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
