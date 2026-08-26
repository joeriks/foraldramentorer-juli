import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const configPath = process.env.STAGING_PROVISION_CONFIG_PATH;
const credentialsPath = process.env.STAGING_ORG_CREDENTIALS_PATH;
const requestTimeoutMs = 15_000;
const seededFixtures = {
  course: { id: "e4000000-0000-0000-0000-000000000001" },
  mentor: { id: "e2000000-0000-0000-0000-000000000001" },
  parent: { id: "e3000000-0000-0000-0000-000000000001" },
  documentVersion: {
    id: "e6100000-0000-0000-0000-000000000001",
    storageBucket: "organization-documents",
    storageObjectPath: "e1000000-0000-0000-0000-000000000001/e6000000-0000-0000-0000-000000000001/e6100000-0000-0000-0000-000000000001.pdf"
  }
};

if (!configPath || !credentialsPath) {
  throw new Error("staging configuration and organization credential paths are required");
}

const configuration = JSON.parse(fs.readFileSync(configPath, "utf8"));
const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

function client(key) {
  return createClient(configuration.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch(input, init = {}) {
        return fetch(input, {
          ...init,
          signal: init.signal || AbortSignal.timeout(requestTimeoutMs)
        });
      }
    }
  });
}

function resultData(result, operation) {
  if (result?.error) {
    throw new Error(`${operation}: ${result.error.message || result.error.code || "unknown error"}`);
  }
  return result?.data;
}

async function signIn(organization, label) {
  const organizationClient = client(configuration.anonKey);
  const data = resultData(await organizationClient.auth.signInWithPassword({
    email: organization.email,
    password: organization.password
  }), `${label} sign-in`);
  if (!data?.session?.access_token) throw new Error(`${label} sign-in returned no access token`);
  return organizationClient;
}

const tenantTables = [
  "organization_units",
  "user_profiles",
  "organization_memberships",
  "membership_units",
  "cases",
  "case_assignments",
  "case_activities",
  "case_events",
  "case_description_versions",
  "case_notes",
  "activity_deviations",
  "deviation_decisions",
  "activity_definitions",
  "activity_definition_versions",
  "activity_result_definitions",
  "activity_definition_events",
  "courses",
  "course_versions",
  "course_modules",
  "course_events",
  "mentors",
  "parents",
  "person_events",
  "documents",
  "document_versions",
  "document_events"
];

async function tenantRows(organizationClient, table, label) {
  const rows = resultData(
    await organizationClient.from(table).select("organization_id").limit(1000),
    `${label} ${table} read`
  ) || [];
  return rows;
}

async function verifyTenantBoundary(organizationClient, organizationId, label) {
  const organizations = resultData(
    await organizationClient.from("organizations").select("id").limit(10),
    `${label} organizations read`
  ) || [];
  if (organizations.length !== 1 || organizations[0].id !== organizationId) {
    throw new Error(`${label} organization boundary is invalid`);
  }

  const results = await Promise.all(tenantTables.map(async (table) => ({
    table,
    rows: await tenantRows(organizationClient, table, label)
  })));
  for (const result of results) {
    if (result.rows.some((row) => row.organization_id !== organizationId)) {
      throw new Error(`${label} received a foreign row from ${result.table}`);
    }
  }

  const membershipRows = results.find((result) => result.table === "organization_memberships")?.rows || [];
  const profileRows = results.find((result) => result.table === "user_profiles")?.rows || [];
  const caseRows = results.find((result) => result.table === "cases")?.rows || [];
  if (membershipRows.length !== 1 || profileRows.length !== 1 || caseRows.length !== 1) {
    throw new Error(`${label} expected one membership, profile and case`);
  }
  return results;
}

async function verifyExplicitProbe(organizationClient, table, id, label) {
  const rows = resultData(
    await organizationClient.from(table).select("id").eq("id", id).limit(1),
    `${label} explicit ${table} probe`
  ) || [];
  if (rows.length !== 0) throw new Error(`${label} explicitly read a foreign ${table} row`);
}

async function verifyAnonymousBoundary() {
  const anonymous = client(configuration.anonKey);
  for (const table of ["cases", "courses", "mentors", "parents", "documents"]) {
    const result = await anonymous.from(table).select("id").limit(1);
    if (!result.error && Array.isArray(result.data) && result.data.length === 0) continue;
    if (!result.error) throw new Error(`anonymous client read ${table}`);
    if (![401, 403].includes(result.status) && result.error.code !== "42501") {
      throw new Error(`anonymous ${table} probe failed unexpectedly`);
    }
  }
}

async function verifyAutomaticRlsFunctionIsNotCallable(apiClient, label) {
  const result = await apiClient.rpc("rls_auto_enable");
  if (!result.error) throw new Error(`${label} executed the automatic RLS event-trigger function`);
  const hiddenFromSchema = result.status === 404 && result.error.code === "PGRST202";
  const databaseDeniedExecution = result.error.code === "42501";
  if (!hiddenFromSchema && !databaseDeniedExecution) {
    throw new Error(`${label} automatic RLS probe failed unexpectedly: ${result.error.code || result.status}`);
  }
}

const firstClient = await signIn(credentials.organizationA, "organization A");
const secondClient = await signIn(credentials.organizationB, "organization B");

try {
  const [firstContext, secondContext] = await Promise.all([
    firstClient.rpc("current_session_context"),
    secondClient.rpc("current_session_context")
  ]);
  const firstSession = resultData(firstContext, "organization A context");
  const secondSession = resultData(secondContext, "organization B context");
  if (firstSession?.organization?.id !== credentials.organizationA.organizationId) {
    throw new Error("organization A context mismatch");
  }
  if (secondSession?.organization?.id !== credentials.organizationB.organizationId) {
    throw new Error("organization B context mismatch");
  }
  const anonymousClient = client(configuration.anonKey);

  await Promise.all([
    verifyTenantBoundary(firstClient, credentials.organizationA.organizationId, "organization A"),
    verifyTenantBoundary(secondClient, credentials.organizationB.organizationId, "organization B"),
    verifyAnonymousBoundary(),
    verifyAutomaticRlsFunctionIsNotCallable(anonymousClient, "anonymous client"),
    verifyAutomaticRlsFunctionIsNotCallable(firstClient, "organization A"),
    verifyAutomaticRlsFunctionIsNotCallable(secondClient, "organization B"),
    ...[
      ["courses", seededFixtures.course.id],
      ["mentors", seededFixtures.mentor.id],
      ["parents", seededFixtures.parent.id],
      ["document_versions", seededFixtures.documentVersion.id]
    ].flatMap(([table, id]) => [
      verifyExplicitProbe(firstClient, table, id, "organization A"),
      verifyExplicitProbe(secondClient, table, id, "organization B")
    ])
  ]);

  const storageResults = await Promise.all([
    firstClient.storage.from(seededFixtures.documentVersion.storageBucket).download(
      seededFixtures.documentVersion.storageObjectPath
    ),
    secondClient.storage.from(seededFixtures.documentVersion.storageBucket).download(
      seededFixtures.documentVersion.storageObjectPath
    )
  ]);
  if (storageResults.some((result) => !result.error || result.data)) {
    throw new Error("a tenant downloaded the seeded organization's private document");
  }

  process.stdout.write(`${JSON.stringify({
    status: "passed",
    organizationsVerified: 2,
    tenantTablesVerified: tenantTables.length + 1,
    explicitForeignRowProbes: 8,
    privateStorageForeignDownloads: 0,
    anonymousDomainsVerified: 5,
    privilegedFunctionsExposedToClients: 0
  })}\n`);
} finally {
  await Promise.allSettled([
    firstClient.auth.signOut({ scope: "local" }),
    secondClient.auth.signOut({ scope: "local" })
  ]);
}
