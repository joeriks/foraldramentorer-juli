import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, styles, domain] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../mentor-self-service-domain.js", import.meta.url), "utf8")
]);

test("lets a mentor edit self-service fields but keeps protected fields read-only", () => {
  assert.match(app, /id="mentorSelfServiceProfileForm"/);
  assert.match(app, /Redigera mina uppgifter/);
  assert.match(app, /name="geographicAreaId"/);
  assert.match(app, /name="languageId"/);
  assert.match(app, /name="availabilitySlotId"/);
  assert.match(app, /data-self-support-area/);
  const formRenderer = app.match(/function renderMentorProfileForm[\s\S]*?\n}\n/)?.[0] || "";
  assert.doesNotMatch(formRenderer, /personalNumber|identityMethod|registryChecked/);
  assert.match(formRenderer, /Uppgifter som kommunen ansvarar för/);
});

test("persists an immutable audit event and a new matching profile version atomically", () => {
  assert.match(app, /MENTOR_PROFILE_EVENTS_STORE = "mentorProfileEvents"/);
  assert.match(app, /DB_VERSION = 14/);
  assert.match(app, /createMentorProfileEvent/);
  assert.match(domain, /mentor_profile_self_updated/);
  assert.match(app, /\[MENTOR_PROFILE_EVENTS_STORE\]: \[eventRecord\]/);
  assert.match(app, /profileWrites\(built, MENTOR_MATCHING_PROFILES_STORE/);
  assert.match(app, /Mentorn uppdaterade sin profil/);
  assert.match(app, /Varje sparad ändring behåller tidpunkt, användare och tidigare värde/);
});

test("keeps the profile editor within the mobile document width", () => {
  assert.match(styles, /\.mentor-self-service-grid/);
  assert.match(styles, /\.mentor-self-service-support-fields/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.mentor-self-service-grid,[\s\S]*\.mentor-self-service-choice-grid,[\s\S]*\.mentor-self-service-support-fields,[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /\.mentor-self-service-actions[\s\S]*flex-direction: column-reverse/);
});

test("gives the mentor portal a direct and compact mobile flow", () => {
  assert.match(app, /classList\.toggle\("is-mentor-portal", isMentorSession\(\)\)/);
  const homeRenderer = app.match(/function renderMentorHome\(\)[\s\S]*?\n}\n\nfunction renderMentorMessages/)?.[0] || "";
  assert.match(homeRenderer, /Ditt uppdrag/);
  assert.match(homeRenderer, /Öppna uppdraget/);
  assert.match(homeRenderer, /Skriv till handläggaren/);
  assert.match(homeRenderer, /mentorAssignmentNextMarkup\(caseRecord\)/);
  assert.match(app, /Nästa möte med föräldern/);
  assert.match(app, /Det här gör du härnäst/);
  assert.match(app, /Inget möte inbokat/);
  assert.doesNotMatch(homeRenderer, /mentor-summary-grid|Fortsätt uppdraget/);
  assert.match(app, /mentor-assignment-mobile-list/);
  assert.match(app, /mentor-assignments-table/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-home-assignment-item[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-home-assignment-actions[\s\S]*flex-direction: column/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-assignments-table[\s\S]*display: none/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-assignment-mobile-list[\s\S]*display: block/);
  assert.match(styles, /body\.is-mentor-portal \.system-status/);
});
