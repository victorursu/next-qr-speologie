-- Maps for QR codes (multiple per QR)
CREATE TABLE IF NOT EXISTS speologieqrmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID NOT NULL REFERENCES speologieqr(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL,
  filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speologieqrmap_qr_id ON speologieqrmap(qr_id);

-- Pushpins on maps
CREATE TABLE IF NOT EXISTS speologieqrmappushpin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES speologieqrmap(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL UNIQUE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  html TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speologieqrmappushpin_map_id ON speologieqrmappushpin(map_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_speologieqrmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speologieqrmap_updated_at ON speologieqrmap;
CREATE TRIGGER speologieqrmap_updated_at
  BEFORE UPDATE ON speologieqrmap
  FOR EACH ROW
  EXECUTE FUNCTION update_speologieqrmap_updated_at();

CREATE OR REPLACE FUNCTION update_speologieqrmappushpin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speologieqrmappushpin_updated_at ON speologieqrmappushpin;
CREATE TRIGGER speologieqrmappushpin_updated_at
  BEFORE UPDATE ON speologieqrmappushpin
  FOR EACH ROW
  EXECUTE FUNCTION update_speologieqrmappushpin_updated_at();

-- RLS
ALTER TABLE speologieqrmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE speologieqrmappushpin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all speologieqrmap" ON speologieqrmap
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all speologieqrmappushpin" ON speologieqrmappushpin
  FOR ALL USING (true) WITH CHECK (true);
