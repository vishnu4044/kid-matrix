from datetime import datetime, timezone

from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.blueprints.practice import practice_bp
from app.extensions import db
from app.errors import error_response
from app.models import Answer, Child, PracticeSession, Question
from app.schemas.practice import AnswerSubmitSchema, PracticeCreateSchema
from app.services import handwriting_evaluation, practice_generator as gen, progress as progress_service
from app.services.storage import save_handwriting_image
from app.services.analytics import log_event

create_schema = PracticeCreateSchema()
answer_schema = AnswerSubmitSchema()

TITLES = {
    "letters": "Letter Practice",
    "numbers": "Number Practice",
    "math": "Math Practice",
    "shapes": "Shape Practice",
    "mixed": "Mixed Practice",
}


def _get_owned_session(session_id: int, parent_id: int) -> PracticeSession | None:
    session = db.session.get(PracticeSession, session_id)
    if not session or session.child.parent_id != parent_id:
        return None
    return session


def _latest_answers_by_question(question_ids: list[int]) -> dict[int, Answer]:
    if not question_ids:
        return {}
    all_answers = (
        Answer.query.filter(Answer.question_id.in_(question_ids)).order_by(Answer.created_at.asc()).all()
    )
    latest: dict[int, Answer] = {}
    for a in all_answers:
        latest[a.question_id] = a  # last write wins, in chronological order
    return latest


def _build_questions(payload: dict) -> list[dict]:
    ptype = payload["type"]
    config = payload.get("config") or {}
    count = payload["count"]
    difficulty = payload.get("difficulty") or "beginner"

    if ptype == "letters":
        return gen.generate_letters(
            case=config.get("case", "upper"), group=config.get("group", "All"), count=count
        )
    if ptype == "numbers":
        return gen.generate_numbers(
            range_key=config.get("range", "0-9"),
            count=count,
            custom_min=config.get("custom_min"),
            custom_max=config.get("custom_max"),
        )
    if ptype == "math":
        return gen.generate_math(
            operation=config.get("operation", "addition"), count=count, difficulty=difficulty
        )
    if ptype == "shapes":
        return gen.generate_shapes(shapes=config.get("shapes", []), count=count)
    if ptype == "mixed":
        return gen.generate_mixed(subjects=config.get("subjects", []), count=count, difficulty=difficulty)
    raise ValueError(f"Unsupported practice type: {ptype}")


@practice_bp.post("")
@jwt_required()
def create_practice():
    parent_id = int(get_jwt_identity())
    try:
        data = create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid practice request", 400, err.messages)

    child = Child.query.filter_by(id=data["child_id"], parent_id=parent_id).first()
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    try:
        question_dicts = _build_questions(data)
    except ValueError as err:
        return error_response("VALIDATION_ERROR", str(err), 400)

    session = PracticeSession(
        child_id=child.id,
        type=data["type"],
        title=data.get("title") or TITLES.get(data["type"], "Practice"),
        difficulty=data.get("difficulty"),
        status="pending",
        total_questions=len(question_dicts),
    )
    db.session.add(session)
    db.session.flush()

    for index, q in enumerate(question_dicts):
        db.session.add(Question(session_id=session.id, order_index=index, **q))

    db.session.commit()
    return session.to_dict(), 201


@practice_bp.get("/<int:session_id>")
@jwt_required()
def get_practice(session_id: int):
    parent_id = int(get_jwt_identity())
    session = _get_owned_session(session_id, parent_id)
    if not session:
        return error_response("NOT_FOUND", "Practice session not found", 404)
    return session.to_dict(), 200


@practice_bp.post("/<int:session_id>/start")
@jwt_required()
def start_practice(session_id: int):
    parent_id = int(get_jwt_identity())
    session = _get_owned_session(session_id, parent_id)
    if not session:
        return error_response("NOT_FOUND", "Practice session not found", 404)

    session.status = "in_progress"
    session.started_at = datetime.now(timezone.utc)
    log_event("practice_started", parent_id=parent_id, child_id=session.child_id, metadata={"type": session.type})
    db.session.commit()
    return session.to_dict(), 200


@practice_bp.post("/<int:session_id>/answers")
@jwt_required()
def submit_answer(session_id: int):
    parent_id = int(get_jwt_identity())
    session = _get_owned_session(session_id, parent_id)
    if not session:
        return error_response("NOT_FOUND", "Practice session not found", 404)

    try:
        data = answer_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid answer", 400, err.messages)

    question = db.session.get(Question, data["question_id"])
    if not question or question.session_id != session.id:
        return error_response("NOT_FOUND", "Question not found in this session", 404)

    image_data_url = data.get("image_data_url")
    text_answer = data.get("answer")

    if not image_data_url and not text_answer:
        return error_response("VALIDATION_ERROR", "Provide either image_data_url or answer", 400)

    image_path = None
    if image_data_url:
        try:
            image_path = save_handwriting_image(session.child_id, question.id, image_data_url)
        except ValueError:
            return error_response("VALIDATION_ERROR", "Invalid image data", 400)

        evaluation = handwriting_evaluation.evaluate(question.target, question.type, image_data_url)
        recognized_answer = question.target if evaluation.get("result") == "correct" else None
        is_correct = evaluation.get("result") == "correct"
        confidence = evaluation.get("confidence")
        feedback = evaluation.get("feedback")
    else:
        is_correct = (text_answer or "").strip().lower() == (question.expected_answer or "").strip().lower()
        recognized_answer = text_answer
        confidence = 1.0 if is_correct else 0.3
        feedback = "Great job! That's correct!" if is_correct else "Let's try that one again!"

    answer = Answer(
        question_id=question.id,
        child_id=session.child_id,
        answer=recognized_answer,
        image_path=image_path,
        is_correct=is_correct,
        confidence=confidence,
        feedback=feedback,
    )
    db.session.add(answer)

    progress_service.record_answer(session.child_id, question, is_correct)

    log_event(
        "question_answered",
        parent_id=parent_id,
        child_id=session.child_id,
        metadata={"question_id": question.id, "is_correct": is_correct},
    )

    db.session.commit()
    return answer.to_dict(), 201


@practice_bp.post("/<int:session_id>/complete")
@jwt_required()
def complete_practice(session_id: int):
    parent_id = int(get_jwt_identity())
    session = _get_owned_session(session_id, parent_id)
    if not session:
        return error_response("NOT_FOUND", "Practice session not found", 404)

    question_ids = [q.id for q in session.questions]
    latest_by_question = _latest_answers_by_question(question_ids)

    correct_count = sum(1 for a in latest_by_question.values() if a.is_correct)
    total = len(question_ids) or 1
    score = round((correct_count / total) * 100, 1)

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    session.score = score

    duration_seconds = None
    if session.started_at:
        # SQLite drops tzinfo on round-trip, so a freshly-set aware `completed_at` can meet a
        # naive `started_at` loaded from the DB earlier in this request. Normalize both to naive.
        started_naive = session.started_at.replace(tzinfo=None)
        completed_naive = session.completed_at.replace(tzinfo=None)
        duration_seconds = round((completed_naive - started_naive).total_seconds())

    log_event(
        "practice_completed",
        parent_id=parent_id,
        child_id=session.child_id,
        metadata={"score": score, "correct_count": correct_count, "total": total, "duration_seconds": duration_seconds},
    )

    db.session.commit()

    result = session.to_dict()
    result["correct_count"] = correct_count
    return result, 200


@practice_bp.get("/<int:session_id>/results")
@jwt_required()
def get_practice_results(session_id: int):
    """Per-question breakdown so a parent can see exactly which letters/answers were
    wrong, not just the aggregate score (spec section 33: "click a session to see details")."""
    parent_id = int(get_jwt_identity())
    session = _get_owned_session(session_id, parent_id)
    if not session:
        return error_response("NOT_FOUND", "Practice session not found", 404)

    question_ids = [q.id for q in session.questions]
    latest_by_question = _latest_answers_by_question(question_ids)

    results = []
    for question in session.questions:
        answer = latest_by_question.get(question.id)
        results.append(
            {
                "question_id": question.id,
                "type": question.type,
                "prompt": question.prompt,
                "target": question.target,
                "is_correct": answer.is_correct if answer else None,
                "feedback": answer.feedback if answer else None,
            }
        )

    return {"session": session.to_dict(include_questions=False), "results": results}, 200
