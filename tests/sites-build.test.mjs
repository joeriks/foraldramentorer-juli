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
  assert.match(html, /id="calendarView"/);
  assert.match(html, /id="meetingsView"/);
  assert.match(html, /id="navCalendar"[^>]*href="#\/calendar"/);
  assert.match(html, /id="navMeetings"[^>]*href="#\/meetings"/);
  assert.match(html, /id="caseFlowBoard"/);
  assert.match(html, /id="navIncomingContact"[^>]*sidebar-subaction-link/);
  assert.match(html, /id="navIntake"[^>]*href="#\/cases\/incoming-contact"/);
  assert.match(html, /id="navVersions"/);
  assert.match(html, /id="mobileIncomingContact"/);
  assert.match(html, /id="navParentSupportCases"[^>]*href="#\/cases\/parent-support"/);
  assert.match(html, /id="mobileParentSupportCases"[^>]*href="#\/cases\/parent-support"/);
  assert.match(html, /Kontaktmottagning/);
  assert.match(html, />Översikt<\/a>/);
  assert.match(html, /id="versionsView"/);
  assert.match(html, /id="versionHistoryList"/);
  assert.match(html, /Berörd person/);
  assert.match(html, /id="incomingContactNextStepInput"/);
  assert.match(html, /Nästa steg efter kontakten/);
  assert.match(html, /id="incomingContactFollowUpButton"/);
  assert.match(html, /id="incomingContactCaseTypeInput"/);
  assert.match(html, /id="incomingContactCreateCaseButton"/);
  assert.match(html, /id="incomingContactCloseButton"/);
  assert.match(html, /Fler uppgifter/);
  assert.doesNotMatch(html, /id="incomingContactDoneButton"/);
  assert.doesNotMatch(html, /Möjlig befintlig personpost/);
  assert.match(html, /id="caseTypeFilter"/);
  assert.match(html, /<option value="open">Öppna<\/option>/);
  assert.match(html, /id="decisionQueueButton"/);
  assert.match(html, /id="dashboardQueueOwnerFilter"/);
  assert.match(html, />Alla ärendeansvariga</);
  assert.match(html, /id="dashboardNewParentButton"/);
  assert.match(html, /id="mentorActiveFilter"/);
  assert.match(html, /id="reactivateMentorButton"/);
  assert.match(html, /id="activityDetailGuidanceMore"/);
  assert.match(html, /id="caseClosureSummary"/);
  assert.match(html, /id="matchingDecisionSummary"/);
  assert.match(html, /id="matchingDetails"/);
  assert.match(html, /id="caseTransitionChoices"/);
  assert.match(html, /id="caseSecondaryDetails"/);
  assert.match(html, /id="matchingMentorPicker"/);
  assert.match(html, /id="matchingMentorSearchInput"/);
  assert.match(html, /id="matchingMentorAreaFilter"/);
  assert.match(html, /id="matchingMentorCriteriaFilters"/);
  assert.match(html, /id="matchingMentorResults"/);
  assert.match(html, /id="supportProfileCompleteness"/);
  assert.match(html, /krävs för fullständigt underlag/);
  assert.match(html, /id="activityDetailStatusInput" type="hidden"/);
  assert.match(html, /id="activityDetailResultOptions"/);
  assert.match(html, /id="activityClearResultButton"/);
  assert.match(html, /id="activitySetWaitingButton"/);
  assert.match(html, /id="activitySetInProgressButton"/);
  assert.match(html, /id="activitySetNotApplicableButton"/);
  assert.match(html, /id="assignmentNextStepPanel"/);
  assert.match(html, /id="assignmentFollowupDetails"/);
  assert.match(html, /id="compensationNextStepPanel"/);
  assert.match(html, /id="compensationDetails"/);
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
  assert.doesNotMatch(html, /id="activityTypeQuickFact"/);
  assert.doesNotMatch(html, />Snabbavslut</);
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
  assert.match(await script.clone().text(), /function renderSupportProfileCompleteness/);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /^text\/javascript/);
  assert.equal(script.headers.get("cache-control"), "no-cache");
  const scriptText = await script.text();
  assert.match(scriptText, /CASE_ACTIVITIES_STORE/);
  const interactionDomain = await worker.fetch(new Request("https://example.test/interaction-domain.js"), {}, context);
  assert.equal(interactionDomain.status, 200);
  assert.match(await interactionDomain.text(), /meetingSatisfiesRequirement/);
  const guidedActivityDomain = await worker.fetch(new Request("https://example.test/guided-activity-domain.js"), {}, context);
  assert.equal(guidedActivityDomain.status, 200);
  assert.match(await guidedActivityDomain.text(), /synchronizeFirstMeetingSteps/);
  assert.match(scriptText, /#\/case-types\/\$\{encodeURIComponent\(definition\.id\)\}/);
  assert.match(scriptText, /function activityTemplateAdminRoute/);
  assert.match(scriptText, /renderRoutineFlowDiagrams/);
  assert.match(scriptText, /routineProcessLink/);
  assert.match(scriptText, /else if \(\["completed", "not_applicable"\]\.includes\(nextStatus\)\) selectedCaseActivityId = nextActivity\?\.id \|\| null;/);
  assert.doesNotMatch(scriptText, /data-quick-finish-activity/);
  assert.doesNotMatch(scriptText, /registerQuickActivityResult/);
  assert.match(scriptText, /publicSupportAreaChoices/);
  assert.doesNotMatch(scriptText, /quickCompletionResultCodes/);
  assert.match(scriptText, /function renderActivityTypeConfiguration/);
  assert.match(scriptText, /function renderCaseTypeActivitiesFact/);
  assert.doesNotMatch(scriptText, /Ärendestatus visar kommunens samlade handläggningsläge/);
  assert.match(scriptText, /title: "Kontaktmottagning"/);
  assert.match(scriptText, /incompleteWorkInput/);
  assert.doesNotMatch(scriptText, /resultValue:/);
  assert.match(scriptText, /if \(resolveConfirmation\("confirm"\)\) confirmActionModal\.hide\(\)/);
  assert.match(scriptText, /function renderCaseClosureSummary/);
  assert.match(scriptText, /function renderDashboardQueueOwnerFilter/);
  assert.match(scriptText, /parentSupportNavigationActive/);
  assert.match(scriptText, /mentorActiveFilter === "active"/);
  assert.match(scriptText, /function toggleSelectedCandidateActive/);
  assert.match(scriptText, /function caseDateLabel\(caseRecord, \{ explicitObject = false \} = \{\}\)/);
  assert.match(scriptText, /"Ärendet skapat" : "Skapad"/);
  assert.doesNotMatch(scriptText, /Skapat för \$\{days\} dagar sedan/);
  assert.match(scriptText, /dashboard-queue-case-date/);
  assert.match(scriptText, /version: "107"/);
  assert.match(scriptText, /version: "103"/);
  assert.match(scriptText, /dashboardQueueOwnerFilter === "all"/);
  assert.match(scriptText, /dashboardQueueMode === "unassigned"/);
  assert.match(scriptText, /version: "100"/);
  assert.match(scriptText, /function newCaseButtonLabel/);
  assert.match(scriptText, /function createIncomingContactCase/);
  assert.match(scriptText, /function completeIncomingContactWithCase/);
  assert.match(scriptText, /function prefillCaseFromIncomingContact/);
  assert.match(scriptText, /APP_VERSION_HISTORY/);
  assert.match(scriptText, /version: "99"/);
  assert.match(scriptText, /version: "98"/);
  assert.match(scriptText, /geographic-areas/);
  assert.match(scriptText, /function renderGeographicAreaAdministration/);
  assert.match(scriptText, /version: "97"/);
  assert.match(scriptText, /version: "96"/);
  assert.match(scriptText, /version: "95"/);
  assert.match(scriptText, /version: "93"/);
  assert.match(scriptText, /Informationsmaterial som följer de aktuella arbetsflödena/);
  assert.match(scriptText, /function renderVersions/);
  assert.match(scriptText, /Tre tydliga vägar efter inkommande kontakt/);
  assert.match(scriptText, /Förenklingar dokumenteras per flöde/);
  assert.match(scriptText, /Berört flöde/);
  assert.match(scriptText, /Förenklat/);
  assert.match(scriptText, /Bevarat/);
  assert.match(scriptText, /Inkommande kontakt med fri nästa-steg-text/);
  assert.match(scriptText, /incoming-contact/);
  assert.match(scriptText, /"mentor-assignment", "parent-support", "mentor-certification", "other"/);
  assert.doesNotMatch(scriptText, /CASE_FLOW_STEPS/);
  assert.match(scriptText, /function caseTypeRelationshipGroups/);
  assert.match(scriptText, /function renderCaseFlowBoard/);
  assert.match(scriptText, /data-case-flow-direction/);
  assert.doesNotMatch(scriptText, /case-flow-connector/);
  assert.match(scriptText, /Leder vidare till/);
  assert.match(scriptText, /Ingen nästa ärendetyp/);
  assert.match(scriptText, /function renderSupportCaseChoices/);
  assert.match(scriptText, /function renderMatchingCaseChoices/);
  assert.match(scriptText, /function matchingCaseTitle/);
  assert.match(scriptText, /function renderMatchingMentorPicker/);
  assert.match(scriptText, /function matchingMentorAssessment/);
  assert.match(scriptText, /function activeMatchingMentorCriteria/);
  assert.match(scriptText, /data-select-matching-mentor/);
  assert.match(scriptText, /Saknas eller behöver kontrolleras/);
  assert.match(scriptText, /function renderCertificationCaseChoices/);
  assert.match(scriptText, /function renderNeedsAnalysisChoices/);
  assert.match(scriptText, /function renderAssignmentCaseChoices/);
  assert.match(scriptText, /function renderAssignmentNextSteps/);
  assert.match(scriptText, /function renderCompensationNextSteps/);
  assert.match(scriptText, /function registerSuccessorLink/);
  assert.match(scriptText, /Vägledda val i stödärendet/);
  assert.match(scriptText, /Matchning med tydligt beslutsläge/);
  assert.match(scriptText, /En kontroll i taget vid mentorgodkännande/);
  assert.match(scriptText, /Behovsanalys som leder vidare/);
  assert.match(scriptText, /Handlingsstyrd uppföljning av mentoruppdrag/);
  assert.match(scriptText, /Ett nästa steg i ersättningshanteringen/);
  assert.match(scriptText, /Tydligare riktning i ärendeflöden/);
  assert.match(scriptText, /Matchning börjar med rätt mentorurval/);
  assert.match(scriptText, /Öppen bedömning av varje mentorförslag/);
  assert.match(scriptText, /Justerbara matchningspunkter/);
  assert.match(scriptText, /Resultatet styr aktivitetens status/);
  assert.match(scriptText, /Alla aktivitetsresultat syns direkt/);
  assert.match(scriptText, /function setActivityResultSelection/);
  assert.match(scriptText, /function setActivityDraftStatus/);
  assert.match(scriptText, /if \(nextStatus === "not_started"\) nextStatus = "in_progress";/);
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

  const calendarDomain = await worker.fetch(new Request("https://example.test/calendar-domain.js"), {}, context);
  assert.equal(calendarDomain.status, 200);
  assert.match(calendarDomain.headers.get("content-type"), /^text\/javascript/);
  assert.match(await calendarDomain.text(), /calendarMonthDays/);

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

test("serves every local module imported by the application", async () => {
  const applicationResponse = await worker.fetch(new Request("https://example.test/app.js"), {}, context);
  assert.equal(applicationResponse.status, 200);
  const applicationSource = await applicationResponse.text();
  const modulePaths = [...applicationSource.matchAll(/from\s+["'](\.\/[^"']+)["']/g)]
    .map((match) => new URL(match[1], "https://example.test/app.js").pathname);

  assert.ok(modulePaths.includes("/mentor-application-domain.js"));
  for (const modulePath of new Set(modulePaths)) {
    const response = await worker.fetch(new Request(`https://example.test${modulePath}`), {}, context);
    assert.equal(response.status, 200, `${modulePath} must be included in the published build`);
    assert.match(response.headers.get("content-type"), /^text\/javascript/, `${modulePath} must be served as JavaScript`);
  }
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
