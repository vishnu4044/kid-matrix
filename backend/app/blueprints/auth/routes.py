from flask import request
from flask_jwt_extended import create_access_token, jwt_required
from marshmallow import ValidationError

from app.blueprints.auth import auth_bp
from app.extensions import db
from app.errors import error_response
from app.models import User
from app.schemas.auth import RegisterSchema, LoginSchema

register_schema = RegisterSchema()
login_schema = LoginSchema()


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
