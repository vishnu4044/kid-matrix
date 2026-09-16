"""Deterministic (non-AI) practice question generators for Phase 2.

Each generator returns a list of dicts shaped like the `Question` model's
constructor kwargs (minus `session_id`/`order_index`, added by the caller).
"""
import re
import random
import string

LETTER_GROUPS = {
    "A-F": "ABCDEF",
    "G-L": "GHIJKL",
    "M-R": "MNOPQR",
    "S-Z": "STUVWXYZ",
    "All": string.ascii_uppercase,
}

MATH_DIFFICULTY_RANGES = {
    "beginner": (0, 5),
    "intermediate": (0, 10),
    "advanced": (0, 20),
}


def _cycle_to_count(pool: list, count: int) -> list:
    if not pool:
        return []
    random.shuffle(pool)
    result = []
    while len(result) < count:
        result.extend(pool)
    return result[:count]


def generate_letters(case: str, group: str, count: int) -> list[dict]:
    letters = LETTER_GROUPS.get(group, LETTER_GROUPS["All"])
    targets = []
    if case in ("upper", "both"):
        targets.extend(list(letters))
    if case in ("lower", "both"):
        targets.extend([c.lower() for c in letters])

    chosen = _cycle_to_count(targets, count)
    return [
        {
            "type": "letter",
            "prompt": f"Write the letter {ch}",
            "target": ch,
            "expected_answer": ch,
            "metadata_json": {"case": "upper" if ch.isupper() else "lower"},
        }
        for ch in chosen
    ]


def generate_numbers(range_key: str, count: int, custom_min: int | None = None, custom_max: int | None = None) -> list[dict]:
    ranges = {"0-5": (0, 5), "0-9": (0, 9), "1-20": (1, 20)}
    if range_key == "custom" and custom_min is not None and custom_max is not None:
        low, high = custom_min, custom_max
    else:
        low, high = ranges.get(range_key, (0, 9))

    pool = list(range(low, high + 1))
    chosen = _cycle_to_count(pool, count)
    return [
        {
            "type": "number",
            "prompt": f"Write the number {n}",
            "target": str(n),
            "expected_answer": str(n),
            "metadata_json": {"range": range_key},
        }
        for n in chosen
    ]


def generate_math(operation: str, count: int, difficulty: str = "beginner") -> list[dict]:
    low, high = MATH_DIFFICULTY_RANGES.get(difficulty, MATH_DIFFICULTY_RANGES["beginner"])
    questions = []
    attempts = 0
    while len(questions) < count and attempts < count * 20:
        attempts += 1
        a = random.randint(low, high)
        b = random.randint(low, high)

        if operation == "addition":
            answer = a + b
            symbol = "+"
        elif operation == "subtraction":
            if a < b:
                a, b = b, a
            answer = a - b
            symbol = "-"
        elif operation == "multiplication":
            a = random.randint(0, min(high, 10))
            b = random.randint(0, min(high, 10))
            answer = a * b
            symbol = "×"
        elif operation == "division":
            b = random.randint(1, min(high, 10) or 1)
            answer = random.randint(0, min(high, 10))
            a = answer * b
            symbol = "÷"
        else:
            raise ValueError(f"Unknown operation: {operation}")

        questions.append(
            {
                "type": "math",
                "prompt": f"{a} {symbol} {b} = ?",
                "target": str(answer),
                "expected_answer": str(answer),
                "metadata_json": {"operation": operation, "a": a, "b": b},
            }
        )
    return questions


SHAPE_OPTIONS = ["circle", "square", "triangle", "rectangle"]


def generate_shapes(shapes: list[str], count: int) -> list[dict]:
    pool = [s for s in shapes if s in SHAPE_OPTIONS] or SHAPE_OPTIONS
    chosen = _cycle_to_count(list(pool), count)
    return [
        {
            "type": "shape",
            "prompt": f"Draw a {shape}",
            "target": shape,
            "expected_answer": shape,
            "metadata_json": {},
        }
        for shape in chosen
    ]


def generate_mixed(subjects: list[str], count: int, difficulty: str = "beginner") -> list[dict]:
    """Split `count` evenly across the requested subjects using sensible defaults."""
    subjects = subjects or ["letters", "numbers", "shapes", "math"]
    base = count // len(subjects)
    remainder = count % len(subjects)
    # give the leftover questions to the first `remainder` subjects so the total is exact
    counts = [base + (1 if i < remainder else 0) for i in range(len(subjects))]

    questions: list[dict] = []
    for subject, subject_count in zip(subjects, counts):
        if subject_count <= 0:
            continue
        if subject == "letters":
            questions.extend(generate_letters("upper", "A-F", subject_count))
        elif subject == "numbers":
            questions.extend(generate_numbers("1-20", subject_count))
        elif subject == "shapes":
            questions.extend(generate_shapes(SHAPE_OPTIONS, subject_count))
        elif subject == "math":
            questions.extend(generate_math("addition", subject_count, difficulty))

    random.shuffle(questions)
    return questions[:count]


_MATH_EXPRESSION_RE = re.compile(r"^\s*(\d{1,3})\s*([+\-×xX*÷/])\s*(\d{1,3})\s*$")
_MATH_SYMBOL_CANONICAL = {"+": "+", "-": "-", "×": "×", "x": "×", "X": "×", "*": "×", "÷": "÷", "/": "÷"}


def build_question_from_ai(raw: dict) -> dict | None:
    """Turns one AI-proposed {type, target, math_expression} into the same shape
    the deterministic generators above produce — same prompt phrasing, same
    target/expected_answer semantics — or returns None if it doesn't validate.

    This is the enforcement point for P1: the AI is never trusted to phrase the
    prompt or state the answer itself. We validate `target` against a strict
    per-type pattern and, for math, parse the bare expression and compute the
    answer ourselves (never trusting the model's arithmetic), then build the
    prompt with the exact same template `generate_math` uses. Anything that
    doesn't fit — multi-word text, option lists, non-numeric noise — fails
    validation here and is dropped rather than persisted.
    """
    qtype = raw.get("type")
    target = (raw.get("target") or "").strip()

    if qtype == "letter":
        match = re.fullmatch(r"[A-Za-z]", target)
        if not match:
            return None
        return {
            "type": "letter",
            "prompt": f"Write the letter {target}",
            "target": target,
            "expected_answer": target,
            "metadata_json": {"case": "upper" if target.isupper() else "lower", "source": "ai"},
        }

    if qtype == "number":
        if not re.fullmatch(r"\d{1,3}", target):
            return None
        return {
            "type": "number",
            "prompt": f"Write the number {target}",
            "target": target,
            "expected_answer": target,
            "metadata_json": {"source": "ai"},
        }

    if qtype == "shape":
        shape = target.lower()
        if shape not in SHAPE_OPTIONS:
            return None
        return {
            "type": "shape",
            "prompt": f"Draw a {shape}",
            "target": shape,
            "expected_answer": shape,
            "metadata_json": {"source": "ai"},
        }

    if qtype == "math":
        expression = (raw.get("math_expression") or "").strip()
        match = _MATH_EXPRESSION_RE.match(expression)
        if not match:
            return None
        a, symbol_raw, b = int(match.group(1)), match.group(2), int(match.group(3))
        symbol = _MATH_SYMBOL_CANONICAL[symbol_raw]

        if symbol == "+":
            answer = a + b
        elif symbol == "-":
            if a < b:
                a, b = b, a
            answer = a - b
        elif symbol == "×":
            answer = a * b
        else:  # ÷ — only accept expressions that divide evenly
            if b == 0 or a % b != 0:
                return None
            answer = a // b

        return {
            "type": "math",
            "prompt": f"{a} {symbol} {b} = ?",
            "target": str(answer),
            "expected_answer": str(answer),
            "metadata_json": {"symbol": symbol, "a": a, "b": b, "source": "ai"},
        }

    return None
