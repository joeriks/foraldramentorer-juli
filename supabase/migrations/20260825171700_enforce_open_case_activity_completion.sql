-- Completion is a normal activity write and must never bypass the case
-- lifecycle. The trigger also protects privileged/internal callers while
-- allowing idempotent RPC replays, which perform no second update.

create function private.enforce_open_case_activity_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status not in ('completed', 'cancelled')
    and new.status = 'completed'
    and not exists (
      select 1
      from public.cases case_row
      where case_row.organization_id = new.organization_id
        and case_row.id = new.case_id
        and case_row.status = 'open'
    ) then
    raise exception using
      errcode = '23514',
      message = 'an activity can only be completed while its case is open';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_open_case_activity_completion()
  from public, anon, authenticated;

create trigger case_activities_enforce_open_case_completion
before update of status on public.case_activities
for each row execute function private.enforce_open_case_activity_completion();
