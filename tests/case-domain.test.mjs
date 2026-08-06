import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_TEMPLATES,
  assessCompensationApproval,
  assessCertificationApproval,
  CASE_DETAIL_FIELD_DEFINITIONS,
  CASE_TYPE_DEFINITIONS,
  canCreateMentorAssignment,
  canTransitionActivity,
  deriveCaseStatus,
  findMentorDuplicates,
  normalizeActivityStatus,
  normalizeApprovalCaseDescription,
  normalizeCaseTypeTerminology,
  normalizeCaseStatus,
  normalizeMentorStatus,
  matchingOutcome,
  compensationReadiness,
  resultClassification,
  stableHash
} from "../case-domain.js";

function completedActivity(templateId) {
  return { templateId, title: templateId, status: "completed", resultClassification: "acceptable" };
}

test("normalizes legacy statuses without changing stable values", () => {
  assert.equal(normalizeCaseStatus("Kräver åtgärd"), "decision_required");
  assert.equal(normalizeCaseStatus("paused"), "paused");
  assert.equal(normalizeActivityStatus("Klar"), "completed");
  assert.equal(normalizeActivityStatus("waiting"), "waiting");
  assert.equal(normalizeMentorStatus("Godkänd/Certifierad"), "Godkänd");
  assert.equal(normalizeMentorStatus("Redo för intervju"), "Redo för intervju");
});

test("normalizes legacy approval terminology without replacing custom help", () => {
  const legacy = normalizeCaseTypeTerminology({
    id: "mentor-certification",
    name: "Certifiering av mentor",
    registrationHint: "Välj mentor och beskriv kort vad som har initierat certifieringen. Kontrollaktiviteterna skapas automatiskt."
  });
  assert.equal(legacy.name, "Godkännande av mentor");
  assert.match(legacy.registrationHint, /initierat prövningen/);

  const custom = normalizeCaseTypeTerminology({
    id: "mentor-certification",
    registrationHint: "Kommunens egen hjälptext."
  });
  assert.equal(custom.registrationHint, "Kommunens egen hjälptext.");
  assert.equal(
    normalizeApprovalCaseDescription("Prövning och certifiering inför uppdrag som föräldramentor."),
    "Prövning inför godkännande för uppdrag som föräldramentor."
  );
});

test("classifies acceptable and deviating activity results", () => {
  assert.equal(resultClassification("registryChecked", "shown_checked"), "acceptable");
  assert.equal(resultClassification("registryChecked", "assessment_required"), "deviation");
  assert.equal(resultClassification("registryChecked", "authenticity_unconfirmed"), "deviation");
  assert.equal(resultClassification("registryChecked", "unknown"), null);
});

test("requires explicit reopen for completed activities", () => {
  assert.equal(canTransitionActivity("not_started", "completed"), true);
  assert.equal(canTransitionActivity("completed", "in_progress"), false);
  assert.equal(canTransitionActivity("completed", "in_progress", { reopen: true }), true);
});

test("derives waiting, decision and lifecycle statuses", () => {
  const caseRecord = { status: "in_progress" };
  assert.equal(deriveCaseStatus(caseRecord, [{ status: "waiting" }]), "waiting");
  assert.equal(deriveCaseStatus(caseRecord, [{ status: "completed" }], [{ status: "open", activeDecisionId: null }]), "decision_required");
  assert.equal(deriveCaseStatus({ status: "paused" }, [{ status: "in_progress" }]), "paused");
  assert.equal(deriveCaseStatus({ status: "closed" }, [{ status: "not_started" }]), "closed");
});

test("creates stable hashes independent of object key order", () => {
  assert.equal(stableHash({ a: 1, b: { c: 2 } }), stableHash({ b: { c: 2 }, a: 1 }));
  assert.notEqual(stableHash({ a: 1 }), stableHash({ a: 2 }));
});

test("blocks certification while the case is paused or has an unresolved deviation", () => {
  const activities = [
    "identityVerified", "registryChecked", "referencesDone", "trainingDone", "quizDone", "inviteInterview", "interviewDone"
  ].map(completedActivity);
  const paused = assessCertificationApproval({
    caseRecord: { caseTypeId: "mentor-certification", status: "paused" },
    activities,
    deviations: [],
    hasResponsible: true,
    identityComplete: true
  });
  assert.equal(paused.allowed, false);
  assert.ok(paused.reasons.includes("Ärendet är pausat."));

  const deviating = assessCertificationApproval({
    caseRecord: { caseTypeId: "mentor-certification", status: "in_progress" },
    activities,
    deviations: [{ status: "open", activeDecisionId: null }],
    hasResponsible: true,
    identityComplete: true
  });
  assert.equal(deviating.allowed, false);
  assert.ok(deviating.reasons.includes("Minst ett ställningstagande återstår."));
});

test("requires every certification activity and added activity to be handled", () => {
  const required = [
    "identityVerified", "registryChecked", "referencesDone", "trainingDone", "quizDone", "inviteInterview", "interviewDone"
  ].map(completedActivity);
  const blocked = assessCertificationApproval({
    caseRecord: { caseTypeId: "mentor-certification", status: "in_progress" },
    activities: [...required, { templateId: "ad-hoc", title: "Kontakta mentorn", status: "waiting" }],
    deviations: [],
    hasResponsible: true,
    identityComplete: true
  });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reasons.includes("Minst en tillagd aktivitet återstår."));

  const allowed = assessCertificationApproval({
    caseRecord: { caseTypeId: "mentor-certification", status: "in_progress" },
    activities: required,
    deviations: [],
    hasResponsible: true,
    identityComplete: true
  });
  assert.deepEqual(allowed, { allowed: true, reasons: [] });
});

test("finds exact personal-number duplicates and warns for equal names", () => {
  const candidates = [
    { id: "a", name: "Amina Ekström", personalNumber: "19600101-1234" },
    { id: "b", name: "Sara Lind", personalNumber: "19700202-4321" }
  ];
  const exact = findMentorDuplicates(candidates, { name: "Ny person", personalNumber: "196001011234" });
  assert.equal(exact.exactPersonalNumber?.id, "a");

  const sameName = findMentorDuplicates(candidates, { name: "  AMINA   EKSTRÖM ", personalNumber: "19800303-1234" });
  assert.deepEqual(sameName.sameName.map((candidate) => candidate.id), ["a"]);
});

test("defines guided workflows for matching and mentor assignments", () => {
  const matching = CASE_TYPE_DEFINITIONS.find((item) => item.id === "matching");
  const assignment = CASE_TYPE_DEFINITIONS.find((item) => item.id === "mentor-assignment");
  assert.ok(matching.suggestedActivities.includes("Fatta beslut om matchning"));
  assert.ok(assignment.suggestedActivities.includes("Följ upp efter fyra veckor"));
});

test("requires both parties and complete links before creating a mentor assignment", () => {
  assert.equal(matchingOutcome("accepted", "accepted"), "accepted");
  assert.equal(matchingOutcome("accepted", "waiting"), "waiting");
  assert.equal(matchingOutcome("declined", "accepted"), "declined");
  const completeMatch = {
    caseTypeId: "matching",
    parentId: "parent-1",
    mentorId: "mentor-1",
    supportCaseId: "support-1",
    details: { parentResponse: "accepted", mentorResponse: "accepted" }
  };
  assert.equal(canCreateMentorAssignment(completeMatch), true);
  assert.equal(canCreateMentorAssignment({ ...completeMatch, supportCaseId: null }), false);
  assert.equal(canCreateMentorAssignment({ ...completeMatch, details: { ...completeMatch.details, mentorResponse: "waiting" } }), false);
});

test("requires mentor reporting and a safe parent check-in before approving compensation", () => {
  assert.equal(compensationReadiness({ completedReportCount: 0 }), "awaiting_reports");
  assert.equal(compensationReadiness({ completedReportCount: 1 }), "awaiting_parent_checkin");
  assert.equal(compensationReadiness({ completedReportCount: 1, latestCheckIn: { contactConfirmed: "yes", safety: "yes" } }), "under_review");
  assert.deepEqual(
    assessCompensationApproval({ completedReportCount: 1, latestCheckIn: { contactConfirmed: "yes", safety: "yes" } }),
    { allowed: true, reasons: [] }
  );
  const blocked = assessCompensationApproval({ completedReportCount: 1, latestCheckIn: { contactConfirmed: "no", safety: "concern" } });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reasons.length, 2);
});

test("defines registration guidance and mentor rules for every case type", () => {
  for (const caseType of CASE_TYPE_DEFINITIONS) {
    assert.ok(caseType.helpText, `${caseType.id} should explain when it is used`);
    assert.ok(caseType.registrationHint, `${caseType.id} should explain what to register`);
    assert.ok(caseType.workInstruction, `${caseType.id} should explain how to handle the case`);
    assert.ok(["none", "optional", "required"].includes(caseType.mentorMode));
  }
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "needs-analysis").mentorMode, "none");
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "mentor-certification").mentorMode, "required");
});

test("defines handling guidance for every activity template", () => {
  for (const template of ACTIVITY_TEMPLATES) {
    assert.ok(template.workInstruction, `${template.id} should explain how to perform the activity`);
  }
});

test("limits configurable case fields to the shared field catalog", () => {
  const fieldIds = CASE_DETAIL_FIELD_DEFINITIONS.map((field) => field.id);
  assert.equal(new Set(fieldIds).size, fieldIds.length);
  for (const caseType of CASE_TYPE_DEFINITIONS) {
    assert.ok(Array.isArray(caseType.detailFieldIds));
    assert.ok(caseType.detailFieldIds.every((fieldId) => fieldIds.includes(fieldId)));
  }
  assert.deepEqual(CASE_TYPE_DEFINITIONS.find((item) => item.id === "needs-analysis").detailFieldIds, fieldIds);
});

test("offers the operational deviation results used by the playbook", () => {
  assert.equal(resultClassification("registryChecked", "wrong_type_or_expired"), "deviation");
  assert.equal(resultClassification("referencesDone", "unreachable"), "deviation");
  assert.equal(resultClassification("referencesDone", "assessment_required"), "deviation");
});
