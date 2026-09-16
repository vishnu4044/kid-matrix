from marshmallow import Schema, fields, validate


class GeneratePracticeRequestSchema(Schema):
    child_id = fields.Integer(required=True)
    prompt = fields.String(required=True, validate=validate.Length(min=3, max=1000))


class GeneratedQuestionSchema(Schema):
    type = fields.String(required=True, validate=validate.Length(min=1, max=50))
    prompt = fields.String(required=True, validate=validate.Length(min=1, max=255))
    expected_answer = fields.String(required=True, validate=validate.Length(min=1, max=255))


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
