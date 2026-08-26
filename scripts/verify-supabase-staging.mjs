import { createClient } from "@supabase/supabase-js";
import {
  parseExpectedFeatureFlag,
  validateCrossOrganizationProbe,
  validateIndependentSessionContexts,
  validateOrganizationCaseRows,
  validateRuntimeConfiguration,
  validatedStagingAppUrl
} from "../staging-preflight-domain.js";

const REQUEST_TIMEOUT_MS = 15_000;

function requiredEnvironment(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} saknas`);
  return value;
}

async function timedFetch(input, init = {}) {
  return fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function resultData(result, operation) {
  if (result?.error) throw new Error(`${operation}: ${result.error.message || result.error.code || "okänt Supabase-fel"}`);
  return result?.data;
}

function stagingClient(configuration) {
  return createClient(configuration.supabaseUrl, configuration.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: { fetch: timedFetch }
  });
}

async function signIn(client, email, password, label) {
  const data = resultData(await client.auth.signInWithPassword({ email, password }), `${label}: inloggning misslyckades`);
  if (!data?.session?.access_token) throw new Error(`${label}: Supabase returnerade ingen session`);
}

async function sessionContext(client, label) {
  return resultData(await client.rpc("current_session_context"), `${label}: sessionskontext kunde inte läsas`);
}

async function caseRows(client, label) {
  return resultData(await client
    .from("cases")
    .select("id,organization_id,number")
    .order("updated_at", { ascending: false })
    .limit(100), `${label}: ärenden kunde inte läsas`) || [];
}

async function crossOrganizationRows(client, caseId, label) {
  return resultData(await client
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .limit(1), `${label}: cross-org-kontrollen kunde inte köras`) || [];
}

async function verifyAnonymousBoundary(configuration) {
  const anonymousClient = stagingClient(configuration);
  const result = await anonymousClient.from("cases").select("id").limit(1);
  if (!result.error && Array.isArray(result.data) && result.data.length === 0) return;
  if (!result.error) throw new Error("En oautentiserad klient kunde läsa ärenden");
  const expectedDenial = [401, 403].includes(result.status) || result.error.code === "42501";
  if (!expectedDenial) throw new Error(`Oautentiserad RLS-kontroll misslyckades oväntat: ${result.error.message || result.error.code}`);
}

async function main() {
  const appUrl = validatedStagingAppUrl(requiredEnvironment("STAGING_APP_URL"));
  const expectedFeatureFlag = parseExpectedFeatureFlag(requiredEnvironment("STAGING_EXPECT_CASE_WORKSPACE_ENABLED"));
  const firstCredentials = {
    email: requiredEnvironment("STAGING_ORG_A_EMAIL"),
    password: requiredEnvironment("STAGING_ORG_A_PASSWORD")
  };
  const secondCredentials = {
    email: requiredEnvironment("STAGING_ORG_B_EMAIL"),
    password: requiredEnvironment("STAGING_ORG_B_PASSWORD")
  };
  if (firstCredentials.email.toLowerCase() === secondCredentials.email.toLowerCase()) {
    throw new Error("Stagingkontona måste ha olika e-postadresser");
  }

  const runtimeResponse = await timedFetch(new URL("/api/runtime-config", appUrl), {
    headers: { accept: "application/json" },
    cache: "no-store"
  });
  if (!runtimeResponse.ok) throw new Error(`Runtime-konfigurationen svarade HTTP ${runtimeResponse.status}`);
  if (!String(runtimeResponse.headers.get("cache-control") || "").includes("no-store")) {
    throw new Error("Runtime-konfigurationen saknar cache-control: no-store");
  }
  const configuration = validateRuntimeConfiguration(await runtimeResponse.json(), expectedFeatureFlag);
  await verifyAnonymousBoundary(configuration);

  const firstClient = stagingClient(configuration);
  const secondClient = stagingClient(configuration);
  try {
    await Promise.all([
      signIn(firstClient, firstCredentials.email, firstCredentials.password, "Organisation A"),
      signIn(secondClient, secondCredentials.email, secondCredentials.password, "Organisation B")
    ]);
    const [firstContext, secondContext, firstRows, secondRows] = await Promise.all([
      sessionContext(firstClient, "Organisation A"),
      sessionContext(secondClient, "Organisation B"),
      caseRows(firstClient, "Organisation A"),
      caseRows(secondClient, "Organisation B")
    ]);
    const { firstIdentity, secondIdentity } = validateIndependentSessionContexts(firstContext, secondContext);
    validateOrganizationCaseRows(firstRows, firstIdentity.organizationId, "Organisation A");
    validateOrganizationCaseRows(secondRows, secondIdentity.organizationId, "Organisation B");

    const [firstCannotReadSecond, secondCannotReadFirst] = await Promise.all([
      crossOrganizationRows(firstClient, secondRows[0].id, "Organisation A"),
      crossOrganizationRows(secondClient, firstRows[0].id, "Organisation B")
    ]);
    validateCrossOrganizationProbe(firstCannotReadSecond, "Organisation A");
    validateCrossOrganizationProbe(secondCannotReadFirst, "Organisation B");

    process.stdout.write(`${JSON.stringify({
      status: "passed",
      caseWorkspaceEnabled: expectedFeatureFlag,
      organizationsVerified: 2,
      organizationACaseCount: firstRows.length,
      organizationBCaseCount: secondRows.length
    })}\n`);
  } finally {
    await Promise.allSettled([
      firstClient.auth.signOut({ scope: "local" }),
      secondClient.auth.signOut({ scope: "local" })
    ]);
  }
}

main().catch((error) => {
  process.stderr.write(`Staging-preflight misslyckades: ${error.message}\n`);
  process.exitCode = 1;
});
