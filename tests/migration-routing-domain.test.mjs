import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPABASE_CASE_WORKSPACE_PATH,
  caseWorkspaceEnabled,
  isCaseWorkspaceHash
} from "../migration-routing-domain.js";

test("case workspace feature flag requires an exact boolean", () => {
  assert.equal(caseWorkspaceEnabled({ caseWorkspaceEnabled: true }), true);
  assert.equal(caseWorkspaceEnabled({ caseWorkspaceEnabled: "true" }), false);
  assert.equal(caseWorkspaceEnabled({}), false);
});

test("cutover covers case routes without capturing case type administration", () => {
  assert.equal(SUPABASE_CASE_WORKSPACE_PATH, "/supabase-pilot.html");
  for (const hash of ["#/cases", "#/cases/matching", "#/cases?status=open", "#/case/new", "#/case/case-1/activities/activity-1"]) {
    assert.equal(isCaseWorkspaceHash(hash), true, hash);
  }
  for (const hash of ["#/dashboard", "#/case-types", "#/case-numbering", "#/mentor-assignment/assignment-1", ""]) {
    assert.equal(isCaseWorkspaceHash(hash), false, hash);
  }
});
