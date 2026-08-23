import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, html, styles, domain] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../mentor-self-service-domain.js", import.meta.url), "utf8")
]);

test("lets a mentor edit self-service fields but keeps protected fields read-only", () => {
  assert.match(app, /id="mentorSelfServiceProfileForm"/);
  assert.match(app, /Redigera mina uppgifter/);
  assert.match(app, /name="geographicAreaId"/);
  assert.match(app, /name="languageId"/);
  assert.match(app, /name="availabilitySlotId"/);
  assert.match(app, /data-self-support-area/);
  const formRenderer = app.match(/function renderMentorProfileForm[\s\S]*?\n}\n/)?.[0] || "";
  assert.doesNotMatch(formRenderer, /personalNumber|identityMethod|registryChecked/);
  assert.match(formRenderer, /Uppgifter som kommunen ansvarar för/);
});

test("shows the assignment meeting series and limits mentor actions by the assignment plan", () => {
  assert.match(html, /id="assignmentFirstMeetingInput"/);
  assert.match(html, /id="assignmentPlannedMeetingCountInput"/);
  assert.match(html, /id="assignmentMentorPlanningAllowedInput"/);
  assert.match(app, /plannedMeetingStarts/);
  assert.match(app, /mentorMeetingPlanningAllowed/);
  assert.match(app, /mentor-meeting-schedule/);
  assert.match(app, /data-mentor-edit-meeting/);
  assert.match(app, /data-mentor-cancel-meeting/);
  assert.match(app, /Mötet har ställts in och finns kvar i historiken/);
  assert.match(app, /function mentorMeetingHistoryMarkup/);
  assert.match(app, /function mentorMeetingReportQueueMarkup/);
  assert.match(app, /Möten att återrapportera/);
  assert.match(app, /mentorPastMeetings\(caseRecord\)\.filter\(\(meeting\) => !mentorReportForMeeting/);
  assert.match(app, /Tidigare möten/);
  assert.match(app, /Kommunikation och ändringar/);
  assert.match(app, /Ingen anteckning registrerad/);
  assert.match(styles, /\.mentor-meeting-schedule/);
  assert.match(styles, /\.mentor-meeting-history/);
});

test("persists an immutable audit event and a new matching profile version atomically", () => {
  assert.match(app, /MENTOR_PROFILE_EVENTS_STORE = "mentorProfileEvents"/);
  assert.match(app, /DB_VERSION = 14/);
  assert.match(app, /createMentorProfileEvent/);
  assert.match(domain, /mentor_profile_self_updated/);
  assert.match(app, /\[MENTOR_PROFILE_EVENTS_STORE\]: \[eventRecord\]/);
  assert.match(app, /profileWrites\(built, MENTOR_MATCHING_PROFILES_STORE/);
  assert.match(app, /Mentorn uppdaterade sin profil/);
  assert.match(app, /Varje sparad ändring behåller tidpunkt, användare och tidigare värde/);
});

test("keeps the profile editor within the mobile document width", () => {
  assert.match(styles, /\.mentor-self-service-grid/);
  assert.match(styles, /\.mentor-self-service-support-fields/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.mentor-self-service-grid,[\s\S]*\.mentor-self-service-choice-grid,[\s\S]*\.mentor-self-service-support-fields,[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /\.mentor-self-service-actions[\s\S]*flex-direction: column-reverse/);
});

test("gives the mentor portal a direct and compact mobile flow", () => {
  assert.match(app, /classList\.toggle\("is-mentor-portal", isMentorSession\(\)\)/);
  const homeRenderer = app.match(/function renderMentorHome\(\)[\s\S]*?\n}\n\nfunction renderMentorMessages/)?.[0] || "";
  const nextRenderer = app.match(/function mentorAssignmentNextMarkup\(caseRecord\)[\s\S]*?\n}\n/)?.[0] || "";
  assert.match(homeRenderer, /Ditt uppdrag/);
  assert.match(homeRenderer, /Öppna uppdraget/);
  assert.match(homeRenderer, /Skriv till handläggaren/);
  assert.match(homeRenderer, /mentorAssignmentNextMarkup\(caseRecord\)/);
  assert.match(homeRenderer, /const primaryAction = reportDueMeeting[\s\S]*Återrapportera mötet[\s\S]*Öppna uppdraget/);
  assert.doesNotMatch(nextRenderer, /data-mentor-report-meeting|data-mentor-edit-meeting|class="btn/);
  assert.match(app, /Nästa möte med föräldern/);
  assert.match(app, /interactionTimingState\(item\) === "past_due"/);
  assert.match(app, /Behöver följas upp/);
  assert.match(app, /saknar registrerat utfall/);
  assert.match(app, /Föräldraavstämning försenad/);
  assert.match(app, /nextAssignmentFollowUp\(plan, assignmentRecords\(caseRecord\.id\)\.checkIns\)/);
  assert.match(app, /mentorReportSubmittedMarkup\(report\)/);
  assert.match(app, /data-open-mentor-report/);
  assert.match(app, /Kompletteringen tidsstämplas\. Den ursprungliga rapporten ändras inte\./);
  assert.match(app, /function mentorParentContactMarkup/);
  assert.match(app, /Kontakt med föräldern/);
  assert.match(app, /href="tel:/);
  assert.match(app, /href="mailto:/);
  assert.match(app, /Kontaktuppgifter saknas/);
  assert.match(app, /function openMentorMeetingReport/);
  assert.match(app, /data-mentor-report-meeting/);
  assert.match(app, /Möte att återrapportera/);
  assert.match(app, /mentorMeetingReportQueueMarkup\(caseRecord\)/);
  assert.match(app, /mentorReportForMeeting/);
  assert.match(app, /meetingResult\.meetingId/);
  assert.doesNotMatch(app.match(/function renderMentorAssignment[\s\S]*?\n}\n/)?.[0] || "", /mentorPortalReportForm|Återrapportera kontakt/);
  assert.match(html, /id="mentorMeetingReportModal"/);
  assert.match(html, /id="mentorMeetingReportForm"/);
  assert.match(html, /Faktisk tid i minuter/);
  assert.match(html, /id="mentorReportDetailModal"/);
  assert.match(app, /Det här gör du härnäst/);
  assert.match(app, /Inget möte inbokat/);
  assert.doesNotMatch(homeRenderer, /mentor-summary-grid|Fortsätt uppdraget/);
  assert.match(app, /mentor-assignment-mobile-list/);
  assert.match(app, /mentor-assignments-table/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-home-assignment-item[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-home-assignment-actions[\s\S]*flex-direction: column/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-assignments-table[\s\S]*display: none/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-assignment-mobile-list[\s\S]*display: block/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-parent-contact[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /\.mentor-meeting-report-queue/);
  assert.match(styles, /body\.is-mentor-portal \.mentor-meeting-report-queue li[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /body\.is-mentor-portal \.system-status/);
});
