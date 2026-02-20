-- speologiepesteri already exists with id INTEGER

-- Enable unaccent for diacritic-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Function to search caves by title (diacritics ignored)
CREATE OR REPLACE FUNCTION search_caves(query_text TEXT)
RETURNS TABLE (id INTEGER, title TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.id, sp.title
  FROM speologiepesteri sp
  WHERE unaccent(sp.title) ILIKE '%' || unaccent(query_text) || '%'
  ORDER BY sp.title
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Rename redirect_target_id to caves_id in speologieqr
ALTER TABLE speologieqr RENAME COLUMN redirect_target_id TO caves_id;

-- Convert caves_id to INTEGER for FK (speologiepesteri.id is INTEGER)
ALTER TABLE speologieqr ALTER COLUMN caves_id TYPE INTEGER USING caves_id::integer;

-- Update index
DROP INDEX IF EXISTS idx_speologieqr_redirect_target;
CREATE INDEX IF NOT EXISTS idx_speologieqr_caves_id ON speologieqr(caves_id);

-- Foreign key for join support
ALTER TABLE speologieqr
  ADD CONSTRAINT fk_speologieqr_caves
  FOREIGN KEY (caves_id) REFERENCES speologiepesteri(id);

-- RLS for speologiepesteri
ALTER TABLE speologiepesteri ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all speologiepesteri" ON speologiepesteri
  FOR ALL USING (true) WITH CHECK (true);
