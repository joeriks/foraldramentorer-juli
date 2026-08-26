create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(21);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('61000000-0000-0000-0000-000000000001', 'activity-alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('62000000-0000-0000-0000-000000000002', 'activity-beta@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  (
    '6a000000-0000-0000-0000-000000000001',
    'activity-alpha',
    'Activity Alpha',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001'
  ),
  (
    '6b000000-0000-0000-0000-000000000002',
    'activity-beta',
    'Activity Beta',
    '62000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002'
  );

insert into public.user_profiles (
  organization_id,
  user_id,
  display_name,
  created_by,
  updated_by
)
values
  (
    '6a000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    'Alpha Administrator',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001'
  ),
  (
    '6b000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002',
    'Beta Administrator',
    '62000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002'
  );

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  created_by,
  updated_by,
  activated_at
)
values
  (
    '6a000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    'administrator',
    'active',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '6b000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002',
    'administrator',
    'active',
    '62000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002',
    now()
  );

insert into public.cases (
  id,
  organization_id,
  number,
  case_type_id,
  title,
  created_by,
  updated_by
)
values
  (
    '6c000000-0000-0000-0000-000000000001',
    '6a000000-0000-0000-0000-000000000001',
    'ACT-A-1',
    'support',
    'Alpha case',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001'
  ),
  (
    '6d000000-0000-0000-0000-000000000002',
    '6b000000-0000-0000-0000-000000000002',
    'ACT-B-1',
    'support',
    'Beta case',
    '62000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002'
  );

insert into public.case_activities (
  id,
  organization_id,
  case_id,
  title,
  created_by,
  updated_by
)
values
  (
    '6e000000-0000-0000-0000-000000000001',
    '6a000000-0000-0000-0000-000000000001',
    '6c000000-0000-0000-0000-000000000001',
    'Alpha version one activity',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001'
  ),
  (
    '6f000000-0000-0000-0000-000000000002',
    '6b000000-0000-0000-0000-000000000002',
    '6d000000-0000-0000-0000-000000000002',
    'Beta version one activity',
    '62000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000002'
  );

select extensions.is(
  (select count(*) from public.activity_definitions where is_default),
  3::bigint,
  'every organization, including the seeded demo, has one default definition'
);

select extensions.is(
  (
    select count(*)
    from public.activity_definition_versions
    where organization_id in (
      '6a000000-0000-0000-0000-000000000001',
      '6b000000-0000-0000-0000-000000000002'
    )
      and status = 'published'
  ),
  2::bigint,
  'new organization defaults are published'
);

select extensions.is(
  (
    select count(*)
    from public.activity_result_definitions
    where organization_id in (
      '6a000000-0000-0000-0000-000000000001',
      '6b000000-0000-0000-0000-000000000002'
    )
  ),
  6::bigint,
  'each new organization owns three independent default results'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.activity_result_definitions', 'SELECT'),
  'authenticated members may select result definitions through RLS'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.activity_result_definitions', 'INSERT'),
  'authenticated clients cannot write result definitions directly'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.activity_definitions),
  1::bigint,
  'an Alpha member sees only the Alpha definition'
);

select extensions.is(
  (select count(*) from public.activity_definition_versions),
  1::bigint,
  'an Alpha member sees only the Alpha definition version'
);

select extensions.is(
  (select count(*) from public.activity_result_definitions),
  3::bigint,
  'an Alpha member sees only the Alpha result catalog'
);

select extensions.is(
  (
    select activity_definition_version
    from public.case_activities
    where id = '6e000000-0000-0000-0000-000000000001'
  ),
  1,
  'an activity freezes the current definition version when it is created'
);

reset role;

insert into public.activity_definition_versions (
  organization_id,
  activity_definition_id,
  version,
  title,
  description,
  status,
  created_by
)
select
  definition.organization_id,
  definition.id,
  2,
  'Allmän aktivitet version två',
  'Classification changed for the versioning test.',
  'draft',
  '61000000-0000-0000-0000-000000000001'
from public.activity_definitions definition
where definition.organization_id = '6a000000-0000-0000-0000-000000000001'
  and definition.is_default;

insert into public.activity_result_definitions (
  organization_id,
  activity_definition_id,
  activity_definition_version,
  code,
  label,
  classification,
  sort_order,
  created_by
)
select
  definition.organization_id,
  definition.id,
  2,
  result.code,
  result.label,
  result.classification,
  result.sort_order,
  '61000000-0000-0000-0000-000000000001'
from public.activity_definitions definition
cross join (
  values
    ('completed-as-planned', 'Genomförd enligt ny plan', 'deviation', 10),
    ('completed-with-adjustments', 'Genomförd med anpassning', 'accepted', 20),
    ('not-completed', 'Kunde inte genomföras', 'deviation', 30)
) as result(code, label, classification, sort_order)
where definition.organization_id = '6a000000-0000-0000-0000-000000000001'
  and definition.is_default;

update public.activity_definition_versions version_row
set
  status = 'published',
  published_at = now(),
  published_by = '61000000-0000-0000-0000-000000000001'
where version_row.organization_id = '6a000000-0000-0000-0000-000000000001'
  and version_row.version = 2;

update public.activity_definitions definition
set
  current_version = 2,
  updated_by = '61000000-0000-0000-0000-000000000001'
where definition.organization_id = '6a000000-0000-0000-0000-000000000001'
  and definition.is_default;

select extensions.throws_matching(
  $$
    update public.activity_result_definitions
    set label = 'Forbidden mutation'
    where organization_id = '6a000000-0000-0000-0000-000000000001'
      and activity_definition_version = 2
      and code = 'completed-as-planned'
  $$,
  '.*published activity definition version are immutable.*|.*results of a published activity definition version are immutable.*',
  'results in a published version are immutable'
);

insert into public.activity_definition_versions (
  organization_id,
  activity_definition_id,
  version,
  title,
  status,
  created_by
)
select
  definition.organization_id,
  definition.id,
  3,
  'Empty draft',
  'draft',
  '61000000-0000-0000-0000-000000000001'
from public.activity_definitions definition
where definition.organization_id = '6a000000-0000-0000-0000-000000000001'
  and definition.is_default;

select extensions.throws_matching(
  $$
    update public.activity_definition_versions
    set
      status = 'published',
      published_at = now(),
      published_by = '61000000-0000-0000-0000-000000000001'
    where organization_id = '6a000000-0000-0000-0000-000000000001'
      and version = 3
  $$,
  '.*requires at least one result before publication.*',
  'an empty activity definition version cannot be published'
);

delete from public.activity_definition_versions
where organization_id = '6a000000-0000-0000-0000-000000000001'
  and version = 3;

insert into public.case_activities (
  id,
  organization_id,
  case_id,
  title,
  created_by,
  updated_by
)
values
  (
    '6e000000-0000-0000-0000-000000000002',
    '6a000000-0000-0000-0000-000000000001',
    '6c000000-0000-0000-0000-000000000001',
    'Alpha version two activity',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001'
  ),
  (
    '6e000000-0000-0000-0000-000000000003',
    '6a000000-0000-0000-0000-000000000001',
    '6c000000-0000-0000-0000-000000000001',
    'Alpha invalid result activity',
    '61000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001'
  );

select extensions.is(
  (
    select activity_definition_version
    from public.case_activities
    where id = '6e000000-0000-0000-0000-000000000001'
  ),
  1,
  'an existing activity remains pinned to version one'
);

select extensions.is(
  (
    select activity_definition_version
    from public.case_activities
    where id = '6e000000-0000-0000-0000-000000000002'
  ),
  2,
  'a new activity uses the new current version'
);

select extensions.throws_matching(
  $$
    insert into public.case_activities (
      organization_id,
      case_id,
      title,
      activity_definition_id,
      activity_definition_version,
      created_by,
      updated_by
    )
    select
      '6a000000-0000-0000-0000-000000000001',
      '6c000000-0000-0000-0000-000000000001',
      'Cross organization definition',
      definition.id,
      definition.current_version,
      '61000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001'
    from public.activity_definitions definition
    where definition.organization_id = '6b000000-0000-0000-0000-000000000002'
      and definition.is_default
  $$,
  '.*activity definition must be active and published in the activity organization.*',
  'an activity cannot reference another organization definition'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.complete_case_activity(
      '6e000000-0000-0000-0000-000000000001',
      1,
      'completed-as-planned',
      'deviation',
      'activity-definition-complete-v1'
    )
  $$,
  'version one completion succeeds even when the client supplies the wrong classification'
);

select extensions.is(
  (
    select classification
    from public.case_activities
    where id = '6e000000-0000-0000-0000-000000000001'
  ),
  'accepted'::text,
  'the server derives version one classification instead of trusting the client'
);

select extensions.is(
  (
    select payload ->> 'activity_definition_version'
    from public.case_events
    where entity_id = '6e000000-0000-0000-0000-000000000001'
      and type = 'case_activity.completed'
  ),
  '1'::text,
  'the completion event records the frozen definition version'
);

select extensions.lives_ok(
  $$
    select public.complete_case_activity(
      '6e000000-0000-0000-0000-000000000002',
      1,
      'completed-as-planned',
      'accepted',
      'activity-definition-complete-v2'
    )
  $$,
  'version two completion succeeds'
);

select extensions.is(
  (
    select classification
    from public.case_activities
    where id = '6e000000-0000-0000-0000-000000000002'
  ),
  'deviation'::text,
  'the same result code resolves through the activity frozen version two definition'
);

select extensions.throws_matching(
  $$
    select public.complete_case_activity(
      '6e000000-0000-0000-0000-000000000003',
      1,
      'unknown-result',
      'accepted',
      'activity-definition-invalid-result'
    )
  $$,
  '.*result is not valid for the activity definition version.*',
  'the server rejects a result absent from the frozen definition version'
);

select extensions.is(
  (select count(*) from public.activity_definition_versions),
  2::bigint,
  'RLS exposes both Alpha versions but no other organization versions'
);

reset role;

select * from extensions.finish();

rollback;
