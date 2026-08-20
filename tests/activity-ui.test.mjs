import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("keeps result, note and completion action in the primary activity flow", () => {
  const resultPosition = html.indexOf('id="activityDetailResultFieldset"');
  const notePosition = html.indexOf('id="activityDetailNoteInput"');
  const savePosition = html.indexOf('id="activityDetailSaveButton"');
  const planningPosition = html.indexOf('id="activityPlanningDetails"');

  assert.ok(resultPosition < notePosition, "result should precede the optional note");
  assert.ok(notePosition < savePosition, "note should precede the completion action");
  assert.ok(savePosition < planningPosition, "planning fields should not interrupt completion");
  assert.match(html, /<summary>Planering och undantag<\/summary>/);
});

test("completion explains and opens the next activity", () => {
  assert.match(app, /version: "83"/);
  assert.match(app, /function nextOpenActivity\(activity\)/);
  assert.match(app, /"Välj resultat ovan"/);
  assert.match(app, /"Avsluta och gå vidare"/);
  assert.match(app, /"Avsluta och återgå till ärendet"/);
  assert.match(app, /selectedCaseActivityId = nextActivity\?\.id \|\| null/);
  assert.match(app, /Nästa aktivitet har öppnats/);
});

test("deviating results remain in context for a decision", () => {
  assert.match(app, /"Registrera resultat"/);
  assert.match(app, /else if \(hasDeviatingResult\) selectedCaseActivityId = activity\.id/);
  assert.match(app, /activityDeviationPanel\.scrollIntoView/);
});

test("mobile completion action remains visible without covering support", () => {
  assert.match(styles, /\.activity-save-bar \{\s*position: sticky;/);
  assert.match(styles, /padding: var\(--app-space-3\) 4\.5rem/);
});

test("shows activities in the first case work tab", () => {
  assert.match(html, /id="case-overview-tab"[^>]*>Arbete <span id="caseActivityCount"/);
  assert.doesNotMatch(html, /id="case-activities-tab"/);
  assert.match(html, /id="case-activities-pane" hidden/);
  assert.match(app, /function prepareCaseWorkView\(\)/);
  assert.match(app, /els\.caseSecondaryDetails\.before\(els\.caseActivitiesPane\)/);
  assert.match(app, /els\.caseActivitiesPane\.hidden = false/);
  assert.doesNotMatch(app, /\["open_activities", "Visa alla kontroller"/);
});

test("keeps the activity list compact and finishes activities in their detail view", () => {
  assert.doesNotMatch(app, /data-quick-finish-activity/);
  assert.doesNotMatch(app, /registerQuickActivityResult/);
  assert.doesNotMatch(app, /<strong>Gör så här:<\/strong>/);
  assert.doesNotMatch(app, /<strong>Registrerat utfall:<\/strong>/);
  assert.doesNotMatch(app, /activity-completion-meta/);
  assert.match(app, /const incompleteWorkInput = workInput\?\.required && workInput\.state !== "complete"/);
  assert.match(app, /class="activity-result-summary">\$\{escapeHtml\(result\)\}/);
});

test("keeps overview, registers and case headers focused on actionable information", () => {
  assert.match(app, /function prepareDashboardView\(\)/);
  assert.match(app, /dashboardCaseFlows\.before\(els\.dashboardPrimaryWork\)/);
  assert.match(app, /<details class="case-flow-more">/);
  assert.match(html, /<th>Ärende<\/th>\s*<th>Nästa aktivitet<\/th>/);
  assert.match(app, /class="dashboard-queue-next"/);
  assert.match(html, /<thead class="table-light"><tr><th>Aktivitet<\/th><th>Läge<\/th><\/tr><\/thead>/);
  assert.doesNotMatch(html, /<th>Aktivitet<\/th><th>Status<\/th><th>Ansvarig<\/th><th>Förfallodatum<\/th><th>Underlag<\/th>/);
  assert.match(app, /class="activity-list-meta"/);
  assert.match(app, /class="case-register-primary"/);
  assert.match(app, /class="case-register-state"/);
  assert.match(app, /setRecordFactVisibility\(els\.selectedCaseSupportCase, Boolean\(linkedSupportCase\)\)/);
  assert.match(app, /setRecordFactVisibility\(els\.casePriorityFact, caseRecord\.priority && caseRecord\.priority !== "normal"\)/);
  assert.match(html, /<details id="caseHeaderDetails" class="case-header-details">\s*<summary>Ärendeinformation<\/summary>/);
  assert.match(html, /<details id="caseTypeGuidance" class="case-type-guidance" hidden>\s*<summary>Om ärendetypen<\/summary>/);
  assert.match(app, /els\.caseHeaderDetails\.open = false/);
  assert.match(app, /els\.caseTypeGuidance\.open = false/);
});

test("blocks completion results until required registration is complete", () => {
  assert.match(app, /function incompleteRequiredActivityWorkInput\(activity, caseRecord\)/);
  assert.match(app, /workInput\?\.required && workInput\.state !== "complete"/);
  assert.match(app, /activityDetailResultFieldset\.disabled = locked \|\| Boolean\(workInputBlocker\)/);
  assert.doesNotMatch(app, /activityDetailResultFieldset\.disabled = locked;/);
  assert.match(app, /if \(resultCode && incompleteRequiredActivityWorkInput\(activity, caseRecord\)\) return/);
  assert.match(app, /Slutför \$\{workInputBlocker\.label\.toLocaleLowerCase\("sv-SE"\)\} ovan innan du kan välja ett avslutande resultat/);
});

test("distinguishes a booked interview from a completed interview", () => {
  assert.match(html, /id="caseMeetingCompletedInput"/);
  assert.match(app, /function caseMeetingStatus\(meeting\)/);
  assert.match(app, /\{ not_started: "Inte bokad", in_progress: "Bokad", complete: "Genomförd" \}/);
  assert.match(app, /caseMeetingStatus\(meeting\) === "completed" && meeting\.occurredAt && meeting\.summary\?\.trim\(\)/);
  assert.match(app, /activity\.status === "not_started" && workInputState && workInputState !== "not_started"\) return "Pågår"/);
  assert.match(app, /Ett genomfört möte kan inte ha en tidpunkt i framtiden/);
});

test("shows case timestamps in the mentor case list and keeps closure audit fields aligned", () => {
  assert.match(html, /<dt>Mentorpost ändrad<\/dt><dd id="selectedUpdatedMeta"/);
  assert.match(app, /const isClosed = normalizeCaseStatus\(caseRecord\.status\) === "closed"/);
  assert.match(app, /`Avslutat \$\{formatDateTime\(caseRecord\.closedAt \|\| caseRecord\.updatedAt\)\}`/);
  assert.match(app, /`Senast ändrad \$\{formatDateTime\(caseRecord\.updatedAt \|\| caseRecord\.createdAt\)\}`/);

  const lifecycleStart = app.indexOf("function changeCaseLifecycleCommand");
  const lifecycleEnd = app.indexOf("function caseCloseReasonOptions", lifecycleStart);
  const lifecycleCommand = app.slice(lifecycleStart, lifecycleEnd);
  assert.match(lifecycleCommand, /closedAt: now, closedBy: CURRENT_USER_ID/);
  assert.match(lifecycleCommand, /updatedAt: now,\s*updatedBy: CURRENT_USER_ID/);
});
