-- Enforce at most one QR record per cave (data integrity + clear duplicate errors)

CREATE UNIQUE INDEX IF NOT EXISTS uniq_speologieqr_caves_id
  ON speologieqr (caves_id);
