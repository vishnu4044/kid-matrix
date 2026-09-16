from datetime import datetime, timezone

from app.extensions import db
from app.models import Progress, Question

SUBJECT_BY_QUESTION_TYPE = {
    "letter": "letters",
    "number": "numbers",
    "math": "math",
    "shape": "shapes",
}


def _topic_for(question: Question) -> str:
    if question.type == "letter":
        return question.target.upper()
    if question.type == "shape":
        return question.target
    if question.type == "math":
        return (question.metadata_json or {}).get("operation", "math")
    return "numbers"


def record_answer(child_id: int, question: Question, is_correct: bool) -> None:
    subject = SUBJECT_BY_QUESTION_TYPE.get(question.type, question.type)
    topic = _topic_for(question)

    entry = Progress.query.filter_by(child_id=child_id, subject=subject, topic=topic).first()
    if not entry:
        entry = Progress(child_id=child_id, subject=subject, topic=topic, attempts=0, correct=0, accuracy=0.0)
        db.session.add(entry)

    entry.attempts += 1
    if is_correct:
        entry.correct += 1
    entry.accuracy = round((entry.correct / entry.attempts) * 100, 1) if entry.attempts else 0.0
    entry.last_practiced = datetime.now(timezone.utc)
