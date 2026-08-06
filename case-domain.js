export const DEFAULT_TENANT_ID = "demo-kommun";
export const DEFAULT_ORGANIZATION_UNIT_ID = "foraldramentorer";
export const AD_HOC_ACTIVITY_TEMPLATE_ID = "ad-hoc";

export const CASE_STATUS_LABELS = {
  new: "Nytt",
  in_progress: "Pågår",
  waiting: "Väntar",
  paused: "Pausat",
  decision_required: "Ställningstagande krävs",
  closed: "Avslutat"
};

export const ACTIVITY_STATUS_LABELS = {
  not_started: "Ej påbörjad",
  in_progress: "Pågår",
  waiting: "Väntar",
  completed: "Avslutad",
  not_applicable: "Ej aktuell"
};

const LEGACY_CASE_STATUS = {
  Nytt: "new",
  Pågår: "in_progress",
  Väntar: "waiting",
  Pausat: "paused",
  "Kräver åtgärd": "decision_required",
  "Redo för beslut": "in_progress",
  Avslutat: "closed"
};

const LEGACY_ACTIVITY_STATUS = {
  "Ej påbörjad": "not_started",
  Pågår: "in_progress",
  Väntar: "waiting",
  Klar: "completed",
  Avslutad: "completed",
  "Ej aktuell": "not_applicable"
};

export const ACTIVITY_TEMPLATES = [
  {
    id: "identityVerified",
    version: 1,
    title: "Verifiera identitet",
    results: [
      ["verified", "Verifierad", "acceptable"],
      ["not_verified", "Inte verifierad", "deviation"]
    ]
  },
  {
    id: "registryChecked",
    version: 1,
    title: "Kontrollera belastningsregister",
    results: [
      ["shown_checked", "Visat och kontrollerat", "acceptable"],
      ["not_shown", "Inte visat", "deviation"],
      ["wrong_type_or_expired", "Fel typ eller för gammalt", "deviation"],
      ["authenticity_unconfirmed", "Äkthet inte bekräftad", "deviation"]
    ]
  },
  {
    id: "referencesDone",
    version: 1,
    title: "Kontrollera referenser",
    results: [
      ["acceptable", "Godtagbara", "acceptable"],
      ["unreachable", "Referens kunde inte nås", "deviation"],
      ["assessment_required", "Uppgifter behöver bedömas", "deviation"],
      ["not_acceptable", "Inte godtagbara", "deviation"],
      ["incomplete", "Ofullständiga", "deviation"]
    ]
  },
  {
    id: "trainingDone",
    version: 1,
    title: "Kontrollera e-learning",
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["partially_completed", "Delvis genomförd", "deviation"],
      ["not_completed", "Inte genomförd", "deviation"]
    ]
  },
  {
    id: "quizDone",
    version: 1,
    title: "Kontrollera kunskapsavstämning",
    results: [
      ["passed", "Godkänd", "acceptable"],
      ["not_passed", "Inte godkänd", "deviation"]
    ]
  },
  {
    id: "inviteInterview",
    version: 1,
    title: "Kalla till intervju",
    results: [
      ["invitation_sent", "Kallelse skickad", "acceptable"],
      ["not_reached", "Kunde inte nå personen", "deviation"]
    ]
  },
  {
    id: "interviewDone",
    version: 1,
    title: "Genomför intervju",
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["cancelled", "Inställd", "deviation"],
      ["no_show", "Uteblev", "deviation"]
    ]
  },
  {
    id: "decision",
    version: 1,
    title: "Fatta beslut om godkännande",
    results: [
      ["approved", "Godkänd", "acceptable"],
      ["not_approved", "Inte godkänd", "deviation"]
    ]
  },
  {
    id: AD_HOC_ACTIVITY_TEMPLATE_ID,
    version: 1,
    title: "Annan aktivitet",
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["not_completed", "Kunde inte genomföras", "deviation"],
      ["not_assessable", "Ej bedömningsbar", "deviation"]
    ]
  }
];

export const CASE_DETAIL_FIELD_DEFINITIONS = [
  { id: "targetGroup", label: "Målgrupp", inputType: "text", placeholder: "Exempel: Vårdnadshavare med barn 6-12 år" },
  { id: "area", label: "Geografiskt område", inputType: "text", placeholder: "Exempel: Centrum och Öster" },
  { id: "languages", label: "Språkbehov", inputType: "text", placeholder: "Exempel: Svenska, arabiska" },
  { id: "desiredCount", label: "Önskat antal mentorer", inputType: "number", min: 1, placeholder: "Exempel: 6" },
  { id: "desiredDate", label: "Behovet ska vara mött senast", inputType: "date" }
];

export const CASE_TYPE_DEFINITIONS = [
  {
    id: "mentor-certification",
    version: 1,
    name: "Certifiering av mentor",
    mentorMode: "required",
    helpText: "Använd när en registrerad mentor ska genomgå kommunens kontroller, intervju och beslut om godkännande.",
    registrationHint: "Välj mentor och beskriv kort vad som har initierat certifieringen. Kontrollaktiviteterna skapas automatiskt.",
    detailFieldIds: [],
    defaultPriority: "normal",
    activityTemplateIds: ACTIVITY_TEMPLATES.slice(0, 8).map((template) => template.id)
  },
  {
    id: "mentor-follow-up",
    version: 1,
    name: "Uppföljning",
    mentorMode: "optional",
    helpText: "Använd för en planerad eller behovsstyrd uppföljning av en mentor. Koppla mentor när uppföljningen gäller en viss person.",
    registrationHint: "Ange vad som ska följas upp och varför. Möten och fortsatta åtgärder registreras sedan i samma ärende.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Kontakta mentorn", "Dokumentera uppföljningen", "Bedöm fortsatt behov"]
  },
  {
    id: "matching",
    version: 1,
    name: "Matchning",
    mentorMode: "required",
    helpText: "Använd när en certifierad mentor ska bedömas och tillfrågas för ett konkret stödbehov.",
    registrationHint: "Välj mentor och sammanfatta behov, grundkriterier och vad matchningen ska leda till.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Kontrollera tillgänglighet och grundkriterier", "Dokumentera matchningsförslag", "Kontakta mentorn", "Boka första mötet", "Registrera parternas återkoppling", "Fatta beslut om matchning"]
  },
  {
    id: "mentor-assignment",
    version: 1,
    name: "Mentoruppdrag",
    mentorMode: "required",
    helpText: "Använd när en accepterad matchning övergår till ett aktivt mentoruppdrag som ska följas upp.",
    registrationHint: "Välj mentor och beskriv uppdragets ramar. Planerade uppföljningar hanteras som aktiviteter och möten.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Bekräfta uppdragets ramar", "Genomför första avstämning", "Följ upp efter fyra veckor", "Sammanställ mötes- och ersättningsunderlag", "Utvärdera och avsluta uppdraget"]
  },
  {
    id: "recruitment",
    version: 1,
    name: "Rekryteringsinsats",
    mentorMode: "none",
    helpText: "Använd när ett beslutat rekryteringsbehov ska omsättas i annons, informationsinsats eller annan rekryteringsåtgärd.",
    registrationHint: "Beskriv målgrupp, önskat utfall och vilken behovsanalys eller vilket beslut som ligger bakom insatsen.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Analysera behov", "Skapa platsannons", "Publicera annons", "Följ upp ansökningar"]
  },
  {
    id: "needs-analysis",
    version: 1,
    name: "Behovsanalys",
    mentorMode: "none",
    helpText: "Använd när verksamheten behöver beskriva och bedöma ett nytt eller förändrat behov av mentorer.",
    registrationHint: "Registrera var behovet finns, vilka mentorer som efterfrågas, ungefärlig omfattning och när behovet behöver vara mött.",
    detailFieldIds: CASE_DETAIL_FIELD_DEFINITIONS.map((field) => field.id),
    defaultPriority: "normal",
    suggestedActivities: ["Samla in underlag", "Analysera behov", "Dokumentera slutsats"]
  },
  {
    id: "other",
    version: 1,
    name: "Övrigt ärende",
    mentorMode: "optional",
    helpText: "Använd för en avgränsad fråga som inte hör hemma i någon av de övriga ärendetyperna.",
    registrationHint: "Koppla mentor endast när frågan gäller en viss person. Beskriv tydligt önskat resultat så att ärendet kan avslutas entydigt.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: []
  }
];

export function caseTypeById(id) {
  return CASE_TYPE_DEFINITIONS.find((definition) => definition.id === id) || null;
}

export function caseTypeByName(name) {
  return CASE_TYPE_DEFINITIONS.find((definition) => definition.name === name) || caseTypeById("other");
}

export function activityTemplateById(id) {
  return ACTIVITY_TEMPLATES.find((template) => template.id === id) || ACTIVITY_TEMPLATES.at(-1);
}

export function normalizeCaseStatus(status) {
  return CASE_STATUS_LABELS[status] ? status : LEGACY_CASE_STATUS[status] || "new";
}

export function normalizeActivityStatus(status) {
  return ACTIVITY_STATUS_LABELS[status] ? status : LEGACY_ACTIVITY_STATUS[status] || "not_started";
}

export function caseStatusLabel(status) {
  return CASE_STATUS_LABELS[normalizeCaseStatus(status)];
}

export function activityStatusLabel(status) {
  return ACTIVITY_STATUS_LABELS[normalizeActivityStatus(status)];
}

export function resultDefinition(templateId, resultCode) {
  const result = activityTemplateById(templateId).results.find(([code]) => code === resultCode);
  return result ? { code: result[0], label: result[1], classification: result[2] } : null;
}

export function resultOptions(templateId) {
  return activityTemplateById(templateId).results.map(([code, label]) => [code, label]);
}

export function resultClassification(templateId, resultCode) {
  return resultDefinition(templateId, resultCode)?.classification || null;
}

export function deriveCaseStatus(caseRecord, activities, deviations = []) {
  const current = normalizeCaseStatus(caseRecord.status);
  if (current === "closed") return "closed";
  if (current === "paused") return "paused";
  if (deviations.some((deviation) => deviation.status === "open" && !deviation.activeDecisionId)) {
    return "decision_required";
  }

  const open = activities.filter((activity) => !["completed", "not_applicable"].includes(normalizeActivityStatus(activity.status)));
  const actionable = open.some((activity) => normalizeActivityStatus(activity.status) !== "waiting");
  if (activities.some((activity) => normalizeActivityStatus(activity.status) === "in_progress") || actionable && activities.some((activity) => normalizeActivityStatus(activity.status) !== "not_started")) {
    return "in_progress";
  }
  if (open.length && open.every((activity) => normalizeActivityStatus(activity.status) === "waiting")) return "waiting";
  if (!open.length && activities.length) return "in_progress";
  return "new";
}

const ACTIVITY_TRANSITIONS = {
  not_started: new Set(["in_progress", "waiting", "completed", "not_applicable"]),
  in_progress: new Set(["waiting", "completed", "not_applicable"]),
  waiting: new Set(["in_progress", "completed", "not_applicable"]),
  completed: new Set(),
  not_applicable: new Set()
};

export function canTransitionActivity(from, to, { reopen = false } = {}) {
  const source = normalizeActivityStatus(from);
  const target = normalizeActivityStatus(to);
  if (source === target) return true;
  if (reopen && source === "completed" && target === "in_progress") return true;
  if (reopen && source === "not_applicable" && target === "not_started") return true;
  return ACTIVITY_TRANSITIONS[source]?.has(target) || false;
}

export function assessCertificationApproval({ caseRecord, activities = [], deviations = [], hasResponsible = false, identityComplete = false }) {
  const reasons = [];
  if (!caseRecord || caseRecord.caseTypeId !== "mentor-certification") reasons.push("Ärendet är inte ett certifieringsärende.");
  if (caseRecord?.status === "paused") reasons.push("Ärendet är pausat.");
  if (caseRecord?.status === "closed") reasons.push("Ärendet är redan avslutat.");
  if (!hasResponsible) reasons.push("Ärendet saknar ansvarig handläggare.");
  if (!identityComplete) reasons.push("Personnummer och verifieringssätt saknas.");

  const unresolvedDeviations = deviations.filter((deviation) => deviation.status === "open" && !deviation.activeDecisionId);
  if (unresolvedDeviations.length) reasons.push("Minst ett ställningstagande återstår.");

  const decisionTemplateId = "decision";
  const requiredTemplateIds = ACTIVITY_TEMPLATES
    .map((template) => template.id)
    .filter((id) => ![decisionTemplateId, AD_HOC_ACTIVITY_TEMPLATE_ID].includes(id));
  for (const templateId of requiredTemplateIds) {
    const activity = activities.find((item) => item.templateId === templateId);
    if (!activity) {
      reasons.push(`Obligatorisk aktivitet saknas: ${activityTemplateById(templateId).title}.`);
      continue;
    }
    if (normalizeActivityStatus(activity.status) !== "completed" || activity.resultClassification !== "acceptable") {
      reasons.push(`Aktiviteten är inte godkänd: ${activity.title}.`);
    }
  }

  const unfinishedAdditionalActivities = activities.filter((activity) =>
    ![decisionTemplateId].includes(activity.templateId)
    && !requiredTemplateIds.includes(activity.templateId)
    && !["completed", "not_applicable"].includes(normalizeActivityStatus(activity.status))
  );
  if (unfinishedAdditionalActivities.length) reasons.push("Minst en tillagd aktivitet återstår.");

  return { allowed: reasons.length === 0, reasons };
}

export function findMentorDuplicates(candidates, { personalNumber = "", name = "" }) {
  const normalizedNumber = String(personalNumber).replace(/\D/g, "");
  const normalizedName = String(name).trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
  return {
    exactPersonalNumber: normalizedNumber.length === 12
      ? candidates.find((candidate) => String(candidate.personalNumber || "").replace(/\D/g, "") === normalizedNumber) || null
      : null,
    sameName: normalizedName.length > 2
      ? candidates.filter((candidate) => String(candidate.name || "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ") === normalizedName)
      : []
  };
}

export function stableHash(value) {
  const canonicalize = (item) => {
    if (Array.isArray(item)) return item.map(canonicalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonicalize(item[key])]));
    }
    return item;
  };
  const text = JSON.stringify(canonicalize(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
