-- Organization-owned mentors and parents. Auth identities are optional links;
-- no person record can reference a user profile from another organization.

create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  auth_user_id uuid,
  display_name text not null,
  email text,
  phone text,
  status text not null default 'applicant'
    check (status in ('applicant', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint mentors_display_name_not_blank check (btrim(display_name) <> ''),
  constraint mentors_email_not_blank check (email is null or btrim(email) <> ''),
  constraint mentors_phone_not_blank check (phone is null or btrim(phone) <> ''),
  unique (organization_id, id),
  foreign key (organization_id, auth_user_id)
    references public.user_profiles (organization_id, user_id)
    on delete restrict
);

create unique index mentors_organization_auth_user_unique
  on public.mentors (organization_id, auth_user_id)
  where auth_user_id is not null;
create index mentors_organization_status_name
  on public.mentors (organization_id, status, display_name, id);
create index mentors_auth_user
  on public.mentors (auth_user_id)
  where auth_user_id is not null;
create index mentors_created_by on public.mentors (created_by);
create index mentors_updated_by on public.mentors (updated_by);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  auth_user_id uuid,
  display_name text not null,
  email text,
  phone text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint parents_display_name_not_blank check (btrim(display_name) <> ''),
  constraint parents_email_not_blank check (email is null or btrim(email) <> ''),
  constraint parents_phone_not_blank check (phone is null or btrim(phone) <> ''),
  unique (organization_id, id),
  foreign key (organization_id, auth_user_id)
    references public.user_profiles (organization_id, user_id)
    on delete restrict
);

create unique index parents_organization_auth_user_unique
  on public.parents (organization_id, auth_user_id)
  where auth_user_id is not null;
create index parents_organization_status_name
  on public.parents (organization_id, status, display_name, id);
create index parents_auth_user
  on public.parents (auth_user_id)
  where auth_user_id is not null;
create index parents_created_by on public.parents (created_by);
create index parents_updated_by on public.parents (updated_by);

alter table public.cases
  add column mentor_id uuid,
  add column parent_id uuid,
  add constraint cases_mentor_same_organization
    foreign key (organization_id, mentor_id)
    references public.mentors (organization_id, id)
    on delete restrict,
  add constraint cases_parent_same_organization
    foreign key (organization_id, parent_id)
    references public.parents (organization_id, id)
    on delete restrict;

create index cases_organization_mentor
  on public.cases (organization_id, mentor_id, updated_at desc)
  where mentor_id is not null;
create index cases_organization_parent
  on public.cases (organization_id, parent_id, updated_at desc)
  where parent_id is not null;

create table public.person_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  mentor_id uuid,
  parent_id uuid,
  event_type text not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  constraint person_events_exactly_one_person check (
    (mentor_id is not null and parent_id is null)
    or (mentor_id is null and parent_id is not null)
  ),
  constraint person_events_type_not_blank check (btrim(event_type) <> ''),
  constraint person_events_payload_is_object check (jsonb_typeof(payload) = 'object'),
  unique (organization_id, id),
  foreign key (organization_id, mentor_id)
    references public.mentors (organization_id, id)
    on delete cascade,
  foreign key (organization_id, parent_id)
    references public.parents (organization_id, id)
    on delete cascade
);

create index person_events_mentor_time
  on public.person_events (organization_id, mentor_id, occurred_at, id)
  where mentor_id is not null;
create index person_events_parent_time
  on public.person_events (organization_id, parent_id, occurred_at, id)
  where parent_id is not null;
create index person_events_actor_user on public.person_events (actor_user_id);
create unique index person_events_idempotency_unique
  on public.person_events (organization_id, idempotency_key)
  where idempotency_key is not null;

create trigger mentors_set_updated_at
before update on public.mentors
for each row execute function private.set_updated_at();

create trigger parents_set_updated_at
before update on public.parents
for each row execute function private.set_updated_at();

alter table public.mentors enable row level security;
alter table public.parents enable row level security;
alter table public.person_events enable row level security;

create policy mentors_select_active_member
on public.mentors
for select
to authenticated
using ((select private.has_active_organization_access(mentors.organization_id)));

create policy parents_select_active_member
on public.parents
for select
to authenticated
using ((select private.has_active_organization_access(parents.organization_id)));

create policy person_events_select_active_member
on public.person_events
for select
to authenticated
using ((select private.has_active_organization_access(person_events.organization_id)));

revoke all on table public.mentors from anon, authenticated;
revoke all on table public.parents from anon, authenticated;
revoke all on table public.person_events from anon, authenticated;

grant select on table public.mentors to authenticated;
grant select on table public.parents to authenticated;
grant select on table public.person_events to authenticated;

create function private.create_mentor(
  p_display_name text,
  p_email text,
  p_phone text,
  p_status text,
  p_auth_user_id uuid,
  p_idempotency_key text
)
returns public.mentors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_status text := lower(btrim(coalesce(p_status, 'applicant')));
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_mentor public.mentors%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_display_name is null or btrim(p_display_name) = ''
    or v_status not in ('applicant', 'active', 'inactive')
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'display name, valid status and idempotency key are required';
  end if;

  if p_auth_user_id is not null and not exists (
    select 1
    from public.user_profiles profile
    where profile.organization_id = v_organization_id
      and profile.user_id = p_auth_user_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'mentor auth user does not belong to the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'display_name', btrim(p_display_name),
    'email', nullif(lower(btrim(coalesce(p_email, ''))), ''),
    'phone', nullif(btrim(coalesce(p_phone, '')), ''),
    'status', v_status,
    'auth_user_id', p_auth_user_id
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
    if v_existing_command.command_type <> 'mentor.create'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select mentor.*
    into v_mentor
    from public.mentors mentor
    where mentor.organization_id = v_organization_id
      and mentor.id = (v_existing_command.response ->> 'mentor_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent mentor result no longer exists';
    end if;

    return v_mentor;
  end if;

  insert into public.mentors (
    organization_id,
    auth_user_id,
    display_name,
    email,
    phone,
    status,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    p_auth_user_id,
    btrim(p_display_name),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    v_status,
    v_actor_user_id,
    v_actor_user_id
  )
  returning * into v_mentor;

  insert into public.person_events (
    organization_id,
    mentor_id,
    event_type,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_mentor.id,
    'mentor.created',
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object('status', v_mentor.status, 'auth_linked', v_mentor.auth_user_id is not null)
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
    'mentor.create',
    v_request_hash,
    jsonb_build_object('mentor_id', v_mentor.id)
  );

  return v_mentor;
end;
$$;

create function private.create_parent(
  p_display_name text,
  p_email text,
  p_phone text,
  p_status text,
  p_auth_user_id uuid,
  p_idempotency_key text
)
returns public.parents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_status text := lower(btrim(coalesce(p_status, 'active')));
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_parent public.parents%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_display_name is null or btrim(p_display_name) = ''
    or v_status not in ('active', 'inactive')
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'display name, valid status and idempotency key are required';
  end if;

  if p_auth_user_id is not null and not exists (
    select 1
    from public.user_profiles profile
    where profile.organization_id = v_organization_id
      and profile.user_id = p_auth_user_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'parent auth user does not belong to the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'display_name', btrim(p_display_name),
    'email', nullif(lower(btrim(coalesce(p_email, ''))), ''),
    'phone', nullif(btrim(coalesce(p_phone, '')), ''),
    'status', v_status,
    'auth_user_id', p_auth_user_id
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
    if v_existing_command.command_type <> 'parent.create'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select parent.*
    into v_parent
    from public.parents parent
    where parent.organization_id = v_organization_id
      and parent.id = (v_existing_command.response ->> 'parent_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent parent result no longer exists';
    end if;

    return v_parent;
  end if;

  insert into public.parents (
    organization_id,
    auth_user_id,
    display_name,
    email,
    phone,
    status,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    p_auth_user_id,
    btrim(p_display_name),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    v_status,
    v_actor_user_id,
    v_actor_user_id
  )
  returning * into v_parent;

  insert into public.person_events (
    organization_id,
    parent_id,
    event_type,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_parent.id,
    'parent.created',
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object('status', v_parent.status, 'auth_linked', v_parent.auth_user_id is not null)
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
    'parent.create',
    v_request_hash,
    jsonb_build_object('parent_id', v_parent.id)
  );

  return v_parent;
end;
$$;

create function private.link_case_people(
  p_case_id uuid,
  p_expected_version integer,
  p_mentor_id uuid,
  p_parent_id uuid,
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

  if p_case_id is null
    or p_expected_version is null or p_expected_version < 1
    or (p_mentor_id is null and p_parent_id is null)
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'case, expected version, at least one person and idempotency key are required';
  end if;

  if p_mentor_id is not null and not exists (
    select 1
    from public.mentors mentor
    where mentor.organization_id = v_organization_id
      and mentor.id = p_mentor_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'mentor does not belong to the active organization';
  end if;

  if p_parent_id is not null and not exists (
    select 1
    from public.parents parent
    where parent.organization_id = v_organization_id
      and parent.id = p_parent_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'parent does not belong to the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'case_id', p_case_id,
    'expected_version', p_expected_version,
    'mentor_id', p_mentor_id,
    'parent_id', p_parent_id
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
    if v_existing_command.command_type <> 'case.link_people'
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

  select case_row.*
  into v_case
  from public.cases case_row
  where case_row.organization_id = v_organization_id
    and case_row.id = p_case_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'case not found in the active organization';
  end if;

  if v_case.version <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = 'case version conflict';
  end if;

  update public.cases
  set
    mentor_id = p_mentor_id,
    parent_id = p_parent_id,
    version = version + 1,
    updated_by = v_actor_user_id
  where organization_id = v_organization_id
    and id = p_case_id
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
    'case.people_linked',
    'case',
    v_case.id,
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'mentor_id', v_case.mentor_id,
      'parent_id', v_case.parent_id,
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
    'case.link_people',
    v_request_hash,
    jsonb_build_object('case_id', v_case.id, 'version', v_case.version)
  );

  return v_case;
end;
$$;

create function public.create_mentor(
  p_display_name text,
  p_email text,
  p_phone text,
  p_status text,
  p_auth_user_id uuid,
  p_idempotency_key text
)
returns public.mentors
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_mentor(
    p_display_name,
    p_email,
    p_phone,
    p_status,
    p_auth_user_id,
    p_idempotency_key
  );
end;
$$;

create function public.create_parent(
  p_display_name text,
  p_email text,
  p_phone text,
  p_status text,
  p_auth_user_id uuid,
  p_idempotency_key text
)
returns public.parents
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_parent(
    p_display_name,
    p_email,
    p_phone,
    p_status,
    p_auth_user_id,
    p_idempotency_key
  );
end;
$$;

create function public.link_case_people(
  p_case_id uuid,
  p_expected_version integer,
  p_mentor_id uuid,
  p_parent_id uuid,
  p_idempotency_key text
)
returns public.cases
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.link_case_people(
    p_case_id,
    p_expected_version,
    p_mentor_id,
    p_parent_id,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.create_mentor(text, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function private.create_parent(text, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function private.link_case_people(uuid, integer, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function private.create_mentor(text, text, text, text, uuid, text)
  to authenticated;
grant execute on function private.create_parent(text, text, text, text, uuid, text)
  to authenticated;
grant execute on function private.link_case_people(uuid, integer, uuid, uuid, text)
  to authenticated;

revoke all on function public.create_mentor(text, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.create_parent(text, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.link_case_people(uuid, integer, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_mentor(text, text, text, text, uuid, text)
  to authenticated;
grant execute on function public.create_parent(text, text, text, text, uuid, text)
  to authenticated;
grant execute on function public.link_case_people(uuid, integer, uuid, uuid, text)
  to authenticated;
