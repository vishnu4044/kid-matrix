from marshmallow import Schema, fields, validate


class PracticeCreateSchema(Schema):
    child_id = fields.Integer(required=True)
    type = fields.String(
        required=True,
        validate=validate.OneOf(["letters", "numbers", "math", "shapes", "mixed"]),
    )
    title = fields.String(required=False, allow_none=True)
    difficulty = fields.String(required=False, allow_none=True, load_default="beginner")
    count = fields.Integer(required=True, validate=validate.OneOf([5, 10, 15, 20]))
    config = fields.Dict(required=False, load_default=dict)


class AnswerSubmitSchema(Schema):
    question_id = fields.Integer(required=True)
    image_data_url = fields.String(required=False, allow_none=True)
    answer = fields.String(required=False, allow_none=True)
