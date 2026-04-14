# TaskFlow

A full-stack task management system built as a Turborepo monorepo. Users register, create projects, add tasks, assign team members, and track progress.

---

## 1. Overview

**What it is:** Full-stack task management with auth, projects, tasks, and team assignment.  
This submission targets a Frontend-role bar as well (polished React UX, route protection, persisted auth, optimistic updates), while still shipping the backend and infrastructure so reviewers can run the full product end-to-end.

## Frontend UX & State

- Persistent authentication using localStorage
- Protected routes with redirect handling
- Loading, error, and empty states across all views
- Optimistic UI updates for task interactions
- Responsive design (mobile + desktop)

**Monorepo structure:**

```
taskflow/
├── apps/
│   ├── api/          Node.js · Express · TypeScript · PostgreSQL
│   └── web/          React 18 · TypeScript · Vite · Tailwind CSS
└── packages/
    ├── types/         @taskflow/types — shared domain types (single source of truth)
    └── tsconfig/      @taskflow/tsconfig — shared TypeScript configs (base/node/react)
```

**Tech stack:**

| Layer | Choice |
|---|---|
| Monorepo | Turborepo 2 + npm workspaces |
| Backend | Node.js 20 · Express 4 · TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken) · bcryptjs (cost 12) |
| Logging | Winston (structured JSON in prod) |
| Frontend | React 18 · TypeScript · Vite 5 |
| Styling | Tailwind CSS v3 · Radix UI primitives |
| Fonts | DM Sans + DM Mono (Google Fonts) |
| Infrastructure | Docker Compose · multi-stage Dockerfiles · nginx |
| Tests | Jest + Supertest (19 integration tests) |

---

## 2. Architecture Decisions

### Turborepo

**Task pipeline with `dependsOn`.** `turbo build` always compiles `@taskflow/types` before `@taskflow/api` and `@taskflow/web` run in parallel. The dependency graph is declared in `turbo.json`, not implicit.

**Shared `@taskflow/types`.** Domain types (`User`, `Task`, `Project`, `JwtPayload`, mutation payloads) live in one package consumed by both apps. The API's `DbUser` extends the shared `User` to add `password` locally — the hash never leaks into the public type.

**Shared `@taskflow/tsconfig`.** Three configs: `base.json` (common strictness), `node.json` (extends base, adds `types: ["node"]`), `react.json` (extends base, switches to ESNext/bundler moduleResolution for Vite). Each app extends exactly one.

**Caching.** `turbo typecheck` and `turbo build` are fully cached — re-runs after no file changes complete in ~400ms. Only affected packages rebuild on changes.

**`app.ts` / `index.ts` split.** Express app config lives in `app.ts` (pure export). `index.ts` binds the port and handles SIGTERM. Tests import `app.ts` directly — no port conflicts between Jest workers.

### Docker

Both Dockerfiles use the **monorepo root as build context**. This lets them:
1. Install workspace deps via the root `package.json`
2. Build `@taskflow/types` before the app that depends on it
3. Copy only what's needed into the slim runtime stage

### Data

Raw SQL over an ORM — every query is explicit and reviewable. Custom migration runner in `apps/api/src/db/migrate.ts` tracks applied files in `schema_migrations` and runs automatically on container start.

### What was left out intentionally
- Pagination (backend supports `?page=&limit=`, UI fetches all)
- WebSocket real-time (stats re-fetch on mutation covers single-user flow)
- E2E tests (Playwright would be the obvious next addition)

---

## 3. Running Locally

**Prerequisites:** Docker + Docker Compose v2. Nothing else required.

```bash
git clone https://github.com/your-name/taskflow
cd taskflow
cp .env.example .env
docker compose up --build
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000/health

On first start the API container automatically: waits for Postgres → runs migrations → seeds test data → starts server.

**Local dev without Docker** (requires Node ≥ 20 + a running Postgres):

```bash
npm install                    # installs all workspace deps from root
cp .env.example .env           # set DATABASE_URL, JWT_SECRET
npx turbo build --filter=@taskflow/types   # build shared types first
npx turbo dev                  # starts api (port 4000) + web (port 3000) in parallel
```

---

## 4. Running Migrations

Migrations run **automatically on container start**. No manual steps.

To run manually during local dev:

```bash
cd apps/api
npm run db:migrate   # applies pending up migrations
npm run db:seed      # seeds test user + project + tasks
```

To roll back a migration:

```bash
# Apply the down SQL manually — e.g.:
psql $DATABASE_URL -f migrations/003_create_tasks.down.sql
```

---

## 5. Test Credentials

Seeded automatically on first container start:

```
Email:    test@example.com
Password: password123
```

---

## 6. API Reference

**Base URL:** `http://localhost:4000`  
All non-auth endpoints require: `Authorization: Bearer <token>`

### Auth
```
POST /auth/register   { name, email, password }         → 201 { token, user }
POST /auth/login      { email, password }               → 200 { token, user }
```

### Projects
```
GET    /projects                  → 200 { projects: [...] }
POST   /projects                  { name, description? } → 201 Project
GET    /projects/:id              → 200 Project + tasks[]
PATCH  /projects/:id              { name?, description? } → 200 Project
DELETE /projects/:id              → 204
GET    /projects/:id/stats        → 200 { by_status, by_assignee }
GET    /projects/:id/members      → 200 { members: [...] }
```

### Tasks
```
GET    /projects/:id/tasks        ?status= ?assignee=  → 200 { tasks: [...] }
POST   /projects/:id/tasks        { title, description?, status?, priority?, assignee_id?, due_date? } → 201 Task
PATCH  /tasks/:id                 { title?, status?, priority?, assignee_id?, due_date? } → 200 Task
DELETE /tasks/:id                 → 204
```

### Users
```
GET /users/search?q=<string>      → 200 { users: [...] }
```

### Error shape
```json
{ "error": "validation failed", "fields": { "email": "is required" } }
{ "error": "unauthorized" }
{ "error": "forbidden" }
{ "error": "not found" }
```

---

## 7. Turbo Pipeline Reference

```bash
npx turbo build        # types → api + web (parallel), output cached
npx turbo typecheck    # all packages in parallel, cached
npx turbo test         # api integration tests (requires DATABASE_URL)
npx turbo dev          # api + web dev servers in parallel (not cached)
npx turbo clean        # remove all dist/ and .turbo/ directories
npm run db:migrate     # run pending migrations (via workspace script)
npm run db:seed        # seed test data
```

Turbo respects the dependency graph — you never need to manually order builds.

---

## 8. What I'd Do With More Time

**Tests**
- Playwright E2E: login → create project → create task → change status
- Component tests with React Testing Library
- Edge cases: assignee not in project, malformed UUIDs, concurrent status updates

**Features**
- Cursor-based pagination on list endpoints (backend partially ready with `?page=&limit=`)
- Drag-and-drop task reordering with `@dnd-kit/core`
- Real-time task updates via SSE
- Task comments / activity log

**Production hardening**
- `helmet` security headers on the API
- Rate limiting on auth endpoints (`express-rate-limit`)
- Refresh tokens + short-lived access tokens (currently 24h)
- Remote Turbo cache (Vercel or self-hosted) for CI speed

**DX**
- ESLint + `@typescript-eslint` configured at root, shared rule set
- Prettier enforced via `turbo lint` → `prettier --check`
- GitHub Actions CI: `turbo typecheck` + `turbo build` + `turbo test` on every PR
- `docker compose watch` for live-reload without rebuilding images

**Shortcuts taken**
- `COALESCE`-based PATCH can't clear a field back to `null` (e.g. removing a due date requires explicit `null` handling)
- Seed runs on every container start (idempotent but slightly wasteful)
- No request correlation IDs in logs

---

## 9. Known Local Infra Issue + Verification

On this specific Windows machine, Docker Desktop was stuck in a loading loop due to local WSL/network setup instability (`dockerDesktopLinuxEngine` pipe/API errors and WSL distro install timeouts).  
To keep progress unblocked, I validated the assignment flows without Docker using the provided workspace scripts and a PostgreSQL connection string from `.env`.

**Commands used for verification**

```bash
npm install
npm run db:migrate
npm run db:seed
npx turbo build
npm run dev
```

**What was verified**
- Migrations applied successfully (`001`, `002`, `003`)
- Seed completed with test user/project/tasks
- Monorepo production build passes (`@taskflow/types`, `@taskflow/api`, `@taskflow/web`)
- Frontend core flows run end-to-end against the API (auth, projects, task CRUD, filtering, optimistic updates)

If Docker Desktop is healthy on the reviewer machine, `docker compose up --build` remains the intended one-command startup path from the repo root.
