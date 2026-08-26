-- Organization control plane and the first tenant-owned vertical slice.
--
-- Security model:
--   * platform administrators live in a private control plane;
--   * every business row carries a non-null organization_id;
--   * cross-table foreign keys include organization_id;
--   * authenticated clients are read-only in this first migration;
--   * RLS grants visibility only through an active membership;
--   * writes will be added as explicit, audited RPC functions.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  kind text not null default 'live'
    check (kind in ('live', 'demo')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete restrict,
  suspended_at timestamptz,
  suspended_by uuid references auth.users (id) on delete restrict,
  constraint organizations_slug_not_blank check (btrim(slug) <> ''),
  constraint organizations_name_not_blank check (btrim(name) <> ''),
  constraint organizations_suspension_consistent check (
    (status = 'active' and suspended_at is null and suspended_by is null)
    or (status = 'suspended' and suspended_at is not null and suspended_by is not null)
  )
);

create unique index organizations_slug_unique
  on public.organizations (lower(slug));

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete restrict,
  constraint organization_units_name_not_blank check (btrim(name) <> ''),
  unique (organization_id, id)
);

create unique index organization_units_name_unique
  on public.organization_units (organization_id, lower(name));

create table public.user_profiles (
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  user_id uuid not null
    references auth.users (id) on delete restrict,
  display_name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete restrict,
  primary key (organization_id, user_id),
  constraint user_profiles_display_name_not_blank check (btrim(display_name) <> '')
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  user_id uuid not null
    references auth.users (id) on delete restrict,
  role text not null
    check (role in ('administrator', 'coordinator', 'handler', 'mentor', 'reader')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete restrict,
  activated_at timestamptz,
  suspended_at timestamptz,
  constraint organization_memberships_lifecycle_consistent check (
    (status = 'invited' and activated_at is null and suspended_at is null)
    or (status = 'active' and activated_at is not null and suspended_at is null)
    or (status = 'suspended' and suspended_at is not null)
  ),
  unique (organization_id, id),
  unique (organization_id, user_id),
  foreign key (organization_id, user_id)
    references public.user_profiles (organization_id, user_id)
    on delete restrict
);

-- One active organization per authenticated user. A platform administrator does
-- not need a business membership and therefore does not bypass tenant RLS.
create unique index organization_memberships_one_active_organization
  on public.organization_memberships (user_id)
  where status = 'active';

create index organization_memberships_rls_lookup
  on public.organization_memberships (user_id, organization_id)
  where status = 'active';

create table public.membership_units (
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  membership_id uuid not null,
  organization_unit_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict,
  primary key (organization_id, membership_id, organization_unit_id),
  foreign key (organization_id, membership_id)
    references public.organization_memberships (organization_id, id)
    on delete cascade,
  foreign key (organization_id, organization_unit_id)
    references public.organization_units (organization_id, id)
    on delete restrict
);

-- The platform control plane is intentionally outside the exposed public schema.
create table private.platform_superadmins (
  user_id uuid primary key
    references auth.users (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete restrict
);

create table private.platform_admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null
    references auth.users (id) on delete restrict,
  target_organization_id uuid
    references public.organizations (id) on delete restrict,
  event_type text not null,
  reason text not null,
  occurred_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  constraint platform_admin_events_type_not_blank check (btrim(event_type) <> ''),
  constraint platform_admin_events_reason_not_blank check (btrim(reason) <> ''),
  constraint platform_admin_events_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create index platform_admin_events_target_time
  on private.platform_admin_events (target_organization_id, occurred_at desc);

-- First business slice: cases, assignments, activities, audit events and command
-- idempotency. It proves the isolation pattern before the remaining domains move.
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  number text not null,
  case_type_id text not null,
  organization_unit_id uuid,
  title text not null,
  description text not null default '',
  status text not null default 'open'
    check (status in ('open', 'paused', 'closed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete restrict,
  constraint cases_number_not_blank check (btrim(number) <> ''),
  constraint cases_type_not_blank check (btrim(case_type_id) <> ''),
  constraint cases_title_not_blank check (btrim(title) <> ''),
  constraint cases_closed_state_consistent check (
    (status <> 'closed' and closed_at is null and closed_by is null)
    or (status = 'closed' and closed_at is not null and closed_by is not null)
  ),
  unique (organization_id, id),
  unique (organization_id, number),
  foreign key (organization_id, organization_unit_id)
    references public.organization_units (organization_id, id)
    on delete restrict
);

create index cases_organization_status_updated
  on public.cases (organization_id, status, updated_at desc);

create table public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid not null,
  user_id uuid not null,
  role text not null
    check (role in ('responsible', 'co_handler')),
  version integer not null default 1 check (version > 0),
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null references auth.users (id) on delete restrict,
  ended_at timestamptz,
  ended_by uuid references auth.users (id) on delete restrict,
  constraint case_assignments_end_consistent check (
    (ended_at is null and ended_by is null)
    or (ended_at is not null and ended_by is not null)
  ),
  unique (organization_id, id),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id)
    on delete cascade,
  foreign key (organization_id, user_id)
    references public.user_profiles (organization_id, user_id)
    on delete restrict
);

create unique index case_assignments_one_active_responsible
  on public.case_assignments (organization_id, case_id)
  where role = 'responsible' and ended_at is null;

create index case_assignments_user_active
  on public.case_assignments (organization_id, user_id, case_id)
  where ended_at is null;

create table public.case_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid not null,
  title text not null,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'waiting', 'completed', 'cancelled')),
  result_code text,
  classification text,
  handler_id_override uuid,
  due_date date,
  waiting_for_party text,
  sort_order integer not null default 0,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint case_activities_title_not_blank check (btrim(title) <> ''),
  unique (organization_id, id),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id)
    on delete cascade,
  foreign key (organization_id, handler_id_override)
    references public.user_profiles (organization_id, user_id)
    on delete restrict
);

create index case_activities_case_sort
  on public.case_activities (organization_id, case_id, sort_order, created_at);

create index case_activities_due
  on public.case_activities (organization_id, due_date)
  where status not in ('completed', 'cancelled') and due_date is not null;

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid not null,
  type text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  entity_type text not null,
  entity_id uuid not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  constraint case_events_type_not_blank check (btrim(type) <> ''),
  constraint case_events_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint case_events_payload_is_object check (jsonb_typeof(payload) = 'object'),
  unique (organization_id, id),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id)
    on delete cascade
);

create index case_events_case_time
  on public.case_events (organization_id, case_id, occurred_at, id);

create unique index case_events_idempotency_unique
  on public.case_events (organization_id, idempotency_key)
  where idempotency_key is not null;

create table public.processed_commands (
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  idempotency_key text not null,
  command_type text not null,
  request_hash text not null,
  response jsonb not null,
  processed_at timestamptz not null default now(),
  primary key (organization_id, idempotency_key),
  constraint processed_commands_key_not_blank check (btrim(idempotency_key) <> ''),
  constraint processed_commands_type_not_blank check (btrim(command_type) <> ''),
  constraint processed_commands_hash_not_blank check (btrim(request_hash) <> '')
);

-- Keep updated_at database-owned so all future write paths behave consistently.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger organization_units_set_updated_at
before update on public.organization_units
for each row execute function private.set_updated_at();

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function private.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function private.set_updated_at();

create trigger platform_superadmins_set_updated_at
before update on private.platform_superadmins
for each row execute function private.set_updated_at();

create trigger cases_set_updated_at
before update on public.cases
for each row execute function private.set_updated_at();

create trigger case_activities_set_updated_at
before update on public.case_activities
for each row execute function private.set_updated_at();

-- RLS is enabled on every app-owned relation, including internal tables as a
-- second line of defence. No client policy is created for private/control data.
alter table public.organizations enable row level security;
alter table public.organization_units enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.membership_units enable row level security;
alter table public.cases enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_activities enable row level security;
alter table public.case_events enable row level security;
alter table public.processed_commands enable row level security;
alter table private.platform_superadmins enable row level security;
alter table private.platform_admin_events enable row level security;

-- A user may inspect only their own membership rows. Other policies use this
-- table as the single organization gate, so a platform administrator gains no
-- business-data access simply by being a platform administrator.
create policy organization_memberships_select_own
on public.organization_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

create policy organizations_select_active_member
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy organization_units_select_active_member
on public.organization_units
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = organization_units.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy user_profiles_select_active_member
on public.user_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = user_profiles.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy membership_units_select_active_member
on public.membership_units
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = membership_units.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy cases_select_active_member
on public.cases
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = cases.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy case_assignments_select_active_member
on public.case_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = case_assignments.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy case_activities_select_active_member
on public.case_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = case_activities.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy case_events_select_active_member
on public.case_events
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = case_events.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

-- Do not rely on Supabase's project-level Data API defaults. Permissions are
-- explicit and migrations remain safe if project defaults change.
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_units from anon, authenticated;
revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.organization_memberships from anon, authenticated;
revoke all on table public.membership_units from anon, authenticated;
revoke all on table public.cases from anon, authenticated;
revoke all on table public.case_assignments from anon, authenticated;
revoke all on table public.case_activities from anon, authenticated;
revoke all on table public.case_events from anon, authenticated;
revoke all on table public.processed_commands from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.organizations to authenticated;
grant select on table public.organization_units to authenticated;
grant select on table public.user_profiles to authenticated;
grant select on table public.organization_memberships to authenticated;
grant select on table public.membership_units to authenticated;
grant select on table public.cases to authenticated;
grant select on table public.case_assignments to authenticated;
grant select on table public.case_activities to authenticated;
grant select on table public.case_events to authenticated;

-- Future tables are closed by default. A migration must deliberately expose
-- each operation after adding and testing its RLS policy.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;
