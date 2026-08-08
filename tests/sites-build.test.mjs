import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", String(Date.now()));
const { default: worker } = await import(workerUrl.href);

const context = {
  waitUntil() {},
  passThroughOnException() {}
};

test("serves the application shell", async () => {
  const response = await worker.fetch(new Request("https://example.test/"), {}, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  const html = await response.text();
  assert.match(html, /FöräldraMentorer/);
  assert.match(html, /id="dashboardView"/);
  assert.match(html, /id="caseSummaryBoard"/);
  assert.match(html, /id="decisionQueueButton"/);
  assert.match(html, /id="caseClosureSummary"/);
  assert.match(html, /id="activityCaseClosedNotice"/);
  assert.match(html, /id="presentationStepPoints"/);
  assert.match(html, />Nytt ärende</);
  assert.match(html, /id="caseTypeDetailPanel"/);
  assert.match(html, /id="caseTypeActivitiesFact"/);
  assert.match(html, /form="caseTypeAdminForm"/);
  assert.match(html, /id="activityTypesAdministrationView"/);
  assert.match(html, /form="activityTypeAdminForm"/);
  assert.match(html, /id="activityTypeResultsFact"/);
  assert.match(html, /id="activityTypeQuickFact"/);
  assert.match(html, /Handläggningsanvisning/);
  assert.match(html, /<form id="personEditForm"[\s\S]*id="cancelPersonEditButton"[\s\S]*id="savePersonEditButton"[\s\S]*<\/form>/);
  assert.doesNotMatch(html, /form="personEditForm"/);
  assert.doesNotMatch(html, /id="caseTypeAdminModal"/);
  assert.match(html, /Godkännande av mentor/);
  assert.match(html, /Registrerad av/);
  assert.match(html, /krävs för detta resultat/);
  assert.doesNotMatch(html, /certifiera/i);
});

test("serves application assets and returns 404 for unknown files", async () => {
  const script = await worker.fetch(new Request("https://example.test/app.js"), {}, context);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /^text\/javascript/);
  assert.equal(script.headers.get("cache-control"), "no-cache");
  const scriptText = await script.text();
  assert.match(scriptText, /CASE_ACTIVITIES_STORE/);
  assert.match(scriptText, /#\/case-types\/\$\{encodeURIComponent\(definition\.id\)\}/);
  assert.match(scriptText, /#\/activity-types\/\$\{encodeURIComponent\(definition\.id\)\}/);
  assert.match(scriptText, /renderRoutineFlowDiagrams/);
  assert.match(scriptText, /routineProcessLink/);
  assert.match(scriptText, /if \(nextStatus === "completed"\) selectedCaseActivityId = null;/);
  assert.match(scriptText, /data-quick-finish-activity/);
  assert.match(scriptText, /registerQuickActivityResult/);
  assert.match(scriptText, /quickCompletionResultCodes/);
  assert.match(scriptText, /function renderActivityTypeConfiguration/);
  assert.match(scriptText, /function renderCaseTypeActivitiesFact/);
  assert.match(scriptText, /alternativeLabel: "Komplettera uppgifter"/);
  assert.match(scriptText, /title: "Avsluta aktiviteten\?"/);
  assert.match(scriptText, /resultOptions,/);
  assert.doesNotMatch(scriptText, /resultValue:/);
  assert.match(scriptText, /if \(resolveConfirmation\("confirm"\)\) confirmActionModal\.hide\(\)/);
  assert.match(scriptText, /function renderCaseClosureSummary/);
  assert.match(scriptText, /Inget nytt ärende skapades automatiskt/);

  const domain = await worker.fetch(new Request("https://example.test/case-domain.js"), {}, context);
  assert.equal(domain.status, 200);
  assert.match(await domain.text(), /deriveCaseStatus/);

  const learningDomain = await worker.fetch(new Request("https://example.test/learning-domain.js"), {}, context);
  assert.equal(learningDomain.status, 200);
  assert.match(learningDomain.headers.get("content-type"), /^text\/javascript/);
  assert.match(await learningDomain.text(), /requiredLearningContentIds/);

  const featureLinks = await worker.fetch(new Request("https://example.test/feature-links.js"), {}, context);
  assert.equal(featureLinks.status, 200);
  assert.match(await featureLinks.text(), /dashboard\.work-queue/);

  const illustrations = await worker.fetch(new Request("https://example.test/routine-illustrations.js"), {}, context);
  assert.equal(illustrations.status, 200);
  assert.match(await illustrations.text(), /needs-analysis/);

  const markdownParser = await worker.fetch(new Request("https://example.test/vendor/marked/marked.esm.js"), {}, context);
  assert.equal(markdownParser.status, 200);
  assert.match(markdownParser.headers.get("content-type"), /^text\/javascript/);
  assert.equal(markdownParser.headers.get("cache-control"), "public, max-age=3600");

  const routines = await worker.fetch(new Request("https://example.test/docs/verksamhetsfloden-och-handlaggningsrutiner.md"), {}, context);
  assert.equal(routines.status, 200);
  assert.match(routines.headers.get("content-type"), /^text\/markdown/);
  const routinesText = await routines.text();
  assert.match(routinesText, /Verksamhetsflöden och handläggningsrutiner/);
  assert.match(routinesText, /Pröva mentor för godkännande/);
  assert.doesNotMatch(routinesText, /certifier/i);

  const missing = await worker.fetch(new Request("https://example.test/missing.png", {
    headers: { accept: "image/png" }
  }), {}, context);
  assert.equal(missing.status, 404);
});
