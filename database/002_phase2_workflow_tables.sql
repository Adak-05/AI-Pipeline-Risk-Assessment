-- ============================================================================
-- Municipal Pipeline Risk Assessment System
-- Migration 002: Phase 2 Municipal Authority Workflow Schema
-- Work Orders, Inspections, Maintenance Records, and Audit Logs
-- Safe, idempotent migration for PostgreSQL / Supabase
-- ============================================================================

-- 1. Ensure public.work_orders table exists
create table if not exists public.work_orders (
    id                  text primary key,
    pipeline_id         text not null references public.pipelines(pipeline_id) on delete cascade,
    priority            text not null check (priority in ('Critical', 'High', 'Medium', 'Low')),
    status              text not null default 'Pending Review' check (
                            status in (
                                'Pending Review', 'Approved', 'Assigned',
                                'Inspection in Progress', 'Repair in Progress',
                                'Verification', 'Closed', 'Rejected', 'On Hold'
                            )
                        ),
    recommended_action  text not null,
    reason              text,
    assigned_to         text,
    due_date            date,
    notes               text,
    status_reason       text,
    verification_result text,
    created_by          text default 'Authorized Municipal Engineer',
    created_at          timestamptz default now(),
    updated_at          timestamptz default now(),
    completed_at        timestamptz
);

-- 2. Ensure public.inspections table exists
create table if not exists public.inspections (
    id                      text primary key,
    pipeline_id             text not null references public.pipelines(pipeline_id) on delete cascade,
    work_order_id           text references public.work_orders(id) on delete set null,
    inspection_date         date not null,
    condition_observed      text not null check (condition_observed in ('Good', 'Fair', 'Poor', 'Critical', 'Failed')),
    leakage_observed        boolean default false,
    corrosion_observed      boolean default false,
    notes                   text,
    recommended_action      text,
    inspector_name          text not null,
    inspector_id            uuid references auth.users(id) on delete set null,
    photo_url               text,
    created_at              timestamptz default now()
);

-- 3. Ensure public.maintenance_records / audit trail table exists
create table if not exists public.maintenance_records (
    id                  text primary key,
    pipeline_id         text not null references public.pipelines(pipeline_id) on delete cascade,
    work_order_id       text references public.work_orders(id) on delete set null,
    event_type          text not null check (
                            event_type in (
                                'RISK_REVIEW', 'WORK_ORDER_CREATED', 'STATUS_CHANGE',
                                'ASSIGNMENT', 'INSPECTION_SUBMITTED', 'REPAIR_PROGRESS',
                                'VERIFICATION', 'WORK_ORDER_CLOSED', 'WORK_ORDER_REOPENED'
                            )
                        ),
    title               text not null,
    description         text,
    performed_by        text not null,
    performed_by_id     uuid references auth.users(id) on delete set null,
    metadata            jsonb default '{}'::jsonb,
    created_at          timestamptz default now()
);

-- 4. Create Performance Indexes
create index if not exists idx_work_orders_pipeline on public.work_orders(pipeline_id);
create index if not exists idx_work_orders_status on public.work_orders(status);
create index if not exists idx_work_orders_due on public.work_orders(due_date);
create index if not exists idx_inspections_pipeline on public.inspections(pipeline_id);
create index if not exists idx_inspections_wo on public.inspections(work_order_id);
create index if not exists idx_maintenance_pipeline on public.maintenance_records(pipeline_id);
create index if not exists idx_maintenance_wo on public.maintenance_records(work_order_id);
create index if not exists idx_maintenance_created on public.maintenance_records(created_at desc);

-- 5. Enable Row Level Security (RLS)
alter table public.work_orders enable row level security;
alter table public.inspections enable row level security;
alter table public.maintenance_records enable row level security;

-- 6. RLS Policies: work_orders
drop policy if exists "Authenticated users can view work orders" on public.work_orders;
create policy "Authenticated users can view work orders"
    on public.work_orders for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can insert work orders" on public.work_orders;
create policy "Authenticated users can insert work orders"
    on public.work_orders for insert
    to authenticated
    with check (true);

drop policy if exists "Authenticated users can update work orders" on public.work_orders;
create policy "Authenticated users can update work orders"
    on public.work_orders for update
    to authenticated
    using (true)
    with check (true);

-- 7. RLS Policies: inspections
drop policy if exists "Authenticated users can view inspections" on public.inspections;
create policy "Authenticated users can view inspections"
    on public.inspections for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can insert inspections" on public.inspections;
create policy "Authenticated users can insert inspections"
    on public.inspections for insert
    to authenticated
    with check (true);

-- 8. RLS Policies: maintenance_records (Append-Only / Immutable audit log)
drop policy if exists "Authenticated users can view maintenance records" on public.maintenance_records;
create policy "Authenticated users can view maintenance records"
    on public.maintenance_records for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can insert maintenance records" on public.maintenance_records;
create policy "Authenticated users can insert maintenance records"
    on public.maintenance_records for insert
    to authenticated
    with check (true);

-- Prevent update and delete on maintenance audit records to ensure audit immutability
drop policy if exists "No updates to maintenance audit records" on public.maintenance_records;
create policy "No updates to maintenance audit records"
    on public.maintenance_records for update
    to authenticated
    using (false);

drop policy if exists "No deletions of maintenance audit records" on public.maintenance_records;
create policy "No deletions of maintenance audit records"
    on public.maintenance_records for delete
    to authenticated
    using (false);
