create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(46);

select extensions.ok(
  not has_function_privilege('anon', 'public.update_case_description(uuid,integer,text,text)', 'EXECUTE'),
  'anonymous clients cannot update case descriptions'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.update_case_description(uuid,integer,text,text)', 'EXECUTE'),
  'authenticated clients can reach the guarded description command'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.save_case_note(uuid,integer,uuid,text,uuid,text,uuid,text)', 'EXECUTE'),
  'anonymous clients cannot save case notes'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.save_case_note(uuid,integer,uuid,text,uuid,text,uuid,text)', 'EXECUTE'),
  'authenticated clients can reach the guarded note command'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.decide_activity_deviation(uuid,integer,integer,text,text,text,date,text,text)', 'EXECUTE'),
  'anonymous clients cannot decide deviations'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.decide_activity_deviation(uuid,integer,integer,text,text,text,date,text,text)', 'EXECUTE'),
  'authenticated clients can reach the guarded deviation command'
);

select extensions.is(
  (
    select count(*)
    from information_schema.table_privileges privilege
    where privilege.table_schema = 'public'
      and privilege.table_name in (
        'case_description_versions', 'case_notes',
        'activity_deviations', 'deviation_decisions'
      )
      and privilege.grantee in ('anon', 'authenticated', 'PUBLIC')
      and privilege.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ),
  0::bigint,
  'the new workspace tables expose no direct client write grant'
);

select extensions.is(
  (
    select count(*)
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'case_description_versions', 'case_notes',
        'activity_deviations', 'deviation_decisions'
      )
      and relation.relrowsecurity
  ),
  4::bigint,
  'RLS is enabled on every new workspace table'
);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('71000000-0000-0000-0000-000000000001', 'workspace-alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('72000000-0000-0000-0000-000000000002', 'workspace-beta@example.test', 'authenticated', 'authenticated', now(), now()),
  ('73000000-0000-0000-0000-000000000003', 'workspace-reader@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  ('7a000000-0000-0000-0000-000000000001', 'workspace-alpha', 'Workspace Alpha', '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('7b000000-0000-0000-0000-000000000002', 'workspace-beta', 'Workspace Beta', '72000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002');

insert into public.user_profiles (organization_id, user_id, display_name, created_by, updated_by)
values
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'Alpha Handler', '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('7a000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', 'Alpha Reader', '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('7b000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'Beta Handler', '72000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002');

insert into public.organization_memberships (
  organization_id, user_id, role, status, activated_at, created_by, updated_by
)
values
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'handler', 'active', now(), '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('7a000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', 'reader', 'active', now(), '71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('7b000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'handler', 'active', now(), '72000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002');

insert into public.cases (
  id, organization_id, number, case_type_id, title, description, created_by, updated_by
) values (
  '7c000000-0000-0000-0000-000000000002',
  '7b000000-0000-0000-0000-000000000002',
  'BETA-1', 'support', 'Beta case', 'Beta description',
  '72000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002'
);

insert into public.case_activities (
  id, organization_id, case_id, title, created_by, updated_by
) values (
  '7d000000-0000-0000-0000-000000000002',
  '7b000000-0000-0000-0000-000000000002',
  '7c000000-0000-0000-0000-000000000002',
  'Beta activity',
  '72000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$select public.create_case('ALPHA-1', 'support', 'Alpha case', 'Initial description', 'normal', null, 'workspace-case-create')$$,
  'a handler creates the case through the command boundary'
);

select extensions.is(
  (select count(*) from public.case_description_versions description
    join public.cases case_row on case_row.id = description.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'case creation captures the initial description version'
);
select extensions.is(
  (select description.text from public.case_description_versions description
    join public.cases case_row on case_row.id = description.case_id
    where case_row.number = 'ALPHA-1'),
  'Initial description'::text,
  'the initial description snapshot keeps its text'
);

select extensions.lives_ok(
  $$select public.update_case_description(
    (select id from public.cases where number = 'ALPHA-1'), 1,
    'Updated description', 'workspace-description-update'
  )$$,
  'a handler appends a new description version'
);
select extensions.is(
  (select version from public.cases where number = 'ALPHA-1'),
  2,
  'description updates increment the case version'
);
select extensions.is(
  (select count(*) from public.case_description_versions description
    join public.cases case_row on case_row.id = description.case_id
    where case_row.number = 'ALPHA-1'),
  2::bigint,
  'description history retains both versions'
);
select extensions.is(
  (select text from public.case_description_versions description
    join public.cases case_row on case_row.id = description.case_id
    where case_row.number = 'ALPHA-1' order by description.version desc limit 1),
  'Updated description'::text,
  'the latest description version contains the update'
);

select public.update_case_description(
  (select id from public.cases where number = 'ALPHA-1'), 1,
  'Updated description', 'workspace-description-update'
);
select extensions.is(
  (select count(*) from public.case_description_versions description
    join public.cases case_row on case_row.id = description.case_id
    where case_row.number = 'ALPHA-1'),
  2::bigint,
  'replaying a description command does not append another version'
);
select extensions.throws_matching(
  $$select public.update_case_description(
    (select id from public.cases where number = 'ALPHA-1'), 1,
    'Stale description', 'workspace-description-stale'
  )$$,
  '.*case version conflict.*',
  'a stale description editor is rejected'
);

select extensions.lives_ok(
  $$select public.save_case_note(
    (select id from public.cases where number = 'ALPHA-1'), 2, null,
    'case', null, 'First note', null, 'workspace-note-create'
  )$$,
  'a handler adds an append-only case note'
);
select extensions.is(
  (select count(*) from public.case_notes note
    join public.cases case_row on case_row.id = note.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'one logical note version is stored'
);

select public.save_case_note(
  (select id from public.cases where number = 'ALPHA-1'), 2, null,
  'case', null, 'First note', null, 'workspace-note-create'
);
select extensions.is(
  (select count(*) from public.case_notes note
    join public.cases case_row on case_row.id = note.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'replaying a new-note command returns the original note version'
);

select extensions.lives_ok(
  $$select public.save_case_note(
    (select id from public.cases where number = 'ALPHA-1'), 3,
    (select note_id from public.case_notes note join public.cases case_row on case_row.id = note.case_id where case_row.number = 'ALPHA-1'),
    'case', null, 'Corrected note',
    (select note.id from public.case_notes note join public.cases case_row on case_row.id = note.case_id where case_row.number = 'ALPHA-1'),
    'workspace-note-correct'
  )$$,
  'a correction appends a second version without deleting the first'
);
select extensions.is(
  (select count(*) from public.case_notes note
    join public.cases case_row on case_row.id = note.case_id
    where case_row.number = 'ALPHA-1'),
  2::bigint,
  'the corrected note retains two versions'
);
select extensions.is(
  (select text from public.case_notes note
    join public.cases case_row on case_row.id = note.case_id
    where case_row.number = 'ALPHA-1' order by note.version desc limit 1),
  'Corrected note'::text,
  'the latest note version contains the correction'
);
select extensions.is(
  (select text from public.case_notes note
    join public.cases case_row on case_row.id = note.case_id
    where case_row.number = 'ALPHA-1' order by note.version limit 1),
  'First note'::text,
  'the original note text remains immutable'
);
select extensions.throws_matching(
  $$select public.save_case_note(
    (select id from public.cases where number = 'ALPHA-1'), 4,
    (select note_id from public.case_notes note join public.cases case_row on case_row.id = note.case_id where case_row.number = 'ALPHA-1' limit 1),
    'case', null, 'Second stale correction',
    (select note.id from public.case_notes note join public.cases case_row on case_row.id = note.case_id where case_row.number = 'ALPHA-1' order by note.version limit 1),
    'workspace-note-stale'
  )$$,
  '.*note version conflict.*',
  'an already-corrected note version cannot branch'
);
select extensions.throws_matching(
  $$select public.save_case_note(
    (select id from public.cases where number = 'ALPHA-1'), 4, null,
    'activity', '7d000000-0000-0000-0000-000000000002',
    'Cross organization target', null, 'workspace-note-cross-org'
  )$$,
  '.*note activity does not belong to the case.*',
  'a note cannot target another organizations activity'
);

select extensions.lives_ok(
  $$select public.create_case_activity(
    (select id from public.cases where number = 'ALPHA-1'),
    (select id from public.activity_definitions where is_default),
    (select current_version from public.activity_definitions where is_default),
    'Deviation activity', current_date + 1, 'workspace-activity-deviation'
  )$$,
  'a handler creates an activity for the deviation flow'
);
select extensions.lives_ok(
  $$select public.complete_case_activity(
    (select id from public.case_activities where title = 'Deviation activity'),
    1, 'not-completed', null, 'workspace-activity-deviation-complete'
  )$$,
  'a catalog-classified deviation result completes the activity'
);
select extensions.is(
  (select count(*) from public.activity_deviations deviation
    join public.cases case_row on case_row.id = deviation.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'the database automatically opens one deviation'
);
select extensions.is(
  (select count(*) from public.case_events event
    join public.cases case_row on case_row.id = event.case_id
    where case_row.number = 'ALPHA-1' and event.type = 'deviation.opened'),
  1::bigint,
  'automatic deviation creation is audited'
);

select extensions.throws_matching(
  $$insert into public.case_notes (
    organization_id, case_id, target_type, text, version, created_by
  ) values (
    '7a000000-0000-0000-0000-000000000001',
    (select id from public.cases where number = 'ALPHA-1'),
    'case', 'Forbidden direct note', 1,
    '71000000-0000-0000-0000-000000000001'
  )$$,
  '.*permission denied for table case_notes.*',
  'authenticated clients cannot bypass the note command with a direct insert'
);

select extensions.lives_ok(
  $$select public.decide_activity_deviation(
    (select deviation.id from public.activity_deviations deviation join public.cases case_row on case_row.id = deviation.case_id where case_row.number = 'ALPHA-1'),
    1, 4, 'request_supplement', 'missing-information',
    'Ask the mentor for a complete attachment', current_date + 5,
    'Request complete attachment', 'workspace-deviation-decide'
  )$$,
  'a handler records a deviation decision and follow-up'
);
select extensions.is(
  (select deviation.status from public.activity_deviations deviation
    join public.cases case_row on case_row.id = deviation.case_id
    where case_row.number = 'ALPHA-1'),
  'resolved'::text,
  'the decision resolves the open deviation'
);
select extensions.is(
  (select count(*) from public.deviation_decisions decision
    join public.activity_deviations deviation on deviation.id = decision.deviation_id
    join public.cases case_row on case_row.id = deviation.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'one immutable deviation decision is stored'
);
select extensions.is(
  (select version from public.cases where number = 'ALPHA-1'),
  5,
  'the deviation decision increments the case version'
);
select extensions.is(
  (select count(*) from public.case_activities activity
    join public.cases case_row on case_row.id = activity.case_id
    where case_row.number = 'ALPHA-1' and activity.title = 'Request complete attachment'),
  1::bigint,
  'requesting a supplement creates one follow-up activity'
);

select public.decide_activity_deviation(
  (select deviation.id from public.activity_deviations deviation join public.cases case_row on case_row.id = deviation.case_id where case_row.number = 'ALPHA-1'),
  1, 4, 'request_supplement', 'missing-information',
  'Ask the mentor for a complete attachment', current_date + 5,
  'Request complete attachment', 'workspace-deviation-decide'
);
select extensions.is(
  (select count(*) from public.deviation_decisions decision
    join public.activity_deviations deviation on deviation.id = decision.deviation_id
    join public.cases case_row on case_row.id = deviation.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'replaying a deviation decision does not duplicate it'
);

select extensions.lives_ok(
  $$select public.create_case_activity(
    (select id from public.cases where number = 'ALPHA-1'),
    (select id from public.activity_definitions where is_default),
    (select current_version from public.activity_definitions where is_default),
    'Accepted activity', current_date + 2, 'workspace-activity-accepted'
  )$$,
  'a second activity is created for the accepted-result control'
);
select extensions.lives_ok(
  $$select public.complete_case_activity(
    (select id from public.case_activities where title = 'Accepted activity'),
    1, 'completed-as-planned', null, 'workspace-activity-accepted-complete'
  )$$,
  'an accepted result completes without error'
);
select extensions.is(
  (select count(*) from public.activity_deviations deviation
    join public.cases case_row on case_row.id = deviation.case_id
    where case_row.number = 'ALPHA-1'),
  1::bigint,
  'an accepted result does not open another deviation'
);

select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);
select extensions.is(
  (select count(*) from public.case_description_versions where case_id = (select id from public.cases where number = 'ALPHA-1')),
  0::bigint,
  'a Beta member cannot read Alpha description versions'
);
select extensions.is(
  (select count(*) from public.case_notes where organization_id = '7a000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a Beta member cannot read Alpha notes'
);
select extensions.is(
  (select count(*) from public.activity_deviations where organization_id = '7a000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a Beta member cannot read Alpha deviations'
);
select extensions.is(
  (select count(*) from public.deviation_decisions where organization_id = '7a000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a Beta member cannot read Alpha decisions'
);

select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000003', true);
select extensions.is(
  (select count(*) from public.case_description_versions description
    join public.cases case_row on case_row.id = description.case_id
    where case_row.number = 'ALPHA-1'),
  2::bigint,
  'an active reader can inspect the organizations description history'
);
select extensions.throws_matching(
  $$select public.update_case_description(
    (select id from public.cases where number = 'ALPHA-1'), 5,
    'Reader write', 'workspace-reader-write'
  )$$,
  '.*lacks an active organization role.*',
  'a reader cannot execute workspace write commands'
);

select * from extensions.finish();
rollback;
