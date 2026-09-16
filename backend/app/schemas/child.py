from marshmallow import Schema, fields, validate


class ChildSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    age = fields.Integer(required=True, validate=validate.Range(min=1, max=18))
    grade = fields.String(required=True, validate=validate.Length(min=1, max=50))
    avatar = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))
    learning_goals = fields.List(fields.String(), required=False, load_default=list)


class ChildUpdateSchema(Schema):
    name = fields.String(required=False, validate=validate.Length(min=1, max=120))
    age = fields.Integer(required=False, validate=validate.Range(min=1, max=18))
    grade = fields.String(required=False, validate=validate.Length(min=1, max=50))
    avatar = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))
    learning_goals = fields.List(fields.String(), required=False)
