-- Normal activity work-state changes are explicit, organization-scoped and
-- versioned. Completion and privileged reopening remain separate commands.

alter table public.case_activities
  add constraint case_activities_waiting_for_party_valid
  check (
    waiting_for_party is null
    or waiting_for_party in ('mentor', 'handler', 'external')
  ) not valid;

alter table public.case_activities
  validate constraint case_activities_waiting_for_party_valid;

create function private.enforce_activity_waiting_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'waiting' then
    if new.waiting_for_party is null
      or new.waiting_for_party not in ('mentor', 'handler', 'external') then
      raise exception using
        errcode = '23514',
        message = 'a waiting activity requires a valid waiting party';
    end if;
  else
    new.waiting_for_party := null;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_activity_waiting_state()
  from public, anon, authenticated;

create trigger case_activities_enforce_waiting_state
before insert or update of status, waiting_for_party on public.case_activities
for each row execute function private.enforce_activity_waiting_state();

create function private.transition_case_activity_work_state(
  p_activity_id uuid,
  p_expected_version integer,
  p_target_status text,
  p_waiting_for_party text,
  p_due_date date,
  p_reason text,
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
  v_target_status text;
  v_waiting_for_party text;
  v_reason text;
  v_request_hash text;
  v_event_type text;
  v_existing_command public.processed_commands%rowtype;
  v_activity public.case_activities%rowtype;
  v_previous_activity public.case_activities%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  v_target_status := lower(btrim(coalesce(p_target_status, '')));
  v_waiting_for_party := nullif(lower(btrim(coalesce(p_waiting_for_party, ''))), '');
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if p_activity_id is null
    or p_expected_version is null or p_expected_version < 1
    or v_target_status not in ('active', 'waiting')
    or (v_target_status = 'waiting'
      and (
        v_waiting_for_party is null
        or v_waiting_for_party not in ('mentor', 'handler', 'external')
      ))
    or (v_target_status = 'active' and v_waiting_for_party is not null)
    or (v_target_status = 'waiting' and v_reason is null)
    or length(coalesce(v_reason, '')) > 2000
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or length(btrim(p_idempotency_key)) > 200 then
    raise exception using
      errcode = '22023',
      message = 'activity, version, valid work state, waiting details and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'activity_id', p_activity_id,
    'expected_version', p_expected_version,
    'target_status', v_target_status,
    'waiting_for_party', case when v_target_status = 'waiting' then v_waiting_for_party else null end,
    'due_date', p_due_date,
    'reason', v_reason
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
    if v_existing_command.command_type <> 'case_activity.transition_work_state'
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

  perform case_row.id
  from public.cases case_row
  join public.case_activities activity
    on activity.organization_id = case_row.organization_id
   and activity.case_id = case_row.id
  where activity.organization_id = v_organization_id
    and activity.id = p_activity_id
    and case_row.status = 'open'
  for share of case_row;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'activity in an open case not found in the active organization';
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

  if v_activity.status not in ('planned', 'active', 'waiting') then
    raise exception using
      errcode = '22023',
      message = 'a completed or cancelled activity requires the dedicated reopen command';
  end if;

  v_previous_activity := v_activity;
  v_event_type := case
    when v_target_status = 'waiting' then 'case_activity.waiting'
    when v_activity.status = 'waiting' then 'case_activity.resumed'
    when v_activity.status = 'planned' then 'case_activity.started'
    else 'case_activity.planning_updated'
  end;

  update public.case_activities
  set
    status = v_target_status,
    waiting_for_party = case
      when v_target_status = 'waiting' then v_waiting_for_party
      else null
    end,
    due_date = p_due_date,
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
    v_event_type,
    'case_activity',
    v_activity.id,
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'previous_status', v_previous_activity.status,
      'status', v_activity.status,
      'waiting_for_party', v_activity.waiting_for_party,
      'due_date', v_activity.due_date,
      'reason', v_reason,
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
    'case_activity.transition_work_state',
    v_request_hash,
    jsonb_build_object(
      'activity_id', v_activity.id,
      'status', v_activity.status,
      'version', v_activity.version
    )
  );

  return v_activity;
end;
$$;

create function public.transition_case_activity_work_state(
  p_activity_id uuid,
  p_expected_version integer,
  p_target_status text,
  p_waiting_for_party text,
  p_due_date date,
  p_reason text,
  p_idempotency_key text
)
returns public.case_activities
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.transition_case_activity_work_state(
    p_activity_id,
    p_expected_version,
    p_target_status,
    p_waiting_for_party,
    p_due_date,
    p_reason,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.transition_case_activity_work_state(uuid, integer, text, text, date, text, text)
  from public, anon, authenticated;
grant execute on function private.transition_case_activity_work_state(uuid, integer, text, text, date, text, text)
  to authenticated;

revoke all on function public.transition_case_activity_work_state(uuid, integer, text, text, date, text, text)
  from public, anon, authenticated;
grant execute on function public.transition_case_activity_work_state(uuid, integer, text, text, date, text, text)
  to authenticated;
