CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('author', 'admin')),
    phone         TEXT,
    city          TEXT,
    joined_date   DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS books (
    book_id                  TEXT PRIMARY KEY,
    author_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                    TEXT NOT NULL,
    isbn                     TEXT,
    genre                    TEXT,
    publication_date         DATE,
    status                   TEXT NOT NULL,
    mrp                      NUMERIC(10,2),
    author_royalty_per_copy  NUMERIC(10,2),
    total_copies_sold        INTEGER NOT NULL DEFAULT 0,
    total_royalty_earned     NUMERIC(12,2) NOT NULL DEFAULT 0,
    royalty_paid             NUMERIC(12,2) NOT NULL DEFAULT 0,
    royalty_pending          NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_royalty_payout_date DATE,
    print_partner            TEXT,
    available_on             TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS books_author_idx ON books (author_id);

CREATE TABLE IF NOT EXISTS tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       TEXT NOT NULL REFERENCES users(id),
    book_id         TEXT REFERENCES books(book_id),          -- NULL = General / Account level
    subject         TEXT NOT NULL,
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    category        TEXT NOT NULL DEFAULT 'General Inquiry' CHECK (category IN (
                      'Royalty & Payments','ISBN & Metadata Issues','Printing & Quality',
                      'Distribution & Availability','Book Status & Production Updates','General Inquiry')),
    category_source TEXT NOT NULL DEFAULT 'default' CHECK (category_source IN ('ai','admin','default')),
    priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
    priority_source TEXT NOT NULL DEFAULT 'default' CHECK (priority_source IN ('ai','admin','default')),
    assignee_id     TEXT REFERENCES users(id),
    ai_draft        TEXT,                                     -- cached AI draft; cleared once a reply is sent
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tickets_author_idx ON tickets (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_queue_idx  ON tickets (status, priority, created_at);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('author','admin')),
    sender_id   TEXT NOT NULL REFERENCES users(id),
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON ticket_messages (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_notes (            -- internal, never returned to authors
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    admin_id   TEXT NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ticket_notes_ticket_idx ON ticket_notes (ticket_id, created_at);
