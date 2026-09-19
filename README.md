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
python wsgi.py                  # runs on http://0.0.0.0:5050 (reachable at 127.0.0.1:5050
                                 # and, on the same WiFi, http://<your-LAN-IP>:5050)
```

**Port 5050, not 5000** — on macOS, AirPlay Receiver squats on `*:5000` (all interfaces, not
just localhost) and silently blocks or 403s anything trying to bind or connect there. The
frontend's default `VITE_API_BASE_URL` already points at `127.0.0.1:5050`.

To test from an iPad/phone on the same WiFi: find this machine's LAN IP
(`ipconfig getifaddr en0` on macOS), set `frontend/.env`'s `VITE_API_BASE_URL` to
`http://<that-IP>:5050/api`, add `http://<that-IP>:5173` to `backend/.env`'s `CORS_ORIGINS`,
and open `http://<that-IP>:5173` in the tablet's browser.

Demo login after seeding: `john@example.com` / `password123` (children: Emma, Noah).

### Run backend tests

```bash
cd backend
PYTHONPATH=. pytest -q
```

45 tests cover auth, child ownership/authorization, practice generation, answer submission +
evaluation (including a real handwriting heuristic fallback path and mocked vision-model
responses), progress aggregation, and AI endpoints (mocked, so they run without an API key or
network access).

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env            # defaults already point at http://127.0.0.1:5050/api
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

## Deploying (e.g. Railway)

This is a monorepo with two independently deployable pieces (`backend/`, `frontend/`), each
with its own `Dockerfile` and `railway.json`. On a platform like Railway that auto-detects
builds from the repo root, you need **two separate services**, each with its "Root Directory"
set explicitly — auto-detection from the bare repo root will fail (no single
`package.json`/`requirements.txt`/`Dockerfile` lives there).

1. **Backend service** — Root Directory: `backend`. Add a persistent volume (e.g. mounted at
   `/data`) and set: `SECRET_KEY`, `JWT_SECRET_KEY`, `OPENAI_API_KEY`,
   `DATABASE_URL=sqlite:////data/kid_matrix.db`, `UPLOAD_DIR=/data/uploads`,
   `CORS_ORIGINS=<frontend public URL>`. The Dockerfile binds to Railway's dynamic `$PORT`
   automatically. Generate a public domain for this service once it's deployed.
2. **Frontend service** — Root Directory: `frontend`. Set `VITE_API_BASE_URL` to the backend
   service's public URL + `/api` (e.g. `https://kid-matrix-backend.up.railway.app/api`) —
   this must be available as a **build arg**, not just a runtime env var, since Vite bakes
   `VITE_*` values into the static bundle at build time (see the `ARG`/`ENV` lines at the top
   of `frontend/Dockerfile`).
3. Once both are deployed, double-check `CORS_ORIGINS` on the backend actually matches the
   frontend's final public URL exactly (scheme + host, no trailing slash).

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
