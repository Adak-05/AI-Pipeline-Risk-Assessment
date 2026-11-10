-- ============================================================================
-- Municipal Pipeline Risk Assessment System
-- Database Schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL Editor to set up your database.
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLE: pipelines
-- Core pipeline infrastructure records.
-- source_name / source_record_id track GIS import origin.
-- ============================================================================
create table if not exists pipelines (
    id                  uuid primary key default uuid_generate_v4(),
    pipeline_id         text not null unique,        -- official or assigned ID
    location            text not null,
    material            text,
    diameter_mm         numeric,
    length_m            numeric,
    installation_year   integer,
    inspection_year     integer,
    age_years           numeric,
    previous_leaks      integer default 0,
    repair_count        integer default 0,
    operating_pressure_bar numeric,
    soil_type           text,
    condition_score     numeric check (condition_score >= 1 and condition_score <= 10),
    latitude            numeric,
    longitude           numeric,
    -- Risk assessment state
    current_risk_level  text default 'PENDING'
                            check (current_risk_level in ('LOW', 'MEDIUM', 'HIGH', 'PENDING')),
    current_risk_score  numeric,
    assessment_id       uuid,
    assessment_timestamp timestamptz,
    -- Data source tracking
    source_name         text,                        -- e.g. 'MIDC Water Pipeline Layer', 'CSV Import', 'Manual Entry'
    source_record_id    text,                        -- original ID from source GIS system
    infrastructure_type text,                        -- 'MIDC Industrial', 'MCGM Municipal', 'Manual'
    -- Timestamps
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- Index for common queries
create index if not exists idx_pipelines_risk_level on pipelines(current_risk_level);
create index if not exists idx_pipelines_source on pipelines(source_name);
create index if not exists idx_pipelines_source_record on pipelines(source_record_id, source_name);

-- ============================================================================
-- TABLE: risk_assessments
-- Historical record of every risk scoring run.
-- is_current = true for the active assessment per pipeline.
-- ============================================================================
create table if not exists risk_assessments (
    id                  uuid primary key default uuid_generate_v4(),
    pipeline_id         text not null references pipelines(pipeline_id) on delete cascade,
    risk_score          numeric not null check (risk_score >= 0 and risk_score <= 100),
    risk_level          text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
    confidence          numeric,
    model_version       text default 'rule_based_v1.0',
    assessment_type     text default 'rule_based',  -- 'rule_based' or 'ml_model'
    feature_inputs      jsonb,                      -- inputs used for this assessment
    risk_breakdown      jsonb,                      -- per-factor contribution
    risk_factors        jsonb,                      -- human-readable factor explanations
    is_current          boolean default true,
    outdated_reason     text,
    assessed_at         timestamptz default now(),
    assessed_by         text default 'system'
);

create index if not exists idx_risk_assessments_pipeline on risk_assessments(pipeline_id);
create index if not exists idx_risk_assessments_current on risk_assessments(pipeline_id, is_current);
create index if not exists idx_risk_assessments_level on risk_assessments(risk_level, is_current);

-- ============================================================================
-- TABLE: inspections
-- Engineer-submitted field inspection records.
-- ============================================================================
create table if not exists inspections (
    id                      uuid primary key default uuid_generate_v4(),
    pipeline_id             text not null references pipelines(pipeline_id) on delete cascade,
    inspection_date         date not null,
    condition_observed      text not null check (condition_observed in ('Good', 'Fair', 'Poor', 'Critical', 'Failed')),
    leakage_observed        boolean default false,
    corrosion_observed      boolean default false,
    notes                   text,
    follow_up_recommendation text,
    photo_url               text,
    risk_reassessment_needed boolean default false,
    submitted_by            text,
    submitted_at            timestamptz default now()
);

create index if not exists idx_inspections_pipeline on inspections(pipeline_id);
create index if not exists idx_inspections_date on inspections(inspection_date desc);

-- ============================================================================
-- TABLE: work_orders
-- Municipal maintenance work orders linked to risk assessments.
-- ============================================================================
create table if not exists work_orders (
    id                  uuid primary key default uuid_generate_v4(),
    pipeline_id         text not null references pipelines(pipeline_id) on delete cascade,
    assessment_id       uuid references risk_assessments(id) on delete set null,
    status              text not null default 'Pending Review'
                            check (status in (
                                'Pending Review', 'Approved', 'Assigned',
                                'Inspection in Progress', 'Repair in Progress',
                                'Verification', 'Closed', 'Rejected', 'On Hold'
                            )),
    priority            text not null check (priority in ('Low', 'Medium', 'High', 'Critical')),
    recommended_action  text not null,
    assigned_to         text,
    created_by          text,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now(),
    due_date            date,
    completed_at        timestamptz,
    notes               text,
    rejection_reason    text,
    verification_result text
);

create index if not exists idx_work_orders_pipeline on work_orders(pipeline_id);
create index if not exists idx_work_orders_status on work_orders(status);
create index if not exists idx_work_orders_due_date on work_orders(due_date);
create index if not exists idx_work_orders_priority on work_orders(priority);

-- ============================================================================
-- TABLE: maintenance_records
-- Completed repair and maintenance history per pipeline.
-- ============================================================================
create table if not exists maintenance_records (
    id                  uuid primary key default uuid_generate_v4(),
    pipeline_id         text not null references pipelines(pipeline_id) on delete cascade,
    work_order_id       uuid references work_orders(id) on delete set null,
    maintenance_type    text,                        -- 'Repair', 'Replacement', 'Inspection', 'Cleaning', etc.
    description         text,
    performed_by        text,
    performed_at        date,
    cost_estimate       numeric,
    outcome             text,
    created_at          timestamptz default now()
);

create index if not exists idx_maintenance_pipeline on maintenance_records(pipeline_id);

-- ============================================================================
-- TABLE: sync_logs
-- Records every GIS synchronization attempt.
-- ============================================================================
create table if not exists sync_logs (
    id                  uuid primary key default uuid_generate_v4(),
    source_name         text not null,
    sync_type           text default 'manual',       -- 'manual', 'scheduled'
    status              text not null default 'running'
                            check (status in ('running', 'success', 'failed', 'partial')),
    records_fetched     integer default 0,
    records_imported    integer default 0,
    records_updated     integer default 0,
    records_skipped     integer default 0,
    error_message       text,
    started_at          timestamptz default now(),
    completed_at        timestamptz
);

create index if not exists idx_sync_logs_source on sync_logs(source_name);
create index if not exists idx_sync_logs_status on sync_logs(status);
create index if not exists idx_sync_logs_started on sync_logs(started_at desc);

-- ============================================================================
-- TABLE: audit_logs
-- Immutable audit trail of all important actions.
-- ============================================================================
create table if not exists audit_logs (
    id                  uuid primary key default uuid_generate_v4(),
    entity_type         text not null,               -- 'pipeline', 'inspection', 'work_order', 'risk_assessment'
    entity_id           text not null,
    action              text not null,
    performed_by        text,
    performed_at        timestamptz default now(),
    details             jsonb
);

create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_time on audit_logs(performed_at desc);

-- ============================================================================
-- TABLE: data_sources
-- Registry of configured data sources.
-- ============================================================================
create table if not exists data_sources (
    id              uuid primary key default uuid_generate_v4(),
    source_name     text unique not null,
    endpoint_url    text,
    source_type     text,                            -- 'gis_rest', 'csv', 'manual'
    infrastructure_type text,
    description     text,
    last_probed_at  timestamptz,
    last_probe_status text,
    last_sync_at    timestamptz,
    is_active       boolean default true,
    created_at      timestamptz default now()
);

-- Insert known GIS sources
insert into data_sources (source_name, endpoint_url, source_type, infrastructure_type, description)
values
    ('MIDC Water Pipeline Layer',
     'https://gis.midcindia.org/server/rest/services/Application/Department_Main_Map_Service/MapServer/18',
     'gis_rest', 'MIDC Industrial',
     'MIDC industrial water supply pipeline network'),
    ('MCGM GIS Departments',
     'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers/MapServer/layers',
     'gis_rest', 'MCGM Municipal',
     'BMC/MCGM municipal water distribution infrastructure'),
    ('CSV Import',
     null,
     'csv', 'Manual',
     'Pipeline records imported via CSV upload')
on conflict (source_name) do nothing;

-- ============================================================================
-- Row Level Security (optional - uncomment if using Supabase Auth)
-- ============================================================================
-- alter table pipelines enable row level security;
-- alter table inspections enable row level security;
-- alter table work_orders enable row level security;
-- alter table risk_assessments enable row level security;
-- alter table audit_logs enable row level security;
-- alter table sync_logs enable row level security;

-- Allow backend service role full access (already has bypass)
-- Create engineer-level policies as needed after testing

-- ============================================================================
-- Helper function: updated_at auto-update trigger
-- ============================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger pipelines_updated_at
    before update on pipelines
    for each row execute function update_updated_at();

create trigger work_orders_updated_at
    before update on work_orders
    for each row execute function update_updated_at();
