-- Migration 0007: Add entry_source column to vitals table
-- Tracks how each vital record was entered: 'manual' | 'scan' | 'cloud_sync'

ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS entry_source text NOT NULL DEFAULT 'manual'
  CHECK (entry_source IN ('manual', 'scan', 'cloud_sync'));
