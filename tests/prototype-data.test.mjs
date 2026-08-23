import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("prototype data uses the current scenario version and real handler ids", () => {
  assert.match(source, /const EXAMPLE_DATA_VERSION = 7;/);
  assert.match(source, /function exampleTime\(base, hours\)/);
  assert.match(source, /coordinatorId: assignedHandler\?\.id \|\| ""/);
  assert.match(source, /exampleDataVersion: EXAMPLE_DATA_VERSION/);
  assert.match(source, /version: "82"/);
});

test("prototype workflows contain auditable activity evidence", () => {
  assert.match(source, /\[CASE_DOCUMENTS_STORE\]: \[\]/);
  assert.match(source, /\[CASE_MEETINGS_STORE\]: \[\]/);
  assert.match(source, /\[INTERACTIONS_STORE\]: \[\]/);
  assert.match(source, /\[ACTIVITY_DEVIATIONS_STORE\]: \[\]/);
  assert.match(source, /\[DEVIATION_DECISIONS_STORE\]: \[\]/);
  assert.match(source, /Tjänsteanteckning: \$\{activity\.title\}/);
  assert.match(source, /activityId: firstCheckInActivity\?\.id \|\| null/);
  assert.match(source, /activityId: reportActivity\?\.id \|\| null/);
  assert.match(source, /document_registered/);
  assert.match(source, /meeting_registered/);
  assert.match(source, /title: "Nästa möte med föräldern"/);
  assert.match(source, /mentor_report_registered/);
  assert.match(source, /parent_checkin_registered/);
  assert.match(source, /compensation_period_created/);
});

test("prototype cases cover complete, waiting and decision workflows", () => {
  assert.match(source, /status: accepted \|\| declined \? "closed" : "waiting"/);
  assert.match(source, /status: concern \? "decision_required" : "in_progress"/);
  assert.match(source, /matchingProposal:/);
  assert.match(source, /complementarySupport:/);
  assert.match(source, /availableAssignmentCapacity:/);
});

test("prototype history links intake, successor cases and deviations", () => {
  assert.match(source, /seedIncomingContact = needIndex === 0 && workflowIndex % 3 === 0/);
  assert.match(source, /intakeCaseId,/);
  assert.match(source, /successor_case_created/);
  assert.match(source, /assignment_changed/);
  assert.match(source, /activity_updated/);
  assert.match(source, /deviation_opened/);
  assert.match(source, /deviation_decided/);
  assert.match(source, /status: "resolved"/);
});
