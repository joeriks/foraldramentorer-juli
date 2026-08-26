import { createClient } from "@supabase/supabase-js";

const MAX_REQUEST_BYTES = 32_768;

function environmentBoolean(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function cleanEnvironment(env = {}) {
  return {
    url: String(env.SUPABASE_URL || "").replace(/\/+$/, ""),
    publishableKey: String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ""),
    secretKey: String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ""),
    inviteRedirectUrl: String(env.SUPABASE_INVITE_REDIRECT_URL || ""),
    invitationDelivery: String(env.SUPABASE_INVITATION_DELIVERY || "").trim().toLowerCase() === "generate-link"
      ? "generate-link"
      : "send-email",
    caseWorkspaceEnabled: environmentBoolean(env.SUPABASE_CASE_WORKSPACE_ENABLED)
  };
}

function authOptions() {
  return {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  };
}

function callerClient(configuration, accessToken) {
  return createClient(configuration.url, configuration.publishableKey, {
    ...authOptions(),
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

function adminClient(configuration) {
  return createClient(configuration.url, configuration.secretKey, authOptions());
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || "";
}

function boundedText(value, maximum) {
  return String(value || "").trim().slice(0, maximum);
}

function normalizeInvitation(payload) {
  const invitation = {
    email: boundedText(payload?.email, 320).toLowerCase(),
    slug: boundedText(payload?.slug, 80).toLowerCase(),
    name: boundedText(payload?.name, 160),
    kind: boundedText(payload?.kind, 16).toLowerCase(),
    displayName: boundedText(payload?.displayName, 160),
    reason: boundedText(payload?.reason, 500),
    idempotencyKey: boundedText(payload?.idempotencyKey, 160) || crypto.randomUUID()
  };
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email);
  const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(invitation.slug);
  if (!validEmail || !validSlug || !invitation.name || !invitation.displayName || !invitation.reason) return null;
  if (!new Set(["live", "demo"]).has(invitation.kind)) return null;
  return invitation;
}

export function runtimeConfiguration(env = {}) {
  const configuration = cleanEnvironment(env);
  if (!configuration.url || !configuration.publishableKey) return null;
  return {
    supabaseUrl: configuration.url,
    supabasePublishableKey: configuration.publishableKey,
    caseWorkspaceEnabled: configuration.caseWorkspaceEnabled
  };
}

export function handleRuntimeConfiguration(request, env = {}) {
  if (request.method !== "GET") return jsonResponse({ code: "METHOD_NOT_ALLOWED" }, 405);
  const configuration = runtimeConfiguration(env);
  if (!configuration) return jsonResponse({ code: "SUPABASE_NOT_CONFIGURED" }, 503);
  return jsonResponse(configuration);
}

export async function handleOrganizationInvitation(request, env = {}) {
  if (request.method !== "POST") return jsonResponse({ code: "METHOD_NOT_ALLOWED" }, 405);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return jsonResponse({ code: "REQUEST_TOO_LARGE" }, 413);

  const configuration = cleanEnvironment(env);
  if (!configuration.url || !configuration.publishableKey || !configuration.secretKey) {
    return jsonResponse({ code: "SUPABASE_ADMIN_NOT_CONFIGURED" }, 503);
  }

  const accessToken = bearerToken(request);
  if (!accessToken) return jsonResponse({ code: "AUTH_REQUIRED" }, 401);

  let rawPayload;
  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ code: "REQUEST_TOO_LARGE" }, 413);
    }
    rawPayload = JSON.parse(rawText);
  } catch {
    return jsonResponse({ code: "INVALID_JSON" }, 400);
  }

  const invitation = normalizeInvitation(rawPayload);
  if (!invitation) return jsonResponse({ code: "INVALID_INVITATION" }, 400);

  const caller = callerClient(configuration, accessToken);
  const { data: isPlatformSuperadmin, error: authorizationError } = await caller.rpc("is_platform_superadmin");
  if (authorizationError || isPlatformSuperadmin !== true) {
    return jsonResponse({ code: "PLATFORM_ADMIN_REQUIRED" }, 403);
  }

  const administrator = adminClient(configuration);
  const redirectTo = configuration.inviteRedirectUrl || new URL("/supabase-pilot.html", request.url).href;
  const invitationOptions = {
    redirectTo,
    data: {
      display_name: invitation.displayName,
      organization_name: invitation.name,
      organization_slug: invitation.slug
    }
  };
  const invitationResult = configuration.invitationDelivery === "generate-link"
    ? await administrator.auth.admin.generateLink({
      type: "invite",
      email: invitation.email,
      options: invitationOptions
    })
    : await administrator.auth.admin.inviteUserByEmail(invitation.email, invitationOptions);
  const invitedUser = invitationResult.data?.user;

  if (invitationResult.error || !invitedUser?.id) {
    return jsonResponse({ code: "AUTH_INVITATION_FAILED" }, 409);
  }

  const { data: organizationId, error: provisioningError } = await caller.rpc("platform_create_organization", {
    p_slug: invitation.slug,
    p_name: invitation.name,
    p_kind: invitation.kind,
    p_first_admin_user_id: invitedUser.id,
    p_first_admin_display_name: invitation.displayName,
    p_reason: invitation.reason,
    p_idempotency_key: invitation.idempotencyKey
  });

  if (provisioningError || !organizationId) {
    const { error: cleanupError } = await administrator.auth.admin.deleteUser(invitedUser.id);
    return jsonResponse({
      code: cleanupError ? "ORGANIZATION_PROVISION_FAILED_CLEANUP_REQUIRED" : "ORGANIZATION_PROVISION_FAILED"
    }, 409);
  }

  return jsonResponse({
    organizationId,
    invitedUserId: invitedUser.id,
    email: invitation.email,
    idempotencyKey: invitation.idempotencyKey
  }, 201);
}
