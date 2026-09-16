from flask import request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.blueprints.auth import auth_bp
from app.extensions import db
from app.errors import error_response
from app.models import User
from app.schemas.auth import (
    LoginSchema,
    RegisterSchema,
    SetPinSchema,
    UpdateSettingsSchema,
    VerifyPinSchema,
)

register_schema = RegisterSchema()
login_schema = LoginSchema()
set_pin_schema = SetPinSchema()
verify_pin_schema = VerifyPinSchema()
update_settings_schema = UpdateSettingsSchema()


@auth_bp.post("/register")
def register():
    try:
        data = register_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid registration data", 400, err.messages)

    if User.query.filter_by(email=data["email"]).first():
        return error_response("EMAIL_TAKEN", "An account with this email already exists", 400)

    user = User(name=data["name"], email=data["email"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return {"user": user.to_dict(), "access_token": token}, 201


@auth_bp.post("/login")
def login():
    try:
        data = login_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid login data", 400, err.messages)

    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return error_response("INVALID_CREDENTIALS", "Invalid email or password", 401)

    token = create_access_token(identity=str(user.id))
    return {"user": user.to_dict(), "access_token": token}, 200


@auth_bp.post("/logout")
@jwt_required()
def logout():
    return {"message": "Logged out"}, 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)
    return user.to_dict(), 200


@auth_bp.put("/settings")
@jwt_required()
def update_settings():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)

    try:
        data = update_settings_schema.load(request.get_json(silent=True) or {}, partial=True)
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid settings", 400, err.messages)

    for key, value in data.items():
        setattr(user, key, value)
    db.session.commit()
    return user.to_dict(), 200


@auth_bp.put("/pin")
@jwt_required()
def set_pin():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)

    try:
        data = set_pin_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "PIN must be exactly 4 digits", 400, err.messages)

    user.set_pin(data["pin"])
    db.session.commit()
    return user.to_dict(), 200


@auth_bp.delete("/pin")
@jwt_required()
def clear_pin():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)

    user.pin_hash = None
    db.session.commit()
    return user.to_dict(), 200


@auth_bp.post("/verify-pin")
@jwt_required()
def verify_pin():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)

    try:
        data = verify_pin_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid request", 400, err.messages)

    return {"valid": user.check_pin(data["pin"])}, 200
