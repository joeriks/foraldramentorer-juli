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
    deliveryEvents: [{ status: "queued", occurredAt: createdAt, actorId: draft.createdBy, detail: "Sändningsbegäran skapades." }],
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
