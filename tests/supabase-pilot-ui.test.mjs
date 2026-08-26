import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../supabase-pilot.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../supabase-pilot.css", import.meta.url), "utf8");
const html = await readFile(new URL("../supabase-pilot.html", import.meta.url), "utf8");

test("pilot sends activity writes with version and a stable per-form idempotency key", () => {
  assert.match(source, /data-complete-activity/);
  assert.match(source, /data-expected-version=/);
  assert.match(source, /data-idempotency-key=/);
  assert.match(source, /expectedVersion: Number\(form\.dataset\.expectedVersion\)/);
  assert.match(source, /idempotencyKey: form\.dataset\.idempotencyKey/);
  assert.match(source, /repository\.completeCaseActivity/);
});

test("pilot creates activities from an explicitly selected published definition version", () => {
  assert.match(source, /data-create-activity/);
  assert.match(source, /definition\.status === "active"/);
  assert.match(source, /version\?\.status === "published"/);
  assert.match(source, /definition\.id\)}@\$\{escapeHtml\(definition\.current_version\)/);
  assert.match(source, /repository\.createCaseActivity/);
  assert.match(source, /expectedActivityDefinitionVersion: Number\(version\)/);
  assert.match(source, /idempotencyKey: form\.dataset\.idempotencyKey/);
  assert.match(source, /activityDefinitionCatalog = await repository\.listActivityDefinitions\(\)/);
  assert.match(source, /definitionsversion .* fryses|definitionsversion \$\{version\} fryst/);
});

test("pilot loads the definition catalog for every role that may create activities", () => {
  assert.match(source, /\["administrator", "coordinator", "handler"\]\.includes\(context\.membership\?\.role\)/);
  assert.match(source, /activityDefinitionCatalog = definitionCatalog/);
  assert.match(source, /context\.membership\?\.role === "administrator"/);
});

test("pilot exposes audited waiting and resume transitions only for open cases", () => {
  assert.match(source, /workspace\.case\.status === "open"/);
  assert.match(source, /data-transition-activity-work-state/);
  assert.match(source, /name="waitingForParty"/);
  assert.match(source, /name="reason" maxlength="2000"/);
  assert.match(source, /repository\.transitionCaseActivityWorkState/);
  assert.match(source, /expectedVersion: Number\(form\.dataset\.expectedVersion\)/);
  assert.match(source, /waitingPartySelect\.required = waiting/);
  assert.match(source, /reason\.required = waiting/);
});

test("pilot limits motivated activity reopening to administrators and coordinators", () => {
  assert.match(source, /function canReopenActivities/);
  assert.match(source, /\["administrator", "coordinator"\]\.includes/);
  assert.match(source, /data-reopen-activity/);
  assert.match(source, /Motivering till återöppning/);
  assert.match(source, /repository\.reopenCaseActivity/);
  assert.match(source, /Tidigare resultat och eventuell avvikelse finns kvar i historiken/);
});

test("pilot exposes structured case lifecycle actions with role and state guards", () => {
  assert.match(source, /CASE_LIFECYCLE_REASONS/);
  assert.match(source, /data-transition-case-lifecycle/);
  assert.match(source, /name="reasonCode" required/);
  assert.match(source, /data-case-resume-at/);
  assert.match(source, /repository\.transitionCaseLifecycle/);
  assert.match(source, /expectedVersion: selectedWorkspace\.case\.version/);
  assert.match(source, /Tidigare inställda aktiviteter återaktiverades inte/);
  assert.match(source, /!canCompleteActivities\(\)\s*\? \[\]/);
});

test("pilot reads result labels from the activity's frozen database definition", () => {
  assert.doesNotMatch(source, /const activityResults\s*=/);
  assert.match(source, /resultDefinitionsForActivity/);
  assert.match(source, /definition\.activity_definition_id === activity\.activity_definition_id/);
  assert.match(source, /definition\.activity_definition_version === activity\.activity_definition_version/);
  assert.match(source, /definition\.label/);
  assert.doesNotMatch(source, /classification: resultDefinition\.classification/);
});

test("pilot reloads the workspace and warns on a typed version conflict", () => {
  assert.match(source, /error instanceof VersionConflictError/);
  assert.match(source, /renderCaseWorkspace\(await repository\.getCaseWorkspace\(selectedCaseId\)\)/);
  assert.match(source, /Senaste versionen visas/);
  assert.match(styles, /\.state\[data-kind="warning"\]/);
});

test("pilot does not offer completion controls for finalized activities or read-only roles", () => {
  assert.match(source, /\["completed", "cancelled"\]\.includes\(activity\.status\)/);
  assert.match(source, /\["administrator", "coordinator", "handler"\]\.includes/);
  assert.match(source, /if \(final \|\| !canWrite\)/);
});

test("pilot exposes definition administration only to organization administrators", () => {
  assert.match(html, /id="activityDefinitionPanel"[^>]*hidden/);
  assert.match(html, /Endast organisationsadministratör/);
  assert.match(source, /context\.membership\?\.role !== "administrator"/);
  assert.match(source, /repository\.listActivityDefinitions/);
});

test("pilot requires an explicit review before immutable publication", () => {
  assert.match(html, /id="activityDefinitionReview"[^>]*hidden/);
  assert.match(html, /Obligatorisk granskning/);
  assert.match(source, /pendingDefinitionPublication = \{/);
  assert.match(html, /Granska publicering/);
  assert.match(source, /repository\.publishActivityDefinition\(pendingDefinitionPublication\)/);
  assert.match(source, /efter publicering är versionen och dess resultat låsta/);
});

test("pilot builds reviewed result catalogs from controlled fields", () => {
  assert.match(html, /id="activityDefinitionResultRows"/);
  assert.match(source, /data-result-code/);
  assert.match(source, /data-result-label/);
  assert.match(source, /data-result-classification/);
  assert.match(source, /classification === "deviation"/);
  assert.match(source, /Minst ett resultat måste finnas/);
});

test("pilot reloads definition administration after publication conflicts", () => {
  assert.match(source, /error instanceof VersionConflictError/);
  assert.match(source, /await reloadActivityDefinitionAdmin\(\)/);
  assert.match(source, /Definitionen publicerades av någon annan/);
  assert.match(styles, /\.publication-review/);
});

test("pilot exposes the complete versioned case workspace", () => {
  assert.match(source, /workspace\.descriptionVersions/);
  assert.match(source, /workspace\.notes/);
  assert.match(source, /workspace\.deviations/);
  assert.match(source, /workspace\.deviationDecisions/);
  assert.match(source, /workspace\.documents/);
  assert.match(source, /workspace\.documentVersions/);
  assert.match(source, /data-update-description/);
  assert.match(source, /data-save-note/);
  assert.match(source, /data-decide-deviation/);
  assert.match(source, /data-upload-document/);
  assert.match(styles, /\.workspace-section/);
});

test("pilot sends every case workspace write through the repository boundary", () => {
  assert.match(source, /repository\.updateCaseDescription/);
  assert.match(source, /repository\.saveCaseNote/);
  assert.match(source, /repository\.decideActivityDeviation/);
  assert.match(source, /repository\.uploadCaseDocument/);
  assert.match(source, /expectedCaseVersion: selectedWorkspace\.case\.version/);
  assert.match(source, /Rättelsen sparades utan att originalanteckningen raderades/);
  assert.match(source, /en isolerad avvikelse öppnades automatiskt/);
  assert.match(source, /privat organisationslagring/);
});
