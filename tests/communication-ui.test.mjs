import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles, workspace] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../case-workspace-domain.js", import.meta.url), "utf8")
]);

test("exposes one global register for all system communication", () => {
  assert.match(html, /id="navCommunications"[^>]*href="#\/communications"/);
  assert.match(html, /id="communicationsView"/);
  assert.match(html, /id="communicationTableBody"/);
  assert.match(html, /id="communicationChannelFilter"/);
  assert.match(html, /id="communicationDirectionFilter"/);
  assert.match(app, /COMMUNICATIONS_STORE = "communications"/);
  assert.match(app, /communications: renderCommunications/);
  assert.match(app, /els\.communicationsView\.hidden = currentView !== "communications"/);
  assert.match(styles, /\.communication-register-table/);
});

test("keeps the register concise and opens a dedicated communication detail view", () => {
  assert.match(html, /id="communicationRegisterPanel"/);
  assert.match(html, /id="communicationDetailPanel"/);
  assert.match(html, /<th>När<\/th><th>Meddelande<\/th><th>Kontakt<\/th><th>Koppling<\/th><th>Status<\/th>/);
  assert.match(app, /function renderCommunicationDetail\(record\)/);
  assert.match(app, /#\/communications\/\$\{escapeHtml\(record\.id\)\}/);
  assert.match(app, /communication-delivery-timeline/);
  assert.match(styles, /\.communication-detail-grid/);
  assert.match(styles, /\.communication-detail-message/);
});

test("routes outbound email and sms through swappable demo providers", () => {
  assert.match(html, /name="communicationChannel" value="email"/);
  assert.match(html, /name="communicationChannel" value="sms"/);
  assert.match(html, /inget e-postmeddelande eller SMS skickas externt/i);
  assert.match(app, /dispatchOutboundCommunication/);
  assert.match(app, /provider: createDemoCommunicationProvider\(channel\)/);
  assert.match(app, /externalMessageId/);
  assert.match(app, /communication_registered/);
});

test("delivers and replies to internal messages through the shared communication register", () => {
  assert.match(html, /name="communicationChannel" value="internal"/);
  assert.match(html, /<option value="internal">Internt meddelande<\/option>/);
  assert.match(app, /createInternalCommunicationProvider/);
  assert.match(app, /channel: "internal"/);
  assert.match(app, /data-reply-internal-message/);
  assert.match(app, /function openInternalReplyComposer/);
  assert.match(app, /replyToCommunicationId/);
  assert.match(app, /function communicationDisplayDirection\(record\)/);
  assert.match(app, /record\.recipients\.some\(\(recipient\) => recipient\.partyId === actorId\)\) return "incoming"/);
  assert.match(app, /communicationDisplayDirection\(record\) !== communicationDirectionFilter/);
  assert.match(app, /Internt meddelande skickades till/);
  assert.match(styles, /\.mentor-message-history-actions/);
});

test("links meeting messages to the global communication history", () => {
  assert.match(html, /id="interactionEmailButton"/);
  assert.match(html, /id="interactionSmsButton"/);
  assert.match(html, /id="interactionSystemCommunicationList"/);
  assert.match(app, /entityType: "interaction", entityId: interaction\.id/);
  assert.match(app, /function communicationsForInteraction\(interactionId\)/);
  assert.match(workspace, /communication/);
});

test("offers a visible send action from saved meetings", () => {
  assert.match(html, /id="interactionSendMessageButton"[^>]*>Skicka meddelande<\/button>/);
  assert.match(app, /interactionSendMessageButton\.hidden = !existingInteraction \|\| existingInteraction\.kind !== "meeting"/);
  assert.match(app, /interactionSendMessageButton\.addEventListener\("click"/);
  assert.match(app, /interaction\.participants\.some\(\(participant\) => participant\.email\)/);
  assert.match(app, /communicationsForInteraction\(interaction\.id\)/);
  assert.match(app, /previousRecipient/);
  assert.match(app, /openCommunicationComposer\(\{ channel, interaction \}\)/);
});

test("schedules configurable automatic reminders through the communication system", () => {
  assert.match(html, /id="interactionReminderEnabledInput"/);
  assert.match(html, /id="interactionReminderOffsetInput"/);
  assert.match(html, /En dag före/);
  assert.match(app, /function processDueMeetingReminders\(now = new Date\(\)\)/);
  assert.match(app, /saveAutomatedCommunicationIfMissing/);
  assert.match(app, /automationType: job\.automationType/);
  assert.match(app, /window\.setInterval\(runMeetingReminderScheduler, 60 \* 1000\)/);
  assert.match(app, /communicationWasProcessedLate/);
  assert.match(app, /Behandlad i efterhand/);
  assert.match(html, /Missade utskick behandlas när portalen öppnas igen/);
  assert.match(styles, /\.meeting-reminder-settings/);
});

test("places Communication last in desktop and mobile navigation", () => {
  const desktopNavigation = html.slice(html.indexOf('<nav class="sidebar-nav'), html.indexOf("</nav>", html.indexOf('<nav class="sidebar-nav')));
  assert.ok(desktopNavigation.lastIndexOf("navCommunications") > desktopNavigation.lastIndexOf("sidebar-menu-group"));
  const mobileNavigation = html.slice(html.indexOf('<ul class="dropdown-menu">'), html.indexOf("</ul>", html.indexOf('<ul class="dropdown-menu">')));
  assert.ok(mobileNavigation.lastIndexOf("#/communications") > mobileNavigation.lastIndexOf("#/versions"));
});

test("lets mentors message the responsible handler through the shared communication system", () => {
  assert.match(html, /id="navMentorMessages"[^>]*href="#\/mentor-messages"/);
  assert.match(html, /class="mentor-mobile-nav"[^>]*><a class="dropdown-item" href="#\/mentor-messages"/);
  assert.match(app, /function renderMentorMessages\(\)/);
  assert.match(app, /function openMentorMessageComposer\(caseId\)/);
  assert.match(app, /const defaultContact = seedHandlers\.find/);
  assert.match(app, /email: owner\.email \|\| defaultContact\.email \|\| ""/);
  assert.match(app, /recipient: \{[\s\S]*partyType: "handler"/);
  assert.match(app, /openCommunicationComposer\(\{[\s\S]*channel: "internal"/);
  assert.match(app, /const availableCases = isMentorSession\(\) \? mentorAssignments\(\) : cases/);
  assert.match(app, /: mentorActor\s*\? \{ name: mentorActor\.name/);
  assert.match(app, /createdBy: currentActorId\(\)/);
  assert.match(styles, /\.mentor-message-actions/);
  assert.match(styles, /\.mentor-message-history/);
});
