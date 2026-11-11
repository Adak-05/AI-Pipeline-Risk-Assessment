-- ============================================================
-- AI Pipeline Risk Assessment – Verified Database Migration
-- Version: 2.1 (RLS fix + ALTER TABLE fallback for existing tables)
-- ============================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================
-- SAFE TO RUN MULTIPLE TIMES:
--   · ALTER TABLE … ADD COLUMN IF NOT EXISTS  → skips if column already exists
--   · CREATE TABLE IF NOT EXISTS              → skips if table already exists
--   · CREATE INDEX IF NOT EXISTS              → skips if index already exists
--   · DROP POLICY IF EXISTS / CREATE POLICY   → replaces policy safely
--   Will NOT delete, overwrite or modify any existing row data.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART 1: pipelines table – add missing columns
-- ════════════════════════════════════════════════════════════
-- The pipelines table already exists. ALTER TABLE is safe here.
-- All other columns (pipeline_id, location, material, …) are
-- assumed to exist from the original table creation.
-- ════════════════════════════════════════════════════════════

-- created_by: UUID → auth.users.id
-- pipelineService.js line 100-101: `payload.created_by = userId`
-- Only set when userId is a valid UUID string (length > 10)
ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- updated_at: written by UpdatePipelineRegistry.jsx line 92: `updated_at: now`
ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON public.pipelines(created_by);


-- ════════════════════════════════════════════════════════════
-- PART 2: work_orders table
-- ════════════════════════════════════════════════════════════
-- Column names verified line-by-line against:
--   workflowService.js  createWorkOrderInDb()      (INSERT)
--   workflowService.js  fetchWorkOrdersFromDb()    (SELECT mapper)
--   workflowService.js  updateWorkOrderStatusInDb() (UPDATE)
-- ════════════════════════════════════════════════════════════

-- ── 2a. Create table if it does not yet exist ───────────────
CREATE TABLE IF NOT EXISTS public.work_orders (
  id                 TEXT         PRIMARY KEY,          -- "WO-<timestamp>"
  pipeline_id        TEXT         NOT NULL,
  priority           TEXT         NOT NULL DEFAULT 'Medium'
                                  CHECK (priority IN ('High', 'Medium', 'Low')),
  status             TEXT         NOT NULL DEFAULT 'Pending'
                                  CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  recommended_action TEXT         NOT NULL,             -- NOT 'necessary_action'
  reason             TEXT         DEFAULT '',
  assigned_to        TEXT         DEFAULT '',           -- NOT 'assigned_engineer'
  due_date           DATE,
  notes              TEXT         DEFAULT '',
  status_reason      TEXT         DEFAULT '',
  created_by         TEXT         DEFAULT '',           -- TEXT name string, NOT UUID
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);

-- ── 2b. If work_orders already existed, patch any missing columns ──
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS priority           TEXT        NOT NULL DEFAULT 'Medium';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS status            TEXT        NOT NULL DEFAULT 'Pending';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS recommended_action TEXT;
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS reason            TEXT        DEFAULT '';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS assigned_to       TEXT        DEFAULT '';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS due_date          DATE;
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS notes             TEXT        DEFAULT '';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS status_reason     TEXT        DEFAULT '';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS created_by        TEXT        DEFAULT '';
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_work_orders_pipeline_id ON public.work_orders(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status      ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at  ON public.work_orders(created_at DESC);


-- ════════════════════════════════════════════════════════════
-- PART 3: inspections table
-- ════════════════════════════════════════════════════════════
-- Column names verified line-by-line against:
--   workflowService.js  createInspectionInDb()    (INSERT)
--   workflowService.js  fetchInspectionsFromDb()  (SELECT mapper)
-- ════════════════════════════════════════════════════════════

-- ── 3a. Create table if it does not yet exist ───────────────
CREATE TABLE IF NOT EXISTS public.inspections (
  id                  TEXT        PRIMARY KEY,          -- "INSP-<timestamp>"
  pipeline_id         TEXT        NOT NULL,
  work_order_id       TEXT        REFERENCES public.work_orders(id) ON DELETE SET NULL,
  inspection_date     DATE,
  condition_observed  TEXT,
  leakage_observed    BOOLEAN     DEFAULT FALSE,
  corrosion_observed  BOOLEAN     DEFAULT FALSE,
  notes               TEXT        DEFAULT '',
  recommended_action  TEXT        DEFAULT '',
  inspector_name      TEXT        DEFAULT '',
  inspector_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  photo_url           TEXT,
  status              TEXT        DEFAULT 'Scheduled',  -- not read by mapper; kept for completeness
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3b. If inspections already existed, patch any missing columns ──
-- Every column the frontend may INSERT or SELECT is listed here.
-- ADD COLUMN IF NOT EXISTS is a no-op when the column already exists.
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS work_order_id      TEXT;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspection_date    DATE;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS condition_observed TEXT;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS leakage_observed   BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS corrosion_observed BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS notes              TEXT        DEFAULT '';
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS recommended_action TEXT        DEFAULT '';
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspector_name     TEXT        DEFAULT '';
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspector_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS photo_url          TEXT;
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS status             TEXT        DEFAULT 'Scheduled';

-- Add the FK constraint on work_order_id only if the column was just added
-- (safe because DO $$ catches the error if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'inspections'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'work_order_id'
  ) THEN
    ALTER TABLE public.inspections
      ADD CONSTRAINT fk_inspections_work_order
        FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_inspections_pipeline_id ON public.inspections(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at  ON public.inspections(created_at DESC);


-- ════════════════════════════════════════════════════════════
-- PART 4: maintenance_records table
-- ════════════════════════════════════════════════════════════
-- Column names verified line-by-line against:
--   workflowService.js        logMaintenanceRecord()          (INSERT)
--   workflowService.js        fetchMaintenanceRecordsFromDb() (SELECT mapper)
--   UpdatePipelineRegistry.jsx line 116-125                   (direct INSERT)
-- ════════════════════════════════════════════════════════════

-- ── 4a. Create table if it does not yet exist ───────────────
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id               TEXT        PRIMARY KEY,             -- "LOG-<timestamp>-<rand>"
  pipeline_id      TEXT        NOT NULL,
  work_order_id    TEXT        REFERENCES public.work_orders(id) ON DELETE SET NULL,
  event_type       TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT        DEFAULT '',
  performed_by     TEXT        DEFAULT '',
  performed_by_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  source           TEXT        DEFAULT '',              -- used by UpdatePipelineRegistry.jsx
  metadata         JSONB       DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4b. If maintenance_records already existed, patch any missing columns ──
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS work_order_id   TEXT;
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS description     TEXT        DEFAULT '';
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS performed_by    TEXT        DEFAULT '';
-- performed_by_id: written by logMaintenanceRecord() line 255
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS performed_by_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
-- source: written by UpdatePipelineRegistry.jsx line 123
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS source          TEXT        DEFAULT '';
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS metadata        JSONB       DEFAULT '{}';

-- Add the FK constraint on work_order_id only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'maintenance_records'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'work_order_id'
  ) THEN
    ALTER TABLE public.maintenance_records
      ADD CONSTRAINT fk_maintenance_work_order
        FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_maintenance_pipeline_id ON public.maintenance_records(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_event_type  ON public.maintenance_records(event_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at  ON public.maintenance_records(created_at DESC);


-- ════════════════════════════════════════════════════════════
-- PART 5: Row Level Security (RLS)
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.pipelines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- ── pipelines ──────────────────────────────────────────────
DROP POLICY IF EXISTS "pipelines_select" ON public.pipelines;
CREATE POLICY "pipelines_select" ON public.pipelines
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pipelines_insert" ON public.pipelines;
CREATE POLICY "pipelines_insert" ON public.pipelines
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pipelines_update" ON public.pipelines;
CREATE POLICY "pipelines_update" ON public.pipelines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: restricted to synthetic demo rows only.
-- pipelineService.js clearSyntheticDemoData() always filters:
--   .eq('is_synthetic', true).eq('provenance', 'SYNTHETIC_DEMO')
-- This policy enforces the same filter at the database level so
-- no authenticated user can accidentally delete a real pipeline record,
-- even if the application-layer filter is bypassed.
DROP POLICY IF EXISTS "pipelines_delete" ON public.pipelines;
CREATE POLICY "pipelines_delete" ON public.pipelines
  FOR DELETE TO authenticated
  USING (is_synthetic = true AND provenance = 'SYNTHETIC_DEMO');

-- ── work_orders ────────────────────────────────────────────
DROP POLICY IF EXISTS "work_orders_select" ON public.work_orders;
CREATE POLICY "work_orders_select" ON public.work_orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "work_orders_insert" ON public.work_orders;
CREATE POLICY "work_orders_insert" ON public.work_orders
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "work_orders_update" ON public.work_orders;
CREATE POLICY "work_orders_update" ON public.work_orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- No DELETE policy for work_orders (app never deletes work orders)

-- ── inspections ────────────────────────────────────────────
DROP POLICY IF EXISTS "inspections_select" ON public.inspections;
CREATE POLICY "inspections_select" ON public.inspections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inspections_insert" ON public.inspections;
CREATE POLICY "inspections_insert" ON public.inspections
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inspections_update" ON public.inspections;
CREATE POLICY "inspections_update" ON public.inspections
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- No DELETE policy for inspections

-- ── maintenance_records ────────────────────────────────────
-- Immutable audit trail – SELECT and INSERT only; no UPDATE or DELETE
DROP POLICY IF EXISTS "maintenance_records_select" ON public.maintenance_records;
CREATE POLICY "maintenance_records_select" ON public.maintenance_records
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "maintenance_records_insert" ON public.maintenance_records;
CREATE POLICY "maintenance_records_insert" ON public.maintenance_records
  FOR INSERT TO authenticated WITH CHECK (true);

-- No UPDATE or DELETE policies for maintenance_records


-- ════════════════════════════════════════════════════════════
-- PART 6: Reload PostgREST schema cache
-- ════════════════════════════════════════════════════════════
-- Clears "Could not find the table/column in the schema cache"
-- errors immediately, without needing a Supabase restart.
NOTIFY pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ════════════════════════════════════════════════════════════
-- Run each block separately in a new SQL Editor query tab.

-- 1. pipelines – confirm created_by (UUID) and updated_at exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'pipelines'
-- ORDER BY ordinal_position;

-- 2. work_orders – confirm all columns including status_reason, completed_at:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'work_orders'
-- ORDER BY ordinal_position;

-- 3. inspections – confirm all columns including inspector_id, corrosion_observed:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'inspections'
-- ORDER BY ordinal_position;

-- 4. maintenance_records – confirm performed_by_id and source columns exist:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'maintenance_records'
-- ORDER BY ordinal_position;

-- 5. RLS policies – confirm all policies and their USING expressions:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
