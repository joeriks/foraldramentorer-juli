create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(38);

select extensions.is(
  (select count(*) from storage.buckets where id = 'organization-documents' and not public),
  1::bigint,
  'the organization document bucket exists and is private'
);

select extensions.is(
  (select file_size_limit from storage.buckets where id = 'organization-documents'),
  20971520::bigint,
  'the document bucket enforces the 20 MiB limit'
);

select extensions.ok(
  'application/pdf' = any (
    select unnest(allowed_mime_types)
    from storage.buckets
    where id = 'organization-documents'
  ),
  'the bucket allows the documented PDF MIME type'
);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('81000000-0000-0000-0000-000000000001', 'document-alpha@example.test', 'authenticated', 'authenticated', now(), now()),
  ('82000000-0000-0000-0000-000000000002', 'document-beta@example.test', 'authenticated', 'authenticated', now(), now()),
  ('83000000-0000-0000-0000-000000000003', 'document-mentor@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.organizations (id, slug, name, kind, created_by, updated_by)
values
  ('8a000000-0000-0000-0000-000000000001', 'document-alpha', 'Document Alpha', 'live', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001'),
  ('8b000000-0000-0000-0000-000000000002', 'document-beta', 'Document Beta', 'demo', '82000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002');

insert into public.user_profiles (organization_id, user_id, display_name)
values
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'Document Alpha Handler'),
  ('8b000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', 'Document Beta Handler'),
  ('8a000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000003', 'Document Alpha Mentor');

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  activated_at
)
values
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'handler', 'active', now()),
  ('8b000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', 'handler', 'active', now()),
  ('8a000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000003', 'mentor', 'active', now());

insert into public.mentors (
  id,
  organization_id,
  auth_user_id,
  display_name,
  status,
  created_by,
  updated_by
)
values (
  '8c000000-0000-0000-0000-000000000003',
  '8a000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000003',
  'Document Alpha Mentor',
  'active',
  '81000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001'
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
    '8d000000-0000-0000-0000-000000000001',
    '8a000000-0000-0000-0000-000000000001',
    'DOC-A-1',
    'support',
    'Alpha document case',
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001'
  ),
  (
    '8e000000-0000-0000-0000-000000000002',
    '8b000000-0000-0000-0000-000000000002',
    'DOC-B-1',
    'support',
    'Beta document case',
    '82000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002'
  );

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.create_document_upload(text,text,uuid,uuid,uuid,text,text,bigint,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot reserve document uploads'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.complete_document_upload(uuid,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot complete document uploads'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.create_document_upload(
      'Alpha case attachment',
      'case_attachment',
      '8d000000-0000-0000-0000-000000000001',
      null,
      null,
      'alpha-case.pdf',
      'application/pdf',
      12,
      'document-create-1'
    )
  $$,
  'a handler can reserve a case document upload'
);

select extensions.ok(
  (
    select storage_object_path like '8a000000-0000-0000-0000-000000000001/%'
    from public.document_versions
  ),
  'the issued Storage path starts with the active organization id'
);

select extensions.is(
  (select count(*) from public.documents),
  1::bigint,
  'the first organization sees one reserved document'
);

select extensions.is(
  (select min(status) from public.document_versions),
  'pending_upload'::text,
  'a reserved document version starts pending upload'
);

select extensions.is(
  (public.create_document_upload(
    'Alpha case attachment',
    'case_attachment',
    '8d000000-0000-0000-0000-000000000001',
    null,
    null,
    'alpha-case.pdf',
    'application/pdf',
    12,
    'document-create-1'
  )).id,
  (select id from public.document_versions),
  'idempotent reservation returns the original document version'
);

select extensions.is(
  (select count(*) from public.document_versions),
  1::bigint,
  'idempotent reservation does not duplicate metadata'
);

select extensions.throws_matching(
  $$
    select public.create_document_upload(
      'Changed title',
      'case_attachment',
      '8d000000-0000-0000-0000-000000000001',
      null,
      null,
      'alpha-case.pdf',
      'application/pdf',
      12,
      'document-create-1'
    )
  $$,
  '.*idempotency key was already used with different input.*',
  'a reservation key cannot be reused with changed metadata'
);

select extensions.is(
  (select count(*) from storage.objects where bucket_id = 'organization-documents'),
  0::bigint,
  'pending document objects are not readable before completion'
);

select extensions.lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
    select
      storage_bucket,
      storage_object_path,
      '81000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001',
      '{"size":12,"mimetype":"application/pdf"}'::jsonb
    from public.document_versions
  $$,
  'Storage accepts exactly the reserved pending path from its creator'
);

select extensions.lives_ok(
  $$
    select public.complete_document_upload(
      (select id from public.document_versions),
      'document-complete-1'
    )
  $$,
  'the reservation actor can complete a matching uploaded object'
);

select extensions.ok(
  (
    select status = 'available' and actual_size_bytes = 12
    from public.document_versions
  ),
  'completion records the actual size and makes the version available'
);

select extensions.is(
  (select count(*) from storage.objects where bucket_id = 'organization-documents'),
  1::bigint,
  'the completed organization object is readable'
);

select extensions.results_eq(
  $$
    with changed as (
      update storage.objects
      set metadata = '{"size":13,"mimetype":"application/pdf"}'::jsonb
      where bucket_id = 'organization-documents'
      returning id
    )
    select count(*)::bigint from changed
  $$,
  $$ values (0::bigint) $$,
  'no Storage update policy exists, so document versions are immutable'
);

select extensions.throws_matching(
  $$
    insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
    select
      storage_bucket,
      storage_object_path,
      '81000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001',
      '{"size":12,"mimetype":"application/pdf"}'::jsonb
    from public.document_versions
  $$,
  '.*row-level security policy.*',
  'an available immutable path cannot be uploaded again'
);

select extensions.lives_ok(
  $$
    select public.create_document_upload(
      'Mentor agreement',
      'agreement',
      null,
      '8c000000-0000-0000-0000-000000000003',
      null,
      'mentor-agreement.pdf',
      'application/pdf',
      13,
      'document-create-mentor-1'
    )
  $$,
  'a handler can reserve a document linked to a mentor'
);

select extensions.lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
    select
      document_version.storage_bucket,
      document_version.storage_object_path,
      '81000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001',
      '{"size":13,"mimetype":"application/pdf"}'::jsonb
    from public.document_versions document_version
    join public.documents document on document.id = document_version.document_id
    where document.category = 'agreement'
  $$,
  'Storage accepts the separately reserved mentor agreement path'
);

select extensions.lives_ok(
  $$
    select public.complete_document_upload(
      (
        select document_version.id
        from public.document_versions document_version
        join public.documents document on document.id = document_version.document_id
        where document.category = 'agreement'
      ),
      'document-complete-mentor-1'
    )
  $$,
  'the mentor agreement upload can be completed'
);

select extensions.is(
  (select count(*) from public.documents),
  2::bigint,
  'the first organization sees both of its documents'
);

select set_config(
  'test.alpha_document_path',
  (
    select document_version.storage_object_path
    from public.document_versions document_version
    join public.documents document on document.id = document_version.document_id
    where document.category = 'case_attachment'
  ),
  true
);

select set_config('request.jwt.claim.sub', '82000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.documents),
  0::bigint,
  'the second organization cannot see the first organization documents'
);

select extensions.is(
  (select count(*) from storage.objects where bucket_id = 'organization-documents'),
  0::bigint,
  'the second organization cannot list or read the first organization objects'
);

select extensions.throws_matching(
  $$
    select public.create_document_upload(
      'Cross-organization case document',
      'case_attachment',
      '8d000000-0000-0000-0000-000000000001',
      null,
      null,
      'forbidden.pdf',
      'application/pdf',
      12,
      'document-cross-case-1'
    )
  $$,
  '.*case does not belong to the active organization.*',
  'a document cannot link to another organization case'
);

select extensions.lives_ok(
  $$
    select public.create_document_upload(
      'Beta document',
      'other',
      null,
      null,
      null,
      'beta.pdf',
      'application/pdf',
      14,
      'document-create-1'
    )
  $$,
  'the same idempotency key can be reused inside another organization'
);

select extensions.throws_matching(
  $$
    insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
    values (
      'organization-documents',
      current_setting('test.alpha_document_path'),
      '82000000-0000-0000-0000-000000000002',
      '82000000-0000-0000-0000-000000000002',
      '{"size":12,"mimetype":"application/pdf"}'::jsonb
    )
  $$,
  '.*row-level security policy.*',
  'the second organization cannot upload to a first-organization path'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);

select extensions.is(
  (select count(*) from public.documents),
  1::bigint,
  'a mentor sees only their own permitted agreement document'
);

select extensions.is(
  (select count(*) from public.document_versions),
  1::bigint,
  'a mentor sees only the available version of their permitted document'
);

select extensions.is(
  (select count(*) from storage.objects where bucket_id = 'organization-documents'),
  1::bigint,
  'a mentor can read only their own permitted Storage object'
);

select extensions.is(
  (select count(*) from public.document_events),
  0::bigint,
  'a mentor cannot read staff document audit events'
);

select extensions.throws_matching(
  $$
    select public.create_document_upload(
      'Forbidden mentor upload',
      'other',
      null,
      '8c000000-0000-0000-0000-000000000003',
      null,
      'mentor.pdf',
      'application/pdf',
      10,
      'mentor-document-create-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a mentor cannot reserve arbitrary document uploads'
);

select extensions.throws_matching(
  $$
    insert into public.documents (
      organization_id,
      title,
      category,
      created_by,
      updated_by
    )
    values (
      '8a000000-0000-0000-0000-000000000001',
      'Forbidden direct metadata',
      'other',
      '83000000-0000-0000-0000-000000000003',
      '83000000-0000-0000-0000-000000000003'
    )
  $$,
  '.*permission denied for table documents.*',
  'authenticated clients cannot write document metadata directly'
);

reset role;

select extensions.throws_matching(
  $$
    insert into public.documents (
      organization_id,
      case_id,
      title,
      category,
      created_by,
      updated_by
    )
    values (
      '8b000000-0000-0000-0000-000000000002',
      '8d000000-0000-0000-0000-000000000001',
      'Cross-organization metadata',
      'case_attachment',
      '82000000-0000-0000-0000-000000000002',
      '82000000-0000-0000-0000-000000000002'
    )
  $$,
  '.*violates foreign key constraint.*',
  'a metadata row cannot link to another organization case'
);

update public.organizations
set
  status = 'suspended',
  suspended_at = now(),
  suspended_by = '81000000-0000-0000-0000-000000000001',
  updated_by = '81000000-0000-0000-0000-000000000001'
where id = '8a000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.documents),
  0::bigint,
  'suspending an organization immediately hides document metadata'
);

select extensions.is(
  (select count(*) from storage.objects where bucket_id = 'organization-documents'),
  0::bigint,
  'suspending an organization immediately hides Storage objects'
);

select extensions.throws_matching(
  $$
    select public.create_document_upload(
      'Suspended document',
      'other',
      null,
      null,
      null,
      'suspended.pdf',
      'application/pdf',
      10,
      'suspended-document-create-1'
    )
  $$,
  '.*lacks an active organization role.*',
  'a suspended organization cannot reserve new uploads'
);

reset role;

select * from extensions.finish();

rollback;
