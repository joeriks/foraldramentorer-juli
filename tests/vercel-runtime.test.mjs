import assert from "node:assert/strict";
import test from "node:test";
import runtimeConfiguration from "../api/runtime-config.js";
import organizationInvitations from "../api/platform/organization-invitations.js";
import support from "../api/support.js";

function responseRecorder() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: Buffer.alloc(0),
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    end(body = "") {
      this.body = Buffer.isBuffer(body) ? body : Buffer.from(body);
    }
  };
}

test("Vercel runtime endpoint exposes only browser-safe disabled staging configuration", async () => {
  const previous = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_CASE_WORKSPACE_ENABLED: process.env.SUPABASE_CASE_WORKSPACE_ENABLED
  };
  Object.assign(process.env, {
    SUPABASE_URL: "https://staging.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test-value",
    SUPABASE_SECRET_KEY: "must-not-leak",
    SUPABASE_CASE_WORKSPACE_ENABLED: "false"
  });
  const response = responseRecorder();
  try {
    await runtimeConfiguration({
      method: "GET",
      url: "/api/runtime-config",
      headers: { host: "staging.example", "x-forwarded-proto": "https" }
    }, response);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.getHeader("cache-control"), "no-store");
  const payload = JSON.parse(response.body);
  assert.equal(payload.caseWorkspaceEnabled, false);
  assert.equal(payload.supabaseUrl, "https://staging.supabase.co");
  assert.equal(JSON.stringify(payload).includes("must-not-leak"), false);
});

test("Vercel invitation endpoint rejects oversized bodies before the admin boundary", async () => {
  const response = responseRecorder();
  await organizationInvitations({
    method: "POST",
    url: "/api/platform/organization-invitations",
    headers: { host: "staging.example", "content-type": "application/json" },
    body: "x".repeat(32_769)
  }, response);

  assert.equal(response.statusCode, 413);
  assert.deepEqual(JSON.parse(response.body), { code: "REQUEST_TOO_LARGE" });
});

test("Vercel support endpoint remains fail-closed without an AI integration", async () => {
  const response = responseRecorder();
  await support({ method: "POST" }, response);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), { code: "AI_NOT_CONFIGURED" });
});
