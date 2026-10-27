# BookLeaf Author Support Portal — Backend

Node.js 20+ · Express 5 · PostgreSQL (raw SQL via `pg`) · JWT auth · zod validation · Anthropic Claude for AI. Built on your boilerplate's structure (`AppError`, `AsyncWrapper`, `Response_handler`, `BaseController`, winston logger).

## Run locally
```bash
docker compose up -d                 # PostgreSQL (or use your own; see .env.example)
cp .env.example .env                 # set JWT_SECRET and (optionally) ANTHROPIC_API_KEY
npm install
npm run dev                          # AUTO_SETUP=true creates tables and seeds an empty DB
# or manually:  npm run db:migrate && npm run db:seed
npm test                             # needs a DEDICATED test DB: DB_NAME=bookleaf_test npm test (tables are reset)
```
Health check: `GET /api/v1/health`. Without `ANTHROPIC_API_KEY` everything works except AI drafts (tickets are rule-classified; admins reply manually).

**Seeded logins** (README for the reviewers): admins `admin@bookleaf.com` / `ops@bookleaf.com` → `admin123`; any author email from the dataset (e.g. `priya.sharma@email.com`) → `password123`. 10 authors, 18 books, 7 demo tickets.

## Structure
```
index.js                      boot: DB connect -> (AUTO_SETUP migrate+seed) -> listen, graceful shutdown
src/app.js                    middleware stack, routes, 404, global error handler
src/config/                   index.js (validated env config) · db.js (pool, withTransaction)
src/routes/                   auth / book / ticket routers (+ /health)       -> HTTP wiring, auth, validation, rate limits
src/controller/               thin: call a service, return { data, statusCode }  (AsyncWrapper sends the envelope)
src/services/                 AuthService · BookService · TicketService · TicketAiService  -> business rules
src/services/ai/              provider (Anthropic client) · prompts · knowledgeBase · AiService · fallbackClassifier
src/repositories/             ALL SQL lives here
src/middleware/               auth (authenticate/authorize) · validate (zod) · request-logger
src/validators/schemas.js     request schemas       src/utils/  AppError, Response_handler, serializers, payout, ...
src/db/                       schema.sql · migrate.js · seed.js · data/bookleaf_sample_data.json
tests/api.test.js             18 integration tests (real Postgres + fake Anthropic server)
```
Flow: `route -> authenticate/authorize -> validate -> controller -> service -> repository -> SQL`.

## API (base `/api/v1`, JSON, `Authorization: Bearer <jwt>` except login/health)
Success: `{ isSuccess:true, status, message, data }` · Error: `{ isSuccess:false, status, message, errorCode, details? }` (`details` = `{field: message}` on 422).

| Method & path | Role | Notes |
|---|---|---|
| `GET /health` | public | db + AI status |
| `POST /auth/login` | public | `{email,password}` → `{token,user}`; 30 attempts / 15 min / IP |
| `GET /auth/me` | any | current user |
| `GET /books` | author (own) / admin (all) | royalty fields; in-production books have `null` mrp/pubDate |
| `GET /tickets` | author (own) / admin (all) | query: `status, category, priority, assignee(me\|unassigned\|id), from, to, sort(urgency\|newest), page, pageSize(≤100), include=messages` → `{items,total,page,pageSize}` |
| `POST /tickets` | author | `{bookId\|null, subject(3-120), description(10-5000)}` → 201; AI runs in background |
| `GET /tickets/:id` | author (own) / admin | author never sees `notes`/`aiDraft`; others' tickets → 404 |
| `PATCH /tickets/:id` | admin | any of `status, category, priority, assigneeId` (category/priority set ⇒ source `admin`) |
| `POST /tickets/:id/messages` | admin | reply visible to author; `open` → `in_progress`; clears cached draft |
| `POST /tickets/:id/notes` | admin | internal only |
| `POST /tickets/:id/draft` | admin | `{draft}`; **503 `AI_UNAVAILABLE`** if AI is down; 20/min/admin |

Status codes: 400 bad JSON · 401 missing/invalid/expired token · 403 wrong role · 404 · 409 · 422 validation · 429 · 503 AI down. Unexpected errors are logged and returned as a generic 500 (no stack in production).

## Database
`users` (role author|admin) · `books` · `tickets` (status/category/priority CHECK constraints, `*_source` = `ai|admin|default`, nullable `book_id` = General, cached `ai_draft`) · `ticket_messages` · `ticket_notes` (separate table, so private notes can't leak through the author query path). Indexes on `(author_id, created_at)`, `(status, priority, created_at)`. List endpoints load messages with one `ANY($1)` query (no N+1).

## AI integration
**Model:** Claude Haiku (`AI_MODEL`, default `claude-haiku-5-5`; change it if your account uses another id). Cheap, fast, strong at short structured classification and tone-following; classification needs ~60 output tokens, drafts ≤450. The provider is one file, so swapping vendors is local.

**Flow:** ticket created (201 returned immediately) → background job: classify (category + priority) → store with source `ai` → pre-generate draft so it's ready when an admin opens the ticket. Admin overrides set source `admin`, and a late AI result can never overwrite them (SQL guard, tested). `POST /draft` regenerates on demand.

**Prompt strategy:** system prompt = role, hard rules (use only supplied facts, never invent numbers/dates, tone rules, own BookLeaf's mistakes, one clear next step, <180 words, fixed sign-off). User prompt = XML-tagged blocks: `<knowledge_base>`, `<payout_dates>`, `<author_data>`, `<ticket>`, optional `<conversation>`. The KB's per-category "How to respond" guidance mirrors the sample query→response table. Payout dates (quarter end + 45 days) are **computed in code** and given as facts, so the model does no date arithmetic. Ticket/conversation text is declared untrusted data (prompt-injection guard). Classification uses a rubric (critical = money overdue / live data errors; high = ISBN, print defects, unavailable; medium = questions; low = general) at temperature 0 and is validated against the enum list.

**Cost control:** only `CORE` + the ONE KB section for the ticket's category (not the whole KB); only the ticket's book (or a compact account summary for General tickets); last 3 messages, each clipped; subject/description clipped; small `max_tokens`; one pre-generated draft cached in the ticket row; per-admin rate limit on `/draft`. Typical draft call ≈ 1–1.3k input / ≈250 output tokens.

**Failure handling:** 15 s timeout, one retry with backoff on 429/5xx/network, circuit breaker (3 failures ⇒ AI skipped for 60 s, so a dead provider doesn't add latency). Classification failure ⇒ rule-based fallback (`source: default`, shown as such in the UI). Draft failure ⇒ 503 `AI_UNAVAILABLE`; the UI keeps the manual editor. Tickets are never blocked by AI. The API key is read from env only, used server-side, and never returned (tested).

## Security
JWT (8 h) with bcrypt-hashed passwords and timing-safe unknown-user path; RBAC middleware + SQL scoping by `author_id`; zod on every input (unknown query keys stripped, array pollution rejected); helmet, hpp, CORS allow-list (`CORS_ORIGIN`), body size limit, rate limits (global 300/min, login, AI).

## Boilerplate issues found and fixed
1. `AsyncWrapper` required `../utils/app-error` (file is `AppError.js`) → crash on Linux.
2. `AppError.js`: used undefined `Response` (circular import), `gEnv(NODE_ENV)` (undefined identifier), typo `req.orginalUrl` → removed the broken `handle()`; central handler is `Response.sendError`.
3. `Response.sendError` had 3 params, so Express never treated it as an error handler → now 4.
4. `app.use('/*\\w', …)` throws at startup on Express 5 (path-to-regexp v8) → plain middleware.
5. `xss-clean` assigns `req.query`, which returns **500 on every request** under Express 5 (verified) → removed; input is zod-validated and the UI escapes output.
6. `.env` (with DB password) was committed → now git-ignored; `.env.example` added. `start` script ran `nodemon` → `start` = node, `dev` = nodemon. Salon leftovers (`SalonApp`, `slon` route, logger name) removed. `trust proxy` set for rate limiting behind a proxy.

## Assumptions & limitations
- Ticket ids are UUIDs; user ids are the dataset ids (`AUTH001`, `ADM001`).
- A reply moves `open` → `in_progress`; resolving/closing is an explicit admin action.
- Background AI work runs in-process (no queue); a crash between create and classification leaves the ticket with defaults (`source: default`) and admins can still override. Production: BullMQ/pg-boss + retries.
- Authors cannot reply to tickets, attachments aren't stored, no email notifications, tokens aren't revocable (short expiry instead), polling instead of SSE (the API is polling-friendly: `updatedAt` on every ticket).
- Prompt caching isn't used (system+KB is below the minimum cacheable size); worth enabling if the KB grows.

## Deploy (Render/Railway)
Managed Postgres → set `DB_*` (`DB_SSL=true` if required), `JWT_SECRET`, `ANTHROPIC_API_KEY`, `CORS_ORIGIN=<frontend url>`, `AUTO_SETUP=true`; start command `npm start`. Frontend: build with `VITE_API_BASE=https://<api-host>/api/v1`.
