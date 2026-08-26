-- Version-controlled platform templates only. These rows contain no personal
-- data and are never read as shared runtime course content. Installation copies
-- the selected version into organization-owned public rows.

insert into private.course_templates (
  id,
  template_key,
  content_kind,
  active
)
values
  ('d1000000-0000-0000-0000-000000000001', 'introduktion-foraldramentor', 'demo', true),
  ('d1000000-0000-0000-0000-000000000002', 'trygg-forsta-kontakt', 'demo', true)
on conflict do nothing;

insert into private.course_template_versions (
  id,
  template_id,
  version,
  title,
  description,
  release_notes,
  status,
  published_at
)
values
  (
    'd1100000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    1,
    'Introduktion för föräldramentorer',
    'Demokurs som introducerar uppdrag, gränser och samarbete.',
    'Första demo-utgåvan.',
    'published',
    '2026-08-23 00:00:00+00'
  ),
  (
    'd1200000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000002',
    1,
    'Trygg första kontakt',
    'Demokurs om att planera och genomföra en trygg första kontakt.',
    'Första demo-utgåvan.',
    'published',
    '2026-08-23 00:00:00+00'
  )
on conflict (template_id, version) do nothing;

insert into private.course_template_modules (
  id,
  template_version_id,
  stable_key,
  sort_order,
  title,
  body_markdown,
  estimated_minutes
)
values
  (
    'd1110000-0000-0000-0000-000000000001',
    'd1100000-0000-0000-0000-000000000001',
    'uppdraget',
    10,
    'Uppdraget',
    '## Föräldramentorns uppdrag\n\nDu ger stöd, struktur och uppmuntran utan att ta över professionella bedömningar.',
    10
  ),
  (
    'd1120000-0000-0000-0000-000000000002',
    'd1100000-0000-0000-0000-000000000001',
    'granser-och-stod',
    20,
    'Gränser och stöd',
    '## Tydliga gränser\n\nDokumentera överenskommelser och kontakta ansvarig handläggare när situationen kräver professionellt stöd.',
    12
  ),
  (
    'd1210000-0000-0000-0000-000000000001',
    'd1200000-0000-0000-0000-000000000002',
    'forberedelse',
    10,
    'Förbered kontakten',
    '## Före kontakten\n\nBekräfta syfte, kanal, tid och vad som ska hända efter samtalet.',
    8
  ),
  (
    'd1220000-0000-0000-0000-000000000002',
    'd1200000-0000-0000-0000-000000000002',
    'genomforande',
    20,
    'Genomför och följ upp',
    '## Under och efter kontakten\n\nVar tydlig med rollen, lyssna aktivt och registrera nästa överenskomna steg.',
    10
  )
on conflict (template_version_id, stable_key) do nothing;

-- Deterministic prototype scenario. The Auth row is an internal seed actor used
-- for ownership and audit foreign keys, not a sign-in account. An interactive
-- demo administrator must later be invited through the Auth Admin API.

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  'e0000000-0000-0000-0000-000000000001',
  'demo-seed-actor@example.invalid',
  'authenticated',
  'authenticated',
  '2026-08-24 00:00:00+00',
  '2026-08-24 00:00:00+00'
)
on conflict (id) do nothing;

insert into public.organizations (
  id,
  slug,
  name,
  kind,
  status,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e1000000-0000-0000-0000-000000000001',
  'prototypkommun',
  'Prototypkommun',
  'demo',
  'active',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

insert into public.user_profiles (
  organization_id,
  user_id,
  display_name,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e1000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'Demoaktör',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, user_id) do nothing;

insert into public.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status,
  created_at,
  created_by,
  updated_at,
  updated_by,
  activated_at
)
values (
  'e1010000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'administrator',
  'active',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 00:00:00+00'
)
on conflict (organization_id, user_id) do nothing;

insert into public.organization_units (
  id,
  organization_id,
  name,
  active,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e1100000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Familjestöd Demo',
  true,
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 00:00:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.documents (
  id,
  organization_id,
  case_id,
  title,
  category,
  status,
  current_version,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e6000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  null,
  'Syntetiskt demodokument',
  'other',
  'active',
  1,
  '2026-08-24 09:30:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 09:30:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.document_versions (
  id,
  organization_id,
  document_id,
  version,
  storage_object_path,
  file_name,
  mime_type,
  expected_size_bytes,
  actual_size_bytes,
  status,
  upload_expires_at,
  created_at,
  created_by,
  completed_at,
  completed_by
)
values (
  'e6100000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'e6000000-0000-0000-0000-000000000001',
  1,
  'e1000000-0000-0000-0000-000000000001/e6000000-0000-0000-0000-000000000001/e6100000-0000-0000-0000-000000000001.pdf',
  'syntetiskt-demodokument.pdf',
  'application/pdf',
  58,
  58,
  'available',
  '2026-08-24 09:45:00+00',
  '2026-08-24 09:30:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 09:31:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.document_events (
  id,
  organization_id,
  document_id,
  document_version_id,
  event_type,
  actor_user_id,
  occurred_at,
  idempotency_key,
  payload
)
values (
  'e6200000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'e6000000-0000-0000-0000-000000000001',
  'e6100000-0000-0000-0000-000000000001',
  'document.seeded',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 09:31:00+00',
  'seed-demo-document-1',
  '{"synthetic":true,"version":1,"mime_type":"application/pdf","actual_size_bytes":58}'::jsonb
)
on conflict (organization_id, id) do nothing;

insert into public.mentors (
  id,
  organization_id,
  display_name,
  email,
  phone,
  status,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e2000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Samira Demomentor',
  'samira.mentor@example.invalid',
  '070-000 00 01',
  'active',
  '2026-08-24 08:00:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 08:00:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.parents (
  id,
  organization_id,
  display_name,
  email,
  phone,
  status,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e3000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Alex Demoförälder',
  'alex.parent@example.invalid',
  '070-000 00 02',
  'active',
  '2026-08-24 08:05:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 08:05:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.person_events (
  id,
  organization_id,
  mentor_id,
  parent_id,
  event_type,
  actor_user_id,
  occurred_at,
  idempotency_key,
  payload
)
values
  (
    'e2100000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'e2000000-0000-0000-0000-000000000001',
    null,
    'mentor.seeded',
    'e0000000-0000-0000-0000-000000000001',
    '2026-08-24 08:00:00+00',
    'seed-demo-mentor-1',
    '{"synthetic": true}'::jsonb
  ),
  (
    'e3100000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    null,
    'e3000000-0000-0000-0000-000000000001',
    'parent.seeded',
    'e0000000-0000-0000-0000-000000000001',
    '2026-08-24 08:05:00+00',
    'seed-demo-parent-1',
    '{"synthetic": true}'::jsonb
  )
on conflict (organization_id, id) do nothing;

insert into public.cases (
  id,
  organization_id,
  number,
  case_type_id,
  organization_unit_id,
  mentor_id,
  parent_id,
  title,
  description,
  status,
  priority,
  version,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values
  (
    'e5000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'DEMO-2026-001',
    'parent-support',
    'e1100000-0000-0000-0000-000000000001',
    null,
    'e3000000-0000-0000-0000-000000000001',
    'Stöd i vardagsstruktur',
    'Syntetiskt stödärende för demonstration och utveckling.',
    'open',
    'normal',
    1,
    '2026-08-24 08:15:00+00',
    'e0000000-0000-0000-0000-000000000001',
    '2026-08-24 08:15:00+00',
    'e0000000-0000-0000-0000-000000000001'
  ),
  (
    'e5000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000001',
    'DEMO-2026-002',
    'matching',
    'e1100000-0000-0000-0000-000000000001',
    'e2000000-0000-0000-0000-000000000001',
    'e3000000-0000-0000-0000-000000000001',
    'Matchning med föräldramentor',
    'Syntetiskt matchningsärende med båda parter länkade.',
    'open',
    'normal',
    1,
    '2026-08-24 09:00:00+00',
    'e0000000-0000-0000-0000-000000000001',
    '2026-08-24 09:00:00+00',
    'e0000000-0000-0000-0000-000000000001'
  )
on conflict (organization_id, id) do nothing;

insert into public.case_assignments (
  id,
  organization_id,
  case_id,
  user_id,
  role,
  assigned_at,
  assigned_by
)
values
  (
    'e5100000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'responsible',
    '2026-08-24 08:15:00+00',
    'e0000000-0000-0000-0000-000000000001'
  ),
  (
    'e5100000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'responsible',
    '2026-08-24 09:00:00+00',
    'e0000000-0000-0000-0000-000000000001'
  )
on conflict (organization_id, id) do nothing;

insert into public.case_activities (
  id,
  organization_id,
  case_id,
  title,
  status,
  due_date,
  sort_order,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values
  (
    'e5200000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001',
    'Bekräfta stödbehov och önskat resultat',
    'active',
    '2026-09-05',
    10,
    '2026-08-24 08:20:00+00',
    'e0000000-0000-0000-0000-000000000001',
    '2026-08-24 08:20:00+00',
    'e0000000-0000-0000-0000-000000000001'
  ),
  (
    'e5200000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000002',
    'Kontakta mentor och förälder',
    'planned',
    '2026-09-10',
    10,
    '2026-08-24 09:05:00+00',
    'e0000000-0000-0000-0000-000000000001',
    '2026-08-24 09:05:00+00',
    'e0000000-0000-0000-0000-000000000001'
  )
on conflict (organization_id, id) do nothing;

-- Make the expanded case-workspace migration visible immediately in the
-- deterministic prototype organization. All data remains synthetic and owned
-- by the demo organization.
update public.documents
set
  case_id = 'e5000000-0000-0000-0000-000000000001',
  updated_at = '2026-08-24 09:30:00+00',
  updated_by = 'e0000000-0000-0000-0000-000000000001'
where organization_id = 'e1000000-0000-0000-0000-000000000001'
  and id = 'e6000000-0000-0000-0000-000000000001';

insert into public.case_notes (
  id,
  organization_id,
  case_id,
  note_id,
  target_type,
  target_id,
  text,
  version,
  created_at,
  created_by
)
values (
  'e5300000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'e5000000-0000-0000-0000-000000000001',
  'e5310000-0000-0000-0000-000000000001',
  'case',
  null,
  'Syntetisk demoanteckning: familjen önskar en tydlig veckoplan.',
  1,
  '2026-08-24 08:25:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

-- Updating an activity to a catalog-defined deviation result exercises the
-- same database-owned trigger used by the application command.
update public.case_activities
set
  status = 'completed',
  result_code = 'not-completed',
  classification = 'deviation',
  version = 2,
  updated_at = '2026-08-24 08:30:00+00',
  updated_by = 'e0000000-0000-0000-0000-000000000001'
where organization_id = 'e1000000-0000-0000-0000-000000000001'
  and id = 'e5200000-0000-0000-0000-000000000001'
  and status <> 'completed';

insert into public.courses (
  id,
  organization_id,
  source_template_key,
  source_template_version,
  content_kind,
  title,
  description,
  status,
  current_version,
  created_at,
  created_by,
  updated_at,
  updated_by
)
values (
  'e4000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'introduktion-foraldramentor',
  1,
  'demo',
  'Introduktion för föräldramentorer',
  'Demokurs som introducerar uppdrag, gränser och samarbete.',
  'published',
  1,
  '2026-08-24 09:15:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 09:15:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.course_versions (
  id,
  organization_id,
  course_id,
  version,
  title,
  description,
  status,
  source_template_key,
  source_template_version,
  created_at,
  created_by,
  published_at,
  published_by
)
values (
  'e4100000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'e4000000-0000-0000-0000-000000000001',
  1,
  'Introduktion för föräldramentorer',
  'Demokurs som introducerar uppdrag, gränser och samarbete.',
  'published',
  'introduktion-foraldramentor',
  1,
  '2026-08-24 09:15:00+00',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 09:15:00+00',
  'e0000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, id) do nothing;

insert into public.course_modules (
  id,
  organization_id,
  course_version_id,
  stable_key,
  sort_order,
  title,
  body_markdown,
  estimated_minutes,
  created_at,
  created_by
)
values
  (
    'e4110000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'e4100000-0000-0000-0000-000000000001',
    'uppdraget',
    10,
    'Uppdraget',
    '## Föräldramentorns uppdrag\n\nDu ger stöd, struktur och uppmuntran utan att ta över professionella bedömningar.',
    10,
    '2026-08-24 09:15:00+00',
    'e0000000-0000-0000-0000-000000000001'
  ),
  (
    'e4120000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000001',
    'e4100000-0000-0000-0000-000000000001',
    'granser-och-stod',
    20,
    'Gränser och stöd',
    '## Tydliga gränser\n\nDokumentera överenskommelser och kontakta ansvarig handläggare när situationen kräver professionellt stöd.',
    12,
    '2026-08-24 09:15:00+00',
    'e0000000-0000-0000-0000-000000000001'
  )
on conflict (organization_id, id) do nothing;

insert into public.course_events (
  id,
  organization_id,
  course_id,
  type,
  actor_user_id,
  occurred_at,
  idempotency_key,
  payload
)
values (
  'e4200000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'e4000000-0000-0000-0000-000000000001',
  'course_template.seeded',
  'e0000000-0000-0000-0000-000000000001',
  '2026-08-24 09:15:00+00',
  'seed-demo-course-1',
  '{"template_key":"introduktion-foraldramentor","template_version":1,"synthetic":true}'::jsonb
)
on conflict (organization_id, id) do nothing;
