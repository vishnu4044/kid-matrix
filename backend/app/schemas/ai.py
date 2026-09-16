from marshmallow import Schema, fields, validate


class GeneratePracticeRequestSchema(Schema):
    child_id = fields.Integer(required=True)
    prompt = fields.String(required=True, validate=validate.Length(min=3, max=1000))


GENERATED_QUESTION_TYPES = ["letter", "number", "shape", "math"]


class GeneratedQuestionSchema(Schema):
    """Deliberately narrow: the AI generator may only produce the same single-target
    write/draw format built-in practice uses — never multiple-choice, true/false,
    fill-in-the-blank, or matching. `type` is a closed enum (no free-form strings to
    alias later) and `target`/`math_expression` are short values, not question text —
    the actual displayed prompt is always built server-side from these, in
    app/blueprints/ai/routes.py, never taken from the model directly (see P1)."""

    type = fields.String(required=True, validate=validate.OneOf(GENERATED_QUESTION_TYPES))
    # Generous length here on purpose: this only guards against absurd payloads.
    # The real single-target structural check is build_question_from_ai's
    # per-type regex, which drops (rather than hard-fails the whole batch on)
    # any individual question that isn't a bare letter/number/shape/expression.
    target = fields.String(required=True, validate=validate.Length(min=1, max=200))
    math_expression = fields.String(required=False, allow_none=True, validate=validate.Length(max=200))


class GeneratedPracticeSchema(Schema):
    """Validates the raw JSON returned by OpenAI before it ever touches the DB
    (spec section 4: never let raw LLM output directly modify the database)."""

    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    subject = fields.String(required=True)
    grade = fields.String(required=False, load_default="")
    difficulty = fields.String(required=False, load_default="beginner")
    questions = fields.List(fields.Nested(GeneratedQuestionSchema), required=True, validate=validate.Length(min=1, max=30))


class TutorRequestSchema(Schema):
    child_id = fields.Integer(required=False, allow_none=True)
    question = fields.String(required=True, validate=validate.Length(min=1, max=1000))


class RecommendationsRequestSchema(Schema):
    child_id = fields.Integer(required=True)
