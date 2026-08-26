-- Organization-owned, versioned activity/result definitions.
--
-- Every case activity freezes the exact definition version it was created
-- from. The completion command derives classification from that frozen
-- version; p_classification remains only for backwards API compatibility and
-- is never trusted for storage or audit data.

create table public.activity_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  stable_key text not null,
  status text not null default 'active'
    check (status in ('active', 'retired')),
  is_default boolean not null default false,
  current_version integer not null check (current_version > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint activity_definitions_stable_key_not_blank
    check (btrim(stable_key) <> ''),
  unique (organization_id, id)
);

create unique index activity_definitions_stable_key_unique
  on public.activity_definitions (organization_id, lower(stable_key));
create unique index activity_definitions_one_default
  on public.activity_definitions (organization_id)
  where is_default;
create index activity_definitions_created_by
  on public.activity_definitions (created_by);
create index activity_definitions_updated_by
  on public.activity_definitions (updated_by);

create table public.activity_definition_versions (
  organization_id uuid not null,
  activity_definition_id uuid not null,
  version integer not null check (version > 0),
  title text not null,
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  primary key (organization_id, activity_definition_id, version),
  foreign key (organization_id, activity_definition_id)
    references public.activity_definitions (organization_id, id)
    on delete restrict,
  constraint activity_definition_versions_title_not_blank
    check (btrim(title) <> ''),
  constraint activity_definition_versions_publication_consistent check (
    (status = 'draft' and published_at is null and published_by is null)
    or (status = 'published' and published_at is not null and published_by is not null)
  )
);

create index activity_definition_versions_created_by
  on public.activity_definition_versions (created_by);
create index activity_definition_versions_published_by
  on public.activity_definition_versions (published_by);

alter table public.activity_definitions
  add constraint activity_definitions_current_version_fkey
  foreign key (organization_id, id, current_version)
  references public.activity_definition_versions (
    organization_id,
    activity_definition_id,
    version
  )
  on delete restrict
  deferrable initially deferred;

create table public.activity_result_definitions (
  organization_id uuid not null,
  activity_definition_id uuid not null,
  activity_definition_version integer not null,
  code text not null,
  label text not null,
  classification text not null
    check (classification in ('accepted', 'deviation')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  primary key (
    organization_id,
    activity_definition_id,
    activity_definition_version,
    code
  ),
  foreign key (
    organization_id,
    activity_definition_id,
    activity_definition_version
  ) references public.activity_definition_versions (
    organization_id,
    activity_definition_id,
    version
  ) on delete restrict,
  constraint activity_result_definitions_code_not_blank
    check (btrim(code) <> ''),
  constraint activity_result_definitions_label_not_blank
    check (btrim(label) <> '')
);

create index activity_result_definitions_created_by
  on public.activity_result_definitions (created_by);

create trigger activity_definitions_set_updated_at
before update on public.activity_definitions
for each row execute function private.set_updated_at();

create function private.prevent_published_activity_definition_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'activity_definition_versions' then
    if old.status = 'published' then
      raise exception using
        errcode = '55000',
        message = 'published activity definition versions are immutable';
    end if;

    if tg_op = 'UPDATE'
      and old.status = 'draft'
      and new.status = 'published'
      and not exists (
        select 1
        from public.activity_result_definitions result_definition
        where result_definition.organization_id = new.organization_id
          and result_definition.activity_definition_id = new.activity_definition_id
          and result_definition.activity_definition_version = new.version
      ) then
      raise exception using
        errcode = '23514',
        message = 'an activity definition version requires at least one result before publication';
    end if;

    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if exists (
    select 1
    from public.activity_definition_versions version_row
    where version_row.organization_id = old.organization_id
      and version_row.activity_definition_id = old.activity_definition_id
      and version_row.version = old.activity_definition_version
      and version_row.status = 'published'
  ) then
    raise exception using
      errcode = '55000',
      message = 'results of a published activity definition version are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create function private.prevent_result_insert_into_published_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.activity_definition_versions version_row
    where version_row.organization_id = new.organization_id
      and version_row.activity_definition_id = new.activity_definition_id
      and version_row.version = new.activity_definition_version
      and version_row.status = 'published'
  ) then
    raise exception using
      errcode = '55000',
      message = 'results cannot be added to a published activity definition version';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_published_activity_definition_change()
  from public, anon, authenticated;
revoke all on function private.prevent_result_insert_into_published_definition()
  from public, anon, authenticated;

create trigger activity_definition_versions_immutable_when_published
before update or delete on public.activity_definition_versions
for each row execute function private.prevent_published_activity_definition_change();

create trigger activity_result_definitions_immutable_when_published
before update or delete on public.activity_result_definitions
for each row execute function private.prevent_published_activity_definition_change();

create trigger activity_result_definitions_no_insert_when_published
before insert on public.activity_result_definitions
for each row execute function private.prevent_result_insert_into_published_definition();

create function private.ensure_current_activity_definition_version_is_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.activity_definition_versions version_row
    where version_row.organization_id = new.organization_id
      and version_row.activity_definition_id = new.id
      and version_row.version = new.current_version
      and version_row.status = 'published'
  ) then
    raise exception using
      errcode = '23514',
      message = 'the current activity definition version must be published';
  end if;

  return new;
end;
$$;

revoke all on function private.ensure_current_activity_definition_version_is_published()
  from public, anon, authenticated;

create constraint trigger activity_definitions_current_version_published
after insert or update on public.activity_definitions
deferrable initially deferred
for each row execute function private.ensure_current_activity_definition_version_is_published();

create function private.ensure_default_activity_definition(
  p_organization_id uuid,
  p_actor_user_id uuid
)
returns table (
  resolved_activity_definition_id uuid,
  resolved_activity_definition_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition_id uuid;
  v_version integer;
begin
  if p_organization_id is null or p_actor_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'organization and actor are required for the default activity definition';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'activity-definition-default:' || p_organization_id::text,
    0
  ));

  select definition.id, definition.current_version
  into v_definition_id, v_version
  from public.activity_definitions definition
  where definition.organization_id = p_organization_id
    and definition.is_default;

  if found then
    return query select v_definition_id, v_version;
    return;
  end if;

  v_definition_id := gen_random_uuid();
  v_version := 1;

  insert into public.activity_definitions (
    id,
    organization_id,
    stable_key,
    is_default,
    current_version,
    created_by,
    updated_by
  ) values (
    v_definition_id,
    p_organization_id,
    'ad-hoc-activity',
    true,
    v_version,
    p_actor_user_id,
    p_actor_user_id
  );

  insert into public.activity_definition_versions (
    organization_id,
    activity_definition_id,
    version,
    title,
    description,
    status,
    created_by
  ) values (
    p_organization_id,
    v_definition_id,
    v_version,
    'Allmän aktivitet',
    'Organisationsägd standarddefinition för fria aktiviteter.',
    'draft',
    p_actor_user_id
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
  ) values
    (
      p_organization_id, v_definition_id, v_version,
      'completed-as-planned', 'Genomförd enligt plan', 'accepted', 10,
      p_actor_user_id
    ),
    (
      p_organization_id, v_definition_id, v_version,
      'completed-with-adjustments', 'Genomförd med anpassning', 'accepted', 20,
      p_actor_user_id
    ),
    (
      p_organization_id, v_definition_id, v_version,
      'not-completed', 'Kunde inte genomföras', 'deviation', 30,
      p_actor_user_id
    );

  update public.activity_definition_versions
  set
    status = 'published',
    published_at = now(),
    published_by = p_actor_user_id
  where organization_id = p_organization_id
    and activity_definition_id = v_definition_id
    and version = v_version;

  return query select v_definition_id, v_version;
end;
$$;

revoke all on function private.ensure_default_activity_definition(uuid, uuid)
  from public, anon, authenticated;

create function private.provision_default_activity_definition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    perform *
    from private.ensure_default_activity_definition(new.id, new.created_by);
  end if;
  return new;
end;
$$;

revoke all on function private.provision_default_activity_definition()
  from public, anon, authenticated;

create trigger organizations_provision_default_activity_definition
after insert on public.organizations
for each row execute function private.provision_default_activity_definition();

alter table public.case_activities
  add column activity_definition_id uuid,
  add column activity_definition_version integer;

do $$
declare
  organization_row record;
begin
  for organization_row in
    select organization.id, organization.created_by
    from public.organizations organization
  loop
    if organization_row.created_by is not null then
      perform *
      from private.ensure_default_activity_definition(
        organization_row.id,
        organization_row.created_by
      );
    end if;
  end loop;
end;
$$;

update public.case_activities activity
set
  activity_definition_id = definition.id,
  activity_definition_version = definition.current_version
from public.activity_definitions definition
where definition.organization_id = activity.organization_id
  and definition.is_default
  and activity.activity_definition_id is null;

alter table public.case_activities
  alter column activity_definition_id set not null,
  alter column activity_definition_version set not null,
  add constraint case_activities_definition_version_fkey
    foreign key (
      organization_id,
      activity_definition_id,
      activity_definition_version
    ) references public.activity_definition_versions (
      organization_id,
      activity_definition_id,
      version
    ) on delete restrict,
  add constraint case_activities_result_definition_fkey
    foreign key (
      organization_id,
      activity_definition_id,
      activity_definition_version,
      result_code
    ) references public.activity_result_definitions (
      organization_id,
      activity_definition_id,
      activity_definition_version,
      code
    ) on delete restrict,
  add constraint case_activities_classification_valid
    check (classification is null or classification in ('accepted', 'deviation'));

create index case_activities_definition_version
  on public.case_activities (
    organization_id,
    activity_definition_id,
    activity_definition_version
  );

create function private.assign_default_activity_definition()
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
  end if;

  return new;
end;
$$;

revoke all on function private.assign_default_activity_definition()
  from public, anon, authenticated;

create trigger case_activities_assign_default_definition
before insert on public.case_activities
for each row execute function private.assign_default_activity_definition();

alter table public.activity_definitions enable row level security;
alter table public.activity_definition_versions enable row level security;
alter table public.activity_result_definitions enable row level security;

create policy activity_definitions_select_active_member
on public.activity_definitions
for select
to authenticated
using ((select private.has_active_organization_access(activity_definitions.organization_id)));

create policy activity_definition_versions_select_active_member
on public.activity_definition_versions
for select
to authenticated
using ((select private.has_active_organization_access(activity_definition_versions.organization_id)));

create policy activity_result_definitions_select_active_member
on public.activity_result_definitions
for select
to authenticated
using ((select private.has_active_organization_access(activity_result_definitions.organization_id)));

revoke all on table public.activity_definitions from anon, authenticated;
revoke all on table public.activity_definition_versions from anon, authenticated;
revoke all on table public.activity_result_definitions from anon, authenticated;

grant select on table public.activity_definitions to authenticated;
grant select on table public.activity_definition_versions to authenticated;
grant select on table public.activity_result_definitions to authenticated;

create or replace function private.complete_case_activity(
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
  v_derived_classification text;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_activity public.case_activities%rowtype;
begin
  -- Kept in the public RPC signature during the client migration. Explicitly
  -- discard it so only the frozen database definition controls classification.
  perform p_classification;

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

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key),
    0
  ));

  select activity.*
  into v_activity
  from public.case_activities activity
  where activity.organization_id = v_organization_id
    and activity.id = p_activity_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'activity not found in the active organization';
  end if;

  select result_definition.classification
  into v_derived_classification
  from public.activity_result_definitions result_definition
  where result_definition.organization_id = v_organization_id
    and result_definition.activity_definition_id = v_activity.activity_definition_id
    and result_definition.activity_definition_version = v_activity.activity_definition_version
    and result_definition.code = btrim(p_result_code);

  if not found then
    raise exception using
      errcode = '22023',
      message = 'result is not valid for the activity definition version';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'activity_id', p_activity_id,
    'expected_version', p_expected_version,
    'result_code', btrim(p_result_code),
    'classification', v_derived_classification
  )::text);

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
    classification = v_derived_classification,
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
  ) values (
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
  ) values (
    v_organization_id,
    btrim(p_idempotency_key),
    'case_activity.complete',
    v_request_hash,
    jsonb_build_object('activity_id', v_activity.id, 'version', v_activity.version)
  );

  return v_activity;
end;
$$;
