-- ============================================================================
-- Municipal Pipeline Risk Assessment System
-- Migration 003: Phase 3 Provenance, Freshness, and Sync Logging Schema
-- Safe, idempotent migration for PostgreSQL / Supabase
-- ============================================================================

-- 1. Add Provenance & Freshness Columns to pipelines Table
alter table public.pipelines add column if not exists provenance text default 'ENGINEER_SUBMITTED'
    check (provenance in ('OFFICIAL_SOURCE', 'ENGINEER_SUBMITTED', 'SYNTHETIC_DEMO', 'UNVERIFIED'));

alter table public.pipelines add column if not exists source_type text default 'manual_entry';
alter table public.pipelines add column if not exists source_record_id text;
alter table public.pipelines add column if not exists retrieved_at timestamptz default now();
alter table public.pipelines add column if not exists last_sync_at timestamptz;
alter table public.pipelines add column if not exists is_synthetic boolean default false;
alter table public.pipelines add column if not exists data_freshness_label text default 'Current';

-- 2. Create sync_logs Table for Auditing All GIS Synchronization Events
create table if not exists public.sync_logs (
    id                  text primary key,
    source_name         text not null,
    source_organization text not null,
    endpoint_url        text not null,
    sync_status         text not null check (sync_status in ('SUCCESS', 'PARTIAL', 'FAILED', 'TIMEOUT')),
    records_fetched     integer default 0,
    records_imported    integer default 0,
    records_updated     integer default 0,
    records_skipped     integer default 0,
    error_message       text,
    warning_message     text,
    triggered_by        text not null default 'Authorized Municipal Engineer',
    triggered_by_id     uuid references auth.users(id) on delete set null,
    started_at          timestamptz default now(),
    completed_at        timestamptz default now()
);

-- 3. Indexes for Provenance & Sync Logs
create index if not exists idx_pipelines_provenance on public.pipelines(provenance);
create index if not exists idx_pipelines_synthetic on public.pipelines(is_synthetic);
create index if not exists idx_sync_logs_source on public.sync_logs(source_name);
create index if not exists idx_sync_logs_status on public.sync_logs(sync_status);
create index if not exists idx_sync_logs_completed on public.sync_logs(completed_at desc);

-- 4. Enable Row Level Security (RLS) on sync_logs
alter table public.sync_logs enable row level security;

drop policy if exists "Authenticated users can view sync logs" on public.sync_logs;
create policy "Authenticated users can view sync logs"
    on public.sync_logs for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can insert sync logs" on public.sync_logs;
create policy "Authenticated users can insert sync logs"
    on public.sync_logs for insert
    to authenticated
    with check (true);

-- sync_logs are immutable audit records
drop policy if exists "No updates to sync logs" on public.sync_logs;
create policy "No updates to sync logs"
    on public.sync_logs for update
    to authenticated
    using (false);

drop policy if exists "No deletions of sync logs" on public.sync_logs;
create policy "No deletions of sync logs"
    on public.sync_logs for delete
    to authenticated
    using (false);
