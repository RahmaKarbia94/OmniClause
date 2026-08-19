# OmniClause — AI Enterprise Contract Orchestrator

A B2B micro-SaaS platform that ingests complex legal documents, uses autonomous
AI agents to evaluate clauses against compliance regulations, and visualizes
contract risk — secured by strict Role-Based Access Control (RBAC).

## Status

🚧 Early development. This sprint establishes the monorepo scaffold only —
no business logic, API routes, database connections, or AI integrations yet.

## Tech Stack

| Layer      | Technology                                     |
|------------|--------------------------------------------------|
| Frontend   | Next.js (TypeScript, App Router, Tailwind CSS)   |
| Backend    | Node.js + Express (TypeScript)                   |
| Database   | PostgreSQL + pgvector (introduced in a later sprint) |
| AI / ML    | Introduced in a later sprint                     |

## Project Structure

```
OmniClause/
├── frontend/   # Next.js application (port 3000)
├── backend/    # Express API (port 5000)
├── .gitignore
└── README.md
```

`frontend` and `backend` are two independent Node.js projects — not an npm
workspace. This keeps the scaffold simple; each app manages its own
dependencies and can be deployed separately.

## Prerequisites

- Node.js >= 20
- npm >= 10

## Getting Started

### 1. Backend (API) — runs on port 5000

```bash
cd backend
npm install
cp .env.example .env   # optional at this stage, no env vars are read yet
npm run dev
```

Expected output: `Server running on port 5000`

> Note: `.env` loading (via `dotenv`) is not wired up yet — it will be added
> once the backend actually needs configuration (e.g. database credentials).
> `.env.example` documents the intended variable ahead of that.

### 2. Frontend — runs on port 3000

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` — you should see the default Next.js starter
page (no custom UI has been built yet).

### Production build check

```bash
cd frontend && npm run build   # must succeed
cd ../backend && npm run build # compiles src/ to dist/
```

## License

Proprietary — all rights reserved.
