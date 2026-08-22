import test from "node:test";
import assert from "node:assert/strict";
import {
  convertMentorApplication,
  mentorApplicationDuplicateCandidates,
  mentorApplicationMissingFields,
  normalizeMentorApplication,
  submitMentorApplication
} from "../mentor-application-domain.js";

const now = "2026-08-22T10:00:00.000Z";
const completeApplication = {
  id: "application-1",
  tenantId: "tenant-1",
  reference: "FMI-26-10001",
  status: "draft",
  version: 1,
  name: "Eva Andersson",
  email: "EVA@EXAMPLE.SE",
  phone: "070-123 45 67",
  geographicAreaIds: ["norr"],
  languageIds: ["svenska"],
  availabilitySlotIds: ["physical-weekday-evening"],
  supportAreas: [{ areaId: "school-absence", confidenceLevel: "good", experienceLevels: ["lived"] }],
  motivation: "Jag vill använda min erfarenhet för att stötta andra föräldrar.",
  consentGivenAt: now,
  history: [{ eventType: "application_started", occurredAt: now, actorId: "applicant", message: "Påbörjad." }]
};

test("normalizes self-entered application data without requiring sensitive identity data", () => {
  const application = normalizeMentorApplication(completeApplication);
  assert.equal(application.email, "eva@example.se");
  assert.equal(application.status, "draft");
  assert.equal("personalNumber" in application, false);
  assert.deepEqual(mentorApplicationMissingFields(application), []);
});

test("reports every completion requirement before submission", () => {
  assert.deepEqual(mentorApplicationMissingFields({ name: "Eva" }), [
    "E-post eller telefon",
    "Geografiskt område",
    "Språk",
    "Tillgänglighet",
    "Minst ett stödområde",
    "Motivation",
    "Godkännande att kommunen kontaktar dig"
  ]);
  assert.throws(() => submitMentorApplication({ name: "Eva" }, { now }), /Ansökan saknar/);
});

test("submission and conversion append immutable workflow history", () => {
  const submitted = submitMentorApplication(completeApplication, { now, actorId: "applicant" });
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.submittedAt, now);
  assert.equal(submitted.history.at(-1).eventType, "application_submitted");

  const converted = convertMentorApplication(submitted, { mentorId: "mentor-1", now: "2026-08-22T11:00:00.000Z", actorId: "handler-1" });
  assert.equal(converted.status, "converted");
  assert.equal(converted.mentorId, "mentor-1");
  assert.equal(converted.history.at(-1).eventType, "application_converted");
  assert.equal(submitted.status, "submitted");
});

test("finds possible duplicate mentors by email, phone or normalized name", () => {
  const candidates = [
    { id: "m-email", name: "Else", contactDetails: "else@example.se · 0700000000" },
    { id: "m-phone", name: "Other", contactDetails: "other@example.se · 070-123 45 67" },
    { id: "m-name", name: "Eva   Andersson", contactDetails: "no-match@example.se" },
    { id: "m-other", name: "Someone Else", contactDetails: "someone@example.se" }
  ];
  assert.deepEqual(mentorApplicationDuplicateCandidates(completeApplication, candidates).map((candidate) => candidate.id), ["m-phone", "m-name"]);
});
