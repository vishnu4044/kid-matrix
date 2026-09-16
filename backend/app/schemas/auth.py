from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class RegisterSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    confirm_password = fields.String(required=True)

    @validates_schema
    def passwords_match(self, data, **kwargs):
        if data.get("password") != data.get("confirm_password"):
            raise ValidationError("Passwords do not match", field_name="confirm_password")


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)
