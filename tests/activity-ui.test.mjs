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
