# BookLeaf Author Support Portal — Frontend

React 18 + Vite + Tailwind CSS 3 (plain JavaScript, no TypeScript). One app, two role-based interfaces (author / admin).
Built **contract-first**: every backend call lives in `src/api/endpoints.js`, so once your backend matches the contract below, the UI works with no frontend changes.

## Run

```bash
npm install
cp .env.example .env      # optional
npm run dev               # http://localhost:5173  (proxies /api -> http://localhost:4000)
npm run build             # production build in dist/
```
For production, either serve `dist/` behind the same origin as the API (`/api`), or set `VITE_API_BASE=https://your-api.example.com/api` at build time and enable CORS on the backend.

## Structure

```
src/
  api/          client.js (fetch wrapper, token, ApiError, 401 handling) · endpoints.js (one fn per endpoint)
  context/      AuthContext.jsx (user, login, logout)
  hooks/        useApi.js (fetch + silent polling, pauses on hidden tab)
  lib/          constants.js (status/priority/category -> label, colour, icon) · format.js (₹, dates, overdue)
  components/
    ui/         Badge, Button, Card (+PageHeader, Field), StateViews (Spinner, Empty, Error, Async, InlineAlert)
    layout/     AppShell (sidebar, role-based nav, mobile menu)
    books/      BooksTable (full + compact)
    ticket/     Timeline, DraftEditor, InternalNotes, TicketControls
  pages/        Login · author/{Dashboard,MyBooks,NewTicket,MyTickets} · admin/{TicketQueue,TicketDetail}
```
Palette lives in `tailwind.config.js`; badge colour mapping lives only in `lib/constants.js`, so status colours are identical in both portals.

## API contract the backend must satisfy

All routes are under `/api/v1`, JSON, `Authorization: Bearer <jwt>` on everything except login.
Responses use the backend boilerplate envelope: success `{ isSuccess:true, status:'success', message, data }` (the client unwraps `data`); errors `{ isSuccess:false, message, errorCode, details? }` with `details` = `{ field: 'message' }` on 422. The backend in `bookleaf-backend.zip` implements this contract.
Field names are **camelCase**; timestamps are ISO-8601.

| Method & path | Who | Request | Response |
|---|---|---|---|
| `POST /auth/login` | public | `{email, password}` | `{token, user:{id,name,email,role}}` (`role`: `author`\|`admin`); 401 on bad credentials |
| `GET /auth/me` | any | – | `user` |
| `GET /books` | author (own books) | – | `Book[]` |
| `GET /tickets` | author (own) / admin (all) | query: `status, category, priority, assignee (me\|unassigned), from, to (YYYY-MM-DD), sort=urgency, page, pageSize, include=messages` | `{items: Ticket[], total, page, pageSize}` |
| `POST /tickets` | author | `{bookId: string\|null, subject, description}` | `Ticket` (201). Backend runs AI classification + priority **asynchronously or with fallback**; ticket is created even if AI fails |
| `GET /tickets/:id` | author (own) / admin | – | `Ticket` with `messages`, and (admin only) `notes`, `aiDraft` |
| `PATCH /tickets/:id` | admin | any of `{status, category, priority, assigneeId}` | `Ticket`. Setting category/priority must set `categorySource`/`prioritySource` = `"admin"` |
| `POST /tickets/:id/messages` | admin | `{body}` | `Message` (201) |
| `POST /tickets/:id/notes` | admin | `{body}` | `Note` (201) |
| `POST /tickets/:id/draft` | admin | – | `{draft: string}`; **503** (or 429/502) when the AI is down |

```jsonc
// Book (null for fields that don't exist yet, e.g. books in production)
{ "bookId":"BK001","title":"…","isbn":"…","genre":"…","publicationDate":null,"status":"Published & Live",
  "mrp":399,"totalCopiesSold":342,"totalRoyaltyEarned":11970,"royaltyPaid":8400,"royaltyPending":3570 }
// Ticket
{ "id":"…","subject":"…","description":"…","status":"open|in_progress|resolved|closed",
  "category":"Royalty & Payments","categorySource":"ai|admin|default",
  "priority":"critical|high|medium|low","prioritySource":"ai|admin|default",
  "book":{"bookId":"BK001","title":"…"} /* or null */, "author":{"id":"…","name":"…","email":"…"},
  "assignee":{"id":"…","name":"…"} /* or null */, "createdAt":"…","updatedAt":"…",
  "messages":[{"id":"…","sender":"author|admin","senderName":"…","body":"…","createdAt":"…"}],
  "notes":[{"id":"…","body":"…","adminName":"…","createdAt":"…"}], "aiDraft":"optional string" }
```
Backend must enforce RBAC itself (authors → own data only); the frontend route guards are UX only.

## Assumptions

1. **Real-time = polling.** Author ticket list every 5 s, admin ticket detail every 5 s, admin queue every 10 s; paused while the tab is hidden. Swapping to SSE/WebSocket only touches `hooks/useApi.js`.
2. **Category/priority values** are the exact strings/keys above (category = the six names from the brief).
3. **Overdue** = open or in-progress and older than 48 h (`OVERDUE_HOURS` in `lib/constants.js`). Critical tickets get a red left border; overdue rows get a faint red tint plus an "Overdue" label.
4. **Queue ordering** is done by the backend via `sort=urgency` (priority, then oldest first). The UI does not re-sort.
5. **AI draft is on demand** (Generate / Regenerate) to avoid paying for a call on every ticket open. If the backend stores a draft in `aiDraft`, it is pre-filled once on open. The draft is local state, so polling never overwrites what the admin is typing.
6. **AI failure** (status 0/429/502/503 from `/draft`) shows a non-blocking amber notice; the editor stays usable for manual replies.
7. **Sending a reply does not change ticket status**; the admin sets the status explicitly (backend may auto-move `open` → `in_progress`, UI will reflect it on next poll).
8. **Authors cannot reply** to a ticket in this version (brief only requires viewing admin responses). The timeline supports `sender: "author"` messages if you add it later.
9. **File attachments are UI-only.** Files are selected and listed but not uploaded (brief: bonus).
10. **Books "in production"** (no ISBN/MRP/sales) show `—` and a small "not on sale yet" hint; "Published books" counts only status `Published & Live`.
11. **Currency** is ₹ with Indian digit grouping. Token is kept in `localStorage` (fine for this assignment; use httpOnly cookies in production).
12. **Admin assignment** is "assign to me / unassign" only (no picking other admins), via `assigneeId`.
13. **Single admin queue page size** is 15. Ticket search by text is not included.

## Palette & rules applied
Exact hex values from the brief in `tailwind.config.js`. Teal only for primary actions; red only for critical/overdue and form errors; amber for in-progress/medium and internal notes; every badge pairs colour + icon + text. Inter font, 40 px controls, 12 px card radius, 4 px spacing scale.

## Known gaps
No automated tests, no text search, no file upload, no author replies, no toast system (inline alerts used instead).

## Mock mode (run without a backend)
Set `VITE_USE_MOCK=true` in `.env` and restart `npm run dev`. All calls are answered by `src/mock/handler.js` using the provided BookLeaf dataset.
- Authors: any email in the JSON (e.g. `ananya.reddy@email.com`) / `password123`. Admin: `admin@bookleaf.com` / `admin123`.
- Login is per browser tab in mock mode, so you can be author in one tab and admin in another and watch polling update.
- Console helpers: `resetMock()` restores seed tickets; `mockAiDown()` makes draft generation fail (`mockAiDown(false)` to restore).
- To go live: set `VITE_USE_MOCK=false` (or delete the line) and restart. Nothing else changes. Once the backend is stable, delete `src/mock/` and the two mock lines in `src/api/client.js`.
