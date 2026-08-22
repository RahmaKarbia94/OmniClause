# OmniClause Backend

Express + TypeScript API for OmniClause.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values locally. Never commit `.env`.

| Variable       | Required | Description                                                        |
|----------------|----------|----------------------------------------------------------------------|
| `PORT`         | No       | Port the API listens on. Defaults to `5000` if unset.               |
| `DATABASE_URL` | Yes*     | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname`. Required for `GET /api/health` (and any future DB-backed route) to succeed -- the server itself still starts without it, but those routes will report a degraded/disconnected state. |
| `JWT_SECRET`   | Yes      | Random secret used to sign/verify JWTs. Required for `/api/auth/*` routes. |

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

## Document Upload

POST /api/documents/upload
Authorization: Bearer <jwt>
Content-Type: multipart/form-data


Requires `multipart/form-data`, not JSON -- the file itself can''t be
represented as JSON, so this route (unlike every other route in this
API) reads a form body via `multer`, not `express.json()`.

Form fields:
- `file` -- the binary file. PDF or plain text only, 10MB max. Processed
  entirely in memory; never written to disk.
- `required_role` -- one of `admin`, `manager`, `operator`, `public`.
  Gates who can retrieve this document later (enforced by the RLS
  policy on `documents`, once retrieval routes exist).

Requires an `admin` or `manager` role (via `requireRole`).

Success (201):
```json
{
  "status": "success",
  "data": {
    "document_id": "uuid-string",
    "filename": "contract_fr.pdf",
    "required_role": "manager",
    "chunks_extracted": 12,
    "created_at": "2026-08-20T22:28:03.348Z"
  }
}
```

Error cases: `400` (no file / missing or invalid `required_role`),
`401` (missing/invalid token), `403` (role not `admin`/`manager`),
`413` (file over 10MB), `415` (not PDF/TXT), `500` (extraction or DB
failure).

Example:
```bash
curl -i -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@contract.pdf" \
  -F "required_role=manager"
```

> Text is stored raw and chunked (see `src/utils/textProcessor.ts`) but
> no embeddings are generated yet -- `documents.embedding` stays `NULL`
> until the AI embedding sprint.

## Authentication

POST /api/auth/register
Content-Type: application/json
{ "email": "...", "password": "...", "role": "admin" | "manager" | "operator" }

Returns `201` with the created user (no password) on success, `400` for
missing/invalid fields, `409` if the email is already registered.

> Self-registration with a caller-chosen role is a deliberate simplification
> for early development. Before any real deployment this needs to become
> admin-only user creation, or default to the lowest-privilege role.

POST /api/auth/login
Content-Type: application/json
{ "email": "...", "password": "..." }

Returns `200` with `{ "data": { "token": "<jwt>" } }` on success, `401` for
invalid credentials. The token is valid for 24h and carries `user_id`,
`email`, and `role` -- send it as `Authorization: Bearer <token>` on
protected routes.

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
