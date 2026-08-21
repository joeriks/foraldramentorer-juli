import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdHocActivity,
  createCaseDescriptionVersion,
  createCaseNoteVersion,
  descriptionVersionsForCase,
  filterCaseHistory,
  latestCaseNoteVersions,
  latestRelevantCaseHistory,
  projectCaseHistory
} from "../case-workspace-domain.js";

test("ärendebeskrivningens tidigare versioner behålls i rätt ordning", () => {
  const first = createCaseDescriptionVersion({ id: "v1", tenantId: "t", caseId: "c1", text: "Bakgrund", version: 1, createdAt: "2026-08-20T10:00:00Z", createdBy: "h1" });
  const second = createCaseDescriptionVersion({ id: "v2", tenantId: "t", caseId: "c1", text: "## Aktuellt läge", version: 2, createdAt: "2026-08-21T10:00:00Z", createdBy: "h2" });
  assert.deepEqual(descriptionVersionsForCase([first, second], "c1").map((item) => item.id), ["v2", "v1"]);
  assert.equal(first.text, "Bakgrund");
});

test("en fri aktivitet kräver bara rubrik och ärver annars ärendets planering", () => {
  const activity = createAdHocActivity({ id: "a1", tenantId: "t", caseId: "c1", title: " Ring skolan ", templateId: "ad-hoc", createdAt: "2026-08-21T10:00:00Z", createdBy: "h1" });
  assert.equal(activity.title, "Ring skolan");
  assert.equal(activity.status, "not_started");
  assert.equal(activity.handlerIdOverride, null);
  assert.equal(activity.dueDate, null);
  assert.throws(() => createAdHocActivity({ id: "a2", tenantId: "t", caseId: "c1", title: " ", templateId: "ad-hoc" }), /rubrik/);
});

test("ärendeanteckningar kan kopplas och rättas utan att originalet försvinner", () => {
  const first = createCaseNoteVersion({ id: "n1-v1", tenantId: "t", caseId: "c1", noteId: "n1", targetType: "activity", targetId: "a1", text: "Första text", version: 1, createdAt: "2026-08-21T10:00:00Z", createdBy: "h1" });
  const correction = createCaseNoteVersion({ id: "n1-v2", tenantId: "t", caseId: "c1", noteId: "n1", targetType: "activity", targetId: "a1", text: "Rättad text", version: 2, supersedesVersionId: first.id, createdAt: "2026-08-21T11:00:00Z", createdBy: "h2" });
  assert.equal(latestCaseNoteVersions([first, correction], "c1")[0].id, "n1-v2");
  assert.equal(correction.supersedesVersionId, first.id);
  assert.equal(first.text, "Första text");
});

test("historiken projicerar och filtrerar verksamhetshändelser utan dubbel anteckning", () => {
  const note = createCaseNoteVersion({ id: "note-v1", tenantId: "t", caseId: "c1", targetType: "case", text: "Viktig uppgift", createdAt: "2026-08-21T12:00:00Z", createdBy: "h1" });
  const events = [
    { id: "e1", caseId: "c1", eventType: "activity_updated", entityType: "activity", entityId: "a1", occurredAt: "2026-08-21T11:00:00Z", actorId: "h1", payload: { message: "Aktiviteten avslutades" } },
    { id: "e2", caseId: "c1", eventType: "case_updated", entityType: "case", entityId: "c1", occurredAt: "2026-08-21T10:00:00Z", actorId: "h1", payload: { message: "Teknisk uppdatering" } },
    { id: "e3", caseId: "c1", eventType: "case_note_created", entityType: "case_note", entityId: note.id, occurredAt: note.createdAt, actorId: "h1", payload: { message: "Anteckning lades till" } }
  ];
  const history = projectCaseHistory({ caseId: "c1", events, notes: [note] });
  assert.equal(history.filter((item) => item.sourceType === "case_note").length, 1);
  assert.deepEqual(filterCaseHistory(history, "activities").map((item) => item.sourceId), ["a1"]);
  assert.deepEqual(filterCaseHistory(history, "system").map((item) => item.sourceId), ["c1"]);
  assert.equal(latestRelevantCaseHistory(history, 2).some((item) => item.technical), false);
});
