import test from "node:test";
import assert from "node:assert/strict";
import {
  createMentorProfileEvent,
  mentorSelfServiceChanges,
  mentorSelfServiceSnapshot,
  mergeSelfReportedSupportAreas
} from "../mentor-self-service-domain.js";

const before = {
  name: "Anna Lind",
  email: "ANNA@EXEMPEL.SE",
  phone: "070-123 45 67",
  geographicAreaIds: ["norr"],
  languageIds: ["svenska"],
  availabilitySlotIds: ["weekday"],
  meetingModes: ["physical"],
  availableAssignmentCapacity: 1,
  supportAreas: [{ areaId: "school", confidenceLevel: "good", experienceLevels: ["lived"], verified: true, verifiedAt: "2026-08-01", verifiedBy: "h1" }]
};

test("creates a stable self-service snapshot without protected case data", () => {
  const snapshot = mentorSelfServiceSnapshot({ ...before, personalNumber: "19900101-1234", status: "Godkänd" });
  assert.equal(snapshot.email, "anna@exempel.se");
  assert.equal(snapshot.personalNumber, undefined);
  assert.equal(snapshot.status, undefined);
  assert.deepEqual(snapshot.supportAreas, [{ areaId: "school", confidenceLevel: "good", experienceLevels: ["lived"] }]);
});

test("logs exact changed fields with before and after values", () => {
  const after = { ...before, phone: "070-999 88 77", meetingModes: ["digital", "physical"] };
  const changes = mentorSelfServiceChanges(before, after);
  assert.deepEqual(changes.map((change) => change.field), ["phone", "meetingModes"]);
  const event = createMentorProfileEvent({ id: "e1", tenantId: "t1", mentorId: "m1", beforeMentor: before, afterMentor: after, actorId: "m1", actorName: "Anna Lind", now: "2026-08-23T12:00:00Z", matchingProfileVersion: 2 });
  assert.equal(event.source, "mentor_portal");
  assert.equal(event.changes[0].before, "070-123 45 67");
  assert.equal(event.changes[0].after, "070-999 88 77");
  assert.equal(event.matchingProfileVersion, 2);
});

test("preserves verification only while the self-reported basis is unchanged", () => {
  const unchanged = mergeSelfReportedSupportAreas(before.supportAreas, [{ areaId: "school", confidenceLevel: "good", experienceLevels: ["lived"] }]);
  assert.equal(unchanged[0].verified, true);
  const changed = mergeSelfReportedSupportAreas(before.supportAreas, [{ areaId: "school", confidenceLevel: "very_good", experienceLevels: ["lived", "practical"] }]);
  assert.equal(changed[0].verified, false);
  assert.equal(changed[0].verifiedAt, null);
  assert.equal(changed[0].verifiedBy, null);
});

test("does not create an audit event for an unchanged profile", () => {
  assert.equal(createMentorProfileEvent({ id: "e1", tenantId: "t1", mentorId: "m1", beforeMentor: before, afterMentor: { ...before }, actorId: "m1", actorName: "Anna Lind", now: "2026-08-23T12:00:00Z" }), null);
});
