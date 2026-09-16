"""Thin wrapper around the OpenAI SDK. Never called from the frontend directly —
only Flask blueprints (ai, practice) talk to this. The API key is read from
config (backend/.env) and never leaves the server process.

Every LLM call in this service (practice generation, handwriting grading, tutor
chat, recommendations) uses exactly one model — gpt-4o-mini — hardcoded below.
There is no other model dependency and no env var can override it.
"""
import json

from flask import current_app
from openai import OpenAI

MODEL = "gpt-4o-mini"


class OpenAIService:
    def __init__(self, api_key: str | None = None):
        self._api_key = api_key
        self._client: OpenAI | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._api_key or current_app.config.get("OPENAI_API_KEY"))

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            api_key = self._api_key or current_app.config["OPENAI_API_KEY"]
            self._client = OpenAI(api_key=api_key)
        return self._client

    def _chat_json(self, system: str, user_content, max_tokens: int = 800) -> dict:
        response = self.client.chat.completions.create(
            model=MODEL,
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

        Uses a strict JSON schema (not just "respond with JSON" in free text) so the
        response shape — field names, types, and the correct/incorrect signal — can
        never drift between calls. That schema drift was the P0 root cause: the old
        prompt-only format let the model return correctness under inconsistent keys,
        and separately the "child's answer" shown to parents was never the model's
        actual transcription — it was the target being echoed back on a correct
        verdict. `recognized_text` here is a real, independent transcription of what
        the model saw, produced whether or not it matches the target, so a parent is
        never shown the expected answer disguised as what the child wrote.

        Judges only the FINISHED result — never stroke order, starting point, speed,
        or personal handwriting style. Give the benefit of the doubt on imperfect but
        recognizable attempts (e.g. mouse-drawn shapes); only mark a mismatch if the
        drawing plainly isn't the target.
        """
        system = (
            "You evaluate a young child's handwriting or drawing practice from a canvas image. "
            "Judge only the FINISHED result, never stroke order, starting point, speed, or personal "
            "handwriting style. Different children write differently, and rough or imprecise but "
            "recognizable attempts (including quick mouse-drawn shapes) should still count as a match — "
            "only report a mismatch if the drawing plainly is not the target. "
            "Always transcribe what you actually see in recognized_text, independent of whether it "
            "matches the target — never just repeat the target. Never use harsh words like wrong/failure/bad "
            "in feedback."
        )
        user_content = [
            {
                "type": "text",
                "text": (
                    f"Question type: {question_type}. The child was asked to write/draw: '{target}'. "
                    "What does the canvas actually show, and does it reasonably match that target?"
                ),
            },
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]
        schema = {
            "type": "object",
            "properties": {
                "recognized_text": {
                    "type": "string",
                    "description": "Best-guess transcription of what was actually drawn, independent of the target. Empty string if nothing recognizable.",
                },
                "matches_target": {"type": "boolean"},
                "confidence": {"type": "number"},
                "feedback": {"type": "string", "description": "Short, encouraging, never harsh."},
            },
            "required": ["recognized_text", "matches_target", "confidence", "feedback"],
            "additionalProperties": False,
        }
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "handwriting_evaluation", "strict": True, "schema": schema},
            },
            max_tokens=300,
            temperature=0.4,
        )
        data = json.loads(response.choices[0].message.content)
        return {
            "recognized_text": data["recognized_text"],
            "confidence": data["confidence"],
            "result": "correct" if data["matches_target"] else "needs_practice",
            "feedback": data["feedback"],
            "needs_practice": not data["matches_target"],
        }

    def generate_practice(self, prompt: str, child_context: dict) -> dict:
        """Generates practice questions in the SAME single-target write/draw format
        built-in practice uses (P1) — never multiple-choice, true/false,
        fill-in-the-blank phrasing, or matching, since the interface is a stylus
        canvas: the child can only write or draw one thing per question.

        The model is deliberately asked for only a type + a short target value
        (+ a bare math expression for math questions) — never question text or
        answer options. The strict JSON schema below makes any other shape
        impossible to return, and app/blueprints/ai/routes.py builds the actual
        displayed prompt text server-side from these fields, the same way
        app/services/practice_generator.py does for built-in practice — the model
        never controls prompt phrasing directly.
        """
        system = (
            "You choose practice content for a young child who will WRITE OR DRAW the answer on a "
            "stylus canvas — there is no way for them to select from options, answer true/false, or "
            "type text. Every question must be a single target the child writes or draws, exactly like: "
            "'write the letter A', 'write the number 7', 'draw a circle', or a two-number math problem "
            "like '7 + 3' whose answer they write. "
            "NEVER produce multiple-choice, true/false, fill-in-the-blank sentences, phonics matching, "
            "or any question with answer options or question text — only a bare target value per question. "
            "Keep it age-appropriate for the child's grade and consistent with their recent practice history."
        )
        user = json.dumps({"parent_request": prompt, "child_context": child_context})
        schema = {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "subject": {"type": "string"},
                "difficulty": {"type": "string"},
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["letter", "number", "shape", "math"]},
                            "target": {
                                "type": "string",
                                "description": (
                                    "The single value the child writes/draws: one letter, one number, "
                                    "one of circle/square/triangle/rectangle, or (for math) the final "
                                    "numeric answer."
                                ),
                            },
                            "math_expression": {
                                "type": ["string", "null"],
                                "description": "For type=math only: a bare two-number expression like '7 + 3', no '=' or answer. Null otherwise.",
                            },
                        },
                        "required": ["type", "target", "math_expression"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["title", "subject", "difficulty", "questions"],
            "additionalProperties": False,
        }
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "generated_practice", "strict": True, "schema": schema},
            },
            max_tokens=1500,
            temperature=0.5,
        )
        return json.loads(response.choices[0].message.content)

    def generate_tutor_response(
        self,
        question: str,
        child_context: dict,
        curriculum_context: list | None = None,
        prior_turns: list[dict] | None = None,
    ) -> str:
        """P4 fix: two changes address the tutor citing inconsistent numbers for
        the same subject across a conversation.

        1. The system prompt now explicitly names which context field answers
           which kind of question, instead of leaving the model to guess among
           several real-but-different numbers that all relate to one subject
           (an all-time aggregate vs several individual past session scores).
        2. `prior_turns` (this child's actual previous Q&A, if any) is now
           included as real conversation history, not just a fresh, memoryless
           JSON blob every call — so a follow-up question is answered
           consistently with what was already said, not re-derived from
           scratch and potentially landing on a different number by chance.
        """
        system = (
            "You are a friendly tutor assistant speaking to a PARENT about their child's learning "
            "progress. Only use the provided child_context data for claims about THIS child — never "
            "invent facts. Be precise about WHICH figure you cite, since child_context intentionally "
            "separates several different numbers that can share a subject name:\n"
            "- overall_subject_accuracy: the child's all-time cumulative accuracy per subject. This is "
            "the correct number for 'how is she doing overall' or 'how is she doing in X' questions.\n"
            "- sessions_today: only sessions completed today. Use this — and ONLY this — for 'how did "
            "she do today' questions. If it's empty, say she hasn't practiced today rather than citing "
            "an older session.\n"
            "- recent_sessions: individual past session scores, for history/trend questions. Each is "
            "ONE session's score, not the overall standing — never state a recent_sessions score as if "
            "it were overall_subject_accuracy, and say which specific session you mean (by title or "
            "date) when citing one. Use each session's `subject` field to know its subject, not its title.\n"
            "If you already stated a figure earlier in this conversation, stay consistent with it unless "
            "new data genuinely changed it.\n"
            "curriculum_context, if present, is general early-childhood teaching guidance you may draw on "
            "for advice that isn't about this specific child's data. Never make medical or developmental "
            "diagnoses; if asked, suggest consulting a qualified teacher or professional. Keep answers "
            "concise and actionable, and phrase data-based claims with language like 'Based on recent "
            "practice...' or 'The data suggests...'."
        )
        messages = [{"role": "system", "content": system}]
        for turn in prior_turns or []:
            messages.append({"role": "user", "content": turn["question"]})
            messages.append({"role": "assistant", "content": turn["response"]})
        messages.append(
            {
                "role": "user",
                "content": json.dumps(
                    {"question": question, "child_context": child_context, "curriculum_context": curriculum_context or []}
                ),
            }
        )
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=messages,
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
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=300,
            temperature=0.5,
        )
        return response.choices[0].message.content
