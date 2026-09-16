# Kid Matrix

An iPad/tablet-first practice workbook for young children. Parents create practice sessions
(letters, numbers, math, shapes, or AI-generated), hand the device to the child, the child
writes with a stylus, and results feed a per-child progress history the parent can use to
plan what comes next.

**Core loop (verified end-to-end, including live OpenAI calls):** Parent Login → Select Child
→ Parent Dashboard → Create Practice → Practice Ready → Hand iPad to Child → Kid Mode →
Child Writes → AI Evaluation → Results → Progress → AI Tutor / Next Practice.

See `docs/architecture.md` for the full phase-by-phase status and known gaps,
`docs/schema.md` for the database schema, `docs/api.md` for the REST API, and
`docs/handwriting-recognition.md` for how the evaluation layer is designed to be swapped
for a custom ML model later.

## Project layout

```
kid-matrix/
  frontend/    React + TypeScript + Vite + Tailwind
  backend/     Flask + SQLAlchemy + SQLite
  ai/          curriculum.json — small corpus used by FAISS retrieval (Phase 7)
  data/        sqlite db file (gitignored)
  uploads/     handwriting images (gitignored)
  docs/        architecture, schema, API, handwriting-recognition docs
```

## Prerequisites

- Python 3.11+ (developed against 3.13)
- Node.js 20+
- An OpenAI API key if you want the AI features (practice generator, tutor, handwriting
  evaluation) to do more than fall back to lenient heuristics — see `.env.example`.

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env         # then fill in OPENAI_API_KEY (optional but recommended)

python seed.py                  # creates demo parent + Emma/Noah with sample progress
python wsgi.py                  # runs on http://127.0.0.1:5000
```

**Use `127.0.0.1:5000`, not `localhost:5000`** — on macOS, `localhost:5000` can be captured by
the AirPlay Receiver, which will silently 403 all requests. The frontend's default
`VITE_API_BASE_URL` already points at `127.0.0.1`.

Demo login after seeding: `john@example.com` / `password123` (children: Emma, Noah).

### Run backend tests

```bash
cd backend
PYTHONPATH=. pytest -q
```

29 tests cover auth, child ownership/authorization, practice generation, answer submission +
evaluation (including a real handwriting heuristic fallback path), progress aggregation, and
AI endpoints (mocked, so they run without an API key or network access).

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env            # defaults already point at http://127.0.0.1:5000/api
npm run dev                     # http://localhost:5173
```

```bash
npm run build                   # type-checks (tsc -b) then builds to dist/
npm run test                    # vitest — ProtectedRoute, HandwritingCanvas, Login (7 tests)
```

## Docker

```bash
OPENAI_API_KEY=sk-... docker compose up --build
```

Backend on `:5000`, frontend on `:5173`. SQLite data and uploads are bind-mounted to
`./data` and `./uploads` so they persist across container restarts. Note: the frontend image
bakes `VITE_API_BASE_URL` in at build time (from `frontend/.env`); if you change the backend
port or host, rebuild the frontend image.

## Where the OpenAI key is used

`backend/.env` only — never sent to the browser. Every AI-touching endpoint
(`/api/ai/*`, and handwriting evaluation inside `/api/practice/:id/answers`) is called from
Flask, which then calls OpenAI server-side. If `OPENAI_API_KEY` is unset:
- `/api/ai/*` endpoints return `503 AI_UNAVAILABLE` instead of crashing.
- Handwriting evaluation falls back to a lenient "has ink → correct" heuristic so the
  practice loop still completes (see `docs/handwriting-recognition.md`).

## What's implemented vs. not

All 8 phases from the original spec have a working implementation, plus a Parent PIN gate on
exiting Kid Mode, a real Settings page (name, audio toggle, PIN management, manage children),
and basic analytics event logging (see `docs/architecture.md` for the detailed table). Backend
has 34 pytest tests; frontend has a small Vitest suite (`ProtectedRoute`, `HandwritingCanvas`,
`Login`). Main known gaps: no offline caching, no dedicated Playwright/Cypress e2e suite, and
no self-serve "Kid Home" practice picker (children only enter a practice a parent already
created) — the core loop was verified manually via Chrome browser automation against the real
backend and a real OpenAI key during development, not just automated tests.
