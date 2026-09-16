from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.blueprints.ai import ai_bp
from app.errors import error_response
from app.extensions import db
from app.models import AIInteraction, Child, PracticeSession, Question
from app.schemas.ai import (
    GeneratePracticeRequestSchema,
    GeneratedPracticeSchema,
    RecommendationsRequestSchema,
    TutorRequestSchema,
)
from app.services.child_context import build_child_context
from app.services.openai_service import OpenAIService
from app.services import curriculum_retrieval

generate_schema = GeneratePracticeRequestSchema()
generated_practice_schema = GeneratedPracticeSchema()
tutor_schema = TutorRequestSchema()
recommendations_schema = RecommendationsRequestSchema()

QUESTION_TYPE_ALIASES = {
    "letter": "letter",
    "letters": "letter",
    "number": "number",
    "numbers": "number",
    "math": "math",
    "addition": "math",
    "subtraction": "math",
    "multiplication": "math",
    "division": "math",
    "shape": "shape",
    "shapes": "shape",
}


def _require_openai():
    if not current_app.config.get("OPENAI_API_KEY"):
        return error_response(
            "AI_UNAVAILABLE", "AI features require an OPENAI_API_KEY to be configured on the server", 503
        )
    return None


def _get_owned_child(child_id: int):
    parent_id = int(get_jwt_identity())
    return Child.query.filter_by(id=child_id, parent_id=parent_id).first()


@ai_bp.post("/generate-practice")
@jwt_required()
def generate_practice():
    unavailable = _require_openai()
    if unavailable:
        return unavailable

    try:
        data = generate_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid request", 400, err.messages)

    child = _get_owned_child(data["child_id"])
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    context = build_child_context(child)

    try:
        raw = OpenAIService().generate_practice(data["prompt"], context)
    except Exception:  # noqa: BLE001
        current_app.logger.exception("OpenAI generate_practice call failed")
        return error_response("AI_UNAVAILABLE", "Couldn't reach the AI service, please try again", 503)

    try:
        generated = generated_practice_schema.load(raw)
    except ValidationError as err:
        return error_response(
            "AI_INVALID_RESPONSE", "The AI response didn't match the expected format", 502, err.messages
        )

    session = PracticeSession(
        child_id=child.id,
        type="ai",
        title=generated["title"],
        difficulty=generated.get("difficulty") or "beginner",
        status="pending",
        total_questions=len(generated["questions"]),
    )
    db.session.add(session)
    db.session.flush()

    for index, q in enumerate(generated["questions"]):
        normalized_type = QUESTION_TYPE_ALIASES.get(q["type"].lower(), "custom")
        db.session.add(
            Question(
                session_id=session.id,
                order_index=index,
                type=normalized_type,
                prompt=q["prompt"],
                target=q["expected_answer"],
                expected_answer=q["expected_answer"],
            )
        )

    db.session.add(
        AIInteraction(
            child_id=child.id,
            parent_id=int(get_jwt_identity()),
            question=data["prompt"],
            response=generated["title"],
        )
    )

    db.session.commit()
    return session.to_dict(), 201


@ai_bp.post("/tutor")
@jwt_required()
def tutor():
    unavailable = _require_openai()
    if unavailable:
        return unavailable

    try:
        data = tutor_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid request", 400, err.messages)

    parent_id = int(get_jwt_identity())
    context: dict = {}
    if data.get("child_id"):
        child = _get_owned_child(data["child_id"])
        if not child:
            return error_response("NOT_FOUND", "Child not found", 404)
        context = build_child_context(child)

    curriculum_hits = curriculum_retrieval.retrieve(data["question"], current_app.config.get("OPENAI_API_KEY", ""))

    try:
        response_text = OpenAIService().generate_tutor_response(data["question"], context, curriculum_hits)
    except Exception:  # noqa: BLE001
        current_app.logger.exception("OpenAI tutor call failed")
        return error_response("AI_UNAVAILABLE", "Couldn't reach the AI service, please try again", 503)

    db.session.add(
        AIInteraction(
            child_id=data.get("child_id"),
            parent_id=parent_id,
            question=data["question"],
            response=response_text,
        )
    )
    db.session.commit()

    return {"response": response_text}, 200


@ai_bp.post("/recommendations")
@jwt_required()
def recommendations():
    unavailable = _require_openai()
    if unavailable:
        return unavailable

    try:
        data = recommendations_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid request", 400, err.messages)

    child = _get_owned_child(data["child_id"])
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    context = build_child_context(child)

    try:
        result = OpenAIService().generate_recommendations(context)
    except Exception:  # noqa: BLE001
        current_app.logger.exception("OpenAI recommendations call failed")
        return error_response("AI_UNAVAILABLE", "Couldn't reach the AI service, please try again", 503)

    return result, 200
