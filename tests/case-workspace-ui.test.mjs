import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("samlar skapande i en Lägg till-meny med fri anteckning sist", () => {
  const menu = html.slice(html.indexOf('id="caseAddMenu"'), html.indexOf('id="caseHeaderDetails"'));
  for (const label of ["Aktivitet", "Kontakt", "Möte", "Handling", "Anteckning om ärendet"]) assert.match(menu, new RegExp(`>${label}<`));
  assert.ok(menu.indexOf("Handling") < menu.indexOf("Anteckning om ärendet"));
  assert.match(app, /openInteractionForm\("completed", selectedCaseRecordId\)/);
  assert.match(app, /openInteractionForm\("scheduled", selectedCaseRecordId\)/);
});

test("visar arbetsytans delar i avsedd ordning", () => {
  assert.ok(html.indexOf('id="caseTransitionPanel"') < html.indexOf('id="caseDescriptionWorkspace"'));
  assert.match(app, /els\.caseRecentHistorySection\.before\(els\.caseActivitiesPane\)/);
  assert.ok(html.indexOf('id="caseRecentHistorySection"') < html.indexOf('id="caseSecondaryDetails"'));
  assert.match(html, /id="case-events-tab"[^>]*>Historik/);
});

test("fria aktiviteter kräver bara rubrik och gömmer planering under fler alternativ", () => {
  const form = html.slice(html.indexOf('id="caseActivityForm"'), html.indexOf('id="caseActivityTableBody"'));
  assert.match(form, /id="activityTitleInput"[^>]*required/);
  assert.doesNotMatch(form, /id="activityInstructionInput"[^>]*required/);
  assert.match(form, /<summary>Fler alternativ<\/summary>/);
  assert.match(app, /createAdHocActivity\(/);
});

test("beskrivning, anteckning och historik har spårbara gränssnitt", () => {
  assert.match(html, /id="caseDescriptionHistory"/);
  assert.match(html, /id="caseNoteTargetInput"/);
  assert.match(html, /id="caseHistoryFilters"/);
  assert.match(app, /CASE_DESCRIPTION_VERSIONS_STORE/);
  assert.match(app, /CASE_NOTES_STORE/);
  assert.match(app, /latestRelevantCaseHistory\(items, 3\)/);
  assert.match(styles, /\.case-history-filters[\s\S]*flex-wrap: wrap/);
});
