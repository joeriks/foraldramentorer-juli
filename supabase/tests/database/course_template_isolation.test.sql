create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(25);

select extensions.is(
  (select count(*) from private.course_templates where active),
  2::bigint,
  'the deterministic seed provides two active course templates'
);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('61000000-0000-0000-0000-000000000001', 'course-alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('62000000-0000-0000-0000-000000000002', 'course-beta@example.test', 'authenticated', 'authenticated', now(), now()),
  ('63000000-0000-0000-0000-000000000003', 'course-reader@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, kind, created_by, updated_by)
values
  ('6a000000-0000-0000-0000-000000000001', 'course-alpha', 'Course Alpha', 'live', '61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001'),
  ('6b000000-0000-0000-0000-000000000002', 'course-beta', 'Course Beta Demo', 'demo', '62000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002');

insert into public.user_profiles (organization_id, user_id, display_name)
values
  ('6a000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'Course Alpha Admin'),
  ('6b000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'Course Beta Admin'),
  ('6a000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'Course Reader');

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  activated_at
)
values
  ('6a000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'administrator', 'active', now()),
  ('6b000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'administrator', 'active', now()),
  ('6a000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'reader', 'active', now());

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.list_available_course_templates()',
    'EXECUTE'
  ),
  'anonymous clients cannot list private course template metadata'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.install_course_template(text,integer,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot install course templates'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.list_available_course_templates()),
  2::bigint,
  'an organization administrator can list available template metadata'
);

select extensions.lives_ok(
  $$
    select public.install_course_template(
      'introduktion-foraldramentor',
      1,
      'install-introduction-1'
    )
  $$,
  'a live organization can install a demo course as an owned copy'
);

select extensions.is(
  (select count(*) from public.courses),
  1::bigint,
  'the first organization sees one installed course'
);

select extensions.is(
  (select min(content_kind) from public.courses),
  'demo'::text,
  'the copied course retains its demo content classification'
);

select extensions.is(
  (select count(*) from public.course_modules),
  2::bigint,
  'the first organization receives its own two module rows'
);

select extensions.is(
  (public.install_course_template(
    'introduktion-foraldramentor',
    1,
    'install-introduction-1'
  )).id,
  (select id from public.courses),
  'replaying installation returns the original organization-owned course'
);

select extensions.is(
  (select count(*) from public.courses),
  1::bigint,
  'idempotent replay does not duplicate the course'
);

select extensions.throws_matching(
  $$
    select public.install_course_template(
      'trygg-forsta-kontakt',
      1,
      'install-introduction-1'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'a course installation idempotency key cannot be reused with changed input'
);

select set_config('request.jwt.claim.sub', '63000000-0000-0000-0000-000000000003', true);

select extensions.throws_matching(
  $$ select * from public.list_available_course_templates() $$,
  '.*lacks an active organization role.*',
  'a reader cannot list installable platform templates'
);

select extensions.throws_matching(
  $$
    select public.install_course_template(
      'introduktion-foraldramentor',
      1,
      'reader-install-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a reader cannot install a course template'
);

select extensions.throws_matching(
  $$ select count(*) from private.course_templates $$,
  '.*permission denied for table course_templates.*',
  'authenticated clients cannot read private template rows directly'
);

select set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000002', true);

select extensions.lives_ok(
  $$
    select public.install_course_template(
      'introduktion-foraldramentor',
      1,
      'install-introduction-1'
    )
  $$,
  'a demo organization can reuse the same idempotency key in its own boundary'
);

select extensions.is(
  (select count(*) from public.courses),
  1::bigint,
  'the demo organization sees only its own course copy'
);

select extensions.is(
  (select count(*) from public.course_modules),
  2::bigint,
  'the demo organization sees only its own module copies'
);

select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.courses),
  1::bigint,
  'the live organization still cannot see the demo organization course'
);

reset role;

select extensions.ok(
  (
    select count(distinct course.id) = 2
    from public.courses course
    where course.source_template_key = 'introduktion-foraldramentor'
      and course.organization_id in (
        '6a000000-0000-0000-0000-000000000001',
        '6b000000-0000-0000-0000-000000000002'
      )
  ),
  'installing one template creates distinct course ids per organization'
);

select extensions.is(
  (
    select count(distinct course.title)
    from public.courses course
    where course.source_template_key = 'introduktion-foraldramentor'
      and course.organization_id in (
        '6a000000-0000-0000-0000-000000000001',
        '6b000000-0000-0000-0000-000000000002'
      )
  ),
  1::bigint,
  'both independent copies initially contain the same template title'
);

select extensions.throws_matching(
  $$
    insert into public.course_modules (
      organization_id,
      course_version_id,
      stable_key,
      sort_order,
      title,
      body_markdown,
      created_by
    )
    select
      '6a000000-0000-0000-0000-000000000001',
      course_version.id,
      'cross-org-module',
      999,
      'Forbidden module',
      'Must be rejected',
      '61000000-0000-0000-0000-000000000001'
    from public.course_versions course_version
    where course_version.organization_id = '6b000000-0000-0000-0000-000000000002'
  $$,
  '.*violates foreign key constraint.*',
  'a module cannot link an organization to another organization course version'
);

update public.courses
set title = 'Alpha-local course title'
where organization_id = '6a000000-0000-0000-0000-000000000001';

select extensions.is(
  (
    select title
    from public.courses
    where organization_id = '6b000000-0000-0000-0000-000000000002'
  ),
  'Introduktion för föräldramentorer'::text,
  'changing one organization copy does not change another organization copy'
);

select extensions.is(
  (
    select kind
    from public.organizations
    where id = '6b000000-0000-0000-0000-000000000002'
  ),
  'demo'::text,
  'the prototype organization is explicitly classified as demo'
);

update public.organizations
set
  status = 'suspended',
  suspended_at = now(),
  suspended_by = '62000000-0000-0000-0000-000000000002',
  updated_by = '62000000-0000-0000-0000-000000000002'
where id = '6b000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.courses),
  0::bigint,
  'suspending a demo organization immediately hides its courses'
);

select extensions.throws_matching(
  $$
    select public.install_course_template(
      'trygg-forsta-kontakt',
      1,
      'suspended-install-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a suspended demo organization cannot install more templates'
);

reset role;

select * from extensions.finish();

rollback;
