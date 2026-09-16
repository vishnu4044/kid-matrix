# Kid Matrix — Architecture

## System overview

```
                ┌──────────────────────────┐
                │        React (Vite)       │
                │  Parent UI  |  Kid Mode UI │
                └─────────────┬──────────────┘
                              │ HTTPS + JWT
                              ▼
                ┌──────────────────────────┐
                │         Flask API         │
                │  auth / children / practice│
                │  ai (OpenAIService)       │
                └───────┬───────────┬────────┘
                        │           │
                        ▼           ▼
                 ┌───────────┐ ┌───────────┐
                 │  SQLite   │ │ OpenAI API │
                 │ (source   │ │ (Phase 5)  │
                 │  of truth)│ └───────────┘
                 └───────────┘
                        │
                        ▼ (optional, Phase 7)
                 ┌───────────┐
                 │   FAISS   │
                 │ (curriculum
                 │  retrieval)│
                 └───────────┘
```

The OpenAI API key lives only in `backend/.env` and is read by `OpenAIService` on the Flask side.
The React app never sees it — it only calls Flask endpoints under `/api/ai/*`.

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth, child profiles, parent dashboard shell | Done |
| 2 | Practice creation (letters/numbers/math/shapes/mixed) | Done |
| 3 | Handwriting canvas, Kid Mode, session flow, results | Done |
| 4 | Progress tracking, history, charts | Done |
| 5 | OpenAI practice generator | Done |
| 6 | OpenAI AI Tutor | Done |
| 7 | FAISS / RAG for curriculum retrieval | Done |
| 8 | Advanced handwriting recognition | See `docs/handwriting-recognition.md` — the pluggable interface exists (OpenAI vision is the current real implementation); a custom-trained model is a documented future upgrade, not built in this pass |

Each phase ended with the app runnable end-to-end, verified via backend pytest and a live
browser walkthrough (including real OpenAI calls) at each step. Not built this pass: Parent
PIN gate on Kid Mode exit (Settings page is still a stub — see below), audio setting toggle,
offline caching, Docker images, and a dedicated e2e test runner (Playwright/Cypress) — the
core loop was verified manually via Chrome automation instead. Settings, analytics event
tracking, and a self-serve "Kid Home" practice picker (children currently only enter a
practice a parent already created) are the main remaining gaps versus the full spec.

## Parent vs. Kid Mode

Two route trees under the same SPA, gated by a client-side mode flag (`AuthContext.mode`):

- **Parent Mode** (`/`, `/children`, `/dashboard/:childId`, `/progress`, `/sessions`, `/ai-tutor`,
  `/settings`) — requires a valid JWT.
- **Kid Mode** (`/kid/:childId`, `/kid/:childId/practice/:sessionId`) — entered only via an
  explicit "Start for {child}" handoff action from Parent Mode. Returning to Parent Mode from Kid
  Mode will require a 4-digit Parent PIN (Phase 3+ — not enforced yet since Kid Mode doesn't
  exist this phase).

Kid Mode never renders parent account info, settings, or API/technical details — enforced by
routing children only into the `kid/*` route subtree, which has its own layout
(`layouts/KidLayout.tsx`) with no access to parent-only components.

## Frontend structure (section 38)

```
frontend/src/
  api/          # client.ts (fetch wrapper + JWT interceptor), endpoint modules
  components/   # Button, Card, Modal, ChildCard (generic, reusable)
  features/
    auth/       # LoginForm, RegisterForm, useAuth hook
    children/   # ChildCard grid, AddChildForm
    practice/   # (Phase 2+)
    handwriting/# (Phase 3+)
    progress/   # (Phase 4+)
    ai/         # (Phase 5+)
  hooks/
  layouts/      # ParentLayout, KidLayout
  pages/        # Splash, Login, Register, ParentHome, ChildDashboard, stubs for Progress/Sessions/AITutor/Settings
  services/
  types/
  utils/
  assets/
```

## Backend structure

```
backend/
  app/
    __init__.py       # app factory, extension init (db, jwt, cors)
    config.py          # env-driven config
    models/            # User, Child, PracticeSession, Question, Answer, Progress, AIInteraction
    schemas/            # marshmallow validation schemas
    blueprints/
      auth/            # register, login, logout
      children/        # CRUD + ownership checks
      practice/         # (Phase 2+, blueprint registered later)
      ai/                # (Phase 5+)
  tests/
  seed.py
  requirements.txt
  wsgi.py
```

## Security notes

- Passwords hashed with `werkzeug.security.generate_password_hash` (pbkdf2).
- JWT access tokens via `flask-jwt-extended`; identity = user id.
- Every `Child`/session/answer query is scoped by `parent_id`/`child.parent_id` — a parent can
  never read or mutate another parent's data (enforced in the blueprint layer, tested in Phase 1
  test suite for children CRUD).
- CORS restricted to the Vite dev origin (`http://localhost:5173`) via `flask-cors`.
- `OPENAI_API_KEY` only read server-side from `backend/.env` (gitignored); `.env.example` ships
  with it blank.
