create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(36);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('b1000000-0000-0000-0000-000000000001', 'lifecycle-admin@example.test', 'authenticated', 'authenticated', now(), now()),
  ('b1000000-0000-0000-0000-000000000002', 'lifecycle-coordinator@example.test', 'authenticated', 'authenticated', now(), now()),
  ('b1000000-0000-0000-0000-000000000003', 'lifecycle-handler@example.test', 'authenticated', 'authenticated', now(), now()),
  ('b1000000-0000-0000-0000-000000000004', 'lifecycle-reader@example.test', 'authenticated', 'authenticated', now(), now()),
  ('b2000000-0000-0000-0000-000000000001', 'lifecycle-beta@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  ('ba000000-0000-0000-0000-000000000001', 'lifecycle-alpha', 'Lifecycle Alpha', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-000000000001', 'lifecycle-beta', 'Lifecycle Beta', 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001');

insert into public.user_profiles (organization_id, user_id, display_name, created_by, updated_by)
values
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Lifecycle Administrator', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'Lifecycle Coordinator', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Lifecycle Handler', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'Lifecycle Reader', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Lifecycle Beta Administrator', 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001');

insert into public.organization_memberships (
  organization_id, user_id, role, status, created_by, updated_by, activated_at
)
values
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'administrator', 'active', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', now()),
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'coordinator', 'active', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', now()),
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'handler', 'active', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', now()),
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'reader', 'active', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', now()),
  ('bb000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'administrator', 'active', 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', now());

insert into public.cases (id, organization_id, number, case_type_id, title, created_by, updated_by)
values
  ('bc000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 'LIFE-A-1', 'support', 'Lifecycle Alpha case', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('bc000000-0000-0000-0000-000000000002', 'ba000000-0000-0000-0000-000000000001', 'LIFE-A-2', 'support', 'Case with deviation', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('bd000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'LIFE-B-1', 'support', 'Lifecycle Beta case', 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001');

insert into public.case_activities (
  id, organization_id, case_id, title, status, waiting_for_party, created_by, updated_by
)
values
  ('be000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000001', 'Planned activity', 'planned', null, 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('be000000-0000-0000-0000-000000000002', 'ba000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000001', 'Waiting activity', 'waiting', 'external', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('be000000-0000-0000-0000-000000000003', 'ba000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000001', 'Completed activity', 'planned', null, 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('be000000-0000-0000-0000-000000000004', 'ba000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000002', 'Deviation activity', 'planned', null, 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('bf000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'bd000000-0000-0000-0000-000000000001', 'Beta activity', 'planned', null, 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001');

update public.case_activities
set status = 'completed', result_code = 'completed-as-planned', classification = 'accepted'
where id = 'be000000-0000-0000-0000-000000000003';

update public.case_activities
set status = 'completed', result_code = 'not-completed', classification = 'deviation'
where id = 'be000000-0000-0000-0000-000000000004';

select extensions.ok(
  not has_function_privilege('anon', 'public.transition_case_lifecycle(uuid,integer,text,text,text,date,text)', 'EXECUTE'),
  'anonymous clients cannot transition case lifecycle'
);

select extensions.ok(
  has_function_privilege('authenticated', 'public.transition_case_lifecycle(uuid,integer,text,text,text,date,text)', 'EXECUTE'),
  'authenticated clients can reach the guarded lifecycle command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);

select extensions.lives_ok(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 1, 'pause', 'awaiting_information', 'Inväntar kompletterande information', current_date + 7, 'case-pause')$$,
  'a handler can pause an open case'
);

select extensions.is((select status from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'paused'::text, 'pause changes case status');
select extensions.is((select version from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 2, 'pause increments case version');
select extensions.is((select payload ->> 'reason_code' from public.case_events where idempotency_key = 'case-pause'), 'awaiting_information'::text, 'pause event stores structured reason');
select extensions.is((select (payload ->> 'resume_at')::date from public.case_events where idempotency_key = 'case-pause'), current_date + 7, 'pause event stores monitoring date');
select extensions.is((select count(*) from public.case_activities where case_id = 'bc000000-0000-0000-0000-000000000001' and status in ('planned', 'waiting')), 2::bigint, 'pausing leaves unfinished activities unchanged');

select extensions.is(
  (select (public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 1, 'pause', 'awaiting_information', 'Inväntar kompletterande information', current_date + 7, 'case-pause')).version),
  2,
  'idempotent pause replay returns original result'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 1, 'pause', 'external_dependency', 'Changed', current_date + 7, 'case-pause')$$,
  '.*idempotency key was already used with different input.*',
  'lifecycle idempotency key cannot be reused with changed input'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 1, 'resume', 'work_resumed', 'Stale', null, 'case-resume-stale')$$,
  '.*case version conflict: expected 1, current 2.*',
  'stale lifecycle version is rejected'
);

select extensions.lives_ok(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 2, 'resume', 'information_received', 'Underlaget har kommit in', null, 'case-resume')$$,
  'a handler can resume a paused case'
);

select extensions.is((select status from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'open'::text, 'resume opens the case');
select extensions.is((select version from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 3, 'resume increments case version');

select extensions.lives_ok(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 3, 'close', 'no_further_action', 'Ärendet behöver ingen ytterligare åtgärd', null, 'case-close')$$,
  'a handler can close an open case without unresolved deviations'
);

select extensions.is((select status from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'closed'::text, 'close changes case status');
select extensions.ok((select closed_at is not null from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'close records closure time');
select extensions.is((select closed_by from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'b1000000-0000-0000-0000-000000000003'::uuid, 'close records decision actor');
select extensions.is((select count(*) from public.case_activities where case_id = 'bc000000-0000-0000-0000-000000000001' and status = 'cancelled'), 2::bigint, 'close cancels every unfinished activity');
select extensions.is((select count(*) from public.case_activities where case_id = 'bc000000-0000-0000-0000-000000000001' and status = 'completed'), 1::bigint, 'close leaves completed activities unchanged');
select extensions.is((select count(*) from public.case_events where idempotency_key like 'case-close:activity:%'), 2::bigint, 'each cancelled activity receives an audit event');
select extensions.is((select count(distinct correlation_id) from public.case_events where idempotency_key = 'case-close' or idempotency_key like 'case-close:activity:%'), 1::bigint, 'case close and activity cancellations share a correlation id');
select extensions.is((select (payload ->> 'cancelled_activity_count')::integer from public.case_events where idempotency_key = 'case-close'), 2, 'case close event records cancelled activity count');

select extensions.is(
  (select (public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 3, 'close', 'no_further_action', 'Ärendet behöver ingen ytterligare åtgärd', null, 'case-close')).version),
  4,
  'idempotent close replay returns original result'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 4, 'reopen', 'new_information', 'Handler reopen', null, 'case-reopen-handler')$$,
  '.*only an administrator or coordinator can reopen a case.*',
  'a handler cannot reopen a closed case'
);

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);

select extensions.lives_ok(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 4, 'reopen', 'new_information', 'Nya uppgifter kräver fortsatt arbete', null, 'case-reopen')$$,
  'a coordinator can reopen a closed case'
);

select extensions.is((select status from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'open'::text, 'reopen makes the case open');
select extensions.ok((select closed_at is null and closed_by is null from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 'reopen clears current closure fields');
select extensions.is((select count(*) from public.case_activities where case_id = 'bc000000-0000-0000-0000-000000000001' and status = 'cancelled'), 2::bigint, 'reopen does not reactivate cancelled activities');
select extensions.is((select version from public.cases where id = 'bc000000-0000-0000-0000-000000000001'), 5, 'reopen increments case version');

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 5, 'resume', 'work_resumed', 'Invalid transition', null, 'case-invalid-resume')$$,
  '.*lifecycle transition resume from open is not allowed.*',
  'invalid lifecycle transition is rejected'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bd000000-0000-0000-0000-000000000001', 1, 'pause', 'awaiting_information', 'Cross org', null, 'case-cross-org')$$,
  '.*case not found in the active organization.*',
  'another organizations case cannot be transitioned'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000002', 1, 'pause', 'awaiting_information', 'Bypass deviation', null, 'case-deviation-pause')$$,
  '.*open activity deviations require a decision.*',
  'pause cannot bypass an unresolved deviation'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000002', 1, 'close', 'no_further_action', 'Bypass deviation', null, 'case-deviation-close')$$,
  '.*open activity deviations require a decision.*',
  'close cannot bypass an unresolved deviation'
);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 5, 'pause', 'awaiting_information', 'Past monitoring date', current_date - 1, 'case-past-resume')$$,
  '.*valid lifecycle action.*',
  'pause rejects a monitoring date in the past'
);

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000004', true);

select extensions.throws_matching(
  $$select public.transition_case_lifecycle('bc000000-0000-0000-0000-000000000001', 5, 'pause', 'awaiting_information', 'Reader attempt', null, 'case-reader')$$,
  '.*user lacks an active organization role for this command.*',
  'a reader cannot transition case lifecycle'
);

reset role;

select * from extensions.finish();

rollback;
