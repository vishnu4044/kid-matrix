"""Thin wrapper around the OpenAI SDK. Never called from the frontend directly —
only Flask blueprints (ai, practice) talk to this. The API key is read from
config (backend/.env) and never leaves the server process.
"""
import json

from flask import current_app
from openai import OpenAI


class OpenAIService:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self._api_key = api_key
        self._model = model
        self._client: OpenAI | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._api_key or current_app.config.get("OPENAI_API_KEY"))

    @property
    def model(self) -> str:
        return self._model or current_app.config.get("OPENAI_MODEL", "gpt-4o-mini")

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            api_key = self._api_key or current_app.config["OPENAI_API_KEY"]
            self._client = OpenAI(api_key=api_key)
        return self._client

    def _chat_json(self, system: str, user_content, max_tokens: int = 800) -> dict:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
            temperature=0.4,
        )
        return json.loads(response.choices[0].message.content)

    def evaluate_handwriting(self, target: str, question_type: str, image_data_url: str) -> dict:
        """Vision-based evaluation of a single handwriting canvas image.

        Returns {recognized, confidence, result, feedback, needs_practice}.
        Does NOT judge stroke order, starting point, or personal handwriting style —
        only whether the finished drawing is recognizable as the target.
        """
        system = (
            "You evaluate a young child's handwriting or drawing practice from a canvas image. "
            "Judge only the FINISHED result, never stroke order, starting point, speed, or personal "
            "handwriting style. Different children write differently and that is fine. "
            "Respond ONLY with JSON: "
            '{"recognized": bool, "confidence": number 0-1, "result": "correct"|"needs_practice", '
            '"feedback": short encouraging string, "needs_practice": bool}. '
            "Never use harsh words like wrong/failure/bad."
        )
        user_content = [
            {
                "type": "text",
                "text": (
                    f"Question type: {question_type}. The child was asked for: '{target}'. "
                    "Does the drawing on this canvas reasonably match that target?"
                ),
            },
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]
        return self._chat_json(system, user_content, max_tokens=300)

    def generate_practice(self, prompt: str, child_context: dict) -> dict:
        system = (
            "You generate a structured practice worksheet for a young child. "
            "Respond ONLY with JSON matching: {\"title\": str, \"subject\": str, \"grade\": str, "
            "\"difficulty\": str, \"questions\": [{\"type\": str, \"prompt\": str, \"expected_answer\": str}]}. "
            "Keep it age-appropriate for the child's grade and consistent with their recent practice history."
        )
        user = json.dumps({"parent_request": prompt, "child_context": child_context})
        return self._chat_json(system, user, max_tokens=1200)

    def generate_tutor_response(self, question: str, child_context: dict, curriculum_context: list | None = None) -> str:
        system = (
            "You are a friendly tutor assistant speaking to a PARENT about their child's learning "
            "progress. Only use the provided child_context data for claims about THIS child — never "
            "invent facts. curriculum_context, if present, is general early-childhood teaching guidance "
            "you may draw on for advice that isn't about this specific child's data. Never make "
            "medical or developmental diagnoses; if asked, suggest consulting a qualified teacher or "
            "professional. Keep answers concise and actionable, and phrase data-based claims with "
            "language like 'Based on recent practice...' or 'The data suggests...'."
        )
        user = json.dumps(
            {"question": question, "child_context": child_context, "curriculum_context": curriculum_context or []}
        )
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=500,
            temperature=0.5,
        )
        return response.choices[0].message.content

    def generate_recommendations(self, child_context: dict) -> dict:
        system = (
            "Given a child's recent practice history, suggest what to practice next. "
            'Respond ONLY with JSON: {"recommendation": str, "suggested_type": str, "suggested_config": object}.'
        )
        user = json.dumps(child_context)
        return self._chat_json(system, user, max_tokens=400)

    def summarize_progress(self, child_context: dict) -> str:
        system = (
            "Summarize a child's learning progress for their parent in 2-4 warm, plain-language "
            "sentences, based only on the provided data."
        )
        user = json.dumps(child_context)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=300,
            temperature=0.5,
        )
        return response.choices[0].message.content
