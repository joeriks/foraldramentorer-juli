-- Audited, organization-scoped administration of activity definitions.
--
-- Publication is deliberately atomic: a complete result catalog is validated,
-- inserted as a new immutable version, published, and made current in one
-- transaction. Clients never receive direct write privileges on definition or
-- audit tables.

alter table public.activity_result_definitions
  add constraint activity_result_definitions_sort_order_unique
  unique (
    organization_id,
    activity_definition_id,
    activity_definition_version,
    sort_order
  );

create table public.activity_definition_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  activity_definition_id uuid not null,
  activity_definition_version integer not null,
  event_type text not null
    check (event_type in (
      'activity_definition.created',
      'activity_definition.published'
    )),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (
    organization_id,
    activity_definition_id,
    activity_definition_version
  ) references public.activity_definition_versions (
    organization_id,
    activity_definition_id,
    version
  ) on delete restrict,
  constraint activity_definition_events_key_not_blank
    check (btrim(idempotency_key) <> ''),
  constraint activity_definition_events_reason_not_blank
    check (btrim(reason) <> ''),
  constraint activity_definition_events_payload_is_object
    check (jsonb_typeof(payload) = 'object')
);

create index activity_definition_events_definition_time
  on public.activity_definition_events (
    organization_id,
    activity_definition_id,
    occurred_at desc,
    id
  );
create index activity_definition_events_actor_user
  on public.activity_definition_events (actor_user_id);

create function private.prevent_activity_definition_event_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'activity definition events are append-only';
end;
$$;

revoke all on function private.prevent_activity_definition_event_change()
  from public, anon, authenticated;

create trigger activity_definition_events_append_only
before update or delete on public.activity_definition_events
for each row execute function private.prevent_activity_definition_event_change();

create function private.has_active_organization_role(
  p_organization_id uuid,
  p_roles text[]
)
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
      and membership.role = any(p_roles)
      and organization.status = 'active'
  );
$$;

revoke all on function private.has_active_organization_role(uuid, text[])
  from public, anon, authenticated;
grant execute on function private.has_active_organization_role(uuid, text[])
  to authenticated;

alter table public.activity_definition_events enable row level security;

create policy activity_definition_events_select_administrator
on public.activity_definition_events
for select
to authenticated
using ((select private.has_active_organization_role(
  activity_definition_events.organization_id,
  array['administrator']::text[]
)));

revoke all on table public.activity_definition_events from anon, authenticated;
grant select on table public.activity_definition_events to authenticated;

create function private.publish_activity_definition(
  p_activity_definition_id uuid,
  p_expected_current_version integer,
  p_stable_key text,
  p_title text,
  p_description text,
  p_results jsonb,
  p_reason text,
  p_idempotency_key text
)
returns public.activity_definitions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_definition public.activity_definitions%rowtype;
  v_definition_id uuid;
  v_new_version integer;
  v_event_type text;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator']::text[]
  ) membership;

  if p_stable_key is null
    or btrim(p_stable_key) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(btrim(p_stable_key)) > 80
    or p_title is null or btrim(p_title) = '' or length(btrim(p_title)) > 160
    or length(coalesce(p_description, '')) > 4000
    or p_reason is null or btrim(p_reason) = '' or length(btrim(p_reason)) > 500
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or length(btrim(p_idempotency_key)) > 200
    or p_results is null
    or jsonb_typeof(p_results) <> 'array'
    or jsonb_array_length(p_results) < 1
    or jsonb_array_length(p_results) > 20 then
    raise exception using
      errcode = '22023',
      message = 'valid key, title, reason, idempotency key and 1-20 results are required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_results) result_row(value)
    where jsonb_typeof(result_row.value) <> 'object'
      or coalesce(result_row.value ->> 'code', '')
        !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or length(coalesce(result_row.value ->> 'code', '')) > 80
      or btrim(coalesce(result_row.value ->> 'label', '')) = ''
      or length(btrim(coalesce(result_row.value ->> 'label', ''))) > 160
      or lower(btrim(coalesce(result_row.value ->> 'classification', '')))
        not in ('accepted', 'deviation')
      or (
        result_row.value ? 'sort_order'
        and coalesce(result_row.value ->> 'sort_order', '') !~ '^[0-9]{1,9}$'
      )
  ) then
    raise exception using
      errcode = '22023',
      message = 'each result requires a unique kebab-case code, label, classification and optional non-negative sort order';
  end if;

  if (
    select count(*) <> count(distinct lower(btrim(result_row.value ->> 'code')))
    from jsonb_array_elements(p_results) result_row(value)
  ) or (
    select count(*) <> count(distinct coalesce(
      (result_row.value ->> 'sort_order')::integer,
      (result_row.ordinality * 10)::integer
    ))
    from jsonb_array_elements(p_results) with ordinality
      as result_row(value, ordinality)
  ) then
    raise exception using
      errcode = '22023',
      message = 'result codes and sort orders must be unique within a version';
  end if;

  if p_activity_definition_id is null
    and p_expected_current_version is not null then
    raise exception using
      errcode = '22023',
      message = 'a new activity definition cannot have an expected current version';
  elsif p_activity_definition_id is not null
    and (p_expected_current_version is null or p_expected_current_version < 1) then
    raise exception using
      errcode = '22023',
      message = 'an existing activity definition requires its expected current version';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'activity_definition_id', p_activity_definition_id,
    'expected_current_version', p_expected_current_version,
    'stable_key', btrim(p_stable_key),
    'title', btrim(p_title),
    'description', coalesce(p_description, ''),
    'results', p_results,
    'reason', btrim(p_reason)
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
    if v_existing_command.command_type <> 'activity_definition.publish'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select definition.*
    into v_definition
    from public.activity_definitions definition
    where definition.organization_id = v_organization_id
      and definition.id = (v_existing_command.response ->> 'activity_definition_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent activity definition result no longer exists';
    end if;

    return v_definition;
  end if;

  if p_activity_definition_id is null then
    v_definition_id := gen_random_uuid();
    v_new_version := 1;
    v_event_type := 'activity_definition.created';

    insert into public.activity_definitions (
      id,
      organization_id,
      stable_key,
      status,
      is_default,
      current_version,
      created_by,
      updated_by
    ) values (
      v_definition_id,
      v_organization_id,
      btrim(p_stable_key),
      'active',
      false,
      v_new_version,
      v_actor_user_id,
      v_actor_user_id
    )
    returning * into v_definition;
  else
    select definition.*
    into v_definition
    from public.activity_definitions definition
    where definition.organization_id = v_organization_id
      and definition.id = p_activity_definition_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'activity definition not found in the active organization';
    end if;

    if v_definition.status <> 'active' then
      raise exception using
        errcode = '22023',
        message = 'a retired activity definition cannot be published';
    end if;

    if lower(v_definition.stable_key) <> lower(btrim(p_stable_key)) then
      raise exception using
        errcode = '22023',
        message = 'the stable key of an activity definition cannot be changed';
    end if;

    if v_definition.current_version <> p_expected_current_version then
      raise exception using
        errcode = '40001',
        message = format(
          'activity definition version conflict: expected %s, current %s',
          p_expected_current_version,
          v_definition.current_version
        );
    end if;

    v_definition_id := v_definition.id;
    v_new_version := v_definition.current_version + 1;
    v_event_type := 'activity_definition.published';
  end if;

  insert into public.activity_definition_versions (
    organization_id,
    activity_definition_id,
    version,
    title,
    description,
    status,
    created_by
  ) values (
    v_organization_id,
    v_definition_id,
    v_new_version,
    btrim(p_title),
    coalesce(p_description, ''),
    'draft',
    v_actor_user_id
  );

  insert into public.activity_result_definitions (
    organization_id,
    activity_definition_id,
    activity_definition_version,
    code,
    label,
    classification,
    sort_order,
    created_by
  )
  select
    v_organization_id,
    v_definition_id,
    v_new_version,
    btrim(result_row.value ->> 'code'),
    btrim(result_row.value ->> 'label'),
    lower(btrim(result_row.value ->> 'classification')),
    coalesce(
      (result_row.value ->> 'sort_order')::integer,
      (result_row.ordinality * 10)::integer
    ),
    v_actor_user_id
  from jsonb_array_elements(p_results) with ordinality
    as result_row(value, ordinality);

  update public.activity_definition_versions version_row
  set
    status = 'published',
    published_at = now(),
    published_by = v_actor_user_id
  where version_row.organization_id = v_organization_id
    and version_row.activity_definition_id = v_definition_id
    and version_row.version = v_new_version;

  if p_activity_definition_id is not null then
    update public.activity_definitions definition
    set
      current_version = v_new_version,
      updated_by = v_actor_user_id
    where definition.organization_id = v_organization_id
      and definition.id = v_definition_id
    returning * into v_definition;
  end if;

  insert into public.activity_definition_events (
    organization_id,
    activity_definition_id,
    activity_definition_version,
    event_type,
    actor_user_id,
    idempotency_key,
    reason,
    payload
  ) values (
    v_organization_id,
    v_definition_id,
    v_new_version,
    v_event_type,
    v_actor_user_id,
    btrim(p_idempotency_key),
    btrim(p_reason),
    jsonb_build_object(
      'stable_key', v_definition.stable_key,
      'title', btrim(p_title),
      'result_count', jsonb_array_length(p_results),
      'previous_version', p_expected_current_version,
      'published_version', v_new_version
    )
  );

  insert into public.processed_commands (
    organization_id,
    idempotency_key,
    command_type,
    request_hash,
    response
  ) values (
    v_organization_id,
    btrim(p_idempotency_key),
    'activity_definition.publish',
    v_request_hash,
    jsonb_build_object(
      'activity_definition_id', v_definition_id,
      'version', v_new_version
    )
  );

  return v_definition;
end;
$$;

create function public.publish_activity_definition(
  p_activity_definition_id uuid,
  p_expected_current_version integer,
  p_stable_key text,
  p_title text,
  p_description text,
  p_results jsonb,
  p_reason text,
  p_idempotency_key text
)
returns public.activity_definitions
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.publish_activity_definition(
    p_activity_definition_id,
    p_expected_current_version,
    p_stable_key,
    p_title,
    p_description,
    p_results,
    p_reason,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.publish_activity_definition(
  uuid, integer, text, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function private.publish_activity_definition(
  uuid, integer, text, text, text, jsonb, text, text
) to authenticated;

revoke all on function public.publish_activity_definition(
  uuid, integer, text, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.publish_activity_definition(
  uuid, integer, text, text, text, jsonb, text, text
) to authenticated;
