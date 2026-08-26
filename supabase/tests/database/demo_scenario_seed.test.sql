create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(20);

select extensions.is(
  (select count(*) from public.organizations where slug = 'prototypkommun'),
  1::bigint,
  'the deterministic seed creates one prototype organization'
);

select extensions.is(
  (select kind from public.organizations where slug = 'prototypkommun'),
  'demo'::text,
  'the prototype organization is explicitly classified as demo'
);

select extensions.is(
  (
    select count(*)
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where organization.slug = 'prototypkommun'
      and membership.role = 'administrator'
      and membership.status = 'active'
  ),
  1::bigint,
  'the prototype organization has a deterministic internal seed actor'
);

select extensions.is(
  (
    select count(*)
    from public.mentors mentor
    join public.organizations organization on organization.id = mentor.organization_id
    where organization.slug = 'prototypkommun'
  ),
  1::bigint,
  'the prototype scenario contains one synthetic mentor'
);

select extensions.is(
  (
    select count(*)
    from public.parents parent
    join public.organizations organization on organization.id = parent.organization_id
    where organization.slug = 'prototypkommun'
  ),
  1::bigint,
  'the prototype scenario contains one synthetic parent'
);

select extensions.is(
  (
    select count(*)
    from public.cases case_row
    join public.organizations organization on organization.id = case_row.organization_id
    where organization.slug = 'prototypkommun'
  ),
  2::bigint,
  'the prototype scenario contains support and matching cases'
);

select extensions.is(
  (
    select count(*)
    from public.cases case_row
    left join public.mentors mentor
      on mentor.organization_id = case_row.organization_id
      and mentor.id = case_row.mentor_id
    left join public.parents parent
      on parent.organization_id = case_row.organization_id
      and parent.id = case_row.parent_id
    where case_row.organization_id = 'e1000000-0000-0000-0000-000000000001'
      and (
        (case_row.mentor_id is not null and mentor.id is null)
        or (case_row.parent_id is not null and parent.id is null)
      )
  ),
  0::bigint,
  'every seeded case person link resolves inside the same organization'
);

select extensions.is(
  (
    select count(*)
    from public.case_assignments
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
  ),
  2::bigint,
  'both prototype cases have a responsible actor'
);

select extensions.is(
  (
    select count(*)
    from public.case_activities
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
  ),
  2::bigint,
  'both prototype cases have a next activity'
);

select extensions.is(
  (
    select count(*)
    from public.case_notes
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
      and case_id = 'e5000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'the prototype workspace contains one synthetic case note'
);

select extensions.is(
  (
    select count(*)
    from public.activity_deviations
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
      and case_id = 'e5000000-0000-0000-0000-000000000001'
      and status = 'open'
  ),
  1::bigint,
  'the prototype workspace contains one open synthetic deviation'
);

select extensions.is(
  (
    select count(*)
    from public.documents
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
      and case_id = 'e5000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'the synthetic document is linked to the prototype case workspace'
);

select extensions.is(
  (
    select count(*)
    from public.courses
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'the prototype organization owns one demo course copy'
);

select extensions.is(
  (
    select count(*)
    from public.course_modules
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
  ),
  2::bigint,
  'the prototype course has organization-owned module copies'
);

select extensions.is(
  (
    select count(*)
    from public.person_events
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
      and payload ->> 'synthetic' = 'true'
  ),
  2::bigint,
  'seeded person events are explicitly marked synthetic'
);

select extensions.is(
  (
    select count(*)
    from public.document_versions
    where organization_id = 'e1000000-0000-0000-0000-000000000001'
      and status = 'available'
      and actual_size_bytes = 58
  ),
  1::bigint,
  'the prototype scenario contains one available synthetic document version'
);

select extensions.is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'organization-documents'
      and name = 'e1000000-0000-0000-0000-000000000001/e6000000-0000-0000-0000-000000000001/e6100000-0000-0000-0000-000000000001.pdf'
  ),
  1::bigint,
  'the synthetic demo document exists in the private Storage bucket'
);

select extensions.is(
  (
    select encrypted_password::text
    from auth.users
    where id = 'e0000000-0000-0000-0000-000000000001'
  ),
  null::text,
  'the internal seed actor has no password and is not a demo login credential'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.organizations),
  1::bigint,
  'the seeded actor sees only the prototype organization through RLS'
);

select extensions.ok(
  (select count(*) = 1 from public.mentors)
    and (select count(*) = 1 from public.parents)
    and (select count(*) = 2 from public.cases)
    and (select count(*) = 1 from public.courses)
    and (select count(*) = 1 from public.documents),
  'the seeded actor sees the complete scenario inside one organization boundary'
);

reset role;

select * from extensions.finish();

rollback;
