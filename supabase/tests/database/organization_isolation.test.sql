create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(17);

select extensions.is(
  (
    select count(*)
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private')
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ),
  0::bigint,
  'every app-owned table has RLS enabled'
);

select extensions.is(
  (
    select count(*)
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and relation.relname <> 'organizations'
      and not exists (
        select 1
        from pg_catalog.pg_attribute attribute
        where attribute.attrelid = relation.oid
          and attribute.attname = 'organization_id'
          and attribute.attnotnull
          and not attribute.attisdropped
      )
  ),
  0::bigint,
  'every tenant-owned public table has a non-null organization_id'
);

select extensions.is(
  (
    select count(*)
    from information_schema.table_privileges privilege
    where privilege.table_schema in ('public', 'private')
      and privilege.grantee in ('anon', 'authenticated', 'PUBLIC')
      and privilege.privilege_type in (
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      )
  ),
  0::bigint,
  'no direct client write privilege exists'
);

select extensions.is(
  (
    select count(*)
    from information_schema.table_privileges privilege
    where privilege.table_schema = 'private'
      and privilege.grantee in ('anon', 'authenticated', 'PUBLIC')
  ),
  0::bigint,
  'clients have no direct table privilege in the private schema'
);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'beta@example.test', 'authenticated', 'authenticated', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'platform@example.test', 'authenticated', 'authenticated', now(), now()),
  ('40000000-0000-0000-0000-000000000004', 'suspended@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, created_by, updated_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'alpha', 'Alpha', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', 'beta', 'Beta', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003');

insert into public.user_profiles (organization_id, user_id, display_name)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Alpha User'),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Beta User'),
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Suspended User');

insert into public.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status,
  activated_at,
  suspended_at
)
values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'handler', 'active', now(), null),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'handler', 'active', now(), null),
  ('a4000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'reader', 'suspended', now() - interval '1 day', now());

insert into private.platform_superadmins (user_id, created_by, updated_by)
values (
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003'
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
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'A-1', 'support', 'Alpha case', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'B-1', 'support', 'Beta case', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

select extensions.throws_matching(
  $$
    insert into public.case_assignments (
      organization_id,
      case_id,
      user_id,
      role,
      assigned_by
    )
    values (
      'a0000000-0000-0000-0000-000000000001',
      'a2000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      'responsible',
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '.*violates foreign key constraint.*',
  'a relation cannot connect an Alpha case to a Beta user'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.organizations),
  1::bigint,
  'an Alpha member sees one organization'
);

select extensions.is(
  (select min(slug) from public.organizations),
  'alpha'::text,
  'an Alpha member sees Alpha only'
);

select extensions.is(
  (select count(*) from public.cases),
  1::bigint,
  'an Alpha member sees one case'
);

select extensions.is(
  (select min(number) from public.cases),
  'A-1'::text,
  'an Alpha member cannot see the Beta case'
);

select extensions.is(
  (select count(*) from public.user_profiles),
  2::bigint,
  'an Alpha member sees profiles from Alpha only'
);

select extensions.throws_matching(
  $$
    insert into public.cases (
      organization_id,
      number,
      case_type_id,
      title,
      created_by,
      updated_by
    )
    values (
      'a0000000-0000-0000-0000-000000000001',
      'A-2',
      'support',
      'Forbidden direct write',
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '.*permission denied for table cases.*',
  'direct client writes are closed'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.cases),
  1::bigint,
  'a Beta member sees one case'
);

select extensions.is(
  (select min(number) from public.cases),
  'B-1'::text,
  'a Beta member cannot see the Alpha case'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);

select extensions.is(
  (select count(*) from public.cases),
  0::bigint,
  'a platform superadmin has no implicit access to business cases'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);

select extensions.is(
  (select count(*) from public.cases),
  0::bigint,
  'a suspended member sees no cases'
);

select extensions.is(
  (select count(*) from public.organizations),
  0::bigint,
  'a suspended member sees no organization'
);

select extensions.is(
  (select count(*) from public.organization_memberships),
  1::bigint,
  'a suspended member may inspect only their own membership state'
);

reset role;

select * from extensions.finish();

rollback;
