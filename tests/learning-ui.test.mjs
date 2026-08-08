import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8")
]);

test("exposes learning and learning administration routes", () => {
  for (const id of ["navLearning", "navLearningAdmin", "learningView", "learningAdministrationView", "learningCatalogPanel", "learningAdminListPanel"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `${id} should exist in the application shell`);
  }
  assert.match(app, /learning: renderLearning/);
  assert.match(app, /"learning-admin": renderLearningAdministration/);
});

test("persists municipality selection and learner progress separately", () => {
  assert.match(app, /TENANT_LEARNING_SELECTION_STORE = "tenantLearningSelection"/);
  assert.match(app, /LEARNING_PROGRESS_STORE = "learningProgress"/);
  assert.match(app, /LEARNING_SELECTION_INITIALIZED_ID/);
  assert.match(app, /requiredLearningContentIds/);
  assert.match(app, /queueLearningMutation/);
  assert.match(app, /data-learning-admin-filter/);
  assert.match(app, /Visa kommunens katalog/);
});

test("offers a role-switched mentor portal with protected mentor routes", () => {
  for (const id of ["testUserTypeSelect", "navMentorHome", "navMentorAssignments", "navMentorLearning", "navMentorProfile", "mentorPortalView"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `${id} should exist in the application shell`);
  }
  for (const route of ["mentor-home", "mentor-assignments", "mentor-assignment", "mentor-profile"]) {
    assert.match(app, new RegExp(`"${route}"`));
  }
  assert.match(app, /register_mentor_self_report/);
  assert.match(app, /Du kan bara öppna uppdrag som är kopplade till din mentorprofil/);
  assert.match(app, /Känsliga register- och identitetsuppgifter visas inte i mentorportalen/);
  assert.match(app, /DEMO_MENTOR_USER = \{ id: "mentor-demo", name: "Mentor testanvändare" \}/);
  assert.match(app, /mentorId: DEMO_MENTOR_USER\.id/);
  assert.match(app, /if \(isMentorSession\(\)\) \{\s*selectedLearnerId = currentUser\(\)\.mentorId;/);
});

test("offers an unauthenticated parent portal and explicit public material selection", () => {
  for (const id of ["navPublicHome", "navPublicSupport", "navPublicLearning", "publicPortalView"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `${id} should exist in the application shell`);
  }
  assert.match(html, /<option value="public">Ej inloggad förälder<\/option>/);
  assert.match(app, /PUBLIC_SUPPORT_REQUESTS_STORE = "publicSupportRequests"/);
  assert.match(app, /data-learning-public/);
  assert.match(app, /selectedPublicLearningContent/);
  assert.match(app, /Detta är en förfrågan/i);
  assert.match(app, /source: "public_portal"/);
});
