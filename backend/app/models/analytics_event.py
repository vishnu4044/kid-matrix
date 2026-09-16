from datetime import datetime, timezone

from app.extensions import db


class AnalyticsEvent(db.Model):
    """Lightweight event log (spec section 48). No PII beyond ids; used
    internally only — there is no dedicated parent-facing analytics UI yet."""

    __tablename__ = "analytics_events"

    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False, index=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    child_id = db.Column(db.Integer, db.ForeignKey("children.id"), nullable=True, index=True)
    event_metadata = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
