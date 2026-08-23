import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("offers a public mentor application and status route", () => {
  assert.match(html, /id="navPublicMentorApplication"[^>]*href="#\/public-mentor"/);
  assert.match(app, /"public-mentor": renderPublicPortal/);
  assert.match(app, /function renderPublicMentorApplication\(\)/);
  assert.match(app, /id="publicMentorApplicationForm"/);
  assert.match(app, /data-public-mentor-step="1"/);
  assert.match(app, /data-public-mentor-step="4"/);
  assert.doesNotMatch(app.match(/function publicMentorApplicationForm[\s\S]*?\n}\n/)?.[0] || "", /name="personalNumber"/);
  assert.match(app, /role: "Besökare"/);
  assert.match(app, /els\.navIncomingContact/);
});

test("keeps applications separate until a handler accepts them", () => {
  assert.match(app, /MENTOR_APPLICATIONS_STORE = "mentorApplications"/);
  assert.match(html, /id="mentorApplicationQueuePanel"/);
  assert.match(app, /mentorApplicationDuplicateCandidates\(application, candidates\)/);
  assert.match(app, /data-link-mentor-application/);
  assert.match(app, /function convertMentorApplicationToCandidate\(application\)/);
  assert.match(app, /mentorApplicationId: application\.id/);
  assert.match(app, /ensureCertificationCases\(\)/);
});

test("uses the global communication layer for confirmations and completion requests", () => {
  assert.match(app, /function sendMentorApplicationMessage/);
  assert.match(app, /entityType: "mentor_application"/);
  assert.match(app, /createDemoCommunicationProvider\(channel\)/);
  assert.match(app, /Vi har tagit emot din intresseanmälan/);
  assert.match(app, /Komplettera din intresseanmälan/);
});

test("lays out the step flow responsively without page-width assumptions", () => {
  assert.match(styles, /\.public-mentor-stepper/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.public-mentor-support-details/);
  assert.match(styles, /@media \(max-width: 600px\)/);
  assert.match(styles, /\.public-mentor-actions/);
  assert.match(app, /class="public-mentor-support-group"/);
  assert.match(app, /SUPPORT_AREA_CATEGORIES\.map/);
  assert.match(styles, /\.public-mentor-support-group > summary/);
});
