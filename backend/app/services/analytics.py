from app.extensions import db
from app.models import AnalyticsEvent


def log_event(event_type: str, parent_id: int | None = None, child_id: int | None = None, metadata: dict | None = None) -> None:
    """Fire-and-forget event log. Never raises — analytics must not break the request it's attached to."""
    try:
        db.session.add(
            AnalyticsEvent(event_type=event_type, parent_id=parent_id, child_id=child_id, event_metadata=metadata)
        )
    except Exception:  # noqa: BLE001
        pass
