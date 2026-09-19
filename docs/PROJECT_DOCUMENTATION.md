# Kid Matrix — Project Documentation

A complete, self-contained overview of what Kid Matrix is, why it exists, how it's built, and
where it stands today. For deep dives on a specific area, see the linked docs — this file is
the map.

---

## 1. Problem Statement

Every parent with a 4-to-7-year-old faces the same daily grind: getting a kid to actually
practice letters, numbers, and basic math — and having any real idea whether it's working.

Today that means one of two things: a stack of paper worksheets that vanish into a backpack
with no record of what was learned, or a tablet app that's really just multiple-choice quizzes
wearing a "handwriting practice" label — because building genuine handwriting recognition that's
fair to a five-year-old's wobbly, inconsistent strokes is hard, so most apps quietly avoid it and
ask the kid to tap a button instead of write.

The real gap: **there's no simple tool where a child actually writes with a stylus, gets judged
on whether the result is recognizable — not on stroke order, not on penmanship style — and a
parent gets a real, data-grounded answer to "how's she doing, and what should we practice
next?"**

Every child forms letters differently. A tool that penalizes that isn't measuring learning, it's
measuring conformity — and a tool that skips handwriting entirely to dodge the hard problem isn't
measuring learning either.

## 2. The Solution

**Kid Matrix** is an iPad/tablet-first practice workbook built around solving that specific
problem:

- A stylus canvas the child actually writes on — not multiple choice.
- AI vision grading tuned to recognize the *finished result*, never stroke order or handwriting
  style.
- A parent dashboard grounded in real practice data, not vibes.
- AI-generated practice sessions that adapt to what the data says is actually weak.
- An AI tutor a parent can ask questions of, answered from that child's real history.

The core loop: **Parent → Practice → Child Writes → AI Evaluation → Results → Progress → Next
Practice.**

## 3. Live Deployment

| | |
|---|---|
| Frontend | https://frontend-production-2813.up.railway.app |
| Backend API | https://kid-matrix-production.up.railway.app |
| Repo | https://github.com/vishnu4044/kid-matrix (public) |
| Demo login | `john@example.com` / `password123` (seeded: Emma, Noah, sample progress) |

Hosted on Railway as two services (see [§10 Deployment](#10-deployment)). Demo credentials are
intentionally the same ones documented in the repo — this is a public demo account, not a
private one; anyone with the repo link can log into it.

## 4. Who Does What (User Roles)

**Parent** — signs in, manages children, creates or AI-generates practice, reviews results and
progress, asks the AI tutor questions, manages settings and a PIN.

**Child ("Kid Mode")** — a deliberately simplified, distraction-free view: sees only the current
practice's prompts, writes on a canvas, gets encouraging tick/cross feedback, sees a completion
screen. Never sees parent account info, settings, or technical details. Exiting back to Parent
Mode requires a PIN if the parent has set one.

## 5. The Core Loop, Screen by Screen

1. **Splash → Login/Register** — JWT-based auth, passwords hashed (pbkdf2).
2. **Parent Home** — lists children as cards (skeleton-loading state), "+ Add Child".
3. **Child Dashboard** — overall accuracy, per-subject progress bars, links to create practice /
   view progress / history / AI tutor.
4. **Create Practice** — choose Letters / Numbers / Math / Shapes / Mixed (deterministic
   generators), or **AI Generate** (natural-language prompt → OpenAI → structured questions).
5. **Practice Ready** — summary card ("5 Questions", estimated time), "Start for {child}" hands
   off into Kid Mode.
6. **Kid Mode writing screen** — big single-target prompt (a letter/number/shape/math problem),
   a two-layer `HandwritingCanvas` (static guide lines underneath, transparent ink layer on top),
   audio playback of the prompt, Clear/Next.
7. **Instant feedback overlay** — on submit, a tick (✓, green, star-burst animation) or cross
   (✕, soft pink, gentle wobble) appears directly over the canvas for ~1.1s, then the app
   **automatically advances** to the next question — no "Try Again" loop; a wrong answer is
   simply recorded and the session moves on. A live row of progress dots at the top fills in as
   gold stars / soft pink dots as the child moves through the session.
8. **Session Complete** — trophy, correct/total, accuracy %, confetti above a 60% threshold,
   "Play Again" or "I'm Done" (hands back to Parent Mode).
9. **Parent Session Summary** — per-question breakdown: target vs. what the child actually
   wrote, so a wrong answer is visibly remembered, not folded into an aggregate percentage.
10. **Progress Dashboard** — overall %, subject bars, a trend chart (inline SVG), and a
    mastered/improving/needs-practice letter grid (A–Z).
11. **Practice History** — filterable list of past sessions, click through to the same
    per-question breakdown.
12. **AI Tutor** — a chat interface; each child has their **own persisted conversation** (not a
    shared/global chat), answered from that child's real SQLite data plus optional general
    teaching guidance retrieved via FAISS.
13. **Settings** — account name, audio on/off, manage/remove children, set/clear a 4-digit
    Parent PIN that gates exiting Kid Mode.

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query |
| Backend | Flask, SQLAlchemy, Marshmallow (validation), Flask-JWT-Extended, Flask-CORS |
| Database | SQLite (schema written to be Postgres-portable) |
| AI | OpenAI API — **gpt-4o-mini exclusively**, hardcoded (no other chat/vision model in the app) |
| Retrieval | FAISS (`faiss-cpu`) over a small hand-written curriculum corpus, embedded with `text-embedding-3-small` (the one deliberate exception to "one model" — embeddings are a distinct capability gpt-4o-mini doesn't provide) |
| Handwriting canvas | HTML5 Canvas + Pointer Events API |
| Testing | pytest (backend, 45 tests), Vitest + Testing Library (frontend, 7 tests) |
| Deployment | Docker (per-service Dockerfiles), Railway (infra declared in `.railway/railway.ts`) |

## 7. Architecture

```
React (Vite)                Flask API                    OpenAI API
Parent UI | Kid Mode  <-->  auth/children/practice/ai <-> gpt-4o-mini (chat+vision)
                                    |
                                    v
                             SQLite (source of truth)
                                    |
                                    v (optional, tutor only)
                             FAISS curriculum retrieval
```

The OpenAI key lives only in the backend's environment — the frontend calls Flask endpoints
under `/api/ai/*` and never sees it. Full diagram and structure in
[`docs/architecture.md`](architecture.md).

### Backend layout
```
backend/app/
  blueprints/   auth, children, practice, ai — route handlers
  models/       User, Child, PracticeSession, Question, Answer, Progress,
                AIInteraction, AnalyticsEvent
  schemas/      Marshmallow request/response validation
  services/     openai_service, handwriting_evaluation, practice_generator,
                curriculum_retrieval, child_context, progress, analytics, storage
```

### Frontend layout
```
frontend/src/
  api/          typed fetch wrappers per resource
  components/   generic reusable UI (Button, Card, Modal, Spinner, ProtectedRoute)
  features/     auth, children, practice, handwriting, ai — feature-scoped components
  layouts/      ParentLayout (bottom/side nav), KidLayout (distraction-free + PIN gate)
  pages/        one file per route
```

## 8. Database Schema (summary)

Full field-by-field detail in [`docs/schema.md`](schema.md).

| Model | Purpose |
|---|---|
| `User` | Parent account: email/password hash, optional PIN hash, audio preference |
| `Child` | Name, age, grade, avatar, learning goals |
| `PracticeSession` | One practice run: type, title, status, score, timestamps |
| `Question` | One prompt within a session: type, prompt text, target, expected answer |
| `Answer` | One submission: recognized text (real, never the target echoed back), correctness, confidence, feedback, image path |
| `Progress` | Rolling per-child/subject/topic attempts + accuracy, used for the dashboard and AI context |
| `AIInteraction` | Logged AI calls, tagged `tutor` vs `generate_practice` so tutor history stays clean |
| `AnalyticsEvent` | Lightweight internal event log (practice started/completed, question answered, etc.) — no dedicated UI yet |

All tables are created via `db.create_all()` on startup (no migration tool yet — a schema
change means dropping and reseeding the dev SQLite file).

## 9. API Surface (summary)

Full request/response detail in [`docs/api.md`](api.md).

```
POST   /api/auth/register | /login | /logout
GET    /api/auth/me
PUT    /api/auth/settings | /pin        DELETE /api/auth/pin        POST /api/auth/verify-pin

GET/POST    /api/children               GET/PUT/DELETE /api/children/:id
GET         /api/children/:id/progress | /history | /tutor-history

POST   /api/practice                    GET  /api/practice/:id
POST   /api/practice/:id/start | /answers | /complete
GET    /api/practice/:id/results

POST   /api/ai/generate-practice | /tutor | /recommendations
```

Every endpoint except register/login requires `Authorization: Bearer <jwt>`; every child/session
lookup is scoped to the authenticated parent (a parent can never see another parent's data —
covered by dedicated authorization tests).

## 10. AI Integration

**One model, everywhere.** `gpt-4o-mini` is hardcoded as a constant in
`backend/app/services/openai_service.py` — there is no environment variable that can point any
call at a different model, and no other chat/vision model is used anywhere in the app.

**Handwriting evaluation** (`HandwritingEvaluationService`, see
[`docs/handwriting-recognition.md`](handwriting-recognition.md)): the canvas image goes to a
vision call using a **strict JSON schema** (not "please respond with JSON" — an enforced schema
with typed fields), which returns a real transcription (`recognized_text`) of what was actually
drawn, independent of whether it matches the target. This is deliberate: an earlier version of
this evaluator echoed the target back as "what the child wrote" whenever the verdict was
correct, which meant a blank canvas could still display the right answer. The current version
always shows the model's genuine best guess (or `null` if nothing could be determined), and the
evaluation prompt explicitly asks the model to judge only the finished result — never stroke
order, starting point, or personal handwriting style — and to give the benefit of the doubt on
rough-but-recognizable attempts. If no API key is configured, or the call fails, a lenient
heuristic ("is there any ink at all?") keeps the practice loop from getting stuck.

**AI practice generation**: the model is constrained to return *only* `{type, target,
math_expression}` — a closed enum of `letter|number|shape|math` and a bare value, never question
text or answer options. The actual prompt shown to the child (and, for math, the answer itself)
is always built server-side using the same templates as the deterministic built-in generators —
the model's arithmetic is never trusted; a math answer is computed from the parsed expression in
Python. This makes multiple-choice/true-false/fill-in-the-blank output structurally impossible,
not just uncommon — verified by asking the model directly for those formats and confirming it
still returned only single-target write/draw prompts.

**AI Tutor**: each child has their own persisted conversation
(`GET /api/children/:id/tutor-history`), and the model receives the last 3 exchanges as real
conversation history rather than a fresh, memoryless call each turn. The data passed in
distinguishes `overall_subject_accuracy` (all-time aggregate) from `sessions_today` and
`recent_sessions` (individual session scores) with explicit instructions on which field answers
which kind of question — an earlier version bundled these ambiguously, which let the model cite
different real-but-different numbers for the same subject across a conversation.

**FAISS retrieval**: a ~13-entry hand-written curriculum corpus (general early-childhood
teaching guidance — e.g. "letter reversals are normal at this age") is embedded and searched to
supplement Tutor answers when a question calls for general advice rather than child-specific
data. Not used for any CRUD path — SQLite remains the only source of truth for child data.

## 11. Security & Privacy

- Passwords hashed with `werkzeug.security` (pbkdf2), never stored plaintext.
- JWT access tokens; every child/session/answer query filtered by the authenticated parent's ID.
- `OPENAI_API_KEY` lives only in backend environment variables, never sent to the frontend.
- CORS restricted to explicitly configured origins.
- A 4-digit Parent PIN (hashed, optional) gates exiting Kid Mode back to parent screens.
- AI Tutor is instructed never to make medical/developmental diagnoses and to suggest a
  qualified teacher/professional when appropriate.
- Analytics logging stores only ids and event types — no additional PII.

## 12. Testing

- **Backend**: 45 pytest tests — auth, cross-parent authorization, practice generation (built-in
  and AI), answer submission and evaluation (including mocked vision responses for
  correct/incorrect/blank cases), progress aggregation, AI endpoint validation, tutor context and
  conversation-history behavior.
- **Frontend**: 7 Vitest tests — `ProtectedRoute` redirect behavior, `HandwritingCanvas` (blank
  state, ink detection, two-layer rendering), `Login` (success and error paths).
- All verified against the real OpenAI API during development, not just mocks — e.g. the vision
  evaluator was confirmed live to distinguish a drawn "A" from a "C" target, and to transcribe a
  wrong digit correctly instead of echoing the target.

## 13. Local Development

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env        # fill in OPENAI_API_KEY
python seed.py                 # demo parent + Emma/Noah
python wsgi.py                 # http://0.0.0.0:5050

# Frontend
cd frontend
npm install
cp .env.example .env           # points at http://127.0.0.1:5050/api by default
npm run dev                    # http://localhost:5173
```

Backend runs on port 5050, not 5000 — macOS's AirPlay Receiver squats on `*:5000` across all
interfaces and blocks it entirely. Full setup, testing, and LAN-hosting instructions (e.g. to
test from an iPad on the same WiFi) are in the top-level [`README.md`](../README.md).

## 14. Deployment

Hosted on Railway as two independently deployed services from this one monorepo, declared as
code in [`.railway/railway.ts`](../.railway/railway.ts):

- **`kid-matrix`** (backend) — root directory `backend/`, Dockerfile builder, a persistent
  volume mounted at `/data` holding the SQLite database and uploaded handwriting images.
- **`frontend`** — root directory `frontend/`, Dockerfile builder. `VITE_API_BASE_URL` is
  supplied as a **build argument** (Vite bakes `VITE_*` values into the static bundle at build
  time, not runtime), pointing at the backend's public Railway URL.

Secrets (`SECRET_KEY`, `JWT_SECRET_KEY`, `OPENAI_API_KEY`, `CORS_ORIGINS`) are declared as
`preserve()` in the IaC file — meaning "never touch this from source" — and were set directly on
Railway via `railway variable set`, never committed to git.

Two platform-specific issues were hit and fixed along the way: Railway's build auto-detection
fails at a bare monorepo root (fixed by setting each service's root directory explicitly), and
the frontend's nginx container 502'd until its domain's target port was explicitly set to match
nginx's actual listening port (80).

## 15. What's Implemented vs. What's Not

**Fully implemented**: all 8 original phases (auth → child profiles → practice creation →
handwriting canvas/Kid Mode → progress tracking → AI practice generator → AI tutor → FAISS
retrieval), plus a Parent PIN gate, a real Settings page, basic analytics event logging, and a
small automated test suite on both ends.

**Known gaps**:
- No password-reset/change flow yet.
- No self-serve "Kid Home" screen — a child only runs a practice a parent already created, never
  picks their own subject.
- No offline support (no caching, no sync-on-reconnect).
- No dedicated Playwright/Cypress end-to-end suite — the core loop was verified manually via
  browser automation against the real backend and a real OpenAI key during development.
- No database migration tooling (schema changes require a fresh SQLite file in dev).
- FAISS curriculum corpus is small (~13 entries) and hand-written, not a full curriculum
  database.
- Advanced handwriting recognition (a custom-trained model) is a documented future upgrade, not
  built — the current OpenAI-vision-based evaluator is real, not a stub, but the interface is
  designed to be swappable (see [`docs/handwriting-recognition.md`](handwriting-recognition.md)).

## 16. Where to Look Next

- [`docs/architecture.md`](architecture.md) — full system diagram, phase-by-phase status table,
  Parent/Kid Mode routing, frontend/backend folder structure in detail.
- [`docs/schema.md`](schema.md) — every model, every field, with notes.
- [`docs/api.md`](api.md) — every endpoint, request/response shape, error format.
- [`docs/handwriting-recognition.md`](handwriting-recognition.md) — the evaluation architecture
  and exactly where a future custom ML model would plug in.
- [`README.md`](../README.md) — setup, testing, Docker, and deployment instructions.
