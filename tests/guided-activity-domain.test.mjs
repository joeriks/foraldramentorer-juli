import test from "node:test";
import assert from "node:assert/strict";
import {
  guidedActivityProgress,
  guidedActivityStatus,
  initializeGuidedActivityState,
  synchronizeFirstMeetingSteps,
  updateGuidedActivityStep
} from "../guided-activity-domain.js";

const definition = {
  id: "matchingFirstMeeting",
  version: 2,
  activityMode: "guided",
  stepTemplate: {
    version: 1,
    steps: [
      { id: "prepare", title: "Förbered", nextAction: "Förbered underlaget", checkpoint: "prepared", required: true, active: true, sortOrder: 0 },
      { id: "find-time", title: "Hitta tid", nextAction: "Kom överens om en tid", checkpoint: "time_found", required: true, active: true, sortOrder: 1 },
      { id: "book", title: "Boka och kalla", nextAction: "Skicka kallelse", checkpoint: "meeting_scheduled", required: true, active: true, sortOrder: 2 },
      { id: "conduct", title: "Genomför", nextAction: "Registrera mötesutfall", checkpoint: "meeting_completed", required: true, active: true, sortOrder: 3 },
      { id: "document", title: "Dokumentera", nextAction: "Dokumentera mötet", checkpoint: "meeting_documented", required: true, active: true, sortOrder: 4 },
      { id: "optional", title: "Extra avstämning", nextAction: "Bedöm behovet", checkpoint: "manual", required: false, active: true, sortOrder: 5 },
      { id: "retired", title: "Gammalt steg", nextAction: "Ingen", checkpoint: "manual", required: true, active: false, sortOrder: 6 }
    ]
  }
};

function activity(overrides = {}) {
  return {
    id: "activity-1",
    caseId: "case-1",
    templateId: definition.id,
    templateVersion: definition.version,
    title: "Genomför första mötet",
    status: "not_started",
    version: 1,
    createdAt: "2026-08-21T08:00:00.000Z",
    createdBy: "handler-1",
    updatedAt: "2026-08-21T08:00:00.000Z",
    updatedBy: "handler-1",
    ...overrides
  };
}

test("keeps simple activities outside the guided model", () => {
  assert.equal(initializeGuidedActivityState({ id: "simple", activityMode: "simple" }), null);
  assert.equal(guidedActivityProgress(activity(), { id: "simple" }), null);
});

test("creates an immutable step snapshot and exposes the current action", () => {
  const state = initializeGuidedActivityState(definition, { actorId: "handler-1", at: "2026-08-21T08:00:00.000Z" });
  const record = activity({ guidedState: state });
  const progress = guidedActivityProgress(record, definition);
  assert.equal(progress.steps.length, 6);
  assert.equal(progress.currentStep.id, "prepare");
  assert.equal(progress.nextAction, "Förbered underlaget");
  assert.equal(progress.canComplete, false);

  const changedDefinition = structuredClone(definition);
  changedDefinition.stepTemplate.steps[0].title = "Nytt namn";
  assert.equal(guidedActivityProgress(record, changedDefinition).steps[0].title, "Förbered");
});

test("blocked steps put the activity in waiting and retain actor, time and reason", () => {
  const record = activity({ guidedState: initializeGuidedActivityState(definition) });
  const result = updateGuidedActivityStep(record, definition, {
    stepId: "prepare",
    status: "blocked",
    reason: "Inväntar underlag",
    actorId: "handler-2",
    at: "2026-08-21T09:00:00.000Z"
  });
  assert.equal(result.activity.status, "waiting");
  assert.equal(result.step.reason, "Inväntar underlag");
  assert.equal(result.step.updatedBy, "handler-2");
  assert.equal(result.step.updatedAt, "2026-08-21T09:00:00.000Z");
  assert.equal(guidedActivityStatus(result.activity, definition), "waiting");
});

test("only optional steps can be skipped and a reason is required", () => {
  const record = activity({ guidedState: initializeGuidedActivityState(definition) });
  assert.throws(() => updateGuidedActivityStep(record, definition, { stepId: "prepare", status: "not_applicable", reason: "Nej", actorId: "handler-1" }), /obligatoriskt steg/i);
  assert.throws(() => updateGuidedActivityStep(record, definition, { stepId: "optional", status: "not_applicable", reason: "", actorId: "handler-1" }), /Ange varför/i);
  const skipped = updateGuidedActivityStep(record, definition, { stepId: "optional", status: "not_applicable", reason: "Behövs inte", actorId: "handler-1" });
  assert.equal(skipped.step.status, "not_applicable");
});

test("a booked meeting advances the activity to Conduct without completing it", () => {
  const record = activity({ guidedState: initializeGuidedActivityState(definition) });
  const synchronized = synchronizeFirstMeetingSteps(record, definition, [{
    id: "meeting-1",
    activityId: record.id,
    meetingStatus: "scheduled",
    occurredAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    updatedBy: "handler-2"
  }]);
  const progress = guidedActivityProgress(synchronized.activity, definition);
  assert.deepEqual(synchronized.changedSteps.map((step) => step.id), ["prepare", "find-time", "book"]);
  assert.equal(progress.currentStep.id, "conduct");
  assert.equal(synchronized.activity.status, "in_progress");
  assert.notEqual(synchronized.activity.status, "completed");
});

test("an unlinked meeting does not advance a guided activity", () => {
  const record = activity({ guidedState: initializeGuidedActivityState(definition) });
  const synchronized = synchronizeFirstMeetingSteps(record, definition, [{
    id: "meeting-unlinked",
    caseId: record.caseId,
    activityId: null,
    meetingStatus: "scheduled",
    occurredAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    updatedBy: "handler-sara"
  }]);

  assert.equal(synchronized.changedSteps.length, 0);
  assert.equal(guidedActivityProgress(synchronized.activity, definition).currentStep.id, "prepare");
});

test("a completed meeting with a note completes Conduct and Document", () => {
  const record = activity({ guidedState: initializeGuidedActivityState(definition) });
  const synchronized = synchronizeFirstMeetingSteps(record, definition, [{
    id: "meeting-1",
    activityId: record.id,
    meetingStatus: "completed",
    summary: "Mötet genomfördes och dokumenterades.",
    occurredAt: "2026-08-21T09:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    updatedBy: "handler-2"
  }]);
  const progress = guidedActivityProgress(synchronized.activity, definition);
  assert.deepEqual(synchronized.changedSteps.map((step) => step.id), ["prepare", "find-time", "book", "conduct", "document"]);
  assert.equal(progress.canComplete, true);
  assert.equal(synchronized.activity.status, "in_progress", "the activity result remains a separate decision");
});
