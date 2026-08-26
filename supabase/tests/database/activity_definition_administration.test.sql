create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(29);

create temporary table activity_definition_admin_state (
  alpha_custom_id uuid not null,
  alpha_default_id uuid not null
) on commit drop;

grant select on table activity_definition_admin_state to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('71000000-0000-0000-0000-000000000001', 'definition-reader@example.test', 'authenticated', 'authenticated', now(), now()),
  ('72000000-0000-0000-0000-000000000002', 'definition-beta-admin@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values (
  '7a000000-0000-0000-0000-000000000002',
  'definition-beta',
  'Definition Beta',
  '72000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000002'
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
    'e1000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'Definition Reader',
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001'
  ),
  (
    '7a000000-0000-0000-0000-000000000002',
    '72000000-0000-0000-0000-000000000002',
    'Definition Beta Admin',
    '72000000-0000-0000-0000-000000000002',
    '72000000-0000-0000-0000-000000000002'
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
    'e1000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'reader',
    'active',
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '7a000000-0000-0000-0000-000000000002',
    '72000000-0000-0000-0000-000000000002',
    'administrator',
    'active',
    '72000000-0000-0000-0000-000000000002',
    '72000000-0000-0000-0000-000000000002',
    now()
  );

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.publish_activity_definition(uuid,integer,text,text,text,jsonb,text,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot publish activity definitions'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.publish_activity_definition(uuid,integer,text,text,text,jsonb,text,text)',
    'EXECUTE'
  ),
  'authenticated clients can reach the role-guarded publication command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.activity_definitions),
  1::bigint,
  'the demo administrator initially sees the organization default only'
);

select extensions.lives_ok(
  $$
    select public.publish_activity_definition(
      null,
      null,
      'home-visit',
      'Hembesök',
      'Organisationsägd definition för planerade hembesök.',
      '[
        {"code":"completed","label":"Genomfört","classification":"accepted","sort_order":10},
        {"code":"cancelled","label":"Inställt","classification":"deviation","sort_order":20}
      ]'::jsonb,
      'Ny rutin för hembesök',
      'definition-create-home-visit'
    )
  $$,
  'an administrator can atomically create and publish a definition'
);

select extensions.is(
  (select current_version from public.activity_definitions where stable_key = 'home-visit'),
  1,
  'a newly published definition starts at version one'
);

select extensions.is(
  (
    select count(*)
    from public.activity_result_definitions result_definition
    join public.activity_definitions definition
      on definition.organization_id = result_definition.organization_id
     and definition.id = result_definition.activity_definition_id
    where definition.stable_key = 'home-visit'
  ),
  2::bigint,
  'the complete result catalog is stored with the new version'
);

select extensions.is(
  (
    select reason
    from public.activity_definition_events event
    join public.activity_definitions definition
      on definition.organization_id = event.organization_id
     and definition.id = event.activity_definition_id
    where definition.stable_key = 'home-visit'
  ),
  'Ny rutin för hembesök'::text,
  'publication records the administrators stated reason'
);

select extensions.is(
  (
    public.publish_activity_definition(
      null,
      null,
      'home-visit',
      'Hembesök',
      'Organisationsägd definition för planerade hembesök.',
      '[
        {"code":"completed","label":"Genomfört","classification":"accepted","sort_order":10},
        {"code":"cancelled","label":"Inställt","classification":"deviation","sort_order":20}
      ]'::jsonb,
      'Ny rutin för hembesök',
      'definition-create-home-visit'
    )
  ).id,
  (select id from public.activity_definitions where stable_key = 'home-visit'),
  'an identical idempotent replay returns the original definition'
);

reset role;

select extensions.is(
  (
    select count(*)
    from public.processed_commands
    where command_type = 'activity_definition.publish'
  ),
  1::bigint,
  'an idempotent replay creates one processed command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);

select extensions.throws_matching(
  $$
    select public.publish_activity_definition(
      null,
      null,
      'changed-key',
      'Changed title',
      '',
      '[{"code":"done","label":"Done","classification":"accepted"}]'::jsonb,
      'Changed input',
      'definition-create-home-visit'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'an idempotency key cannot be reused with changed input'
);

select extensions.throws_matching(
  $$
    select public.publish_activity_definition(
      null,
      null,
      'duplicate-results',
      'Duplicate results',
      '',
      '[
        {"code":"done","label":"Done","classification":"accepted"},
        {"code":"done","label":"Done again","classification":"deviation"}
      ]'::jsonb,
      'Invalid catalog test',
      'definition-invalid-duplicates'
    )
  $$,
  '.*result codes and sort orders must be unique.*',
  'duplicate result codes are rejected before publication'
);

select extensions.throws_matching(
  $$
    select public.publish_activity_definition(
      null,
      null,
      'invalid-results',
      'Invalid results',
      '',
      '[{"code":"Not valid","label":"Bad","classification":"accepted"}]'::jsonb,
      'Invalid catalog test',
      'definition-invalid-code'
    )
  $$,
  '.*each result requires a unique kebab-case code.*',
  'unstable result codes are rejected before publication'
);

select extensions.lives_ok(
  $$
    select public.publish_activity_definition(
      (select id from public.activity_definitions where is_default),
      1,
      'ad-hoc-activity',
      'Allmän aktivitet – reviderad',
      'Andra publicerade versionen.',
      '[
        {"code":"completed-as-planned","label":"Genomförd enligt reviderad plan","classification":"accepted","sort_order":10},
        {"code":"not-completed","label":"Kunde inte genomföras","classification":"deviation","sort_order":20}
      ]'::jsonb,
      'Resultatkatalogen har förenklats',
      'definition-publish-default-v2'
    )
  $$,
  'an administrator can publish a complete replacement as the next version'
);

select extensions.is(
  (select current_version from public.activity_definitions where is_default),
  2,
  'publication advances the definitions current version'
);

select extensions.is(
  (
    select count(*)
    from public.activity_definition_versions version_row
    join public.activity_definitions definition
      on definition.organization_id = version_row.organization_id
     and definition.id = version_row.activity_definition_id
    where definition.is_default
  ),
  2::bigint,
  'publication retains both immutable definition versions'
);

select extensions.is(
  (
    select label
    from public.activity_result_definitions result_definition
    join public.activity_definitions definition
      on definition.organization_id = result_definition.organization_id
     and definition.id = result_definition.activity_definition_id
    where definition.is_default
      and result_definition.activity_definition_version = 1
      and result_definition.code = 'completed-as-planned'
  ),
  'Genomförd enligt plan'::text,
  'publishing version two does not rewrite the version one result'
);

select extensions.is(
  (
    select label
    from public.activity_result_definitions result_definition
    join public.activity_definitions definition
      on definition.organization_id = result_definition.organization_id
     and definition.id = result_definition.activity_definition_id
    where definition.is_default
      and result_definition.activity_definition_version = 2
      and result_definition.code = 'completed-as-planned'
  ),
  'Genomförd enligt reviderad plan'::text,
  'the new current version contains the reviewed replacement result'
);

select extensions.is(
  (
    select reason
    from public.activity_definition_events
    where activity_definition_version = 2
  ),
  'Resultatkatalogen har förenklats'::text,
  'the version two audit event records its publication reason'
);

select extensions.throws_matching(
  $$
    select public.publish_activity_definition(
      (select id from public.activity_definitions where is_default),
      1,
      'ad-hoc-activity',
      'Stale publication',
      '',
      '[{"code":"done","label":"Done","classification":"accepted"}]'::jsonb,
      'Stale editor',
      'definition-publish-stale'
    )
  $$,
  '.*activity definition version conflict.*',
  'a stale editor cannot overwrite a newer definition version'
);

select extensions.is(
  (select count(*) from public.activity_definition_events),
  2::bigint,
  'the administrator sees both organization publication events'
);

reset role;

insert into activity_definition_admin_state (alpha_custom_id, alpha_default_id)
select
  (select id from public.activity_definitions where stable_key = 'home-visit'),
  (select id from public.activity_definitions where is_default and organization_id = 'e1000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.activity_definitions),
  2::bigint,
  'a reader may use the organizations published definitions'
);

select extensions.is(
  (select count(*) from public.activity_definition_events),
  0::bigint,
  'a reader cannot inspect definition administration audit events'
);

select extensions.throws_matching(
  $$
    select public.publish_activity_definition(
      null,
      null,
      'reader-definition',
      'Reader definition',
      '',
      '[{"code":"done","label":"Done","classification":"accepted"}]'::jsonb,
      'Forbidden reader attempt',
      'definition-reader-attempt'
    )
  $$,
  '.*lacks an active organization role.*',
  'a reader cannot publish activity definitions'
);

select extensions.throws_matching(
  $$
    insert into public.activity_definitions (
      organization_id,
      stable_key,
      current_version,
      created_by,
      updated_by
    ) values (
      'e1000000-0000-0000-0000-000000000001',
      'direct-write',
      1,
      '71000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001'
    )
  $$,
  '.*permission denied for table activity_definitions.*',
  'direct definition writes remain closed to clients'
);

select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.activity_definitions),
  1::bigint,
  'the Beta administrator sees only the Beta default definition'
);

select extensions.is(
  (select count(*) from public.activity_definition_events),
  0::bigint,
  'the Beta administrator cannot see Alpha publication events'
);

select extensions.throws_matching(
  $$
    select public.publish_activity_definition(
      (select alpha_custom_id from activity_definition_admin_state),
      1,
      'home-visit',
      'Cross organization update',
      '',
      '[{"code":"done","label":"Done","classification":"accepted"}]'::jsonb,
      'Cross organization attempt',
      'definition-cross-organization'
    )
  $$,
  '.*activity definition not found in the active organization.*',
  'an administrator cannot publish another organizations definition'
);

reset role;

select extensions.throws_matching(
  $$
    update public.activity_definition_events
    set reason = 'Rewritten audit reason'
    where id = (select id from public.activity_definition_events limit 1)
  $$,
  '.*activity definition events are append-only.*',
  'definition audit events cannot be rewritten even by a privileged SQL path'
);

select extensions.is(
  (
    select count(*)
    from public.activity_definition_events
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
  ),
  2::bigint,
  'failed cross-organization and audit mutation attempts leave Alpha audit intact'
);

select * from extensions.finish();

rollback;
