# Kid Matrix — API Specification

Base URL (dev): `http://127.0.0.1:5000/api` (use `127.0.0.1`, not `localhost` — on macOS
`localhost:5000` can collide with the AirPlay Receiver).

All authenticated endpoints require `Authorization: Bearer <jwt>`.

## Auth (implemented)

### `POST /api/auth/register`
Body: `{ "name": str, "email": str, "password": str, "confirm_password": str }`
201 → `{ "user": { "id", "name", "email" }, "access_token": str }`
400 → validation errors (e.g. passwords don't match, email already registered)

### `POST /api/auth/login`
Body: `{ "email": str, "password": str }`
200 → `{ "user": {...}, "access_token": str }`
401 → invalid credentials

### `POST /api/auth/logout`
Requires auth. Client discards the token; endpoint returns 200 for symmetry (JWTs here are
stateless, no server-side blocklist).

### `GET /api/auth/me`
200 → `{ id, name, email, has_pin, audio_enabled }` for the current user.

### `PUT /api/auth/settings`
Body: partial `{ name?, audio_enabled? }`. 200 → updated user.

### `PUT /api/auth/pin`
Body: `{ pin: "1234" }` (must be exactly 4 digits). Hashes and stores it; used to gate exiting
Kid Mode back to the parent dashboard. 200 → updated user (`has_pin: true`).

### `DELETE /api/auth/pin`
Removes the PIN. 200 → updated user (`has_pin: false`).

### `POST /api/auth/verify-pin`
Body: `{ pin }`. 200 → `{ valid: bool }` — never reveals the actual PIN, just a match result.

## Children (implemented)

### `GET /api/children`
200 → `[{ id, name, age, grade, avatar, learning_goals }, ...]` — only the current user's children.

### `POST /api/children`
Body: `{ name, age, grade, avatar?, learning_goals? }`
201 → created child. `parent_id` is taken from the JWT identity, never from the request body.

### `GET /api/children/:id`
200 → child detail. 404 if the child doesn't belong to the current user (never 403, to avoid
leaking existence of other parents' child ids).

### `PUT /api/children/:id`
Body: partial update of the same fields. 404 if not owned.

### `DELETE /api/children/:id`
204. 404 if not owned.

### `GET /api/children/:id/progress`
200 → `{ overall_accuracy, sessions_completed, questions_completed, time_spent_minutes,
subject_progress: {letters, numbers, shapes, math}, topics: {subject: [{topic, attempts,
correct, accuracy, status, last_practiced}]} }`. `status` is one of `mastered` (≥80%),
`improving` (50-79%), `needs_practice` (<50%), `not_started`.

### `GET /api/children/:id/history`
200 → `[{ id, type, title, difficulty, status, started_at, completed_at, score,
total_questions }, ...]` — completed sessions only, newest first.

### `GET /api/children/:id/tutor-history`
200 → `[{ id, child_id, question, response, created_at }, ...]` — this child's saved AI Tutor
conversation, oldest first. Excludes `AIInteraction` rows logged from `/api/ai/generate-practice`
(`interaction_type="generate_practice"`) — only real tutor Q&A shows here.

## Practice (implemented)

### `POST /api/practice`
Body: `{ child_id, type: "letters"|"numbers"|"math"|"shapes"|"mixed", count: 5|10|15|20,
difficulty?, title?, config: {...type-specific} }`. Generates questions deterministically
(see `app/services/practice_generator.py`) and persists a `PracticeSession` + `Question` rows.
201 → session with `questions` (no `expected_answer` exposed to the client).

### `GET /api/practice/:id`
200 → session detail (same shape as above).

### `POST /api/practice/:id/start`
Sets `status=in_progress`, `started_at=now`. 200 → session.

### `POST /api/practice/:id/answers`
Body: `{ question_id, image_data_url? , answer? }` — one of the two required.
`image_data_url` (a `data:image/png;base64,...` canvas export) goes through
`HandwritingEvaluationService` (OpenAI vision, with a lenient heuristic fallback — see
`docs/handwriting-recognition.md`). `answer` (plain text) is compared case-insensitively
against the question's expected answer — used as a fallback path. Updates `Progress` for the
relevant subject/topic on every submission. 201 → `{ id, is_correct, confidence, feedback }`.

### `POST /api/practice/:id/complete`
Aggregates the latest answer per question, computes `score` (% correct), sets
`status=completed`, `completed_at=now`. 200 → session + `correct_count`.

### `GET /api/practice/:id/results`
200 → `{ session, results: [{ question_id, type, prompt, target, is_correct, feedback }] }` —
per-question breakdown (which letters/answers were right vs. wrong), not just the aggregate
score. Used by the Practice Summary screen so wrong answers are visibly remembered in history,
not just folded into an accuracy percentage.

## AI (implemented — requires `OPENAI_API_KEY`; 503 `AI_UNAVAILABLE` otherwise)

### `POST /api/ai/generate-practice`
Body: `{ child_id, prompt }`. Builds a child context (age/grade/subject accuracy/weak
topics/recent sessions — real SQLite data only) and asks OpenAI for structured JSON
(`title, subject, grade, difficulty, questions: [{type, prompt, expected_answer}]`).
The raw response is validated with `GeneratedPracticeSchema` before anything touches the
DB — invalid AI output → 502 `AI_INVALID_RESPONSE`, never silently persisted. On success,
persisted the same way as `POST /api/practice` (`type="ai"`). 201 → session.

### `POST /api/ai/tutor`
Body: `{ child_id?, question }`. Builds the same child context (if `child_id` given) plus up
to 3 relevant snippets from the FAISS-backed curriculum corpus (`app/services/
curriculum_retrieval.py`) when the question seems to call for general teaching guidance.
200 → `{ response }`. Logged to `AIInteraction` (`interaction_type="tutor"`) and retrievable
per child via `GET /api/children/:id/tutor-history` — each child has their own saved
conversation, not a shared/global chat.

### `POST /api/ai/recommendations`
Body: `{ child_id }`. 200 → `{ recommendation, suggested_type, suggested_config }`.

## Error format

All errors: `{ "error": { "code": str, "message": str, "details"?: object } }` with an appropriate
HTTP status (400 validation, 401 auth, 404 not found/not owned, 502 invalid AI response,
503 AI unavailable, 500 unexpected).
