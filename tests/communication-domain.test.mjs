import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoCommunicationProvider,
  dispatchOutboundCommunication,
  recordInboundCommunication
} from "../communication-domain.js";

test("demo providers process outbound commands without claiming external delivery", async () => {
  const provider = createDemoCommunicationProvider("email", {
    idFactory: () => "provider-message-1",
    now: () => "2026-08-21T10:01:00.000Z"
  });
  const record = await dispatchOutboundCommunication({
    draft: {
      tenantId: "tenant-demo",
      recipientName: "Eva Nilsson",
      recipientAddress: "eva@example.se",
      subject: "Kallelse",
      body: "Välkommen till mötet.",
      links: [{ entityType: "interaction", entityId: "meeting-1", label: "Första mötet" }],
      createdBy: "handler-sara"
    },
    provider,
    idFactory: () => "communication-1",
    now: () => "2026-08-21T10:00:00.000Z"
  });

  assert.equal(record.id, "communication-1");
  assert.equal(record.providerId, "email-demo");
  assert.equal(record.providerMode, "demo");
  assert.equal(record.externalMessageId, "email-demo-provider-message-1");
  assert.equal(record.status, "registered_demo");
  assert.deepEqual(record.deliveryEvents.map((event) => event.status), ["queued", "registered_demo"]);
  assert.doesNotMatch(record.deliveryEvents.at(-1).detail, /levererad/i);
});

test("the shared model accepts incoming provider messages", () => {
  const record = recordInboundCommunication({
    message: {
      tenantId: "tenant-demo",
      channel: "sms",
      providerId: "future-sms-provider",
      externalMessageId: "sms-42",
      senderName: "Eva Nilsson",
      senderAddress: "+46701234567",
      recipients: [{ name: "Kommunen", address: "72000" }],
      body: "Tiden passar.",
      links: [{ entityType: "case", entityId: "case-1", label: "FM-26-00001" }],
      receivedBy: "system",
      receivedAt: "2026-08-21T11:00:00.000Z"
    },
    idFactory: () => "communication-2"
  });

  assert.equal(record.direction, "incoming");
  assert.equal(record.status, "received");
  assert.equal(record.sender.address, "+46701234567");
  assert.equal(record.links[0].entityType, "case");
});

test("channel providers reject commands for another channel", async () => {
  const smsProvider = createDemoCommunicationProvider("sms");
  await assert.rejects(() => smsProvider.send({ channel: "email" }), /kanal stämmer inte/);
});
