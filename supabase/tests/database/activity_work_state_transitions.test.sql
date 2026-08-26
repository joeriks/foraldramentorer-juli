create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(22);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('91000000-0000-0000-0000-000000000001', 'work-alpha-admin@example.test', 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000002', 'work-alpha-reader@example.test', 'authenticated', 'authenticated', now(), now()),
  ('92000000-0000-0000-0000-000000000001', 'work-beta-admin@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  (
    '9a000000-0000-0000-0000-000000000001',
    'work-alpha',
    'Work Alpha',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9b000000-0000-0000-0000-000000000001',
    'work-beta',
    'Work Beta',
    '92000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001'
  );

insert into public.user_profiles (
  organization_id, user_id, display_name, created_by, updated_by
)
values
  (
    '9a000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'Work Alpha Administrator',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9a000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000002',
    'Work Alpha Reader',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9b000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    'Work Beta Administrator',
    '92000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001'
  );

insert into public.organization_memberships (
  organization_id, user_id, role, status, created_by, updated_by, activated_at
)
values
  (
    '9a000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'administrator',
    'active',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '9a000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000002',
    'reader',
    'active',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '9b000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    'administrator',
    'active',
    '92000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    now()
  );

insert into public.cases (
  id, organization_id, number, case_type_id, title, status, created_by, updated_by
)
values
  (
    '9c000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'WORK-A-1',
    'support',
    'Open Alpha case',
    'open',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9c000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000001',
    'WORK-A-2',
    'support',
    'Paused Alpha case',
    'paused',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9d000000-0000-0000-0000-000000000001',
    '9b000000-0000-0000-0000-000000000001',
    'WORK-B-1',
    'support',
    'Open Beta case',
    'open',
    '92000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001'
  );

insert into public.case_activities (
  id, organization_id, case_id, title, created_by, updated_by
)
values
  (
    '9e000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    '9c000000-0000-0000-0000-000000000001',
    'Alpha open activity',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9e000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000001',
    '9c000000-0000-0000-0000-000000000002',
    'Alpha paused activity',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9f000000-0000-0000-0000-000000000001',
    '9b000000-0000-0000-0000-000000000001',
    '9d000000-0000-0000-0000-000000000001',
    'Beta activity',
    '92000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001'
  );

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.transition_case_activity_work_state(uuid,integer,text,text,date,text,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot transition activity work state'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.transition_case_activity_work_state(uuid,integer,text,text,date,text,text)',
    'EXECUTE'
  ),
  'authenticated clients can reach the guarded work-state command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      1,
      'waiting',
      'mentor',
      current_date + 5,
      'Inväntar komplettering från mentorn',
      'work-state-waiting'
    )
  $$,
  'an administrator can put an activity in waiting state'
);

select extensions.is(
  (select status from public.case_activities where id = '9e000000-0000-0000-0000-000000000001'),
  'waiting'::text,
  'the waiting status is stored'
);

select extensions.is(
  (select waiting_for_party from public.case_activities where id = '9e000000-0000-0000-0000-000000000001'),
  'mentor'::text,
  'the controlled waiting party is stored'
);

select extensions.is(
  (select due_date from public.case_activities where id = '9e000000-0000-0000-0000-000000000001'),
  current_date + 5,
  'the monitoring date is stored'
);

select extensions.is(
  (
    select payload ->> 'reason'
    from public.case_events
    where entity_id = '9e000000-0000-0000-0000-000000000001'
      and type = 'case_activity.waiting'
  ),
  'Inväntar komplettering från mentorn'::text,
  'the waiting reason is preserved in the audit event'
);

select extensions.is(
  (
    select (public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      1,
      'waiting',
      'mentor',
      current_date + 5,
      'Inväntar komplettering från mentorn',
      'work-state-waiting'
    )).version
  ),
  2,
  'an idempotent replay returns the original transition result'
);

select extensions.throws_matching(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      1,
      'waiting',
      'external',
      current_date + 5,
      'Changed input',
      'work-state-waiting'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'an idempotency key cannot be reused with changed work-state input'
);

select extensions.throws_matching(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      1,
      'active',
      null,
      null,
      null,
      'work-state-stale'
    )
  $$,
  '.*activity version conflict: expected 1, current 2.*',
  'a stale work-state transition is rejected'
);

select extensions.throws_matching(
  $$
    select public.transition_case_activity_work_state(
      '9f000000-0000-0000-0000-000000000001',
      1,
      'active',
      null,
      null,
      null,
      'work-state-cross-org'
    )
  $$,
  '.*activity in an open case not found in the active organization.*',
  'another organizations activity cannot be transitioned'
);

select extensions.throws_matching(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      2,
      'waiting',
      'parent',
      null,
      'Invalid party',
      'work-state-invalid-party'
    )
  $$,
  '.*valid work state, waiting details.*',
  'an uncontrolled waiting party is rejected'
);

select extensions.lives_ok(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      2,
      'active',
      null,
      current_date + 7,
      'Kompletteringen har kommit in',
      'work-state-resume'
    )
  $$,
  'a waiting activity can be resumed'
);

select extensions.is(
  (select status from public.case_activities where id = '9e000000-0000-0000-0000-000000000001'),
  'active'::text,
  'resuming changes the activity to active'
);

select extensions.is(
  (select waiting_for_party from public.case_activities where id = '9e000000-0000-0000-0000-000000000001'),
  null::text,
  'resuming clears the waiting party'
);

select extensions.is(
  (
    select payload ->> 'previous_status'
    from public.case_events
    where entity_id = '9e000000-0000-0000-0000-000000000001'
      and type = 'case_activity.resumed'
  ),
  'waiting'::text,
  'the resume event records its previous state'
);

select extensions.throws_matching(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000002',
      1,
      'active',
      null,
      null,
      null,
      'work-state-paused-case'
    )
  $$,
  '.*activity in an open case not found in the active organization.*',
  'activities in a paused case cannot be transitioned'
);

select extensions.throws_matching(
  $$
    select public.complete_case_activity(
      '9e000000-0000-0000-0000-000000000002',
      1,
      'completed-as-planned',
      null,
      'complete-paused-case'
    )
  $$,
  '.*activity can only be completed while its case is open.*',
  'an activity in a paused case cannot be completed'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);

select extensions.throws_matching(
  $$
    select public.transition_case_activity_work_state(
      '9e000000-0000-0000-0000-000000000001',
      3,
      'waiting',
      'handler',
      null,
      'Reader attempt',
      'work-state-reader'
    )
  $$,
  '.*user lacks an active organization role for this command.*',
  'a reader cannot transition activity work state'
);

reset role;

select extensions.throws_matching(
  $$
    update public.case_activities
    set status = 'waiting'
    where id = '9f000000-0000-0000-0000-000000000001'
  $$,
  '.*a waiting activity requires a valid waiting party.*',
  'the table invariant rejects waiting without a controlled party'
);

update public.case_activities
set status = 'waiting', waiting_for_party = 'external'
where id = '9f000000-0000-0000-0000-000000000001';

update public.case_activities
set status = 'cancelled'
where id = '9f000000-0000-0000-0000-000000000001';

select extensions.is(
  (select waiting_for_party from public.case_activities where id = '9f000000-0000-0000-0000-000000000001'),
  null::text,
  'leaving waiting state always clears the waiting party'
);

select extensions.is(
  (select version from public.case_activities where id = '9e000000-0000-0000-0000-000000000001'),
  3,
  'the successful waiting and resume transitions each increment version once'
);

select * from extensions.finish();

rollback;
