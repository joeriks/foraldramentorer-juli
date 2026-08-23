import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
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
  assert.match(app, /Visa utbildningsvyn/);
});

test("puts the next learning step first without locking later parts", () => {
  assert.match(app, /function learningCourseState/);
  assert.match(app, /Nästa steg i utbildningen/);
  assert.match(app, /Fortsätt.*nextModule\.title/s);
  assert.match(app, /Påbörja utbildningen/);
  assert.match(app, /Fortsätt utbildningen/);
  assert.match(app, /mode=focus/);
  assert.match(app, /Material och kunskapstest/);
  assert.match(app, /completeCount} av \$\{state\.total} delar klara/);
  assert.match(app, /is-next/);
  assert.match(app, /is-upcoming/);
  assert.match(app, /<details id="learning-module-/);
  assert.match(app, /learning-course-objectives/);
  assert.match(app, /Klar, gå vidare/);
  assert.match(app, /aria-current="step"/);
  assert.doesNotMatch(app, /is-upcoming[^\n]+disabled/);
  assert.match(styles, /\.learning-module > summary/);
  assert.match(styles, /\.learning-question-option:has\(input:checked\)/);
});

test("enters a focused course mode from a clear course overview", () => {
  assert.match(app, /function renderCourseOverview/);
  assert.match(app, /function renderFocusedCourse/);
  assert.match(app, /Avsluta utbildningsläget/);
  assert.match(app, /document\.body\.classList\.toggle\("is-learning-focus"/);
  assert.match(styles, /body\.is-learning-focus \.sidebar,[\s\S]*body\.is-learning-focus \.app-header,[\s\S]*body\.is-learning-focus \.system-status/);
  assert.match(styles, /\.learning-focus-toolbar/);
  assert.match(styles, /\.learning-course-entry/);
});

test("marks system administration with text and a shared visual context", () => {
  assert.match(html, /id="administrationContext"[^>]+>.*Systemadministration/);
  assert.match(html, />Administrera utbildning</);
  assert.match(app, /SYSTEM_ADMINISTRATION_VIEWS/);
  assert.match(app, /document\.body\.classList\.toggle\("is-system-administration"/);
  assert.match(styles, /body\.is-system-administration \.app-header/);
  assert.match(styles, /body\.is-system-administration \.app-main/);
  assert.match(styles, /\.administration-context/);
});

test("stacks the simplified learning flow on small screens", () => {
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.learning-next-step,[\s\S]*\.learning-course-item,[\s\S]*\.learning-course-entry[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /\.learning-next-step \.btn,[\s\S]*\.learning-course-item \.btn,[\s\S]*\.learning-course-entry \.btn[\s\S]*width: 100%/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.learning-module > summary[\s\S]*grid-template-columns: 2rem minmax\(0, 1fr\) 0\.75rem/);
  assert.match(styles, /\.learning-selection-summary[\s\S]*grid-template-columns: 1fr/);
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
  assert.match(app, /Identitet, registerkontroller och beslut ändras av kommunen och visas inte här/);
  assert.match(app, /DEMO_MENTOR_USER = \{ id: "mentor-demo", name: "Mentor testanvändare" \}/);
  assert.match(app, /mentorId: DEMO_MENTOR_USER\.id/);
  assert.match(app, /if \(isMentorSession\(\)\) \{\s*selectedLearnerId = currentUser\(\)\.mentorId;/);
});

test("makes prototype roles explicit and keeps system administration coordinator-only", () => {
  assert.match(html, /<label class="test-user-switcher-label" for="testUserTypeSelect">Visa prototypen som<\/label>/);
  assert.match(html, /<optgroup label="Kommunpersonal">[\s\S]*value="coordinator">Samordnare[\s\S]*value="handler">Handläggare[\s\S]*<\/optgroup>/);
  assert.match(html, /<optgroup label="Andra portaler">[\s\S]*value="mentor">Mentor[\s\S]*value="public">Ej inloggad besökare[\s\S]*<\/optgroup>/);
  assert.match(html, /class="admin-mobile-nav"/);
  assert.match(app, /activeTestUserType === "handler" && SYSTEM_ADMINISTRATION_VIEWS\.has\(route\.view\)/);
  assert.match(app, /document\.querySelector\("\.sidebar-menu-group"\)\.hidden = mentorSession \|\| publicSession \|\| handlerSession/);
  assert.match(app, /handlerSession && item\.classList\.contains\("admin-mobile-nav"\)/);
  assert.match(app, /Du visar nu kommunportalen som \$\{currentUser\(\)\.role\}/);
  assert.match(styles, /\.test-user-switcher-label/);
});

test("offers an unauthenticated parent portal and explicit public material selection", () => {
  for (const id of ["navPublicHome", "navPublicSupport", "navPublicLearning", "publicPortalView"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `${id} should exist in the application shell`);
  }
  assert.match(html, /<option value="public">Ej inloggad besökare<\/option>/);
  assert.match(app, /PUBLIC_SUPPORT_REQUESTS_STORE = "publicSupportRequests"/);
  assert.match(app, /data-learning-public/);
  assert.match(app, /selectedPublicLearningContent/);
  assert.match(app, /Detta är en förfrågan/i);
  assert.match(app, /source: "public_portal"/);
});
