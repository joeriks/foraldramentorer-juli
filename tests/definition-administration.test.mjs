import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, technicalSpecification, routines] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../docs/teknisk-specifikation-progressiv-arendehantering.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/verksamhetsfloden-och-handlaggningsrutiner.md", import.meta.url), "utf8")
]);

test("offers guarded administration for custom case types and activity templates", () => {
  assert.match(html, /id="newCaseTypeButton"[^>]*href="#\/case-types\/new"/);
  assert.match(html, /id="newActivityTypeButton"[^>]*href="#\/activity-types\/new"/);
  assert.match(html, /id="deactivateCaseTypeButton"/);
  assert.match(html, /id="deactivateActivityTypeButton"/);
  assert.match(app, /function canAdministerDefinitions\(\)/);
  assert.match(app, /currentUser\(\)\.role === "Samordnare"/);
  assert.match(app, /if \(creating && !administrator\)/);
  assert.match(app, /SYSTEM_CASE_TYPE_IDS\.has\(definition\.id\)/);
  assert.match(app, /SYSTEM_ACTIVITY_TEMPLATE_IDS\.has\(definition\.id\)/);
});

test("publishes new versions without rewriting historical records", () => {
  assert.match(app, /function caseTypeById\(id, version = null\)/);
  assert.match(app, /definition\.id === id && Number\(definition\.version\) === Number\(version\)/);
  assert.match(app, /function activityTemplateDefinitionById\(id, version = null\)/);
  assert.match(app, /caseTypeById\(caseRecord\.caseTypeId, caseRecord\.caseTypeVersion\)/);
  assert.match(app, /activityTemplateDefinitionById\(activity\.templateId, activity\.templateVersion\)/);
  assert.match(app, /data-case-type-template-version/);
  assert.match(app, /Version \$\{itemVersion\} \(\$\{statusLabel\}\)/);
  assert.match(app, /templateVersion: template\.version/);
  assert.match(app, /status: "retired"/);
  assert.match(app, /status: "published"/);
});

test("checks dependencies before inactivation and cycles before publication", () => {
  assert.match(app, /function nextCaseTypeSelectionCreatesCycle\(sourceId, nextCaseTypeId\)/);
  assert.match(app, /Valet skulle skapa ett cirkulärt ärendeflöde/);
  assert.match(app, /if \(impact\.inboundTypes\.length\)/);
  assert.match(app, /if \(impact\.caseTypes\.length\)/);
  assert.match(app, /Inaktivering bevarar samtliga historiska poster/);
  assert.doesNotMatch(app, /deleteCaseTypeDefinition/);
  assert.doesNotMatch(app, /deleteActivityTemplateDefinition/);
});

test("documents the protected core and exact version references", () => {
  for (const document of [technicalSpecification, routines]) {
    assert.match(document, /inbyggda kärn(?:typer|flöden)/i);
    assert.match(document, /inaktiver/i);
    assert.match(document, /histor/i);
  }
  assert.match(technicalSpecification, /exakt `caseTypeVersion`/);
  assert.match(technicalSpecification, /exakt `templateVersion`/);
  assert.match(app, /version: "97"/);
});
