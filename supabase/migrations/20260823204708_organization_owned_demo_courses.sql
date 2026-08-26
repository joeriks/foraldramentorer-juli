-- Versioned platform course templates are private distribution sources only.
-- Runtime course reads always use organization-owned public rows.

create table private.course_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  content_kind text not null default 'demo'
    check (content_kind in ('demo', 'foundation')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_templates_key_not_blank check (btrim(template_key) <> '')
);

create unique index course_templates_key_unique
  on private.course_templates (lower(template_key));

create table private.course_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references private.course_templates (id) on delete restrict,
  version integer not null check (version > 0),
  title text not null,
  description text not null default '',
  release_notes text not null default '',
  status text not null default 'published'
    check (status in ('published', 'retired')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint course_template_versions_title_not_blank check (btrim(title) <> ''),
  unique (template_id, version),
  unique (template_id, id)
);

create table private.course_template_modules (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null
    references private.course_template_versions (id) on delete restrict,
  stable_key text not null,
  sort_order integer not null check (sort_order >= 0),
  title text not null,
  body_markdown text not null,
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  created_at timestamptz not null default now(),
  constraint course_template_modules_key_not_blank check (btrim(stable_key) <> ''),
  constraint course_template_modules_title_not_blank check (btrim(title) <> ''),
  constraint course_template_modules_body_not_blank check (btrim(body_markdown) <> ''),
  unique (template_version_id, stable_key),
  unique (template_version_id, sort_order)
);

create index course_template_modules_version
  on private.course_template_modules (template_version_id, sort_order);

alter table private.course_templates enable row level security;
alter table private.course_template_versions enable row level security;
alter table private.course_template_modules enable row level security;

create trigger course_templates_set_updated_at
before update on private.course_templates
for each row execute function private.set_updated_at();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  source_template_key text,
  source_template_version integer,
  content_kind text not null default 'operational'
    check (content_kind in ('demo', 'foundation', 'operational')),
  title text not null,
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  current_version integer not null default 1 check (current_version > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint courses_title_not_blank check (btrim(title) <> ''),
  constraint courses_template_source_consistent check (
    (source_template_key is null and source_template_version is null)
    or (
      source_template_key is not null
      and btrim(source_template_key) <> ''
      and source_template_version is not null
      and source_template_version > 0
    )
  ),
  unique (organization_id, id),
  unique (organization_id, source_template_key, source_template_version)
);

create index courses_organization_status
  on public.courses (organization_id, status, updated_at desc);
create index courses_created_by
  on public.courses (created_by);
create index courses_updated_by
  on public.courses (updated_by);

create table public.course_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  course_id uuid not null,
  version integer not null check (version > 0),
  title text not null,
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  source_template_key text,
  source_template_version integer,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  constraint course_versions_title_not_blank check (btrim(title) <> ''),
  constraint course_versions_publication_consistent check (
    (status = 'draft' and published_at is null and published_by is null)
    or (status in ('published', 'retired') and published_at is not null and published_by is not null)
  ),
  constraint course_versions_template_source_consistent check (
    (source_template_key is null and source_template_version is null)
    or (
      source_template_key is not null
      and btrim(source_template_key) <> ''
      and source_template_version is not null
      and source_template_version > 0
    )
  ),
  unique (organization_id, id),
  unique (organization_id, course_id, version),
  foreign key (organization_id, course_id)
    references public.courses (organization_id, id)
    on delete cascade
);

create index course_versions_created_by
  on public.course_versions (created_by);
create index course_versions_published_by
  on public.course_versions (published_by);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  course_version_id uuid not null,
  stable_key text not null,
  sort_order integer not null check (sort_order >= 0),
  title text not null,
  body_markdown text not null,
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  constraint course_modules_key_not_blank check (btrim(stable_key) <> ''),
  constraint course_modules_title_not_blank check (btrim(title) <> ''),
  constraint course_modules_body_not_blank check (btrim(body_markdown) <> ''),
  unique (organization_id, id),
  unique (organization_id, course_version_id, stable_key),
  unique (organization_id, course_version_id, sort_order),
  foreign key (organization_id, course_version_id)
    references public.course_versions (organization_id, id)
    on delete cascade
);

create index course_modules_version_sort
  on public.course_modules (organization_id, course_version_id, sort_order);
create index course_modules_created_by
  on public.course_modules (created_by);

create table public.course_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  course_id uuid not null,
  type text not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  constraint course_events_type_not_blank check (btrim(type) <> ''),
  constraint course_events_payload_is_object check (jsonb_typeof(payload) = 'object'),
  unique (organization_id, id),
  foreign key (organization_id, course_id)
    references public.courses (organization_id, id)
    on delete cascade
);

create index course_events_course_time
  on public.course_events (organization_id, course_id, occurred_at, id);
create index course_events_actor_user
  on public.course_events (actor_user_id);
create unique index course_events_idempotency_unique
  on public.course_events (organization_id, idempotency_key)
  where idempotency_key is not null;

create trigger courses_set_updated_at
before update on public.courses
for each row execute function private.set_updated_at();

alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_events enable row level security;

create policy courses_select_active_member
on public.courses
for select
to authenticated
using ((select private.has_active_organization_access(courses.organization_id)));

create policy course_versions_select_active_member
on public.course_versions
for select
to authenticated
using ((select private.has_active_organization_access(course_versions.organization_id)));

create policy course_modules_select_active_member
on public.course_modules
for select
to authenticated
using ((select private.has_active_organization_access(course_modules.organization_id)));

create policy course_events_select_active_member
on public.course_events
for select
to authenticated
using ((select private.has_active_organization_access(course_events.organization_id)));

revoke all on table public.courses from anon, authenticated;
revoke all on table public.course_versions from anon, authenticated;
revoke all on table public.course_modules from anon, authenticated;
revoke all on table public.course_events from anon, authenticated;

grant select on table public.courses to authenticated;
grant select on table public.course_versions to authenticated;
grant select on table public.course_modules to authenticated;
grant select on table public.course_events to authenticated;

create function private.list_available_course_templates()
returns table (
  template_key text,
  content_kind text,
  title text,
  description text,
  latest_version integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform 1
  from private.require_active_membership(
    array['administrator', 'coordinator']::text[]
  );

  return query
  select
    template.template_key,
    template.content_kind,
    latest.title,
    latest.description,
    latest.version
  from private.course_templates template
  cross join lateral (
    select template_version.title, template_version.description, template_version.version
    from private.course_template_versions template_version
    where template_version.template_id = template.id
      and template_version.status = 'published'
    order by template_version.version desc
    limit 1
  ) latest
  where template.active
  order by template.template_key;
end;
$$;

create function private.install_course_template(
  p_template_key text,
  p_template_version integer,
  p_idempotency_key text
)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_template private.course_templates%rowtype;
  v_template_version private.course_template_versions%rowtype;
  v_course public.courses%rowtype;
  v_course_version_id uuid;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator']::text[]
  ) membership;

  if p_template_key is null or btrim(p_template_key) = ''
    or p_template_version is null or p_template_version < 1
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'template key, positive template version and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'template_key', lower(btrim(p_template_key)),
    'template_version', p_template_version
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
    if v_existing_command.command_type <> 'course_template.install'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select course.*
    into v_course
    from public.courses course
    where course.organization_id = v_organization_id
      and course.id = (v_existing_command.response ->> 'course_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent course result no longer exists';
    end if;

    return v_course;
  end if;

  select template.*
  into v_template
  from private.course_templates template
  where lower(template.template_key) = lower(btrim(p_template_key))
    and template.active;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'active course template not found';
  end if;

  select template_version.*
  into v_template_version
  from private.course_template_versions template_version
  where template_version.template_id = v_template.id
    and template_version.version = p_template_version
    and template_version.status = 'published';

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'published course template version not found';
  end if;

  if not exists (
    select 1
    from private.course_template_modules template_module
    where template_module.template_version_id = v_template_version.id
  ) then
    raise exception using
      errcode = '23514',
      message = 'course template version must contain at least one module';
  end if;

  insert into public.courses (
    organization_id,
    source_template_key,
    source_template_version,
    content_kind,
    title,
    description,
    status,
    current_version,
    created_by,
    updated_by
  )
  values (
    v_organization_id,
    v_template.template_key,
    v_template_version.version,
    v_template.content_kind,
    v_template_version.title,
    v_template_version.description,
    'published',
    1,
    v_actor_user_id,
    v_actor_user_id
  )
  returning * into v_course;

  insert into public.course_versions (
    organization_id,
    course_id,
    version,
    title,
    description,
    status,
    source_template_key,
    source_template_version,
    created_by,
    published_at,
    published_by
  )
  values (
    v_organization_id,
    v_course.id,
    1,
    v_template_version.title,
    v_template_version.description,
    'published',
    v_template.template_key,
    v_template_version.version,
    v_actor_user_id,
    now(),
    v_actor_user_id
  )
  returning id into v_course_version_id;

  insert into public.course_modules (
    organization_id,
    course_version_id,
    stable_key,
    sort_order,
    title,
    body_markdown,
    estimated_minutes,
    created_by
  )
  select
    v_organization_id,
    v_course_version_id,
    template_module.stable_key,
    template_module.sort_order,
    template_module.title,
    template_module.body_markdown,
    template_module.estimated_minutes,
    v_actor_user_id
  from private.course_template_modules template_module
  where template_module.template_version_id = v_template_version.id
  order by template_module.sort_order;

  insert into public.course_events (
    organization_id,
    course_id,
    type,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_course.id,
    'course_template.installed',
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'template_key', v_template.template_key,
      'template_version', v_template_version.version,
      'course_version', 1,
      'content_kind', v_template.content_kind
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
    'course_template.install',
    v_request_hash,
    jsonb_build_object('course_id', v_course.id, 'course_version', 1)
  );

  return v_course;
end;
$$;

create function public.list_available_course_templates()
returns table (
  template_key text,
  content_kind text,
  title text,
  description text,
  latest_version integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return query
  select * from private.list_available_course_templates();
end;
$$;

create function public.install_course_template(
  p_template_key text,
  p_template_version integer,
  p_idempotency_key text
)
returns public.courses
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.install_course_template(
    p_template_key,
    p_template_version,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.list_available_course_templates()
  from public, anon, authenticated;
revoke all on function private.install_course_template(text, integer, text)
  from public, anon, authenticated;
grant execute on function private.list_available_course_templates()
  to authenticated;
grant execute on function private.install_course_template(text, integer, text)
  to authenticated;

revoke all on function public.list_available_course_templates()
  from public, anon, authenticated;
revoke all on function public.install_course_template(text, integer, text)
  from public, anon, authenticated;
grant execute on function public.list_available_course_templates()
  to authenticated;
grant execute on function public.install_course_template(text, integer, text)
  to authenticated;
