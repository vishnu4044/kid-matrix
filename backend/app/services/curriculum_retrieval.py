"""Optional FAISS-backed semantic retrieval over a small curriculum corpus
(spec section 6). This is NOT used for normal CRUD or per-child data — SQLite
remains the source of truth for that. It only supplements the AI Tutor with
general teaching guidance (e.g. "letter reversals are normal at this age")
when a parent's question seems to call for it.

Fails silently (returns no results) if OPENAI_API_KEY is missing or the
embedding call errors, so the tutor still works without this layer — matching
the spec's "if FAISS doesn't add real value here, don't use it" guidance for
degraded/offline scenarios.
"""
import json
import logging
import os

import numpy as np

logger = logging.getLogger(__name__)

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CURRICULUM_PATH = os.path.join(_BASE_DIR, "ai", "curriculum.json")
EMBEDDING_MODEL = "text-embedding-3-small"

_cache: dict = {"index": None, "corpus": None}


def _load_corpus() -> list[dict]:
    if not os.path.exists(CURRICULUM_PATH):
        return []
    with open(CURRICULUM_PATH) as f:
        return json.load(f)


def _build_index(client) -> None:
    import faiss

    corpus = _load_corpus()
    if not corpus:
        _cache["index"] = None
        _cache["corpus"] = []
        return

    texts = [entry["text"] for entry in corpus]
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    vectors = np.array([d.embedding for d in response.data], dtype="float32")
    faiss.normalize_L2(vectors)

    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    _cache["index"] = index
    _cache["corpus"] = corpus


def retrieve(query: str, api_key: str, k: int = 3) -> list[dict]:
    if not api_key:
        return []

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        if _cache["index"] is None:
            _build_index(client)

        if not _cache["index"] or not _cache["corpus"]:
            return []

        import faiss

        query_vec = np.array(
            [client.embeddings.create(model=EMBEDDING_MODEL, input=[query]).data[0].embedding], dtype="float32"
        )
        faiss.normalize_L2(query_vec)

        _, indices = _cache["index"].search(query_vec, min(k, len(_cache["corpus"])))
        return [_cache["corpus"][i] for i in indices[0] if i >= 0]
    except Exception:  # noqa: BLE001 - retrieval must never break the tutor flow
        logger.exception("Curriculum retrieval failed; continuing without it")
        return []
