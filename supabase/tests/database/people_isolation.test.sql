create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(27);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('71000000-0000-0000-0000-000000000001', 'people-alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('72000000-0000-0000-0000-000000000002', 'people-beta@example.test', 'authenticated', 'authenticated', now(), now()),
  ('73000000-0000-0000-0000-000000000003', 'people-reader@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, kind, created_by, updated_by)
values
  ('7a000000-0000-0000-0000-000000000001', 'people-alpha', 'People Alpha', 'live', '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('7b000000-0000-0000-0000-000000000002', 'people-beta', 'People Beta Demo', 'demo', '72000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002');

insert into public.user_profiles (organization_id, user_id, display_name)
values
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'People Alpha Handler'),
  ('7b000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'People Beta Handler'),
  ('7a000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', 'People Reader');

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  activated_at
)
values
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'handler', 'active', now()),
  ('7b000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'handler', 'active', now()),
  ('7a000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', 'reader', 'active', now());

select extensions.ok(
  not has_function_privilege('anon', 'public.create_mentor(text,text,text,text,uuid,text)', 'EXECUTE'),
  'anonymous clients cannot create mentors'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.create_parent(text,text,text,text,uuid,text)', 'EXECUTE'),
  'anonymous clients cannot create parents'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.link_case_people(uuid,integer,uuid,uuid,text)', 'EXECUTE'),
  'anonymous clients cannot link people to cases'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.create_mentor(
      'Alpha Mentor',
      'MENTOR.ALPHA@EXAMPLE.TEST',
      '070-111 11 11',
      'active',
      null,
      'create-person-1'
    )
  $$,
  'a handler can create an organization-owned mentor'
);

select extensions.is(
  (select email from public.mentors),
  'mentor.alpha@example.test'::text,
  'mentor email is normalized before storage'
);

select extensions.lives_ok(
  $$
    select public.create_parent(
      'Alpha Parent',
      'parent.alpha@example.test',
      '070-222 22 22',
      'active',
      null,
      'create-person-2'
    )
  $$,
  'a handler can create an organization-owned parent'
);

select extensions.is(
  (select count(*) from public.mentors),
  1::bigint,
  'the first organization sees one mentor'
);

select extensions.is(
  (select count(*) from public.parents),
  1::bigint,
  'the first organization sees one parent'
);

select extensions.is(
  (select count(*) from public.person_events),
  2::bigint,
  'person creation appends one event for each person'
);

select extensions.is(
  (public.create_mentor(
    'Alpha Mentor',
    'MENTOR.ALPHA@EXAMPLE.TEST',
    '070-111 11 11',
    'active',
    null,
    'create-person-1'
  )).id,
  (select id from public.mentors),
  'idempotent mentor replay returns the original row'
);

select extensions.is(
  (select count(*) from public.mentors),
  1::bigint,
  'idempotent mentor replay does not create a duplicate'
);

select extensions.throws_matching(
  $$
    select public.create_mentor(
      'Changed Mentor',
      'mentor.alpha@example.test',
      '070-111 11 11',
      'active',
      null,
      'create-person-1'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'a person idempotency key cannot be reused with changed input'
);

select extensions.lives_ok(
  $$
    select public.create_case(
      'PEOPLE-ALPHA-1',
      'matching',
      'Matcha stöd med mentor',
      'Testar organisationsägda personkopplingar.',
      'normal',
      null,
      'create-case-for-people-1'
    )
  $$,
  'a case can be created before people are linked'
);

select extensions.lives_ok(
  $$
    select public.link_case_people(
      (select id from public.cases where number = 'PEOPLE-ALPHA-1'),
      1,
      (select id from public.mentors),
      (select id from public.parents),
      'link-case-people-1'
    )
  $$,
  'a handler can link same-organization people to a case'
);

select extensions.ok(
  (
    select mentor_id is not null and parent_id is not null and version = 2
    from public.cases
    where number = 'PEOPLE-ALPHA-1'
  ),
  'the linked case stores both people and advances its version'
);

select extensions.is(
  (public.link_case_people(
    (select id from public.cases where number = 'PEOPLE-ALPHA-1'),
    1,
    (select id from public.mentors),
    (select id from public.parents),
    'link-case-people-1'
  )).version,
  2,
  'idempotent case-person replay returns the already updated case'
);

select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);

select extensions.lives_ok(
  $$
    select public.create_mentor(
      'Beta Mentor',
      'mentor.beta@example.test',
      '070-333 33 33',
      'active',
      null,
      'create-person-1'
    )
  $$,
  'another organization can reuse the same idempotency key inside its boundary'
);

select extensions.is(
  (select count(*) from public.mentors),
  1::bigint,
  'the second organization sees only its own mentor'
);

select extensions.is(
  (select count(*) from public.parents),
  0::bigint,
  'the second organization cannot see the first organization parent'
);

select extensions.is(
  (select count(*) from public.cases),
  0::bigint,
  'the second organization cannot see the first organization case'
);

select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select extensions.ok(
  (select count(*) = 1 from public.mentors)
    and (select count(*) = 1 from public.parents)
    and (select count(*) = 1 from public.cases),
  'the first organization still sees only its own people and case'
);

select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000003', true);

select extensions.throws_matching(
  $$
    select public.create_mentor(
      'Reader Mentor',
      null,
      null,
      'applicant',
      null,
      'reader-create-mentor-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a reader cannot create a mentor'
);

select extensions.throws_matching(
  $$
    insert into public.parents (
      organization_id,
      display_name,
      status,
      created_by,
      updated_by
    )
    values (
      '7a000000-0000-0000-0000-000000000001',
      'Direct Parent',
      'active',
      '73000000-0000-0000-0000-000000000003',
      '73000000-0000-0000-0000-000000000003'
    )
  $$,
  '.*permission denied for table parents.*',
  'authenticated clients cannot write person tables directly'
);

reset role;

select extensions.throws_matching(
  $$
    update public.cases
    set mentor_id = (
      select id
      from public.mentors
      where organization_id = '7b000000-0000-0000-0000-000000000002'
    )
    where organization_id = '7a000000-0000-0000-0000-000000000001'
      and number = 'PEOPLE-ALPHA-1'
  $$,
  '.*violates foreign key constraint.*',
  'a case cannot reference a mentor from another organization'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select extensions.throws_matching(
  $$
    select public.create_parent(
      'Cross-org Auth Parent',
      null,
      null,
      'active',
      '72000000-0000-0000-0000-000000000002',
      'cross-org-auth-parent-1'
    )
  $$,
  '.*parent auth user does not belong to the active organization.*',
  'a person cannot link an Auth user from another organization'
);

reset role;

update public.organizations
set
  status = 'suspended',
  suspended_at = now(),
  suspended_by = '72000000-0000-0000-0000-000000000002',
  updated_by = '72000000-0000-0000-0000-000000000002'
where id = '7b000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.mentors),
  0::bigint,
  'suspending an organization immediately hides its mentors'
);

select extensions.throws_matching(
  $$
    select public.create_parent(
      'Suspended Parent',
      null,
      null,
      'active',
      null,
      'suspended-create-parent-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a suspended organization cannot create more people'
);

reset role;

select * from extensions.finish();

rollback;
