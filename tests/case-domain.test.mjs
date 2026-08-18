import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_TEMPLATES,
  activityWorkInputDefinition,
  activitySaveRequiresConfirmation,
  assessCompensationApproval,
  assessCertificationApproval,
  CASE_DETAIL_FIELD_DEFINITIONS,
  CASE_TYPE_DEFINITIONS,
  CASE_TYPE_RELATIONSHIPS,
  canCreateMentorAssignment,
  canStartCaseType,
  canTransitionActivity,
  deriveCaseStatus,
  deriveWorkInputState,
  findMentorDuplicates,
  groupParentCases,
  normalizeActivityStatus,
  normalizeApprovalCaseDescription,
  normalizeCaseTypeTerminology,
  normalizeCaseStatus,
  normalizeMentorStatus,
  matchingOutcome,
  compensationReadiness,
  resultClassification,
  stableHash,
  supportProfileRequirements
} from "../case-domain.js";

test("groups a parent's linked cases by workflow stage", () => {
  const records = [
    { id: "support-1", parentId: "parent-1", caseTypeId: "parent-support" },
    { id: "matching-1", parentId: "parent-1", caseTypeId: "matching" },
    { id: "assignment-1", parentId: "parent-1", caseTypeId: "mentor-assignment" },
    { id: "other-parent", parentId: "parent-2", caseTypeId: "matching" }
  ];

  const grouped = groupParentCases(records, "parent-1");
  assert.deepEqual(grouped.supportCases.map((item) => item.id), ["support-1"]);
  assert.deepEqual(grouped.matchingCases.map((item) => item.id), ["matching-1"]);
  assert.deepEqual(grouped.assignmentCases.map((item) => item.id), ["assignment-1"]);
});

test("lists the exact requirements for a complete support profile", () => {
  const incomplete = supportProfileRequirements({
    supportPurpose: "Stöd i skolkontakter",
    desiredOutcome: "",
    supportAreaIds: []
  });
  assert.deepEqual(incomplete.map(({ id, complete }) => [id, complete]), [
    ["supportPurpose", true],
    ["desiredOutcome", false],
    ["supportAreaIds", false]
  ]);

  assert.equal(supportProfileRequirements({
    supportPurpose: "Stöd i skolkontakter",
    desiredOutcome: "Fungerande samverkan",
    supportAreaIds: ["school-absence"]
  }).every((requirement) => requirement.complete), true);
});

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

test("links workflow activities to canonical registrations", () => {
  assert.deepEqual(activityWorkInputDefinition({ templateId: "identityVerified" }, "mentor-certification"), {
    kind: "mentor_identity",
    featureKey: "mentor.identity",
    label: "Identitetsuppgifter",
    required: true
  });
  assert.equal(
    activityWorkInputDefinition({ templateId: "ad-hoc", title: "Komplettera stödbehov och matchningskriterier" }, "parent-support")?.kind,
    "support_profile"
  );
  assert.equal(deriveWorkInputState(), "not_started");
  assert.equal(deriveWorkInputState({ started: true }), "in_progress");
  assert.equal(deriveWorkInputState({ started: true, complete: true }), "complete");
});

test("allows case types to start only from their configured source", () => {
  const type = (id) => CASE_TYPE_DEFINITIONS.find((definition) => definition.id === id);

  assert.equal(canStartCaseType(type("needs-analysis")), true);
  assert.equal(canStartCaseType(type("parent-support")), true);
  assert.equal(canStartCaseType(type("mentor-certification")), false);
  assert.equal(canStartCaseType(type("mentor-certification"), { mentorId: "mentor-1" }), true);
  assert.equal(canStartCaseType(type("matching")), false);
  assert.equal(canStartCaseType(type("matching"), { supportCaseId: "support-1" }), true);
  assert.equal(canStartCaseType(type("mentor-assignment"), { supportCaseId: "support-1" }), false);
  assert.equal(canStartCaseType(type("mentor-assignment"), { acceptedMatchingCaseId: "matching-1" }), true);
});

test("confirms only activity saves that also close the approval case", () => {
  assert.equal(activitySaveRequiresConfirmation({ templateId: "trainingDone" }, "completed", "completed"), false);
  assert.equal(activitySaveRequiresConfirmation({ templateId: "registryChecked" }, "completed", "assessment_required"), false);
  assert.equal(activitySaveRequiresConfirmation({ templateId: "decision" }, "completed", "not_approved"), false);
  assert.equal(activitySaveRequiresConfirmation({ templateId: "decision" }, "completed", "approved"), true);
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
  assert.deepEqual(matching.activityTemplateIds, [
    "matchingEligibility",
    "matchingProposal",
    "matchingMentorContact",
    "matchingFirstMeeting",
    "matchingPartyResponses",
    "matchingDecision"
  ]);
  assert.ok(assignment.suggestedActivities.includes("Följ upp efter fyra veckor"));
});

test("uses business outcomes instead of generic completion for matching activities", () => {
  const matching = CASE_TYPE_DEFINITIONS.find((item) => item.id === "matching");
  for (const templateId of matching.activityTemplateIds) {
    const template = ACTIVITY_TEMPLATES.find((item) => item.id === templateId);
    assert.ok(template, `missing matching activity template ${templateId}`);
    assert.ok(template.workInstruction.length > 40, `${templateId} should contain actionable guidance`);
    assert.ok(template.results.length >= 3, `${templateId} should contain structured outcomes`);
    assert.equal(template.results.some(([code]) => code === "completed"), false, `${templateId} must not use generic completion`);
  }
});

test("defines valid relationships between case types", () => {
  const caseTypeIds = new Set(CASE_TYPE_DEFINITIONS.map((item) => item.id));
  for (const caseType of CASE_TYPE_DEFINITIONS) {
    assert.ok(caseType.nextCaseTypeId === null || caseTypeIds.has(caseType.nextCaseTypeId), `unknown next case type for ${caseType.id}`);
    assert.notEqual(caseType.nextCaseTypeId, caseType.id, `${caseType.id} cannot point to itself`);
  }
  const relationshipKeys = CASE_TYPE_RELATIONSHIPS.map((item) => `${item.from}:${item.to}:${item.kind}`);
  assert.equal(new Set(relationshipKeys).size, relationshipKeys.length);
  for (const relationship of CASE_TYPE_RELATIONSHIPS) {
    assert.ok(caseTypeIds.has(relationship.from), `unknown source case type ${relationship.from}`);
    assert.ok(caseTypeIds.has(relationship.to), `unknown target case type ${relationship.to}`);
    assert.ok(relationship.label);
  }
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "parent-support").nextCaseTypeId, "matching");
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "incoming-contact").nextCaseTypeId, "parent-support");
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "matching").nextCaseTypeId, "mentor-assignment");
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "needs-analysis").nextCaseTypeId, "recruitment");
  assert.equal(CASE_TYPE_DEFINITIONS.find((item) => item.id === "other").nextCaseTypeId, null);
  assert.ok(CASE_TYPE_RELATIONSHIPS.some((item) => item.from === "mentor-certification" && item.to === "matching" && item.kind === "prerequisite"));
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

test("keeps incoming contact handling focused on the recorded next step", () => {
  const incomingContact = CASE_TYPE_DEFINITIONS.find((item) => item.id === "incoming-contact");
  assert.deepEqual(incomingContact.suggestedActivities, ["Följ angivet nästa steg", "Dokumentera ställningstagande"]);
  assert.doesNotMatch(incomingContact.registrationHint, /måste koppla|personpost/i);
});

test("defines handling guidance for every activity template", () => {
  for (const template of ACTIVITY_TEMPLATES) {
    assert.ok(template.workInstruction, `${template.id} should explain how to perform the activity`);
  }
});

test("declares which activity results may use quick completion", () => {
  const adHoc = ACTIVITY_TEMPLATES.find((template) => template.id === "ad-hoc");
  assert.deepEqual(adHoc.quickCompletionResultCodes, ["completed"]);
  for (const template of ACTIVITY_TEMPLATES.filter((item) => item.quickCompletionResultCodes?.length)) {
    const resultCodes = new Set(template.results.map(([code]) => code));
    assert.ok(template.quickCompletionResultCodes.every((code) => resultCodes.has(code)));
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
