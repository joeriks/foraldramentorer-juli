export const CASE_HISTORY_FILTERS = Object.freeze([
  { id: "all", label: "Allt" },
  { id: "notes", label: "Anteckningar" },
  { id: "activities", label: "Aktiviteter" },
  { id: "contacts", label: "Kontakter" },
  { id: "documents", label: "Handlingar" },
  { id: "system", label: "Systemhändelser" }
]);

function requiredText(value, message) {
  const text = String(value || "").trim();
  if (!text) throw new Error(message);
  return text;
}

export function createCaseDescriptionVersion({
  id,
  tenantId,
  caseId,
  text,
  version,
  createdAt,
  createdBy
}) {
  return {
    id,
    tenantId,
    caseId,
    text: String(text || "").trim(),
    version: Math.max(1, Number(version || 1)),
    createdAt,
    createdBy
  };
}

export function descriptionVersionsForCase(versions, caseId) {
  return versions
    .filter((item) => item.caseId === caseId)
    .sort((left, right) => Number(right.version || 0) - Number(left.version || 0));
}

export function createCaseNoteVersion({
  id,
  tenantId,
  caseId,
  noteId,
  targetType = "case",
  targetId = null,
  text,
  version = 1,
  supersedesVersionId = null,
  createdAt,
  createdBy
}) {
  if (!new Set(["case", "activity", "interaction"]).has(targetType)) {
    throw new Error("Anteckningen har en ogiltig koppling.");
  }
  if (targetType !== "case" && !targetId) {
    throw new Error("En objektkopplad anteckning måste ha ett objekt-id.");
  }
  return {
    id,
    tenantId,
    caseId,
    noteId: noteId || id,
    targetType,
    targetId: targetType === "case" ? null : targetId,
    text: requiredText(text, "Anteckningen får inte vara tom."),
    version: Math.max(1, Number(version || 1)),
    supersedesVersionId,
    createdAt,
    createdBy
  };
}

export function latestCaseNoteVersions(notes, caseId) {
  const latestByNoteId = new Map();
  for (const note of notes.filter((item) => item.caseId === caseId)) {
    const key = note.noteId || note.id;
    const previous = latestByNoteId.get(key);
    if (!previous || Number(note.version || 1) > Number(previous.version || 1)) latestByNoteId.set(key, note);
  }
  return [...latestByNoteId.values()].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export function createAdHocActivity({
  id,
  tenantId,
  caseId,
  title,
  instruction = "",
  templateId,
  templateVersion = 1,
  handlerIdOverride = null,
  dueDate = null,
  sortOrder = 0,
  createdAt,
  createdBy
}) {
  return {
    id,
    tenantId,
    caseId,
    templateId,
    templateVersion,
    title: requiredText(title, "Aktiviteten måste ha en rubrik."),
    instruction: String(instruction || "").trim() || null,
    status: "not_started",
    resultCode: null,
    resultClassification: null,
    handlerIdOverride: handlerIdOverride || null,
    waitingForParty: null,
    dueDate: dueDate || null,
    sortOrder,
    version: 1,
    createdAt,
    createdBy,
    updatedAt: createdAt,
    updatedBy: createdBy,
    completedAt: null,
    completedBy: null
  };
}

function eventCategory(event) {
  const type = String(event.eventType || "");
  const entity = String(event.entityType || "");
  if (entity === "case_note" || type.startsWith("case_note_") || type.startsWith("case_description_")) return "notes";
  if (["activity", "deviation", "decision"].includes(entity) || type.startsWith("activity_") || type.startsWith("deviation_")) return "activities";
  if (["interaction", "meeting", "incoming_contact"].includes(entity) || /meeting|interaction|contact/.test(type)) return "contacts";
  if (entity === "document" || type.includes("document") || type.includes("handling")) return "documents";
  return "system";
}

function isTechnicalEvent(event) {
  return new Set(["case_updated", "definition_updated", "prototype_normalized"]).has(event.eventType);
}

export function projectCaseHistory({ caseId, events = [], notes = [] }) {
  const noteVersionIds = new Set(notes.filter((item) => item.caseId === caseId).map((item) => item.id));
  const projectedNotes = notes
    .filter((item) => item.caseId === caseId)
    .map((note) => ({
      id: `note:${note.id}`,
      category: "notes",
      technical: false,
      occurredAt: note.createdAt,
      actorId: note.createdBy,
      text: note.version > 1 ? "Ärendeanteckning rättades" : "Ärendeanteckning lades till",
      detail: note.text,
      sourceType: "case_note",
      sourceId: note.id,
      targetType: note.targetType,
      targetId: note.targetId,
      version: note.version,
      replaced: notes.some((candidate) => candidate.supersedesVersionId === note.id)
    }));
  const projectedEvents = events
    .filter((item) => item.caseId === caseId)
    .filter((item) => !(item.entityType === "case_note" && noteVersionIds.has(item.entityId)))
    .map((event) => ({
      id: `event:${event.id}`,
      category: eventCategory(event),
      technical: isTechnicalEvent(event),
      occurredAt: event.occurredAt || event.createdAt,
      actorId: event.actorId,
      text: event.payload?.message || event.text || event.eventType,
      detail: "",
      sourceType: event.entityType || "case",
      sourceId: event.entityId || caseId,
      eventType: event.eventType
    }));
  return [...projectedNotes, ...projectedEvents]
    .sort((left, right) => String(right.occurredAt || "").localeCompare(String(left.occurredAt || "")));
}

export function filterCaseHistory(items, filter = "all") {
  if (filter === "all") return items;
  if (filter === "system") return items.filter((item) => item.technical || item.category === "system");
  return items.filter((item) => item.category === filter && !item.technical);
}

export function latestRelevantCaseHistory(items, limit = 3) {
  return items.filter((item) => !item.technical && item.category !== "system").slice(0, limit);
}
