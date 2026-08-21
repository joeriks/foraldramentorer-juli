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

test("routes outbound email and sms through swappable demo providers", () => {
  assert.match(html, /name="communicationChannel" value="email"/);
  assert.match(html, /name="communicationChannel" value="sms"/);
  assert.match(html, /inget e-postmeddelande eller SMS skickas externt/i);
  assert.match(app, /dispatchOutboundCommunication/);
  assert.match(app, /provider: createDemoCommunicationProvider\(channel\)/);
  assert.match(app, /externalMessageId/);
  assert.match(app, /communication_registered/);
});

test("links meeting messages to the global communication history", () => {
  assert.match(html, /id="interactionEmailButton"/);
  assert.match(html, /id="interactionSmsButton"/);
  assert.match(html, /id="interactionSystemCommunicationList"/);
  assert.match(app, /entityType: "interaction", entityId: interaction\.id/);
  assert.match(app, /function communicationsForInteraction\(interactionId\)/);
  assert.match(workspace, /communication/);
});
