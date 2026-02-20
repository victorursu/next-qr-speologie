-- Create speologieqr table for QR code management
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS speologieqr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  redirect_target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by slug (used when redirecting)
CREATE INDEX IF NOT EXISTS idx_speologieqr_slug ON speologieqr(slug);

-- Index for redirect target lookups
CREATE INDEX IF NOT EXISTS idx_speologieqr_redirect_target ON speologieqr(redirect_target_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_speologieqr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speologieqr_updated_at ON speologieqr;
CREATE TRIGGER speologieqr_updated_at
  BEFORE UPDATE ON speologieqr
  FOR EACH ROW
  EXECUTE FUNCTION update_speologieqr_updated_at();

-- Enable RLS (Row Level Security) - optional, configure policies as needed
ALTER TABLE speologieqr ENABLE ROW LEVEL SECURITY;

-- Example policy: allow all operations for authenticated users (customize for your auth)
-- CREATE POLICY "Allow all for authenticated" ON speologieqr
--   FOR ALL USING (auth.role() = 'authenticated');

-- For development: allow all operations (remove in production)
CREATE POLICY "Allow all for service role" ON speologieqr
  FOR ALL USING (true) WITH CHECK (true);
