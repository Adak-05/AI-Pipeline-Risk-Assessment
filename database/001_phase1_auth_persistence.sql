-- ============================================================================
-- Municipal Pipeline Risk Assessment System
-- Migration 001: Phase 1 Schema & Row Level Security Setup
-- Safe, idempotent migration for PostgreSQL / Supabase
-- ============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Profiles Table for Municipal Engineers and Administrators
-- Extends Supabase auth.users with municipal designations & roles
create table if not exists public.profiles (
    id                  uuid primary key references auth.users(id) on delete cascade,
    email               text not null,
    full_name           text not null,
    role                text not null default 'engineer' check (role in ('admin', 'engineer', 'viewer')),
    designation         text default 'Municipal Engineer',
    department          text default 'Water Infrastructure & Asset Management',
    division            text default 'Zone-IV Urban Distribution',
    avatar_initials     text default 'ME',
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- 3. Ensure All Required Columns on pipelines Table
create table if not exists public.pipelines (
    id                  uuid primary key default uuid_generate_v4(),
    pipeline_id         text not null unique,
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
    risk_score          numeric,
    risk_level          text default 'PENDING',
    source_name         text default 'Manual Upload',
    source_record_id    text,
    created_by          uuid references auth.users(id) on delete set null,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- Add any missing columns to existing pipelines table gracefully
alter table public.pipelines add column if not exists latitude numeric;
alter table public.pipelines add column if not exists longitude numeric;
alter table public.pipelines add column if not exists source_name text default 'Manual Upload';
alter table public.pipelines add column if not exists source_record_id text;
alter table public.pipelines add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.pipelines add column if not exists updated_at timestamptz default now();

-- 4. Risk Assessments Table
create table if not exists public.risk_assessments (
    id                  uuid primary key default uuid_generate_v4(),
    pipeline_id         text not null references public.pipelines(pipeline_id) on delete cascade,
    risk_score          numeric not null check (risk_score >= 0 and risk_score <= 100),
    risk_level          text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
    confidence          numeric,
    model_version       text default 'rule_based_v1.0',
    assessment_type     text default 'rule_based',
    feature_inputs      jsonb,
    risk_breakdown      jsonb,
    risk_factors        jsonb,
    is_current          boolean default true,
    outdated_reason     text,
    assessed_at         timestamptz default now(),
    assessed_by         uuid references auth.users(id) on delete set null
);

-- 5. Helpful Performance Indexes
create index if not exists idx_pipelines_id on public.pipelines(pipeline_id);
create index if not exists idx_pipelines_risk on public.pipelines(risk_level);
create index if not exists idx_risk_assessments_pipeline on public.risk_assessments(pipeline_id);
create index if not exists idx_risk_assessments_current on public.risk_assessments(pipeline_id, is_current);

-- 6. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.pipelines enable row level security;
alter table public.risk_assessments enable row level security;

-- 7. RLS Policies: Profiles
-- Users can read all municipal engineer profiles
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
    on public.profiles for select
    to authenticated
    using (true);

-- Users can update only their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id);

-- 8. RLS Policies: Pipelines
-- All authenticated engineers can view registered pipelines
drop policy if exists "Authenticated users can view pipelines" on public.pipelines;
create policy "Authenticated users can view pipelines"
    on public.pipelines for select
    to authenticated
    using (true);

-- Authenticated engineers and admins can insert new pipeline records
drop policy if exists "Authenticated engineers can insert pipelines" on public.pipelines;
create policy "Authenticated engineers can insert pipelines"
    on public.pipelines for insert
    to authenticated
    with check (true);

-- Authenticated engineers and admins can update pipeline records
drop policy if exists "Authenticated engineers can update pipelines" on public.pipelines;
create policy "Authenticated engineers can update pipelines"
    on public.pipelines for update
    to authenticated
    using (true)
    with check (true);

-- Only administrators can delete pipeline records
drop policy if exists "Only admins can delete pipelines" on public.pipelines;
create policy "Only admins can delete pipelines"
    on public.pipelines for delete
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- 9. RLS Policies: Risk Assessments
drop policy if exists "Authenticated users can read risk assessments" on public.risk_assessments;
create policy "Authenticated users can read risk assessments"
    on public.risk_assessments for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can insert risk assessments" on public.risk_assessments;
create policy "Authenticated users can insert risk assessments"
    on public.risk_assessments for insert
    to authenticated
    with check (true);

drop policy if exists "Authenticated users can update risk assessments" on public.risk_assessments;
create policy "Authenticated users can update risk assessments"
    on public.risk_assessments for update
    to authenticated
    using (true)
    with check (true);

-- 10. Auto-Profile Creation Trigger on User Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role, designation, avatar_initials)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'role', 'engineer'),
        coalesce(new.raw_user_meta_data->>'designation', 'Municipal Engineer'),
        upper(substring(coalesce(new.raw_user_meta_data->>'full_name', new.email) from 1 for 2))
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
