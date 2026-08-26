-- Organization-owned document metadata backed by a private Storage bucket.
-- Storage objects are immutable: a client first reserves an exact object path
-- through an audited RPC and may then INSERT that one path through Storage API.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid,
  mentor_id uuid,
  parent_id uuid,
  title text not null,
  category text not null
    check (category in (
      'case_attachment',
      'identity_evidence',
      'consent',
      'agreement',
      'report',
      'course_material',
      'other'
    )),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  current_version integer not null default 1 check (current_version > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint documents_title_not_blank check (btrim(title) <> ''),
  constraint documents_title_length check (char_length(title) <= 200),
  constraint documents_single_primary_context check (
    num_nonnulls(case_id, mentor_id, parent_id) <= 1
  ),
  unique (organization_id, id),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id)
    on delete restrict,
  foreign key (organization_id, mentor_id)
    references public.mentors (organization_id, id)
    on delete restrict,
  foreign key (organization_id, parent_id)
    references public.parents (organization_id, id)
    on delete restrict
);

create index documents_organization_status_updated
  on public.documents (organization_id, status, updated_at desc, id);
create index documents_case
  on public.documents (organization_id, case_id, updated_at desc)
  where case_id is not null;
create index documents_mentor
  on public.documents (organization_id, mentor_id, updated_at desc)
  where mentor_id is not null;
create index documents_parent
  on public.documents (organization_id, parent_id, updated_at desc)
  where parent_id is not null;
create index documents_created_by on public.documents (created_by);
create index documents_updated_by on public.documents (updated_by);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  document_id uuid not null,
  version integer not null check (version > 0),
  storage_bucket text not null default 'organization-documents',
  storage_object_path text not null,
  file_name text not null,
  mime_type text not null,
  expected_size_bytes bigint not null
    check (expected_size_bytes > 0 and expected_size_bytes <= 20971520),
  actual_size_bytes bigint,
  status text not null default 'pending_upload'
    check (status in ('pending_upload', 'available')),
  upload_expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete restrict,
  constraint document_versions_bucket_fixed check (
    storage_bucket = 'organization-documents'
  ),
  constraint document_versions_path_not_blank check (btrim(storage_object_path) <> ''),
  constraint document_versions_file_name_not_blank check (btrim(file_name) <> ''),
  constraint document_versions_file_name_length check (char_length(file_name) <= 255),
  constraint document_versions_mime_type_allowed check (mime_type in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  constraint document_versions_upload_window check (upload_expires_at > created_at),
  constraint document_versions_lifecycle_consistent check (
    (
      status = 'pending_upload'
      and actual_size_bytes is null
      and completed_at is null
      and completed_by is null
    )
    or (
      status = 'available'
      and actual_size_bytes is not null
      and actual_size_bytes > 0
      and completed_at is not null
      and completed_by is not null
    )
  ),
  unique (organization_id, id),
  unique (organization_id, document_id, version),
  unique (storage_bucket, storage_object_path),
  foreign key (organization_id, document_id)
    references public.documents (organization_id, id)
    on delete restrict
);

create index document_versions_document_status
  on public.document_versions (organization_id, document_id, status, version desc);
create index document_versions_pending_expiry
  on public.document_versions (organization_id, upload_expires_at)
  where status = 'pending_upload';
create index document_versions_created_by on public.document_versions (created_by);
create index document_versions_completed_by
  on public.document_versions (completed_by)
  where completed_by is not null;

create table public.document_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  document_id uuid not null,
  document_version_id uuid,
  event_type text not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  constraint document_events_type_not_blank check (btrim(event_type) <> ''),
  constraint document_events_payload_is_object check (jsonb_typeof(payload) = 'object'),
  unique (organization_id, id),
  foreign key (organization_id, document_id)
    references public.documents (organization_id, id)
    on delete cascade,
  foreign key (organization_id, document_version_id)
    references public.document_versions (organization_id, id)
    on delete cascade
);

create index document_events_document_time
  on public.document_events (organization_id, document_id, occurred_at, id);
create index document_events_version
  on public.document_events (organization_id, document_version_id)
  where document_version_id is not null;
create index document_events_actor_user on public.document_events (actor_user_id);
create unique index document_events_idempotency_unique
  on public.document_events (organization_id, idempotency_key)
  where idempotency_key is not null;

create trigger documents_set_updated_at
before update on public.documents
for each row execute function private.set_updated_at();

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_events enable row level security;

create function private.has_document_staff_access(p_organization_id uuid)
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
      and membership.role in ('administrator', 'coordinator', 'handler', 'reader')
      and organization.status = 'active'
  );
$$;

create function private.has_document_read_access(
  p_organization_id uuid,
  p_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents document
    join public.organizations organization
      on organization.id = document.organization_id
    join public.organization_memberships membership
      on membership.organization_id = document.organization_id
      and membership.user_id = (select auth.uid())
    left join public.mentors mentor
      on mentor.organization_id = document.organization_id
      and mentor.id = document.mentor_id
    where document.organization_id = p_organization_id
      and document.id = p_document_id
      and organization.status = 'active'
      and membership.status = 'active'
      and (
        membership.role in ('administrator', 'coordinator', 'handler', 'reader')
        or (
          membership.role = 'mentor'
          and mentor.auth_user_id = membership.user_id
          and document.category in ('agreement', 'course_material', 'other')
        )
      )
  );
$$;

create function private.has_document_version_read_access(
  p_organization_id uuid,
  p_document_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.document_versions document_version
    where document_version.organization_id = p_organization_id
      and document_version.id = p_document_version_id
      and private.has_document_read_access(
        document_version.organization_id,
        document_version.document_id
      )
      and (
        private.has_document_staff_access(document_version.organization_id)
        or document_version.status = 'available'
      )
  );
$$;

create function private.can_upload_document_object(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.document_versions document_version
    join public.organization_memberships membership
      on membership.organization_id = document_version.organization_id
      and membership.user_id = (select auth.uid())
    join public.organizations organization
      on organization.id = document_version.organization_id
    where document_version.storage_object_path = p_object_name
      and document_version.storage_bucket = 'organization-documents'
      and document_version.status = 'pending_upload'
      and document_version.upload_expires_at > now()
      and document_version.created_by = membership.user_id
      and membership.status = 'active'
      and membership.role in ('administrator', 'coordinator', 'handler')
      and organization.status = 'active'
  );
$$;

create function private.can_read_document_object(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.document_versions document_version
    where document_version.storage_object_path = p_object_name
      and document_version.storage_bucket = 'organization-documents'
      and document_version.status = 'available'
      and private.has_document_read_access(
        document_version.organization_id,
        document_version.document_id
      )
  );
$$;

revoke all on function private.has_document_staff_access(uuid)
  from public, anon, authenticated;
revoke all on function private.has_document_read_access(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.has_document_version_read_access(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.can_upload_document_object(text)
  from public, anon, authenticated;
revoke all on function private.can_read_document_object(text)
  from public, anon, authenticated;

grant execute on function private.has_document_staff_access(uuid)
  to authenticated;
grant execute on function private.has_document_read_access(uuid, uuid)
  to authenticated;
grant execute on function private.has_document_version_read_access(uuid, uuid)
  to authenticated;
grant execute on function private.can_upload_document_object(text)
  to authenticated;
grant execute on function private.can_read_document_object(text)
  to authenticated;

create policy documents_select_authorized_member
on public.documents
for select
to authenticated
using ((select private.has_document_read_access(documents.organization_id, documents.id)));

create policy document_versions_select_authorized_member
on public.document_versions
for select
to authenticated
using ((select private.has_document_version_read_access(
  document_versions.organization_id,
  document_versions.id
)));

create policy document_events_select_staff
on public.document_events
for select
to authenticated
using ((select private.has_document_staff_access(document_events.organization_id)));

revoke all on table public.documents from anon, authenticated;
revoke all on table public.document_versions from anon, authenticated;
revoke all on table public.document_events from anon, authenticated;

grant select on table public.documents to authenticated;
grant select on table public.document_versions to authenticated;
grant select on table public.document_events to authenticated;

create function private.create_document_upload(
  p_title text,
  p_category text,
  p_case_id uuid,
  p_mentor_id uuid,
  p_parent_id uuid,
  p_file_name text,
  p_mime_type text,
  p_expected_size_bytes bigint,
  p_idempotency_key text
)
returns public.document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_mime_type text := lower(btrim(coalesce(p_mime_type, '')));
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_document_id uuid := gen_random_uuid();
  v_document_version_id uuid := gen_random_uuid();
  v_document_version public.document_versions%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_title is null or btrim(p_title) = '' or char_length(p_title) > 200
    or v_category not in (
      'case_attachment', 'identity_evidence', 'consent', 'agreement',
      'report', 'course_material', 'other'
    )
    or num_nonnulls(p_case_id, p_mentor_id, p_parent_id) > 1
    or p_file_name is null or btrim(p_file_name) = '' or char_length(p_file_name) > 255
    or v_mime_type not in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    or p_expected_size_bytes is null
    or p_expected_size_bytes < 1
    or p_expected_size_bytes > 20971520
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'valid document metadata, one optional context and idempotency key are required';
  end if;

  if p_case_id is not null and not exists (
    select 1 from public.cases case_row
    where case_row.organization_id = v_organization_id
      and case_row.id = p_case_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'case does not belong to the active organization';
  end if;

  if p_mentor_id is not null and not exists (
    select 1 from public.mentors mentor
    where mentor.organization_id = v_organization_id
      and mentor.id = p_mentor_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'mentor does not belong to the active organization';
  end if;

  if p_parent_id is not null and not exists (
    select 1 from public.parents parent
    where parent.organization_id = v_organization_id
      and parent.id = p_parent_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'parent does not belong to the active organization';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'title', btrim(p_title),
    'category', v_category,
    'case_id', p_case_id,
    'mentor_id', p_mentor_id,
    'parent_id', p_parent_id,
    'file_name', btrim(p_file_name),
    'mime_type', v_mime_type,
    'expected_size_bytes', p_expected_size_bytes
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
    if v_existing_command.command_type <> 'document.create_upload'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select document_version.*
    into v_document_version
    from public.document_versions document_version
    where document_version.organization_id = v_organization_id
      and document_version.id = (v_existing_command.response ->> 'document_version_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent document upload result no longer exists';
    end if;

    return v_document_version;
  end if;

  insert into public.documents (
    id,
    organization_id,
    case_id,
    mentor_id,
    parent_id,
    title,
    category,
    created_by,
    updated_by
  )
  values (
    v_document_id,
    v_organization_id,
    p_case_id,
    p_mentor_id,
    p_parent_id,
    btrim(p_title),
    v_category,
    v_actor_user_id,
    v_actor_user_id
  );

  insert into public.document_versions (
    id,
    organization_id,
    document_id,
    version,
    storage_object_path,
    file_name,
    mime_type,
    expected_size_bytes,
    created_by
  )
  values (
    v_document_version_id,
    v_organization_id,
    v_document_id,
    1,
    v_organization_id::text || '/' || v_document_id::text || '/' || v_document_version_id::text,
    btrim(p_file_name),
    v_mime_type,
    p_expected_size_bytes,
    v_actor_user_id
  )
  returning * into v_document_version;

  insert into public.document_events (
    organization_id,
    document_id,
    document_version_id,
    event_type,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_document_id,
    v_document_version_id,
    'document.upload_reserved',
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'category', v_category,
      'version', 1,
      'mime_type', v_mime_type,
      'expected_size_bytes', p_expected_size_bytes
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
    'document.create_upload',
    v_request_hash,
    jsonb_build_object(
      'document_id', v_document_id,
      'document_version_id', v_document_version_id
    )
  );

  return v_document_version;
end;
$$;

create function private.complete_document_upload(
  p_document_version_id uuid,
  p_idempotency_key text
)
returns public.document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_document_version public.document_versions%rowtype;
  v_actual_size_bytes bigint;
  v_actual_mime_type text;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_document_version_id is null
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using
      errcode = '22023',
      message = 'document version and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'document_version_id', p_document_version_id
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
    if v_existing_command.command_type <> 'document.complete_upload'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;

    select document_version.*
    into v_document_version
    from public.document_versions document_version
    where document_version.organization_id = v_organization_id
      and document_version.id = p_document_version_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'idempotent completed document result no longer exists';
    end if;

    return v_document_version;
  end if;

  select document_version.*
  into v_document_version
  from public.document_versions document_version
  where document_version.organization_id = v_organization_id
    and document_version.id = p_document_version_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'document version not found in the active organization';
  end if;

  if v_document_version.created_by <> v_actor_user_id then
    raise exception using
      errcode = '42501',
      message = 'only the upload reservation actor may complete this upload';
  end if;

  if v_document_version.status <> 'pending_upload' then
    raise exception using
      errcode = '22023',
      message = 'document upload is not pending';
  end if;

  select
    nullif(storage_object.metadata ->> 'size', '')::bigint,
    lower(nullif(storage_object.metadata ->> 'mimetype', ''))
  into v_actual_size_bytes, v_actual_mime_type
  from storage.objects storage_object
  where storage_object.bucket_id = v_document_version.storage_bucket
    and storage_object.name = v_document_version.storage_object_path;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'uploaded Storage object not found';
  end if;

  if v_actual_size_bytes is null
    or v_actual_size_bytes <> v_document_version.expected_size_bytes
    or v_actual_mime_type is null
    or v_actual_mime_type <> v_document_version.mime_type then
    raise exception using
      errcode = '23514',
      message = 'uploaded Storage object does not match reserved size and MIME type';
  end if;

  update public.document_versions
  set
    status = 'available',
    actual_size_bytes = v_actual_size_bytes,
    completed_at = now(),
    completed_by = v_actor_user_id
  where organization_id = v_organization_id
    and id = p_document_version_id
  returning * into v_document_version;

  insert into public.document_events (
    organization_id,
    document_id,
    document_version_id,
    event_type,
    actor_user_id,
    idempotency_key,
    payload
  )
  values (
    v_organization_id,
    v_document_version.document_id,
    v_document_version.id,
    'document.upload_completed',
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'version', v_document_version.version,
      'mime_type', v_document_version.mime_type,
      'actual_size_bytes', v_document_version.actual_size_bytes
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
    'document.complete_upload',
    v_request_hash,
    jsonb_build_object(
      'document_id', v_document_version.document_id,
      'document_version_id', v_document_version.id
    )
  );

  return v_document_version;
end;
$$;

create function public.create_document_upload(
  p_title text,
  p_category text,
  p_case_id uuid,
  p_mentor_id uuid,
  p_parent_id uuid,
  p_file_name text,
  p_mime_type text,
  p_expected_size_bytes bigint,
  p_idempotency_key text
)
returns public.document_versions
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_document_upload(
    p_title,
    p_category,
    p_case_id,
    p_mentor_id,
    p_parent_id,
    p_file_name,
    p_mime_type,
    p_expected_size_bytes,
    p_idempotency_key
  );
end;
$$;

create function public.complete_document_upload(
  p_document_version_id uuid,
  p_idempotency_key text
)
returns public.document_versions
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.complete_document_upload(
    p_document_version_id,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.create_document_upload(
  text, text, uuid, uuid, uuid, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function private.complete_document_upload(uuid, text)
  from public, anon, authenticated;

grant execute on function private.create_document_upload(
  text, text, uuid, uuid, uuid, text, text, bigint, text
) to authenticated;
grant execute on function private.complete_document_upload(uuid, text)
  to authenticated;

revoke all on function public.create_document_upload(
  text, text, uuid, uuid, uuid, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.complete_document_upload(uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_document_upload(
  text, text, uuid, uuid, uuid, text, text, bigint, text
) to authenticated;
grant execute on function public.complete_document_upload(uuid, text)
  to authenticated;

-- Supabase owns the storage schema. Only policies are added; objects themselves
-- must be uploaded, copied, moved and deleted exclusively through Storage API.
create policy organization_documents_insert_reserved_path
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organization-documents'
  and (select private.can_upload_document_object(name))
);

create policy organization_documents_select_authorized
on storage.objects
for select
to authenticated
using (
  bucket_id = 'organization-documents'
  and (select private.can_read_document_object(name))
);
