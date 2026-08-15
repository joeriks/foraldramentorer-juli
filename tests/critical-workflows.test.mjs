import assert from "node:assert/strict";
import test from "node:test";

import {
  activitySaveRequiresConfirmation,
  activityTemplateById,
  activityWorkInputDefinition,
  assessCertificationApproval,
  assessCompensationApproval,
  canCreateMentorAssignment,
  canStartCaseType,
  canTransitionActivity,
  caseTypeById,
  compensationReadiness,
  deriveCaseStatus,
  deriveWorkInputState,
  groupParentCases,
  matchingOutcome,
  resultClassification
} from "../case-domain.js";
import {
  buildMatchingSnapshot,
  buildMentorMatchingProfile,
  buildSupportMatchingProfile
} from "../matching-profile-domain.js";

const now = "2026-08-15T10:00:00.000Z";

function newActivity(templateId, sortOrder = 0, title = "") {
  const template = activityTemplateById(templateId);
  return {
    id: `activity-${sortOrder}-${templateId}`,
    templateId,
    title: title || template.title,
    sortOrder,
    status: "not_started",
    resultCode: null,
    resultClassification: null
  };
}

function transition(activity, nextStatus, resultCode = null, options = {}) {
  assert.equal(
    canTransitionActivity(activity.status, nextStatus, options),
    true,
    `${activity.title}: ${activity.status} should transition to ${nextStatus}`
  );
  const classification = nextStatus === "completed"
    ? resultClassification(activity.templateId, resultCode)
    : null;
  if (nextStatus === "completed") {
    assert.ok(classification, `${activity.title}: ${resultCode} should be a valid result`);
  }
  return {
    ...activity,
    status: nextStatus,
    resultCode: nextStatus === "completed" ? resultCode : null,
    resultClassification: classification
  };
}

function replaceActivity(activities, updatedActivity) {
  return activities.map((activity) => activity.id === updatedActivity.id ? updatedActivity : activity);
}

test("critical flow: mentor approval handles waiting, deviation, reassessment and final decision", () => {
  const caseType = caseTypeById("mentor-certification");
  const caseRecord = { id: "approval-1", caseTypeId: caseType.id, mentorId: "mentor-1", status: "new" };
  let activities = caseType.activityTemplateIds.map((templateId, index) => newActivity(templateId, index));
  let deviations = [];

  assert.equal(canStartCaseType(caseType), false);
  assert.equal(canStartCaseType(caseType, { mentorId: caseRecord.mentorId }), true);
  assert.equal(deriveCaseStatus(caseRecord, activities), "new");

  activities = replaceActivity(activities, transition(activities[0], "completed", "verified"));
  assert.equal(deriveCaseStatus(caseRecord, activities), "in_progress");

  const references = activities.find((activity) => activity.templateId === "referencesDone");
  activities = replaceActivity(activities, transition(references, "waiting"));
  assert.equal(deriveCaseStatus(caseRecord, activities), "in_progress");

  const waitingReferences = activities.find((activity) => activity.templateId === "referencesDone");
  const deviatingReferences = transition(waitingReferences, "completed", "unreachable");
  activities = replaceActivity(activities, deviatingReferences);
  deviations = [{ id: "deviation-1", activityId: deviatingReferences.id, status: "open", activeDecisionId: null }];
  assert.equal(deriveCaseStatus(caseRecord, activities, deviations), "decision_required");

  const blocked = assessCertificationApproval({
    caseRecord: { ...caseRecord, status: "in_progress" },
    activities,
    deviations,
    hasResponsible: true,
    identityComplete: true
  });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reasons.includes("Minst ett ställningstagande återstår."));

  deviations = [{ ...deviations[0], status: "resolved", activeDecisionId: "decision-1" }];
  let reassessedReferences = transition(deviatingReferences, "in_progress", null, { reopen: true });
  reassessedReferences = transition(reassessedReferences, "completed", "acceptable");
  activities = replaceActivity(activities, reassessedReferences);

  const successfulResults = new Map([
    ["registryChecked", "shown_checked"],
    ["trainingDone", "completed"],
    ["quizDone", "passed"],
    ["inviteInterview", "invitation_sent"],
    ["interviewDone", "completed"]
  ]);
  for (const [templateId, resultCode] of successfulResults) {
    const activity = activities.find((item) => item.templateId === templateId);
    activities = replaceActivity(activities, transition(activity, "completed", resultCode));
  }

  const approval = assessCertificationApproval({
    caseRecord: { ...caseRecord, status: "in_progress" },
    activities,
    deviations,
    hasResponsible: true,
    identityComplete: true
  });
  assert.deepEqual(approval, { allowed: true, reasons: [] });

  const decision = activities.find((activity) => activity.templateId === "decision");
  assert.equal(activitySaveRequiresConfirmation(decision, "completed", "approved"), true);
  activities = replaceActivity(activities, transition(decision, "completed", "approved"));
  assert.equal(activities.every((activity) => activity.status === "completed"), true);
  assert.equal(deriveCaseStatus({ ...caseRecord, status: "closed" }, activities, deviations), "closed");
});

test("critical flow: support need becomes an accepted match and a linked mentor assignment", () => {
  const supportCase = {
    id: "support-1",
    caseTypeId: "parent-support",
    parentId: "parent-1",
    details: {
      supportPurpose: "Stöd kring skolfrånvaro",
      desiredOutcome: "Fungerande kontakt med skolan",
      supportAreaIds: ["school-absence", "boundaries"],
      languages: "Svenska, Arabiska",
      area: "Öster",
      availability: "Kvällar"
    }
  };
  const mentor = {
    id: "mentor-1",
    status: "Godkänd",
    active: true,
    area: "Öster",
    availability: "Kvällar",
    languages: "Svenska, Arabiska",
    availableAssignmentCapacity: 1,
    supportAreas: [
      { areaId: "school-absence", confidenceLevel: "very_good", experienceLevels: ["practical"] },
      { areaId: "boundaries", confidenceLevel: "good", experienceLevels: ["lived"] }
    ]
  };
  const supportProfile = buildSupportMatchingProfile({
    tenantId: "tenant-1", supportCase, profileId: "support-profile-1", actorId: "handler-1", now
  });
  const mentorProfile = buildMentorMatchingProfile({
    tenantId: "tenant-1", mentor, profileId: "mentor-profile-1", actorId: "handler-1", now
  });
  const matchingCase = {
    id: "matching-1",
    caseTypeId: "matching",
    parentId: supportCase.parentId,
    mentorId: mentor.id,
    supportCaseId: supportCase.id,
    status: "new",
    details: { parentResponse: "waiting", mentorResponse: "waiting" }
  };
  const matchingType = caseTypeById("matching");
  let activities = matchingType.activityTemplateIds.map((templateId, index) => newActivity(templateId, index));

  assert.equal(canStartCaseType(matchingType), false);
  assert.equal(canStartCaseType(matchingType, { supportCaseId: supportCase.id }), true);
  assert.equal(deriveWorkInputState({ started: true, complete: true }), "complete");
  assert.equal(activityWorkInputDefinition(activities[0], matchingType.id)?.kind, "matching_basis");

  const snapshot = buildMatchingSnapshot({
    tenantId: "tenant-1",
    matchingCase,
    mentorProfile: mentorProfile.profile,
    mentorAreas: mentorProfile.supportAreas,
    mentorLanguages: mentorProfile.languages,
    supportProfile: supportProfile.profile,
    supportAreas: supportProfile.supportAreas,
    supportLanguages: supportProfile.languages,
    snapshotId: "snapshot-1",
    actorId: "handler-1",
    now
  });
  assert.deepEqual(snapshot.overlapSupportAreaIds, ["school-absence", "boundaries"]);

  const resultByTemplate = new Map([
    ["matchingEligibility", "criteria_met"],
    ["matchingProposal", "proposal_documented"]
  ]);
  for (const [templateId, resultCode] of resultByTemplate) {
    const activity = activities.find((item) => item.templateId === templateId);
    activities = replaceActivity(activities, transition(activity, "completed", resultCode));
  }

  let mentorContact = activities.find((activity) => activity.templateId === "matchingMentorContact");
  mentorContact = transition(mentorContact, "waiting");
  activities = replaceActivity(activities, mentorContact);
  assert.equal(matchingOutcome("waiting", "waiting"), "waiting");
  assert.equal(canCreateMentorAssignment(matchingCase), false);

  mentorContact = transition(mentorContact, "completed", "mentor_accepts");
  activities = replaceActivity(activities, mentorContact);
  const meeting = activities.find((activity) => activity.templateId === "matchingFirstMeeting");
  activities = replaceActivity(activities, transition(meeting, "completed", "meeting_booked"));

  matchingCase.details.parentResponse = "accepted";
  assert.equal(matchingOutcome(matchingCase.details.parentResponse, matchingCase.details.mentorResponse), "waiting");
  let responses = activities.find((activity) => activity.templateId === "matchingPartyResponses");
  responses = transition(responses, "waiting");
  activities = replaceActivity(activities, responses);

  matchingCase.details.mentorResponse = "accepted";
  responses = transition(responses, "completed", "both_accept");
  activities = replaceActivity(activities, responses);
  const matchingDecision = activities.find((activity) => activity.templateId === "matchingDecision");
  activities = replaceActivity(activities, transition(matchingDecision, "completed", "match_approved"));

  assert.equal(matchingOutcome(matchingCase.details.parentResponse, matchingCase.details.mentorResponse), "accepted");
  assert.equal(activities.every((activity) => activity.status === "completed"), true);
  assert.equal(canCreateMentorAssignment(matchingCase), true);
  assert.equal(canStartCaseType(caseTypeById("mentor-assignment"), { acceptedMatchingCaseId: matchingCase.id }), true);

  mentorProfile.supportAreas[0].supportAreaId = "social-isolation";
  assert.deepEqual(snapshot.overlapSupportAreaIds, ["school-absence", "boundaries"]);

  const assignmentCase = {
    id: "assignment-1",
    caseTypeId: "mentor-assignment",
    parentId: matchingCase.parentId,
    mentorId: matchingCase.mentorId,
    supportCaseId: matchingCase.supportCaseId,
    sourceMatchingCaseId: matchingCase.id
  };
  const grouped = groupParentCases([supportCase, matchingCase, assignmentCase], supportCase.parentId);
  assert.deepEqual(grouped.supportCases.map((item) => item.id), [supportCase.id]);
  assert.deepEqual(grouped.matchingCases.map((item) => item.id), [matchingCase.id]);
  assert.deepEqual(grouped.assignmentCases.map((item) => item.id), [assignmentCase.id]);
});

test("critical flow: mentor assignment progresses from plan through safe compensation approval", () => {
  const assignmentType = caseTypeById("mentor-assignment");
  const caseRecord = { id: "assignment-1", caseTypeId: assignmentType.id, status: "new" };
  let activities = assignmentType.suggestedActivities.map((title, index) => newActivity("ad-hoc", index, title));

  assert.equal(canStartCaseType(assignmentType, { supportCaseId: "support-1" }), false);
  assert.equal(canStartCaseType(assignmentType, { acceptedMatchingCaseId: "matching-1" }), true);
  assert.equal(activityWorkInputDefinition(activities[0], assignmentType.id)?.kind, "assignment_plan");
  assert.equal(deriveWorkInputState({ started: true, complete: false }), "in_progress");
  assert.equal(deriveWorkInputState({ started: true, complete: true }), "complete");

  activities = replaceActivity(activities, transition(activities[0], "completed", "completed"));
  assert.equal(deriveCaseStatus(caseRecord, activities), "in_progress");
  assert.equal(compensationReadiness({ completedReportCount: 0 }), "awaiting_reports");

  const completedReportCount = 1;
  assert.equal(compensationReadiness({ completedReportCount }), "awaiting_parent_checkin");
  assert.equal(assessCompensationApproval({ completedReportCount }).allowed, false);

  const unsafeCheckIn = { contactConfirmed: "no", safety: "concern" };
  assert.equal(compensationReadiness({ completedReportCount, latestCheckIn: unsafeCheckIn }), "under_review");
  const blockedApproval = assessCompensationApproval({ completedReportCount, latestCheckIn: unsafeCheckIn });
  assert.equal(blockedApproval.allowed, false);
  assert.deepEqual(blockedApproval.reasons, [
    "Föräldern har inte bekräftat att kontakterna genomförts.",
    "Oro i föräldraavstämningen måste hanteras först."
  ]);

  let followUp = activities[1];
  followUp = transition(followUp, "waiting");
  activities = replaceActivity(activities, followUp);
  assert.equal(deriveCaseStatus(caseRecord, activities), "in_progress");

  const safeCheckIn = { contactConfirmed: "yes", safety: "yes" };
  followUp = transition(followUp, "completed", "completed");
  activities = replaceActivity(activities, followUp);
  assert.deepEqual(
    assessCompensationApproval({ completedReportCount, latestCheckIn: safeCheckIn }),
    { allowed: true, reasons: [] }
  );

  for (const activity of activities.filter((item) => item.status === "not_started")) {
    activities = replaceActivity(activities, transition(activity, "completed", "completed"));
  }
  assert.equal(activities.every((activity) => activity.status === "completed"), true);
  assert.equal(deriveCaseStatus({ ...caseRecord, status: "closed" }, activities), "closed");
});
