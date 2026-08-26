-- Reopening is a privileged exception to normal activity transitions. The
-- previous result remains in append-only events and any open deviation is
-- superseded atomically before the activity becomes active again.

create function private.reopen_case_activity(
  p_activity_id uuid,
  p_expected_version integer,
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
  v_reason text;
  v_request_hash text;
  v_existing_command public.processed_commands%rowtype;
  v_activity public.case_activities%rowtype;
  v_previous_activity public.case_activities%rowtype;
  v_deviation public.activity_deviations%rowtype;
begin
  select membership.organization_id, membership.user_id
  into v_organization_id, v_actor_user_id
  from private.require_active_membership(
    array['administrator', 'coordinator']::text[]
  ) membership;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if p_activity_id is null
    or p_expected_version is null or p_expected_version < 1
    or v_reason is null or length(v_reason) > 2000
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or length(btrim(p_idempotency_key)) > 200 then
    raise exception using
      errcode = '22023',
      message = 'activity, expected version, reopening reason and idempotency key are required';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'activity_id', p_activity_id,
    'expected_version', p_expected_version,
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
    if v_existing_command.command_type <> 'case_activity.reopen'
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

  if v_activity.status not in ('completed', 'cancelled') then
    raise exception using
      errcode = '22023',
      message = 'only a completed or cancelled activity can be reopened';
  end if;

  v_previous_activity := v_activity;

  select deviation.*
  into v_deviation
  from public.activity_deviations deviation
  where deviation.organization_id = v_organization_id
    and deviation.activity_id = p_activity_id
    and deviation.status = 'open'
  for update;

  if found then
    update public.activity_deviations
    set
      status = 'superseded',
      version = version + 1,
      resolved_at = now(),
      resolved_by = v_actor_user_id
    where organization_id = v_organization_id
      and id = v_deviation.id
    returning * into v_deviation;

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
      'deviation.superseded',
      'deviation',
      v_deviation.id,
      v_actor_user_id,
      btrim(p_idempotency_key) || ':deviation',
      jsonb_build_object(
        'activity_id', v_activity.id,
        'reason', v_reason,
        'deviation_version', v_deviation.version
      )
    );
  end if;

  update public.case_activities
  set
    status = 'active',
    result_code = null,
    classification = null,
    waiting_for_party = null,
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
    'case_activity.reopened',
    'case_activity',
    v_activity.id,
    v_actor_user_id,
    btrim(p_idempotency_key),
    jsonb_build_object(
      'previous_status', v_previous_activity.status,
      'previous_result_code', v_previous_activity.result_code,
      'previous_classification', v_previous_activity.classification,
      'superseded_deviation_id', v_deviation.id,
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
    'case_activity.reopen',
    v_request_hash,
    jsonb_build_object(
      'activity_id', v_activity.id,
      'superseded_deviation_id', v_deviation.id,
      'version', v_activity.version
    )
  );

  return v_activity;
end;
$$;

create function public.reopen_case_activity(
  p_activity_id uuid,
  p_expected_version integer,
  p_reason text,
  p_idempotency_key text
)
returns public.case_activities
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.reopen_case_activity(
    p_activity_id,
    p_expected_version,
    p_reason,
    p_idempotency_key
  );
end;
$$;

revoke all on function private.reopen_case_activity(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function private.reopen_case_activity(uuid, integer, text, text)
  to authenticated;

revoke all on function public.reopen_case_activity(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.reopen_case_activity(uuid, integer, text, text)
  to authenticated;
