-- Audited organization provisioning and the first write-only-through-RPC case
-- commands. All security-definer functions use an empty search_path, derive the
-- actor from auth.uid(), and are explicitly closed before selective grants.

create table private.platform_processed_commands (
  idempotency_key text primary key,
  command_type text not null,
  actor_user_id uuid not null
    references auth.users (id) on delete restrict,
  request_hash text not null,
  response jsonb not null,
  processed_at timestamptz not null default now(),
  constraint platform_processed_commands_key_not_blank
    check (btrim(idempotency_key) <> ''),
  constraint platform_processed_commands_type_not_blank
    check (btrim(command_type) <> ''),
  constraint platform_processed_commands_hash_not_blank
    check (btrim(request_hash) <> ''),
  constraint platform_processed_commands_response_is_object
    check (jsonb_typeof(response) = 'object')
);

alter table private.platform_processed_commands enable row level security;

-- Cover foreign keys used for lifecycle checks, actor audit queries and deletes.
create index platform_admin_events_actor_user
  on private.platform_admin_events (actor_user_id);
create index platform_processed_commands_actor_user
  on private.platform_processed_commands (actor_user_id);
create index platform_superadmins_created_by
  on private.platform_superadmins (created_by);
create index platform_superadmins_updated_by
  on private.platform_superadmins (updated_by);

create index organizations_created_by
  on public.organizations (created_by);
create index organizations_updated_by
  on public.organizations (updated_by);
create index organizations_suspended_by
  on public.organizations (suspended_by);
create index organization_units_created_by
  on public.organization_units (created_by);
create index organization_units_updated_by
  on public.organization_units (updated_by);
create index user_profiles_user
  on public.user_profiles (user_id);
create index user_profiles_created_by
  on public.user_profiles (created_by);
create index user_profiles_updated_by
  on public.user_profiles (updated_by);
create index organization_memberships_created_by
  on public.organization_memberships (created_by);
create index organization_memberships_updated_by
  on public.organization_memberships (updated_by);
create index membership_units_organization_unit
  on public.membership_units (organization_id, organization_unit_id);
create index membership_units_created_by
  on public.membership_units (created_by);

create index cases_organization_unit
  on public.cases (organization_id, organization_unit_id);
create index cases_created_by
  on public.cases (created_by);
create index cases_updated_by
  on public.cases (updated_by);
create index cases_closed_by
  on public.cases (closed_by);
create index case_assignments_assigned_by
  on public.case_assignments (assigned_by);
create index case_assignments_ended_by
  on public.case_assignments (ended_by);
create index case_activities_handler_override
  on public.case_activities (organization_id, handler_id_override);
create index case_activities_created_by
  on public.case_activities (created_by);
create index case_activities_updated_by
  on public.case_activities (updated_by);
create index case_events_actor_user
  on public.case_events (actor_user_id);

create function private.is_platform_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.platform_superadmins superadmin
    where superadmin.user_id = (select auth.uid())
      and superadmin.active
  );
$$;

revoke all on function private.is_platform_superadmin()
  from public, anon, authenticated;

create function private.has_active_organization_access(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization
      on organization.id = membership.organization_id
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and organization.status = 'active'
  );
$$;

revoke all on function private.has_active_organization_access(uuid)
  from public, anon, authenticated;
grant execute on function private.has_active_organization_access(uuid)
  to authenticated;

create function private.require_active_membership(p_allowed_roles text[])
returns table (
  organization_id uuid,
  user_id uuid,
  membership_role text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'an authenticated user is required';
  end if;

  return query
  select
    membership.organization_id,
    membership.user_id,
    membership.role
  from public.organization_memberships membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = v_user_id
    and membership.status = 'active'
    and organization.status = 'active'
    and membership.role = any (p_allowed_roles)
  limit 1;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'the user lacks an active organization role for this command';
  end if;
end;
$$;

revoke all on function private.require_active_membership(text[])
  from public, anon, authenticated;

-- Suspending an organization must immediately close all tenant reads, without
-- waiting for access tokens to expire or memberships to be rewritten.
drop policy organizations_select_active_member on public.organizations;
drop policy organization_units_select_active_member on public.organization_units;
drop policy user_profiles_select_active_member on public.user_profiles;
drop policy membership_units_select_active_member on public.membership_units;
drop policy cases_select_active_member on public.cases;
drop policy case_assignments_select_active_member on public.case_assignments;
drop policy case_activities_select_active_member on public.case_activities;
drop policy case_events_select_active_member on public.case_events;

create policy organizations_select_active_member
on public.organizations
for select
to authenticated
using ((select private.has_active_organization_access(organizations.id)));

create policy organization_units_select_active_member
on public.organization_units
for select
to authenticated
using ((select private.has_active_organization_access(organization_units.organization_id)));

create policy user_profiles_select_active_member
on public.user_profiles
for select
to authenticated
using ((select private.has_active_organization_access(user_profiles.organization_id)));

create policy membership_units_select_active_member
on public.membership_units
for select
to authenticated
using ((select private.has_active_organization_access(membership_units.organization_id)));

create policy cases_select_active_member
on public.cases
for select
to authenticated
using ((select private.has_active_organization_access(cases.organization_id)));

create policy case_assignments_select_active_member
on public.case_assignments
for select
to authenticated
using ((select private.has_active_organization_access(case_assignments.organization_id)));

create policy case_activities_select_active_member
on public.case_activities
for select
to authenticated
using ((select private.has_active_organization_access(case_activities.organization_id)));

create policy case_events_select_active_member
on public.case_events
for select
to authenticated
using ((select private.has_active_organization_access(case_events.organization_id)));

create function private.platform_create_organization(
  p_slug text,
  p_name text,
  p_kind text,
  p_first_admin_user_id uuid,
  p_first_admin_display_name text,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_kind text := lower(btrim(p_kind));
  v_request_hash text;
  v_existing_command private.platform_processed_commands%rowtype;
begin
  if v_actor_user_id is null or not (select private.is_platform_superadmin()) then
    raise exception using
      errcode = '42501',
      message = 'an active platform superadmin is required';
  end if;

  if p_slug is null or btrim(p_slug) = ''
    or p_name is null or btrim(p_name) = ''
    or v_kind not in ('live', 'demo')
    or p_first_admin_user_id is null
    or p_first_admin_display_name is null or btrim(p_first_admin_display_name) = ''
    or p_reason is null or btrim(p_reason) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'slug, name, valid kind, first administrator, reason and idempotency key are required';
  end if;

  if not exists (
    select 1 from auth.users auth_user where auth_user.id = p_first_admin_user_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'the first administrator must already exist in Supabase Auth';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'slug', lower(btrim(p_slug)),
    'name', btrim(p_name),
    'kind', v_kind,
    'first_admin_user_id', p_first_admin_user_id,
    'first_admin_display_name', btrim(p_first_admin_display_name),
    'reason', btrim(p_reason)
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended('platform:' || btrim(p_idempotency_key), 0)
  );

  select command.*
  into v_existing_command
  from private.platform_processed_commands command
  where command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'organization.create'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    return (v_existing_command.response ->> 'organization_id')::uuid;
  end if;

  if exists (
    select 1
    from public.organization_memberships membership
    where membership.user_id = p_first_admin_user_id
      and membership.status = 'active'
  ) then
    raise exception using
      errcode = '23505',
      message = 'the first administrator already belongs to an active organization';
  end if;

  insert into public.organizations (
    slug,
    name,
    kind,
    created_by,
    updated_by
  )
  values (
    lower(btrim(p_slug)),
    btrim(p_name),
    v_kind,
    v_actor_user_id,
    v_actor_user_id
  )
  returning id into v_organization_id;

  insert into public.user_profiles (
    organization_id,
    user_id,
    display_name,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    p_first_admin_user_id,
    btrim(p_first_admin_display_name),
    v_actor_user_id,
    v_actor_user_id
  );

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    created_by,
    updated_by,
    activated_at
  )
  values (
    v_organization_id,
    p_first_admin_user_id,
    'administrator',
    'active',
    v_actor_user_id,
    v_actor_user_id,
    now()
  );

  insert into private.platform_admin_events (
    actor_user_id,
    target_organization_id,
    event_type,
    reason,
    correlation_id,
    payload
  )
  values (
    v_actor_user_id,
    v_organization_id,
    'organization.created',
    btrim(p_reason),
    gen_random_uuid(),
    jsonb_build_object(
      'first_admin_user_id', p_first_admin_user_id,
      'kind', v_kind
    )
  );

  insert into private.platform_processed_commands (
    idempotency_key,
    command_type,
    actor_user_id,
    request_hash,
    response
  )
  values (
    btrim(p_idempotency_key),
    'organization.create',
    v_actor_user_id,
    v_request_hash,
    jsonb_build_object('organization_id', v_organization_id)
  );

  return v_organization_id;
end;
$$;

create function private.platform_set_organization_status(
  p_organization_id uuid,
  p_status text,
  p_reason text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_requested_status text := lower(btrim(p_status));
  v_previous_status text;
  v_request_hash text;
  v_existing_command private.platform_processed_commands%rowtype;
begin
  if v_actor_user_id is null or not (select private.is_platform_superadmin()) then
    raise exception using
      errcode = '42501',
      message = 'an active platform superadmin is required';
  end if;

  if p_organization_id is null
    or v_requested_status not in ('active', 'suspended')
    or p_reason is null or btrim(p_reason) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'organization, valid status, reason and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'organization_id', p_organization_id,
    'status', v_requested_status,
    'reason', btrim(p_reason)
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended('platform:' || btrim(p_idempotency_key), 0)
  );

  select command.*
  into v_existing_command
  from private.platform_processed_commands command
  where command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'organization.set_status'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    return v_existing_command.response ->> 'status';
  end if;

  select organization.status
  into v_previous_status
  from public.organizations organization
  where organization.id = p_organization_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'organization not found';
  end if;

  if v_previous_status <> v_requested_status then
    if v_requested_status = 'suspended' then
      update public.organizations
      set
        status = 'suspended',
        updated_by = v_actor_user_id,
        suspended_at = now(),
        suspended_by = v_actor_user_id
      where id = p_organization_id;
    else
      update public.organizations
      set
        status = 'active',
        updated_by = v_actor_user_id,
        suspended_at = null,
        suspended_by = null
      where id = p_organization_id;
    end if;

    insert into private.platform_admin_events (
      actor_user_id,
      target_organization_id,
      event_type,
      reason,
      payload
    )
    values (
      v_actor_user_id,
      p_organization_id,
      case
        when v_requested_status = 'suspended' then 'organization.suspended'
        else 'organization.reactivated'
      end,
      btrim(p_reason),
      jsonb_build_object(
        'previous_status', v_previous_status,
        'status', v_requested_status
      )
    );
  end if;

  insert into private.platform_processed_commands (
    idempotency_key,
    command_type,
    actor_user_id,
    request_hash,
    response
  )
  values (
    btrim(p_idempotency_key),
    'organization.set_status',
    v_actor_user_id,
    v_request_hash,
    jsonb_build_object(
      'organization_id', p_organization_id,
      'status', v_requested_status,
      'previous_status', v_previous_status
    )
  );

  return v_requested_status;
end;
$$;

create function private.create_case(
  p_number text,
  p_case_type_id text,
  p_title text,
  p_description text,
  p_priority text,
  p_organization_unit_id uuid,
  p_idempotency_key text
)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_case public.cases%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_number is null or btrim(p_number) = ''
    or p_case_type_id is null or btrim(p_case_type_id) = ''
    or p_title is null or btrim(p_title) = ''
    or lower(btrim(p_priority)) not in ('low', 'normal', 'high', 'urgent')
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'number, case type, title, valid priority and idempotency key are required';
  end if;

  if p_organization_unit_id is not null and not exists (
    select 1
    from public.organization_units organization_unit
    where organization_unit.organization_id = v_organization_id
      and organization_unit.id = p_organization_unit_id
      and organization_unit.active
  ) then
    raise exception using
      errcode = '23503',
      message = 'organization unit does not belong to the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'number', btrim(p_number),
    'case_type_id', btrim(p_case_type_id),
    'title', btrim(p_title),
    'description', coalesce(p_description, ''),
    'priority', lower(btrim(p_priority)),
    'organization_unit_id', p_organization_unit_id
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key),
    0
  ));

  select command.*
  into v_existing_command
  from public.processed_commands command
  where command.organization_id = v_organization_id
    and command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'case.create'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select case_row.*
    into v_case
    from public.cases case_row
    where case_row.organization_id = v_organization_id
      and case_row.id = (v_existing_command.response ->> 'case_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent case result no longer exists';
    end if;

    return v_case;
  end if;

  insert into public.cases (
    organization_id,
    number,
    case_type_id,
    organization_unit_id,
    title,
    description,
    priority,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    btrim(p_number),
    btrim(p_case_type_id),
    p_organization_unit_id,
    btrim(p_title),
    coalesce(p_description, ''),
    lower(btrim(p_priority)),
    v_actor_user_id,
    v_actor_user_id
  )
  returning * into v_case;

  insert into public.case_events (
    organization_id,
    case_id,
    type,
    entity_type,
    entity_id,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_case.id,
    'case.created',
    'case',
    v_case.id,
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'number', v_case.number,
      'case_type_id', v_case.case_type_id,
      'priority', v_case.priority,
      'version', v_case.version
    )
  );

  insert into public.processed_commands (
    organization_id,
    idempotency_key,
    command_type,
    request_hash,
    response
  )
  values (
    v_organization_id,
    btrim(p_idempotency_key),
    'case.create',
    v_request_hash,
    jsonb_build_object('case_id', v_case.id, 'version', v_case.version)
  );

  return v_case;
end;
$$;

create function private.create_case_activity(
  p_case_id uuid,
  p_title text,
  p_due_date date,
  p_idempotency_key text
)
returns public.case_activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_activity public.case_activities%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_case_id is null
    or p_title is null or btrim(p_title) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'case, title and idempotency key are required';
  end if;

  if not exists (
    select 1
    from public.cases case_row
    where case_row.organization_id = v_organization_id
      and case_row.id = p_case_id
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'case not found in the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'case_id', p_case_id,
    'title', btrim(p_title),
    'due_date', p_due_date
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key),
    0
  ));

  select command.*
  into v_existing_command
  from public.processed_commands command
  where command.organization_id = v_organization_id
    and command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'case_activity.create'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select activity.*
    into v_activity
    from public.case_activities activity
    where activity.organization_id = v_organization_id
      and activity.id = (v_existing_command.response ->> 'activity_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent activity result no longer exists';
    end if;

    return v_activity;
  end if;

  insert into public.case_activities (
    organization_id,
    case_id,
    title,
    due_date,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    p_case_id,
    btrim(p_title),
    p_due_date,
    v_actor_user_id,
    v_actor_user_id
  )
  returning * into v_activity;

  insert into public.case_events (
    organization_id,
    case_id,
    type,
    entity_type,
    entity_id,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    p_case_id,
    'case_activity.created',
    'case_activity',
    v_activity.id,
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'title', v_activity.title,
      'due_date', v_activity.due_date,
      'version', v_activity.version
    )
  );

  insert into public.processed_commands (
    organization_id,
    idempotency_key,
    command_type,
    request_hash,
    response
  )
  values (
    v_organization_id,
    btrim(p_idempotency_key),
    'case_activity.create',
    v_request_hash,
    jsonb_build_object('activity_id', v_activity.id, 'version', v_activity.version)
  );

  return v_activity;
end;
$$;

create function private.complete_case_activity(
  p_activity_id uuid,
  p_expected_version integer,
  p_result_code text,
  p_classification text,
  p_idempotency_key text
)
returns public.case_activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_activity public.case_activities%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_activity_id is null
    or p_expected_version is null or p_expected_version < 1
    or p_result_code is null or btrim(p_result_code) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'activity, expected version, result and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'activity_id', p_activity_id,
    'expected_version', p_expected_version,
    'result_code', btrim(p_result_code),
    'classification', nullif(btrim(p_classification), '')
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key),
    0
  ));

  select command.*
  into v_existing_command
  from public.processed_commands command
  where command.organization_id = v_organization_id
    and command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'case_activity.complete'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select activity.*
    into v_activity
    from public.case_activities activity
    where activity.organization_id = v_organization_id
      and activity.id = (v_existing_command.response ->> 'activity_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent activity result no longer exists';
    end if;

    return v_activity;
  end if;

  select activity.*
  into v_activity
  from public.case_activities activity
  where activity.organization_id = v_organization_id
    and activity.id = p_activity_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'activity not found in the active organization';
  end if;

  if v_activity.version <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = format(
        'activity version conflict: expected %s, current %s',
        p_expected_version,
        v_activity.version
      );
  end if;

  if v_activity.status in ('completed', 'cancelled') then
    raise exception using
      errcode = '22023',
      message = 'a completed or cancelled activity cannot be completed again';
  end if;

  update public.case_activities
  set
    status = 'completed',
    result_code = btrim(p_result_code),
    classification = nullif(btrim(p_classification), ''),
    version = version + 1,
    updated_by = v_actor_user_id
  where organization_id = v_organization_id
    and id = p_activity_id
  returning * into v_activity;

  insert into public.case_events (
    organization_id,
    case_id,
    type,
    entity_type,
    entity_id,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_activity.case_id,
    'case_activity.completed',
    'case_activity',
    v_activity.id,
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'result_code', v_activity.result_code,
      'classification', v_activity.classification,
      'version', v_activity.version
    )
  );

  insert into public.processed_commands (
    organization_id,
    idempotency_key,
    command_type,
    request_hash,
    response
  )
  values (
    v_organization_id,
    btrim(p_idempotency_key),
    'case_activity.complete',
    v_request_hash,
    jsonb_build_object('activity_id', v_activity.id, 'version', v_activity.version)
  );

  return v_activity;
end;
$$;

-- The exposed RPC functions are deliberately thin security-invoker wrappers.
-- Privileged implementations remain in the non-exposed private schema.
create function public.platform_create_organization(
  p_slug text,
  p_name text,
  p_kind text,
  p_first_admin_user_id uuid,
  p_first_admin_display_name text,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.platform_create_organization(
    p_slug,
    p_name,
    p_kind,
    p_first_admin_user_id,
    p_first_admin_display_name,
    p_reason,
    p_idempotency_key
  );
end;
$$;

create function public.platform_set_organization_status(
  p_organization_id uuid,
  p_status text,
  p_reason text,
  p_idempotency_key text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.platform_set_organization_status(
    p_organization_id,
    p_status,
    p_reason,
    p_idempotency_key
  );
end;
$$;

create function public.create_case(
  p_number text,
  p_case_type_id text,
  p_title text,
  p_description text,
  p_priority text,
  p_organization_unit_id uuid,
  p_idempotency_key text
)
returns public.cases
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_case(
    p_number,
    p_case_type_id,
    p_title,
    p_description,
    p_priority,
    p_organization_unit_id,
    p_idempotency_key
  );
end;
$$;

create function public.create_case_activity(
  p_case_id uuid,
  p_title text,
  p_due_date date,
  p_idempotency_key text
)
returns public.case_activities
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_case_activity(
    p_case_id,
    p_title,
    p_due_date,
    p_idempotency_key
  );
end;
$$;

create function public.complete_case_activity(
  p_activity_id uuid,
  p_expected_version integer,
  p_result_code text,
  p_classification text,
  p_idempotency_key text
)
returns public.case_activities
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.complete_case_activity(
    p_activity_id,
    p_expected_version,
    p_result_code,
    p_classification,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.platform_create_organization(text, text, text, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function private.platform_set_organization_status(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function private.create_case(text, text, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function private.create_case_activity(uuid, text, date, text)
  from public, anon, authenticated;
revoke all on function private.complete_case_activity(uuid, integer, text, text, text)
  from public, anon, authenticated;

grant execute on function private.platform_create_organization(text, text, text, uuid, text, text, text)
  to authenticated;
grant execute on function private.platform_set_organization_status(uuid, text, text, text)
  to authenticated;
grant execute on function private.create_case(text, text, text, text, text, uuid, text)
  to authenticated;
grant execute on function private.create_case_activity(uuid, text, date, text)
  to authenticated;
grant execute on function private.complete_case_activity(uuid, integer, text, text, text)
  to authenticated;

-- Required for the invoker wrappers to resolve their private implementation.
-- The schema is not exposed by PostgREST and authenticated receives no table
-- privileges in private.
grant usage on schema private to authenticated;

-- Functions in public receive EXECUTE for PUBLIC by PostgreSQL default. Close
-- each wrapper first, then expose only the guarded commands to signed-in users.
revoke all on function public.platform_create_organization(text, text, text, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.platform_set_organization_status(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.create_case(text, text, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.create_case_activity(uuid, text, date, text)
  from public, anon, authenticated;
revoke all on function public.complete_case_activity(uuid, integer, text, text, text)
  from public, anon, authenticated;

grant execute on function public.platform_create_organization(text, text, text, uuid, text, text, text)
  to authenticated;
grant execute on function public.platform_set_organization_status(uuid, text, text, text)
  to authenticated;
grant execute on function public.create_case(text, text, text, text, text, uuid, text)
  to authenticated;
grant execute on function public.create_case_activity(uuid, text, date, text)
  to authenticated;
grant execute on function public.complete_case_activity(uuid, integer, text, text, text)
  to authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;
