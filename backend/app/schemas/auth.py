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


class SetPinSchema(Schema):
    pin = fields.String(required=True, validate=validate.Regexp(r"^\d{4}$", error="PIN must be exactly 4 digits"))


class VerifyPinSchema(Schema):
    pin = fields.String(required=True)


class UpdateSettingsSchema(Schema):
    name = fields.String(required=False, validate=validate.Length(min=1, max=120))
    audio_enabled = fields.Boolean(required=False)
