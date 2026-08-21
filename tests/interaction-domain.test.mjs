import test from "node:test";
import assert from "node:assert/strict";
import {
  interactionFromCaseMeeting,
  interactionFromIncomingContact,
  meetingSatisfiesRequirement,
  suggestedInteractionParticipants
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
