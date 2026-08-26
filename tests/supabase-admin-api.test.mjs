import assert from "node:assert/strict";
import test from "node:test";
import {
  handleOrganizationInvitation,
  handleRuntimeConfiguration,
  runtimeConfiguration
} from "../supabase-admin-api.js";

const environment = {
  SUPABASE_URL: "https://project.example.supabase.co/",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser-safe",
  SUPABASE_SECRET_KEY: "sb_secret_server-only"
};

test("runtime configuration exposes only browser-safe Supabase values", async () => {
  assert.deepEqual(runtimeConfiguration(environment), {
    supabaseUrl: "https://project.example.supabase.co",
    supabasePublishableKey: "sb_publishable_browser-safe",
    caseWorkspaceEnabled: false
  });
  const response = handleRuntimeConfiguration(new Request("https://app.example/api/runtime-config"), environment);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /sb_publishable_browser-safe/);
  assert.doesNotMatch(body, /sb_secret_server-only/);
});

test("case workspace cutover is disabled by default and enabled only by an explicit true value", () => {
  assert.equal(runtimeConfiguration({
    ...environment,
    SUPABASE_CASE_WORKSPACE_ENABLED: "true"
  }).caseWorkspaceEnabled, true);
  assert.equal(runtimeConfiguration({
    ...environment,
    SUPABASE_CASE_WORKSPACE_ENABLED: "enabled"
  }).caseWorkspaceEnabled, false);
  assert.equal(runtimeConfiguration({
    ...environment,
    SUPABASE_CASE_WORKSPACE_ENABLED: "1"
  }).caseWorkspaceEnabled, false);
});

test("organization invitations require a caller access token", async () => {
  const response = await handleOrganizationInvitation(new Request("https://app.example/api/platform/organization-invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  }), environment);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "AUTH_REQUIRED" });
});

test("a non-platform user cannot reach the Auth Admin invitation endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options = {}) => {
    calls.push({ url: String(input), options });
    return new Response("false", { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleOrganizationInvitation(invitationRequest(), environment);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { code: "PLATFORM_ADMIN_REQUIRED" });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/rest\/v1\/rpc\/is_platform_superadmin$/);
    assert.doesNotMatch(JSON.stringify(calls[0]), /sb_secret_server-only/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a platform user can invite an administrator and provision the organization", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });
    if (url.endsWith("/rest/v1/rpc/is_platform_superadmin")) {
      return jsonResponse(true);
    }
    if (url.includes("/auth/v1/invite")) {
      return jsonResponse({
        id: "62000000-0000-0000-0000-000000000002",
        email: "admin@kommun.example",
        aud: "authenticated",
        role: "authenticated",
        user_metadata: {}
      });
    }
    if (url.endsWith("/rest/v1/rpc/platform_create_organization")) {
      return jsonResponse("61000000-0000-0000-0000-000000000001");
    }
    throw new Error(`Oväntat Supabase-anrop: ${url}`);
  };
  try {
    const response = await handleOrganizationInvitation(invitationRequest(), environment);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      organizationId: "61000000-0000-0000-0000-000000000001",
      invitedUserId: "62000000-0000-0000-0000-000000000002",
      email: "admin@kommun.example",
      idempotencyKey: "invite-kommun-a-1"
    });
    assert.equal(calls.length, 3);
    assert.match(calls[1].url, /\/auth\/v1\/invite\?redirect_to=/);
    assert.match(String(calls[1].options.headers.Authorization || calls[1].options.headers.authorization), /sb_secret_server-only/);
    assert.doesNotMatch(JSON.stringify(calls[2]), /sb_secret_server-only/);
    const provisioningBody = JSON.parse(calls[2].options.body);
    assert.equal(provisioningBody.p_slug, "kommun-a");
    assert.equal(provisioningBody.p_kind, "demo");
    assert.equal(provisioningBody.p_first_admin_user_id, "62000000-0000-0000-0000-000000000002");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("staging can generate an invitation link without sending synthetic email", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });
    if (url.endsWith("/rest/v1/rpc/is_platform_superadmin")) return jsonResponse(true);
    if (url.includes("/auth/v1/admin/generate_link")) {
      return jsonResponse({
        action_link: "https://project.example.supabase.co/auth/v1/verify?token=server-secret",
        email_otp: "123456",
        hashed_token: "hashed-server-secret",
        redirect_to: "http://localhost:4173/supabase-pilot.html",
        verification_type: "invite",
        id: "62000000-0000-0000-0000-000000000003",
        email: "admin@kommun.example",
        aud: "authenticated",
        role: "authenticated",
        user_metadata: {}
      });
    }
    if (url.endsWith("/rest/v1/rpc/platform_create_organization")) {
      return jsonResponse("61000000-0000-0000-0000-000000000002");
    }
    throw new Error(`Oväntat Supabase-anrop: ${url}`);
  };
  try {
    const response = await handleOrganizationInvitation(invitationRequest(), {
      ...environment,
      SUPABASE_INVITATION_DELIVERY: "generate-link"
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.organizationId, "61000000-0000-0000-0000-000000000002");
    assert.equal(body.invitedUserId, "62000000-0000-0000-0000-000000000003");
    assert.doesNotMatch(JSON.stringify(body), /action_link|server-secret/);
    assert.match(calls[1].url, /\/auth\/v1\/admin\/generate_link(?:\?|$)/);
    assert.doesNotMatch(JSON.stringify(calls[2]), /sb_secret_server-only/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function invitationRequest() {
  return new Request("https://app.example/api/platform/organization-invitations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer caller-access-token"
    },
    body: JSON.stringify({
      email: "admin@kommun.example",
      slug: "kommun-a",
      name: "Kommun A",
      kind: "demo",
      displayName: "Kommunadministratör",
      reason: "Pilotorganisation",
      idempotencyKey: "invite-kommun-a-1"
    })
  });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}
