import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoCommunicationProvider,
  dispatchOutboundCommunication,
  meetingReminderJobs,
  normalizeMeetingReminder,
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

test("late scheduled messages retain their planned time and explain the catch-up", async () => {
  const record = await dispatchOutboundCommunication({
    draft: {
      tenantId: "tenant-demo",
      recipientName: "Eva Nilsson",
      recipientAddress: "eva@example.se",
      subject: "Påminnelse",
      body: "Välkommen till mötet.",
      scheduledFor: "2026-08-20T10:00:00.000Z",
      createdBy: "system"
    },
    provider: createDemoCommunicationProvider("email", {
      idFactory: () => "provider-message-late",
      now: () => "2026-08-21T10:00:00.000Z"
    }),
    idFactory: () => "communication-late",
    now: () => "2026-08-21T10:00:00.000Z"
  });

  assert.equal(record.scheduledFor, "2026-08-20T10:00:00.000Z");
  assert.match(record.deliveryEvents[0].detail, /behandlades i efterhand/i);
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

test("meeting reminders become due once and choose email before sms", () => {
  const interaction = {
    id: "meeting-1",
    kind: "meeting",
    status: "scheduled",
    startsAt: "2026-08-22T10:00:00.000Z",
    reminder: { enabled: true, offsetMinutes: 1440 },
    participants: [
      { partyType: "parent", partyId: "parent-1", displayName: "Eva", email: "eva@example.se", phone: "0701111111" },
      { partyType: "mentor", partyId: "mentor-1", displayName: "Bo", phone: "0702222222" }
    ]
  };
  const jobs = meetingReminderJobs({ interactions: [interaction], now: "2026-08-21T10:00:00.000Z" });
  assert.deepEqual(jobs.map((job) => job.channel), ["email", "sms"]);
  assert.equal(jobs[0].scheduledFor, "2026-08-21T10:00:00.000Z");
  assert.match(jobs[0].automationKey, /^meeting-reminder:meeting-1:/);

  const repeated = meetingReminderJobs({
    interactions: [interaction],
    communications: [{ automationKey: jobs[0].automationKey }, { automationKey: jobs[1].automationKey }],
    now: "2026-08-21T10:05:00.000Z"
  });
  assert.equal(repeated.length, 0);
});

test("meeting reminders ignore disabled and completed meetings but catch up missed schedules", () => {
  const base = {
    id: "meeting-2", kind: "meeting", status: "scheduled", startsAt: "2026-08-22T10:00:00.000Z",
    reminder: normalizeMeetingReminder({ enabled: true, offsetMinutes: 999 }),
    participants: [{ displayName: "Eva", email: "eva@example.se" }]
  };
  assert.equal(base.reminder.offsetMinutes, 1440);
  assert.equal(meetingReminderJobs({ interactions: [{ ...base, reminder: { enabled: false, offsetMinutes: 1440 } }], now: "2026-08-21T10:00:00.000Z" }).length, 0);
  assert.equal(meetingReminderJobs({ interactions: [{ ...base, status: "completed" }], now: "2026-08-21T10:00:00.000Z" }).length, 0);
  const missed = meetingReminderJobs({ interactions: [base], now: "2026-08-22T10:01:00.000Z" });
  assert.equal(missed.length, 1);
  assert.equal(missed[0].processedLate, true);
  assert.equal(meetingReminderJobs({
    interactions: [base],
    communications: [{ automationKey: missed[0].automationKey }],
    now: "2026-08-23T10:01:00.000Z"
  }).length, 0);
});

test("missed meeting reminders are processed oldest first", () => {
  const participant = { displayName: "Eva", email: "eva@example.se" };
  const reminders = meetingReminderJobs({
    interactions: [
      { id: "later", kind: "meeting", status: "scheduled", startsAt: "2026-08-22T12:00:00.000Z", reminder: { enabled: true, offsetMinutes: 60 }, participants: [participant] },
      { id: "earlier", kind: "meeting", status: "scheduled", startsAt: "2026-08-21T12:00:00.000Z", reminder: { enabled: true, offsetMinutes: 60 }, participants: [participant] }
    ],
    now: "2026-08-23T10:00:00.000Z"
  });

  assert.deepEqual(reminders.map((job) => job.interaction.id), ["earlier", "later"]);
  assert.ok(reminders.every((job) => job.processedLate));
});
