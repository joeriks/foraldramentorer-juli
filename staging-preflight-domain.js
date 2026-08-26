function requiredObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} saknas eller har fel format`);
  }
  return value;
}

export function parseExpectedFeatureFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new TypeError("STAGING_EXPECT_CASE_WORKSPACE_ENABLED måste vara true eller false");
}

export function validatedStagingAppUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new TypeError("STAGING_APP_URL måste vara en giltig URL");
  }
  if (url.protocol !== "https:") throw new TypeError("STAGING_APP_URL måste använda HTTPS");
  if (url.username || url.password) throw new TypeError("STAGING_APP_URL får inte innehålla inloggningsuppgifter");
  if (url.search || url.hash) throw new TypeError("STAGING_APP_URL får inte innehålla query eller hash");
  return url.origin;
}

export function validateRuntimeConfiguration(value, expectedFeatureFlag) {
  const configuration = requiredObject(value, "Runtime-konfigurationen");
  const leakedKey = Object.keys(configuration).find((key) => /secret|service.?role/i.test(key));
  if (leakedKey) throw new Error("Runtime-konfigurationen innehåller ett serverhemligt fält");
  if (configuration.caseWorkspaceEnabled !== expectedFeatureFlag) {
    throw new Error(`Ärendeflaggan är ${String(configuration.caseWorkspaceEnabled)}, förväntat ${String(expectedFeatureFlag)}`);
  }
  let supabaseUrl;
  try {
    supabaseUrl = new URL(String(configuration.supabaseUrl || ""));
  } catch {
    throw new Error("Supabase-URL saknas eller har fel format");
  }
  if (supabaseUrl.protocol !== "https:") throw new Error("Staging-Supabase måste använda HTTPS");
  if (supabaseUrl.username || supabaseUrl.password) throw new Error("Supabase-URL får inte innehålla inloggningsuppgifter");
  const publishableKey = String(configuration.supabasePublishableKey || "");
  if (!publishableKey) throw new Error("Publishable key saknas i runtime-konfigurationen");
  return { supabaseUrl: supabaseUrl.origin, publishableKey };
}

function validateSessionContext(context, label) {
  requiredObject(context, `${label}: sessionskontext`);
  const organization = requiredObject(context.organization, `${label}: organisation`);
  const membership = requiredObject(context.membership, `${label}: medlemskap`);
  if (!context.user_id) throw new Error(`${label}: användar-id saknas`);
  if (context.is_platform_superadmin !== false) throw new Error(`${label}: stagingkontot får inte vara plattformssuperadministratör`);
  if (!organization.id) throw new Error(`${label}: organisations-id saknas`);
  if (organization.kind !== "demo") throw new Error(`${label}: stagingkontot måste tillhöra en demoorganisation`);
  if (organization.status !== "active") throw new Error(`${label}: organisationen är inte aktiv`);
  if (membership.status !== "active") throw new Error(`${label}: medlemskapet är inte aktivt`);
  return { userId: context.user_id, organizationId: organization.id };
}

export function validateIndependentSessionContexts(first, second) {
  const firstIdentity = validateSessionContext(first, "Organisation A");
  const secondIdentity = validateSessionContext(second, "Organisation B");
  if (firstIdentity.userId === secondIdentity.userId) throw new Error("Stagingkontona måste vara två olika Auth-användare");
  if (firstIdentity.organizationId === secondIdentity.organizationId) throw new Error("Stagingkontona måste tillhöra två olika organisationer");
  return { firstIdentity, secondIdentity };
}

export function validateOrganizationCaseRows(rows, organizationId, label) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${label}: minst ett syntetiskt stagingärende krävs`);
  if (rows.some((row) => row?.organization_id !== organizationId)) {
    throw new Error(`${label}: ett ärende från fel organisation blev synligt`);
  }
  return rows;
}

export function validateCrossOrganizationProbe(rows, label) {
  if (!Array.isArray(rows)) throw new TypeError(`${label}: cross-org-svaret har fel format`);
  if (rows.length !== 0) throw new Error(`${label}: RLS läckte ett ärende över organisationsgränsen`);
}
