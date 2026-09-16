# Handwriting Recognition — Plug-in Point

## Current implementation (MVP)

`backend/app/services/handwriting_evaluation.py` exposes a single function:

```python
evaluate(target: str, question_type: str, image_data_url: str) -> dict
```

returning `{recognized, confidence, result, feedback, needs_practice}`. This is the
**only** function any caller (currently `POST /api/practice/:id/answers`) depends on —
nothing in the routes, models, or frontend knows or cares how evaluation happens
internally. That is the plug-in seam for Phase 8 (or beyond).

Today, `evaluate()`:
1. Checks the submitted canvas has any ink at all (via `HandwritingCanvas`'s
   two-layer design — see below — so guide lines never count as "ink").
2. If it does, and `OPENAI_API_KEY` is configured, sends the image to an OpenAI
   vision model (`OpenAIService.evaluate_handwriting`) with the target character/
   shape and asks it to judge only the **finished result** — never stroke order,
   starting point, speed, or personal handwriting style (spec sections 2, 23, 24).
3. Falls back to a lenient "has ink → correct" heuristic if no key is configured
   or the API call fails, so the practice loop never gets stuck (spec section 50).

This is real recognition today (verified against actual drawn letters during
development — it correctly distinguished a drawn "A" from a "C" target, and
recognized a drawn "E"), not a stub — but it is intentionally swappable.

## Why the canvas is two layers

`frontend/src/features/handwriting/HandwritingCanvas.tsx` renders a static guide
layer (ruled lines, faint target letter/shape) UNDER a transparent ink layer the
child actually draws on. `toDataURL()` composites only the ink layer onto a plain
white background before it's ever sent to the backend. This matters for both the
has-ink check and any vision-based evaluator: the guide artwork must never be
mistaken for the child's handwriting.

## Where a future model plugs in

To add a custom OCR / handwriting-recognition / computer-vision model later:

1. Implement a new function with the same signature as `evaluate()` (or a class
   with an `.evaluate()` method) in `handwriting_evaluation.py` or a new module.
2. Swap the call inside `evaluate()` (or add a config flag, e.g.
   `HANDWRITING_EVALUATOR=vision|custom_model`, read in `app/config.py`) to
   dispatch to the new implementation.
3. Nothing else changes — the route, the `Answer` model, the frontend, and the
   feedback screens are all decoupled from the evaluation strategy.

Reasonable next steps, roughly in order of effort:
- A small on-device model (e.g. a CNN for isolated digits/letters, trained on
  EMNIST/MNIST-style data) for offline/low-latency evaluation, with the OpenAI
  vision path kept as a fallback when confidence is low.
- Stroke-level analysis using the pointer event stream itself (not just the
  final raster image) — the canvas already has access to every point; capturing
  and sending the stroke path (not just the PNG) would enable trajectory-aware
  models without changing the submission API shape much (add a `strokes` field
  alongside `image_data_url`).
- A dedicated shape-recognition heuristic (e.g. contour analysis via OpenCV) for
  the `shape` question type specifically, since "is this closed curve a circle"
  is a more tractable classical CV problem than character recognition.
