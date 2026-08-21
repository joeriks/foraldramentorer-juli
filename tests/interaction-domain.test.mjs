import test from "node:test";
import assert from "node:assert/strict";
import {
  interactionFromCaseMeeting,
  interactionFromIncomingContact,
  interactionParticipant,
  interactionStatusFromForm,
  meetingSatisfiesRequirement,
  normalizeInteraction,
  suggestedInteractionParticipants,
  validateInteractionForSave
} from "../interaction-domain.js";

test("suggests known case parties without requiring the handler to attend", () => {
  const participants = suggestedInteractionParticipants({
    parent: { id: "parent-1", name: "Anna" },
    mentor: { id: "mentor-1", name: "Mikael" },
    handler: { id: "handler-1", name: "Sara" }
  });
  assert.deepEqual(participants.map((item) => item.partyType), ["parent", "mentor", "handler"]);
  assert.ok(participants.every((item) => item.responseStatus === "no_response"));
});

test("keeps booking and completion requirements separate", () => {
  const booked = interactionFromCaseMeeting({
    id: "meeting-1", tenantId: "tenant-1", caseId: "case-1", meetingStatus: "scheduled",
    occurredAt: "2026-08-21T10:00:00.000Z", summary: ""
  }, suggestedInteractionParticipants({ parent: { id: "parent-1", name: "Anna" } }));
  assert.equal(meetingSatisfiesRequirement(booked, "scheduled"), true);
  assert.equal(meetingSatisfiesRequirement(booked, "completed"), false);
  assert.equal(meetingSatisfiesRequirement({ ...booked, status: "cancelled" }, "scheduled"), false);
  assert.equal(meetingSatisfiesRequirement({ ...booked, status: "no_show", summary: "Mentorn uteblev." }, "completed"), false);
  assert.equal(meetingSatisfiesRequirement({ ...booked, status: "completed", summary: "Mötet genomfördes." }, "completed"), true);
});

test("preserves the link from a new booking to the previous meeting", () => {
  const interaction = interactionFromCaseMeeting({
    id: "meeting-2", tenantId: "tenant-1", caseId: "case-1", meetingStatus: "scheduled",
    occurredAt: "2026-08-24T10:00:00.000Z", rescheduledFromInteractionId: "meeting-1"
  }, suggestedInteractionParticipants({ mentor: { id: "mentor-1", name: "Mikael" } }));
  assert.equal(interaction.rescheduledFromInteractionId, "meeting-1");
});

test("resolves every meeting outcome without treating cancellation as completion", () => {
  assert.equal(interactionStatusFromForm({ scheduled: true, kind: "meeting" }), "scheduled");
  assert.equal(interactionStatusFromForm({ scheduled: false, kind: "meeting", outcomeStatus: "completed" }), "completed");
  assert.equal(interactionStatusFromForm({ scheduled: false, kind: "meeting", outcomeStatus: "cancelled" }), "cancelled");
  assert.equal(interactionStatusFromForm({ scheduled: false, kind: "meeting", outcomeStatus: "no_show" }), "no_show");
  assert.equal(interactionStatusFromForm({ scheduled: false, kind: "phone", outcomeStatus: "cancelled" }), "completed");
});

test("allows corrected meeting input after reporting exact validation errors", () => {
  const now = new Date("2026-08-21T12:00:00.000Z").getTime();
  const invalid = validateInteractionForSave({
    status: "completed",
    startsAt: "2026-08-22T10:00:00.000Z",
    participants: [{ id: "parent:1" }],
    summary: "",
    now
  });
  assert.match(invalid.startsAt, /framtiden/);
  assert.match(invalid.summary, /anteckning/);

  const corrected = validateInteractionForSave({
    status: "completed",
    startsAt: "2026-08-21T10:00:00.000Z",
    participants: [{ id: "parent:1" }],
    summary: "Mötet genomfördes.",
    now
  });
  assert.deepEqual(corrected, { startsAt: "", endsAt: "", participants: "", summary: "" });
});

test("validates a booking but permits future cancelled and no-show records", () => {
  const booking = validateInteractionForSave({ status: "scheduled", startsAt: "2026-08-21T11:00:00.000Z", endsAt: "2026-08-21T10:00:00.000Z", participants: [] });
  assert.match(booking.endsAt, /efter starttiden/);
  assert.match(booking.participants, /deltagare/);
  for (const status of ["cancelled", "no_show"]) {
    const result = validateInteractionForSave({ status, startsAt: "2026-08-25T10:00:00.000Z", participants: [], summary: "Mötet blev inte av." });
    assert.deepEqual(result, { startsAt: "", endsAt: "", participants: "", summary: "" });
  }
});

test("projects an incoming call as a completed interaction", () => {
  const interaction = interactionFromIncomingContact({
    id: "contact-1", tenantId: "tenant-1", occurredAt: "2026-08-21T09:00:00.000Z",
    channel: "phone", summary: "Fråga om stöd", nextStep: "Ring tillbaka", parentName: "Okänd"
  });
  assert.equal(interaction.kind, "phone");
  assert.equal(interaction.status, "completed");
  assert.equal(interaction.direction, "incoming");
  assert.equal(interaction.nextStep, "Ring tillbaka");
});

test("preserves structured participant contacts and meeting communication", () => {
  const participant = interactionParticipant({
    partyType: "external",
    partyId: "school-1",
    displayName: "Eva Nilsson",
    roleLabel: "Skolkurator",
    phone: "070-123 45 67",
    email: "eva.nilsson@example.se"
  });
  const normalized = normalizeInteraction({
    kind: "meeting",
    participants: [participant],
    communicationHistory: [{
      id: "communication-1",
      type: "reminder_sent",
      comment: "Påminnelse skickad via e-post.",
      occurredAt: "2026-08-21T09:00:00.000Z",
      createdAt: "2026-08-21T09:01:00.000Z",
      createdBy: "handler-sara",
      pending: true
    }]
  });

  assert.equal(normalized.participants[0].roleLabel, "Skolkurator");
  assert.equal(normalized.participants[0].phone, "070-123 45 67");
  assert.equal(normalized.participants[0].email, "eva.nilsson@example.se");
  assert.equal(normalized.communicationHistory[0].type, "reminder_sent");
  assert.equal(normalized.communicationHistory[0].createdBy, "handler-sara");
  assert.equal("pending" in normalized.communicationHistory[0], false);
});

test("normalizes a meeting reminder without enabling legacy meetings", () => {
  const legacy = normalizeInteraction({ kind: "meeting" });
  assert.deepEqual(legacy.reminder, { enabled: false, offsetMinutes: 1440 });
  const scheduled = normalizeInteraction({ kind: "meeting", reminder: { enabled: true, offsetMinutes: 120 } });
  assert.deepEqual(scheduled.reminder, { enabled: true, offsetMinutes: 120 });
});
