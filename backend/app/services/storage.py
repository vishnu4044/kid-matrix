"""Local-disk storage for handwriting images (MVP).

Swappable later for AWS S3 / GCS / Azure Blob without changing callers —
callers only depend on save_handwriting_image() and its return path.
"""
import base64
import os
import uuid

from flask import current_app


def save_handwriting_image(child_id: int, question_id: int, image_data_url: str) -> str:
    """Decode a `data:image/png;base64,...` URL and save it under UPLOAD_DIR.

    Returns a path relative to UPLOAD_DIR (suitable for storing in the DB).
    """
    header, _, encoded = image_data_url.partition(",")
    if not encoded:
        raise ValueError("Invalid image data URL")

    image_bytes = base64.b64decode(encoded)

    rel_dir = os.path.join("handwriting", str(child_id))
    abs_dir = os.path.join(current_app.config["UPLOAD_DIR"], rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    filename = f"{question_id}_{uuid.uuid4().hex[:8]}.png"
    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        f.write(image_bytes)

    return os.path.join(rel_dir, filename)
