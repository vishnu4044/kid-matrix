from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.blueprints.children import children_bp
from app.extensions import db
from app.errors import error_response
from app.models import AIInteraction, Child, PracticeSession, Progress
from app.schemas.child import ChildSchema, ChildUpdateSchema
from app.services.analytics import log_event

child_schema = ChildSchema()
child_update_schema = ChildUpdateSchema()


def _get_owned_child(child_id: int):
    parent_id = int(get_jwt_identity())
    return Child.query.filter_by(id=child_id, parent_id=parent_id).first()


@children_bp.get("")
@jwt_required()
def list_children():
    parent_id = int(get_jwt_identity())
    children = Child.query.filter_by(parent_id=parent_id).order_by(Child.created_at.asc()).all()
    return [c.to_dict() for c in children], 200


@children_bp.post("")
@jwt_required()
def create_child():
    try:
        data = child_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid child data", 400, err.messages)

    parent_id = int(get_jwt_identity())
    child = Child(parent_id=parent_id, **data)
    db.session.add(child)
    db.session.flush()
    log_event("child_added", parent_id=parent_id, child_id=child.id)
    db.session.commit()
    return child.to_dict(), 201


@children_bp.get("/<int:child_id>")
@jwt_required()
def get_child(child_id: int):
    child = _get_owned_child(child_id)
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)
    return child.to_dict(), 200


@children_bp.put("/<int:child_id>")
@jwt_required()
def update_child(child_id: int):
    child = _get_owned_child(child_id)
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    try:
        data = child_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid child data", 400, err.messages)

    for key, value in data.items():
        setattr(child, key, value)
    db.session.commit()
    return child.to_dict(), 200


@children_bp.delete("/<int:child_id>")
@jwt_required()
def delete_child(child_id: int):
    child = _get_owned_child(child_id)
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    db.session.delete(child)
    db.session.commit()
    return "", 204


def _topic_status(accuracy: float, attempts: int) -> str:
    if attempts == 0:
        return "not_started"
    if accuracy >= 80:
        return "mastered"
    if accuracy >= 50:
        return "improving"
    return "needs_practice"


@children_bp.get("/<int:child_id>/progress")
@jwt_required()
def get_child_progress(child_id: int):
    child = _get_owned_child(child_id)
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    entries = Progress.query.filter_by(child_id=child_id).all()

    by_subject: dict[str, dict] = {}
    for e in entries:
        bucket = by_subject.setdefault(e.subject, {"attempts": 0, "correct": 0, "topics": []})
        bucket["attempts"] += e.attempts
        bucket["correct"] += e.correct
        bucket["topics"].append(
            {
                "topic": e.topic,
                "attempts": e.attempts,
                "correct": e.correct,
                "accuracy": e.accuracy,
                "status": _topic_status(e.accuracy, e.attempts),
                "last_practiced": e.last_practiced.isoformat() if e.last_practiced else None,
            }
        )

    subject_progress = {
        subject: round((data["correct"] / data["attempts"]) * 100, 1) if data["attempts"] else 0
        for subject, data in by_subject.items()
    }

    total_attempts = sum(d["attempts"] for d in by_subject.values())
    total_correct = sum(d["correct"] for d in by_subject.values())
    overall_accuracy = round((total_correct / total_attempts) * 100, 1) if total_attempts else 0

    completed_sessions = PracticeSession.query.filter_by(child_id=child_id, status="completed").all()
    total_time_minutes = sum(
        max(1, round(((s.completed_at - s.started_at).total_seconds() / 60)))
        for s in completed_sessions
        if s.started_at and s.completed_at
    )

    return {
        "overall_accuracy": overall_accuracy,
        "sessions_completed": len(completed_sessions),
        "questions_completed": total_attempts,
        "time_spent_minutes": total_time_minutes,
        "subject_progress": subject_progress,
        "topics": {subject: data["topics"] for subject, data in by_subject.items()},
    }, 200


@children_bp.get("/<int:child_id>/history")
@jwt_required()
def get_child_history(child_id: int):
    child = _get_owned_child(child_id)
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    sessions = (
        PracticeSession.query.filter_by(child_id=child_id, status="completed")
        .order_by(PracticeSession.completed_at.desc())
        .all()
    )
    return [s.to_dict(include_questions=False) for s in sessions], 200


@children_bp.get("/<int:child_id>/tutor-history")
@jwt_required()
def get_child_tutor_history(child_id: int):
    child = _get_owned_child(child_id)
    if not child:
        return error_response("NOT_FOUND", "Child not found", 404)

    interactions = (
        AIInteraction.query.filter_by(child_id=child_id, interaction_type="tutor")
        .order_by(AIInteraction.created_at.asc())
        .all()
    )
    return [i.to_dict() for i in interactions], 200
