export const COMMUNICATION_CHANNEL_LABELS = {
  email: "E-post",
  sms: "SMS",
  letter: "Brev",
  chat: "Chatt",
  other: "Annan kanal"
};

export const COMMUNICATION_DIRECTION_LABELS = {
  outgoing: "Utgående",
  incoming: "Inkommande"
};

export const COMMUNICATION_STATUS_LABELS = {
  queued: "Köad",
  accepted: "Mottagen av leverantör",
  delivered: "Levererad",
  failed: "Misslyckad",
  received: "Mottagen",
  registered_demo: "Registrerad i demo"
};

export const MEETING_REMINDER_OFFSETS = [60, 120, 1440, 2880];

export function normalizeMeetingReminder(reminder = {}) {
  const offsetMinutes = Number(reminder.offsetMinutes);
  return {
    enabled: Boolean(reminder.enabled),
    offsetMinutes: MEETING_REMINDER_OFFSETS.includes(offsetMinutes) ? offsetMinutes : 1440
  };
}

export function meetingReminderJobs({ interactions = [], communications = [], now = Date.now() } = {}) {
  const nowTime = new Date(now).getTime();
  const existingKeys = new Set(communications.map((record) => record.automationKey).filter(Boolean));
  const jobs = [];
  for (const interaction of interactions) {
    const reminder = normalizeMeetingReminder(interaction.reminder);
    const startsAt = new Date(interaction.startsAt || 0).getTime();
    const triggerAt = startsAt - reminder.offsetMinutes * 60 * 1000;
    if (interaction.kind !== "meeting" || interaction.status !== "scheduled" || !reminder.enabled) continue;
    if (!Number.isFinite(startsAt) || nowTime < triggerAt) continue;
    const seenRecipients = new Set();
    for (const participant of interaction.participants || []) {
      const channel = participant.email ? "email" : participant.phone ? "sms" : null;
      const address = channel === "email" ? participant.email : participant.phone;
      if (!channel || !address) continue;
      const recipientKey = `${channel}:${String(address).trim().toLocaleLowerCase("sv-SE")}`;
      if (seenRecipients.has(recipientKey)) continue;
      seenRecipients.add(recipientKey);
      const automationKey = ["meeting-reminder", interaction.id, interaction.startsAt, reminder.offsetMinutes, recipientKey].join(":");
      if (existingKeys.has(automationKey)) continue;
      jobs.push({
        automationKey,
        automationType: "meeting_reminder",
        scheduledFor: new Date(triggerAt).toISOString(),
        processedLate: nowTime > triggerAt,
        channel,
        interaction,
        recipient: {
          name: participant.displayName || "Mötesdeltagare",
          address: String(address).trim(),
          partyType: participant.partyType || null,
          partyId: participant.partyId || null
        }
      });
    }
  }
  return jobs.sort((left, right) => new Date(left.scheduledFor) - new Date(right.scheduledFor));
}

const requiredText = (value, message) => {
  const text = String(value || "").trim();
  if (!text) throw new Error(message);
  return text;
};

export function normalizeCommunicationRecord(record = {}) {
  return {
    ...record,
    tenantId: record.tenantId || null,
    direction: record.direction === "incoming" ? "incoming" : "outgoing",
    channel: record.channel || "other",
    providerId: record.providerId || "manual",
    providerMode: record.providerMode || "live",
    externalMessageId: record.externalMessageId || null,
    automationKey: record.automationKey || null,
    automationType: record.automationType || null,
    scheduledFor: record.scheduledFor || null,
    status: record.status || (record.direction === "incoming" ? "received" : "queued"),
    sender: record.sender ? {
      name: String(record.sender.name || "").trim(),
      address: String(record.sender.address || "").trim()
    } : null,
    recipients: Array.isArray(record.recipients) ? record.recipients.map((recipient) => ({
      name: String(recipient.name || "").trim(),
      address: String(recipient.address || "").trim(),
      partyType: recipient.partyType || null,
      partyId: recipient.partyId || null
    })).filter((recipient) => recipient.address) : [],
    subject: String(record.subject || "").trim(),
    body: String(record.body || "").trim(),
    links: Array.isArray(record.links) ? record.links.map((link) => ({
      entityType: String(link.entityType || "").trim(),
      entityId: String(link.entityId || "").trim(),
      label: String(link.label || "").trim()
    })).filter((link) => link.entityType && link.entityId) : [],
    deliveryEvents: Array.isArray(record.deliveryEvents) ? record.deliveryEvents.map((event) => ({
      status: String(event.status || "").trim(),
      occurredAt: event.occurredAt,
      actorId: event.actorId || null,
      detail: String(event.detail || "").trim()
    })).filter((event) => event.status && event.occurredAt) : []
  };
}

export function createDemoCommunicationProvider(channel, { idFactory = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  if (!["email", "sms"].includes(channel)) throw new Error("Demoleverantören stöder bara e-post och SMS.");
  return {
    id: `${channel}-demo`,
    channel,
    mode: "demo",
    capabilities: { outbound: true, inbound: true, deliveryReceipts: false },
    async send(message) {
      if (message.channel !== channel) throw new Error("Meddelandets kanal stämmer inte med leverantören.");
      return {
        externalMessageId: `${channel}-demo-${idFactory()}`,
        status: "registered_demo",
        occurredAt: now(),
        detail: "Registrerad av demoleverantören. Ingen extern leverans har gjorts."
      };
    }
  };
}

export async function dispatchOutboundCommunication({
  draft,
  provider,
  idFactory = () => crypto.randomUUID(),
  now = () => new Date().toISOString()
}) {
  if (!provider?.capabilities?.outbound || typeof provider.send !== "function") throw new Error("Leverantören kan inte hantera utgående kommunikation.");
  const createdAt = now();
  const scheduledTime = draft.scheduledFor ? new Date(draft.scheduledFor).getTime() : NaN;
  const createdTime = new Date(createdAt).getTime();
  const processedLate = Number.isFinite(scheduledTime) && Number.isFinite(createdTime) && createdTime > scheduledTime;
  const recipientName = String(draft.recipientName || "").trim();
  const recipientAddress = requiredText(draft.recipientAddress, "Ange mottagarens e-postadress eller telefonnummer.");
  const body = requiredText(draft.body, "Skriv ett meddelande.");
  const queued = normalizeCommunicationRecord({
    id: idFactory(),
    tenantId: draft.tenantId,
    direction: "outgoing",
    channel: provider.channel,
    providerId: provider.id,
    providerMode: provider.mode || "live",
    automationKey: draft.automationKey || null,
    automationType: draft.automationType || null,
    scheduledFor: draft.scheduledFor || null,
    status: "queued",
    sender: draft.sender || null,
    recipients: [{
      name: recipientName,
      address: recipientAddress,
      partyType: draft.recipientPartyType || null,
      partyId: draft.recipientPartyId || null
    }],
    subject: provider.channel === "email" ? requiredText(draft.subject, "Ange en ämnesrad för e-postmeddelandet.") : "",
    body,
    links: draft.links || [],
    deliveryEvents: [{
      status: "queued",
      occurredAt: createdAt,
      actorId: draft.createdBy,
      detail: processedLate
        ? "Det schemalagda utskicket behandlades i efterhand."
        : "Sändningsbegäran skapades."
    }],
    createdAt,
    createdBy: draft.createdBy,
    updatedAt: createdAt,
    updatedBy: draft.createdBy
  });
  const providerResult = await provider.send(queued);
  const updatedAt = providerResult.occurredAt || now();
  return normalizeCommunicationRecord({
    ...queued,
    externalMessageId: providerResult.externalMessageId,
    status: providerResult.status,
    updatedAt,
    deliveryEvents: [...queued.deliveryEvents, {
      status: providerResult.status,
      occurredAt: updatedAt,
      actorId: draft.createdBy,
      detail: providerResult.detail || ""
    }]
  });
}

export function recordInboundCommunication({
  message,
  idFactory = () => crypto.randomUUID(),
  now = () => new Date().toISOString()
}) {
  const receivedAt = message.receivedAt || now();
  const senderAddress = requiredText(message.senderAddress, "Inkommande kommunikation måste ha en avsändaradress.");
  return normalizeCommunicationRecord({
    id: idFactory(),
    tenantId: message.tenantId,
    direction: "incoming",
    channel: message.channel,
    providerId: message.providerId,
    providerMode: message.providerMode || "live",
    externalMessageId: message.externalMessageId,
    status: "received",
    sender: { name: message.senderName || "", address: senderAddress },
    recipients: message.recipients || [],
    subject: message.subject || "",
    body: requiredText(message.body, "Inkommande kommunikation måste ha ett innehåll."),
    links: message.links || [],
    deliveryEvents: [{ status: "received", occurredAt: receivedAt, actorId: message.receivedBy || null, detail: "Mottagen från kanalens leverantör." }],
    createdAt: receivedAt,
    createdBy: message.receivedBy || "system",
    updatedAt: receivedAt,
    updatedBy: message.receivedBy || "system"
  });
}
