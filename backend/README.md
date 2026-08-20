# OmniClause Backend

Express + TypeScript API for OmniClause.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values locally. Never commit `.env`.

| Variable       | Required | Description                                                        |
|----------------|----------|----------------------------------------------------------------------|
| `PORT`         | No       | Port the API listens on. Defaults to `5000` if unset.               |
| `DATABASE_URL` | Yes*     | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname`. Required for `GET /api/health` (and any future DB-backed route) to succeed -- the server itself still starts without it, but those routes will report a degraded/disconnected state. |

## Database Setup

The schema lives at `src/db/schema.sql`. It requires PostgreSQL with the
`pgvector` extension available on the server (Supabase provides this by
default; a self-hosted instance needs `pgvector` installed separately).

Apply it against your target database:

```bash
psql "$DATABASE_URL" -f src/db/schema.sql
```

Or, connecting with individual flags instead of a connection string:

```bash
psql -h <host> -p <port> -U <user> -d <database> -f src/db/schema.sql
```

The script is idempotent (`CREATE ... IF NOT EXISTS` / `CREATE EXTENSION IF NOT EXISTS`)
so re-running it against a database that already has the schema is safe.

### What it creates
- **Extensions**: `uuid-ossp`, `vector`
- **`users`** -- id, email, password hash, role (`admin` / `manager` / `operator`)
- **`documents`** -- content, metadata, `required_role` (RBAC gate), `embedding vector(1536)`
- **`agent_logs`** -- audit trail of AI agent interactions per session
- **HNSW index** on `documents.embedding` (`m=16, ef_construction=64`)
- **Row-Level Security** on `documents`, restricting `SELECT` to rows where
  `required_role = ''public''` or matches the caller''s JWT role claim

> Note: RLS only takes effect for non-superuser database roles, and the JWT
> claim it checks (`request.jwt.role`) is only populated once request-level
> auth middleware sets it -- that wiring is a separate, later sprint.

## Health Check

GET /api/health


Success (200):
```json
{ "status": "ok", "database": "connected", "timestamp": "2026-08-19T22:41:58.870Z" }
```

Degraded (500) -- returned when the database is unreachable, without crashing the server:
```json
{ "status": "degraded", "database": "disconnected", "error": "connect ECONNREFUSED 127.0.0.1:5432" }
```

## Local Development

```bash
npm install
npm run dev     # ts-node, for local iteration
npm run build    # compiles src/ -> dist/
npm start        # runs the compiled build
```
