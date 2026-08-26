-- Complete the first case-workspace slice with append-only descriptions and
-- notes plus an explicit deviation/decision workflow. All client writes cross
-- versioned, idempotent RPC boundaries; exposed tables remain read-only.

create table public.case_description_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid not null,
  version integer not null check (version > 0),
  text text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (organization_id, id),
  unique (organization_id, case_id, version),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id) on delete cascade
);

create index case_description_versions_case_time
  on public.case_description_versions (organization_id, case_id, version desc);
create index case_description_versions_created_by
  on public.case_description_versions (created_by);

create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid not null,
  note_id uuid not null default gen_random_uuid(),
  target_type text not null check (target_type in ('case', 'activity')),
  target_id uuid,
  text text not null,
  version integer not null check (version > 0),
  supersedes_version_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  constraint case_notes_text_not_blank check (btrim(text) <> ''),
  constraint case_notes_target_consistent check (
    (target_type = 'case' and target_id is null)
    or (target_type = 'activity' and target_id is not null)
  ),
  unique (organization_id, id),
  unique (organization_id, note_id, version),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id) on delete cascade,
  foreign key (organization_id, supersedes_version_id)
    references public.case_notes (organization_id, id) on delete restrict
);

create index case_notes_case_time
  on public.case_notes (organization_id, case_id, created_at desc, id);
create index case_notes_logical_version
  on public.case_notes (organization_id, note_id, version desc);
create index case_notes_supersedes
  on public.case_notes (organization_id, supersedes_version_id)
  where supersedes_version_id is not null;
create index case_notes_created_by
  on public.case_notes (created_by);

create table public.activity_deviations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  case_id uuid not null,
  activity_id uuid not null,
  result_code text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'superseded')),
  version integer not null default 1 check (version > 0),
  opened_at timestamptz not null default now(),
  opened_by uuid not null references auth.users (id) on delete restrict,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete restrict,
  active_decision_id uuid,
  constraint activity_deviations_result_not_blank check (btrim(result_code) <> ''),
  constraint activity_deviations_resolution_consistent check (
    (status = 'open' and resolved_at is null and resolved_by is null and active_decision_id is null)
    or (status in ('resolved', 'superseded') and resolved_at is not null and resolved_by is not null)
  ),
  unique (organization_id, id),
  foreign key (organization_id, case_id)
    references public.cases (organization_id, id) on delete cascade,
  foreign key (organization_id, activity_id)
    references public.case_activities (organization_id, id) on delete restrict
);

create unique index activity_deviations_one_open_per_activity
  on public.activity_deviations (organization_id, activity_id)
  where status = 'open';
create index activity_deviations_case_status
  on public.activity_deviations (organization_id, case_id, status, opened_at desc);
create index activity_deviations_active_decision
  on public.activity_deviations (organization_id, active_decision_id)
  where active_decision_id is not null;
create index activity_deviations_opened_by
  on public.activity_deviations (opened_by);
create index activity_deviations_resolved_by
  on public.activity_deviations (resolved_by)
  where resolved_by is not null;

create table public.deviation_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  deviation_id uuid not null,
  outcome text not null
    check (outcome in ('continue', 'request_supplement', 'pause_case', 'close_case')),
  reason_code text not null,
  note text not null,
  resume_at date,
  supersedes_decision_id uuid,
  decided_at timestamptz not null default now(),
  decided_by uuid not null references auth.users (id) on delete restrict,
  constraint deviation_decisions_reason_not_blank check (btrim(reason_code) <> ''),
  constraint deviation_decisions_note_not_blank check (btrim(note) <> ''),
  unique (organization_id, id),
  foreign key (organization_id, deviation_id)
    references public.activity_deviations (organization_id, id) on delete cascade,
  foreign key (organization_id, supersedes_decision_id)
    references public.deviation_decisions (organization_id, id) on delete restrict
);

create index deviation_decisions_deviation_time
  on public.deviation_decisions (organization_id, deviation_id, decided_at desc, id);
create index deviation_decisions_supersedes
  on public.deviation_decisions (organization_id, supersedes_decision_id)
  where supersedes_decision_id is not null;
create index deviation_decisions_decided_by
  on public.deviation_decisions (decided_by);

alter table public.activity_deviations
  add constraint activity_deviations_active_decision_fkey
  foreign key (organization_id, active_decision_id)
  references public.deviation_decisions (organization_id, id) on delete restrict;

alter table public.case_description_versions enable row level security;
alter table public.case_notes enable row level security;
alter table public.activity_deviations enable row level security;
alter table public.deviation_decisions enable row level security;

create policy case_description_versions_select_active_member
on public.case_description_versions
for select
to authenticated
using ((select private.has_active_organization_access(case_description_versions.organization_id)));

create policy case_notes_select_active_member
on public.case_notes
for select
to authenticated
using ((select private.has_active_organization_access(case_notes.organization_id)));

create policy activity_deviations_select_active_member
on public.activity_deviations
for select
to authenticated
using ((select private.has_active_organization_access(activity_deviations.organization_id)));

create policy deviation_decisions_select_active_member
on public.deviation_decisions
for select
to authenticated
using ((select private.has_active_organization_access(deviation_decisions.organization_id)));

revoke all on table public.case_description_versions from anon, authenticated;
revoke all on table public.case_notes from anon, authenticated;
revoke all on table public.activity_deviations from anon, authenticated;
revoke all on table public.deviation_decisions from anon, authenticated;

grant select on table public.case_description_versions to authenticated;
grant select on table public.case_notes to authenticated;
grant select on table public.activity_deviations to authenticated;
grant select on table public.deviation_decisions to authenticated;

-- Existing cases gain a first immutable description snapshot. The trigger does
-- the same for every case created after this migration.
insert into public.case_description_versions (
  organization_id,
  case_id,
  version,
  text,
  created_at,
  created_by
)
select
  case_row.organization_id,
  case_row.id,
  1,
  case_row.description,
  case_row.created_at,
  case_row.created_by
from public.cases case_row;

create function private.capture_initial_case_description()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.case_description_versions (
    organization_id,
    case_id,
    version,
    text,
    created_at,
    created_by
  ) values (
    new.organization_id,
    new.id,
    1,
    new.description,
    new.created_at,
    new.created_by
  );
  return new;
end;
$$;

revoke all on function private.capture_initial_case_description()
  from public, anon, authenticated;

create trigger cases_capture_initial_description
after insert on public.cases
for each row execute function private.capture_initial_case_description();

-- A deviation is a database-owned consequence of the frozen result catalog;
-- the browser cannot decide whether a result is a deviation.
create function private.open_deviation_for_completed_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deviation public.activity_deviations%rowtype;
begin
  if old.status not in ('completed', 'cancelled')
    and new.status = 'completed'
    and new.classification = 'deviation' then
    insert into public.activity_deviations (
      organization_id,
      case_id,
      activity_id,
      result_code,
      opened_by
    ) values (
      new.organization_id,
      new.case_id,
      new.id,
      new.result_code,
      new.updated_by
    )
    returning * into v_deviation;

    insert into public.case_events (
      organization_id,
      case_id,
      type,
      entity_type,
      entity_id,
      actor_user_id,
      payload
    ) values (
      new.organization_id,
      new.case_id,
      'deviation.opened',
      'deviation',
      v_deviation.id,
      new.updated_by,
      jsonb_build_object(
        'activity_id', new.id,
        'result_code', new.result_code,
        'deviation_version', v_deviation.version
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.open_deviation_for_completed_activity()
  from public, anon, authenticated;

create trigger case_activities_open_deviation
after update of status, result_code, classification on public.case_activities
for each row execute function private.open_deviation_for_completed_activity();

create function private.update_case_description(
  p_case_id uuid,
  p_expected_case_version integer,
  p_text text,
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
  v_description_version integer;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_case_id is null
    or p_expected_case_version is null or p_expected_case_version < 1
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using errcode = '22023',
      message = 'case, expected version and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'case_id', p_case_id,
    'expected_case_version', p_expected_case_version,
    'text', coalesce(p_text, '')
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key), 0
  ));

  select command.* into v_existing_command
  from public.processed_commands command
  where command.organization_id = v_organization_id
    and command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'case.description.update'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;
    select case_row.* into v_case
    from public.cases case_row
    where case_row.organization_id = v_organization_id
      and case_row.id = p_case_id;
    return v_case;
  end if;

  select case_row.* into v_case
  from public.cases case_row
  where case_row.organization_id = v_organization_id
    and case_row.id = p_case_id
  for update;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'case not found in the active organization';
  end if;
  if v_case.version <> p_expected_case_version then
    raise exception using errcode = '40001',
      message = format('case version conflict: expected %s, current %s', p_expected_case_version, v_case.version);
  end if;
  if v_case.status = 'closed' then
    raise exception using errcode = '22023',
      message = 'a closed case description cannot be changed';
  end if;

  select coalesce(max(description.version), 0) + 1
  into v_description_version
  from public.case_description_versions description
  where description.organization_id = v_organization_id
    and description.case_id = p_case_id;

  insert into public.case_description_versions (
    organization_id, case_id, version, text, created_by
  ) values (
    v_organization_id, p_case_id, v_description_version, coalesce(p_text, ''), v_actor_user_id
  );

  update public.cases
  set description = coalesce(p_text, ''),
      version = version + 1,
      updated_by = v_actor_user_id
  where organization_id = v_organization_id and id = p_case_id
  returning * into v_case;

  insert into public.case_events (
    organization_id, case_id, type, entity_type, entity_id,
    actor_user_id, idempotency_key, payload
  ) values (
    v_organization_id, p_case_id, 'case.description_updated', 'case', p_case_id,
    v_actor_user_id, btrim(p_idempotency_key),
    jsonb_build_object('description_version', v_description_version, 'case_version', v_case.version)
  );

  insert into public.processed_commands (
    organization_id, idempotency_key, command_type, request_hash, response
  ) values (
    v_organization_id, btrim(p_idempotency_key), 'case.description.update', v_request_hash,
    jsonb_build_object('case_id', p_case_id, 'case_version', v_case.version, 'description_version', v_description_version)
  );

  return v_case;
end;
$$;

create function private.save_case_note(
  p_case_id uuid,
  p_expected_case_version integer,
  p_note_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_text text,
  p_supersedes_version_id uuid,
  p_idempotency_key text
)
returns public.case_notes
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
  v_previous public.case_notes%rowtype;
  v_note public.case_notes%rowtype;
  v_note_id uuid;
  v_note_version integer;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_case_id is null
    or p_expected_case_version is null or p_expected_case_version < 1
    or lower(btrim(p_target_type)) not in ('case', 'activity')
    or p_text is null or btrim(p_text) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using errcode = '22023',
      message = 'case, expected version, valid target, text and idempotency key are required';
  end if;
  if (lower(btrim(p_target_type)) = 'case' and p_target_id is not null)
    or (lower(btrim(p_target_type)) = 'activity' and p_target_id is null) then
    raise exception using errcode = '22023', message = 'note target is inconsistent';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'case_id', p_case_id,
    'expected_case_version', p_expected_case_version,
    'note_id', p_note_id,
    'target_type', lower(btrim(p_target_type)),
    'target_id', p_target_id,
    'text', btrim(p_text),
    'supersedes_version_id', p_supersedes_version_id
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key), 0
  ));

  select command.* into v_existing_command
  from public.processed_commands command
  where command.organization_id = v_organization_id
    and command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'case_note.save'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;
    select note.* into v_note
    from public.case_notes note
    where note.organization_id = v_organization_id
      and note.id = (v_existing_command.response ->> 'note_version_id')::uuid;
    return v_note;
  end if;

  v_note_id := coalesce(p_note_id, gen_random_uuid());

  select case_row.* into v_case
  from public.cases case_row
  where case_row.organization_id = v_organization_id
    and case_row.id = p_case_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'case not found in the active organization';
  end if;
  if v_case.version <> p_expected_case_version then
    raise exception using errcode = '40001',
      message = format('case version conflict: expected %s, current %s', p_expected_case_version, v_case.version);
  end if;
  if v_case.status = 'closed' then
    raise exception using errcode = '22023', message = 'notes cannot be added to a closed case';
  end if;

  if lower(btrim(p_target_type)) = 'activity' and not exists (
    select 1 from public.case_activities activity
    where activity.organization_id = v_organization_id
      and activity.case_id = p_case_id
      and activity.id = p_target_id
  ) then
    raise exception using errcode = '23503',
      message = 'note activity does not belong to the case';
  end if;

  if p_supersedes_version_id is null then
    if p_note_id is not null or exists (
      select 1 from public.case_notes note
      where note.organization_id = v_organization_id and note.note_id = v_note_id
    ) then
      raise exception using errcode = '22023', message = 'a new note must use a new server-generated note id';
    end if;
    v_note_version := 1;
  else
    select note.* into v_previous
    from public.case_notes note
    where note.organization_id = v_organization_id
      and note.case_id = p_case_id
      and note.id = p_supersedes_version_id
    for update;
    if not found or p_note_id is null or v_previous.note_id <> p_note_id then
      raise exception using errcode = '22023', message = 'superseded note version is invalid';
    end if;
    if exists (
      select 1 from public.case_notes newer
      where newer.organization_id = v_organization_id
        and newer.supersedes_version_id = v_previous.id
    ) then
      raise exception using errcode = '40001', message = 'note version conflict: the selected version was already corrected';
    end if;
    if v_previous.target_type <> lower(btrim(p_target_type))
      or v_previous.target_id is distinct from p_target_id then
      raise exception using errcode = '22023', message = 'a correction cannot change the note target';
    end if;
    v_note_version := v_previous.version + 1;
  end if;

  insert into public.case_notes (
    organization_id, case_id, note_id, target_type, target_id, text,
    version, supersedes_version_id, created_by
  ) values (
    v_organization_id, p_case_id, v_note_id, lower(btrim(p_target_type)), p_target_id,
    btrim(p_text), v_note_version, p_supersedes_version_id, v_actor_user_id
  ) returning * into v_note;

  update public.cases
  set version = version + 1, updated_by = v_actor_user_id
  where organization_id = v_organization_id and id = p_case_id
  returning * into v_case;

  insert into public.case_events (
    organization_id, case_id, type, entity_type, entity_id,
    actor_user_id, idempotency_key, payload
  ) values (
    v_organization_id, p_case_id,
    case when p_supersedes_version_id is null then 'case_note.created' else 'case_note.corrected' end,
    'case_note', v_note.id, v_actor_user_id, btrim(p_idempotency_key),
    jsonb_build_object('note_id', v_note.note_id, 'note_version', v_note.version, 'case_version', v_case.version)
  );

  insert into public.processed_commands (
    organization_id, idempotency_key, command_type, request_hash, response
  ) values (
    v_organization_id, btrim(p_idempotency_key), 'case_note.save', v_request_hash,
    jsonb_build_object('note_version_id', v_note.id, 'note_id', v_note.note_id, 'case_version', v_case.version)
  );

  return v_note;
end;
$$;

create function private.decide_activity_deviation(
  p_deviation_id uuid,
  p_expected_deviation_version integer,
  p_expected_case_version integer,
  p_outcome text,
  p_reason_code text,
  p_note text,
  p_resume_at date,
  p_follow_up_title text,
  p_idempotency_key text
)
returns public.deviation_decisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_actor_user_id uuid;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_deviation public.activity_deviations%rowtype;
  v_case public.cases%rowtype;
  v_decision public.deviation_decisions%rowtype;
  v_follow_up public.case_activities%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  if p_deviation_id is null
    or p_expected_deviation_version is null or p_expected_deviation_version < 1
    or p_expected_case_version is null or p_expected_case_version < 1
    or lower(btrim(p_outcome)) not in ('continue', 'request_supplement', 'pause_case', 'close_case')
    or p_reason_code is null or btrim(p_reason_code) = ''
    or p_note is null or btrim(p_note) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using errcode = '22023',
      message = 'deviation, versions, valid outcome, reason, note and idempotency key are required';
  end if;
  if lower(btrim(p_outcome)) = 'request_supplement'
    and (p_follow_up_title is null or btrim(p_follow_up_title) = '') then
    raise exception using errcode = '22023',
      message = 'a follow-up title is required when requesting a supplement';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'deviation_id', p_deviation_id,
    'expected_deviation_version', p_expected_deviation_version,
    'expected_case_version', p_expected_case_version,
    'outcome', lower(btrim(p_outcome)),
    'reason_code', btrim(p_reason_code),
    'note', btrim(p_note),
    'resume_at', p_resume_at,
    'follow_up_title', nullif(btrim(p_follow_up_title), '')
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(
    'organization:' || v_organization_id::text || ':' || btrim(p_idempotency_key), 0
  ));

  select command.* into v_existing_command
  from public.processed_commands command
  where command.organization_id = v_organization_id
    and command.idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_existing_command.command_type <> 'deviation.decide'
      or v_existing_command.request_hash <> v_request_hash then
      raise exception using errcode = '22023',
        message = 'idempotency key was already used with different input';
    end if;
    select decision.* into v_decision
    from public.deviation_decisions decision
    where decision.organization_id = v_organization_id
      and decision.id = (v_existing_command.response ->> 'decision_id')::uuid;
    return v_decision;
  end if;

  select deviation.* into v_deviation
  from public.activity_deviations deviation
  where deviation.organization_id = v_organization_id
    and deviation.id = p_deviation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'deviation not found in the active organization';
  end if;
  if v_deviation.version <> p_expected_deviation_version then
    raise exception using errcode = '40001',
      message = format('deviation version conflict: expected %s, current %s', p_expected_deviation_version, v_deviation.version);
  end if;
  if v_deviation.status <> 'open' then
    raise exception using errcode = '22023', message = 'only an open deviation can be decided';
  end if;

  select case_row.* into v_case
  from public.cases case_row
  where case_row.organization_id = v_organization_id
    and case_row.id = v_deviation.case_id
  for update;

  if v_case.version <> p_expected_case_version then
    raise exception using errcode = '40001',
      message = format('case version conflict: expected %s, current %s', p_expected_case_version, v_case.version);
  end if;
  if v_case.status = 'closed' then
    raise exception using errcode = '22023', message = 'a closed case cannot receive a deviation decision';
  end if;

  insert into public.deviation_decisions (
    organization_id, deviation_id, outcome, reason_code, note, resume_at,
    supersedes_decision_id, decided_by
  ) values (
    v_organization_id, v_deviation.id, lower(btrim(p_outcome)), btrim(p_reason_code),
    btrim(p_note), p_resume_at, v_deviation.active_decision_id, v_actor_user_id
  ) returning * into v_decision;

  update public.activity_deviations
  set status = 'resolved', version = version + 1, resolved_at = now(),
      resolved_by = v_actor_user_id, active_decision_id = v_decision.id
  where organization_id = v_organization_id and id = v_deviation.id;

  if lower(btrim(p_outcome)) = 'request_supplement' then
    insert into public.case_activities (
      organization_id, case_id, title, status, due_date, waiting_for_party,
      sort_order, created_by, updated_by
    )
    select
      v_organization_id, v_case.id, btrim(p_follow_up_title),
      case when p_resume_at is null then 'active' else 'waiting' end,
      p_resume_at, case when p_resume_at is null then null else 'mentor' end,
      coalesce(max(activity.sort_order), 0) + 10, v_actor_user_id, v_actor_user_id
    from public.case_activities activity
    where activity.organization_id = v_organization_id and activity.case_id = v_case.id
    returning * into v_follow_up;
  end if;

  update public.cases
  set status = case
        when lower(btrim(p_outcome)) = 'pause_case' then 'paused'
        when lower(btrim(p_outcome)) = 'close_case' then 'closed'
        else 'open'
      end,
      closed_at = case when lower(btrim(p_outcome)) = 'close_case' then now() else null end,
      closed_by = case when lower(btrim(p_outcome)) = 'close_case' then v_actor_user_id else null end,
      version = version + 1,
      updated_by = v_actor_user_id
  where organization_id = v_organization_id and id = v_case.id
  returning * into v_case;

  if lower(btrim(p_outcome)) = 'close_case' then
    update public.case_activities
    set status = 'cancelled', version = version + 1, updated_by = v_actor_user_id
    where organization_id = v_organization_id
      and case_id = v_case.id
      and status not in ('completed', 'cancelled');
  end if;

  insert into public.case_events (
    organization_id, case_id, type, entity_type, entity_id,
    actor_user_id, idempotency_key, payload
  ) values (
    v_organization_id, v_case.id, 'deviation.decided', 'deviation_decision', v_decision.id,
    v_actor_user_id, btrim(p_idempotency_key),
    jsonb_build_object(
      'deviation_id', v_deviation.id,
      'outcome', v_decision.outcome,
      'reason_code', v_decision.reason_code,
      'case_version', v_case.version,
      'follow_up_activity_id', v_follow_up.id
    )
  );

  insert into public.processed_commands (
    organization_id, idempotency_key, command_type, request_hash, response
  ) values (
    v_organization_id, btrim(p_idempotency_key), 'deviation.decide', v_request_hash,
    jsonb_build_object('decision_id', v_decision.id, 'deviation_id', v_deviation.id, 'case_version', v_case.version)
  );

  return v_decision;
end;
$$;

create function public.update_case_description(
  p_case_id uuid,
  p_expected_case_version integer,
  p_text text,
  p_idempotency_key text
)
returns public.cases
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.update_case_description(p_case_id, p_expected_case_version, p_text, p_idempotency_key);
end;
$$;

create function public.save_case_note(
  p_case_id uuid,
  p_expected_case_version integer,
  p_note_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_text text,
  p_supersedes_version_id uuid,
  p_idempotency_key text
)
returns public.case_notes
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.save_case_note(
    p_case_id, p_expected_case_version, p_note_id, p_target_type,
    p_target_id, p_text, p_supersedes_version_id, p_idempotency_key
  );
end;
$$;

create function public.decide_activity_deviation(
  p_deviation_id uuid,
  p_expected_deviation_version integer,
  p_expected_case_version integer,
  p_outcome text,
  p_reason_code text,
  p_note text,
  p_resume_at date,
  p_follow_up_title text,
  p_idempotency_key text
)
returns public.deviation_decisions
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.decide_activity_deviation(
    p_deviation_id, p_expected_deviation_version, p_expected_case_version,
    p_outcome, p_reason_code, p_note, p_resume_at, p_follow_up_title, p_idempotency_key
  );
end;
$$;

revoke all on function private.update_case_description(uuid, integer, text, text)
  from public, anon, authenticated;
revoke all on function private.save_case_note(uuid, integer, uuid, text, uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function private.decide_activity_deviation(uuid, integer, integer, text, text, text, date, text, text)
  from public, anon, authenticated;

grant execute on function private.update_case_description(uuid, integer, text, text)
  to authenticated;
grant execute on function private.save_case_note(uuid, integer, uuid, text, uuid, text, uuid, text)
  to authenticated;
grant execute on function private.decide_activity_deviation(uuid, integer, integer, text, text, text, date, text, text)
  to authenticated;

revoke all on function public.update_case_description(uuid, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.save_case_note(uuid, integer, uuid, text, uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.decide_activity_deviation(uuid, integer, integer, text, text, text, date, text, text)
  from public, anon, authenticated;

grant execute on function public.update_case_description(uuid, integer, text, text)
  to authenticated;
grant execute on function public.save_case_note(uuid, integer, uuid, text, uuid, text, uuid, text)
  to authenticated;
grant execute on function public.decide_activity_deviation(uuid, integer, integer, text, text, text, date, text, text)
  to authenticated;
