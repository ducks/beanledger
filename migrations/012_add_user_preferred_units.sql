-- User-level preferred unit system for weight display and entry.
-- Storage remains canonical lbs; this only affects UI.
ALTER TABLE users
  ADD COLUMN preferred_units TEXT NOT NULL DEFAULT 'lbs'
    CHECK (preferred_units IN ('lbs', 'kg'));
