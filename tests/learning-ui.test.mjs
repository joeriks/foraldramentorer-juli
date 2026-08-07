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
});
