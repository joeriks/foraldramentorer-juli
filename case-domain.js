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
    workInput: { kind: "mentor_identity", featureKey: "mentor.identity", label: "Identitetsuppgifter", required: true },
    workInstruction: "Kontrollera identiteten med BankID eller genom fysisk ID-handling. Registrera personnummer och verifieringssätt på mentorkortet innan aktiviteten avslutas.",
    results: [
      ["verified", "Verifierad", "acceptable"],
      ["not_verified", "Inte verifierad", "deviation"]
    ]
  },
  {
    id: "registryChecked",
    version: 1,
    title: "Kontrollera belastningsregister",
    workInstruction: "Kontrollera att rätt registerutdrag visas, att det är giltigt och att äktheten kan bedömas. Registrera endast kontrollens resultat, inte uppgifter ur utdraget.",
    quickCompletionResultCodes: ["shown_checked"],
    results: [
      ["shown_checked", "Kontrollerat, inget fortsatt ställningstagande behövs", "acceptable"],
      ["assessment_required", "Kontrollerat, särskilt ställningstagande krävs", "deviation"],
      ["not_shown", "Inte visat", "deviation"],
      ["wrong_type_or_expired", "Fel typ eller för gammalt", "deviation"],
      ["authenticity_unconfirmed", "Äkthet inte bekräftad", "deviation"]
    ]
  },
  {
    id: "referencesDone",
    version: 1,
    title: "Kontrollera referenser",
    workInstruction: "Kontakta angivna referenser och dokumentera kontaktförsök samt en saklig sammanfattning. Skapa uppföljning om en referens inte kan nås eller behöver bedömas vidare.",
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
    workInstruction: "Kontrollera att aktuell utbildning är genomförd. Sätt aktiviteten till Väntar om utbildningen pågår och ange vem eller vad handläggningen väntar på.",
    quickCompletionResultCodes: ["completed"],
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
    workInstruction: "Kontrollera resultatet från kunskapsavstämningen och registrera om den är godkänd. Ett icke godkänt resultat ska följas av ett uttryckligt ställningstagande.",
    quickCompletionResultCodes: ["passed"],
    results: [
      ["passed", "Godkänd", "acceptable"],
      ["not_passed", "Inte godkänd", "deviation"]
    ]
  },
  {
    id: "inviteInterview",
    version: 1,
    title: "Kalla till intervju",
    workInstruction: "Kontakta mentorn, kom överens om tid och registrera kallelsen. Ange förfallodatum eller väntande part om bokningen inte kan slutföras direkt.",
    results: [
      ["invitation_sent", "Kallelse skickad", "acceptable"],
      ["not_reached", "Kunde inte nå personen", "deviation"]
    ]
  },
  {
    id: "interviewDone",
    version: 1,
    title: "Genomför intervju",
    workInput: { kind: "case_meeting", featureKey: "case.meetings", label: "Intervjuunderlag", required: true },
    workInstruction: "Genomför intervjun enligt verksamhetens rutin och registrera mötet eller protokollet som underlag. Avsluta aktiviteten först när utfallet är dokumenterat.",
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
    workInstruction: "Kontrollera att obligatoriska aktiviteter och eventuella ställningstaganden är klara. Registrera beslut och en saklig motivering innan ärendet avslutas.",
    results: [
      ["approved", "Godkänd", "acceptable"],
      ["not_approved", "Inte godkänd", "deviation"]
    ]
  },
  {
    id: "matchingEligibility",
    version: 1,
    title: "Kontrollera tillgänglighet och grundkriterier",
    workInput: { kind: "matching_basis", featureKey: "case.matching", label: "Matchningsunderlag", required: true },
    workInstruction: "Kontrollera att mentorn är godkänd, aktiv och tillgänglig för ett nytt uppdrag. Jämför stödbehov, stödområden, språk, geografiska förutsättningar och praktisk tillgänglighet. Dokumentera en kort motivering om något kriterium behöver bedömas manuellt.",
    results: [
      ["criteria_met", "Grundkriterier uppfyllda", "acceptable"],
      ["mentor_unavailable", "Mentorn är inte tillgänglig", "acceptable"],
      ["criteria_not_met", "Grundkriterier inte uppfyllda", "acceptable"],
      ["more_information_needed", "Mer underlag behövs", "deviation"]
    ]
  },
  {
    id: "matchingProposal",
    version: 1,
    title: "Dokumentera matchningsförslag",
    workInput: { kind: "matching_proposal", featureKey: "case.matching", label: "Matchningsmotivering", required: true },
    workInstruction: "Dokumentera varför den föreslagna mentorn bedöms passa det aktuella stödärendet. Ange vilka behov och förutsättningar som stämmer, eventuella begränsningar och vad parterna behöver bekräfta. Undvik omdömen som inte behövs för matchningen.",
    results: [
      ["proposal_documented", "Matchningsförslag dokumenterat", "acceptable"],
      ["no_suitable_proposal", "Ingen lämplig matchning kunde föreslås", "acceptable"],
      ["more_information_needed", "Mer underlag behövs", "deviation"]
    ]
  },
  {
    id: "matchingMentorContact",
    version: 1,
    title: "Kontakta mentorn",
    workInstruction: "Presentera uppdragets syfte och praktiska ramar för mentorn utan att lämna fler personuppgifter än nödvändigt. Registrera mentorns svar. Sätt aktiviteten till Väntar och ange uppföljningsdatum om svar inte kan lämnas direkt.",
    results: [
      ["mentor_accepts", "Mentorn vill gå vidare", "acceptable"],
      ["mentor_declines", "Mentorn tackar nej", "acceptable"],
      ["mentor_unreachable", "Mentorn kunde inte nås", "deviation"]
    ]
  },
  {
    id: "matchingFirstMeeting",
    version: 1,
    title: "Boka första mötet",
    workInput: { kind: "case_meeting", featureKey: "case.meetings", label: "Mötesbokning", required: true },
    workInstruction: "Kom överens med parterna om datum, kontaktform och praktiska förutsättningar för ett första möte. Registrera bokningen. Använd Väntar om en tid ännu inte är bekräftad; avsluta inte aktiviteten som genomförd enbart för att ett kontaktförsök har gjorts.",
    results: [
      ["meeting_booked", "Första mötet bokat", "acceptable"],
      ["meeting_not_booked", "Mötet kunde inte bokas", "acceptable"],
      ["rescheduling_needed", "Ombokning behövs", "deviation"]
    ]
  },
  {
    id: "matchingPartyResponses",
    version: 1,
    title: "Registrera parternas återkoppling",
    workInput: { kind: "matching_responses", featureKey: "case.matching", label: "Parternas återkoppling", required: true },
    workInstruction: "Registrera förälderns och mentorns svar var för sig under Parternas återkoppling på ärendets översikt. Sammanfatta endast det som behövs för beslutet. Uteblivet svar ska registreras som vänteläge, aldrig som ett godkännande.",
    results: [
      ["both_accept", "Båda parter vill gå vidare", "acceptable"],
      ["parent_declines", "Föräldern tackar nej", "acceptable"],
      ["mentor_declines", "Mentorn tackar nej", "acceptable"],
      ["both_decline", "Båda parter tackar nej", "acceptable"],
      ["new_proposal_needed", "Nytt matchningsförslag behövs", "acceptable"]
    ]
  },
  {
    id: "matchingDecision",
    version: 1,
    title: "Fatta beslut om matchning",
    workInput: { kind: "matching_decision", featureKey: "case.matching", label: "Matchningsbeslut", required: true },
    workInstruction: "Kontrollera matchningsunderlaget och båda parters registrerade svar. Registrera det samlade utfallet under Parternas återkoppling på ärendets översikt. Ett mentoruppdrag får skapas först när båda parter har accepterat samma förslag.",
    results: [
      ["match_approved", "Matchningen godkänd", "acceptable"],
      ["match_rejected", "Matchningen avslutas utan uppdrag", "acceptable"],
      ["new_proposal_needed", "Nytt matchningsförslag behövs", "acceptable"]
    ]
  },
  {
    id: AD_HOC_ACTIVITY_TEMPLATE_ID,
    version: 1,
    title: "Annan aktivitet",
    workInstruction: "Beskriv vad som ska göras, vem som ansvarar och när det ska vara klart. Registrera resultat och notering så att nästa handläggare kan förstå vad som har gjorts.",
    quickCompletionResultCodes: ["completed"],
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["not_completed", "Kunde inte genomföras", "deviation"],
      ["not_assessable", "Ej bedömningsbar", "deviation"]
    ]
  }
];

export const CASE_DETAIL_FIELD_DEFINITIONS = [
  { id: "supportPurpose", label: "Stödets syfte", inputType: "text", placeholder: "Exempel: stöd kring skolfrånvaro" },
  { id: "desiredOutcome", label: "Önskat resultat", inputType: "text", placeholder: "Vad ska stödet bidra till?" },
  { id: "targetGroup", label: "Målgrupp", inputType: "text", placeholder: "Exempel: Vårdnadshavare med barn 6-12 år" },
  { id: "area", label: "Geografiskt område", inputType: "text", placeholder: "Exempel: Centrum och Öster" },
  { id: "languages", label: "Språkbehov", inputType: "text", placeholder: "Exempel: Svenska, arabiska" },
  { id: "desiredCount", label: "Önskat antal mentorer", inputType: "number", min: 1, placeholder: "Exempel: 6" },
  { id: "desiredDate", label: "Behovet ska vara mött senast", inputType: "date" }
];

export const CASE_TYPE_DEFINITIONS = [
  {
    id: "incoming-contact",
    version: 1,
    name: "Inkommande samtal/e-post",
    creationMode: "manual",
    nextCaseTypeId: "parent-support",
    mentorMode: "none",
    helpText: "Använd för en mottagen kontakt via telefon, e-post, besök eller annan kanal innan kommunen vet vad fortsatt handläggning ska bli.",
    registrationHint: "Registrera kontaktväg, kontaktuppgift, vem som kontaktar kommunen, en kort saklig anteckning och vad nästa steg ska vara när kontakten är avslutad.",
    workInstruction: "Följ det angivna nästa steget, komplettera med fler aktiviteter vid behov och avsluta mottagningsärendet när det är tydligt om kontakten kräver fortsatt handläggning.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Bedöm fortsatt hantering", "Koppla personpost eller ärende", "Dokumentera ställningstagande"]
  },
  {
    id: "parent-support",
    version: 1,
    name: "Stödärende för förälder",
    creationMode: "manual",
    nextCaseTypeId: "matching",
    mentorMode: "none",
    parentMode: "required",
    helpText: "Använd för ett avgränsat stödbehov för en registrerad förälder. Välj ett eller flera av kommunens stödområden när behovet är känt; ett nytt syfte ska normalt få ett nytt stödärende.",
    registrationHint: "Välj förälder, stödområde, stödets syfte och önskat resultat. Om stödområdet ännu är oklart lämnas det för komplettering i första kontakten. Matchning startas senare från stödärendet.",
    workInstruction: "Bekräfta stödområdena tillsammans med föräldern, avgränsa stödbehovet och komplettera praktiska matchningskriterier. Starta matchning först när underlaget är användbart och föräldern vill gå vidare.",
    detailFieldIds: ["supportPurpose", "desiredOutcome", "area", "languages"],
    defaultPriority: "normal",
    suggestedActivities: ["Komplettera stödbehov och matchningskriterier", "Bekräfta att föräldern vill gå vidare"]
  },
  {
    id: "mentor-certification",
    version: 1,
    name: "Godkännande av mentor",
    creationMode: "mentor_context",
    nextCaseTypeId: null,
    mentorMode: "required",
    helpText: "Använd när en registrerad mentor ska genomgå kommunens kontroller, intervju och beslut om godkännande.",
    registrationHint: "Välj mentor och beskriv kort vad som har initierat prövningen. Kontrollaktiviteterna skapas automatiskt.",
    workInstruction: "Tilldela en ansvarig handläggare och genomför aktiviteterna i angiven ordning. Dokumentera avvikelser och gör nödvändiga ställningstaganden innan beslut om godkännande fattas.",
    detailFieldIds: [],
    defaultPriority: "normal",
    activityTemplateIds: ACTIVITY_TEMPLATES.slice(0, 8).map((template) => template.id)
  },
  {
    id: "mentor-follow-up",
    version: 1,
    name: "Uppföljning",
    creationMode: "manual",
    nextCaseTypeId: null,
    mentorMode: "optional",
    helpText: "Använd för en planerad eller behovsstyrd uppföljning av en mentor. Koppla mentor när uppföljningen gäller en viss person.",
    registrationHint: "Ange vad som ska följas upp och varför. Möten och fortsatta åtgärder registreras sedan i samma ärende.",
    workInstruction: "Klargör vad som ska följas upp, registrera kontakt eller möte och dokumentera utfallet. Lägg till en ny aktivitet om fortsatt arbete behövs.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Kontakta mentorn", "Dokumentera uppföljningen", "Bedöm fortsatt behov"]
  },
  {
    id: "matching",
    version: 1,
    name: "Matchning",
    creationMode: "support_case",
    nextCaseTypeId: "mentor-assignment",
    mentorMode: "required",
    parentMode: "via_support_case",
    helpText: "Använd när ett bestämt stödärende ska prövas tillsammans med en godkänd och tillgänglig mentor. Gemensamma stödområden visas som beslutsunderlag, inte som ett automatiskt beslut.",
    registrationHint: "Välj stödärende och mentor. Systemet visar registrerad överlappning i stödområden; språk, tillgänglighet, önskemål och professionell bedömning behöver också vägas in.",
    workInstruction: "Kontrollera mentorens tillgänglighet, erfarenhetsområden och övriga grundkriterier. Dokumentera varför matchningen föreslås och registrera båda parters återkoppling innan beslut om matchning.",
    detailFieldIds: [],
    defaultPriority: "normal",
    activityTemplateIds: ["matchingEligibility", "matchingProposal", "matchingMentorContact", "matchingFirstMeeting", "matchingPartyResponses", "matchingDecision"]
  },
  {
    id: "mentor-assignment",
    version: 1,
    name: "Mentoruppdrag",
    creationMode: "accepted_matching",
    nextCaseTypeId: "mentor-follow-up",
    mentorMode: "required",
    parentMode: "via_support_case",
    helpText: "Använd när en accepterad matchning övergår till ett aktivt mentoruppdrag som ska följas upp.",
    registrationHint: "Välj mentor och beskriv uppdragets ramar. Planerade uppföljningar hanteras som aktiviteter och möten.",
    workInstruction: "Bekräfta uppdragets ramar, planera uppföljningar och registrera möten och avvikelser löpande. Avsluta ärendet när uppdraget har utvärderats.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Bekräfta uppdragets ramar", "Genomför första avstämning", "Följ upp efter fyra veckor", "Sammanställ mötes- och ersättningsunderlag", "Utvärdera och avsluta uppdraget"]
  },
  {
    id: "recruitment",
    version: 1,
    name: "Rekryteringsinsats",
    creationMode: "manual",
    nextCaseTypeId: "mentor-certification",
    mentorMode: "none",
    helpText: "Använd när ett beslutat rekryteringsbehov ska omsättas i annons, informationsinsats eller annan rekryteringsåtgärd.",
    registrationHint: "Beskriv målgrupp, önskat utfall och vilken behovsanalys eller vilket beslut som ligger bakom insatsen.",
    workInstruction: "Utgå från beslutat behov, planera och genomför rekryteringsinsatsen och följ upp utfallet. Länka relevant underlag och registrera slutsatsen i ärendet.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: ["Analysera behov", "Skapa platsannons", "Publicera annons", "Följ upp ansökningar"]
  },
  {
    id: "needs-analysis",
    version: 1,
    name: "Behovsanalys",
    creationMode: "manual",
    nextCaseTypeId: "recruitment",
    mentorMode: "none",
    helpText: "Använd när verksamheten behöver beskriva och bedöma ett nytt eller förändrat behov av mentorer.",
    registrationHint: "Registrera var behovet finns, vilka mentorer som efterfrågas, ungefärlig omfattning och när behovet behöver vara mött.",
    workInstruction: "Samla in underlag från berörda verksamheter, komplettera behovsuppgifterna och dokumentera analysens slutsats. Skapa en rekryteringsinsats om behovet ska genomföras.",
    detailFieldIds: CASE_DETAIL_FIELD_DEFINITIONS.map((field) => field.id),
    defaultPriority: "normal",
    suggestedActivities: ["Samla in underlag", "Analysera behov", "Dokumentera slutsats"]
  },
  {
    id: "other",
    version: 1,
    name: "Övrigt ärende",
    creationMode: "manual",
    nextCaseTypeId: null,
    mentorMode: "optional",
    helpText: "Använd för en avgränsad fråga som inte hör hemma i någon av de övriga ärendetyperna.",
    registrationHint: "Koppla mentor endast när frågan gäller en viss person. Beskriv tydligt önskat resultat så att ärendet kan avslutas entydigt.",
    workInstruction: "Beskriv önskat resultat, tilldela ansvar och lägg till de aktiviteter som behövs. Dokumentera utfallet innan ärendet avslutas.",
    detailFieldIds: [],
    defaultPriority: "normal",
    suggestedActivities: []
  }
];

export const CASE_TYPE_RELATIONSHIPS = [
  {
    from: "mentor-certification",
    to: "matching",
    group: "prerequisite",
    kind: "prerequisite",
    label: "Endast en godkänd och tillgänglig mentor ska kunna väljas i en matchning."
  }
];

export function caseTypeById(id) {
  return CASE_TYPE_DEFINITIONS.find((definition) => definition.id === id) || null;
}

export function caseTypeByName(name) {
  return CASE_TYPE_DEFINITIONS.find((definition) => definition.name === name) || caseTypeById("other");
}

export function canStartCaseType(caseType, context = {}) {
  if (!caseType) return false;
  if (caseType.creationMode === "mentor_context") return Boolean(context.mentorId);
  if (caseType.creationMode === "support_case") return Boolean(context.supportCaseId);
  if (caseType.creationMode === "accepted_matching") return Boolean(context.acceptedMatchingCaseId);
  return caseType.creationMode === "manual";
}

export function groupParentCases(caseRecords, parentId) {
  const relatedCases = caseRecords.filter((caseRecord) => caseRecord.parentId === parentId);
  return {
    supportCases: relatedCases.filter((caseRecord) => caseRecord.caseTypeId === "parent-support"),
    matchingCases: relatedCases.filter((caseRecord) => caseRecord.caseTypeId === "matching"),
    assignmentCases: relatedCases.filter((caseRecord) => caseRecord.caseTypeId === "mentor-assignment")
  };
}

const CASE_ACTIVITY_WORK_INPUTS = {
  "parent-support": {
    "Komplettera stödbehov och matchningskriterier": { kind: "support_profile", featureKey: "case.edit", label: "Stöd- och matchningsunderlag", required: true }
  },
  "mentor-assignment": {
    "Bekräfta uppdragets ramar": { kind: "assignment_plan", featureKey: "case.assignment-followup", label: "Uppdragsplan", required: true },
    "Genomför första avstämning": { kind: "parent_checkin", featureKey: "case.assignment-followup", label: "Föräldraavstämning", required: true },
    "Följ upp efter fyra veckor": { kind: "parent_checkin", featureKey: "case.assignment-followup", label: "Föräldraavstämning", required: true },
    "Sammanställ mötes- och ersättningsunderlag": { kind: "assignment_evidence", featureKey: "case.assignment-followup", label: "Uppföljnings- och ersättningsunderlag", required: true },
    "Utvärdera och avsluta uppdraget": { kind: "parent_checkin", featureKey: "case.assignment-followup", label: "Avslutande föräldraavstämning", required: true }
  }
};

export function activityWorkInputDefinition(activity, caseTypeId) {
  const template = activityTemplateById(activity?.templateId);
  return template?.workInput || CASE_ACTIVITY_WORK_INPUTS[caseTypeId]?.[activity?.title] || null;
}

export function deriveWorkInputState({ started = false, complete = false } = {}) {
  if (complete) return "complete";
  return started ? "in_progress" : "not_started";
}

export function activityTemplateById(id) {
  return ACTIVITY_TEMPLATES.find((template) => template.id === id) || ACTIVITY_TEMPLATES.at(-1);
}

export function normalizeCaseStatus(status) {
  return CASE_STATUS_LABELS[status] ? status : LEGACY_CASE_STATUS[status] || "new";
}

export function matchingOutcome(parentResponse, mentorResponse) {
  if (parentResponse === "accepted" && mentorResponse === "accepted") return "accepted";
  if (parentResponse === "declined" || mentorResponse === "declined") return "declined";
  if (parentResponse === "waiting" || mentorResponse === "waiting") return "waiting";
  return "incomplete";
}

export function canCreateMentorAssignment(caseRecord) {
  return caseRecord?.caseTypeId === "matching"
    && Boolean(caseRecord.parentId)
    && Boolean(caseRecord.mentorId)
    && Boolean(caseRecord.supportCaseId)
    && matchingOutcome(caseRecord.details?.parentResponse, caseRecord.details?.mentorResponse) === "accepted";
}

export function compensationReadiness({ completedReportCount = 0, latestCheckIn = null } = {}) {
  if (completedReportCount < 1) return "awaiting_reports";
  if (!latestCheckIn) return "awaiting_parent_checkin";
  return "under_review";
}

export function assessCompensationApproval({ completedReportCount = 0, latestCheckIn = null } = {}) {
  const reasons = [];
  if (completedReportCount < 1) reasons.push("Minst en genomförd mentorrapport krävs.");
  if (!latestCheckIn) reasons.push("En föräldraavstämning inom perioden krävs.");
  if (latestCheckIn?.contactConfirmed === "no") reasons.push("Föräldern har inte bekräftat att kontakterna genomförts.");
  if (latestCheckIn?.safety === "concern") reasons.push("Oro i föräldraavstämningen måste hanteras först.");
  return { allowed: reasons.length === 0, reasons };
}

export function normalizeActivityStatus(status) {
  return ACTIVITY_STATUS_LABELS[status] ? status : LEGACY_ACTIVITY_STATUS[status] || "not_started";
}

export function normalizeMentorStatus(status) {
  return status === "Godkänd/Certifierad" ? "Godkänd" : status;
}

export function normalizeCaseTypeTerminology(definition) {
  if (!definition || definition.id !== "mentor-certification") return definition;

  const normalized = { ...definition };
  if (normalized.name === "Certifiering av mentor") normalized.name = "Godkännande av mentor";
  if (normalized.registrationHint === "Välj mentor och beskriv kort vad som har initierat certifieringen. Kontrollaktiviteterna skapas automatiskt.") {
    normalized.registrationHint = "Välj mentor och beskriv kort vad som har initierat prövningen. Kontrollaktiviteterna skapas automatiskt.";
  }
  return normalized;
}

export function normalizeApprovalCaseDescription(description) {
  return description === "Prövning och certifiering inför uppdrag som föräldramentor."
    ? "Prövning inför godkännande för uppdrag som föräldramentor."
    : description;
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
  if (!caseRecord || caseRecord.caseTypeId !== "mentor-certification") reasons.push("Ärendet är inte ett ärende om godkännande.");
  if (caseRecord?.status === "paused") reasons.push("Ärendet är pausat.");
  if (caseRecord?.status === "closed") reasons.push("Ärendet är redan avslutat.");
  if (!hasResponsible) reasons.push("Ärendet saknar ansvarig handläggare.");
  if (!identityComplete) reasons.push("Personnummer och verifieringssätt saknas.");

  const unresolvedDeviations = deviations.filter((deviation) => deviation.status === "open" && !deviation.activeDecisionId);
  if (unresolvedDeviations.length) reasons.push("Minst ett ställningstagande återstår.");

  const decisionTemplateId = "decision";
  const requiredTemplateIds = (caseTypeById("mentor-certification")?.activityTemplateIds || [])
    .filter((id) => id !== decisionTemplateId);
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

export function activitySaveRequiresConfirmation(activity, nextStatus, nextResult) {
  return activity?.templateId === "decision"
    && normalizeActivityStatus(nextStatus) === "completed"
    && nextResult === "approved";
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
