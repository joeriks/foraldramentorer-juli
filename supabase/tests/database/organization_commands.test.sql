create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(34);

create temporary table command_test_state (
  organization_id uuid primary key
) on commit drop;

grant select on table command_test_state to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('51000000-0000-0000-0000-000000000001', 'superadmin@example.test', 'authenticated', 'authenticated', now(), now()),
  ('52000000-0000-0000-0000-000000000002', 'first-admin@example.test', 'authenticated', 'authenticated', now(), now()),
  ('53000000-0000-0000-0000-000000000003', 'reader@example.test', 'authenticated', 'authenticated', now(), now()),
  ('54000000-0000-0000-0000-000000000004', 'outsider@example.test', 'authenticated', 'authenticated', now(), now());

insert into private.platform_superadmins (user_id, created_by, updated_by)
values (
  '51000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.create_case(text,text,text,text,text,uuid,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the case command'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_case(text,text,text,text,text,uuid,text)',
    'EXECUTE'
  ),
  'authenticated clients can reach the guarded case command'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);

select extensions.throws_matching(
  $$
    select public.platform_create_organization(
      'rpc-org',
      'RPC Organization',
      'live',
      '52000000-0000-0000-0000-000000000002',
      'First Admin',
      'Initial provisioning',
      'platform-create-1'
    )
  $$,
  '.*active platform superadmin is required.*',
  'a normal authenticated user cannot provision organizations'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.platform_create_organization(
      'rpc-org',
      'RPC Organization',
      'live',
      '52000000-0000-0000-0000-000000000002',
      'First Admin',
      'Initial provisioning',
      'platform-create-1'
    )
  $$,
  'a platform superadmin can provision an organization and its first administrator'
);

select extensions.lives_ok(
  $$
    set constraints activity_definitions_current_version_published immediate
  $$,
  'the deferred published-definition check can validate control-plane provisioning through RLS'
);

select extensions.is(
  public.platform_create_organization(
    'rpc-org',
    'RPC Organization',
    'live',
    '52000000-0000-0000-0000-000000000002',
    'First Admin',
    'Initial provisioning',
    'platform-create-1'
  ),
  public.platform_create_organization(
    'rpc-org',
    'RPC Organization',
    'live',
    '52000000-0000-0000-0000-000000000002',
    'First Admin',
    'Initial provisioning',
    'platform-create-1'
  ),
  'replaying organization provisioning returns the original organization'
);

reset role;

insert into command_test_state (organization_id)
select id
from public.organizations
where slug = 'rpc-org';

select extensions.is(
  (select count(*) from public.organizations where slug = 'rpc-org'),
  1::bigint,
  'idempotent provisioning creates one organization'
);

select extensions.is(
  (select kind from public.organizations where slug = 'rpc-org'),
  'live'::text,
  'provisioning persists the server-controlled organization kind'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select extensions.throws_matching(
  $$
    select public.platform_create_organization(
      'rpc-org',
      'Changed Organization',
      'live',
      '52000000-0000-0000-0000-000000000002',
      'First Admin',
      'Initial provisioning',
      'platform-create-1'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'a platform idempotency key cannot be reused with changed input'
);

reset role;

select extensions.is(
  (
    select membership.role
    from public.organization_memberships membership
    join public.organizations organization
      on organization.id = membership.organization_id
    where organization.slug = 'rpc-org'
      and membership.user_id = '52000000-0000-0000-0000-000000000002'
  ),
  'administrator'::text,
  'provisioning appoints the requested first administrator'
);

select extensions.is(
  (
    select count(*)
    from private.platform_admin_events event
    where event.event_type = 'organization.created'
  ),
  1::bigint,
  'organization provisioning creates one control-plane audit event'
);

insert into public.user_profiles (
  organization_id,
  user_id,
  display_name,
  created_by,
  updated_by
)
select
  organization.id,
  '53000000-0000-0000-0000-000000000003',
  'Read Only',
  '52000000-0000-0000-0000-000000000002',
  '52000000-0000-0000-0000-000000000002'
from public.organizations organization
where organization.slug = 'rpc-org';

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  created_by,
  updated_by,
  activated_at
)
select
  organization.id,
  '53000000-0000-0000-0000-000000000003',
  'reader',
  'active',
  '52000000-0000-0000-0000-000000000002',
  '52000000-0000-0000-0000-000000000002',
  now()
from public.organizations organization
where organization.slug = 'rpc-org';

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.organizations),
  1::bigint,
  'the provisioned administrator can read the active organization'
);

select extensions.lives_ok(
  $$
    select public.create_case(
      'RPC-1',
      'support',
      'RPC case',
      'Created through the command boundary',
      'normal',
      null,
      'case-create-1'
    )
  $$,
  'an administrator can create a case through the command boundary'
);

select extensions.is(
  (select count(*) from public.cases where number = 'RPC-1'),
  1::bigint,
  'the case command creates one visible case'
);

select extensions.is(
  (public.create_case(
    'RPC-1',
    'support',
    'RPC case',
    'Created through the command boundary',
    'normal',
    null,
    'case-create-1'
  )).id,
  (select id from public.cases where number = 'RPC-1'),
  'replaying case creation returns the original case'
);

select extensions.throws_matching(
  $$
    select public.create_case(
      'RPC-2',
      'support',
      'Changed command',
      '',
      'normal',
      null,
      'case-create-1'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'an organization idempotency key cannot be reused with changed input'
);

select extensions.lives_ok(
  $$
    select public.create_case_activity(
      (select id from public.cases where number = 'RPC-1'),
      (select id from public.activity_definitions where is_default),
      (select current_version from public.activity_definitions where is_default),
      'Initial interview',
      current_date + 7,
      'activity-create-1'
    )
  $$,
  'an administrator can add an activity through the command boundary'
);

select extensions.is(
  (select count(*) from public.case_activities where title = 'Initial interview'),
  1::bigint,
  'the activity command creates one visible activity'
);

select extensions.lives_ok(
  $$
    select public.complete_case_activity(
      (select id from public.case_activities where title = 'Initial interview'),
      1,
      'completed-as-planned',
      'accepted',
      'activity-complete-1'
    )
  $$,
  'an administrator can complete an activity with the current version'
);

select extensions.is(
  (select status from public.case_activities where title = 'Initial interview'),
  'completed'::text,
  'activity completion changes the status'
);

select extensions.is(
  (select version from public.case_activities where title = 'Initial interview'),
  2,
  'activity completion increments the version'
);

select extensions.is(
  (select count(*) from public.case_events),
  3::bigint,
  'case and activity commands append three audit events'
);

select extensions.throws_matching(
  $$
    select public.complete_case_activity(
      (select id from public.case_activities where title = 'Initial interview'),
      1,
      'completed-as-planned',
      'accepted',
      'activity-complete-stale'
    )
  $$,
  '.*version conflict.*',
  'a stale activity version is rejected'
);

select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000003', true);

select extensions.throws_matching(
  $$
    select public.create_case(
      'RPC-READER',
      'support',
      'Forbidden reader case',
      '',
      'normal',
      null,
      'reader-create-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a reader cannot execute a write command'
);

select set_config('request.jwt.claim.sub', '54000000-0000-0000-0000-000000000004', true);

select extensions.throws_matching(
  $$
    select public.create_case(
      'RPC-OUTSIDER',
      'support',
      'Forbidden outsider case',
      '',
      'normal',
      null,
      'outsider-create-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a user without membership cannot execute a write command'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.cases),
  0::bigint,
  'a platform superadmin still has no implicit business-data access'
);

select extensions.lives_ok(
  $$
    select public.platform_set_organization_status(
      (select organization_id from command_test_state),
      'suspended',
      'Security test suspension',
      'platform-suspend-1'
    )
  $$,
  'a platform superadmin can suspend an organization'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.organizations),
  0::bigint,
  'suspension immediately hides the organization from its administrator'
);

select extensions.is(
  (select count(*) from public.cases),
  0::bigint,
  'suspension immediately hides all organization cases'
);

select extensions.throws_matching(
  $$
    select public.create_case(
      'RPC-SUSPENDED',
      'support',
      'Forbidden suspended case',
      '',
      'normal',
      null,
      'suspended-create-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'suspension immediately blocks organization write commands'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.platform_set_organization_status(
      (select organization_id from command_test_state),
      'active',
      'Security test reactivation',
      'platform-reactivate-1'
    )
  $$,
  'a platform superadmin can reactivate an organization'
);

select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.cases),
  1::bigint,
  'reactivation restores the organization administrator read access'
);

reset role;

select extensions.is(
  (
    select count(*)
    from private.platform_admin_events event
    where event.event_type in ('organization.suspended', 'organization.reactivated')
  ),
  2::bigint,
  'suspension and reactivation are both audited'
);

select extensions.is(
  (select count(*) from private.platform_processed_commands),
  3::bigint,
  'control-plane commands are idempotently recorded'
);

select * from extensions.finish();

rollback;
