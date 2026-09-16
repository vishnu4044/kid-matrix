"""Builds the minimum child context needed for an AI request (spec section 5/35:
only real data from SQLite, never fabricated, and only what's needed for the task).

P4 fix: this used to return one ambiguous bag of numbers — an all-time
`subject_accuracy` aggregate sitting next to up to 5 individual session scores
that could easily share a subject (e.g. two different "Letters" sessions
scored 90% and 40%, alongside an all-time 67.4% aggregate) with nothing to
tell a model which figure answers which question. Asked "how did she do
today", the model would grab whichever "Letters" number it noticed first.
Now the fields are named and scoped so each question has exactly one correct
place to look: `overall_subject_accuracy` for all-time, `sessions_today` for
"today" questions, `recent_sessions` (explicitly labeled as history, not
current standing) for anything else recent.
"""
from datetime import datetime, timezone

from app.models import Child, PracticeSession, Progress


def _session_dict(s: PracticeSession) -> dict:
    return {"subject": s.type, "title": s.title, "score": s.score, "completed_at": s.completed_at.isoformat()}


def build_child_context(child: Child) -> dict:
    progress_entries = Progress.query.filter_by(child_id=child.id).all()

    by_subject: dict[str, dict] = {}
    for e in progress_entries:
        bucket = by_subject.setdefault(e.subject, {"attempts": 0, "correct": 0, "topics": {}})
        bucket["attempts"] += e.attempts
        bucket["correct"] += e.correct
        bucket["topics"][e.topic] = e.accuracy

    overall_subject_accuracy = {
        subject: round((d["correct"] / d["attempts"]) * 100, 1) if d["attempts"] else 0
        for subject, d in by_subject.items()
    }
    weak_topics = [
        f"{subject}:{topic}"
        for subject, d in by_subject.items()
        for topic, accuracy in d["topics"].items()
        if accuracy < 60
    ]

    completed = (
        PracticeSession.query.filter_by(child_id=child.id, status="completed")
        .order_by(PracticeSession.completed_at.desc())
        .limit(20)
        .all()
    )

    today = datetime.now(timezone.utc).date()
    sessions_today = [_session_dict(s) for s in completed if s.completed_at.date() == today]
    recent_sessions = [_session_dict(s) for s in completed[:5]]

    return {
        "name": child.name,
        "age": child.age,
        "grade": child.grade,
        "learning_goals": child.learning_goals or [],
        "overall_subject_accuracy": overall_subject_accuracy,
        "weak_topics": weak_topics,
        "sessions_today": sessions_today,
        "recent_sessions": recent_sessions,
    }
