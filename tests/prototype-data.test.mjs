import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("prototype data uses the current scenario version and real handler ids", () => {
  assert.match(source, /const EXAMPLE_DATA_VERSION = 5;/);
  assert.match(source, /coordinatorId: assignedHandler\?\.id \|\| ""/);
  assert.match(source, /exampleDataVersion: EXAMPLE_DATA_VERSION/);
});

test("prototype workflows contain auditable activity evidence", () => {
  assert.match(source, /\[CASE_DOCUMENTS_STORE\]: \[\]/);
  assert.match(source, /\[CASE_MEETINGS_STORE\]: \[\]/);
  assert.match(source, /\[ACTIVITY_DEVIATIONS_STORE\]: \[\]/);
  assert.match(source, /Tjänsteanteckning: \$\{activity\.title\}/);
  assert.match(source, /activityId: firstCheckInActivity\?\.id \|\| null/);
  assert.match(source, /activityId: reportActivity\?\.id \|\| null/);
});

test("prototype cases cover complete, waiting and decision workflows", () => {
  assert.match(source, /status: accepted \|\| declined \? "closed" : "waiting"/);
  assert.match(source, /status: concern \? "decision_required" : "in_progress"/);
  assert.match(source, /matchingProposal:/);
  assert.match(source, /complementarySupport:/);
  assert.match(source, /availableAssignmentCapacity:/);
});
