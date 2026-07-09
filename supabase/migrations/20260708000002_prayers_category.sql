-- Phase 1.2 — Prayer categories (design: family/health/work/guidance/thanks/other).
-- Existing rows backfill to 'other' via the default.

ALTER TABLE public.prayers ADD COLUMN category TEXT NOT NULL DEFAULT 'other'
  CHECK (category IN ('family', 'health', 'work', 'guidance', 'thanks', 'other'));
