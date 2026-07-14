-- Migration 003: apagar e recriar a tabela `links` (DESTRUÍRÁ DADOS)
-- Faça backup antes de rodar: pg_dump "$DATABASE_URL" > backup_pre_recreate.sql

BEGIN;

-- Extensão e tipo
CREATE EXTENSION IF NOT EXISTS citext;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'link_category') THEN
    CREATE TYPE link_category AS ENUM ('geral','marketing','social');
  END IF;
END$$;

-- Apaga tabela antiga (perda de dados)
DROP TABLE IF EXISTS links CASCADE;

-- Cria a tabela nova
CREATE TABLE links (
  id         SERIAL PRIMARY KEY,
  slug       citext NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  category   link_category NOT NULL DEFAULT 'geral',
  clicks     BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT links_slug_nonempty CHECK (trim(slug) <> ''),
  CONSTRAINT links_slug_maxlen CHECK (char_length(slug) <= 64),
  CONSTRAINT links_slug_format CHECK (slug ~ '^[A-Za-z0-9_-]+$'),
  CONSTRAINT links_target_url_valid CHECK (target_url ~* '^https?://')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);

-- Função e trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_links_updated_at
BEFORE UPDATE ON links
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Observação: este arquivo apaga a tabela `links`. Certifique-se do backup antes de executar.
