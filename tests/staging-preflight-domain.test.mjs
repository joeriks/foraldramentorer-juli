import assert from "node:assert/strict";
import test from "node:test";
import {
  parseExpectedFeatureFlag,
  validateCrossOrganizationProbe,
  validateIndependentSessionContexts,
  validateOrganizationCaseRows,
  validateRuntimeConfiguration,
  validatedStagingAppUrl
} from "../staging-preflight-domain.js";

test("staging feature flag expectation must be explicit", () => {
  assert.equal(parseExpectedFeatureFlag("true"), true);
  assert.equal(parseExpectedFeatureFlag("FALSE"), false);
  assert.throws(() => parseExpectedFeatureFlag("1"), /true eller false/);
});

test("staging application URL requires a clean HTTPS origin", () => {
  assert.equal(validatedStagingAppUrl("https://staging.example.se/path/"), "https://staging.example.se");
  assert.throws(() => validatedStagingAppUrl("http://staging.example.se"), /HTTPS/);
  assert.throws(() => validatedStagingAppUrl("https://user:password@staging.example.se"), /inloggningsuppgifter/);
  assert.throws(() => validatedStagingAppUrl("https://staging.example.se?token=x"), /query eller hash/);
});

test("runtime configuration exposes only the expected browser values", () => {
  assert.deepEqual(validateRuntimeConfiguration({
    supabaseUrl: "https://project.supabase.co/path",
    supabasePublishableKey: "sb_publishable_safe",
    caseWorkspaceEnabled: false
  }, false), {
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "sb_publishable_safe"
  });
  assert.throws(() => validateRuntimeConfiguration({
    supabaseUrl: "https://project.supabase.co",
    supabasePublishableKey: "safe",
    supabaseSecretKey: "secret",
    caseWorkspaceEnabled: false
  }, false), /serverhemligt/);
  assert.throws(() => validateRuntimeConfiguration({
    supabaseUrl: "https://project.supabase.co",
    supabasePublishableKey: "safe",
    caseWorkspaceEnabled: true
  }, false), /förväntat false/);
});

test("staging contexts must represent active members in two demo organizations", () => {
  const first = {
    user_id: "user-a",
    is_platform_superadmin: false,
    organization: { id: "org-a", kind: "demo", status: "active" },
    membership: { status: "active" }
  };
  const second = {
    user_id: "user-b",
    is_platform_superadmin: false,
    organization: { id: "org-b", kind: "demo", status: "active" },
    membership: { status: "active" }
  };
  assert.equal(validateIndependentSessionContexts(first, second).secondIdentity.organizationId, "org-b");
  assert.throws(() => validateIndependentSessionContexts(first, {
    ...second,
    organization: { ...second.organization, id: "org-a" }
  }), /två olika organisationer/);
  assert.throws(() => validateIndependentSessionContexts(first, {
    ...second,
    organization: { ...second.organization, kind: "live" }
  }), /demoorganisation/);
  assert.throws(() => validateIndependentSessionContexts(first, {
    ...second,
    is_platform_superadmin: true
  }), /plattformssuperadministratör/);
});

test("case rows and explicit cross-organization probes must remain isolated", () => {
  const rows = [{ id: "case-a", organization_id: "org-a" }];
  assert.equal(validateOrganizationCaseRows(rows, "org-a", "Organisation A"), rows);
  assert.throws(() => validateOrganizationCaseRows(rows, "org-b", "Organisation B"), /fel organisation/);
  assert.doesNotThrow(() => validateCrossOrganizationProbe([], "Organisation A"));
  assert.throws(() => validateCrossOrganizationProbe([{ id: "case-b" }], "Organisation A"), /läckte/);
});
