import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calendarDateKey, calendarMonthDays } from "../calendar-domain.js";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("builds a stable six-week calendar starting on Monday", () => {
  const days = calendarMonthDays(new Date(2026, 7, 1));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(calendarDateKey(days[0]), "2026-07-27");
  assert.equal(calendarDateKey(days.at(-1)), "2026-09-06");
  assert.equal(calendarDateKey("2026-08-20"), "2026-08-20");
});

test("exposes calendar navigation, filters and the responsive agenda", () => {
  assert.match(html, /id="navCalendar"[^>]*href="#\/calendar"/);
  assert.match(html, /id="calendarView"/);
  assert.match(html, /data-calendar-type-filter="meeting"/);
  assert.match(html, /data-calendar-type-filter="contact"/);
  assert.match(html, /data-calendar-type-filter="activity"/);
  assert.match(html, /data-calendar-type-filter="case"/);
  assert.match(html, /id="calendarOwnerFilter"/);
  assert.match(app, /calendar: renderCalendar/);
  assert.match(app, /function allInteractions\(\)/);
  assert.match(app, /caseActivities\.filter/);
  assert.match(app, /cases\.filter/);
  assert.match(styles, /\.calendar-grid \{/);
  assert.match(styles, /\.calendar-agenda \{/);
  assert.match(styles, /@media \(max-width: 767\.98px\)/);
});

test("calendar entries open the existing source records", () => {
  assert.match(app, /#\/case\/\$\{caseRecord\.id\}\/meetings/);
  assert.match(app, /#\/case\/\$\{caseRecord\.id\}\/activities\/\$\{activity\.id\}/);
  assert.match(app, /#\/case\/\$\{caseRecord\.id\}/);
  assert.match(app, /version: "95"/);
});

test("offers a shared flow for planned meetings and completed contacts", () => {
  assert.match(html, /id="interactionOffcanvas"/);
  assert.match(html, /id="calendarBookMeetingButton"/);
  assert.match(html, /id="calendarLogContactButton"/);
  assert.match(html, /id="interactionOrganizerInput"/);
  assert.match(html, /id="interactionResponseFields"/);
  assert.match(html, /name="interactionOutcomeStatus" value="cancelled"/);
  assert.match(html, /name="interactionOutcomeStatus" value="no_show"/);
  assert.match(html, /id="interactionAttendanceFields"/);
  assert.match(html, /id="interactionInvitationDetails"/);
  assert.match(html, /id="interactionCopyInvitationButton"/);
  assert.match(html, /id="interactionCommunicationDetails"/);
  assert.match(html, /id="interactionCommunicationList"/);
  assert.match(html, /id="interactionAddCommunicationButton"/);
  assert.match(html, /Förfrågan om dag och tid/);
  assert.match(html, /Påminnelse skickad/);
  assert.match(html, /id="interactionExternalNameInput"/);
  assert.match(html, /id="interactionExternalRoleInput"/);
  assert.match(html, /id="interactionExternalPhoneInput"/);
  assert.match(html, /id="interactionExternalEmailInput"/);
  assert.match(html, /id="interactionSummaryRequired"/);
  assert.match(html, /class="interaction-form-actions"/);
  assert.match(html, /id="parentInteractionTimeline"/);
  assert.match(html, /id="mentorInteractionTimeline"/);
  assert.match(app, /suggestedMeetingTitle/);
  assert.match(app, /function renderInteractionTimeline/);
  assert.match(app, /function rescheduleInteraction/);
  assert.match(app, /function clearInteractionValidity/);
  assert.match(app, /interaction-form-scroll"\)\.scrollTop = 0/);
  assert.match(app, /interactionStatusFromForm/);
  assert.match(app, /validateInteractionForSave/);
  assert.match(app, /expectedVersion: null/);
  assert.match(app, /Markera som inställt/);
  assert.match(app, /Kallelsetext kopierad/);
  assert.match(app, /organizerId: els\.interactionOrganizerInput\.value/);
  assert.match(app, /if \(resolvedIntent === "scheduled"\) startsAt\.setMinutes/);
  assert.match(app, /Kallelsen är förberedd men inte skickad/);
  assert.match(app, /function renderInteractionCommunicationHistory/);
  assert.match(app, /communicationHistory: communicationHistoryFromForm\(\)/);
  assert.match(app, /data-remove-communication/);
  assert.match(app, /function renderExternalParticipants/);
  assert.match(app, /const roleLabel = els\.interactionExternalRoleInput\.value\.trim\(\)/);
  assert.match(styles, /\.interaction-communication-item/);
  assert.match(styles, /\.interaction-external-participant/);
  assert.doesNotMatch(app, /data-interaction-attendance="\$\{escapeHtml\(participant\.id\)\}"[^>]*checked/);
  assert.match(styles, /\.interaction-form-actions/);
});
