create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(16);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('81000000-0000-0000-0000-000000000001', 'create-alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('82000000-0000-0000-0000-000000000002', 'create-beta@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  (
    '8a000000-0000-0000-0000-000000000001',
    'create-alpha',
    'Create Alpha',
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001'
  ),
  (
    '8b000000-0000-0000-0000-000000000002',
    'create-beta',
    'Create Beta',
    '82000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002'
  );

insert into public.user_profiles (
  organization_id, user_id, display_name, created_by, updated_by
)
values
  (
    '8a000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'Create Alpha Administrator',
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001'
  ),
  (
    '8b000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002',
    'Create Beta Administrator',
    '82000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002'
  );

insert into public.organization_memberships (
  organization_id, user_id, role, status, created_by, updated_by, activated_at
)
values
  (
    '8a000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'administrator',
    'active',
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '8b000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002',
    'administrator',
    'active',
    '82000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002',
    now()
  );

insert into public.cases (
  id, organization_id, number, case_type_id, title, created_by, updated_by
)
values
  (
    '8c000000-0000-0000-0000-000000000001',
    '8a000000-0000-0000-0000-000000000001',
    'CREATE-A-1',
    'support',
    'Create Alpha case',
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001'
  ),
  (
    '8d000000-0000-0000-0000-000000000002',
    '8b000000-0000-0000-0000-000000000002',
    'CREATE-B-1',
    'support',
    'Create Beta case',
    '82000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002'
  );

create temporary table definition_selection_test_state (
  organization_id uuid primary key,
  activity_definition_id uuid not null
) on commit drop;

grant select on table definition_selection_test_state to authenticated;

insert into definition_selection_test_state (organization_id, activity_definition_id)
select organization_id, id
from public.activity_definitions
where organization_id in (
  '8a000000-0000-0000-0000-000000000001',
  '8b000000-0000-0000-0000-000000000002'
)
  and is_default;

insert into public.case_activities (
  organization_id, case_id, title, created_by, updated_by
)
values (
  '8b000000-0000-0000-0000-000000000002',
  '8d000000-0000-0000-0000-000000000002',
  'Beta existing activity',
  '82000000-0000-0000-0000-000000000002',
  '82000000-0000-0000-0000-000000000002'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.create_case_activity(uuid,uuid,integer,text,date,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot create activities'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_case_activity(uuid,uuid,integer,text,date,text)',
    'EXECUTE'
  ),
  'authenticated clients can reach the guarded activity command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      1,
      'Explicit version one',
      current_date + 7,
      'explicit-create-v1'
    )
  $$,
  'an activity is created from an explicitly selected published definition'
);

select extensions.is(
  (select activity_definition_version from public.case_activities where title = 'Explicit version one'),
  1,
  'the selected version is frozen on the activity'
);

select extensions.is(
  (
    select payload ->> 'activity_definition_id'
    from public.case_events
    where type = 'case_activity.created'
      and entity_id = (select id from public.case_activities where title = 'Explicit version one')
  ),
  (select id::text from public.activity_definitions where is_default),
  'the creation event records the selected definition'
);

select extensions.is(
  (
    select (public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      1,
      'Explicit version one',
      current_date + 7,
      'explicit-create-v1'
    )).id
  ),
  (select id from public.case_activities where title = 'Explicit version one'),
  'an idempotent replay returns the original activity'
);

select extensions.throws_matching(
  $$
    select public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      1,
      'Changed input',
      current_date + 7,
      'explicit-create-v1'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'an idempotency key cannot be replayed with changed input'
);

reset role;

insert into public.activity_definition_versions (
  organization_id, activity_definition_id, version, title, status, created_by
)
select
  definition.organization_id,
  definition.id,
  2,
  'Allmän aktivitet version två',
  'draft',
  '81000000-0000-0000-0000-000000000001'
from public.activity_definitions definition
where definition.organization_id = '8a000000-0000-0000-0000-000000000001'
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
  '81000000-0000-0000-0000-000000000001'
from public.activity_definitions definition
cross join (
  values
    ('completed-as-planned', 'Genomförd enligt plan', 'accepted', 10),
    ('not-completed', 'Kunde inte genomföras', 'deviation', 20)
) as result(code, label, classification, sort_order)
where definition.organization_id = '8a000000-0000-0000-0000-000000000001'
  and definition.is_default;

update public.activity_definition_versions version_row
set
  status = 'published',
  published_at = now(),
  published_by = '81000000-0000-0000-0000-000000000001'
where version_row.organization_id = '8a000000-0000-0000-0000-000000000001'
  and version_row.version = 2;

update public.activity_definitions definition
set current_version = 2,
    updated_by = '81000000-0000-0000-0000-000000000001'
where definition.organization_id = '8a000000-0000-0000-0000-000000000001'
  and definition.is_default;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);

select extensions.throws_matching(
  $$
    select public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      1,
      'Stale version',
      null,
      'explicit-create-stale'
    )
  $$,
  '.*version conflict: expected 1, current 2.*',
  'a stale selected definition version is rejected'
);

select extensions.is(
  (select count(*) from public.case_activities where title = 'Stale version'),
  0::bigint,
  'a stale request writes no activity'
);

select extensions.is(
  (
    select (public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      1,
      'Explicit version one',
      current_date + 7,
      'explicit-create-v1'
    )).activity_definition_version
  ),
  1,
  'an old successful command can still be replayed after a newer publication'
);

select extensions.lives_ok(
  $$
    select public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      2,
      'Explicit version two',
      null,
      'explicit-create-v2'
    )
  $$,
  'the current published version can be selected'
);

select extensions.is(
  (select activity_definition_version from public.case_activities where title = 'Explicit version two'),
  2,
  'the newer selected version is frozen independently'
);

select extensions.throws_matching(
  $$
    select public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select activity_definition_id from definition_selection_test_state where organization_id = '8b000000-0000-0000-0000-000000000002'),
      1,
      'Cross organization definition',
      null,
      'explicit-create-cross-org'
    )
  $$,
  '.*active activity definition not found in the active organization.*',
  'another organizations definition cannot be selected'
);

reset role;

insert into public.activity_definitions (
  id, organization_id, stable_key, status, current_version, created_by, updated_by
)
values (
  '8e000000-0000-0000-0000-000000000001',
  '8a000000-0000-0000-0000-000000000001',
  'draft-only',
  'active',
  1,
  '81000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001'
);

insert into public.activity_definition_versions (
  organization_id, activity_definition_id, version, title, status, created_by
)
values (
  '8a000000-0000-0000-0000-000000000001',
  '8e000000-0000-0000-0000-000000000001',
  1,
  'Draft only',
  'draft',
  '81000000-0000-0000-0000-000000000001'
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
    values (
      '8a000000-0000-0000-0000-000000000001',
      '8c000000-0000-0000-0000-000000000001',
      'Draft definition activity',
      '8e000000-0000-0000-0000-000000000001',
      1,
      '81000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001'
    )
  $$,
  '.*activity definition must be active and published in the activity organization.*',
  'the table invariant rejects a draft definition version'
);

update public.activity_definitions
set status = 'retired'
where organization_id = '8a000000-0000-0000-0000-000000000001'
  and is_default;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);

select extensions.throws_matching(
  $$
    select public.create_case_activity(
      '8c000000-0000-0000-0000-000000000001',
      (select id from public.activity_definitions where is_default),
      2,
      'Retired definition',
      null,
      'explicit-create-retired'
    )
  $$,
  '.*active activity definition not found in the active organization.*',
  'a retired definition cannot be selected'
);

select extensions.is(
  (select count(*) from public.case_activities where organization_id = '8b000000-0000-0000-0000-000000000002'),
  0::bigint,
  'RLS does not expose another organizations activity rows'
);

reset role;

select * from extensions.finish();

rollback;
