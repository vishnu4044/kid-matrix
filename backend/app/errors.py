from flask import jsonify


def error_response(code: str, message: str, status: int, details: dict | None = None):
    body = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return jsonify(body), status
