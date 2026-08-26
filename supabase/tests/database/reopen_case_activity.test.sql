create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(21);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('a1000000-0000-0000-0000-000000000001', 'reopen-admin@example.test', 'authenticated', 'authenticated', now(), now()),
  ('a1000000-0000-0000-0000-000000000002', 'reopen-coordinator@example.test', 'authenticated', 'authenticated', now(), now()),
  ('a1000000-0000-0000-0000-000000000003', 'reopen-handler@example.test', 'authenticated', 'authenticated', now(), now()),
  ('a2000000-0000-0000-0000-000000000001', 'reopen-beta@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  (
    'aa000000-0000-0000-0000-000000000001',
    'reopen-alpha',
    'Reopen Alpha',
    'a1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'ab000000-0000-0000-0000-000000000001',
    'reopen-beta',
    'Reopen Beta',
    'a2000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  );

insert into public.user_profiles (
  organization_id, user_id, display_name, created_by, updated_by
)
values
  ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Reopen Administrator', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Reopen Coordinator', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Reopen Handler', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('ab000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Reopen Beta Administrator', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001');

insert into public.organization_memberships (
  organization_id, user_id, role, status, created_by, updated_by, activated_at
)
values
  ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'administrator', 'active', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', now()),
  ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'coordinator', 'active', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', now()),
  ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'handler', 'active', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', now()),
  ('ab000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'administrator', 'active', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', now());

insert into public.cases (
  id, organization_id, number, case_type_id, title, status, created_by, updated_by
)
values
  ('ac000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'REOPEN-A-1', 'support', 'Open Alpha case', 'open', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('ac000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'REOPEN-A-2', 'support', 'Paused Alpha case', 'open', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('ad000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'REOPEN-B-1', 'support', 'Open Beta case', 'open', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001');

insert into public.case_activities (
  id, organization_id, case_id, title, created_by, updated_by
)
values
  ('ae000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000001', 'Completed deviation', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('ae000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000001', 'Cancelled activity', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('ae000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000002', 'Paused case activity', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('af000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000001', 'Beta completed activity', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001');

update public.case_activities
set status = 'completed', result_code = 'not-completed', classification = 'deviation'
where id = 'ae000000-0000-0000-0000-000000000001';

update public.case_activities
set status = 'cancelled'
where id = 'ae000000-0000-0000-0000-000000000002';

update public.case_activities
set status = 'completed', result_code = 'completed-as-planned', classification = 'accepted'
where id in (
  'ae000000-0000-0000-0000-000000000003',
  'af000000-0000-0000-0000-000000000001'
);

update public.cases
set status = 'paused'
where id = 'ac000000-0000-0000-0000-000000000002';

select extensions.ok(
  not has_function_privilege('anon', 'public.reopen_case_activity(uuid,integer,text,text)', 'EXECUTE'),
  'anonymous clients cannot reopen activities'
);

select extensions.ok(
  has_function_privilege('authenticated', 'public.reopen_case_activity(uuid,integer,text,text)', 'EXECUTE'),
  'authenticated clients can reach the guarded reopen command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000003', true);

select extensions.throws_matching(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000001', 1, 'Handler attempt', 'reopen-handler')$$,
  '.*user lacks an active organization role for this command.*',
  'a handler cannot reopen an activity'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);

select extensions.throws_matching(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000001', 1, ' ', 'reopen-no-reason')$$,
  '.*reopening reason.*',
  'a reopening requires a reason'
);

select extensions.lives_ok(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000001', 1, 'Nytt underlag kräver ny bedömning', 'reopen-deviation')$$,
  'an administrator can reopen a completed activity'
);

select extensions.is(
  (select status from public.case_activities where id = 'ae000000-0000-0000-0000-000000000001'),
  'active'::text,
  'the reopened activity becomes active'
);

select extensions.is(
  (select result_code from public.case_activities where id = 'ae000000-0000-0000-0000-000000000001'),
  null::text,
  'the current result is cleared while history is retained'
);

select extensions.is(
  (select classification from public.case_activities where id = 'ae000000-0000-0000-0000-000000000001'),
  null::text,
  'the current result classification is cleared'
);

select extensions.is(
  (select version from public.case_activities where id = 'ae000000-0000-0000-0000-000000000001'),
  2,
  'reopening increments the activity version'
);

select extensions.is(
  (select status from public.activity_deviations where activity_id = 'ae000000-0000-0000-0000-000000000001'),
  'superseded'::text,
  'the open deviation is superseded atomically'
);

select extensions.is(
  (select resolved_by from public.activity_deviations where activity_id = 'ae000000-0000-0000-0000-000000000001'),
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'the deviation records who superseded it'
);

select extensions.is(
  (select payload ->> 'previous_result_code' from public.case_events where entity_id = 'ae000000-0000-0000-0000-000000000001' and type = 'case_activity.reopened'),
  'not-completed'::text,
  'the reopen event preserves the previous result'
);

select extensions.is(
  (select payload ->> 'reason' from public.case_events where entity_id = 'ae000000-0000-0000-0000-000000000001' and type = 'case_activity.reopened'),
  'Nytt underlag kräver ny bedömning'::text,
  'the reopen event preserves the mandatory reason'
);

select extensions.is(
  (select count(*) from public.case_events where type = 'deviation.superseded' and payload ->> 'activity_id' = 'ae000000-0000-0000-0000-000000000001'),
  1::bigint,
  'superseding the deviation creates its own audit event'
);

select extensions.is(
  (select (public.reopen_case_activity('ae000000-0000-0000-0000-000000000001', 1, 'Nytt underlag kräver ny bedömning', 'reopen-deviation')).version),
  2,
  'an idempotent replay returns the original reopened activity'
);

select extensions.throws_matching(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000001', 1, 'Changed reason', 'reopen-deviation')$$,
  '.*idempotency key was already used with different input.*',
  'a reopen idempotency key cannot be reused with changed input'
);

select extensions.throws_matching(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000001', 1, 'Stale reopen', 'reopen-stale')$$,
  '.*activity version conflict: expected 1, current 2.*',
  'a stale reopening is rejected'
);

select extensions.throws_matching(
  $$select public.reopen_case_activity('af000000-0000-0000-0000-000000000001', 1, 'Cross organization', 'reopen-cross-org')$$,
  '.*activity in an open case not found in the active organization.*',
  'another organizations activity cannot be reopened'
);

select extensions.throws_matching(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000003', 1, 'Paused case', 'reopen-paused')$$,
  '.*activity in an open case not found in the active organization.*',
  'an activity in a paused case cannot be reopened'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);

select extensions.lives_ok(
  $$select public.reopen_case_activity('ae000000-0000-0000-0000-000000000002', 1, 'Aktiviteten är aktuell igen', 'reopen-cancelled')$$,
  'a coordinator can reopen a cancelled activity'
);

select extensions.is(
  (select status from public.case_activities where id = 'ae000000-0000-0000-0000-000000000002'),
  'active'::text,
  'the cancelled activity is active after coordinator reopening'
);

reset role;

select * from extensions.finish();

rollback;
