CREATE TABLE IF NOT EXISTS links (
    id         SERIAL PRIMARY KEY,
    slug       TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    clicks     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
