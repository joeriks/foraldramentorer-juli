export const SUPABASE_CASE_WORKSPACE_PATH = "/supabase-pilot.html";

export function caseWorkspaceEnabled(configuration) {
  return configuration?.caseWorkspaceEnabled === true;
}

export function isCaseWorkspaceHash(hash) {
  return /^#\/(?:cases|case)(?:[/?]|$)/.test(String(hash || ""));
}
