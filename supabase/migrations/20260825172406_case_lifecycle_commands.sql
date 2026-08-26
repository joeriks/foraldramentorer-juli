-- Case lifecycle transitions are domain commands, never free status edits.
-- Closing atomically cancels unfinished activities; reopening deliberately
-- leaves them cancelled so the organization must choose what becomes active.

create function private.transition_case_lifecycle(
  p_case_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason_code text,
  p_note text,
  p_resume_at date,
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
  v_membership_role text;
  v_action text;
  v_reason_code text;
  v_note text;
  v_request_hash text;
  v_correlation_id uuid := gen_random_uuid();
  v_cancelled_activity_count integer := 0;
  v_existing_command public.processed_commands%rowtype;
  v_case public.cases%rowtype;
  v_previous_case public.cases%rowtype;
begin
  select membership.organization_id, membership.user_id, membership.membership_role
  into v_organization_id, v_actor_user_id, v_membership_role
  from private.require_active_membership(
    array['administrator', 'coordinator', 'handler']::text[]
  ) membership;

  v_action := lower(btrim(coalesce(p_action, '')));
  v_reason_code := lower(btrim(coalesce(p_reason_code, '')));
  v_note := btrim(coalesce(p_note, ''));

  if p_case_id is null
    or p_expected_version is null or p_expected_version < 1
    or v_action not in ('pause', 'resume', 'close', 'reopen')
    or v_reason_code !~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'
    or length(v_reason_code) > 120
    or v_note = '' or length(v_note) > 4000
    or (v_action <> 'pause' and p_resume_at is not null)
    or (v_action = 'pause' and p_resume_at is not null and p_resume_at < current_date)
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or length(btrim(p_idempotency_key)) > 200 then
    raise exception using
      errcode = '22023',
      message = 'case, version, valid lifecycle action, reason, note and idempotency key are required';
  end if;

  if v_action = 'reopen'
    and v_membership_role not in ('administrator', 'coordinator') then
    raise exception using
      errcode = '42501',
      message = 'only an administrator or coordinator can reopen a case';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'case_id', p_case_id,
    'expected_version', p_expected_version,
    'action', v_action,
    'reason_code', v_reason_code,
    'note', v_note,
    'resume_at', p_resume_at
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
    if v_existing_command.command_type <> 'case.lifecycle.transition'
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
        message = 'idempotent case lifecycle result no longer exists';
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
      message = format(
        'case version conflict: expected %s, current %s',
        p_expected_version,
        v_case.version
      );
  end if;

  if not (
    (v_action = 'pause' and v_case.status = 'open')
    or (v_action = 'resume' and v_case.status = 'paused')
    or (v_action = 'close' and v_case.status in ('open', 'paused'))
    or (v_action = 'reopen' and v_case.status = 'closed')
  ) then
    raise exception using
      errcode = '22023',
      message = format('case lifecycle transition %s from %s is not allowed', v_action, v_case.status);
  end if;

  if v_action in ('pause', 'close')
    and exists (
      select 1
      from public.activity_deviations deviation
      where deviation.organization_id = v_organization_id
        and deviation.case_id = v_case.id
        and deviation.status = 'open'
    ) then
    raise exception using
      errcode = '23514',
      message = 'open activity deviations require a decision before pausing or closing the case';
  end if;

  v_previous_case := v_case;

  if v_action = 'close' then
    with to_cancel as materialized (
      select activity.id, activity.status as previous_status
      from public.case_activities activity
      where activity.organization_id = v_organization_id
        and activity.case_id = v_case.id
        and activity.status not in ('completed', 'cancelled')
      for update
    ), cancelled as (
      update public.case_activities activity
      set
        status = 'cancelled',
        version = activity.version + 1,
        updated_by = v_actor_user_id
      from to_cancel candidate
      where activity.organization_id = v_organization_id
        and activity.id = candidate.id
      returning activity.id, activity.title, activity.version, candidate.previous_status
    )
    insert into public.case_events (
      organization_id,
      case_id,
      type,
      entity_type,
      entity_id,
      actor_user_id,
      correlation_id,
      idempotency_key,
      payload
    )
    select
      v_organization_id,
      v_case.id,
      'case_activity.cancelled',
      'case_activity',
      cancelled.id,
      v_actor_user_id,
      v_correlation_id,
      btrim(p_idempotency_key) || ':activity:' || cancelled.id::text,
      jsonb_build_object(
        'previous_status', cancelled.previous_status,
        'reason_code', v_reason_code,
        'reason', v_note,
        'version', cancelled.version
      )
    from cancelled;

    get diagnostics v_cancelled_activity_count = row_count;
  end if;

  update public.cases
  set
    status = case v_action
      when 'pause' then 'paused'
      when 'close' then 'closed'
      else 'open'
    end,
    closed_at = case when v_action = 'close' then now() else null end,
    closed_by = case when v_action = 'close' then v_actor_user_id else null end,
    version = version + 1,
    updated_by = v_actor_user_id
  where organization_id = v_organization_id
    and id = v_case.id
  returning * into v_case;

  insert into public.case_events (
    organization_id,
    case_id,
    type,
    entity_type,
    entity_id,
    actor_user_id,
    correlation_id,
    idempotency_key,
    payload
  ) values (
    v_organization_id,
    v_case.id,
    'case.' || case v_action
      when 'pause' then 'paused'
      when 'resume' then 'resumed'
      when 'close' then 'closed'
      else 'reopened'
    end,
    'case',
    v_case.id,
    v_actor_user_id,
    v_correlation_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'previous_status', v_previous_case.status,
      'status', v_case.status,
      'reason_code', v_reason_code,
      'reason', v_note,
      'resume_at', p_resume_at,
      'cancelled_activity_count', v_cancelled_activity_count,
      'version', v_case.version
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
    'case.lifecycle.transition',
    v_request_hash,
    jsonb_build_object(
      'case_id', v_case.id,
      'status', v_case.status,
      'version', v_case.version,
      'cancelled_activity_count', v_cancelled_activity_count
    )
  );

  return v_case;
end;
$$;

create function public.transition_case_lifecycle(
  p_case_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason_code text,
  p_note text,
  p_resume_at date,
  p_idempotency_key text
)
returns public.cases
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.transition_case_lifecycle(
    p_case_id,
    p_expected_version,
    p_action,
    p_reason_code,
    p_note,
    p_resume_at,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.transition_case_lifecycle(uuid, integer, text, text, text, date, text)
  from public, anon, authenticated;
grant execute on function private.transition_case_lifecycle(uuid, integer, text, text, text, date, text)
  to authenticated;

revoke all on function public.transition_case_lifecycle(uuid, integer, text, text, text, date, text)
  from public, anon, authenticated;
grant execute on function public.transition_case_lifecycle(uuid, integer, text, text, text, date, text)
  to authenticated;
