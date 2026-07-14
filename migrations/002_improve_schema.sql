-- Migration 002: aplicar melhorias de schema de forma idempotente
BEGIN;

-- 1) Extensão citext
CREATE EXTENSION IF NOT EXISTS citext;

-- 2) Tipo ENUM para category (cria apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'link_category') THEN
    CREATE TYPE link_category AS ENUM ('geral', 'marketing', 'social');
  END IF;
END$$;

-- 3) Converter `slug` para citext (case-insensitive) quando necessário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='links' AND column_name='slug') THEN
    IF (SELECT udt_name FROM information_schema.columns WHERE table_name='links' AND column_name='slug') <> 'citext' THEN
      ALTER TABLE links ALTER COLUMN slug TYPE citext USING slug::citext;
    END IF;
  END IF;
END$$;

-- 4) Normalizar/alterar `category` para ENUM `link_category`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='links' AND column_name='category') THEN
    -- remover default temporariamente (impede erro ao alterar o tipo)
    IF (SELECT column_default FROM information_schema.columns WHERE table_name='links' AND column_name='category') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE links ALTER COLUMN category DROP DEFAULT';
    END IF;

    -- normalizar valores inválidos para um valor seguro
    UPDATE links SET category = 'geral' WHERE category IS NULL OR category NOT IN ('geral','marketing','social');

    -- converter apenas se ainda não for do tipo ENUM
    IF (SELECT udt_name FROM information_schema.columns WHERE table_name='links' AND column_name='category') <> 'link_category' THEN
      ALTER TABLE links ALTER COLUMN category TYPE link_category USING category::link_category;
    END IF;

    -- restaurar default para o novo tipo
    ALTER TABLE links ALTER COLUMN category SET DEFAULT 'geral';
  END IF;
END$$;

-- 5) Garantir `clicks` como BIGINT
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='links' AND column_name='clicks') THEN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name='links' AND column_name='clicks') <> 'bigint' THEN
      ALTER TABLE links ALTER COLUMN clicks TYPE bigint USING clicks::bigint;
    END IF;
  END IF;
END$$;

-- 6) Adicionar `updated_at` se não existir
ALTER TABLE links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7) Adicionar constraints úteis (somente se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_slug_nonempty') THEN
    ALTER TABLE links ADD CONSTRAINT links_slug_nonempty CHECK (trim(slug) <> '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_slug_maxlen') THEN
    ALTER TABLE links ADD CONSTRAINT links_slug_maxlen CHECK (char_length(slug) <= 64);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_slug_format') THEN
    ALTER TABLE links ADD CONSTRAINT links_slug_format CHECK (slug ~ '^[A-Za-z0-9_-]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_target_url_valid') THEN
    ALTER TABLE links ADD CONSTRAINT links_target_url_valid CHECK (target_url ~* '^https?://');
  END IF;
END$$;

-- 8) Função e trigger para manter updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='links') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE c.relname = 'links' AND t.tgname = 'trg_links_updated_at'
    ) THEN
      CREATE TRIGGER trg_links_updated_at
      BEFORE UPDATE ON links
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    END IF;
  END IF;
END$$;

-- 9) Índices recomendados
CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);

COMMIT;

-- Observação: validação completa de URLs e prevenção de open-redirects devem ser feitas na camada da aplicação.
