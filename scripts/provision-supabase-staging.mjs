import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { handleOrganizationInvitation } from "../supabase-admin-api.js";

const configPath = process.env.STAGING_PROVISION_CONFIG_PATH;
const bootstrapPath = process.env.STAGING_BOOTSTRAP_CREDENTIALS_PATH;
const outputPath = process.env.STAGING_ORG_CREDENTIALS_PATH;

if (!configPath || !bootstrapPath || !outputPath) {
  throw new Error("staging provisioning paths are required");
}

const configuration = JSON.parse(fs.readFileSync(configPath, "utf8"));
const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, "utf8"));
const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
};

const bootstrapClient = createClient(configuration.url, configuration.anonKey, authOptions);
const administrator = createClient(configuration.url, configuration.serviceRole, authOptions);

function password() {
  return `Stg-${crypto.randomBytes(24).toString("base64url")}!9a`;
}

function assertResult(result, operation) {
  if (result?.error) {
    throw new Error(`${operation}: ${result.error.message || result.error.code || "unknown error"}`);
  }
  return result?.data;
}

const bootstrapSession = assertResult(
  await bootstrapClient.auth.signInWithPassword({
    email: bootstrap.email,
    password: bootstrap.password
  }),
  "bootstrap sign-in"
);

if (!bootstrapSession?.session?.access_token) {
  throw new Error("bootstrap sign-in returned no access token");
}

const bootstrapAuthorization = assertResult(
  await bootstrapClient.rpc("is_platform_superadmin"),
  "bootstrap authorization"
);

if (bootstrapAuthorization !== true) {
  throw new Error("bootstrap account is not an active platform superadmin");
}

const organizations = [
  {
    label: "A",
    email: "staging-org-a-admin@example.invalid",
    slug: "staging-demo-a",
    name: "Staging Demoorganisation A",
    displayName: "Demo Admin A",
    number: "STG-A-001"
  },
  {
    label: "B",
    email: "staging-org-b-admin@example.invalid",
    slug: "staging-demo-b",
    name: "Staging Demoorganisation B",
    displayName: "Demo Admin B",
    number: "STG-B-001"
  }
];

for (const organization of organizations) {
  organization.password = password();
  const request = new Request("https://staging.local/api/platform/organization-invitations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${bootstrapSession.session.access_token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: organization.email,
      slug: organization.slug,
      name: organization.name,
      kind: "demo",
      displayName: organization.displayName,
      reason: "Syntetisk stagingorganisation för isoleringspreflight",
      idempotencyKey: `staging-provision-${organization.label.toLowerCase()}-1`
    })
  });

  const response = await handleOrganizationInvitation(request, {
    SUPABASE_URL: configuration.url,
    SUPABASE_PUBLISHABLE_KEY: configuration.anonKey,
    SUPABASE_SECRET_KEY: configuration.serviceRole,
    SUPABASE_INVITE_REDIRECT_URL: "http://localhost:3000/supabase-pilot.html",
    SUPABASE_INVITATION_DELIVERY: "generate-link"
  });
  const body = await response.json();
  if (response.status !== 201) {
    throw new Error(`organization ${organization.label} provisioning returned ${response.status}: ${body.code || "unknown"}`);
  }

  organization.organizationId = body.organizationId;
  organization.userId = body.invitedUserId;
  assertResult(
    await administrator.auth.admin.updateUserById(organization.userId, {
      password: organization.password,
      email_confirm: true,
      user_metadata: {
        display_name: organization.displayName,
        synthetic: true,
        staging_organization: organization.slug
      }
    }),
    `organization ${organization.label} credential activation`
  );
}

for (const organization of organizations) {
  organization.client = createClient(configuration.url, configuration.anonKey, authOptions);
  const session = assertResult(
    await organization.client.auth.signInWithPassword({
      email: organization.email,
      password: organization.password
    }),
    `organization ${organization.label} sign-in`
  );
  if (!session?.session?.access_token) {
    throw new Error(`organization ${organization.label} sign-in returned no access token`);
  }

  const context = assertResult(
    await organization.client.rpc("current_session_context"),
    `organization ${organization.label} context`
  );
  if (context?.is_platform_superadmin !== false || context?.organization?.id !== organization.organizationId) {
    throw new Error(`organization ${organization.label} received an invalid isolated session context`);
  }

  const createdCase = assertResult(
    await organization.client.rpc("create_case", {
      p_number: organization.number,
      p_case_type_id: "staging-isolation",
      p_title: `Syntetiskt isoleringsärende ${organization.label}`,
      p_description: "Prototypdata för extern stagingpreflight.",
      p_priority: "normal",
      p_organization_unit_id: null,
      p_idempotency_key: `staging-case-${organization.label.toLowerCase()}-1`
    }),
    `organization ${organization.label} case creation`
  );
  organization.caseId = createdCase.id;
}

const [firstRows, secondRows] = await Promise.all(
  organizations.map(async (organization) => assertResult(
    await organization.client
      .from("cases")
      .select("id,organization_id,number")
      .order("number"),
    `organization ${organization.label} case read`
  ))
);

if (firstRows.length !== 1 || firstRows[0].organization_id !== organizations[0].organizationId) {
  throw new Error("organization A case boundary is invalid");
}
if (secondRows.length !== 1 || secondRows[0].organization_id !== organizations[1].organizationId) {
  throw new Error("organization B case boundary is invalid");
}

const [firstCrossProbe, secondCrossProbe] = await Promise.all([
  organizations[0].client.from("cases").select("id").eq("id", organizations[1].caseId),
  organizations[1].client.from("cases").select("id").eq("id", organizations[0].caseId)
]);
assertResult(firstCrossProbe, "organization A cross-organization probe");
assertResult(secondCrossProbe, "organization B cross-organization probe");
if (firstCrossProbe.data.length !== 0 || secondCrossProbe.data.length !== 0) {
  throw new Error("cross-organization case probe returned data");
}

fs.writeFileSync(outputPath, JSON.stringify({
  organizationA: {
    email: organizations[0].email,
    password: organizations[0].password,
    organizationId: organizations[0].organizationId,
    userId: organizations[0].userId,
    caseId: organizations[0].caseId
  },
  organizationB: {
    email: organizations[1].email,
    password: organizations[1].password,
    organizationId: organizations[1].organizationId,
    userId: organizations[1].userId,
    caseId: organizations[1].caseId
  }
}), { encoding: "utf8", mode: 0o600 });

await Promise.allSettled([
  bootstrapClient.auth.signOut({ scope: "local" }),
  ...organizations.map((organization) => organization.client.auth.signOut({ scope: "local" }))
]);

process.stdout.write(`${JSON.stringify({
  status: "provisioned",
  organizations: 2,
  cases: 2,
  crossOrganizationReads: 0,
  credentialsStoredTemporarily: true
})}\n`);
