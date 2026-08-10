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
  assert.match(html, /id="caseFlowBoard"/);
  assert.match(html, /<option value="open">Öppna<\/option>/);
  assert.match(html, /id="decisionQueueButton"/);
  assert.match(html, /id="caseClosureSummary"/);
  assert.match(html, /id="matchingDecisionSummary"/);
  assert.match(html, /id="activityCaseClosedNotice"/);
  assert.match(html, /id="activityCaseReadyNotice"/);
  assert.match(html, /id="activityCaseReadyPrimaryButton"/);
  assert.match(html, /id="editCaseAction"/);
  assert.match(html, /id="pauseCaseAction"/);
  assert.match(html, /id="closeCaseAction"/);
  assert.match(html, /Redigera ärendeuppgifter/);
  assert.match(html, /Öppna aktiviteter blir ej aktuella och historiken bevaras/);
  assert.match(html, /id="presentationStepPoints"/);
  assert.match(html, />Nytt ärende</);
  assert.match(html, /id="caseTypeDetailPanel"/);
  assert.match(html, /id="caseTypeActivitiesFact"/);
  assert.match(html, /form="caseTypeAdminForm"/);
  assert.match(html, /id="activityTypesAdministrationView"/);
  assert.match(html, /form="activityTypeAdminForm"/);
  assert.match(html, /id="activityTypeResultsFact"/);
  assert.match(html, /id="activityTypeQuickFact"/);
  assert.match(html, /id="supportLauncher"/);
  assert.match(html, /id="supportOffcanvas"/);
  assert.match(html, /data-bs-backdrop="false"/);
  assert.match(html, /data-bs-scroll="true"/);
  assert.match(html, /id="supportAdministrationView"/);
  assert.match(html, /id="publicSupportRequestTableBody"/);
  assert.match(html, /id="supportAreasAdministrationView"/);
  assert.match(html, /id="mentorSupportAreasEdit"/);
  assert.match(html, /Skriv inte personnummer/);
  assert.match(html, /Handläggningsanvisning/);
  assert.match(html, /<form id="personEditForm"[\s\S]*id="cancelPersonEditButton"[\s\S]*id="savePersonEditButton"[\s\S]*<\/form>/);
  assert.doesNotMatch(html, /form="personEditForm"/);
  assert.doesNotMatch(html, /id="caseTypeAdminModal"/);
  assert.match(html, /id="caseTypeCreationModeFact"/);
  assert.match(html, /Registrerad av/);
  assert.match(html, /krävs för detta resultat/);
  assert.match(html, /id="compensationReadinessChecklist"/);
  assert.match(html, /id="confirmActionSummary"/);
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
  assert.match(scriptText, /function activityTemplateAdminRoute/);
  assert.match(scriptText, /renderRoutineFlowDiagrams/);
  assert.match(scriptText, /routineProcessLink/);
  assert.match(scriptText, /if \(nextStatus === "completed"\) selectedCaseActivityId = null;/);
  assert.match(scriptText, /data-quick-finish-activity/);
  assert.match(scriptText, /registerQuickActivityResult/);
  assert.match(scriptText, /publicSupportAreaChoices/);
  assert.match(scriptText, /quickCompletionResultCodes/);
  assert.match(scriptText, /function renderActivityTypeConfiguration/);
  assert.match(scriptText, /function renderCaseTypeActivitiesFact/);
  assert.match(scriptText, /alternativeLabel: "Komplettera uppgifter"/);
  assert.match(scriptText, /title: "Avsluta aktiviteten\?"/);
  assert.match(scriptText, /resultOptions,/);
  assert.doesNotMatch(scriptText, /resultValue:/);
  assert.match(scriptText, /if \(resolveConfirmation\("confirm"\)\) confirmActionModal\.hide\(\)/);
  assert.match(scriptText, /function renderCaseClosureSummary/);
  assert.match(scriptText, /CASE_FLOW_STEPS/);
  assert.match(scriptText, /function renderCaseFlowBoard/);
  assert.match(scriptText, /data-case-flow-type/);
  assert.match(scriptText, /status=open/);
  assert.match(scriptText, /caseRecord\.status !== "closed"/);
  assert.match(scriptText, /function renderMatchingDecisionSummary/);
  assert.match(scriptText, /function renderActivityCompletionDecision/);
  assert.match(scriptText, /function renderPublicSupportRequestQueue/);
  assert.match(scriptText, /function renderCompensationReadinessChecklist/);
  assert.match(scriptText, /data-create-intake-from-public-support/);
  assert.match(scriptText, /summaryItems:/);
  assert.match(scriptText, /function caseCloseReasonOptions/);
  assert.match(scriptText, /ingen person- eller mentorpost/i);
  assert.match(scriptText, /Inget nytt ärende skapades automatiskt/);

  const domain = await worker.fetch(new Request("https://example.test/case-domain.js"), {}, context);
  assert.equal(domain.status, 200);
  assert.match(await domain.text(), /deriveCaseStatus/);

  const learningDomain = await worker.fetch(new Request("https://example.test/learning-domain.js"), {}, context);
  assert.equal(learningDomain.status, 200);
  assert.match(learningDomain.headers.get("content-type"), /^text\/javascript/);
  assert.match(await learningDomain.text(), /requiredLearningContentIds/);

  const supportDomain = await worker.fetch(new Request("https://example.test/support-domain.js"), {}, context);
  assert.equal(supportDomain.status, 200);
  assert.match(await supportDomain.text(), /localSupportResponse/);

  const supportAreaDomain = await worker.fetch(new Request("https://example.test/support-area-domain.js"), {}, context);
  assert.equal(supportAreaDomain.status, 200);
  assert.match(supportAreaDomain.headers.get("content-type"), /^text\/javascript/);
  assert.match(await supportAreaDomain.text(), /supportAreaOverlap/);

  const supportWithoutKey = await worker.fetch(new Request("https://example.test/api/support", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Hur skapar jag ett ärende?" })
  }), {}, context);
  assert.equal(supportWithoutKey.status, 503);
  assert.deepEqual(await supportWithoutKey.json(), { code: "AI_NOT_CONFIGURED" });

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

test("serves the standalone matching prototype without changing the application shell", async () => {
  const page = await worker.fetch(new Request("https://example.test/prototypes/matchningsunderlag.html"), {}, context);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /^text\/html/);
  const html = await page.text();
  assert.match(html, /Fristående designskiss/);
  assert.match(html, /Förälderns vy/);
  assert.match(html, /Mentorns vy/);
  assert.match(html, /Handläggarens vy/);
  assert.doesNotMatch(html, /id="dashboardView"/);

  const stylesheet = await worker.fetch(new Request("https://example.test/prototypes/matchningsunderlag.css"), {}, context);
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get("content-type"), /^text\/css/);

  const script = await worker.fetch(new Request("https://example.test/prototypes/matchningsunderlag.js"), {}, context);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /^text\/javascript/);
  assert.match(await script.text(), /complexSupportTopics/);
});

test("support endpoint keeps the key server-side and disables OpenAI storage", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (url, options) => {
    upstreamRequest = { url, options };
    return new Response(JSON.stringify({
      output: [{ content: [{ type: "output_text", text: JSON.stringify({
        answer: "Öppna ärenderegistret.",
        category: "how_to",
        needsHuman: false,
        sources: [{ title: "Ärenden", href: "#/cases" }]
      }) }] }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://example.test/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "Hur öppnar jag ett ärende?", context: { role: "Handläggare", view: "dashboard" } })
    }), { OPENAI_API_KEY: "server-secret" }, context);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).category, "how_to");
    assert.equal(upstreamRequest.url, "https://api.openai.com/v1/responses");
    assert.equal(upstreamRequest.options.headers.authorization, "Bearer server-secret");
    const requestBody = JSON.parse(upstreamRequest.options.body);
    assert.equal(requestBody.model, "gpt-5.6-terra");
    assert.equal(requestBody.reasoning.effort, "medium");
    assert.equal(requestBody.store, false);
    assert.doesNotMatch(JSON.stringify(requestBody), /server-secret/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("support endpoint rejects personal identity numbers before an AI call", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/support", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Personnummer 19800101-1234" })
  }), { OPENAI_API_KEY: "server-secret" }, context);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { code: "SENSITIVE_DATA" });
});
