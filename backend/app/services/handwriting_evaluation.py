"""Pluggable handwriting/drawing evaluation layer (section 24 of the spec).

`evaluate()` is the only entry point callers should depend on. It judges the
FINISHED result only — never stroke order, starting point, speed, or personal
handwriting style. The concrete strategy underneath is swappable:

  - OpenAI Vision (default, when OPENAI_API_KEY is configured): asks a vision
    model whether the drawing matches the target. Real recognition, not a stub.
  - Heuristic fallback (no API key, or the API call fails): checks whether the
    canvas has any ink at all. It cannot truly verify correctness, so it stays
    lenient by design — it exists only so the practice loop still completes
    when AI evaluation is unavailable (spec section 50, "OpenAI unavailable").

A future phase can add a custom OCR/ML implementation here without touching
any caller — they all just call `evaluate(...)`.
"""
import base64
import io
import logging

from flask import current_app
from PIL import Image

from app.services.openai_service import OpenAIService

logger = logging.getLogger(__name__)


def _has_ink(image_data_url: str, threshold: float = 0.01) -> bool:
    _, _, encoded = image_data_url.partition(",")
    image_bytes = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    pixels = image.getdata()
    total = len(pixels)
    if total == 0:
        return False
    # Canvas is drawn on a white background with dark ink; count non-white pixels.
    non_background = sum(1 for p in pixels if p < 250)
    return (non_background / total) >= threshold


def evaluate(target: str, question_type: str, image_data_url: str) -> dict:
    has_ink = _has_ink(image_data_url)
    if not has_ink:
        return {
            "recognized": False,
            "confidence": 0.0,
            "result": "needs_practice",
            "feedback": "Looks like nothing was drawn yet. Give it a try!",
            "needs_practice": True,
        }

    api_key = current_app.config.get("OPENAI_API_KEY")
    if api_key:
        try:
            service = OpenAIService()
            result = service.evaluate_handwriting(target, question_type, image_data_url)
            result.setdefault("needs_practice", result.get("result") != "correct")
            return result
        except Exception:  # noqa: BLE001 - AI evaluation must never crash the practice loop
            logger.exception("OpenAI handwriting evaluation failed; falling back to heuristic")

    # No key configured, or the AI call failed: fall back to a lenient heuristic
    # so the child can still complete the session (see module docstring).
    return {
        "recognized": True,
        "confidence": 0.5,
        "result": "correct",
        "feedback": "Nice work!",
        "needs_practice": False,
    }
