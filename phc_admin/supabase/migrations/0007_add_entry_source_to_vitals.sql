-- Migration 0007: Add entry_source column to vitals table
-- Tracks how each vital record was entered: 'manual' | 'scan' | 'cloud_sync'

ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS entry_source text NOT NULL DEFAULT 'manual'
  CHECK (entry_source IN ('manual', 'scan', 'cloud_sync'));

-- Backfill existing cloud-synced records
UPDATE public.vitals SET entry_source = 'cloud_sync' WHERE entry_source = 'manual' AND cloud_id IS NOT NULL;

COMMENT ON COLUMN public.vitals.entry_source IS
  'How this record was created: manual=typed by ASHA, scan=OCR camera, cloud_sync=pulled from cloud';
