-- New activities must explicitly select an organization-owned activity
-- definition and acknowledge its current published version. The database
-- freezes that exact version and rejects stale clients before writing.

drop function public.create_case_activity(uuid, text, date, text);
drop function private.create_case_activity(uuid, text, date, text);

create or replace function private.assign_default_activity_definition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition_id uuid;
  v_definition_version integer;
begin
  if new.activity_definition_id is null
    and new.activity_definition_version is null then
    select definition.resolved_activity_definition_id,
           definition.resolved_activity_definition_version
    into v_definition_id, v_definition_version
    from private.ensure_default_activity_definition(
      new.organization_id,
      new.created_by
    ) definition;

    new.activity_definition_id := v_definition_id;
    new.activity_definition_version := v_definition_version;
  elsif new.activity_definition_id is null
    or new.activity_definition_version is null then
    raise exception using
      errcode = '22023',
      message = 'activity definition and version must be supplied together';
  elsif not exists (
    select 1
    from public.activity_definitions definition
    join public.activity_definition_versions version_row
      on version_row.organization_id = definition.organization_id
     and version_row.activity_definition_id = definition.id
     and version_row.version = new.activity_definition_version
    where definition.organization_id = new.organization_id
      and definition.id = new.activity_definition_id
      and definition.status = 'active'
      and version_row.status = 'published'
  ) then
    raise exception using
      errcode = '23514',
      message = 'activity definition must be active and published in the activity organization';
  end if;

  return new;
end;
$$;

revoke all on function private.assign_default_activity_definition()
  from public, anon, authenticated;

create function private.create_case_activity(
  p_case_id uuid,
  p_activity_definition_id uuid,
  p_expected_activity_definition_version integer,
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
  v_current_definition_version integer;
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
    or p_activity_definition_id is null
    or p_expected_activity_definition_version is null
    or p_expected_activity_definition_version < 1
    or p_title is null or btrim(p_title) = '' or length(btrim(p_title)) > 160
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or length(btrim(p_idempotency_key)) > 200 then
    raise exception using
      errcode = '22023',
      message = 'case, published activity definition version, title and idempotency key are required';
  end if;

  if not exists (
    select 1
    from public.cases case_row
    where case_row.organization_id = v_organization_id
      and case_row.id = p_case_id
      and case_row.status <> 'closed'
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'open case not found in the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'case_id', p_case_id,
    'activity_definition_id', p_activity_definition_id,
    'activity_definition_version', p_expected_activity_definition_version,
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

  select definition.current_version
  into v_current_definition_version
  from public.activity_definitions definition
  where definition.organization_id = v_organization_id
    and definition.id = p_activity_definition_id
    and definition.status = 'active'
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'active activity definition not found in the active organization';
  end if;

  if v_current_definition_version <> p_expected_activity_definition_version then
    raise exception using
      errcode = '40001',
      message = format(
        'activity definition version conflict: expected %s, current %s',
        p_expected_activity_definition_version,
        v_current_definition_version
      );
  end if;

  if not exists (
    select 1
    from public.activity_definition_versions version_row
    where version_row.organization_id = v_organization_id
      and version_row.activity_definition_id = p_activity_definition_id
      and version_row.version = v_current_definition_version
      and version_row.status = 'published'
  ) then
    raise exception using
      errcode = '23514',
      message = 'the selected activity definition version is not published';
  end if;

  insert into public.case_activities (
    organization_id,
    case_id,
    title,
    due_date,
    activity_definition_id,
    activity_definition_version,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    p_case_id,
    btrim(p_title),
    p_due_date,
    p_activity_definition_id,
    v_current_definition_version,
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
      'activity_definition_id', v_activity.activity_definition_id,
      'activity_definition_version', v_activity.activity_definition_version,
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
    jsonb_build_object(
      'activity_id', v_activity.id,
      'activity_definition_id', v_activity.activity_definition_id,
      'activity_definition_version', v_activity.activity_definition_version,
      'version', v_activity.version
    )
  );

  return v_activity;
end;
$$;

create function public.create_case_activity(
  p_case_id uuid,
  p_activity_definition_id uuid,
  p_expected_activity_definition_version integer,
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
    p_activity_definition_id,
    p_expected_activity_definition_version,
    p_title,
    p_due_date,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.create_case_activity(uuid, uuid, integer, text, date, text)
  from public, anon, authenticated;
grant execute on function private.create_case_activity(uuid, uuid, integer, text, date, text)
  to authenticated;

revoke all on function public.create_case_activity(uuid, uuid, integer, text, date, text)
  from public, anon, authenticated;
grant execute on function public.create_case_activity(uuid, uuid, integer, text, date, text)
  to authenticated;
