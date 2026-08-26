begin;

select extensions.plan(14);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('51000000-0000-0000-0000-000000000001', 'auth-alpha@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('52000000-0000-0000-0000-000000000002', 'auth-beta@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('53000000-0000-0000-0000-000000000003', 'auth-platform@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('54000000-0000-0000-0000-000000000004', 'auth-unassigned@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, kind, created_by, updated_by)
values
  ('51010000-0000-0000-0000-000000000001', 'auth-alpha', 'Auth Alpha', 'live', '51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001'),
  ('52010000-0000-0000-0000-000000000002', 'auth-beta', 'Auth Beta', 'demo', '52000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002');

insert into public.user_profiles (organization_id, user_id, display_name, created_by, updated_by)
values
  ('51010000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Alpha Admin', '51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001'),
  ('52010000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'Beta Handler', '52000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002');

insert into public.organization_memberships (
  organization_id, user_id, role, status, created_by, updated_by, activated_at
)
values
  ('51010000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'administrator', 'active', '51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', now()),
  ('52010000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'handler', 'active', '52000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', now());

insert into private.platform_superadmins (user_id, created_by, updated_by)
values (
  '53000000-0000-0000-0000-000000000003',
  '53000000-0000-0000-0000-000000000003',
  '53000000-0000-0000-0000-000000000003'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.current_session_context()', 'EXECUTE'),
  'anonymous clients cannot execute the session context function'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.is_platform_superadmin()', 'EXECUTE'),
  'anonymous clients cannot execute the platform role check'
);

select extensions.ok(
  has_function_privilege('authenticated', 'public.current_session_context()', 'EXECUTE'),
  'authenticated clients can execute the session context function'
);

select extensions.ok(
  has_function_privilege('authenticated', 'public.is_platform_superadmin()', 'EXECUTE'),
  'authenticated clients can execute the platform role check'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select extensions.is(
  public.current_session_context() ->> 'user_id',
  '51000000-0000-0000-0000-000000000001',
  'the context identifies only the caller'
);

select extensions.is(
  public.current_session_context() #>> '{organization,slug}',
  'auth-alpha',
  'the context returns the caller organization'
);

select extensions.is(
  public.current_session_context() #>> '{membership,role}',
  'administrator',
  'the context returns the caller organization role'
);

select extensions.is(
  public.current_session_context() #>> '{membership,display_name}',
  'Alpha Admin',
  'the context returns the caller profile name'
);

select extensions.is(
  public.is_platform_superadmin(),
  false,
  'an organization administrator is not a platform superadmin'
);

select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);

select extensions.is(
  public.current_session_context() #>> '{organization,slug}',
  'auth-beta',
  'a different caller receives only its own organization'
);

select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000003', true);

select extensions.is(
  public.is_platform_superadmin(),
  true,
  'an active platform superadmin passes the platform role check'
);

select extensions.is(
  public.current_session_context() ->> 'is_platform_superadmin',
  'true',
  'the platform role is represented in the caller context'
);

select extensions.is(
  public.current_session_context() -> 'organization',
  'null'::jsonb,
  'a platform superadmin gains no implicit organization context'
);

select set_config('request.jwt.claim.sub', '54000000-0000-0000-0000-000000000004', true);

select extensions.is(
  public.current_session_context() -> 'membership',
  'null'::jsonb,
  'an unassigned user receives no organization membership'
);

reset role;

select * from extensions.finish();

rollback;
