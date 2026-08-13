import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TEMPLATES,
  AD_HOC_ACTIVITY_TEMPLATE_ID,
  CASE_DETAIL_FIELD_DEFINITIONS,
  CASE_STATUS_LABELS,
  CASE_TYPE_DEFINITIONS,
  CASE_TYPE_RELATIONSHIPS,
  DEFAULT_ORGANIZATION_UNIT_ID,
  DEFAULT_TENANT_ID,
  activitySaveRequiresConfirmation,
  activityWorkInputDefinition,
  activityStatusLabel as domainActivityStatusLabel,
  activityTemplateById,
  assessCertificationApproval,
  assessCompensationApproval,
  canCreateMentorAssignment,
  canStartCaseType,
  canTransitionActivity,
  caseStatusLabel,
  caseTypeById as domainCaseTypeById,
  caseTypeByName as domainCaseTypeByName,
  deriveCaseStatus as deriveDomainCaseStatus,
  deriveWorkInputState,
  findMentorDuplicates,
  groupParentCases,
  matchingOutcome,
  compensationReadiness,
  normalizeActivityStatus,
  normalizeApprovalCaseDescription,
  normalizeCaseTypeTerminology,
  normalizeCaseStatus,
  normalizeMentorStatus,
  resultClassification,
  resultOptions,
  stableHash
} from "./case-domain.js?v=20260809-activity-work-input-v28";
import { marked } from "./vendor/marked/marked.esm.js";
import { resolveFeatureLink, resolveFeatureRoute, routineSectionKey, routineSectionRoute } from "./feature-links.js?v=20260809-activity-work-input-v2";
import { ROUTINE_ILLUSTRATIONS } from "./routine-illustrations.js?v=20260806-assignment-followup-v21";
import {
  DEFAULT_TENANT_LEARNING_SELECTION,
  DEFAULT_PUBLIC_LEARNING_SELECTION,
  LEARNING_CONTENT,
  courseProgressPercent,
  learningContentById,
  prepareLearningMarkdown,
  requiredLearningContentIds,
  scoreKnowledgeTest
} from "./learning-domain.js?v=20260807-public-parent-v3";
import {
  containsSensitivePersonalData,
  findSupportKnowledge,
  localSupportResponse,
  supportCategoryLabel
} from "./support-domain.js?v=20260809-demo-v1";
import {
  MENTOR_EXPERIENCE_LEVELS,
  SUPPORT_AREA_CATEGORIES,
  SUPPORT_AREAS,
  defaultTenantSupportAreaSelections,
  normalizeSupportAreaIds,
  selectedSupportAreas,
  supportAreaById,
  supportAreaOverlap
} from "./support-area-domain.js?v=20260808-support-areas-v2";
import {
  MENTOR_SUPPORT_CONFIDENCE_LEVELS,
  activeProfileFor,
  buildMatchingSnapshot,
  buildMentorMatchingProfile,
  buildSupportMatchingProfile,
  normalizeLanguageEntries,
  projectMentorMatchingProfile
} from "./matching-profile-domain.js?v=20260809-matching-profiles-v1";

const DB_NAME = "foraldramentorer-prototype-v2";
const DB_VERSION = 8;
const STORE = "candidates";
const PARENTS_STORE = "parents";
const INCOMING_CONTACTS_STORE = "incomingContacts";
const HANDLERS_STORE = "handlers";
const MEETINGS_STORE = "meetings";
const PRESENTATION_COMMENTS_STORE = "presentationComments";
const CASES_STORE = "cases";
const CASE_ASSIGNMENTS_STORE = "caseAssignments";
const CASE_ACTIVITIES_STORE = "caseActivities";
const CASE_DOCUMENTS_STORE = "caseDocuments";
const CASE_EVENTS_STORE = "caseEvents";
const ACTIVITY_DEVIATIONS_STORE = "activityDeviations";
const DEVIATION_DECISIONS_STORE = "deviationDecisions";
const CASE_MEETINGS_STORE = "caseMeetings";
const MENTOR_REPORTS_STORE = "mentorReports";
const PARENT_CHECK_INS_STORE = "parentCheckIns";
const COMPENSATION_PERIODS_STORE = "compensationPeriods";
const CASE_DOCUMENT_BLOBS_STORE = "caseDocumentBlobs";
const CASE_TYPE_DEFINITIONS_STORE = "caseTypeDefinitions";
const ACTIVITY_TEMPLATE_DEFINITIONS_STORE = "activityTemplateDefinitions";
const PROCESSED_COMMANDS_STORE = "processedCommands";
const LEARNING_CONTENT_STORE = "learningContent";
const TENANT_LEARNING_SELECTION_STORE = "tenantLearningSelection";
const LEARNING_PROGRESS_STORE = "learningProgress";
const PUBLIC_SUPPORT_REQUESTS_STORE = "publicSupportRequests";
const SUPPORT_TICKETS_STORE = "supportTickets";
const TENANT_SUPPORT_AREA_SELECTION_STORE = "tenantSupportAreaSelection";
const TENANT_SETTINGS_STORE = "tenantSettings";
const MENTOR_MATCHING_PROFILES_STORE = "mentorMatchingProfiles";
const MENTOR_MATCHING_AREAS_STORE = "mentorMatchingSupportAreas";
const MENTOR_MATCHING_LANGUAGES_STORE = "mentorMatchingLanguages";
const SUPPORT_MATCHING_PROFILES_STORE = "supportMatchingProfiles";
const SUPPORT_MATCHING_AREAS_STORE = "supportMatchingSupportAreas";
const SUPPORT_MATCHING_LANGUAGES_STORE = "supportMatchingLanguages";
const MATCHING_SNAPSHOTS_STORE = "matchingSnapshots";
const SUPPORT_PANEL_SESSION_KEY = "foraldramentorer.supportPanelOpen";
const LEARNING_SELECTION_INITIALIZED_ID = "__selection_initialized__";
let CURRENT_USER_ID = "handler-sara";
const TEST_USER_TYPE_KEY = "foraldramentorer-test-user-type";
const TEST_USER_TYPES = new Set(["coordinator", "handler", "mentor", "public"]);
const DEMO_MENTOR_USER = { id: "mentor-demo", name: "Mentor testanvändare" };
const APP_VERSION_HISTORY = [
  {
    version: "75",
    date: "2026-08-13",
    title: "Ett nästa steg i ersättningshanteringen",
    flow: "Ersättningsperiod → komplettera, godkänn eller markera utbetald",
    simplified: "Ersättningsvyn visar en aktuell status och den åtgärd som för processen vidare. Kontrollistan, periodformuläret och äldre perioder ligger samlade under underlag och historik.",
    retained: "Mentorrapporter och föräldraavstämning krävs fortfarande som separata underlag. Godkännande och markering som utbetald är fortsatt uttryckliga, spårbara beslut.",
    changes: [
      "Nästa knapp anpassas efter om rapport, avstämning, granskning eller utbetalning återstår.",
      "Komplett kontrollista och alla tidigare ersättningsperioder kan öppnas när de behövs."
    ]
  },
  {
    version: "74",
    date: "2026-08-13",
    title: "Handlingsstyrd uppföljning av mentoruppdrag",
    flow: "Mentoruppdrag → rapport, föräldraavstämning eller uppföljningsärende",
    simplified: "Uppföljningsvyn börjar med tre konkreta åtgärder. Uppdragsplan, tidigare rapporter och avstämningar visas först när handläggaren öppnar dem.",
    retained: "Uppdragsplanen, mentorrapporterna, föräldraavstämningarna, aktiviteterna och möjligheten att skapa ett separat uppföljningsärende finns kvar.",
    changes: [
      "Vyn uppmärksammar ofullständig plan och rapporter där mentorn behöver stöd.",
      "Separata uppföljningsärenden länkas till mentoruppdraget och förifylls."
    ]
  },
  {
    version: "73",
    date: "2026-08-13",
    title: "Behovsanalys som leder vidare",
    flow: "Behovsanalys → komplettera, skapa rekryteringsinsats eller avsluta",
    simplified: "Analysen visar vilka kärnuppgifter som saknas och erbjuder ett direkt val att skapa rekryteringsinsatsen när underlaget är användbart.",
    retained: "Alla analysfält, aktiviteter och möjligheten att avsluta utan insats finns kvar. Det nya ärendet länkas till analysen och får dess beskrivning förifylld.",
    changes: [
      "Målgrupp, område, omfattning och önskat datum används som enkel beredskapskontroll.",
      "Skapad rekryteringsinsats kan öppnas direkt från analysen."
    ]
  },
  {
    version: "72",
    date: "2026-08-13",
    title: "En kontroll i taget vid mentorgodkännande",
    flow: "Godkännande av mentor → nästa kontroll, beslut eller avslut",
    simplified: "Ärendeöversikten lyfter nästa ofärdiga kontroll eller en avvikelse som måste hanteras, i stället för att visa hela kontrollkedjan som första arbetsyta.",
    retained: "Samtliga kontroller, handlingar, intervjuer, avvikelser, beslutsvillkor och revisionshistorik finns kvar i aktiviteterna och mentorposten.",
    changes: [
      "När alla krav är klara leder huvudknappen till beslutet.",
      "Blockerande avvikelser prioriteras före nästa ordinarie kontroll."
    ]
  },
  {
    version: "71",
    date: "2026-08-13",
    title: "Matchning med tydligt beslutsläge",
    flow: "Matchning → registrera svar, skapa mentoruppdrag eller avsluta",
    simplified: "Första vyn visar parternas aktuella svar och den åtgärd som är möjlig nu. Det fullständiga matchningsunderlaget och formuläret visas först när handläggaren öppnar dem.",
    retained: "Matchningsmotivering, båda parters separata svar, överlappning, språkunderlag, bekräftelse och skapande av mentoruppdrag finns kvar.",
    changes: [
      "Accepterad matchning erbjuder Skapa mentoruppdrag direkt.",
      "Avböjd matchning visar beslutet utan att dölja historiken."
    ]
  },
  {
    version: "70",
    date: "2026-08-13",
    title: "Vägledda val i stödärendet",
    flow: "Stödärende → komplettera, starta matchning eller avsluta",
    simplified: "Stödärendet visar tre tydliga nästa steg och talar om vilka centrala uppgifter som saknas innan matchning. Övriga ärendeuppgifter och sällan använda åtgärder är samlade under en utfällbar rubrik.",
    retained: "Stödprofil, aktiviteter, ärendehistorik, redigering, paus och avslut finns kvar.",
    changes: [
      "Matchningsberedskap visas direkt i ärendeöversikten.",
      "Start av matchning använder samma ordinarie matchningsregistrering som tidigare."
    ]
  },
  {
    version: "69",
    date: "2026-08-13",
    title: "Tre tydliga vägar efter inkommande kontakt",
    flow: "Inkommande kontakt → bedöm nästa steg → följ upp, skapa ärende eller avsluta",
    simplified: "Efter sparning väljer handläggaren en av tre tydliga vägar. Berörd person och kontakttyp ligger under Fler uppgifter och behöver inte hanteras under själva kontakten.",
    retained: "Den fria nästa-steg-texten, kontaktanteckningen, mottagningsärendet och möjligheten att starta en annan ärendetyp finns kvar.",
    changes: [
      "Följ upp senare markerar mottagningsärendet som väntande.",
      "Skapa nytt ärende öppnar ordinarie registrering med vald ärendetyp och kontaktuppgifterna förifyllda.",
      "Avsluta kontakten stänger mottagningsärendet men bevarar historiken."
    ]
  },
  {
    version: "68",
    date: "2026-08-13",
    title: "Förenklingar dokumenteras per flöde",
    flow: "Systemadministration / Versioner",
    simplified: "Varje versionspost visar direkt vilket flöde som berörts, vad som förenklats och vilken viktig funktionalitet som bevarats.",
    retained: "Den kronologiska ändringshistoriken, versionsnumren och publiceringsdatumen finns kvar.",
    changes: [
      "Version 67 märktes i Git som stabil baslinje före flödesförenklingarna.",
      "Versionsbeskrivningarna fick en gemensam och jämförbar struktur."
    ]
  },
  {
    version: "67",
    date: "2026-08-11",
    title: "Versionshistorik",
    flow: "Systemadministration / Versioner",
    simplified: "Publicerade ändringar samlas i en kort, kronologisk historik i stället för att behöva sökas fram i Git-historiken.",
    retained: "Versionsnummer, publiceringsdatum och de viktigaste ändringarna finns kvar som separata uppgifter.",
    changes: [
      "En egen versionssida lades till under Systemadministration."
    ]
  },
  {
    version: "66",
    date: "2026-08-11",
    title: "Inkommande kontakt med fri nästa-steg-text",
    flow: "Inkommande kontakt → nästa steg → mottagningsärende",
    simplified: "Mottagaren behöver inte längre söka fram eller koppla en personpost under kontakten. Nästa steg skrivs med egna ord direkt efter samtalet eller meddelandet.",
    retained: "Kontaktanteckning, uppföljning och möjligheten att öppna det skapade mottagningsärendet finns kvar.",
    changes: [
      "Mottagningspanelen fokuserar på kontaktanteckning och nästa steg efter samtalet.",
      "Personpostkoppling togs bort från mottagningspanelen.",
      "Efter sparning kan handläggaren öppna mottagningsärendet direkt."
    ]
  },
  {
    version: "65",
    date: "2026-08-10",
    title: "Inkommande kontakt som ärende",
    flow: "Inkommande kontakt → ärenderegister",
    simplified: "Tidigare kontakter hittas i samma ärenderegister som övriga ärenden, filtrerat på mottagningsärenden, i stället för i ett separat anteckningsflöde.",
    retained: "Varje kontakt får ett spårbart ärende med ärendetyp, status och fortsatt handläggning.",
    changes: [
      "Kontaktmottagning öppnar ärenderegistret filtrerat på mottagningsärenden.",
      "Sparad kontakt skapar ett mottagningsärende.",
      "Mottagningsärenden får egen ärendetyp och kan följas i ärendeflödet."
    ]
  },
  {
    version: "64",
    date: "2026-08-10",
    title: "Tydligare ny-knapp i ärenderegistret",
    flow: "Dashboard → vald ärendetyp → ny registrering",
    simplified: "Den generella knappen Ny registrering ersattes av en knapp som direkt säger vilken typ av ärende som skapas.",
    retained: "Samma registreringsfunktion och vald filtrering används fortfarande.",
    changes: [
      "Knappen följer vald ärendetyp, till exempel Ny behovsanalys eller Ny rekryteringsinsats.",
      "Ändringen gäller när ärenderegistret öppnas filtrerat från dashboard eller navigation."
    ]
  }
];

const ORGANIZATION_UNIT_LABELS = {
  foraldramentorer: "FöräldraMentorer",
  familjestod: "Familjestöd",
  "forebyggande-stod": "Förebyggande stöd",
  "integration-etablering": "Integration och etablering"
};

const STATUSES = [
  "Anmäld",
  "Kontrollerad",
  "Utbildning pågår",
  "Redo för intervju",
  "Godkänd"
];

const CHECKS = [
  ["identityVerified", "Identitet verifierad"],
  ["registryChecked", "Belastningsregister granskat"],
  ["referencesDone", "Referenser klara"],
  ["trainingDone", "E-learning klar"],
  ["quizDone", "Kunskapsavstämning klar"],
  ["inviteInterview", "Kallelse till intervju skickad"],
  ["interviewDone", "Intervju genomförd"]
];

const CHECK_LABELS = Object.fromEntries(CHECKS);

const CERTIFICATION_ACTIVITIES = [
  ["identityVerified", "Verifiera identitet"],
  ["registryChecked", "Kontrollera belastningsregister"],
  ["referencesDone", "Kontrollera referenser"],
  ["trainingDone", "Kontrollera e-learning"],
  ["quizDone", "Kontrollera kunskapsavstämning"],
  ["inviteInterview", "Kalla till intervju"],
  ["interviewDone", "Genomför intervju"],
  ["decision", "Fatta beslut om godkännande"]
];

const CASE_STATUSES = Object.keys(CASE_STATUS_LABELS);
const CASE_PAGE_SIZE = 50;
const ACTIVITY_RESULT_OPTIONS = Object.fromEntries(ACTIVITY_TEMPLATES.map((template) => [
  template.id,
  resultOptions(template.id)
]));
ACTIVITY_RESULT_OPTIONS.default = resultOptions(AD_HOC_ACTIVITY_TEMPLATE_ID);
const BLOCKING_ACTIVITY_RESULTS = new Set(ACTIVITY_TEMPLATES.flatMap((template) => template.results
  .filter(([, , classification]) => classification === "deviation")
  .map(([code]) => code)));

const MATCHING_ACTIVITY_TEMPLATE_BY_TITLE = new Map([
  ["Kontrollera tillgänglighet och grundkriterier", "matchingEligibility"],
  ["Dokumentera matchningsförslag", "matchingProposal"],
  ["Kontakta mentorn", "matchingMentorContact"],
  ["Boka första mötet", "matchingFirstMeeting"],
  ["Registrera parternas återkoppling", "matchingPartyResponses"],
  ["Fatta beslut om matchning", "matchingDecision"]
]);

const MATCHING_LEGACY_COMPLETED_RESULTS = {
  matchingEligibility: "criteria_met",
  matchingProposal: "proposal_documented",
  matchingMentorContact: "mentor_accepts",
  matchingFirstMeeting: "meeting_booked",
  matchingPartyResponses: "both_accept",
  matchingDecision: "match_approved"
};

const NEXT_ACTIONS = [
  {
    key: "identityVerified",
    label: "Verifiera identitet",
    description: "Kontrollera personens identitet och markera kontrollen som klar.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  },
  {
    key: "registryChecked",
    label: "Granska belastningsregister",
    description: "Granska registerutdraget och markera kontrollen som klar.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  },
  {
    key: "referencesDone",
    label: "Slutför referenser",
    description: "Dokumentera att referenserna är färdiga.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  },
  {
    key: "trainingDone",
    label: "Slutför e-learning",
    description: "Följ upp utbildningen och markera momentet som klart.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  },
  {
    key: "quizDone",
    label: "Genomför kunskapsavstämning",
    description: "Genomför avstämningen och markera momentet som klart.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  },
  {
    key: "inviteInterview",
    label: "Kalla till intervju",
    description: "Skicka kallelsen och registrera att intervjun är bokad.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  },
  {
    key: "interviewDone",
    label: "Genomför intervju",
    description: "Boka eller dokumentera intervjun innan ärendet går till beslut.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna aktivitet"
  }
];

const seedCandidates = [
  {
    name: "Anna Lind",
    area: "Centrum",
    languages: "Svenska, engelska",
    availability: "Vardagskvällar",
    coordinator: "Maja Ekström",
    status: "Utbildning pågår",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Varm och tydlig. Har lång erfarenhet från föreningsliv."
  },
  {
    name: "Bo Karlsson",
    area: "Väster",
    languages: "Svenska",
    availability: "Dagtid",
    coordinator: "Maja Ekström",
    status: "Redo för intervju",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: true,
      quizDone: true,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "Digitalt möte",
    notes: "Ska bokas för digital intervju."
  },
  {
    name: "Samira Haddad",
    area: "Öster",
    languages: "Svenska, arabiska",
    availability: "Helgförmiddagar",
    coordinator: "Jonas Berg",
    status: "Godkänd",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: true,
      quizDone: true,
      interviewDone: true
    },
    interviewDate: "2026-07-12T10:30",
    interviewMode: "Fysiskt möte",
    notes: "God förmåga att lyssna. Tydlig kring gränser och uppdragets roll."
  },
  {
    name: "Karin Nyström",
    area: "Norr",
    languages: "Svenska, finska",
    availability: "Tisdagar och torsdagar dagtid",
    coordinator: "Jonas Berg",
    status: "Anmäld",
    checks: {
      identityVerified: false,
      registryChecked: false,
      referencesDone: false,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Ny intresseanmälan. Behöver första kontakt och identitetskontroll."
  },
  {
    name: "Leif Andersson",
    area: "Söder",
    languages: "Svenska",
    availability: "Måndag kväll och lördag förmiddag",
    coordinator: "Maja Ekström",
    status: "Kontrollerad",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: false,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Registerutdrag granskat. Väntar på en referens."
  },
  {
    name: "Fatima El-Masri",
    area: "Centrum",
    languages: "Svenska, arabiska, engelska",
    availability: "Vardagskvällar",
    coordinator: "Sara Lind",
    status: "Utbildning pågår",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "Digitalt möte",
    notes: "Stark motivation. Har erfarenhet av föreningsarbete med nyanlända familjer."
  },
  {
    name: "Gunnar Pettersson",
    area: "Väster",
    languages: "Svenska, tyska",
    availability: "Dagtid vardagar",
    coordinator: "Sara Lind",
    status: "Redo för intervju",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: true,
      quizDone: true,
      interviewDone: false
    },
    interviewDate: "2026-07-20T13:00",
    interviewMode: "Fysiskt möte",
    notes: "Intervju bokad. Följ upp gränsdragning kring praktiska tjänster."
  },
  {
    name: "Mikael Holm",
    area: "Norr",
    languages: "Svenska, persiska",
    availability: "Helger",
    coordinator: "Jonas Berg",
    status: "Kontrollerad",
    checks: {
      identityVerified: true,
      registryChecked: false,
      referencesDone: true,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Referenser klara. Väntar på belastningsregister."
  }
];

const seedCandidates10 = [
  ...seedCandidates,
  {
    ...seedCandidates[3],
    name: "Elin Berg",
    area: "Söder",
    languages: "Svenska, engelska",
    availability: "Kvällstid vardagar",
    coordinator: "Sara Lind"
  },
  {
    ...seedCandidates[2],
    name: "Omar Rahimi",
    area: "Öster",
    languages: "Svenska, dari",
    availability: "Dagtid och helger",
    coordinator: "Maja Ekström",
    notes: "Godkänd mentor med erfarenhet av stöd kring etablering och myndighetskontakter."
  }
];

const singleMentorTemplate = {
  ...seedCandidates[2],
  name: "Amina Ekström",
  coordinator: "Sara Lind",
  notes: "Godkänd mentor i ett komplett exempel från stödbehov till aktivt uppdrag."
};

const exampleFirstNames = [
  "Amina", "Anders", "Aya", "Camilla", "Daniel", "Elin", "Farah", "Gunnar", "Helena", "Isak",
  "Jasmin", "Johan", "Karin", "Leila", "Magnus", "Maria", "Nadia", "Omar", "Per", "Rania",
  "Samir", "Sara", "Thomas", "Yasmin", "Åsa"
];

const exampleLastNames = [
  "Andersson", "Berg", "Dahl", "Ekström", "Haddad", "Holm", "Lind", "Nilsson", "Rahimi", "Svensson"
];

const seedHandlers = [
  { id: "handler-maja", tenantId: DEFAULT_TENANT_ID, userId: "FMU-1001", name: "Maja Ekström", email: "maja.ekstrom@kommun.example", role: "Handläggare", active: true },
  { id: "handler-jonas", tenantId: DEFAULT_TENANT_ID, userId: "FMU-1002", name: "Jonas Berg", email: "jonas.berg@kommun.example", role: "Handläggare", active: true },
  { id: "handler-sara", tenantId: DEFAULT_TENANT_ID, userId: "FMU-1003", name: "Sara Lind", email: "sara.lind@kommun.example", role: "Samordnare", active: true }
];

const PRESENTATION_STEPS = [
  {
    id: "overview",
    title: "Dashboard och arbetskö",
    featureId: "dashboard.work-queue",
    summary: "Börja i handläggarens dagliga vy med ärendeläge, arbetskö och tydliga avvikelser.",
    points: ["Ärendestatus visar kommunens samlade handläggningsläge", "Arbetskön skiljer på egna, otilldelade och försenade aktiviteter", "Mentorflödet är en sekundär registeröversikt"]
  },
  {
    id: "cases",
    title: "Ärenderegister",
    featureId: "cases.list",
    summary: "Visa att all strukturerad handläggning utgår från ärenden, oavsett om de gäller en mentor eller ett generellt behov.",
    points: ["Sök och filtrera på status", "Se ansvarig, kopplad mentor och nästa aktivitet", "Öppna både ärenden om godkännande och generella ärenden"]
  },
  {
    id: "case-work",
    title: "Ärendekort och aktiviteter",
    featureId: "cases.list",
    summary: "Följ ett ärende från nästa åtgärd till aktivitet, underlag, ställningstagande och avslut.",
    points: ["Ärendet samlar ansvar, tidsfrister och historik", "Aktiviteter kan tilldelas och kompletteras med underlag", "Avvikande resultat kan pausa eller avsluta ärendet"]
  },
  {
    id: "new-mentor",
    title: "Registrera ny mentor",
    featureId: "mentor.create",
    summary: "Visa den enkla standardvägen där en mentorpost och ett ärende om godkännande skapas i ett sammanhang.",
    points: ["Grunduppgifter registreras en gång", "Dubblettkontroll sker före sparande", "Ärendet om godkännande skapas och kopplas automatiskt"]
  },
  {
    id: "parent-support",
    title: "Förälder och stödärende",
    featureId: "parent.list",
    summary: "Visa hur en förälder registreras en gång medan varje avgränsat stödbehov får ett eget ärende.",
    points: ["Föräldrakortet innehåller stabila person- och kontaktuppgifter", "Stödområden, syfte och önskat resultat hör till stödärendet", "Kommunens publika urval hjälper föräldern att beskriva behovet utan krav på diagnos"]
  },
  {
    id: "matching",
    title: "Matchning",
    featureId: "matching.list",
    summary: "Visa den spårbara kedjan från ett bestämt stödärende till ett matchningsförsök.",
    points: ["Varje matchning gäller ett stödärende och en mentor", "Överlappande stödområden visas som beslutsunderlag, aldrig som automatiskt beslut", "Båda parternas svar registreras innan ett uppdrag kan skapas"]
  },
  {
    id: "assignment",
    title: "Mentoruppdrag och uppföljning",
    featureId: "assignment.list",
    summary: "Visa hur ett accepterat uppdrag planeras, återrapporteras och följs upp.",
    points: ["Uppdraget behåller kopplingen till stödärendet och matchningen", "Mentorn återrapporterar kontakter", "Handläggaren följer upp med föräldern och granskar ersättningsunderlag"]
  },
  {
    id: "mentor-record",
    title: "Mentorkort och kopplade ärenden",
    featureId: "mentor.list",
    summary: "Visa mentorn som en personpost med grunduppgifter, beslut, logg och en samlad lista över personens ärenden.",
    points: ["Personuppgifter hålls åtskilda från handläggningen", "Alla ärenden för mentorn visas samlat", "Kontroller och möten hanteras i respektive ärende"]
  },
  {
    id: "support-areas",
    title: "Stödområden och matchningsunderlag",
    featureId: "admin.support-areas",
    summary: "Visa hur kommunen väljer stödområden för föräldrar, mentorer och matchning.",
    points: ["Kommunen väljer vilka områden som används och visas publikt", "Mentorn kan ange flera erfarenhetsgrunder per område", "Områden ger transparent matchningsstöd men fattar inga beslut"]
  },
  {
    id: "learning",
    title: "Utbildning och kunskapstest",
    featureId: "learning.library",
    summary: "Visa kommunens valda referensmaterial, interaktiva kurser och kunskapstest.",
    points: ["Kommunen väljer innehåll i systemadministrationen", "Mentorn kan genomföra kursmoment och test", "Publikt material kan visas separat för föräldrar"]
  },
  {
    id: "configuration",
    title: "Ärendetyper och aktivitetsmallar",
    featureId: "admin.case-types",
    summary: "Visa den avgränsade administrationen av vägledning, fält och processmallar.",
    points: ["Tekniska ID och systemregler är fasta", "Verksamheten kan redigera hjälptexter och tillåtna fält", "Aktivitetsmallarnas instruktioner och resultatregler kan granskas"]
  },
  {
    id: "routines",
    title: "Rutiner och systemadministration",
    featureId: "routines.view",
    summary: "Avsluta med lathunden, funktionslänkarna och administrationen som stödjer en enhetlig kommunal rutin.",
    points: ["Rutinerna beskriver vad som ska göras i vanliga situationer", "Funktionslänkar leder till motsvarande vy", "Handläggare och ärendetyper administreras i separata register"]
  }
];

let db;
let candidates = [];
let parents = [];
let incomingContacts = [];
let handlers = [];
let meetings = [];
let cases = [];
let caseAssignments = [];
let caseActivities = [];
let caseDocuments = [];
let caseEvents = [];
let activityDeviations = [];
let deviationDecisions = [];
let caseMeetings = [];
let mentorReports = [];
let parentCheckIns = [];
let compensationPeriods = [];
let mentorMatchingProfiles = [];
let mentorMatchingAreas = [];
let mentorMatchingLanguages = [];
let supportMatchingProfiles = [];
let supportMatchingAreas = [];
let supportMatchingLanguages = [];
let matchingSnapshots = [];
let caseTypeDefinitions = CASE_TYPE_DEFINITIONS.map((definition) => ({ ...definition }));
let caseTypeDefinitionVersions = [];
let activityTemplateDefinitions = ACTIVITY_TEMPLATES.map((definition) => ({ ...definition }));
let activityTemplateDefinitionVersions = [];
let selectedPresentationStepId = PRESENTATION_STEPS[0].id;
let prototypeDataLoading = false;
let selectedId = null;
let selectedParentId = null;
let parentSearchTerm = "";
let parentEditMode = false;
let activeIncomingContactId = null;
let incomingContactParentId = null;
let incomingContactStartedAt = null;
let pendingIncomingContactId = null;
let pendingSourceCaseId = null;
let selectedCaseRecordId = null;
let caseRouteIntent = "";
let caseRouteTargetId = "";
let mentorRouteIntent = "";
let mentorRouteCaseId = "";
let mentorRouteActivityId = "";
let searchTerm = "";
let statusFilter = "";
let caseSearchTerm = "";
let caseStatusFilter = "";
let caseTypeFilter = "";
let newCaseTypePreset = "";
let casePage = 1;
let dashboardQueueMode = "mine";
let candidateModal;
let currentView = "dashboard";
let renderedDetailId = null;
let workQueueOnly = false;
let pendingNextActionId = null;
let pendingIdentityEditorId = null;
let pendingCaseMeetingsId = null;
let handlerSearchTerm = "";
let handlerStatusFilter = "";
let handlerModal;
let selectedHandlerId = null;
let selectedCaseTypeId = null;
let caseTypeEditMode = false;
let selectedActivityTypeId = null;
let selectedActivityParentCaseTypeId = null;
let activityTypeEditMode = false;
let selectedMeetingId = null;
let confirmActionModal;
let pendingConfirmation = null;
let caseLifecycleModal;
let pendingCaseLifecycleAction = null;
let identityEditMode = false;
let caseEditMode = false;
let selectedCaseActivityId = null;
let activityListFilter = "all";
let activityDetailBaseline = null;
let routinesLoaded = false;
let learningContentVersions = [];
let learningContent = [];
let tenantLearningSelection = [];
let learningProgress = [];
let selectedLearnerId = "";
let learningTypeFilter = "all";
let learningAdminFilter = "all";
let learningMutationQueue = Promise.resolve();
let publicSupportRequests = [];
let lastPublicSupportRequestId = "";
let supportTickets = [];
let tenantSupportAreaSelection = [];
let caseNumberSettings = null;
let lastSupportExchange = null;
let supportTicketStatusFilter = "all";
let activeTestUserType = TEST_USER_TYPES.has(localStorage.getItem(TEST_USER_TYPE_KEY))
  ? localStorage.getItem(TEST_USER_TYPE_KEY)
  : "coordinator";

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  breadcrumb: document.querySelector("#breadcrumb"),
  currentUserInitials: document.querySelector("#currentUserInitials"),
  currentUserLabel: document.querySelector("#currentUserLabel"),
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  testUserTypeSelect: document.querySelector("#testUserTypeSelect"),
  navDashboard: document.querySelector("#navDashboard"),
  navPresentation: document.querySelector("#navPresentation"),
  navIntake: document.querySelector("#navIntake"),
  navCases: document.querySelector("#navCases"),
  navMatchings: document.querySelector("#navMatchings"),
  navAssignments: document.querySelector("#navAssignments"),
  navCandidates: document.querySelector("#navCandidates"),
  navParents: document.querySelector("#navParents"),
  navLearning: document.querySelector("#navLearning"),
  navSupportAreas: document.querySelector("#navSupportAreas"),
  navMentorHome: document.querySelector("#navMentorHome"),
  navMentorAssignments: document.querySelector("#navMentorAssignments"),
  navMentorLearning: document.querySelector("#navMentorLearning"),
  navMentorProfile: document.querySelector("#navMentorProfile"),
  navPublicHome: document.querySelector("#navPublicHome"),
  navPublicSupport: document.querySelector("#navPublicSupport"),
  navPublicLearning: document.querySelector("#navPublicLearning"),
  navAdministration: document.querySelector("#navAdministration"),
  navHandlers: document.querySelector("#navHandlers"),
  navCaseNumbering: document.querySelector("#navCaseNumbering"),
  navCaseTypes: document.querySelector("#navCaseTypes"),
  navLearningAdmin: document.querySelector("#navLearningAdmin"),
  navSupportAdmin: document.querySelector("#navSupportAdmin"),
  navRoutines: document.querySelector("#navRoutines"),
  navVersions: document.querySelector("#navVersions"),
  dashboardView: document.querySelector("#dashboardView"),
  versionsView: document.querySelector("#versionsView"),
  presentationView: document.querySelector("#presentationView"),
  casesView: document.querySelector("#casesView"),
  caseDetailView: document.querySelector("#caseDetailView"),
  candidatesView: document.querySelector("#candidatesView"),
  detailView: document.querySelector("#detailView"),
  parentsView: document.querySelector("#parentsView"),
  parentDetailView: document.querySelector("#parentDetailView"),
  learningView: document.querySelector("#learningView"),
  mentorPortalView: document.querySelector("#mentorPortalView"),
  publicPortalView: document.querySelector("#publicPortalView"),
  learningCatalogPanel: document.querySelector("#learningCatalogPanel"),
  learningDetailPanel: document.querySelector("#learningDetailPanel"),
  learningAdministrationView: document.querySelector("#learningAdministrationView"),
  learningAdminListPanel: document.querySelector("#learningAdminListPanel"),
  learningAdminDetailPanel: document.querySelector("#learningAdminDetailPanel"),
  parentListCount: document.querySelector("#parentListCount"),
  parentSearchInput: document.querySelector("#parentSearchInput"),
  parentTableBody: document.querySelector("#parentTableBody"),
  newParentButton: document.querySelector("#newParentButton"),
  parentDetailEmpty: document.querySelector("#parentDetailEmpty"),
  parentDetail: document.querySelector("#parentDetail"),
  selectedParentId: document.querySelector("#selectedParentId"),
  selectedParentName: document.querySelector("#selectedParentName"),
  selectedParentCreatedBy: document.querySelector("#selectedParentCreatedBy"),
  selectedParentCreated: document.querySelector("#selectedParentCreated"),
  selectedParentUpdated: document.querySelector("#selectedParentUpdated"),
  editParentButton: document.querySelector("#editParentButton"),
  newParentSupportCaseButton: document.querySelector("#newParentSupportCaseButton"),
  parentForm: document.querySelector("#parentForm"),
  parentReadView: document.querySelector("#parentReadView"),
  parentNameInput: document.querySelector("#parentNameInput"),
  parentContactInput: document.querySelector("#parentContactInput"),
  parentInformationStatusInput: document.querySelector("#parentInformationStatusInput"),
  parentAreaInput: document.querySelector("#parentAreaInput"),
  parentLanguagesInput: document.querySelector("#parentLanguagesInput"),
  parentAvailabilityInput: document.querySelector("#parentAvailabilityInput"),
  initialSupportCaseSection: document.querySelector("#initialSupportCaseSection"),
  createInitialSupportCaseInput: document.querySelector("#createInitialSupportCaseInput"),
  initialSupportCaseFields: document.querySelector("#initialSupportCaseFields"),
  initialSupportPurposeInput: document.querySelector("#initialSupportPurposeInput"),
  initialSupportOutcomeInput: document.querySelector("#initialSupportOutcomeInput"),
  initialSupportDescriptionInput: document.querySelector("#initialSupportDescriptionInput"),
  initialSupportAreaChoices: document.querySelector("#initialSupportAreaChoices"),
  cancelParentButton: document.querySelector("#cancelParentButton"),
  parentNameFact: document.querySelector("#parentNameFact"),
  parentContactFact: document.querySelector("#parentContactFact"),
  parentInformationStatusFact: document.querySelector("#parentInformationStatusFact"),
  parentAreaFact: document.querySelector("#parentAreaFact"),
  parentLanguagesFact: document.querySelector("#parentLanguagesFact"),
  parentAvailabilityFact: document.querySelector("#parentAvailabilityFact"),
  parentSupportCaseTabCount: document.querySelector("#parentSupportCaseTabCount"),
  parentMatchingCaseTabCount: document.querySelector("#parentMatchingCaseTabCount"),
  parentAssignmentCaseTabCount: document.querySelector("#parentAssignmentCaseTabCount"),
  parentSupportCaseTableBody: document.querySelector("#parentSupportCaseTableBody"),
  parentMatchingCaseTableBody: document.querySelector("#parentMatchingCaseTableBody"),
  parentAssignmentCaseTableBody: document.querySelector("#parentAssignmentCaseTableBody"),
  navIncomingContact: document.querySelector("#navIncomingContact"),
  mobileIncomingContact: document.querySelector("#mobileIncomingContact"),
  dashboardIncomingContactButton: document.querySelector("#dashboardIncomingContactButton"),
  newIncomingContactButton: document.querySelector("#newIncomingContactButton"),
  parentIncomingContactButton: document.querySelector("#parentIncomingContactButton"),
  incomingContactTableBody: document.querySelector("#incomingContactTableBody"),
  incomingContactOffcanvas: document.querySelector("#incomingContactOffcanvas"),
  incomingContactCaptureStep: document.querySelector("#incomingContactCaptureStep"),
  incomingContactNextStep: document.querySelector("#incomingContactNextStep"),
  incomingContactOccurredAt: document.querySelector("#incomingContactOccurredAt"),
  incomingContactReceivedBy: document.querySelector("#incomingContactReceivedBy"),
  incomingContactForm: document.querySelector("#incomingContactForm"),
  incomingContactChannelInput: document.querySelector("#incomingContactChannelInput"),
  incomingContactDetailsInput: document.querySelector("#incomingContactDetailsInput"),
  incomingContactParentNameInput: document.querySelector("#incomingContactParentNameInput"),
  incomingContactCallerTypeInput: document.querySelector("#incomingContactCallerTypeInput"),
  incomingContactSummaryInput: document.querySelector("#incomingContactSummaryInput"),
  incomingContactNextStepInput: document.querySelector("#incomingContactNextStepInput"),
  incomingContactSavedSummary: document.querySelector("#incomingContactSavedSummary"),
  incomingContactFollowUpButton: document.querySelector("#incomingContactFollowUpButton"),
  incomingContactCaseTypeInput: document.querySelector("#incomingContactCaseTypeInput"),
  incomingContactCreateCaseButton: document.querySelector("#incomingContactCreateCaseButton"),
  incomingContactCloseButton: document.querySelector("#incomingContactCloseButton"),
  incomingContactOpenCaseButton: document.querySelector("#incomingContactOpenCaseButton"),
  administrationView: document.querySelector("#administrationView"),
  caseNumberingAdministrationView: document.querySelector("#caseNumberingAdministrationView"),
  caseNumberingForm: document.querySelector("#caseNumberingForm"),
  caseNumberSequenceFields: document.querySelector("#caseNumberSequenceFields"),
  nextCaseSequenceInput: document.querySelector("#nextCaseSequenceInput"),
  caseNumberPreview: document.querySelector("#caseNumberPreview"),
  caseNumberingUpdated: document.querySelector("#caseNumberingUpdated"),
  caseTypesAdministrationView: document.querySelector("#caseTypesAdministrationView"),
  activityTypesAdministrationView: document.querySelector("#activityTypesAdministrationView"),
  supportAdministrationView: document.querySelector("#supportAdministrationView"),
  publicSupportRequestTableBody: document.querySelector("#publicSupportRequestTableBody"),
  supportAreasAdministrationView: document.querySelector("#supportAreasAdministrationView"),
  supportAreaAdminSummary: document.querySelector("#supportAreaAdminSummary"),
  supportAreaAdminGroups: document.querySelector("#supportAreaAdminGroups"),
  supportTicketTableBody: document.querySelector("#supportTicketTableBody"),
  supportTicketStatusFilter: document.querySelector("#supportTicketStatusFilter"),
  supportLauncher: document.querySelector("#supportLauncher"),
  supportOffcanvas: document.querySelector("#supportOffcanvas"),
  supportConversation: document.querySelector("#supportConversation"),
  supportForm: document.querySelector("#supportForm"),
  supportQuestionInput: document.querySelector("#supportQuestionInput"),
  supportStatus: document.querySelector("#supportStatus"),
  askSupportButton: document.querySelector("#askSupportButton"),
  supportTicketActions: document.querySelector("#supportTicketActions"),
  createSupportTicketButton: document.querySelector("#createSupportTicketButton"),
  routinesView: document.querySelector("#routinesView"),
  routinesSearchInput: document.querySelector("#routinesSearchInput"),
  clearRoutinesSearchButton: document.querySelector("#clearRoutinesSearchButton"),
  routinesSearchResults: document.querySelector("#routinesSearchResults"),
  routinesToc: document.querySelector("#routinesToc"),
  routinesContent: document.querySelector("#routinesContent"),
  copyRoutinesLinkButton: document.querySelector("#copyRoutinesLinkButton"),
  versionHistoryList: document.querySelector("#versionHistoryList"),
  handlerDetailView: document.querySelector("#handlerDetailView"),
  caseTypeAdminTableBody: document.querySelector("#caseTypeAdminTableBody"),
  caseTypeRelationshipMap: document.querySelector("#caseTypeRelationshipMap"),
  caseTypeListPanel: document.querySelector("#caseTypeListPanel"),
  caseTypeDetailPanel: document.querySelector("#caseTypeDetailPanel"),
  caseTypeAdminForm: document.querySelector("#caseTypeAdminForm"),
  caseTypeAdminTitle: document.querySelector("#caseTypeAdminTitle"),
  caseTypeAdminTechnicalId: document.querySelector("#caseTypeAdminTechnicalId"),
  caseTypeVersionMeta: document.querySelector("#caseTypeVersionMeta"),
  caseTypeUpdatedMeta: document.querySelector("#caseTypeUpdatedMeta"),
  caseTypeReadView: document.querySelector("#caseTypeReadView"),
  caseTypeHelpFact: document.querySelector("#caseTypeHelpFact"),
  caseTypeHintFact: document.querySelector("#caseTypeHintFact"),
  caseTypeWorkInstructionFact: document.querySelector("#caseTypeWorkInstructionFact"),
  caseTypeCreationModeFact: document.querySelector("#caseTypeCreationModeFact"),
  caseTypeMentorModeFact: document.querySelector("#caseTypeMentorModeFact"),
  caseTypeNextTypeFact: document.querySelector("#caseTypeNextTypeFact"),
  caseTypeActivitiesFact: document.querySelector("#caseTypeActivitiesFact"),
  caseTypeFieldsFact: document.querySelector("#caseTypeFieldsFact"),
  caseTypeRelationshipsFact: document.querySelector("#caseTypeRelationshipsFact"),
  editCaseTypeButton: document.querySelector("#editCaseTypeButton"),
  caseTypeEditActions: document.querySelector("#caseTypeEditActions"),
  cancelCaseTypeEditButton: document.querySelector("#cancelCaseTypeEditButton"),
  caseTypeAdminIdInput: document.querySelector("#caseTypeAdminIdInput"),
  caseTypeAdminHelpInput: document.querySelector("#caseTypeAdminHelpInput"),
  caseTypeAdminHintInput: document.querySelector("#caseTypeAdminHintInput"),
  caseTypeAdminWorkInstructionInput: document.querySelector("#caseTypeAdminWorkInstructionInput"),
  caseTypeAdminMentorModeInput: document.querySelector("#caseTypeAdminMentorModeInput"),
  caseTypeAdminNextTypeInput: document.querySelector("#caseTypeAdminNextTypeInput"),
  caseTypeAdminFieldChoices: document.querySelector("#caseTypeAdminFieldChoices"),
  activityTypeAdminTableBody: document.querySelector("#activityTypeAdminTableBody"),
  activityTypeBackLink: document.querySelector("#activityTypeBackLink"),
  activityTypeListPanel: document.querySelector("#activityTypeListPanel"),
  activityTypeDetailPanel: document.querySelector("#activityTypeDetailPanel"),
  activityTypeAdminForm: document.querySelector("#activityTypeAdminForm"),
  activityTypeAdminTitle: document.querySelector("#activityTypeAdminTitle"),
  activityTypeAdminTechnicalId: document.querySelector("#activityTypeAdminTechnicalId"),
  activityTypeVersionMeta: document.querySelector("#activityTypeVersionMeta"),
  activityTypeUpdatedMeta: document.querySelector("#activityTypeUpdatedMeta"),
  activityTypeReadView: document.querySelector("#activityTypeReadView"),
  activityTypeWorkInstructionFact: document.querySelector("#activityTypeWorkInstructionFact"),
  activityTypeStatusFact: document.querySelector("#activityTypeStatusFact"),
  activityTypeCompletionFact: document.querySelector("#activityTypeCompletionFact"),
  activityTypeQuickFact: document.querySelector("#activityTypeQuickFact"),
  activityTypeWorkInputFact: document.querySelector("#activityTypeWorkInputFact"),
  activityTypeUsageFact: document.querySelector("#activityTypeUsageFact"),
  activityTypeResultsFact: document.querySelector("#activityTypeResultsFact"),
  editActivityTypeButton: document.querySelector("#editActivityTypeButton"),
  activityTypeEditActions: document.querySelector("#activityTypeEditActions"),
  cancelActivityTypeEditButton: document.querySelector("#cancelActivityTypeEditButton"),
  activityTypeAdminIdInput: document.querySelector("#activityTypeAdminIdInput"),
  activityTypeAdminWorkInstructionInput: document.querySelector("#activityTypeAdminWorkInstructionInput"),
  handlerDetailEmpty: document.querySelector("#handlerDetailEmpty"),
  handlerDetail: document.querySelector("#handlerDetail"),
  totalCount: document.querySelector("#totalCount"),
  caseSummaryBoard: document.querySelector("#caseSummaryBoard"),
  caseFlowBoard: document.querySelector("#caseFlowBoard"),
  pipelineGrid: document.querySelector("#pipelineBoard .pipeline-grid"),
  actionTableBody: document.querySelector("#actionTableBody"),
  actionQueueSummary: document.querySelector("#actionQueueSummary"),
  openActionQueueButton: document.querySelector("#openActionQueueButton"),
  myActivitiesQueueButton: document.querySelector("#myActivitiesQueueButton"),
  unassignedQueueButton: document.querySelector("#unassignedQueueButton"),
  overdueQueueButton: document.querySelector("#overdueQueueButton"),
  decisionQueueButton: document.querySelector("#decisionQueueButton"),
  dashboardMentorRegisterLink: document.querySelector("#dashboardMentorRegisterLink"),
  presentationStepList: document.querySelector("#presentationStepList"),
  presentationOpenStepButton: document.querySelector("#presentationOpenStepButton"),
  presentationStepNumber: document.querySelector("#presentationStepNumber"),
  presentationStepTitle: document.querySelector("#presentationStepTitle"),
  presentationStepSummary: document.querySelector("#presentationStepSummary"),
  presentationStepPoints: document.querySelector("#presentationStepPoints"),
  presentationCommentForm: document.querySelector("#presentationCommentForm"),
  presentationCommentInput: document.querySelector("#presentationCommentInput"),
  presentationCommentsEmpty: document.querySelector("#presentationCommentsEmpty"),
  presentationCommentsList: document.querySelector("#presentationCommentsList"),
  caseListCount: document.querySelector("#caseListCount"),
  caseRegisterTitle: document.querySelector("#caseRegisterTitle"),
  caseSearchInput: document.querySelector("#caseSearchInput"),
  caseTypeFilter: document.querySelector("#caseTypeFilter"),
  caseStatusFilter: document.querySelector("#caseStatusFilter"),
  caseTableBody: document.querySelector("#caseTableBody"),
  casePageSummary: document.querySelector("#casePageSummary"),
  previousCasePageButton: document.querySelector("#previousCasePageButton"),
  nextCasePageButton: document.querySelector("#nextCasePageButton"),
  newGeneralCaseButton: document.querySelector("#newGeneralCaseButton"),
  caseDetailEmpty: document.querySelector("#caseDetailEmpty"),
  caseDetail: document.querySelector("#caseDetail"),
  selectedCaseType: document.querySelector("#selectedCaseType"),
  selectedCaseNumber: document.querySelector("#selectedCaseNumber"),
  selectedCaseTitle: document.querySelector("#selectedCaseTitle"),
  selectedCaseStatus: document.querySelector("#selectedCaseStatus"),
  selectedCaseMentor: document.querySelector("#selectedCaseMentor"),
  selectedCaseParent: document.querySelector("#selectedCaseParent"),
  selectedCaseSupportCase: document.querySelector("#selectedCaseSupportCase"),
  selectedCaseOwner: document.querySelector("#selectedCaseOwner"),
  selectedCaseUpdated: document.querySelector("#selectedCaseUpdated"),
  caseCreateForm: document.querySelector("#caseCreateForm"),
  caseReadView: document.querySelector("#caseReadView"),
  caseTypeInput: document.querySelector("#caseTypeInput"),
  caseTypeGuidance: document.querySelector("#caseTypeGuidance"),
  caseTypeGuidanceTitle: document.querySelector("#caseTypeGuidanceTitle"),
  caseTypeGuidanceText: document.querySelector("#caseTypeGuidanceText"),
  caseTypeRegistrationHint: document.querySelector("#caseTypeRegistrationHint"),
  caseTitleInput: document.querySelector("#caseTitleInput"),
  caseMentorField: document.querySelector("#caseMentorField"),
  caseMentorLabel: document.querySelector("#caseMentorLabel"),
  caseMentorInput: document.querySelector("#caseMentorInput"),
  caseMentorIdInput: document.querySelector("#caseMentorIdInput"),
  caseMentorSuggestions: document.querySelector("#caseMentorSuggestions"),
  caseParentField: document.querySelector("#caseParentField"),
  caseParentInput: document.querySelector("#caseParentInput"),
  caseParentIdInput: document.querySelector("#caseParentIdInput"),
  caseParentSuggestions: document.querySelector("#caseParentSuggestions"),
  caseSupportCaseField: document.querySelector("#caseSupportCaseField"),
  caseSupportCaseInput: document.querySelector("#caseSupportCaseInput"),
  caseDuplicatePanel: document.querySelector("#caseDuplicatePanel"),
  caseOrganizationUnitInput: document.querySelector("#caseOrganizationUnitInput"),
  needsAnalysisFields: document.querySelector("#needsAnalysisFields"),
  needsTargetGroupInput: document.querySelector("#needsTargetGroupInput"),
  supportPurposeInput: document.querySelector("#supportPurposeInput"),
  caseSupportAreaChoices: document.querySelector("#caseSupportAreaChoices"),
  desiredOutcomeInput: document.querySelector("#desiredOutcomeInput"),
  needsAreaInput: document.querySelector("#needsAreaInput"),
  needsLanguagesInput: document.querySelector("#needsLanguagesInput"),
  needsDesiredCountInput: document.querySelector("#needsDesiredCountInput"),
  needsDesiredDateInput: document.querySelector("#needsDesiredDateInput"),
  caseOwnerInput: document.querySelector("#caseOwnerInput"),
  casePriorityInput: document.querySelector("#casePriorityInput"),
  caseDueDateInput: document.querySelector("#caseDueDateInput"),
  caseDescriptionLabel: document.querySelector("#caseDescriptionLabel"),
  caseDescriptionInput: document.querySelector("#caseDescriptionInput"),
  caseCoHandlerInputs: document.querySelector("#caseCoHandlerInputs"),
  caseFormFeedback: document.querySelector("#caseFormFeedback"),
  cancelCaseCreateButton: document.querySelector("#cancelCaseCreateButton"),
  saveCaseButton: document.querySelector("#saveCaseButton"),
  editCaseButton: document.querySelector("#editCaseButton"),
  newCaseActivityButton: document.querySelector("#newCaseActivityButton"),
  completeCaseButton: document.querySelector("#completeCaseButton"),
  editCaseAction: document.querySelector("#editCaseAction"),
  pauseCaseButton: document.querySelector("#pauseCaseButton"),
  pauseCaseAction: document.querySelector("#pauseCaseAction"),
  resumeCaseButton: document.querySelector("#resumeCaseButton"),
  resumeCaseAction: document.querySelector("#resumeCaseAction"),
  closeCaseButton: document.querySelector("#closeCaseButton"),
  closeCaseAction: document.querySelector("#closeCaseAction"),
  reopenCaseButton: document.querySelector("#reopenCaseButton"),
  reopenCaseAction: document.querySelector("#reopenCaseAction"),
  caseActivityCount: document.querySelector("#caseActivityCount"),
  caseDocumentCount: document.querySelector("#caseDocumentCount"),
  caseMeetingCount: document.querySelector("#caseMeetingCount"),
  caseEventCount: document.querySelector("#caseEventCount"),
  caseStatusFact: document.querySelector("#caseStatusFact"),
  casePriorityFact: document.querySelector("#casePriorityFact"),
  caseDueDateFact: document.querySelector("#caseDueDateFact"),
  caseDescriptionFact: document.querySelector("#caseDescriptionFact"),
  caseOwnerFact: document.querySelector("#caseOwnerFact"),
  caseOrganizationUnitFact: document.querySelector("#caseOrganizationUnitFact"),
  caseCoHandlersFact: document.querySelector("#caseCoHandlersFact"),
  caseMentorFact: document.querySelector("#caseMentorFact"),
  caseParentFact: document.querySelector("#caseParentFact"),
  caseSupportCaseFact: document.querySelector("#caseSupportCaseFact"),
  caseCreatedFact: document.querySelector("#caseCreatedFact"),
  caseClosureSummary: document.querySelector("#caseClosureSummary"),
  caseClosureMeta: document.querySelector("#caseClosureMeta"),
  caseClosureOutcome: document.querySelector("#caseClosureOutcome"),
  caseClosureStorage: document.querySelector("#caseClosureStorage"),
  caseClosureEffect: document.querySelector("#caseClosureEffect"),
  caseClosureSuccessor: document.querySelector("#caseClosureSuccessor"),
  activityCaseClosedNotice: document.querySelector("#activityCaseClosedNotice"),
  activityCaseClosedText: document.querySelector("#activityCaseClosedText"),
  showCaseClosureButton: document.querySelector("#showCaseClosureButton"),
  activityCaseReadyNotice: document.querySelector("#activityCaseReadyNotice"),
  activityCaseReadyTitle: document.querySelector("#activityCaseReadyTitle"),
  activityCaseReadyText: document.querySelector("#activityCaseReadyText"),
  activityCaseReadyNextText: document.querySelector("#activityCaseReadyNextText"),
  activityCaseReadyPrimaryButton: document.querySelector("#activityCaseReadyPrimaryButton"),
  activityCaseReadyCloseButton: document.querySelector("#activityCaseReadyCloseButton"),
  caseWorkGuidance: document.querySelector("#caseWorkGuidance"),
  caseWorkGuidanceText: document.querySelector("#caseWorkGuidanceText"),
  caseTransitionPanel: document.querySelector("#caseTransitionPanel"),
  matchingDecisionSummary: document.querySelector("#matchingDecisionSummary"),
  caseTransitionTitle: document.querySelector("#caseTransitionTitle"),
  caseTransitionHelp: document.querySelector("#caseTransitionHelp"),
  caseTransitionStatus: document.querySelector("#caseTransitionStatus"),
  caseTransitionChoices: document.querySelector("#caseTransitionChoices"),
  matchingDetails: document.querySelector("#matchingDetails"),
  caseSecondaryDetails: document.querySelector("#caseSecondaryDetails"),
  caseSecondarySummary: document.querySelector("#caseSecondarySummary"),
  matchingOutcomeForm: document.querySelector("#matchingOutcomeForm"),
  parentMatchResponseInput: document.querySelector("#parentMatchResponseInput"),
  mentorMatchResponseInput: document.querySelector("#mentorMatchResponseInput"),
  matchingOutcomeNoteInput: document.querySelector("#matchingOutcomeNoteInput"),
  matchingProposalInput: document.querySelector("#matchingProposalInput"),
  createAssignmentAfterMatchInput: document.querySelector("#createAssignmentAfterMatchInput"),
  matchingOutcomeSubmitButton: document.querySelector("#matchingOutcomeSubmitButton"),
  assignmentFollowupTabItem: document.querySelector("#assignmentFollowupTabItem"),
  assignmentFollowupCount: document.querySelector("#assignmentFollowupCount"),
  assignmentNextStepStatus: document.querySelector("#assignmentNextStepStatus"),
  assignmentNextStepActions: document.querySelector("#assignmentNextStepActions"),
  assignmentFollowupDetails: document.querySelector("#assignmentFollowupDetails"),
  assignmentPlanForm: document.querySelector("#assignmentPlanForm"),
  assignmentPlanStatus: document.querySelector("#assignmentPlanStatus"),
  assignmentStartDateInput: document.querySelector("#assignmentStartDateInput"),
  assignmentEndDateInput: document.querySelector("#assignmentEndDateInput"),
  assignmentContactFrequencyInput: document.querySelector("#assignmentContactFrequencyInput"),
  assignmentContactModeInput: document.querySelector("#assignmentContactModeInput"),
  assignmentFirstFollowUpInput: document.querySelector("#assignmentFirstFollowUpInput"),
  assignmentFollowUpFrequencyInput: document.querySelector("#assignmentFollowUpFrequencyInput"),
  assignmentReportDeadlineInput: document.querySelector("#assignmentReportDeadlineInput"),
  assignmentPlanNoteInput: document.querySelector("#assignmentPlanNoteInput"),
  newMentorReportButton: document.querySelector("#newMentorReportButton"),
  mentorReportForm: document.querySelector("#mentorReportForm"),
  cancelMentorReportButton: document.querySelector("#cancelMentorReportButton"),
  mentorReportDateInput: document.querySelector("#mentorReportDateInput"),
  mentorReportDurationInput: document.querySelector("#mentorReportDurationInput"),
  mentorReportModeInput: document.querySelector("#mentorReportModeInput"),
  mentorReportOutcomeInput: document.querySelector("#mentorReportOutcomeInput"),
  mentorReportNextDateInput: document.querySelector("#mentorReportNextDateInput"),
  mentorReportSummaryInput: document.querySelector("#mentorReportSummaryInput"),
  mentorReportNeedsSupportInput: document.querySelector("#mentorReportNeedsSupportInput"),
  mentorReportsEmpty: document.querySelector("#mentorReportsEmpty"),
  mentorReportsTableWrap: document.querySelector("#mentorReportsTableWrap"),
  mentorReportsTableBody: document.querySelector("#mentorReportsTableBody"),
  newParentCheckInButton: document.querySelector("#newParentCheckInButton"),
  parentCheckInForm: document.querySelector("#parentCheckInForm"),
  cancelParentCheckInButton: document.querySelector("#cancelParentCheckInButton"),
  parentCheckInDateInput: document.querySelector("#parentCheckInDateInput"),
  parentCheckInModeInput: document.querySelector("#parentCheckInModeInput"),
  parentContactConfirmedInput: document.querySelector("#parentContactConfirmedInput"),
  parentCollaborationInput: document.querySelector("#parentCollaborationInput"),
  parentRelevanceInput: document.querySelector("#parentRelevanceInput"),
  parentSafetyInput: document.querySelector("#parentSafetyInput"),
  parentContinueInput: document.querySelector("#parentContinueInput"),
  parentCheckInNoteInput: document.querySelector("#parentCheckInNoteInput"),
  parentCheckInsEmpty: document.querySelector("#parentCheckInsEmpty"),
  parentCheckInsTableWrap: document.querySelector("#parentCheckInsTableWrap"),
  parentCheckInsTableBody: document.querySelector("#parentCheckInsTableBody"),
  compensationNextStepStatus: document.querySelector("#compensationNextStepStatus"),
  compensationNextStepActions: document.querySelector("#compensationNextStepActions"),
  compensationDetails: document.querySelector("#compensationDetails"),
  newCompensationPeriodButton: document.querySelector("#newCompensationPeriodButton"),
  compensationPeriodForm: document.querySelector("#compensationPeriodForm"),
  compensationReadinessChecklist: document.querySelector("#compensationReadinessChecklist"),
  cancelCompensationPeriodButton: document.querySelector("#cancelCompensationPeriodButton"),
  compensationPeriodFromInput: document.querySelector("#compensationPeriodFromInput"),
  compensationPeriodToInput: document.querySelector("#compensationPeriodToInput"),
  compensationPeriodsEmpty: document.querySelector("#compensationPeriodsEmpty"),
  compensationPeriodsTableWrap: document.querySelector("#compensationPeriodsTableWrap"),
  compensationPeriodsTableBody: document.querySelector("#compensationPeriodsTableBody"),
  caseTypeDetailsSection: document.querySelector("#caseTypeDetailsSection"),
  caseTypeDetailsTitle: document.querySelector("#caseTypeDetailsTitle"),
  caseTypeDetailsFacts: document.querySelector("#caseTypeDetailsFacts"),
  caseActivityForm: document.querySelector("#caseActivityForm"),
  cancelCaseActivityButton: document.querySelector("#cancelCaseActivityButton"),
  activityTitleInput: document.querySelector("#activityTitleInput"),
  activityOwnerInput: document.querySelector("#activityOwnerInput"),
  activityDueDateInput: document.querySelector("#activityDueDateInput"),
  activityNoteInput: document.querySelector("#activityNoteInput"),
  caseActivityTableBody: document.querySelector("#caseActivityTableBody"),
  activityProgressText: document.querySelector("#activityProgressText"),
  activityProgressBar: document.querySelector("#activityProgressBar"),
  activityOpenCount: document.querySelector("#activityOpenCount"),
  activityAttentionCount: document.querySelector("#activityAttentionCount"),
  activityFilteredCount: document.querySelector("#activityFilteredCount"),
  activityFilterButtons: document.querySelectorAll("[data-activity-filter]"),
  activityListPanel: document.querySelector("#activityListPanel"),
  activityDetailPanel: document.querySelector("#activityDetailPanel"),
  backToActivitiesButton: document.querySelector("#backToActivitiesButton"),
  activityDetailTitle: document.querySelector("#activityDetailTitle"),
  activityDetailContext: document.querySelector("#activityDetailContext"),
  activityDetailAudit: document.querySelector("#activityDetailAudit"),
  activityDetailStatus: document.querySelector("#activityDetailStatus"),
  activityDetailGuidance: document.querySelector("#activityDetailGuidance"),
  activityDetailGuidanceTitle: document.querySelector("#activityDetailGuidanceTitle"),
  activityDetailGuidanceText: document.querySelector("#activityDetailGuidanceText"),
  activityDetailGuidanceButton: document.querySelector("#activityDetailGuidanceButton"),
  activityWorkInputPanel: document.querySelector("#activityWorkInputPanel"),
  activityWorkInputTitle: document.querySelector("#activityWorkInputTitle"),
  activityWorkInputStatus: document.querySelector("#activityWorkInputStatus"),
  activityWorkInputHelp: document.querySelector("#activityWorkInputHelp"),
  activityWorkInputMeta: document.querySelector("#activityWorkInputMeta"),
  activityWorkInputLink: document.querySelector("#activityWorkInputLink"),
  activityDetailForm: document.querySelector("#activityDetailForm"),
  activityDetailStatusInput: document.querySelector("#activityDetailStatusInput"),
  activityDetailResultInput: document.querySelector("#activityDetailResultInput"),
  activityResultHelp: document.querySelector("#activityResultHelp"),
  activityDetailOwnerInput: document.querySelector("#activityDetailOwnerInput"),
  activityDetailDueDateInput: document.querySelector("#activityDetailDueDateInput"),
  activityWaitingForRow: document.querySelector("#activityWaitingForRow"),
  activityDetailWaitingForInput: document.querySelector("#activityDetailWaitingForInput"),
  activityDetailNoteRequirement: document.querySelector("#activityDetailNoteRequirement"),
  activityDetailNoteInput: document.querySelector("#activityDetailNoteInput"),
  activityDetailSaveState: document.querySelector("#activityDetailSaveState"),
  activityDetailSaveButton: document.querySelector("#activityDetailSaveButton"),
  reopenActivityButton: document.querySelector("#reopenActivityButton"),
  activityDeviationPanel: document.querySelector("#activityDeviationPanel"),
  activityDeviationHelp: document.querySelector("#activityDeviationHelp"),
  deviationOutcomeInput: document.querySelector("#deviationOutcomeInput"),
  deviationReasonInput: document.querySelector("#deviationReasonInput"),
  deviationResumeDateInput: document.querySelector("#deviationResumeDateInput"),
  deviationNoteInput: document.querySelector("#deviationNoteInput"),
  saveDeviationDecisionButton: document.querySelector("#saveDeviationDecisionButton"),
  activityDocumentsSummary: document.querySelector("#activityDocumentsSummary"),
  activityDocumentsList: document.querySelector("#activityDocumentsList"),
  addActivityDocumentButton: document.querySelector("#addActivityDocumentButton"),
  caseDocumentForm: document.querySelector("#caseDocumentForm"),
  documentActivityContext: document.querySelector("#documentActivityContext"),
  documentActivityInput: document.querySelector("#documentActivityInput"),
  documentTypeInput: document.querySelector("#documentTypeInput"),
  documentTitleInput: document.querySelector("#documentTitleInput"),
  documentDateInput: document.querySelector("#documentDateInput"),
  documentDescriptionInput: document.querySelector("#documentDescriptionInput"),
  documentFileInput: document.querySelector("#documentFileInput"),
  documentInformationClassInput: document.querySelector("#documentInformationClassInput"),
  caseDocumentsEmpty: document.querySelector("#caseDocumentsEmpty"),
  caseDocumentsList: document.querySelector("#caseDocumentsList"),
  newCaseMeetingButton: document.querySelector("#newCaseMeetingButton"),
  caseMeetingForm: document.querySelector("#caseMeetingForm"),
  caseMeetingFormTitle: document.querySelector("#caseMeetingFormTitle"),
  cancelCaseMeetingButton: document.querySelector("#cancelCaseMeetingButton"),
  caseMeetingTypeInput: document.querySelector("#caseMeetingTypeInput"),
  caseMeetingDateInput: document.querySelector("#caseMeetingDateInput"),
  caseMeetingModeInput: document.querySelector("#caseMeetingModeInput"),
  caseMeetingActivityInput: document.querySelector("#caseMeetingActivityInput"),
  caseMeetingSummaryInput: document.querySelector("#caseMeetingSummaryInput"),
  caseMeetingNextStepInput: document.querySelector("#caseMeetingNextStepInput"),
  caseMeetingsEmpty: document.querySelector("#caseMeetingsEmpty"),
  caseMeetingsList: document.querySelector("#caseMeetingsList"),
  caseEventTableBody: document.querySelector("#caseEventTableBody"),
  seedButton: document.querySelector("#seedButton"),
  exampleDataMenu: document.querySelector("#exampleDataMenu"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  dashboardNewCaseButton: document.querySelector("#dashboardNewCaseButton"),
  dashboardNewMentorButton: document.querySelector("#dashboardNewMentorButton"),
  cancelNewCaseButton: document.querySelector("#cancelNewCaseButton"),
  candidateForm: document.querySelector("#candidateForm"),
  candidateDuplicatePanel: document.querySelector("#candidateDuplicatePanel"),
  candidateNameInput: document.querySelector("#nameInput"),
  candidatePersonalNumberInput: document.querySelector("#personalNumberInput"),
  candidateTableBody: document.querySelector("#candidateTableBody"),
  mentorListTitle: document.querySelector("#mentorListTitle"),
  mentorListCount: document.querySelector("#mentorListCount"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  handlerListCount: document.querySelector("#handlerListCount"),
  handlerSearchInput: document.querySelector("#handlerSearchInput"),
  handlerStatusFilter: document.querySelector("#handlerStatusFilter"),
  handlerTableBody: document.querySelector("#handlerTableBody"),
  newHandlerButton: document.querySelector("#newHandlerButton"),
  handlerForm: document.querySelector("#handlerForm"),
  handlerModalTitle: document.querySelector("#handlerModalTitle"),
  handlerIdInput: document.querySelector("#handlerIdInput"),
  handlerNameInput: document.querySelector("#handlerNameInput"),
  handlerEmailInput: document.querySelector("#handlerEmailInput"),
  handlerRoleInput: document.querySelector("#handlerRoleInput"),
  handlerActiveInput: document.querySelector("#handlerActiveInput"),
  selectedHandlerName: document.querySelector("#selectedHandlerName"),
  selectedHandlerUserId: document.querySelector("#selectedHandlerUserId"),
  selectedHandlerStatus: document.querySelector("#selectedHandlerStatus"),
  selectedHandlerRoleMeta: document.querySelector("#selectedHandlerRoleMeta"),
  selectedHandlerCreatedMeta: document.querySelector("#selectedHandlerCreatedMeta"),
  selectedHandlerUpdatedMeta: document.querySelector("#selectedHandlerUpdatedMeta"),
  editHandlerButton: document.querySelector("#editHandlerButton"),
  handlerEditActions: document.querySelector("#handlerEditActions"),
  cancelHandlerEditButton: document.querySelector("#cancelHandlerEditButton"),
  toggleSelectedHandlerButton: document.querySelector("#toggleSelectedHandlerButton"),
  handlerReadView: document.querySelector("#handlerReadView"),
  handlerEditForm: document.querySelector("#handlerEditForm"),
  handlerNameFact: document.querySelector("#handlerNameFact"),
  handlerEmailFact: document.querySelector("#handlerEmailFact"),
  handlerRoleFact: document.querySelector("#handlerRoleFact"),
  handlerStatusFact: document.querySelector("#handlerStatusFact"),
  handlerAssignedFact: document.querySelector("#handlerAssignedFact"),
  handlerAssignedEditFact: document.querySelector("#handlerAssignedEditFact"),
  editHandlerNameInput: document.querySelector("#editHandlerNameInput"),
  editHandlerEmailInput: document.querySelector("#editHandlerEmailInput"),
  editHandlerRoleInput: document.querySelector("#editHandlerRoleInput"),
  editHandlerActiveInput: document.querySelector("#editHandlerActiveInput"),
  detailEmpty: document.querySelector("#detailEmpty"),
  candidateDetail: document.querySelector("#candidateDetail"),
  nextActionBar: document.querySelector("#nextActionBar"),
  nextActionTitle: document.querySelector("#nextActionTitle"),
  nextActionDescription: document.querySelector("#nextActionDescription"),
  openNextActionButton: document.querySelector("#openNextActionButton"),
  selectedCaseId: document.querySelector("#selectedCaseId"),
  selectedStatus: document.querySelector("#selectedStatus"),
  selectedName: document.querySelector("#selectedName"),
  selectedCoordinatorMeta: document.querySelector("#selectedCoordinatorMeta"),
  selectedRegisteredByMeta: document.querySelector("#selectedRegisteredByMeta"),
  selectedCreatedMeta: document.querySelector("#selectedCreatedMeta"),
  selectedUpdatedMeta: document.querySelector("#selectedUpdatedMeta"),
  recordMoreActions: document.querySelector("#recordMoreActions"),
  editPersonButton: document.querySelector("#editPersonButton"),
  personEditActions: document.querySelector("#personEditActions"),
  personReadView: document.querySelector("#personReadView"),
  personEditForm: document.querySelector("#personEditForm"),
  savePersonEditButton: document.querySelector("#savePersonEditButton"),
  cancelPersonEditButton: document.querySelector("#cancelPersonEditButton"),
  editNameInput: document.querySelector("#editNameInput"),
  mentorEditorDuplicatePanel: document.querySelector("#mentorEditorDuplicatePanel"),
  editPersonalNumberInput: document.querySelector("#editPersonalNumberInput"),
  editContactDetailsInput: document.querySelector("#editContactDetailsInput"),
  editInformationStatusInput: document.querySelector("#editInformationStatusInput"),
  editInterestNoteInput: document.querySelector("#editInterestNoteInput"),
  mentorSupportAreasRead: document.querySelector("#mentorSupportAreasRead"),
  mentorMatchingProfileMeta: document.querySelector("#mentorMatchingProfileMeta"),
  mentorSupportAreasEdit: document.querySelector("#mentorSupportAreasEdit"),
  editAreaInput: document.querySelector("#editAreaInput"),
  editLanguagesInput: document.querySelector("#editLanguagesInput"),
  editAvailabilityInput: document.querySelector("#editAvailabilityInput"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
  coordinatorFieldRow: document.querySelector("#coordinatorFieldRow"),
  nameFact: document.querySelector("#nameFact"),
  personalNumberFact: document.querySelector("#personalNumberFact"),
  contactDetailsFact: document.querySelector("#contactDetailsFact"),
  informationStatusFact: document.querySelector("#informationStatusFact"),
  interestNoteFact: document.querySelector("#interestNoteFact"),
  languageFact: document.querySelector("#languageFact"),
  availabilityFact: document.querySelector("#availabilityFact"),
  areaFact: document.querySelector("#areaFact"),
  statusFact: document.querySelector("#statusFact"),
  coordinatorFact: document.querySelector("#coordinatorFact"),
  identityMethodFact: document.querySelector("#identityMethodFact"),
  identityMethodEditFact: document.querySelector("#identityMethodEditFact"),
  nextStepFact: document.querySelector("#nextStepFact"),
  nextStepEditFact: document.querySelector("#nextStepEditFact"),
  checksTabCount: document.querySelector("#checksTabCount"),
  mentorCasesTabCount: document.querySelector("#mentorCasesTabCount"),
  mentorLearningTabCount: document.querySelector("#mentorLearningTabCount"),
  mentorLearningList: document.querySelector("#mentorLearningList"),
  mentorCaseTableBody: document.querySelector("#mentorCaseTableBody"),
  newMentorCaseButton: document.querySelector("#newMentorCaseButton"),
  meetingsTabCount: document.querySelector("#meetingsTabCount"),
  logTabCount: document.querySelector("#logTabCount"),
  checklist: document.querySelector("#checklist"),
  identityVerificationPanel: document.querySelector("#identityVerificationPanel"),
  mentorIdentityHost: document.querySelector("#mentorIdentityHost"),
  identityReadView: document.querySelector("#identityReadView"),
  identityEditView: document.querySelector("#identityEditView"),
  identityPersonalNumberFact: document.querySelector("#identityPersonalNumberFact"),
  identityMethodCheckFact: document.querySelector("#identityMethodCheckFact"),
  identityPersonalNumberInput: document.querySelector("#identityPersonalNumberInput"),
  identityMethodSelect: document.querySelector("#identityMethodSelect"),
  identityVerificationMeta: document.querySelector("#identityVerificationMeta"),
  identityVerifiedAtFact: document.querySelector("#identityVerifiedAtFact"),
  identityVerifiedByFact: document.querySelector("#identityVerifiedByFact"),
  identityNoteFact: document.querySelector("#identityNoteFact"),
  editIdentityVerificationButton: document.querySelector("#editIdentityVerificationButton"),
  cancelIdentityVerificationButton: document.querySelector("#cancelIdentityVerificationButton"),
  saveIdentityVerificationButton: document.querySelector("#saveIdentityVerificationButton"),
  interviewDateInput: document.querySelector("#interviewDateInput"),
  interviewModeInput: document.querySelector("#interviewModeInput"),
  interviewCompletion: document.querySelector("#interviewCompletion"),
  interviewDoneInput: document.querySelector("#interviewDoneInput"),
  interviewDoneMeta: document.querySelector("#interviewDoneMeta"),
  newMeetingButton: document.querySelector("#newMeetingButton"),
  meetingForm: document.querySelector("#meetingForm"),
  meetingFormTitle: document.querySelector("#meetingFormTitle"),
  cancelMeetingButton: document.querySelector("#cancelMeetingButton"),
  meetingTypeInput: document.querySelector("#meetingTypeInput"),
  meetingDateInput: document.querySelector("#meetingDateInput"),
  meetingModeInput: document.querySelector("#meetingModeInput"),
  meetingSummaryInput: document.querySelector("#meetingSummaryInput"),
  meetingNextStepInput: document.querySelector("#meetingNextStepInput"),
  meetingsEmpty: document.querySelector("#meetingsEmpty"),
  meetingsTableWrap: document.querySelector("#meetingsTableWrap"),
  meetingsTableBody: document.querySelector("#meetingsTableBody"),
  decisionHint: document.querySelector("#decisionHint"),
  approveButton: document.querySelector("#approveButton"),
  deleteButton: document.querySelector("#deleteButton"),
  auditLog: document.querySelector("#auditLog"),
  saveStatus: document.querySelector("#saveStatus"),
  feedbackToast: document.querySelector("#feedbackToast"),
  feedbackToastBody: document.querySelector("#feedbackToastBody"),
  caseLifecycleModal: document.querySelector("#caseLifecycleModal"),
  caseLifecycleForm: document.querySelector("#caseLifecycleForm"),
  caseLifecycleTitle: document.querySelector("#caseLifecycleTitle"),
  caseLifecycleDescription: document.querySelector("#caseLifecycleDescription"),
  caseLifecycleReasonInput: document.querySelector("#caseLifecycleReasonInput"),
  caseLifecycleResumeRow: document.querySelector("#caseLifecycleResumeRow"),
  caseLifecycleResumeInput: document.querySelector("#caseLifecycleResumeInput"),
  caseLifecycleNoteInput: document.querySelector("#caseLifecycleNoteInput"),
  caseLifecycleSubmitButton: document.querySelector("#caseLifecycleSubmitButton"),
  confirmActionModal: document.querySelector("#confirmActionModal"),
  confirmActionEyebrow: document.querySelector("#confirmActionEyebrow"),
  confirmActionTitle: document.querySelector("#confirmActionTitle"),
  confirmActionBody: document.querySelector("#confirmActionBody"),
  confirmActionSummary: document.querySelector("#confirmActionSummary"),
  confirmActionSubjectLabel: document.querySelector("#confirmActionSubjectLabel"),
  confirmActionMentor: document.querySelector("#confirmActionMentor"),
  confirmActionActor: document.querySelector("#confirmActionActor"),
  confirmActionTime: document.querySelector("#confirmActionTime"),
  confirmActionNote: document.querySelector("#confirmActionNote"),
  confirmActionAlternativeButton: document.querySelector("#confirmActionAlternativeButton"),
  confirmActionResultRow: document.querySelector("#confirmActionResultRow"),
  confirmActionResultInput: document.querySelector("#confirmActionResultInput"),
  confirmActionButton: document.querySelector("#confirmActionButton")
};

function markSaved() {
  const time = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
  els.saveStatus.textContent = `Senast sparad ${time}`;
}

function showFeedback(message) {
  els.feedbackToastBody.textContent = message;
  bootstrap.Toast.getOrCreateInstance(els.feedbackToast, { delay: 3200 }).show();
}

function clearCaseFormError() {
  els.caseFormFeedback.hidden = true;
  els.caseFormFeedback.textContent = "";
}

function showCaseFormError(message, field = null) {
  els.caseFormFeedback.textContent = message;
  els.caseFormFeedback.hidden = false;
  els.caseFormFeedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
  field?.focus({ preventScroll: true });
}

function confirmAction({ eyebrow = "Bekräfta ändring", title, body, mentorName, subjectLabel = "Mentor", subjectValue = "", confirmLabel = "Bekräfta", alternativeLabel = "", resultOptions = [], summaryItems = [], danger = false }) {
  if (!confirmActionModal) return Promise.resolve({ confirmed: window.confirm(body), note: "" });
  els.confirmActionEyebrow.textContent = eyebrow;
  els.confirmActionTitle.textContent = title;
  els.confirmActionBody.textContent = body;
  const summaryRows = summaryItems.filter((item) => item?.label && item?.value);
  els.confirmActionSummary.hidden = summaryRows.length === 0;
  els.confirmActionSummary.innerHTML = summaryRows.length
    ? `<strong>Det här sparas</strong><ul>${summaryRows.map((item) => `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></li>`).join("")}</ul>`
    : "";
  els.confirmActionSubjectLabel.textContent = subjectLabel;
  els.confirmActionMentor.textContent = subjectValue || mentorName || "Ej angivet";
  els.confirmActionActor.textContent = currentUserName();
  els.confirmActionTime.textContent = formatDateTime(new Date().toISOString());
  els.confirmActionNote.value = "";
  els.confirmActionResultRow.hidden = !resultOptions.length;
  els.confirmActionResultInput.required = Boolean(resultOptions.length);
  els.confirmActionResultInput.innerHTML = resultOptions.length
    ? `<option value="">Välj resultat</option>${resultOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`
    : "";
  els.confirmActionResultInput.value = "";
  els.confirmActionAlternativeButton.textContent = alternativeLabel;
  els.confirmActionAlternativeButton.hidden = !alternativeLabel;
  els.confirmActionButton.textContent = confirmLabel;
  els.confirmActionButton.classList.toggle("btn-danger", danger);
  els.confirmActionButton.classList.toggle("btn-primary", !danger);
  confirmActionModal.show();

  return new Promise((resolve) => {
    pendingConfirmation = resolve;
  });
}

function resolveConfirmation(value) {
  if (!pendingConfirmation) return false;
  if (value === "confirm" && !els.confirmActionResultRow.hidden && !els.confirmActionResultInput.reportValidity()) return false;
  const resolve = pendingConfirmation;
  pendingConfirmation = null;
  resolve({ action: value, confirmed: value === "confirm", note: value === "cancel" ? "" : els.confirmActionNote.value.trim(), resultCode: els.confirmActionResultInput.value });
  return true;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onblocked = () => {
      els.seedButton.disabled = true;
      els.seedButton.textContent = "Väntar på lokal lagring";
      els.saveStatus.textContent = "Stäng andra öppna prototypflikar och ladda om sidan";
    };

    request.onupgradeneeded = () => {
      const nextDb = request.result;
      const upgradeTransaction = request.transaction;
      const ensureStore = (name, options = { keyPath: "id" }) => nextDb.objectStoreNames.contains(name)
        ? upgradeTransaction.objectStore(name)
        : nextDb.createObjectStore(name, options);
      const ensureIndex = (store, name, keyPath, options = { unique: false }) => {
        if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
      };
      if (!nextDb.objectStoreNames.contains(STORE)) {
        nextDb.createObjectStore(STORE, { keyPath: "id" });
      }
      const parentStore = ensureStore(PARENTS_STORE);
      ensureIndex(parentStore, "tenantName", ["tenantId", "name"]);
      ensureIndex(parentStore, "tenantUpdatedAt", ["tenantId", "updatedAt"]);
      const incomingContactStore = ensureStore(INCOMING_CONTACTS_STORE);
      ensureIndex(incomingContactStore, "tenantOccurredAt", ["tenantId", "occurredAt"]);
      ensureIndex(incomingContactStore, "parentId", "parentId");
      ensureIndex(incomingContactStore, "caseId", "caseId");
      if (!nextDb.objectStoreNames.contains(HANDLERS_STORE)) {
        nextDb.createObjectStore(HANDLERS_STORE, { keyPath: "id" });
      }
      if (!nextDb.objectStoreNames.contains(MEETINGS_STORE)) {
        const meetingStore = nextDb.createObjectStore(MEETINGS_STORE, { keyPath: "id" });
        meetingStore.createIndex("mentorId", "mentorId", { unique: false });
      }
      if (!nextDb.objectStoreNames.contains(PRESENTATION_COMMENTS_STORE)) {
        const commentStore = nextDb.createObjectStore(PRESENTATION_COMMENTS_STORE, { keyPath: "id" });
        commentStore.createIndex("stepId", "stepId", { unique: false });
      }
      if (!nextDb.objectStoreNames.contains(CASES_STORE)) {
        nextDb.createObjectStore(CASES_STORE, { keyPath: "id" });
      }
      const caseStore = ensureStore(CASES_STORE);
      ensureIndex(caseStore, "mentorId", "mentorId");
      ensureIndex(caseStore, "tenantNumber", ["tenantId", "number"], { unique: true });
      ensureIndex(caseStore, "tenantStatus", ["tenantId", "status"]);
      ensureIndex(caseStore, "tenantMentor", ["tenantId", "mentorId"]);
      ensureIndex(caseStore, "parentId", "parentId");
      ensureIndex(caseStore, "supportCaseId", "supportCaseId");
      ensureIndex(caseStore, "tenantParent", ["tenantId", "parentId"]);
      ensureIndex(caseStore, "tenantOrganizationUnit", ["tenantId", "organizationUnitId"]);
      ensureIndex(caseStore, "tenantUpdatedAt", ["tenantId", "updatedAt"]);
      if (!nextDb.objectStoreNames.contains(CASE_ASSIGNMENTS_STORE)) {
        nextDb.createObjectStore(CASE_ASSIGNMENTS_STORE, { keyPath: "id" });
      }
      const assignmentStore = ensureStore(CASE_ASSIGNMENTS_STORE);
      ensureIndex(assignmentStore, "caseId", "caseId");
      ensureIndex(assignmentStore, "handlerId", "handlerId");
      ensureIndex(assignmentStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(assignmentStore, "tenantHandler", ["tenantId", "handlerId"]);
      if (!nextDb.objectStoreNames.contains(CASE_ACTIVITIES_STORE)) {
        nextDb.createObjectStore(CASE_ACTIVITIES_STORE, { keyPath: "id" });
      }
      const activityStore = ensureStore(CASE_ACTIVITIES_STORE);
      ensureIndex(activityStore, "caseId", "caseId");
      ensureIndex(activityStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(activityStore, "tenantStatus", ["tenantId", "status"]);
      ensureIndex(activityStore, "tenantHandler", ["tenantId", "handlerIdOverride"]);
      ensureIndex(activityStore, "tenantDueDate", ["tenantId", "dueDate"]);
      if (!nextDb.objectStoreNames.contains(CASE_DOCUMENTS_STORE)) {
        nextDb.createObjectStore(CASE_DOCUMENTS_STORE, { keyPath: "id" });
      }
      const documentStore = ensureStore(CASE_DOCUMENTS_STORE);
      ensureIndex(documentStore, "caseId", "caseId");
      ensureIndex(documentStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(documentStore, "tenantActivity", ["tenantId", "activityId"]);
      ensureIndex(documentStore, "tenantMeeting", ["tenantId", "meetingId"]);
      if (!nextDb.objectStoreNames.contains(CASE_EVENTS_STORE)) {
        nextDb.createObjectStore(CASE_EVENTS_STORE, { keyPath: "id" });
      }
      const eventStore = ensureStore(CASE_EVENTS_STORE);
      ensureIndex(eventStore, "caseId", "caseId");
      ensureIndex(eventStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(eventStore, "tenantOccurredAt", ["tenantId", "occurredAt"]);

      const deviationStore = ensureStore(ACTIVITY_DEVIATIONS_STORE);
      ensureIndex(deviationStore, "tenantActivity", ["tenantId", "activityId"]);
      ensureIndex(deviationStore, "tenantStatus", ["tenantId", "status"]);
      const decisionStore = ensureStore(DEVIATION_DECISIONS_STORE);
      ensureIndex(decisionStore, "tenantDeviation", ["tenantId", "deviationId"]);
      const caseMeetingStore = ensureStore(CASE_MEETINGS_STORE);
      ensureIndex(caseMeetingStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(caseMeetingStore, "tenantOccurredAt", ["tenantId", "occurredAt"]);
      const mentorReportStore = ensureStore(MENTOR_REPORTS_STORE);
      ensureIndex(mentorReportStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(mentorReportStore, "tenantOccurredOn", ["tenantId", "occurredOn"]);
      const parentCheckInStore = ensureStore(PARENT_CHECK_INS_STORE);
      ensureIndex(parentCheckInStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(parentCheckInStore, "tenantOccurredOn", ["tenantId", "occurredOn"]);
      const compensationPeriodStore = ensureStore(COMPENSATION_PERIODS_STORE);
      ensureIndex(compensationPeriodStore, "tenantCase", ["tenantId", "caseId"]);
      ensureIndex(compensationPeriodStore, "tenantStatus", ["tenantId", "status"]);
      const blobStore = ensureStore(CASE_DOCUMENT_BLOBS_STORE);
      ensureIndex(blobStore, "tenantDocument", ["tenantId", "documentId"], { unique: true });
      ensureStore(CASE_TYPE_DEFINITIONS_STORE, { keyPath: ["tenantId", "id", "version"] });
      ensureStore(ACTIVITY_TEMPLATE_DEFINITIONS_STORE, { keyPath: ["tenantId", "id", "version"] });
      ensureStore(PROCESSED_COMMANDS_STORE, { keyPath: ["tenantId", "idempotencyKey"] });
      ensureStore(LEARNING_CONTENT_STORE, { keyPath: ["id", "version"] });
      ensureStore(TENANT_LEARNING_SELECTION_STORE, { keyPath: ["tenantId", "contentId"] });
      ensureStore(LEARNING_PROGRESS_STORE, { keyPath: ["tenantId", "mentorId", "courseId"] });
      const publicSupportRequestStore = ensureStore(PUBLIC_SUPPORT_REQUESTS_STORE);
      ensureIndex(publicSupportRequestStore, "tenantCreatedAt", ["tenantId", "createdAt"]);
      ensureIndex(publicSupportRequestStore, "tenantStatus", ["tenantId", "status"]);
      const supportTicketStore = ensureStore(SUPPORT_TICKETS_STORE);
      ensureIndex(supportTicketStore, "tenantCreatedAt", ["tenantId", "createdAt"]);
      ensureIndex(supportTicketStore, "tenantStatus", ["tenantId", "status"]);
      ensureStore(TENANT_SUPPORT_AREA_SELECTION_STORE, { keyPath: ["tenantId", "supportAreaId"] });
      ensureStore(TENANT_SETTINGS_STORE, { keyPath: "tenantId" });
      const mentorProfileStore = ensureStore(MENTOR_MATCHING_PROFILES_STORE);
      ensureIndex(mentorProfileStore, "mentorId", "mentorId");
      ensureIndex(mentorProfileStore, "tenantMentor", ["tenantId", "mentorId"]);
      ensureIndex(mentorProfileStore, "tenantStatus", ["tenantId", "status"]);
      const mentorAreaStore = ensureStore(MENTOR_MATCHING_AREAS_STORE, { keyPath: ["profileId", "supportAreaId"] });
      ensureIndex(mentorAreaStore, "profileId", "profileId");
      ensureIndex(mentorAreaStore, "mentorId", "mentorId");
      const mentorLanguageStore = ensureStore(MENTOR_MATCHING_LANGUAGES_STORE, { keyPath: ["profileId", "languageId"] });
      ensureIndex(mentorLanguageStore, "profileId", "profileId");
      ensureIndex(mentorLanguageStore, "mentorId", "mentorId");
      const supportProfileStore = ensureStore(SUPPORT_MATCHING_PROFILES_STORE);
      ensureIndex(supportProfileStore, "supportCaseId", "supportCaseId");
      ensureIndex(supportProfileStore, "tenantSupportCase", ["tenantId", "supportCaseId"]);
      ensureIndex(supportProfileStore, "tenantStatus", ["tenantId", "status"]);
      const supportAreaStore = ensureStore(SUPPORT_MATCHING_AREAS_STORE, { keyPath: ["profileId", "supportAreaId"] });
      ensureIndex(supportAreaStore, "profileId", "profileId");
      ensureIndex(supportAreaStore, "supportCaseId", "supportCaseId");
      const supportLanguageStore = ensureStore(SUPPORT_MATCHING_LANGUAGES_STORE, { keyPath: ["profileId", "languageId"] });
      ensureIndex(supportLanguageStore, "profileId", "profileId");
      ensureIndex(supportLanguageStore, "supportCaseId", "supportCaseId");
      const snapshotStore = ensureStore(MATCHING_SNAPSHOTS_STORE);
      ensureIndex(snapshotStore, "matchingCaseId", "matchingCaseId", { unique: true });
      ensureIndex(snapshotStore, "tenantMatchingCase", ["tenantId", "matchingCaseId"], { unique: true });
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        els.seedButton.disabled = true;
        els.seedButton.textContent = "Ladda om sidan";
        els.saveStatus.textContent = "En ny prototypversion finns. Ladda om sidan.";
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function parentTx(mode = "readonly") {
  return db.transaction(PARENTS_STORE, mode).objectStore(PARENTS_STORE);
}

function incomingContactTx(mode = "readonly") {
  return db.transaction(INCOMING_CONTACTS_STORE, mode).objectStore(INCOMING_CONTACTS_STORE);
}

function handlerTx(mode = "readonly") {
  return db.transaction(HANDLERS_STORE, mode).objectStore(HANDLERS_STORE);
}

function meetingTx(mode = "readonly") {
  return db.transaction(MEETINGS_STORE, mode).objectStore(MEETINGS_STORE);
}

function presentationCommentTx(mode = "readonly") {
  return db.transaction(PRESENTATION_COMMENTS_STORE, mode).objectStore(PRESENTATION_COMMENTS_STORE);
}

function caseTx(mode = "readonly") {
  return db.transaction(CASES_STORE, mode).objectStore(CASES_STORE);
}

function caseAssignmentTx(mode = "readonly") {
  return db.transaction(CASE_ASSIGNMENTS_STORE, mode).objectStore(CASE_ASSIGNMENTS_STORE);
}

function caseActivityTx(mode = "readonly") {
  return db.transaction(CASE_ACTIVITIES_STORE, mode).objectStore(CASE_ACTIVITIES_STORE);
}

function caseDocumentTx(mode = "readonly") {
  return db.transaction(CASE_DOCUMENTS_STORE, mode).objectStore(CASE_DOCUMENTS_STORE);
}

function caseEventTx(mode = "readonly") {
  return db.transaction(CASE_EVENTS_STORE, mode).objectStore(CASE_EVENTS_STORE);
}

function activityDeviationTx(mode = "readonly") {
  return db.transaction(ACTIVITY_DEVIATIONS_STORE, mode).objectStore(ACTIVITY_DEVIATIONS_STORE);
}

function deviationDecisionTx(mode = "readonly") {
  return db.transaction(DEVIATION_DECISIONS_STORE, mode).objectStore(DEVIATION_DECISIONS_STORE);
}

function caseMeetingTx(mode = "readonly") {
  return db.transaction(CASE_MEETINGS_STORE, mode).objectStore(CASE_MEETINGS_STORE);
}

function mentorReportTx(mode = "readonly") {
  return db.transaction(MENTOR_REPORTS_STORE, mode).objectStore(MENTOR_REPORTS_STORE);
}

function parentCheckInTx(mode = "readonly") {
  return db.transaction(PARENT_CHECK_INS_STORE, mode).objectStore(PARENT_CHECK_INS_STORE);
}

function compensationPeriodTx(mode = "readonly") {
  return db.transaction(COMPENSATION_PERIODS_STORE, mode).objectStore(COMPENSATION_PERIODS_STORE);
}

function caseTypeDefinitionTx(mode = "readonly") {
  return db.transaction(CASE_TYPE_DEFINITIONS_STORE, mode).objectStore(CASE_TYPE_DEFINITIONS_STORE);
}

function activityTemplateDefinitionTx(mode = "readonly") {
  return db.transaction(ACTIVITY_TEMPLATE_DEFINITIONS_STORE, mode).objectStore(ACTIVITY_TEMPLATE_DEFINITIONS_STORE);
}

function learningContentTx(mode = "readonly") {
  return db.transaction(LEARNING_CONTENT_STORE, mode).objectStore(LEARNING_CONTENT_STORE);
}

function tenantLearningSelectionTx(mode = "readonly") {
  return db.transaction(TENANT_LEARNING_SELECTION_STORE, mode).objectStore(TENANT_LEARNING_SELECTION_STORE);
}

function learningProgressTx(mode = "readonly") {
  return db.transaction(LEARNING_PROGRESS_STORE, mode).objectStore(LEARNING_PROGRESS_STORE);
}

function publicSupportRequestTx(mode = "readonly") {
  return db.transaction(PUBLIC_SUPPORT_REQUESTS_STORE, mode).objectStore(PUBLIC_SUPPORT_REQUESTS_STORE);
}

function supportTicketTx(mode = "readonly") {
  return db.transaction(SUPPORT_TICKETS_STORE, mode).objectStore(SUPPORT_TICKETS_STORE);
}

function tenantSupportAreaSelectionTx(mode = "readonly") {
  return db.transaction(TENANT_SUPPORT_AREA_SELECTION_STORE, mode).objectStore(TENANT_SUPPORT_AREA_SELECTION_STORE);
}

function tenantSettingsTx(mode = "readonly") {
  return db.transaction(TENANT_SETTINGS_STORE, mode).objectStore(TENANT_SETTINGS_STORE);
}

function matchingStoreTx(storeName) {
  return (mode = "readonly") => db.transaction(storeName, mode).objectStore(storeName);
}

const mentorMatchingProfileTx = matchingStoreTx(MENTOR_MATCHING_PROFILES_STORE);
const mentorMatchingAreaTx = matchingStoreTx(MENTOR_MATCHING_AREAS_STORE);
const mentorMatchingLanguageTx = matchingStoreTx(MENTOR_MATCHING_LANGUAGES_STORE);
const supportMatchingProfileTx = matchingStoreTx(SUPPORT_MATCHING_PROFILES_STORE);
const supportMatchingAreaTx = matchingStoreTx(SUPPORT_MATCHING_AREAS_STORE);
const supportMatchingLanguageTx = matchingStoreTx(SUPPORT_MATCHING_LANGUAGES_STORE);
const matchingSnapshotTx = matchingStoreTx(MATCHING_SNAPSHOTS_STORE);

function getAllFrom(storeTx) {
  return new Promise((resolve, reject) => {
    const request = storeTx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putInto(storeTx, value) {
  return new Promise((resolve, reject) => {
    const request = storeTx("readwrite").put(value);
    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

function clearStore(storeTx) {
  return new Promise((resolve, reject) => {
    const request = storeTx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

const getAllCases = () => getAllFrom(caseTx);
const saveCase = (value) => putInto(caseTx, value);
const clearCases = () => clearStore(caseTx);
const getAllCaseAssignments = () => getAllFrom(caseAssignmentTx);
const saveCaseAssignment = (value) => putInto(caseAssignmentTx, value);
const clearCaseAssignments = () => clearStore(caseAssignmentTx);
const getAllCaseActivities = () => getAllFrom(caseActivityTx);
const saveCaseActivity = (value) => putInto(caseActivityTx, value);
const clearCaseActivities = () => clearStore(caseActivityTx);
const getAllCaseDocuments = () => getAllFrom(caseDocumentTx);
const saveCaseDocument = (value) => putInto(caseDocumentTx, value);
const clearCaseDocuments = () => clearStore(caseDocumentTx);
const getAllCaseEvents = () => getAllFrom(caseEventTx);
const saveCaseEvent = (value) => putInto(caseEventTx, value);
const clearCaseEvents = () => clearStore(caseEventTx);
const getAllActivityDeviations = () => getAllFrom(activityDeviationTx);
const getAllDeviationDecisions = () => getAllFrom(deviationDecisionTx);
const getAllCaseMeetings = () => getAllFrom(caseMeetingTx);
const getAllMentorReports = () => getAllFrom(mentorReportTx);
const clearMentorReports = () => clearStore(mentorReportTx);
const getAllParentCheckIns = () => getAllFrom(parentCheckInTx);
const clearParentCheckIns = () => clearStore(parentCheckInTx);
const getAllCompensationPeriods = () => getAllFrom(compensationPeriodTx);
const clearCompensationPeriods = () => clearStore(compensationPeriodTx);
const getAllCaseTypeDefinitions = () => getAllFrom(caseTypeDefinitionTx);
const saveCaseTypeDefinition = (value) => putInto(caseTypeDefinitionTx, value);
const getAllActivityTemplateDefinitions = () => getAllFrom(activityTemplateDefinitionTx);
const saveActivityTemplateDefinition = (value) => putInto(activityTemplateDefinitionTx, value);
const getAllParents = () => getAllFrom(parentTx);
const saveParent = (value) => putInto(parentTx, value);
const clearParents = () => clearStore(parentTx);
const getAllIncomingContacts = () => getAllFrom(incomingContactTx);
const saveIncomingContact = (value) => putInto(incomingContactTx, value);
const getAllLearningContent = () => getAllFrom(learningContentTx);
const saveLearningContent = (value) => putInto(learningContentTx, value);
const getAllTenantLearningSelection = () => getAllFrom(tenantLearningSelectionTx);
const saveTenantLearningSelection = (value) => putInto(tenantLearningSelectionTx, value);
const clearTenantLearningSelection = () => clearStore(tenantLearningSelectionTx);
const getAllLearningProgress = () => getAllFrom(learningProgressTx);
const saveLearningProgress = (value) => putInto(learningProgressTx, value);
const getAllPublicSupportRequests = () => getAllFrom(publicSupportRequestTx);
const savePublicSupportRequest = (value) => putInto(publicSupportRequestTx, value);
const clearPublicSupportRequests = () => clearStore(publicSupportRequestTx);
const getAllSupportTickets = () => getAllFrom(supportTicketTx);
const saveSupportTicket = (value) => putInto(supportTicketTx, value);
const clearSupportTickets = () => clearStore(supportTicketTx);
const getAllTenantSupportAreaSelections = () => getAllFrom(tenantSupportAreaSelectionTx);
const saveTenantSupportAreaSelection = (value) => putInto(tenantSupportAreaSelectionTx, value);
const clearTenantSupportAreaSelections = () => clearStore(tenantSupportAreaSelectionTx);
const getAllMentorMatchingProfiles = () => getAllFrom(mentorMatchingProfileTx);
const getAllMentorMatchingAreas = () => getAllFrom(mentorMatchingAreaTx);
const getAllMentorMatchingLanguages = () => getAllFrom(mentorMatchingLanguageTx);
const getAllSupportMatchingProfiles = () => getAllFrom(supportMatchingProfileTx);
const getAllSupportMatchingAreas = () => getAllFrom(supportMatchingAreaTx);
const getAllSupportMatchingLanguages = () => getAllFrom(supportMatchingLanguageTx);
const getAllMatchingSnapshots = () => getAllFrom(matchingSnapshotTx);
const getTenantSettings = () => new Promise((resolve, reject) => {
  const request = tenantSettingsTx().get(DEFAULT_TENANT_ID);
  request.onsuccess = () => resolve(request.result || null);
  request.onerror = () => reject(request.error);
});
const saveTenantSettings = (value) => putInto(tenantSettingsTx, value);

function currentCaseNumberYear() {
  return String(new Date().getFullYear()).slice(-2);
}

function defaultCaseNumberSettings() {
  return {
    tenantId: DEFAULT_TENANT_ID,
    caseNumberMode: "sequential",
    caseNumberYear: currentCaseNumberYear(),
    nextCaseSequence: 1,
    caseNumberCounterInitialized: false,
    updatedAt: null,
    updatedBy: "system"
  };
}

async function loadCaseNumberSettings() {
  caseNumberSettings = await getTenantSettings();
  if (!caseNumberSettings) {
    caseNumberSettings = defaultCaseNumberSettings();
    await saveTenantSettings(caseNumberSettings);
  }
  caseNumberSettings = {
    ...defaultCaseNumberSettings(),
    ...caseNumberSettings,
    caseNumberMode: caseNumberSettings.caseNumberMode === "random" ? "random" : "sequential",
    nextCaseSequence: Math.max(1, Number(caseNumberSettings.nextCaseSequence || 1))
  };
}

function formatSequentialCaseNumber(sequence, year = currentCaseNumberYear()) {
  return `FM-${year}-${String(sequence).padStart(5, "0")}`;
}

function existingCaseNumbers() {
  return new Set([
    ...cases.map((item) => item.number),
    ...candidates.map((item) => item.caseNumber)
  ].filter(Boolean));
}

function makeRandomCaseNumber(seed, reserved = existingCaseNumbers()) {
  const digits = String(seed || Date.now()).replace(/\D/g, "");
  const base = digits ? digits.slice(-4).padStart(4, "0") : randomDigits(4);
  let caseNumber = `FM-${base}-${randomDigits(3)}`;
  while (reserved.has(caseNumber)) caseNumber = `FM-${base}-${randomDigits(3)}`;
  return caseNumber;
}

async function synchronizeCaseNumberCounter() {
  if (!caseNumberSettings || caseNumberSettings.caseNumberMode !== "sequential") return;
  const year = currentCaseNumberYear();
  if (caseNumberSettings.caseNumberCounterInitialized && caseNumberSettings.caseNumberYear === year) return;
  const pattern = new RegExp(`^FM-${year}-(\\d{5})$`);
  const highest = [...existingCaseNumbers()].reduce((maximum, number) => {
    const match = String(number).match(pattern);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  const nextSequence = caseNumberSettings.caseNumberYear === year
    ? Math.max(caseNumberSettings.nextCaseSequence, highest + 1)
    : 1;
  caseNumberSettings = { ...caseNumberSettings, caseNumberYear: year, nextCaseSequence: nextSequence, caseNumberCounterInitialized: true };
  await saveTenantSettings(caseNumberSettings);
}

async function reserveCaseNumber() {
  if (!caseNumberSettings) await loadCaseNumberSettings();
  const reserved = existingCaseNumbers();
  if (caseNumberSettings.caseNumberMode === "random") return makeRandomCaseNumber(crypto.randomUUID(), reserved);

  const year = currentCaseNumberYear();
  let sequence = caseNumberSettings.caseNumberYear === year ? caseNumberSettings.nextCaseSequence : 1;
  let number = formatSequentialCaseNumber(sequence, year);
  while (reserved.has(number)) {
    sequence += 1;
    number = formatSequentialCaseNumber(sequence, year);
  }
  caseNumberSettings = {
    ...caseNumberSettings,
    caseNumberYear: year,
    nextCaseSequence: sequence + 1,
    caseNumberCounterInitialized: true,
    updatedAt: new Date().toISOString(),
    updatedBy: CURRENT_USER_ID
  };
  await saveTenantSettings(caseNumberSettings);
  return number;
}

function caseTypeById(id, version = null) {
  return (version ? caseTypeDefinitionVersions.find((definition) => definition.id === id && Number(definition.version) === Number(version)) : null)
    || caseTypeDefinitions.find((definition) => definition.id === id)
    || domainCaseTypeById(id);
}

function caseTypeByName(name) {
  return caseTypeDefinitions.find((definition) => definition.name === name)
    || domainCaseTypeByName(name);
}

async function loadSupportAreaSelection() {
  tenantSupportAreaSelection = (await getAllTenantSupportAreaSelections())
    .filter((selection) => selection.tenantId === DEFAULT_TENANT_ID);
  const knownIds = new Set(tenantSupportAreaSelection.map((selection) => selection.supportAreaId));
  const missing = defaultTenantSupportAreaSelections(DEFAULT_TENANT_ID, CURRENT_USER_ID)
    .filter((selection) => !knownIds.has(selection.supportAreaId));
  if (missing.length) {
    await Promise.all(missing.map(saveTenantSupportAreaSelection));
    tenantSupportAreaSelection = (await getAllTenantSupportAreaSelections())
      .filter((selection) => selection.tenantId === DEFAULT_TENANT_ID);
  }
}

function enabledSupportAreas() {
  return selectedSupportAreas(tenantSupportAreaSelection, "enabled");
}

function publicSupportAreas() {
  return selectedSupportAreas(tenantSupportAreaSelection, "public");
}

function supportAreaLabels(ids) {
  return normalizeSupportAreaIds(ids).map((id) => supportAreaById(id)?.title).filter(Boolean);
}

function renderSupportAreaChoices(host, selectedIds = [], { name = "supportArea", publicOnly = false, compact = false } = {}) {
  if (!host) return;
  const areas = publicOnly ? publicSupportAreas() : enabledSupportAreas();
  const selected = new Set(normalizeSupportAreaIds(selectedIds));
  host.innerHTML = SUPPORT_AREA_CATEGORIES.map((category) => {
    const categoryAreas = areas.filter((area) => area.categoryId === category.id);
    if (!categoryAreas.length) return "";
    return `<fieldset class="support-area-choice-group"><legend>${escapeHtml(category.label)}</legend><div class="support-area-choice-list">${categoryAreas.map((area) => `<label class="support-area-choice"><input class="form-check-input" type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(area.id)}" ${selected.has(area.id) ? "checked" : ""}><span><strong>${escapeHtml(area.title)}</strong>${compact ? "" : `<small>${escapeHtml(area.publicDescription)}</small>`}</span></label>`).join("")}</div></fieldset>`;
  }).join("");
}

function selectedSupportAreaIdsFrom(host, name = "supportArea") {
  if (!host) return [];
  return normalizeSupportAreaIds([...host.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value));
}

function normalizeMentorSupportAreas(entries) {
  const validLevels = new Set(MENTOR_EXPERIENCE_LEVELS.map(([id]) => id));
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => typeof entry === "string" ? { areaId: entry, experienceLevels: ["practical"], verified: false } : entry)
    .filter((entry) => supportAreaById(entry.areaId))
    .map((entry) => {
      const storedLevels = Array.isArray(entry.experienceLevels) ? entry.experienceLevels : [entry.experienceLevel];
      const experienceLevels = [...new Set(storedLevels.filter((level) => validLevels.has(level)))];
      return {
        areaId: entry.areaId,
        confidenceLevel: MENTOR_SUPPORT_CONFIDENCE_LEVELS.some(([id]) => id === entry.confidenceLevel) ? entry.confidenceLevel : "good",
        experienceLevels: experienceLevels.length ? experienceLevels : ["practical"],
        verified: Boolean(entry.verified),
        verifiedAt: entry.verifiedAt || null,
        verifiedBy: entry.verifiedBy || null
      };
    });
}

function renderMentorSupportAreaEditor(candidate = null) {
  if (!els.mentorSupportAreasEdit) return;
  const selected = new Map(normalizeMentorSupportAreas(candidate?.supportAreas).map((entry) => [entry.areaId, entry]));
  els.mentorSupportAreasEdit.innerHTML = SUPPORT_AREA_CATEGORIES.map((category) => {
    const enabledIds = new Set(enabledSupportAreas().map((area) => area.id));
    const areas = SUPPORT_AREAS.filter((area) => area.categoryId === category.id && (enabledIds.has(area.id) || selected.has(area.id)));
    if (!areas.length) return "";
    return `<fieldset class="mentor-support-area-group"><legend>${escapeHtml(category.label)}</legend>${areas.map((area) => {
      const entry = selected.get(area.id);
      return `<div class="mentor-support-area-row"><label><input class="form-check-input" type="checkbox" data-mentor-support-area="${escapeHtml(area.id)}" ${entry ? "checked" : ""}><span>${escapeHtml(area.title)}${enabledIds.has(area.id) ? "" : ' <small class="text-secondary">(inte längre i kommunens urval)</small>'}</span></label><div class="mentor-support-assessment" data-mentor-support-assessment="${escapeHtml(area.id)}" ${entry ? "" : "hidden"}><label class="mentor-confidence-field"><span>Trygghet att ge vardagsnära stöd</span><select class="form-select form-select-sm" data-mentor-confidence="${escapeHtml(area.id)}" ${entry ? "" : "disabled"}>${MENTOR_SUPPORT_CONFIDENCE_LEVELS.map(([id, label]) => `<option value="${id}" ${(entry?.confidenceLevel || "good") === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label><fieldset class="mentor-experience-bases"><legend>Vad bedömningen grundar sig på</legend>${MENTOR_EXPERIENCE_LEVELS.map(([id, label]) => `<label><input class="form-check-input" type="checkbox" value="${id}" data-mentor-experience-level="${escapeHtml(area.id)}" ${entry?.experienceLevels.includes(id) ? "checked" : ""} ${entry ? "" : "disabled"}><span>${escapeHtml(label)}</span></label>`).join("")}</fieldset></div></div>`;
    }).join("")}</fieldset>`;
  }).join("");
}

function mentorSupportAreasFromEditor() {
  if (!els.mentorSupportAreasEdit) return [];
  const previous = new Map(normalizeMentorSupportAreas(selectedCandidate()?.supportAreas).map((entry) => [entry.areaId, entry]));
  return [...els.mentorSupportAreasEdit.querySelectorAll("[data-mentor-support-area]:checked")].map((input) => ({
    areaId: input.dataset.mentorSupportArea,
    confidenceLevel: els.mentorSupportAreasEdit.querySelector(`[data-mentor-confidence="${input.dataset.mentorSupportArea}"]`)?.value || "good",
    experienceLevels: [...els.mentorSupportAreasEdit.querySelectorAll(`[data-mentor-experience-level="${input.dataset.mentorSupportArea}"]:checked`)].map((levelInput) => levelInput.value),
    verified: Boolean(previous.get(input.dataset.mentorSupportArea)?.verified),
    verifiedAt: previous.get(input.dataset.mentorSupportArea)?.verifiedAt || null,
    verifiedBy: previous.get(input.dataset.mentorSupportArea)?.verifiedBy || null
  }));
}

function validateMentorSupportAreaEditor() {
  if (!els.mentorSupportAreasEdit) return true;
  const areaInputs = [...els.mentorSupportAreasEdit.querySelectorAll("[data-mentor-support-area]")];
  areaInputs.forEach((input) => input.setCustomValidity(""));
  const missingBasis = areaInputs.find((input) => input.checked && !els.mentorSupportAreasEdit.querySelector(`[data-mentor-experience-level="${input.dataset.mentorSupportArea}"]:checked`));
  if (!missingBasis) return true;
  missingBasis.setCustomValidity("Välj minst en grund för erfarenheten inom området.");
  missingBasis.reportValidity();
  return false;
}

function renderMentorSupportAreas(candidate) {
  if (!els.mentorSupportAreasRead) return;
  const levelLabels = Object.fromEntries(MENTOR_EXPERIENCE_LEVELS);
  const confidenceLabels = Object.fromEntries(MENTOR_SUPPORT_CONFIDENCE_LEVELS);
  const entries = normalizeMentorSupportAreas(candidate?.supportAreas);
  els.mentorSupportAreasRead.innerHTML = entries.length
    ? entries.map((entry) => `<div class="support-area-fact"><strong>${escapeHtml(supportAreaById(entry.areaId)?.title || entry.areaId)}</strong><span>${escapeHtml(confidenceLabels[entry.confidenceLevel] || "God trygghet")} att ge stöd</span><small>${escapeHtml(entry.experienceLevels.map((level) => levelLabels[level]).filter(Boolean).join(" · "))}${entry.verified ? " · Verifierad" : " · Egen uppgift"}</small></div>`).join("")
    : '<p class="text-secondary mb-0">Inga erfarenhetsområden är registrerade.</p>';
}

async function loadCaseTypeDefinitions() {
  let stored = await getAllCaseTypeDefinitions();
  const storedIds = new Set(stored.filter((definition) => definition.tenantId === DEFAULT_TENANT_ID).map((definition) => definition.id));
  const missing = CASE_TYPE_DEFINITIONS.filter((definition) => !storedIds.has(definition.id));
  if (missing.length) {
    await Promise.all(missing.map((definition) => saveCaseTypeDefinition({
      ...definition,
      tenantId: DEFAULT_TENANT_ID,
      status: "published",
      activityTemplateRefs: (definition.activityTemplateIds || []).map((templateId) => ({ templateId, version: 1 }))
    })));
    stored = await getAllCaseTypeDefinitions();
  }
  caseTypeDefinitionVersions = stored.filter((definition) => definition.tenantId === DEFAULT_TENANT_ID);
  const storedById = new Map();
  for (const definition of caseTypeDefinitionVersions
    .filter((item) => item.status === "published")
    .sort((a, b) => Number(a.version || 1) - Number(b.version || 1))) {
    storedById.set(definition.id, normalizeCaseTypeTerminology(definition));
  }
  caseTypeDefinitions = CASE_TYPE_DEFINITIONS.map((fallback) => ({
    ...fallback,
    ...(storedById.get(fallback.id) || {}),
    name: fallback.name,
    creationMode: fallback.creationMode,
    ...(["incoming-contact", "parent-support", "matching", "mentor-assignment"].includes(fallback.id) ? {
      parentMode: fallback.parentMode,
      helpText: fallback.helpText,
      registrationHint: fallback.registrationHint,
      workInstruction: fallback.workInstruction,
      activityTemplateIds: fallback.activityTemplateIds || [],
      suggestedActivities: fallback.suggestedActivities || []
    } : {}),
    detailFieldIds: storedById.get(fallback.id)?.detailFieldIds || fallback.detailFieldIds || []
  }));
}

function activityTemplateDefinitionById(id) {
  return activityTemplateDefinitions.find((definition) => definition.id === id)
    || ACTIVITY_TEMPLATES.find((definition) => definition.id === id)
    || null;
}

async function loadActivityTemplateDefinitions() {
  let stored = await getAllActivityTemplateDefinitions();
  const tenantDefinitions = stored.filter((definition) => definition.tenantId === DEFAULT_TENANT_ID);
  const storedIds = new Set(tenantDefinitions.map((definition) => definition.id));
  const missing = ACTIVITY_TEMPLATES.filter((definition) => !storedIds.has(definition.id));
  if (missing.length) {
    await Promise.all(missing.map((definition, sortOrder) => saveActivityTemplateDefinition({
      ...definition,
      tenantId: DEFAULT_TENANT_ID,
      status: "published",
      sortOrder
    })));
    stored = await getAllActivityTemplateDefinitions();
  }
  activityTemplateDefinitionVersions = stored.filter((definition) => definition.tenantId === DEFAULT_TENANT_ID);
  const storedById = new Map();
  for (const definition of activityTemplateDefinitionVersions
    .filter((item) => item.status === "published")
    .sort((a, b) => Number(a.version || 1) - Number(b.version || 1))) {
    storedById.set(definition.id, definition);
  }
  activityTemplateDefinitions = ACTIVITY_TEMPLATES.map((fallback) => ({
    ...fallback,
    ...(storedById.get(fallback.id) || {}),
    title: fallback.title,
    results: fallback.results
  }));
}

async function loadLearningData() {
  let storedContent = await getAllLearningContent();
  const storedKeys = new Set(storedContent.map((item) => `${item.id}:${item.version}`));
  const missing = LEARNING_CONTENT.filter((item) => !storedKeys.has(`${item.id}:${item.version}`));
  if (missing.length) {
    await Promise.all(missing.map((item) => saveLearningContent({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedBy: item.updatedBy || "system"
    })));
    storedContent = await getAllLearningContent();
  }
  learningContentVersions = storedContent;
  const latestById = new Map();
  for (const item of [...storedContent].sort((a, b) => Number(a.version) - Number(b.version))) {
    if (item.status === "published") latestById.set(item.id, item);
  }
  learningContent = [...latestById.values()].sort((a, b) => a.title.localeCompare(b.title, "sv"));

  let tenantSelectionRecords = (await getAllTenantLearningSelection()).filter((item) => item.tenantId === DEFAULT_TENANT_ID);
  const selectionInitialized = tenantSelectionRecords.some((item) => item.contentId === LEARNING_SELECTION_INITIALIZED_ID);
  tenantLearningSelection = tenantSelectionRecords.filter((item) => item.contentId !== LEARNING_SELECTION_INITIALIZED_ID);
  if (!selectionInitialized) {
    const explicitDefaultIds = [...new Set([...DEFAULT_TENANT_LEARNING_SELECTION, ...DEFAULT_PUBLIC_LEARNING_SELECTION])];
    const effectiveIds = requiredLearningContentIds(learningContent, explicitDefaultIds);
    await Promise.all([saveTenantLearningSelection({
      tenantId: DEFAULT_TENANT_ID,
      contentId: LEARNING_SELECTION_INITIALIZED_ID,
      initializedAt: new Date().toISOString()
    }), ...effectiveIds.map((contentId) => {
      const item = learningContentById(learningContent, contentId);
      return saveTenantLearningSelection({
        tenantId: DEFAULT_TENANT_ID,
        contentId,
        selectedVersion: item.version,
        explicit: explicitDefaultIds.includes(contentId),
        public: DEFAULT_PUBLIC_LEARNING_SELECTION.includes(contentId),
        selectedAt: new Date().toISOString(),
        selectedBy: CURRENT_USER_ID
      });
    })]);
    tenantSelectionRecords = (await getAllTenantLearningSelection()).filter((item) => item.tenantId === DEFAULT_TENANT_ID);
    tenantLearningSelection = tenantSelectionRecords.filter((item) => item.contentId !== LEARNING_SELECTION_INITIALIZED_ID);
  }
  if (!tenantLearningSelection.some((selection) => typeof selection.public === "boolean")) {
    const existingById = new Map(tenantLearningSelection.map((selection) => [selection.contentId, selection]));
    await Promise.all(DEFAULT_PUBLIC_LEARNING_SELECTION.map((contentId) => {
      const item = learningContentById(learningContent, contentId);
      const existing = existingById.get(contentId);
      return saveTenantLearningSelection({
        tenantId: DEFAULT_TENANT_ID,
        contentId,
        selectedVersion: existing?.selectedVersion || item.version,
        explicit: true,
        public: true,
        selectedAt: existing?.selectedAt || new Date().toISOString(),
        selectedBy: existing?.selectedBy || CURRENT_USER_ID
      });
    }));
    tenantSelectionRecords = (await getAllTenantLearningSelection()).filter((item) => item.tenantId === DEFAULT_TENANT_ID);
    tenantLearningSelection = tenantSelectionRecords.filter((item) => item.contentId !== LEARNING_SELECTION_INITIALIZED_ID);
  }
  learningProgress = (await getAllLearningProgress()).filter((item) => item.tenantId === DEFAULT_TENANT_ID);
  if (isMentorSession()) {
    selectedLearnerId = currentUser().mentorId;
  } else if (!selectedLearnerId || !candidates.some((candidate) => candidate.id === selectedLearnerId)) {
    selectedLearnerId = candidates[0]?.id || "";
  }
}

function selectedLearningContent() {
  return tenantLearningSelection.map((selection) => learningContentVersions.find((item) => item.id === selection.contentId && Number(item.version) === Number(selection.selectedVersion)))
    .filter((item) => item?.status === "published");
}

function selectedPublicLearningContent() {
  const publicIds = new Set(tenantLearningSelection.filter((selection) => selection.public).map((selection) => selection.contentId));
  return selectedLearningContent().filter((item) => item.type === "material" && publicIds.has(item.id));
}

async function updateTenantLearningPublic(contentId, isPublic) {
  const existing = tenantLearningSelection.find((selection) => selection.contentId === contentId);
  const content = learningContentById(learningContent, contentId);
  if (!existing || content?.type !== "material") return;
  await saveTenantLearningSelection({
    ...existing,
    public: isPublic,
    publicUpdatedAt: new Date().toISOString(),
    publicUpdatedBy: CURRENT_USER_ID
  });
}

async function updateTenantLearningSelection(contentId, selected) {
  const explicitIds = new Set(tenantLearningSelection.filter((item) => item.explicit).map((item) => item.contentId));
  if (selected) explicitIds.add(contentId);
  else explicitIds.delete(contentId);
  const effectiveIds = requiredLearningContentIds(learningContent, [...explicitIds]);
  const previousById = new Map(tenantLearningSelection.map((item) => [item.contentId, item]));
  await clearTenantLearningSelection();
  await Promise.all([saveTenantLearningSelection({
    tenantId: DEFAULT_TENANT_ID,
    contentId: LEARNING_SELECTION_INITIALIZED_ID,
    initializedAt: new Date().toISOString()
  }), ...effectiveIds.map((id) => {
    const latest = learningContentById(learningContent, id);
    const previous = previousById.get(id);
    return saveTenantLearningSelection({
      tenantId: DEFAULT_TENANT_ID,
      contentId: id,
      selectedVersion: previous?.selectedVersion || latest.version,
      explicit: explicitIds.has(id),
      public: Boolean(previous?.public),
      selectedAt: previous?.selectedAt || new Date().toISOString(),
      selectedBy: previous?.selectedBy || CURRENT_USER_ID
    });
  })]);
}

const CASE_DATA_STORES = [
  CASES_STORE, CASE_ASSIGNMENTS_STORE, CASE_ACTIVITIES_STORE, CASE_DOCUMENTS_STORE, CASE_EVENTS_STORE,
  ACTIVITY_DEVIATIONS_STORE, DEVIATION_DECISIONS_STORE, CASE_MEETINGS_STORE, MENTOR_REPORTS_STORE,
  PARENT_CHECK_INS_STORE, COMPENSATION_PERIODS_STORE, CASE_DOCUMENT_BLOBS_STORE, PROCESSED_COMMANDS_STORE
];

const MATCHING_PROFILE_STORES = [
  MENTOR_MATCHING_PROFILES_STORE, MENTOR_MATCHING_AREAS_STORE, MENTOR_MATCHING_LANGUAGES_STORE,
  SUPPORT_MATCHING_PROFILES_STORE, SUPPORT_MATCHING_AREAS_STORE, SUPPORT_MATCHING_LANGUAGES_STORE,
  MATCHING_SNAPSHOTS_STORE
];

function clearStores(storeNames) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, "readwrite");
    for (const storeName of storeNames) transaction.objectStore(storeName).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function clearAllCaseData() {
  return clearStores(CASE_DATA_STORES);
}

function getAllCandidates() {
  return new Promise((resolve, reject) => {
    const request = tx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveCandidate(candidate) {
  return new Promise((resolve, reject) => {
    const request = tx("readwrite").put(candidate);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearCandidates() {
  return new Promise((resolve, reject) => {
    const request = tx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllHandlers() {
  return new Promise((resolve, reject) => {
    const request = handlerTx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveHandler(handler) {
  return new Promise((resolve, reject) => {
    const request = handlerTx("readwrite").put(handler);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearHandlers() {
  return new Promise((resolve, reject) => {
    const request = handlerTx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllMeetings() {
  return new Promise((resolve, reject) => {
    const request = meetingTx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveMeeting(meeting) {
  return new Promise((resolve, reject) => {
    const request = meetingTx("readwrite").put(meeting);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearMeetings() {
  return new Promise((resolve, reject) => {
    const request = meetingTx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearPresentationComments() {
  return new Promise((resolve, reject) => {
    const request = presentationCommentTx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function ensureDefaultHandlers() {
  const existing = await getAllHandlers();
  if (existing.length) return;
  const now = new Date().toISOString();
  await Promise.all(seedHandlers.map((handler) => saveHandler({
    ...handler,
    createdAt: now,
    updatedAt: now
  })));
}

function replaceCandidates(nextCandidates) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.clear();
    for (const candidate of nextCandidates) {
      store.put(candidate);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function replacePrototypeDataset(exampleCandidates, workflowRecords) {
  const storeNames = [STORE, PARENTS_STORE, INCOMING_CONTACTS_STORE, MEETINGS_STORE, LEARNING_PROGRESS_STORE, ...CASE_DATA_STORES, ...MATCHING_PROFILE_STORES];
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, "readwrite");
    for (const storeName of storeNames) transaction.objectStore(storeName).clear();
    const candidateStore = transaction.objectStore(STORE);
    for (const candidate of exampleCandidates) candidateStore.put(candidate);
    for (const [storeName, records] of Object.entries(workflowRecords)) {
      const store = transaction.objectStore(storeName);
      for (const record of records) store.put(record);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function exampleTemplates(count) {
  if (count === 1) return [singleMentorTemplate];
  if (count === 10) return seedCandidates10;

  return Array.from({ length: count }, (_, index) => {
    const template = seedCandidates[index % seedCandidates.length];
    const firstName = exampleFirstNames[index % exampleFirstNames.length];
    const lastName = exampleLastNames[Math.floor(index / exampleFirstNames.length) % exampleLastNames.length];
    return {
      ...template,
      name: `${firstName} ${lastName}`
    };
  });
}

const EXAMPLE_DATA_VERSION = 5;

function buildExampleDataset(count) {
  const now = new Date().toISOString();
  return exampleTemplates(count).map((candidate, index) => {
    const id = crypto.randomUUID();
    const identityVerified = Boolean(candidate.checks?.identityVerified);
    const assignedHandler = count === 1 || index % 2 === 1
      ? seedHandlers.find((handler) => handler.name === candidate.coordinator) || null
      : null;
    const coordinator = assignedHandler?.name || "";
    const checkMeta = buildCheckMeta(candidate.checks, {
      checkedAt: now,
      checkedBy: coordinator || "System",
      note: "Kontrollen är registrerad som sammanhängande prototypdata."
    });
    return {
      ...candidate,
      tenantId: DEFAULT_TENANT_ID,
      checks: { ...candidate.checks },
      checkMeta,
      id,
      coordinatorId: assignedHandler?.id || "",
      coordinator,
      personalNumber: makeExamplePersonalNumber(index),
      identityMethod: identityVerified ? (index % 2 === 0 ? "bankid" : "physical_id") : "",
      identityVerifiedAt: identityVerified ? now : "",
      identityVerifiedBy: identityVerified ? "Sara Lind" : "",
      supportAreas: [
        { areaId: SUPPORT_AREAS[index % SUPPORT_AREAS.length].id, confidenceLevel: "very_good", experienceLevels: index % 3 === 0 ? ["trained", "practical"] : ["practical"], verified: index % 4 === 0 },
        { areaId: SUPPORT_AREAS[(index + 3) % SUPPORT_AREAS.length].id, confidenceLevel: "good", experienceLevels: ["lived"], verified: false },
        { areaId: SUPPORT_AREAS[(index + 7) % SUPPORT_AREAS.length].id, confidenceLevel: index % 2 ? "some" : "good", experienceLevels: ["practical"], verified: false }
      ],
      meetingModes: index % 3 === 0 ? ["physical", "digital"] : index % 3 === 1 ? ["physical"] : ["digital", "phone"],
      availableAssignmentCapacity: candidate.status === "Godkänd" ? 1 + (index % 2) : 0,
      exampleData: true,
      exampleDataVersion: EXAMPLE_DATA_VERSION,
      exampleDatasetSize: count,
      caseNumber: formatSequentialCaseNumber(index + 1),
      history: [
        { at: now, text: "Ärende skapat som exempeldata", actor: "System" },
        { at: now, text: `Status satt till ${candidate.status}`, actor: "System" }
      ],
      createdAt: now,
      updatedAt: now
    };
  });
}

function buildExampleParentWorkflows(exampleCandidates, count) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const ownerIds = seedHandlers.map((handler) => handler.id);
  const supportType = caseTypeById("parent-support");
  const matchingType = caseTypeById("matching");
  const assignmentType = caseTypeById("mentor-assignment");
  const approvedMentors = exampleCandidates.filter((candidate) => candidate.status === "Godkänd");
  const parentCount = count === 1 ? 1 : count === 10 ? 5 : 60;
  const supportExamples = [
    ["Stöd kring skolfrånvaro", "En fungerande plan för skolnärvaro och kontakt med skolan", ["school-absence", "school-contact"]],
    ["Stöd i samhällskontakter", "Ökad förståelse för kontakter och beslut", ["community-services"]],
    ["Stöd kring vardagsrutiner", "Hållbara rutiner som fungerar för föräldern", ["everyday-routines", "npf-everyday-support"]],
    ["Stöd att hitta lokala sammanhang", "Ökad kännedom om lokala verksamheter och nätverk", ["social-network", "community-services"]],
    ["Stöd i föräldrarollen", "Stärkt trygghet i vardagliga föräldrasituationer", ["boundaries", "understand-behavior"]]
  ];
  const parentNames = ["Nora Mahmoud", "Emil Svensson", "Leila Hassan", "Johan Berg", "Mariam Ali", "Sofia Nilsson", "Ahmed Rahimi", "Elin Karlsson"];
  const records = {
    [PARENTS_STORE]: [], [INCOMING_CONTACTS_STORE]: [], [CASES_STORE]: [], [CASE_ASSIGNMENTS_STORE]: [], [CASE_ACTIVITIES_STORE]: [],
    [CASE_DOCUMENTS_STORE]: [], [CASE_EVENTS_STORE]: [], [ACTIVITY_DEVIATIONS_STORE]: [], [CASE_MEETINGS_STORE]: [],
    [MENTOR_REPORTS_STORE]: [], [PARENT_CHECK_INS_STORE]: [], [COMPENSATION_PERIODS_STORE]: []
  };
  let nextExampleSequence = count + 1;
  const nextExampleCaseNumber = () => formatSequentialCaseNumber(nextExampleSequence++);
  const addAssignment = (caseId, handlerId) => records[CASE_ASSIGNMENTS_STORE].push({ id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, handlerId, role: "responsible", version: 1, assignedAt: now, assignedBy: handlerId, endedAt: null, endedBy: null });
  const matchingDemoNotes = {
    matchingEligibility: "Mentorn är godkänd och tillgänglig. Stödområden, språk och praktiska förutsättningar har jämförts med stödärendet.",
    matchingProposal: "Förslaget har dokumenterats utifrån stödbehov, erfarenhetsområden och praktiska förutsättningar.",
    matchingMentorContact: "Mentorn har fått information om uppdragets syfte och praktiska ramar.",
    matchingFirstMeeting: "Tid och kontaktform för det första mötet har bekräftats med parterna.",
    matchingPartyResponses: "Parternas svar har registrerats var för sig i matchningsärendet.",
    matchingDecision: "Det samlade matchningsutfallet har registrerats i ärendet."
  };
  const workflowDemoNotes = {
    "Komplettera stödbehov och matchningskriterier": "Stödets syfte, önskat resultat, stödområden och praktiska förutsättningar har stämts av med föräldern.",
    "Bekräfta att föräldern vill gå vidare": "Föräldern har bekräftat att hen vill gå vidare till matchning.",
    "Bekräfta uppdragets ramar": "Uppdragets period, kontaktfrekvens, kontaktform och första uppföljning har överenskommits.",
    "Genomför första avstämning": "Föräldern har kontaktats och bekräftat att kontakten med mentorn har kommit igång.",
    "Följ upp efter fyra veckor": "Uppföljningen visar att kontakten fortsätter enligt plan.",
    "Sammanställ mötes- och ersättningsunderlag": "Mentorns rapport och förälderns återkoppling har jämförts för aktuell ersättningsperiod.",
    "Utvärdera och avsluta uppdraget": "Uppdragets resultat har stämts av med föräldern och mentorn."
  };
  const activityKey = (templateId, title) => templateId === AD_HOC_ACTIVITY_TEMPLATE_ID ? title : templateId;
  const addServiceNote = (caseId, activity, description, createdBy) => {
    if (!description) return;
    records[CASE_DOCUMENTS_STORE].push({
      id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, activityId: activity.id, meetingId: null,
      type: "service_note", title: `Tjänsteanteckning: ${activity.title}`, description,
      documentDate: today, storageObjectId: null, mimeType: null, sizeBytes: null, checksum: null,
      informationClass: "normal", supersedesDocumentId: null, createdAt: now, createdBy
    });
  };
  const addActivities = (caseId, type, {
    completed = [], inProgress = [], waiting = [], notApplicable = [], resultCodes = {}, notes = {}, completedBy = CURRENT_USER_ID
  } = {}) => {
    const configuredActivities = [
      ...(type.activityTemplateIds || []).map((templateId) => {
        const template = activityTemplateById(templateId);
        return { templateId, title: template.title };
      }),
      ...(type.suggestedActivities || []).map((title) => ({ templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, title }))
    ];
    const completedKeys = new Set(completed);
    const inProgressKeys = new Set(inProgress);
    const waitingKeys = new Set(waiting);
    const notApplicableKeys = new Set(notApplicable);
    const activities = configuredActivities.map(({ templateId, title }, sortOrder) => {
      const key = activityKey(templateId, title);
      const status = completedKeys.has(key)
        ? "completed"
        : inProgressKeys.has(key)
          ? "in_progress"
          : waitingKeys.has(key)
            ? "waiting"
            : notApplicableKeys.has(key)
              ? "not_applicable"
              : "not_started";
      const resultCode = status === "completed"
        ? resultCodes[key] || activityTemplateById(templateId).results[0]?.[0] || "completed"
        : null;
      const activity = {
        id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, templateId, templateVersion: 1, title,
        status, resultCode,
        resultClassification: status === "completed" ? resultClassification(templateId, resultCode) : null,
        handlerIdOverride: null, waitingForParty: status === "waiting" ? "external" : null,
        dueDate: status === "waiting" ? today : null, sortOrder, version: 1,
        createdAt: now, createdBy: completedBy, updatedAt: now, updatedBy: completedBy,
        completedAt: status === "completed" ? now : null, completedBy: status === "completed" ? completedBy : null
      };
      if (status === "completed") addServiceNote(caseId, activity, notes[key] || matchingDemoNotes[key] || workflowDemoNotes[key], completedBy);
      return activity;
    });
    records[CASE_ACTIVITIES_STORE].push(...activities);
    return activities;
  };
  const addEvent = (caseId, eventType, message) => records[CASE_EVENTS_STORE].push(caseEventRecord({ caseId, eventType, entityType: "case", entityId: caseId, message, idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now }));

  for (let parentIndex = 0; parentIndex < parentCount; parentIndex += 1) {
    const parentId = crypto.randomUUID();
    const ownerId = ownerIds[parentIndex % ownerIds.length];
    const baseName = parentNames[parentIndex % parentNames.length];
    const parentName = parentIndex < parentNames.length ? baseName : `${baseName} ${parentIndex + 1}`;
    const parent = {
      id: parentId, tenantId: DEFAULT_TENANT_ID, name: parentName,
      contactDetails: `070-555 ${String(1000 + parentIndex).slice(-4)}`,
      informationStatus: "provided", area: ["Centrum", "Öster", "Väster", "Norr", "Söder"][parentIndex % 5],
      languages: parentIndex % 3 === 0 ? "Svenska, arabiska" : "Svenska",
      availability: parentIndex % 2 ? "Vardagskvällar" : "Dagtid",
      active: true, version: 1, createdAt: now, createdBy: ownerId, updatedAt: now, updatedBy: ownerId,
      exampleData: true, exampleDataVersion: EXAMPLE_DATA_VERSION, exampleDatasetSize: count
    };
    records[PARENTS_STORE].push(parent);

    const needsForParent = count > 1 && parentIndex % 4 === 0 ? 2 : 1;
    for (let needIndex = 0; needIndex < needsForParent; needIndex += 1) {
      const workflowIndex = records[CASES_STORE].filter((item) => item.caseTypeId === "parent-support").length;
      const [supportPurpose, desiredOutcome, supportAreaIds] = supportExamples[(parentIndex + needIndex) % supportExamples.length];
      const phase = count === 1 ? 0 : workflowIndex % 5;
      const supportProfileComplete = phase !== 2;
      const supportCaseId = crypto.randomUUID();
      const supportNumber = nextExampleCaseNumber();
      const supportCase = {
        id: supportCaseId, tenantId: DEFAULT_TENANT_ID, number: supportNumber,
        caseTypeId: supportType.id, caseTypeVersion: supportType.version,
        organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID, type: supportType.name,
        title: supportPurpose, description: `Föräldern önskar ${supportPurpose.toLowerCase()}.`,
        details: {
          supportPurpose,
          desiredOutcome: supportProfileComplete ? desiredOutcome : "",
          supportAreaIds: supportProfileComplete ? [...supportAreaIds] : [supportAreaIds[0]],
          supportAreaStatus: supportProfileComplete ? "confirmed" : "preliminary",
          area: parent.area,
          languages: parent.languages,
          availability: parent.availability,
          preferredMeetingModes: parentIndex % 2 ? ["digital", "phone"] : ["physical", "phone"],
          sharedExperiencePreference: parentIndex % 3 === 0 ? "important" : "helpful",
          complementarySupport: parentIndex % 4 === 0
            ? { active: true, area: "Skola eller vård", note: "Mentorn ska vara ett kompletterande vardagsstöd, inte ersätta professionella insatser." }
            : { active: false, area: "", note: "" }
        },
        mentorId: null, parentId, supportCaseId: null, sourceMatchingCaseId: null,
        status: supportProfileComplete ? "closed" : "in_progress", priority: "normal", dueDate: null, version: 1,
        createdAt: now, createdBy: ownerId, updatedAt: now, updatedBy: ownerId,
        closedAt: supportProfileComplete ? now : null, closedBy: supportProfileComplete ? ownerId : null,
        exampleData: true, exampleDataVersion: EXAMPLE_DATA_VERSION
      };
      records[CASES_STORE].push(supportCase);
      addAssignment(supportCaseId, ownerId);
      addActivities(supportCaseId, supportType, {
        completed: supportProfileComplete ? supportType.suggestedActivities : [],
        inProgress: supportProfileComplete ? [] : [supportType.suggestedActivities[0]],
        completedBy: ownerId
      });
      addEvent(supportCaseId, "case_created", `Stödärendet ${supportNumber} registrerades som prototypdata`);

      if (phase === 2 || !approvedMentors.length) continue;
      const mentor = approvedMentors[workflowIndex % approvedMentors.length];
      const matchingCaseId = crypto.randomUUID();
      const matchingNumber = nextExampleCaseNumber();
      const accepted = phase === 0 || phase === 4;
      const declined = phase === 3;
      const matchingCase = {
        id: matchingCaseId, tenantId: DEFAULT_TENANT_ID, number: matchingNumber,
        caseTypeId: matchingType.id, caseTypeVersion: matchingType.version,
        organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID, type: matchingType.name,
        title: `Matchning för ${supportPurpose}`,
        description: "Pröva föreslagen mentor mot det avgränsade stödbehovet.",
        details: {
          matchingProposal: `${mentor.name} föreslås eftersom registrerade stödområden och praktiska förutsättningar överlappar förälderns behov. Handläggaren ska bekräfta förslaget med båda parter.`,
          parentResponse: accepted ? "accepted" : declined ? "declined" : "accepted",
          mentorResponse: accepted ? "accepted" : declined ? "declined" : "waiting",
          matchingOutcome: accepted ? "accepted" : declined ? "declined" : "pending",
          matchingNote: accepted
            ? "Båda parter har accepterat samma förslag."
            : declined
              ? "Föräldern och mentorn har tackat nej till förslaget. Ett nytt förslag kan registreras i ett nytt matchningsärende."
              : "Föräldern har accepterat. Mentorns svar inväntas."
        },
        mentorId: mentor.id, parentId, supportCaseId, sourceMatchingCaseId: null,
        status: accepted || declined ? "closed" : "waiting", priority: "normal", dueDate: accepted || declined ? null : today,
        version: 1, createdAt: now, createdBy: ownerId, updatedAt: now, updatedBy: ownerId,
        closedAt: accepted || declined ? now : null, closedBy: accepted || declined ? ownerId : null,
        exampleData: true, exampleDataVersion: EXAMPLE_DATA_VERSION
      };
      records[CASES_STORE].push(matchingCase);
      addAssignment(matchingCaseId, ownerId);
      const matchingCompleted = accepted
        ? matchingType.activityTemplateIds
        : declined
          ? matchingType.activityTemplateIds.filter((templateId) => templateId !== "matchingFirstMeeting")
          : ["matchingEligibility", "matchingProposal"];
      const matchingActivities = addActivities(matchingCaseId, matchingType, {
        completed: matchingCompleted,
        waiting: accepted || declined ? [] : ["matchingMentorContact", "matchingFirstMeeting", "matchingPartyResponses", "matchingDecision"],
        notApplicable: declined ? ["matchingFirstMeeting"] : [],
        resultCodes: declined ? {
          matchingMentorContact: "mentor_declines",
          matchingPartyResponses: "both_decline",
          matchingDecision: "match_rejected"
        } : {},
        completedBy: ownerId
      });
      const firstMeetingActivity = matchingActivities.find((activity) => activity.templateId === "matchingFirstMeeting");
      if (accepted && firstMeetingActivity) {
        records[CASE_MEETINGS_STORE].push({
          id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: matchingCaseId, activityId: firstMeetingActivity.id,
          meetingType: "other", occurredAt: now, mode: parentIndex % 2 ? "digital" : "physical",
          summary: "Första mötet är bokat och praktiska förutsättningar har bekräftats med båda parter.",
          nextStep: "Mentoruppdraget kan planeras när matchningen har avslutats.",
          participantHandlerIds: [ownerId], externalParticipantNames: [], supersedesMeetingId: null,
          supersededByMeetingId: null, version: 1, createdAt: now, createdBy: ownerId, updatedAt: now, updatedBy: ownerId
        });
      }
      addEvent(matchingCaseId, "case_created", `Matchningen ${matchingNumber} skapades från ${supportNumber}`);
      if (!accepted) continue;

      const assignmentCaseId = crypto.randomUUID();
      const assignmentNumber = nextExampleCaseNumber();
      const concern = phase === 4;
      const assignmentCase = {
        id: assignmentCaseId, tenantId: DEFAULT_TENANT_ID, number: assignmentNumber,
        caseTypeId: assignmentType.id, caseTypeVersion: assignmentType.version,
        organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID, type: assignmentType.name,
        title: `Mentoruppdrag: ${supportPurpose}`, description: desiredOutcome,
        details: {
          supportPurpose, desiredOutcome, supportAreaIds: [...supportAreaIds],
          assignmentPlan: {
            startDate: monthStart, endDate: `${today.slice(0, 4)}-12-31`, contactFrequency: "weekly",
            contactMode: parentIndex % 2 ? "digital" : "physical", firstFollowUpDate: today,
            followUpFrequency: "monthly", reportDeadlineDays: 3,
            note: "Mentorn kontaktar handläggaren vid avvikelse, oro eller tydligt förändrat stödbehov.",
            updatedAt: now, updatedBy: ownerId
          }
        },
        mentorId: mentor.id, parentId, supportCaseId, sourceMatchingCaseId: matchingCaseId,
        status: concern ? "decision_required" : "in_progress", priority: concern ? "high" : "normal",
        dueDate: null, version: 1, createdAt: now, createdBy: ownerId, updatedAt: now, updatedBy: ownerId,
        closedAt: null, closedBy: null, exampleData: true, exampleDataVersion: EXAMPLE_DATA_VERSION
      };
      records[CASES_STORE].push(assignmentCase);
      addAssignment(assignmentCaseId, ownerId);
      const assignmentActivities = addActivities(assignmentCaseId, assignmentType, {
        completed: concern
          ? assignmentType.suggestedActivities.slice(0, 3)
          : assignmentType.suggestedActivities.slice(0, 2),
        inProgress: concern ? [] : [assignmentType.suggestedActivities[2]],
        resultCodes: concern ? { [assignmentType.suggestedActivities[2]]: "not_completed" } : {},
        notes: concern ? {
          [assignmentType.suggestedActivities[2]]: "Föräldern beskriver oro kring kontakten. Uppdraget pausas i väntan på samordnarens bedömning."
        } : {},
        completedBy: ownerId
      });
      const firstCheckInActivity = assignmentActivities.find((activity) => activity.title === "Genomför första avstämning");
      const reportActivity = assignmentActivities.find((activity) => activity.title === "Sammanställ mötes- och ersättningsunderlag");
      const concernActivity = assignmentActivities.find((activity) => activity.title === "Följ upp efter fyra veckor");
      if (concern && concernActivity) {
        records[ACTIVITY_DEVIATIONS_STORE].push({
          id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: assignmentCaseId,
          activityId: concernActivity.id, activityCompletionEventId: null, resultCode: "not_completed",
          status: "open", version: 1, openedAt: now, openedBy: ownerId,
          resolvedAt: null, resolvedBy: null, activeDecisionId: null
        });
      }
      addEvent(assignmentCaseId, "assignment_created_from_matching", `Uppdraget ${assignmentNumber} skapades från ${matchingNumber}`);
      records[MENTOR_REPORTS_STORE].push({
        id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: assignmentCaseId,
        activityId: reportActivity?.id || null, mentorId: mentor.id, occurredOn: today,
        durationMinutes: concern ? 45 : 90, mode: parentIndex % 2 ? "digital" : "physical",
        outcome: "completed", nextContactOn: null,
        summary: concern
          ? "Kontakten genomfördes men mentorn önskar stöd från handläggaren."
          : "Planerad kontakt genomfördes enligt uppdragsplanen.",
        needsHandlerSupport: concern, reportedByMentorId: mentor.id, recordedBy: ownerId,
        createdAt: now, createdBy: ownerId
      });
      records[PARENT_CHECK_INS_STORE].push({
        id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: assignmentCaseId,
        activityId: firstCheckInActivity?.id || null, parentId, occurredOn: today, mode: "phone",
        contactConfirmed: concern ? "partly" : "yes", collaboration: concern ? "issues" : "well",
        relevance: "yes", safety: concern ? "concern" : "safe", continueStatus: concern ? "pause" : "continue",
        note: concern
          ? "Föräldern beskriver oro. Samordnaren behöver bedöma fortsatt kontakt."
          : "Kontakten fungerar enligt uppdragsplanen.",
        createdAt: now, createdBy: ownerId
      });
      records[COMPENSATION_PERIODS_STORE].push({ id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: assignmentCaseId, periodFrom: monthStart, periodTo: monthEnd, status: concern ? "needs_completion" : "under_review", version: 1, createdAt: now, createdBy: ownerId, updatedAt: now, updatedBy: ownerId });
    }
  }

  for (const mentor of exampleCandidates) {
    const caseId = `cert-${mentor.id}`;
    const createdBy = mentor.coordinatorId || "system";
    for (const [key, title] of CERTIFICATION_ACTIVITIES) {
      if (certificationActivityState(mentor, key) !== "completed") continue;
      const activityId = `${caseId}-${key}`;
      const meta = certificationActivityMeta(mentor, key);
      records[CASE_DOCUMENTS_STORE].push({
        id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, activityId, meetingId: null,
        type: "service_note", title: `Tjänsteanteckning: ${title}`,
        description: meta.note || `${title} har genomförts och registrerats i prototypdatan.`,
        documentDate: (meta.completedAt || now).slice(0, 10), storageObjectId: null, mimeType: null,
        sizeBytes: null, checksum: null, informationClass: "normal", supersedesDocumentId: null,
        createdAt: meta.completedAt || now, createdBy
      });
    }
    if (mentor.checks?.interviewDone) {
      records[CASE_MEETINGS_STORE].push({
        id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId,
        activityId: `${caseId}-interviewDone`, meetingType: "certification_interview",
        occurredAt: mentor.interviewDate || mentor.updatedAt || now,
        mode: mentor.interviewMode || "physical",
        summary: mentor.notes || "Intervjun har genomförts. Erfarenhet, motivation, gränsdragning och tillgänglighet har gåtts igenom.",
        nextStep: mentor.status === "Godkänd" ? "Beslut om godkännande är registrerat." : "Slutför återstående kontroller.",
        participantHandlerIds: mentor.coordinatorId ? [mentor.coordinatorId] : [], externalParticipantNames: [],
        supersedesMeetingId: null, supersededByMeetingId: null, version: 1,
        createdAt: mentor.updatedAt || now, createdBy, updatedAt: mentor.updatedAt || now, updatedBy: createdBy
      });
    }
  }
  return records;
}

async function loadCaseData() {
  [cases, caseAssignments, caseActivities, caseDocuments, caseEvents, activityDeviations, deviationDecisions, caseMeetings, mentorReports, parentCheckIns, compensationPeriods] = await Promise.all([
    getAllCases(),
    getAllCaseAssignments(),
    getAllCaseActivities(),
    getAllCaseDocuments(),
    getAllCaseEvents(),
    getAllActivityDeviations(),
    getAllDeviationDecisions(),
    getAllCaseMeetings(),
    getAllMentorReports(),
    getAllParentCheckIns(),
    getAllCompensationPeriods()
  ]);
}

async function loadMatchingProfileData() {
  [mentorMatchingProfiles, mentorMatchingAreas, mentorMatchingLanguages, supportMatchingProfiles, supportMatchingAreas, supportMatchingLanguages, matchingSnapshots] = await Promise.all([
    getAllMentorMatchingProfiles(),
    getAllMentorMatchingAreas(),
    getAllMentorMatchingLanguages(),
    getAllSupportMatchingProfiles(),
    getAllSupportMatchingAreas(),
    getAllSupportMatchingLanguages(),
    getAllMatchingSnapshots()
  ]);
}

function mentorMatchingProfile(mentorId) {
  return activeProfileFor(mentorMatchingProfiles, "mentorId", mentorId);
}

function supportMatchingProfile(supportCaseId) {
  return activeProfileFor(supportMatchingProfiles, "supportCaseId", supportCaseId);
}

function matchingSnapshot(matchingCaseId) {
  return matchingSnapshots.find((snapshot) => snapshot.matchingCaseId === matchingCaseId) || null;
}

function supportAreaIdsForCase(caseRecord) {
  if (!caseRecord) return [];
  const profile = supportMatchingProfile(caseRecord.id);
  const profileIds = profile
    ? supportMatchingAreas.filter((entry) => entry.profileId === profile.id).map((entry) => entry.supportAreaId)
    : [];
  return normalizeSupportAreaIds(profileIds.length ? profileIds : caseRecord.details?.supportAreaIds);
}

function profileWrites(built, profileStore, areaStore, languageStore, previousProfile = null) {
  const writes = {
    [profileStore]: [
      ...(previousProfile ? [{ ...previousProfile, status: "superseded", supersededAt: built.profile.createdAt, supersededBy: built.profile.id, updatedAt: built.profile.createdAt, updatedBy: built.profile.createdBy }] : []),
      built.profile
    ],
    [areaStore]: built.supportAreas,
    [languageStore]: built.languages
  };
  return writes;
}

async function saveMentorMatchingProfile(candidate, actor = CURRENT_USER_ID) {
  const previousProfile = mentorMatchingProfile(candidate.id);
  const now = new Date().toISOString();
  const built = buildMentorMatchingProfile({
    tenantId: DEFAULT_TENANT_ID,
    mentor: candidate,
    profileId: crypto.randomUUID(),
    previousProfile,
    actorId: actor,
    now
  });
  await atomicPut(profileWrites(built, MENTOR_MATCHING_PROFILES_STORE, MENTOR_MATCHING_AREAS_STORE, MENTOR_MATCHING_LANGUAGES_STORE, previousProfile));
  return built.profile;
}

async function saveNewMentorWithMatchingProfile(candidate, actor = CURRENT_USER_ID) {
  const now = candidate.updatedAt || candidate.createdAt || new Date().toISOString();
  const built = buildMentorMatchingProfile({ tenantId: DEFAULT_TENANT_ID, mentor: candidate, profileId: crypto.randomUUID(), actorId: actor, now });
  await atomicPut({
    [STORE]: [candidate],
    ...profileWrites(built, MENTOR_MATCHING_PROFILES_STORE, MENTOR_MATCHING_AREAS_STORE, MENTOR_MATCHING_LANGUAGES_STORE)
  });
  return candidate;
}

async function saveSupportMatchingProfile(caseRecord, actor = CURRENT_USER_ID) {
  const previousProfile = supportMatchingProfile(caseRecord.id);
  const now = new Date().toISOString();
  const built = buildSupportMatchingProfile({
    tenantId: DEFAULT_TENANT_ID,
    supportCase: caseRecord,
    profileId: crypto.randomUUID(),
    previousProfile,
    actorId: actor,
    now
  });
  await atomicPut(profileWrites(built, SUPPORT_MATCHING_PROFILES_STORE, SUPPORT_MATCHING_AREAS_STORE, SUPPORT_MATCHING_LANGUAGES_STORE, previousProfile));
  return built.profile;
}

async function saveMatchingSnapshotForCase(caseRecord, actor = CURRENT_USER_ID) {
  if (caseRecord.caseTypeId !== "matching" || matchingSnapshot(caseRecord.id)) return null;
  const mentorProfile = mentorMatchingProfile(caseRecord.mentorId);
  const supportProfile = supportMatchingProfile(caseRecord.supportCaseId);
  if (!mentorProfile || !supportProfile) return null;
  const snapshot = buildMatchingSnapshot({
    tenantId: DEFAULT_TENANT_ID,
    matchingCase: caseRecord,
    mentorProfile,
    mentorAreas: mentorMatchingAreas,
    mentorLanguages: mentorMatchingLanguages,
    supportProfile,
    supportAreas: supportMatchingAreas,
    supportLanguages: supportMatchingLanguages,
    snapshotId: crypto.randomUUID(),
    actorId: actor,
    now: new Date().toISOString()
  });
  await putInto(matchingSnapshotTx, snapshot);
  return snapshot;
}

async function ensureMatchingProfileRecords() {
  const records = {};
  const add = (storeName, values) => {
    if (!values?.length) return;
    records[storeName] = [...(records[storeName] || []), ...values];
  };
  for (const candidate of candidates) {
    if (mentorMatchingProfile(candidate.id)) continue;
    const built = buildMentorMatchingProfile({ tenantId: DEFAULT_TENANT_ID, mentor: candidate, profileId: crypto.randomUUID(), actorId: candidate.updatedBy || candidate.createdBy || "system", now: candidate.updatedAt || candidate.createdAt || new Date().toISOString() });
    add(MENTOR_MATCHING_PROFILES_STORE, [built.profile]);
    add(MENTOR_MATCHING_AREAS_STORE, built.supportAreas);
    add(MENTOR_MATCHING_LANGUAGES_STORE, built.languages);
  }
  for (const supportCase of cases.filter((item) => item.caseTypeId === "parent-support")) {
    if (supportMatchingProfile(supportCase.id)) continue;
    const built = buildSupportMatchingProfile({ tenantId: DEFAULT_TENANT_ID, supportCase, profileId: crypto.randomUUID(), actorId: supportCase.updatedBy || supportCase.createdBy || "system", now: supportCase.updatedAt || supportCase.createdAt || new Date().toISOString() });
    add(SUPPORT_MATCHING_PROFILES_STORE, [built.profile]);
    add(SUPPORT_MATCHING_AREAS_STORE, built.supportAreas);
    add(SUPPORT_MATCHING_LANGUAGES_STORE, built.languages);
  }
  if (Object.keys(records).length) {
    await atomicPut(records);
    await loadMatchingProfileData();
  }
  const snapshots = [];
  for (const matchingCase of cases.filter((item) => item.caseTypeId === "matching" && !matchingSnapshot(item.id))) {
    const mentorProfile = mentorMatchingProfile(matchingCase.mentorId);
    const supportProfile = supportMatchingProfile(matchingCase.supportCaseId);
    if (!mentorProfile || !supportProfile) continue;
    snapshots.push(buildMatchingSnapshot({
      tenantId: DEFAULT_TENANT_ID,
      matchingCase,
      mentorProfile,
      mentorAreas: mentorMatchingAreas,
      mentorLanguages: mentorMatchingLanguages,
      supportProfile,
      supportAreas: supportMatchingAreas,
      supportLanguages: supportMatchingLanguages,
      snapshotId: crypto.randomUUID(),
      actorId: matchingCase.createdBy || "system",
      now: matchingCase.createdAt || new Date().toISOString()
    }));
  }
  if (snapshots.length) {
    await atomicPut({ [MATCHING_SNAPSHOTS_STORE]: snapshots });
    await loadMatchingProfileData();
  }
}

function projectMatchingProfiles() {
  candidates = candidates.map((candidate) => {
    const profile = mentorMatchingProfile(candidate.id);
    const projection = projectMentorMatchingProfile(profile, mentorMatchingAreas, mentorMatchingLanguages);
    return projection ? { ...candidate, ...projection } : candidate;
  });
}

function actorId(value) {
  if (!value || value === "System") return "system";
  return handlers.find((handler) => [handler.id, handler.userId, handler.name].includes(value))?.id || "system";
}

function atomicPut(recordsByStore) {
  const entries = Object.entries(recordsByStore).filter(([, records]) => records.length);
  if (!entries.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(entries.map(([storeName]) => storeName), "readwrite");
    for (const [storeName, records] of entries) {
      const store = transaction.objectStore(storeName);
      for (const record of records) store.put(record);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function changedRecords(originalRecords, normalizedRecords, keyOf = (record) => record.id) {
  const originalsByKey = new Map(originalRecords.map((record) => [keyOf(record), record]));
  return normalizedRecords.filter((record) => JSON.stringify(originalsByKey.get(keyOf(record))) !== JSON.stringify(record));
}

function normalizedCaseRecord(caseRecord) {
  const type = caseTypeById(caseRecord.caseTypeId) || caseTypeByName(caseRecord.type);
  return {
    ...caseRecord,
    tenantId: caseRecord.tenantId || DEFAULT_TENANT_ID,
    organizationUnitId: caseRecord.organizationUnitId || DEFAULT_ORGANIZATION_UNIT_ID,
    caseTypeId: type.id,
    caseTypeVersion: caseRecord.caseTypeVersion || type.version,
    type: type.name,
    description: type.id === "mentor-certification" ? normalizeApprovalCaseDescription(caseRecord.description) : caseRecord.description,
    mentorId: caseRecord.mentorId || null,
    parentId: caseRecord.parentId || null,
    supportCaseId: caseRecord.supportCaseId || null,
    sourceMatchingCaseId: caseRecord.sourceMatchingCaseId || null,
    status: normalizeCaseStatus(caseRecord.status),
    priority: String(caseRecord.priority || type.defaultPriority).toLowerCase(),
    dueDate: caseRecord.dueDate || null,
    pauseReasonCode: caseRecord.pauseReasonCode || null,
    pauseNote: caseRecord.pauseNote || null,
    resumeAt: caseRecord.resumeAt || null,
    closeReasonCode: caseRecord.closeReasonCode || null,
    closeNote: caseRecord.closeNote || null,
    version: Number(caseRecord.version || 1),
    createdBy: actorId(caseRecord.createdBy),
    updatedBy: actorId(caseRecord.updatedBy || caseRecord.createdBy),
    closedAt: caseRecord.closedAt || null,
    closedBy: caseRecord.closedBy ? actorId(caseRecord.closedBy) : null
  };
}

function normalizedAssignment(assignment) {
  return {
    ...assignment,
    tenantId: assignment.tenantId || DEFAULT_TENANT_ID,
    role: assignment.role === "Medhandläggare" ? "co_handler" : assignment.role === "co_handler" ? "co_handler" : "responsible",
    version: Number(assignment.version || 1),
    assignedBy: actorId(assignment.assignedBy),
    endedAt: assignment.endedAt || null,
    endedBy: assignment.endedBy ? actorId(assignment.endedBy) : null
  };
}

function normalizedActivity(activity, normalizedCases) {
  const caseRecord = normalizedCases.find((item) => item.id === activity.caseId);
  const storedTemplateId = activity.templateId || activity.templateKey || AD_HOC_ACTIVITY_TEMPLATE_ID;
  const migratedMatchingTemplateId = caseRecord?.caseTypeId === "matching"
    ? MATCHING_ACTIVITY_TEMPLATE_BY_TITLE.get(activity.title)
    : null;
  const templateId = migratedMatchingTemplateId || storedTemplateId;
  const status = normalizeActivityStatus(activity.status);
  const storedResultCode = activity.resultCode || activity.result || null;
  let migratedCompletedResult = MATCHING_LEGACY_COMPLETED_RESULTS[templateId];
  if (templateId === "matchingPartyResponses") {
    const parentResponse = caseRecord?.details?.parentResponse;
    const mentorResponse = caseRecord?.details?.mentorResponse;
    if (parentResponse === "declined" && mentorResponse === "declined") migratedCompletedResult = "both_decline";
    else if (parentResponse === "declined") migratedCompletedResult = "parent_declines";
    else if (mentorResponse === "declined") migratedCompletedResult = "mentor_declines";
  }
  if (templateId === "matchingDecision" && caseRecord?.details?.matchingOutcome === "declined") {
    migratedCompletedResult = "match_rejected";
  }
  const inconsistentMatchingResult = templateId === "matchingDecision"
    ? caseRecord?.details?.matchingOutcome === "declined" && storedResultCode === "match_approved"
    : templateId === "matchingPartyResponses"
      ? caseRecord?.details?.matchingOutcome === "declined" && storedResultCode === "both_accept"
      : false;
  const resultCode = status === "completed" && migratedMatchingTemplateId && (!storedResultCode || storedResultCode === "completed" || inconsistentMatchingResult)
    ? migratedCompletedResult
    : storedResultCode || (status === "completed" ? defaultCompletedResult({ templateId }) : null);
  const caseOwnerId = caseAssignments.find((assignment) => assignment.caseId === activity.caseId && ["Ansvarig", "responsible"].includes(assignment.role) && !assignment.endedAt)?.handlerId || null;
  const legacyHandlerId = activity.handlerId || null;
  return {
    ...activity,
    tenantId: activity.tenantId || caseRecord?.tenantId || DEFAULT_TENANT_ID,
    templateId,
    templateVersion: Number(activity.templateVersion || 1),
    status,
    resultCode,
    resultClassification: resultCode ? resultClassification(templateId, resultCode) : null,
    handlerIdOverride: activity.handlerIdOverride ?? (legacyHandlerId && legacyHandlerId !== caseOwnerId ? legacyHandlerId : null),
    waitingForParty: status === "waiting" ? activity.waitingForParty || "external" : null,
    dueDate: activity.dueDate || null,
    sortOrder: Number(activity.sortOrder ?? activity.order ?? 0),
    version: Number(activity.version || 1),
    createdBy: actorId(activity.createdBy),
    updatedBy: actorId(activity.updatedBy || activity.completedBy || activity.createdBy),
    completedAt: status === "completed" ? activity.completedAt || activity.updatedAt : null,
    completedBy: status === "completed" ? actorId(activity.completedBy || activity.updatedBy) : null
  };
}

async function migrateCaseDomainV6() {
  const normalizedCases = cases.map(normalizedCaseRecord);
  const normalizedAssignments = caseAssignments.map(normalizedAssignment);
  const migrationTime = new Date().toISOString();
  for (const caseRecord of normalizedCases) {
    const responsible = normalizedAssignments
      .filter((assignment) => assignment.caseId === caseRecord.id && assignment.role === "responsible" && !assignment.endedAt)
      .sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
    for (const duplicate of responsible.slice(1)) {
      duplicate.endedAt = migrationTime;
      duplicate.endedBy = "system";
      duplicate.version += 1;
    }
  }
  const normalizedActivities = caseActivities.map((activity) => normalizedActivity(activity, normalizedCases));
  const normalizedDocuments = caseDocuments.map((caseDocument) => ({
    ...caseDocument,
    tenantId: caseDocument.tenantId || DEFAULT_TENANT_ID,
    activityId: caseDocument.activityId || null,
    meetingId: caseDocument.meetingId || null,
    type: ({ "Inkommen handling": "incoming", "Upprättad handling": "created", Anteckning: "service_note" })[caseDocument.type] || caseDocument.type || "service_note",
    storageObjectId: caseDocument.storageObjectId || null,
    mimeType: caseDocument.mimeType || null,
    sizeBytes: caseDocument.sizeBytes ?? null,
    checksum: caseDocument.checksum || null,
    informationClass: caseDocument.informationClass || "normal",
    supersedesDocumentId: caseDocument.supersedesDocumentId || null,
    createdBy: actorId(caseDocument.createdBy)
  }));
  const existingDocumentIds = new Set(normalizedDocuments.map((document) => document.id));
  for (const activity of normalizedActivities) {
    if (!activity.note || existingDocumentIds.has(`legacy-note-${activity.id}`)) continue;
    normalizedDocuments.push({
      id: `legacy-note-${activity.id}`, tenantId: activity.tenantId, caseId: activity.caseId, activityId: activity.id, meetingId: null,
      type: "service_note", title: `Tjänsteanteckning: ${activity.title}`, description: activity.note,
      documentDate: (activity.updatedAt || activity.createdAt || new Date().toISOString()).slice(0, 10), storageObjectId: null, fileName: null,
      mimeType: null, sizeBytes: null, checksum: null, informationClass: "normal", supersedesDocumentId: null,
      createdAt: activity.updatedAt || activity.createdAt || new Date().toISOString(), createdBy: actorId(activity.updatedBy || activity.createdBy)
    });
  }
  const normalizedEvents = caseEvents.map((caseEvent) => ({
    ...caseEvent,
    tenantId: caseEvent.tenantId || DEFAULT_TENANT_ID,
    eventType: caseEvent.eventType || caseEvent.type || "case_updated",
    schemaVersion: Number(caseEvent.schemaVersion || 1),
    entityType: caseEvent.entityType || "case",
    entityId: caseEvent.entityId || caseEvent.caseId,
    actorId: caseEvent.actorId || actorId(caseEvent.actor),
    occurredAt: caseEvent.occurredAt || caseEvent.createdAt,
    correlationId: caseEvent.correlationId || crypto.randomUUID(),
    idempotencyKey: caseEvent.idempotencyKey || `migration-${caseEvent.id}`,
    payload: caseEvent.payload || { message: caseEvent.text || "Ärendet uppdaterades" }
  }));
  const migratedDeviations = [...activityDeviations];
  for (const deviation of migratedDeviations) {
    const latestDecision = deviationDecisions
      .filter((decision) => decision.deviationId === deviation.id)
      .sort((a, b) => new Date(b.decidedAt) - new Date(a.decidedAt))[0];
    if (!latestDecision || deviation.activeDecisionId) continue;
    deviation.status = "resolved";
    deviation.activeDecisionId = latestDecision.id;
    deviation.resolvedAt = latestDecision.decidedAt;
    deviation.resolvedBy = latestDecision.decidedBy;
  }
  for (const decision of deviationDecisions.filter((item) => item.outcome === "request_supplement")) {
    const deviation = migratedDeviations.find((item) => item.id === decision.deviationId);
    if (!deviation || normalizedAssignments.some((assignment) => assignment.caseId === deviation.caseId && assignment.role === "responsible" && !assignment.endedAt)) continue;
    normalizedAssignments.push({
      id: `migration-responsible-${decision.id}`, tenantId: deviation.tenantId, caseId: deviation.caseId,
      handlerId: decision.decidedBy, role: "responsible", version: 1, assignedAt: decision.decidedAt,
      assignedBy: decision.decidedBy, endedAt: null, endedBy: null
    });
  }
  const eventIds = new Set(normalizedEvents.map((event) => event.id));
  for (const activity of normalizedActivities.filter((item) => item.status === "completed" && item.resultClassification === "deviation")) {
    if (migratedDeviations.some((deviation) => deviation.activityId === activity.id)) continue;
    const completionEventId = `migration-completion-${activity.id}`;
    if (!eventIds.has(completionEventId)) {
      normalizedEvents.push({
        id: completionEventId, tenantId: activity.tenantId, caseId: activity.caseId, eventType: "activity_updated",
        schemaVersion: 1, entityType: "activity", entityId: activity.id, actorId: activity.completedBy || "system",
        occurredAt: activity.completedAt || activity.updatedAt || migrationTime, correlationId: `migration-${activity.id}`,
        idempotencyKey: `migration-completion-${activity.id}`, payload: { message: `${activity.title} hade ett avvikande resultat vid migrering` }
      });
    }
    migratedDeviations.push({
      id: `migration-deviation-${activity.id}`, tenantId: activity.tenantId, caseId: activity.caseId, activityId: activity.id,
      activityCompletionEventId: completionEventId, resultCode: activity.resultCode, status: "open", version: 1,
      openedAt: activity.completedAt || activity.updatedAt || migrationTime, openedBy: activity.completedBy || "system",
      resolvedAt: null, resolvedBy: null, activeDecisionId: null
    });
  }
  for (const caseRecord of normalizedCases) {
    const acceptedWithoutAssignment = caseRecord.caseTypeId === "matching"
      && caseRecord.status !== "closed"
      && matchingOutcome(caseRecord.details?.parentResponse, caseRecord.details?.mentorResponse) === "accepted";
    caseRecord.status = acceptedWithoutAssignment ? "in_progress" : deriveDomainCaseStatus(
      caseRecord,
      normalizedActivities.filter((activity) => activity.caseId === caseRecord.id),
      migratedDeviations.filter((deviation) => deviation.caseId === caseRecord.id)
    );
  }
  const existingMeetingIds = new Set(caseMeetings.map((meeting) => meeting.id));
  const migratedMeetings = meetings.filter((meeting) => !existingMeetingIds.has(meeting.id)).flatMap((meeting) => {
    const caseRecord = normalizedCases.find((item) => item.mentorId === meeting.mentorId && item.caseTypeId === "mentor-certification")
      || normalizedCases.find((item) => item.mentorId === meeting.mentorId);
    if (!caseRecord) return [];
    return [{
      id: meeting.id,
      tenantId: caseRecord.tenantId,
      caseId: caseRecord.id,
      activityId: meeting.type === "Intervju inför godkännande"
        ? normalizedActivities.find((activity) => activity.caseId === caseRecord.id && activity.templateId === "interviewDone")?.id || null
        : null,
      meetingType: meeting.type === "Intervju inför godkännande" ? "certification_interview" : meeting.type === "Uppföljning" ? "follow_up" : "other",
      occurredAt: meeting.occurredAt,
      mode: ({ "Fysiskt möte": "physical", "Digitalt möte": "digital", Telefon: "phone" })[meeting.mode] || meeting.mode || null,
      participantHandlerIds: [actorId(meeting.createdBy)].filter((id) => id !== "system"),
      externalParticipantNames: [],
      summary: meeting.summary || "",
      nextStep: meeting.nextStep || "",
      version: Number(meeting.version || 1),
      createdAt: meeting.createdAt || meeting.occurredAt,
      createdBy: actorId(meeting.createdBy),
      updatedAt: meeting.updatedAt || meeting.createdAt || meeting.occurredAt,
      updatedBy: actorId(meeting.updatedBy || meeting.createdBy)
    }];
  });
  await atomicPut({
    [CASES_STORE]: changedRecords(cases, normalizedCases),
    [CASE_ASSIGNMENTS_STORE]: changedRecords(caseAssignments, normalizedAssignments),
    [CASE_ACTIVITIES_STORE]: changedRecords(caseActivities, normalizedActivities),
    [CASE_DOCUMENTS_STORE]: changedRecords(caseDocuments, normalizedDocuments),
    [CASE_EVENTS_STORE]: changedRecords(caseEvents, normalizedEvents),
    [ACTIVITY_DEVIATIONS_STORE]: changedRecords(activityDeviations, migratedDeviations),
    [CASE_MEETINGS_STORE]: migratedMeetings
  });
}

function handlerNameById(id) {
  if (!id || id === "system") return "System";
  return handlers.find((handler) => [handler.id, handler.userId, handler.name].includes(id))?.name || "Okänd användare";
}

function actorNameById(id) {
  return handlers.find((handler) => [handler.id, handler.userId, handler.name].includes(id))?.name
    || candidates.find((candidate) => candidate.id === id)?.name
    || (id === "system" ? "System" : "Okänd användare");
}

function successorCases(caseRecord) {
  if (caseRecord.caseTypeId === "parent-support") {
    return cases.filter((item) => item.caseTypeId === "matching" && item.supportCaseId === caseRecord.id);
  }
  if (caseRecord.caseTypeId === "matching") {
    return cases.filter((item) => item.caseTypeId === "mentor-assignment" && item.sourceMatchingCaseId === caseRecord.id);
  }
  if (caseRecord.caseTypeId === "needs-analysis") {
    return cases.filter((item) => item.caseTypeId === "recruitment" && item.details?.sourceCaseId === caseRecord.id);
  }
  if (caseRecord.caseTypeId === "mentor-assignment") {
    return cases.filter((item) => item.caseTypeId === "mentor-follow-up" && item.details?.sourceCaseId === caseRecord.id);
  }
  return [];
}

function caseClosureDetails(caseRecord) {
  const completed = activitiesForCase(caseRecord.id)
    .filter((activity) => activity.status === "completed")
    .sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0));
  const decisionTemplateId = caseRecord.caseTypeId === "matching"
    ? "matchingDecision"
    : caseRecord.caseTypeId === "mentor-certification"
      ? "decision"
      : null;
  const decision = completed.find((activity) => activity.templateId === decisionTemplateId) || completed[0] || null;
  const result = decision ? activityResultLabel(decision) : "";
  const outcome = caseRecord.closeNote || (decision && result ? `${decision.title}: ${result}` : "Ärendet avslutades utan angivet utfall");
  const storage = decision
    ? `Resultatet "${result || "Ej angivet"}", avslutstid och registrerande användare har sparats i ärendet. Avslutet finns även i fliken Logg.`
    : "Avslutsorsak, motivering, avslutstid och registrerande användare har sparats i ärendet och i fliken Logg.";
  const mentor = caseMentor(caseRecord);
  let effect = "Ingen separat personpost ändrades automatiskt av avslutet.";
  if (caseRecord.caseTypeId === "mentor-certification" && decision?.resultCode === "approved" && mentor) {
    effect = mentor.active === false
      ? `${mentor.name} visas som Godkänd i mentorregistret, men mentorposten är inaktiv och kan inte väljas i en matchning.`
      : `${mentor.name} visas som Godkänd i mentorregistret och kan väljas i en matchning.`;
  }
  const successors = successorCases(caseRecord);
  const configuredNextTypeId = caseTypeById(caseRecord.caseTypeId)?.nextCaseTypeId || null;
  let successorHtml = "Inget nytt ärende skapades automatiskt.";
  let successorText = successorHtml;
  if (successors.length) {
    successorHtml = successors.map((item) => `<a href="#/case/${escapeHtml(item.id)}">${escapeHtml(item.number)} · ${escapeHtml(item.type)}</a>`).join(", ");
    successorText = `${successors.length} följdärende${successors.length === 1 ? "" : "n"} skapades.`;
  } else if (configuredNextTypeId) {
    const nextName = caseTypeById(configuredNextTypeId)?.name || "nästa ärendetyp";
    successorHtml = `Inget nytt ärende skapades automatiskt. Konfigurerat nästa steg är ${escapeHtml(nextName)}.`;
    successorText = `Inget följdärende skapades. Nästa möjliga steg är ${nextName}.`;
  }
  return { outcome, storage, effect, successorHtml, successorText };
}

function renderCaseClosureSummary(caseRecord) {
  const closed = caseRecord.status === "closed";
  els.caseClosureSummary.hidden = !closed;
  els.activityCaseClosedNotice.hidden = !closed;
  if (!closed) return;
  const details = caseClosureDetails(caseRecord);
  els.caseClosureMeta.textContent = `Avslutat ${formatDateTime(caseRecord.closedAt || caseRecord.updatedAt)} av ${handlerNameById(caseRecord.closedBy || caseRecord.updatedBy)}`;
  els.caseClosureOutcome.textContent = details.outcome;
  els.caseClosureStorage.textContent = details.storage;
  els.caseClosureEffect.textContent = details.effect;
  els.caseClosureSuccessor.innerHTML = details.successorHtml;
  els.activityCaseClosedText.textContent = `${details.outcome}. ${details.successorText}`;
}

function projectMentorWorkflow(candidate) {
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  if (!caseRecord) return candidate;
  const activities = caseActivities.filter((activity) => activity.caseId === caseRecord.id);
  const activityByTemplate = Object.fromEntries(activities.map((activity) => [activity.templateId, activity]));
  const checks = Object.fromEntries(CHECKS.map(([key]) => [
    key,
    activityByTemplate[key]?.status === "completed" && activityByTemplate[key]?.resultClassification !== "deviation"
  ]));
  const checkMeta = Object.fromEntries(CHECKS.map(([key]) => {
    const activity = activityByTemplate[key];
    return [key, checks[key] ? {
      checkedAt: activity.completedAt || activity.updatedAt,
      checkedBy: handlerNameById(activity.completedBy || activity.updatedBy),
      note: latestActivityNote(activity.id)
    } : { checkedAt: "", checkedBy: "", note: "" }];
  }));
  const assignment = caseAssignments.find((item) => item.caseId === caseRecord.id && item.role === "responsible" && !item.endedAt);
  const owner = handlers.find((handler) => handler.id === assignment?.handlerId);
  const interviewMeeting = [...caseMeetings]
    .filter((meeting) => meeting.caseId === caseRecord.id && meeting.meetingType === "certification_interview")
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
  const decision = activityByTemplate.decision;
  let status = statusFromChecks(checks);
  if (decision?.status === "completed" && decision.resultCode === "approved" && caseRecord.status === "closed") status = "Godkänd";
  else if (activityByTemplate.interviewDone?.status === "completed") status = "Redo för intervju";

  return {
    ...candidate,
    caseNumber: caseRecord.number,
    coordinatorId: owner?.id || "",
    coordinator: owner?.name || "",
    status,
    checks,
    checkMeta,
    interviewDate: interviewMeeting?.occurredAt || "",
    interviewMode: interviewMeeting?.mode || "",
    history: caseEvents.filter((event) => event.caseId === caseRecord.id).map((event) => ({
      at: event.occurredAt || event.createdAt,
      text: event.payload?.message || event.text || event.eventType,
      actor: handlerNameById(event.actorId) || event.actor
    }))
  };
}

function certificationCaseStatus(candidate) {
  if (candidate.status === "Godkänd") return "closed";
  if (CHECKS.every(([key]) => candidate.checks?.[key])) {
    return "in_progress";
  }
  if (Object.values(candidate.checks || {}).some(Boolean) || candidate.coordinatorId) return "in_progress";
  return "new";
}

function certificationActivityState(candidate, key) {
  if (key === "inviteInterview") return candidate.interviewDate ? "completed" : "not_started";
  if (key === "decision") return candidate.status === "Godkänd" ? "completed" : "not_started";
  return candidate.checks?.[key] ? "completed" : "not_started";
}

function certificationActivityMeta(candidate, key) {
  if (key === "inviteInterview" && candidate.interviewDate) {
    return { completedAt: candidate.updatedAt, completedBy: candidate.coordinator || "System", note: `Intervju bokad ${formatDateTime(candidate.interviewDate)}` };
  }
  if (key === "decision" && candidate.status === "Godkänd") {
    return { completedAt: candidate.updatedAt, completedBy: candidate.coordinator || "System", note: "Mentorn godkänd" };
  }
  const meta = candidate.checkMeta?.[key] || {};
  return { completedAt: meta.checkedAt || "", completedBy: meta.checkedBy || "", note: meta.note || "" };
}

async function ensureCertificationCases() {
  const existingActivities = new Set(caseActivities.map((activity) => activity.id));
  const existingAssignments = new Set(caseAssignments.map((assignment) => assignment.id));
  const writes = [];

  for (const candidate of candidates) {
    const existingCase = cases.find((item) => item.mentorId === candidate.id && (item.caseTypeId === "mentor-certification" || item.type === "Godkännande av mentor"));
    const caseId = existingCase?.id || `cert-${candidate.id}`;
    const now = new Date().toISOString();
    const existingCaseActivities = caseActivities.filter((activity) => activity.caseId === caseId);
    const currentCaseStatus = existingCase
      ? normalizeCaseStatus(existingCase.status)
      : certificationCaseStatus(candidate);
    const caseRecord = {
      id: caseId,
      tenantId: existingCase?.tenantId || DEFAULT_TENANT_ID,
      number: existingCase?.number || candidate.caseNumber || await reserveCaseNumber(),
      caseTypeId: "mentor-certification",
      caseTypeVersion: 1,
      organizationUnitId: existingCase?.organizationUnitId || DEFAULT_ORGANIZATION_UNIT_ID,
      type: "Godkännande av mentor",
      title: `Godkännande av ${candidate.name}`,
      mentorId: candidate.id,
      status: currentCaseStatus,
      priority: existingCase?.priority || "normal",
      dueDate: existingCase?.dueDate || null,
      description: existingCase?.description || "Prövning inför godkännande för uppdrag som föräldramentor.",
      createdAt: existingCase?.createdAt || candidate.createdAt || now,
      createdBy: existingCase?.createdBy || "system",
      updatedAt: existingCase?.updatedAt || candidate.updatedAt || now,
      updatedBy: existingCase?.updatedBy || "system",
      version: Number(existingCase?.version || 1),
      closedAt: existingCase?.closedAt || (candidate.status === "Godkänd" ? candidate.updatedAt : null),
      closedBy: existingCase?.closedBy || (candidate.status === "Godkänd" ? actorId(candidate.coordinator) : null)
    };
    if (!existingCase) {
      writes.push(saveCase(caseRecord));
      cases.push(caseRecord);
      writes.push(saveCaseEvent({
        id: crypto.randomUUID(),
        caseId,
        tenantId: DEFAULT_TENANT_ID,
        eventType: "case_created",
        type: "case_created",
        text: "Ärendet om godkännande skapades från mentorposten",
        actorId: "system",
        actor: "System",
        occurredAt: caseRecord.createdAt,
        createdAt: caseRecord.createdAt,
        schemaVersion: 1,
        entityType: "case",
        entityId: caseId,
        correlationId: crypto.randomUUID(),
        idempotencyKey: `seed-case-${caseId}`,
        payload: { message: "Ärendet om godkännande skapades från mentorposten" }
      }));
    } else if (existingCase.title !== caseRecord.title
      || existingCase.number !== caseRecord.number) {
      Object.assign(existingCase, {
        title: caseRecord.title,
        number: caseRecord.number,
        updatedAt: now
      });
      writes.push(saveCase(existingCase));
    }

    const hasResponsibleAssignment = caseAssignments.some((assignment) => assignment.caseId === caseId && ["Ansvarig", "responsible"].includes(assignment.role) && !assignment.endedAt);
    if (candidate.coordinatorId && !hasResponsibleAssignment) {
      const assignmentId = `${caseId}-${candidate.coordinatorId}`;
      if (!existingAssignments.has(assignmentId)) {
        const assignment = {
          id: assignmentId,
          tenantId: DEFAULT_TENANT_ID,
          caseId,
          handlerId: candidate.coordinatorId,
          role: "responsible",
          version: 1,
          assignedAt: candidate.updatedAt || now,
          assignedBy: "system",
          endedAt: null,
          endedBy: null
        };
        writes.push(saveCaseAssignment(assignment));
        caseAssignments.push(assignment);
        existingAssignments.add(assignmentId);
      }
    }

    for (const [order, [key, title]] of CERTIFICATION_ACTIVITIES.entries()) {
      const activityId = `${caseId}-${key}`;
      if (existingActivities.has(activityId)) continue;
      const state = certificationActivityState(candidate, key);
      const meta = certificationActivityMeta(candidate, key);
      const activity = {
        id: activityId,
        tenantId: DEFAULT_TENANT_ID,
        caseId,
        templateId: key,
        templateVersion: 1,
        title,
        status: state,
        handlerIdOverride: null,
        waitingForParty: null,
        dueDate: null,
        sortOrder: order,
        version: 1,
        createdAt: candidate.createdAt || now,
        createdBy: "system",
        updatedAt: meta.completedAt || candidate.createdAt || now,
        updatedBy: actorId(meta.completedBy),
        completedAt: state === "completed" ? meta.completedAt || candidate.updatedAt || now : null,
        completedBy: state === "completed" ? actorId(meta.completedBy) : null,
        resultCode: state === "completed" ? defaultCompletedResult({ templateId: key }) : null,
        resultClassification: state === "completed" ? "acceptable" : null
      };
      writes.push(saveCaseActivity(activity));
      caseActivities.push(activity);
      existingActivities.add(activityId);
    }
  }
  await Promise.all(writes);
}

async function refresh() {
  const refreshStartedAt = Date.now();
  await loadCaseNumberSettings();
  await loadSupportAreaSelection();
  await loadCaseTypeDefinitions();
  await loadActivityTemplateDefinitions();
  handlers = await getAllHandlers();
  await migrateDefaultHandlerRecords();
  handlers.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  const storedCandidates = await getAllCandidates();
  parents = (await getAllParents()).map((parent) => ({
    ...parent,
    tenantId: parent.tenantId || DEFAULT_TENANT_ID,
    active: parent.active !== false,
    version: Number(parent.version || 1),
    createdBy: actorId(parent.createdBy),
    updatedBy: actorId(parent.updatedBy || parent.createdBy)
  }));
  incomingContacts = (await getAllIncomingContacts()).map((contact) => ({
    ...contact,
    tenantId: contact.tenantId || DEFAULT_TENANT_ID,
    status: contact.status || "registered"
  })).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  candidates = storedCandidates.map(normalizeCandidate);
  await Promise.all(candidates
    .filter((candidate, index) => !storedCandidates[index].tenantId
      || !storedCandidates[index].createdBy
      || !storedCandidates[index].updatedBy
      || candidate.status !== storedCandidates[index].status)
    .map(saveCandidate));
  meetings = await getAllMeetings();
  await migrateSingleExampleMentor();
  await migrateExampleCoordinatorDistribution();
  await migrateCoordinatorReferences();
  await migrateLegacyMeetingNotes();
  await loadCaseData();
  await synchronizeCaseNumberCounter();
  await ensureUniqueCaseNumbers();
  await ensureCertificationCases();
  await loadCaseData();
  await migrateCaseDomainV6();
  await loadCaseData();
  await loadMatchingProfileData();
  await ensureMatchingProfileRecords();
  projectMatchingProfiles();
  candidates = candidates.map(projectMentorWorkflow);
  meetings = await getAllMeetings();
  meetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  caseMeetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  cases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  caseActivities.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || new Date(a.createdAt) - new Date(b.createdAt));
  caseEvents.sort((a, b) => new Date(b.occurredAt || b.createdAt) - new Date(a.occurredAt || a.createdAt));
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  parents.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  await loadLearningData();
  publicSupportRequests = (await getAllPublicSupportRequests())
    .filter((request) => request.tenantId === DEFAULT_TENANT_ID)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  supportTickets = (await getAllSupportTickets())
    .filter((ticket) => ticket.tenantId === DEFAULT_TENANT_ID)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  renderAll();
  document.body.dataset.refreshDurationMs = String(Date.now() - refreshStartedAt);
}

async function migrateLegacyMeetingNotes() {
  const existingIds = new Set(meetings.map((meeting) => meeting.id));
  const legacyCandidates = candidates.filter((candidate) => candidate.notes);
  const legacyMeetings = legacyCandidates
    .filter((candidate) => !existingIds.has(`legacy-${candidate.id}`))
    .map((candidate) => ({
      id: `legacy-${candidate.id}`,
      mentorId: candidate.id,
      type: candidate.interviewDate || candidate.checks?.interviewDone ? "Intervju inför godkännande" : "Övrig kontakt",
      occurredAt: candidate.interviewDate || candidate.createdAt,
      mode: candidate.interviewMode || "Ej angivet",
      summary: candidate.notes,
      nextStep: "",
      createdBy: candidate.coordinator || "System",
      createdAt: candidate.updatedAt || candidate.createdAt,
      updatedAt: candidate.updatedAt || candidate.createdAt
    }));
  await Promise.all([
    ...legacyMeetings.map(saveMeeting),
    ...legacyCandidates.map((candidate) => {
      candidate.notes = "";
      return saveCandidate(candidate);
    })
  ]);
}

async function migrateSingleExampleMentor() {
  if (candidates.length !== 1) return;
  const candidate = candidates[0];
  if (candidate.exampleData !== true || candidate.exampleDatasetSize !== 1 || candidate.name !== "Anna Lind") return;
  const template = seedCandidates[3];
  const now = new Date().toISOString();
  Object.assign(candidate, {
    ...template,
    id: candidate.id,
    caseNumber: candidate.caseNumber,
    personalNumber: candidate.personalNumber,
    coordinatorId: "",
    coordinator: "",
    identityMethod: "",
    identityVerifiedAt: "",
    identityVerifiedBy: "",
    exampleData: true,
    exampleDataVersion: 3,
    exampleDatasetSize: 1,
    createdAt: candidate.createdAt,
    updatedAt: now,
    history: [...(candidate.history || []), { at: now, text: "Exempelpost uppdaterad till Karin Nyström", actor: "System" }]
  });
  await saveCandidate(candidate);
}

async function migrateExampleCoordinatorDistribution() {
  const legacyExamples = candidates.filter((candidate) => candidate.exampleData === true && !candidate.exampleDataVersion);
  if (!legacyExamples.length) return;
  await Promise.all(legacyExamples.map((candidate, index) => {
    Object.assign(candidate, {
      ...(index % 2 === 0 ? { coordinatorId: "", coordinator: "" } : {}),
      exampleDataVersion: 2
    });
    return saveCandidate(candidate);
  }));
}

async function migrateDefaultHandlerRecords() {
  const legacyNames = {
    "handler-maja": "Maja",
    "handler-jonas": "Jonas",
    "handler-sara": "Sara"
  };
  const usedUserIds = new Set();
  const reservedUserIds = new Set(handlers
    .map((handler) => String(handler.userId || "").trim().toUpperCase())
    .filter(Boolean));
  let nextUserId = 1004;
  const allocateUserId = () => {
    let value;
    do {
      value = `FMU-${nextUserId}`;
      nextUserId += 1;
    } while (usedUserIds.has(value) || reservedUserIds.has(value));
    return value;
  };
  const updates = [];
  const orderedHandlers = [...handlers].sort((a, b) => {
    const aIsDefault = seedHandlers.some((item) => item.id === a.id);
    const bIsDefault = seedHandlers.some((item) => item.id === b.id);
    return Number(bIsDefault) - Number(aIsDefault);
  });
  for (const handler of orderedHandlers) {
    const template = seedHandlers.find((item) => item.id === handler.id);
    const legacyEmail = template ? `${legacyNames[handler.id]?.toLowerCase()}@kommun.example` : "";
    const name = template && handler.name === legacyNames[handler.id] ? template.name : handler.name;
    const email = template && handler.email === legacyEmail ? template.email : handler.email;
    const requestedUserId = template?.userId || String(handler.userId || "").trim().toUpperCase();
    const userId = requestedUserId && !usedUserIds.has(requestedUserId) ? requestedUserId : allocateUserId();
    usedUserIds.add(userId);
    if (name === handler.name && email === handler.email && userId === handler.userId && handler.tenantId) continue;
    Object.assign(handler, { tenantId: handler.tenantId || DEFAULT_TENANT_ID, name, email, userId, updatedAt: new Date().toISOString() });
    updates.push(saveHandler(handler));
  }
  await Promise.all(updates);
}

function learningTypeLabel(type) {
  return { material: "Referensmaterial", course: "Kurs", test: "Kunskapstest", reflection: "Reflektion" }[type] || "Innehåll";
}

function renderLearningMarkdown(source) {
  return marked.parse(prepareLearningMarkdown(source));
}

function learningProgressRecord(mentorId, courseId) {
  return learningProgress.find((item) => item.mentorId === mentorId && item.courseId === courseId) || {
    tenantId: DEFAULT_TENANT_ID,
    mentorId,
    courseId,
    completedModuleIds: [],
    reflections: {},
    attempts: [],
    startedAt: new Date().toISOString()
  };
}

function queueLearningMutation(action) {
  const queued = learningMutationQueue.then(action, action);
  learningMutationQueue = queued.catch(() => {});
  return queued;
}

async function completeLearningModule(courseId, moduleId, extra = {}) {
  if (!selectedLearnerId) return;
  const record = learningProgressRecord(selectedLearnerId, courseId);
  const completedModuleIds = [...new Set([...(record.completedModuleIds || []), moduleId])];
  await saveLearningProgress({ ...record, ...extra, completedModuleIds, updatedAt: new Date().toISOString() });
  markSaved();
  await refresh();
}

function renderLearningCatalog() {
  if (isMentorSession()) selectedLearnerId = currentUser().mentorId || "";
  const items = selectedLearningContent();
  const visibleItems = items.filter((item) => learningTypeFilter === "all" || item.type === learningTypeFilter);
  const learnerOptions = candidates.map((candidate) => `<option value="${escapeHtml(candidate.id)}" ${candidate.id === selectedLearnerId ? "selected" : ""}>${escapeHtml(candidate.name)}</option>`).join("");
  els.learningCatalogPanel.innerHTML = `
    <div class="card-header bg-white d-flex flex-wrap gap-3 justify-content-between align-items-start">
      <div><h2 class="h5 mb-1">${isMentorSession() ? "Min utbildning" : "Utbildning"}</h2><p class="text-secondary mb-0">${isMentorSession() ? "Kurser, referensmaterial och kunskapstest som kommunen har valt för dig." : "Kommunens valda referensmaterial, kurser och kunskapstest."}</p></div>
      ${isMentorSession() ? `<div class="learning-current-mentor"><span>Genomförande för</span><strong>${escapeHtml(currentUserName())}</strong></div>` : `<div class="learning-learner-select">
        <label class="form-label" for="learningLearnerSelect">Visa genomförande för mentor</label>
        <select id="learningLearnerSelect" class="form-select form-select-sm" ${candidates.length ? "" : "disabled"}>
          ${candidates.length ? learnerOptions : '<option>Inga mentorer registrerade</option>'}
        </select>
      </div>`}
    </div>
    <div class="card-body border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div class="btn-group btn-group-sm" role="group" aria-label="Filtrera utbildningsinnehåll">
        ${[["all", "Allt"], ["course", "Kurser"], ["material", "Referensmaterial"], ["test", "Kunskapstest"]].map(([value, label]) => `<button type="button" class="btn ${learningTypeFilter === value ? "btn-secondary" : "btn-outline-secondary"}" data-learning-filter="${value}">${label}</button>`).join("")}
      </div>
      <span class="small text-secondary">${visibleItems.length} innehållspaket</span>
    </div>
    <div class="learning-catalog-grid">
      ${visibleItems.map((item) => {
        const progress = item.type === "course" && selectedLearnerId ? learningProgressRecord(selectedLearnerId, item.id) : null;
        const percent = progress ? courseProgressPercent(item, progress.completedModuleIds) : null;
        return `<article class="learning-catalog-item">
          <div class="d-flex justify-content-between gap-3 align-items-start"><span class="badge text-bg-light border">${learningTypeLabel(item.type)}</span><span class="small text-secondary">v${item.version}</span></div>
          <h3 class="h6 mt-3 mb-2">${escapeHtml(item.title)}</h3>
          <p class="text-secondary">${escapeHtml(item.summary)}</p>
          ${percent !== null ? `<div class="progress mb-2" role="progressbar" aria-label="Kursförlopp" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${percent}%"></div></div><div class="small text-secondary mb-3">${percent}% genomfört</div>` : ""}
          <a class="btn btn-outline-primary btn-sm" href="#/learning/${encodeURIComponent(item.id)}">Öppna</a>
        </article>`;
      }).join("") || '<div class="empty-list text-secondary">Inget innehåll matchar filtret.</div>'}
    </div>`;
}

function renderKnowledgeTestForm(test, course = null, module = null) {
  const progressId = course?.id || `test:${test.id}`;
  const progress = selectedLearnerId ? learningProgressRecord(selectedLearnerId, progressId) : null;
  const latestAttempt = [...(progress?.attempts || [])].at(-1);
  return `<form class="learning-test-form" data-learning-test="${escapeHtml(test.id)}" data-course-id="${escapeHtml(course?.id || "")}" data-module-id="${escapeHtml(module?.id || test.id)}">
    <div class="learning-markdown mb-4">${renderLearningMarkdown(test.bodyMarkdown)}</div>
    ${test.questions.map((question, questionIndex) => `<fieldset class="learning-question">
      <legend><span>${questionIndex + 1}</span>${escapeHtml(question.prompt)}</legend>
      ${question.options.map((option) => `<div class="form-check"><input class="form-check-input" type="radio" name="${escapeHtml(question.id)}" id="${escapeHtml(progressId)}-${escapeHtml(question.id)}-${escapeHtml(option.id)}" value="${escapeHtml(option.id)}" ${latestAttempt?.answers?.[question.id] === option.id ? "checked" : ""} required><label class="form-check-label" for="${escapeHtml(progressId)}-${escapeHtml(question.id)}-${escapeHtml(option.id)}">${escapeHtml(option.text)}</label></div>`).join("")}
      ${latestAttempt ? `<div class="learning-answer-feedback ${latestAttempt.answers?.[question.id] === question.correctOptionId ? "is-correct" : "is-incorrect"}"><strong>${latestAttempt.answers?.[question.id] === question.correctOptionId ? "Rätt svar" : "Fel svar"}.</strong> ${escapeHtml(question.explanation)}</div>` : ""}
    </fieldset>`).join("")}
    ${latestAttempt ? `<div class="alert ${latestAttempt.passed ? "alert-success" : "alert-warning"}">Senaste resultat: ${latestAttempt.score}% (${latestAttempt.passed ? "Godkänt" : "Inte godkänt"}).</div>` : ""}
    <button type="submit" class="btn btn-primary btn-sm" ${selectedLearnerId ? "" : "disabled"}>Rätta testet</button>
  </form>`;
}

function renderCourseDetail(course) {
  const progress = selectedLearnerId ? learningProgressRecord(selectedLearnerId, course.id) : learningProgressRecord("", course.id);
  const completed = new Set(progress.completedModuleIds || []);
  const percent = courseProgressPercent(course, progress.completedModuleIds);
  return `<div class="card-header record-header bg-white">
    <a class="small" href="#/learning">Tillbaka till utbildning</a>
    <div class="record-type mt-3">Kurs · version ${course.version}</div><h2 class="h5 mb-1">${escapeHtml(course.title)}</h2><p class="text-secondary mb-0">${escapeHtml(course.summary)}</p>
    <div class="learning-course-progress mt-3"><div class="progress" role="progressbar" aria-label="Kursförlopp" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${percent}%"></div></div><strong>${percent}% genomfört</strong></div>
  </div>
  <div class="card-body learning-course-body">
    <div class="learning-markdown mb-4">${renderLearningMarkdown(course.bodyMarkdown)}</div>
    ${course.modules.map((module, index) => {
      const content = module.contentId ? learningContentById(selectedLearningContent(), module.contentId) : null;
      const isComplete = completed.has(module.id);
      if (module.type === "test" && content) return `<section class="learning-module ${isComplete ? "is-complete" : ""}"><header><span>${index + 1}</span><div><div class="record-type">Kunskapstest</div><h3 class="h6 mb-0">${escapeHtml(module.title)}</h3></div>${isComplete ? '<span class="badge text-bg-success">Klar</span>' : ""}</header>${renderKnowledgeTestForm(content, course, module)}</section>`;
      if (module.type === "reflection") return `<section class="learning-module ${isComplete ? "is-complete" : ""}"><header><span>${index + 1}</span><div><div class="record-type">Reflektion</div><h3 class="h6 mb-0">${escapeHtml(module.title)}</h3></div>${isComplete ? '<span class="badge text-bg-success">Klar</span>' : ""}</header><form data-learning-reflection="${escapeHtml(module.id)}" data-course-id="${escapeHtml(course.id)}"><label class="form-label" for="reflection-${escapeHtml(module.id)}">${escapeHtml(module.prompt)}</label><textarea id="reflection-${escapeHtml(module.id)}" class="form-control" rows="3" required>${escapeHtml(progress.reflections?.[module.id] || "")}</textarea><button type="submit" class="btn btn-primary btn-sm mt-3" ${selectedLearnerId ? "" : "disabled"}>Spara reflektion</button></form></section>`;
      return `<section class="learning-module ${isComplete ? "is-complete" : ""}"><header><span>${index + 1}</span><div><div class="record-type">Referensmaterial</div><h3 class="h6 mb-0">${escapeHtml(module.title)}</h3></div>${isComplete ? '<span class="badge text-bg-success">Klar</span>' : ""}</header>${content ? `<div class="learning-markdown">${renderLearningMarkdown(content.bodyMarkdown)}</div>` : '<div class="alert alert-warning">Materialet ingår inte i kommunens urval.</div>'}<button type="button" class="btn btn-outline-primary btn-sm mt-3" data-complete-learning-module="${escapeHtml(module.id)}" data-course-id="${escapeHtml(course.id)}" ${selectedLearnerId ? "" : "disabled"}>${isComplete ? "Markerad som klar" : "Markera som klar"}</button></section>`;
    }).join("")}
  </div>`;
}

function renderLearning() {
  const route = parseRoute();
  const item = route.id ? learningContentById(selectedLearningContent(), route.id) : null;
  els.learningCatalogPanel.hidden = Boolean(route.id);
  els.learningDetailPanel.hidden = !route.id;
  renderLearningCatalog();
  if (!route.id) return;
  if (!item) {
    els.learningDetailPanel.innerHTML = '<div class="card-body py-5"><h2 class="h5">Innehållet finns inte i kommunens urval</h2><a class="btn btn-outline-primary btn-sm" href="#/learning">Tillbaka till utbildning</a></div>';
    return;
  }
  if (item.type === "course") els.learningDetailPanel.innerHTML = renderCourseDetail(item);
  else if (item.type === "test") els.learningDetailPanel.innerHTML = `<div class="card-header record-header bg-white"><a class="small" href="#/learning">Tillbaka till utbildning</a><div class="record-type mt-3">Kunskapstest · version ${item.version}</div><h2 class="h5 mb-1">${escapeHtml(item.title)}</h2><p class="text-secondary mb-0">${escapeHtml(item.summary)}</p></div><div class="card-body">${renderKnowledgeTestForm(item)}</div>`;
  else els.learningDetailPanel.innerHTML = `<div class="card-header record-header bg-white"><a class="small" href="#/learning">Tillbaka till utbildning</a><div class="record-type mt-3">Referensmaterial · version ${item.version}</div><h2 class="h5 mb-1">${escapeHtml(item.title)}</h2><p class="text-secondary mb-0">${escapeHtml(item.summary)}</p></div><article class="card-body learning-markdown learning-material-body">${renderLearningMarkdown(item.bodyMarkdown)}</article>`;
}

function renderLearningAdministration() {
  const route = parseRoute();
  const item = route.id ? learningContentById(learningContent, route.id) : null;
  els.learningAdminListPanel.hidden = Boolean(route.id);
  els.learningAdminDetailPanel.hidden = !route.id;
  const selectionById = new Map(tenantLearningSelection.map((selection) => [selection.contentId, selection]));
  const explicitSelections = tenantLearningSelection.filter((selection) => selection.explicit);
  const explicitCount = explicitSelections.length;
  const inheritedCount = tenantLearningSelection.length - explicitCount;
  const publicCount = tenantLearningSelection.filter((selection) => selection.public).length;
  const visibleContent = learningContent.filter((content) => {
    if (learningAdminFilter === "selected") return selectionById.has(content.id);
    if (learningAdminFilter === "available") return !selectionById.has(content.id);
    return true;
  });
  const requiredByCourses = (contentId) => explicitSelections
    .map((selection) => learningContentById(learningContent, selection.contentId))
    .filter((selected) => selected?.type === "course" && selected.modules?.some((module) => module.contentId === contentId))
    .map((course) => course.title);
  const filters = [
    ["all", "Alla", learningContent.length],
    ["selected", "Kommunens urval", tenantLearningSelection.length],
    ["available", "Inte valda", learningContent.length - tenantLearningSelection.length]
  ];
  els.learningAdminListPanel.innerHTML = `
    <div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-start gap-3">
      <div><div class="record-type">Aktuell kommun</div><h2 class="h5 mb-1">Kommunportalens utbildningsurval</h2><p class="text-secondary mb-0">Välj vilket innehåll som ska visas i kommunens utbildningskatalog.</p></div>
      <a class="btn btn-outline-primary btn-sm" href="#/learning">Visa kommunens katalog</a>
    </div>
    <div class="learning-selection-summary" aria-label="Sammanfattning av kommunens utbildningsurval">
      <div><strong>${tenantLearningSelection.length}</strong><span>innehållspaket visas</span></div>
      <div><strong>${explicitCount}</strong><span>direkt valda</span></div>
      <div><strong>${inheritedCount}</strong><span>ingår via kurs</span></div>
      <div><strong>${publicCount}</strong><span>publika material</span></div>
    </div>
    <div class="card-body border-bottom py-3">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div class="btn-group btn-group-sm" role="group" aria-label="Filtrera kommunens utbildningsurval">
          ${filters.map(([value, label, count]) => `<button type="button" class="btn ${learningAdminFilter === value ? "btn-secondary" : "btn-outline-secondary"}" data-learning-admin-filter="${value}" aria-pressed="${learningAdminFilter === value}">${label} <span class="badge text-bg-light ms-1">${count}</span></button>`).join("")}
        </div>
        <p class="small text-secondary mb-0">Kurser inkluderar automatiskt material och test som kursen behöver.</p>
      </div>
    </div>
    <div class="table-responsive"><table class="table table-sm table-hover align-middle mb-0"><thead class="table-light"><tr><th>Innehåll</th><th>Typ</th><th>Version</th><th>Kommunens urval</th><th>Publikt för föräldrar</th><th class="text-end">Åtgärd</th></tr></thead><tbody>${visibleContent.map((content) => {
    const selection = selectionById.get(content.id);
    const parentCourses = selection && !selection.explicit ? requiredByCourses(content.id) : [];
    const selectionLabel = selection ? selection.explicit ? "Direkt valt" : "Ingår via kurs" : "Inte valt";
    const canBePublic = Boolean(selection) && content.type === "material";
    return `<tr><td><strong>${escapeHtml(content.title)}</strong><small class="d-block text-secondary">${escapeHtml(content.summary)}</small></td><td>${learningTypeLabel(content.type)}</td><td>v${content.version}${selection && Number(selection.selectedVersion) < Number(content.version) ? '<small class="d-block text-warning-emphasis">Ny version finns</small>' : ""}</td><td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" aria-label="Visa ${escapeHtml(content.title)} för aktuell kommun" data-learning-selection="${escapeHtml(content.id)}" ${selection ? "checked" : ""} ${selection && !selection.explicit ? "disabled" : ""}><label class="form-check-label">${selectionLabel}</label>${parentCourses.length ? `<small class="d-block text-secondary">Krävs av: ${escapeHtml(parentCourses.join(", "))}</small>` : ""}</div></td><td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" aria-label="Exponera ${escapeHtml(content.title)} publikt" data-learning-public="${escapeHtml(content.id)}" ${selection?.public ? "checked" : ""} ${canBePublic ? "" : "disabled"}><label class="form-check-label">${selection?.public ? "Publikt" : "Inte publikt"}</label>${content.type !== "material" ? '<small class="d-block text-secondary">Endast referensmaterial</small>' : !selection ? '<small class="d-block text-secondary">Välj först för kommunen</small>' : ""}</div></td><td class="text-end"><a class="btn btn-outline-primary btn-sm" href="#/learning-admin/${encodeURIComponent(content.id)}">Öppna</a></td></tr>`;
  }).join("") || '<tr><td colspan="6" class="text-center text-secondary py-4">Inget innehåll matchar filtret.</td></tr>'}</tbody></table></div>`;
  if (!route.id) return;
  if (!item) {
    els.learningAdminDetailPanel.innerHTML = '<div class="card-body py-5"><h2 class="h5">Innehållspaketet finns inte</h2><a class="btn btn-outline-primary btn-sm" href="#/learning-admin">Tillbaka</a></div>';
    return;
  }
  const selection = selectionById.get(item.id);
  const structure = item.type === "course" ? `<section class="record-section"><h3 class="record-section-title">Kursmoment</h3><ol class="mb-0">${item.modules.map((module) => `<li>${escapeHtml(module.title)} <span class="text-secondary">(${learningTypeLabel(module.type)})</span></li>`).join("")}</ol></section>` : item.type === "test" ? `<section class="record-section"><h3 class="record-section-title">Testfrågor</h3><ol class="mb-0">${item.questions.map((question) => `<li>${escapeHtml(question.prompt)}</li>`).join("")}</ol></section>` : "";
  els.learningAdminDetailPanel.innerHTML = `<div class="card-header record-header bg-white"><a class="small" href="#/learning-admin">Tillbaka till utbildningsinnehåll</a><div class="d-flex flex-wrap justify-content-between gap-3 mt-3"><div><div class="record-type">${learningTypeLabel(item.type)}</div><p class="record-id mb-1">Tekniskt ID ${escapeHtml(item.id)}</p><h2 class="h5 mb-0">${escapeHtml(item.title)}</h2></div><div class="d-flex gap-2 align-items-start">${selection && Number(selection.selectedVersion) < Number(item.version) ? `<button type="button" class="btn btn-outline-primary btn-sm" data-use-latest-learning="${escapeHtml(item.id)}">Använd version ${item.version}</button>` : ""}<button type="submit" form="learningAdminForm" class="btn btn-primary btn-sm">Spara ny version</button></div></div><dl class="record-meta mb-0 mt-3"><div><dt>Senaste version</dt><dd>${item.version}</dd></div><div><dt>Kommunens version</dt><dd>${selection ? selection.selectedVersion : "Ingår inte"}</dd></div><div><dt>Omfång</dt><dd>${item.scope === "shared" ? "Gemensamt bibliotek" : "Kommunens eget"}</dd></div></dl></div><form id="learningAdminForm" class="card-body record-grid" data-content-id="${escapeHtml(item.id)}"><section class="record-section"><h3 class="record-section-title">Innehåll</h3><label class="form-label" for="learningAdminTitle">Rubrik</label><input id="learningAdminTitle" class="form-control mb-3" value="${escapeHtml(item.title)}" required><label class="form-label" for="learningAdminSummary">Sammanfattning</label><textarea id="learningAdminSummary" class="form-control mb-3" rows="2" required>${escapeHtml(item.summary)}</textarea><label class="form-label" for="learningAdminMarkdown">Text i Markdown</label><textarea id="learningAdminMarkdown" class="form-control font-monospace" rows="10" required>${escapeHtml(item.bodyMarkdown)}</textarea><div class="form-text">Rubriker, listor, länkar och citat skrivs med vanlig Markdown.</div>${item.type === "test" ? `<label class="form-label mt-3" for="learningAdminPassingScore">Godkändgräns i procent</label><input id="learningAdminPassingScore" class="form-control" type="number" min="1" max="100" value="${Number(item.passingScore)}" required>` : ""}</section>${structure}</form>`;
}

const assignmentFrequencyLabels = { weekly: "Varje vecka", biweekly: "Varannan vecka", monthly: "Varje månad", as_needed: "Vid behov" };

function mentorAssignments() {
  const mentorId = currentUser().mentorId;
  return cases
    .filter((caseRecord) => caseRecord.caseTypeId === "mentor-assignment" && caseRecord.mentorId === mentorId)
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
}

function mentorCourseSummary(mentorId) {
  const courses = selectedLearningContent().filter((item) => item.type === "course");
  const completed = courses.filter((course) => courseProgressPercent(course, learningProgressRecord(mentorId, course.id).completedModuleIds) === 100).length;
  return { courses, completed };
}

function renderMentorHome() {
  const mentor = currentMentorUser();
  if (!mentor) {
    els.mentorPortalView.innerHTML = '<section class="card"><div class="card-body py-5"><h2 class="h5">Ingen mentor finns i prototypdata</h2><p class="text-secondary mb-0">Byt testanvändare och lägg in prototypdata innan mentorläget används.</p></div></section>';
    return;
  }
  const assignments = mentorAssignments();
  const activeAssignments = assignments.filter((caseRecord) => caseRecord.status !== "closed");
  const reports = mentorReports.filter((report) => report.mentorId === mentor.id);
  const learning = mentorCourseSummary(mentor.id);
  const nextContact = reports.map((report) => report.nextContactOn).filter((date) => date && date >= new Date().toISOString().slice(0, 10)).sort()[0] || null;
  const latestAssignment = activeAssignments[0] || assignments[0] || null;
  els.mentorPortalView.innerHTML = `
    <section class="mentor-welcome">
      <div><div class="record-type">Mentorportal</div><h2>Välkommen, ${escapeHtml(mentor.name)}</h2><p>Här ser du dina uppdrag, rapporterar genomförda kontakter och fortsätter din utbildning.</p></div>
      ${latestAssignment ? `<a class="btn btn-primary" href="#/mentor-assignment/${escapeHtml(latestAssignment.id)}">Öppna aktuellt uppdrag</a>` : ""}
    </section>
    <section class="mentor-summary-grid" aria-label="Din sammanfattning">
      <article><strong>${activeAssignments.length}</strong><span>aktiva uppdrag</span></article>
      <article><strong>${reports.length}</strong><span>registrerade rapporter</span></article>
      <article><strong>${learning.completed} av ${learning.courses.length}</strong><span>kurser klara</span></article>
      <article><strong>${nextContact ? escapeHtml(formatDate(nextContact)) : "Ej planerad"}</strong><span>nästa kontakt</span></article>
    </section>
    <div class="mentor-home-grid">
      <section class="card"><div class="card-header bg-white"><h3 class="h5 mb-1">Mina uppdrag</h3><p class="text-secondary mb-0">Aktuella överenskommelser och återrapportering.</p></div><div class="list-group list-group-flush">${activeAssignments.slice(0, 3).map((caseRecord) => {
        const parent = caseParent(caseRecord);
        return `<a class="list-group-item list-group-item-action mentor-task-link" href="#/mentor-assignment/${escapeHtml(caseRecord.id)}"><span><strong>${escapeHtml(caseRecord.details?.supportPurpose || caseRecord.title)}</strong><small>${escapeHtml(parent?.name || "Förälder")} · ${escapeHtml(caseStatusLabel(caseRecord.status))}</small></span><span>Öppna</span></a>`;
      }).join("") || '<div class="card-body text-secondary">Du har inga aktiva uppdrag.</div>'}</div><div class="card-footer bg-white"><a href="#/mentor-assignments">Visa alla uppdrag</a></div></section>
      <section class="card"><div class="card-header bg-white"><h3 class="h5 mb-1">Utbildning</h3><p class="text-secondary mb-0">Kommunens kurser och material för mentorer.</p></div><div class="card-body"><p class="mentor-progress-value"><strong>${learning.completed}</strong> av ${learning.courses.length} kurser slutförda</p><div class="progress mb-3" role="progressbar" aria-label="Genomförda kurser" aria-valuenow="${learning.courses.length ? Math.round(learning.completed / learning.courses.length * 100) : 0}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${learning.courses.length ? Math.round(learning.completed / learning.courses.length * 100) : 0}%"></div></div><a class="btn btn-outline-primary btn-sm" href="#/learning">Fortsätt utbildningen</a></div></section>
    </div>`;
}

function renderMentorAssignments() {
  const assignments = mentorAssignments();
  els.mentorPortalView.innerHTML = `<section class="card"><div class="card-header bg-white"><h2 class="h5 mb-1">Mina uppdrag</h2><p class="text-secondary mb-0">Varje uppdrag gäller ett avgränsat stödbehov och har en egen plan och rapportering.</p></div><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Uppdrag</th><th>Förälder</th><th>Period</th><th>Status</th><th>Senast rapporterat</th><th></th></tr></thead><tbody>${assignments.map((caseRecord) => {
    const plan = caseRecord.details?.assignmentPlan || {};
    const reports = assignmentRecords(caseRecord.id).reports;
    return `<tr><td><strong>${escapeHtml(caseRecord.details?.supportPurpose || caseRecord.title)}</strong><small class="d-block text-secondary">${escapeHtml(caseRecord.number)}</small></td><td>${escapeHtml(caseParent(caseRecord)?.name || "Ej angivet")}</td><td>${plan.startDate ? escapeHtml(formatDate(plan.startDate)) : "Ej angivet"} – ${plan.endDate ? escapeHtml(formatDate(plan.endDate)) : "Tills vidare"}</td><td><span class="${caseStatusBadge(caseRecord.status)}">${escapeHtml(caseStatusLabel(caseRecord.status))}</span></td><td>${reports[0] ? escapeHtml(formatDate(reports[0].occurredOn)) : "Ingen rapport"}</td><td class="text-end"><a class="btn btn-outline-primary btn-sm" href="#/mentor-assignment/${escapeHtml(caseRecord.id)}">Öppna</a></td></tr>`;
  }).join("") || '<tr><td colspan="6" class="text-center text-secondary py-4">Inga uppdrag är registrerade.</td></tr>'}</tbody></table></div></section>`;
}

function renderMentorAssignment() {
  const route = parseRoute();
  const caseRecord = mentorAssignments().find((assignment) => assignment.id === route.id);
  if (!caseRecord) {
    els.mentorPortalView.innerHTML = '<section class="card"><div class="card-body py-5"><h2 class="h5">Uppdraget finns inte</h2><p class="text-secondary">Du kan bara öppna uppdrag som är kopplade till din mentorprofil.</p><a class="btn btn-outline-primary btn-sm" href="#/mentor-assignments">Till mina uppdrag</a></div></section>';
    return;
  }
  const plan = caseRecord.details?.assignmentPlan || {};
  const reports = assignmentRecords(caseRecord.id).reports;
  const parent = caseParent(caseRecord);
  const owner = responsibleHandler(caseRecord);
  const closed = caseRecord.status === "closed";
  els.mentorPortalView.innerHTML = `<section class="card mentor-assignment-card"><div class="card-header record-header bg-white"><a class="small" href="#/mentor-assignments">Tillbaka till mina uppdrag</a><div class="d-flex flex-wrap justify-content-between gap-3 mt-3"><div><div class="record-type">Mentoruppdrag · ${escapeHtml(caseRecord.number)}</div><h2 class="h5 mb-1">${escapeHtml(caseRecord.details?.supportPurpose || caseRecord.title)}</h2><p class="text-secondary mb-0">${escapeHtml(caseRecord.details?.desiredOutcome || caseRecord.description || "")}</p></div><span class="${caseStatusBadge(caseRecord.status)} align-self-start">${escapeHtml(caseStatusLabel(caseRecord.status))}</span></div><dl class="record-meta mt-3 mb-0"><div><dt>Förälder</dt><dd>${escapeHtml(parent?.name || "Ej angivet")}</dd></div><div><dt>Ansvarig handläggare</dt><dd>${escapeHtml(owner?.name || "Ej tilldelad")}</dd></div><div><dt>Period</dt><dd>${plan.startDate ? escapeHtml(formatDate(plan.startDate)) : "Ej angivet"} – ${plan.endDate ? escapeHtml(formatDate(plan.endDate)) : "Tills vidare"}</dd></div></dl></div>
    <div class="card-body record-grid"><section class="record-section"><h3 class="record-section-title">Uppdragsplan</h3><dl class="mentor-plan-facts"><div><dt>Kontakt</dt><dd>${escapeHtml(assignmentFrequencyLabels[plan.contactFrequency] || "Ej angivet")}</dd></div><div><dt>Kontaktform</dt><dd>${escapeHtml(contactModeLabels[plan.contactMode] || "Ej angivet")}</dd></div><div><dt>Nästa uppföljning</dt><dd>${plan.firstFollowUpDate ? escapeHtml(formatDate(plan.firstFollowUpDate)) : "Ej angivet"}</dd></div><div><dt>Rapportering</dt><dd>Senast ${Number(plan.reportDeadlineDays ?? 3)} dagar efter kontakt</dd></div></dl>${plan.note ? `<div class="mentor-instruction"><strong>Viktigt i uppdraget</strong><p>${escapeHtml(plan.note)}</p></div>` : ""}</section>
    <section class="record-section"><div class="d-flex flex-wrap justify-content-between align-items-start gap-2"><div><h3 class="record-section-title mb-1">Återrapportera kontakt</h3><p class="small text-secondary mb-0">Registrera en kort saklig rapport efter varje planerad kontakt.</p></div></div>${closed ? '<div class="alert alert-secondary mt-3 mb-0">Uppdraget är avslutat och tar inte emot nya rapporter.</div>' : `<form id="mentorPortalReportForm" class="mentor-report-form mt-3" data-case-id="${escapeHtml(caseRecord.id)}"><div><label class="form-label" for="mentorPortalReportDate">Datum</label><input id="mentorPortalReportDate" name="occurredOn" class="form-control" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div><div><label class="form-label" for="mentorPortalReportDuration">Tid i minuter</label><input id="mentorPortalReportDuration" name="durationMinutes" class="form-control" type="number" min="1" value="60" required></div><div><label class="form-label" for="mentorPortalReportMode">Kontaktform</label><select id="mentorPortalReportMode" name="mode" class="form-select"><option value="physical">Fysiskt möte</option><option value="digital">Digitalt möte</option><option value="phone">Telefon</option><option value="message">Meddelande</option></select></div><div><label class="form-label" for="mentorPortalReportOutcome">Resultat</label><select id="mentorPortalReportOutcome" name="outcome" class="form-select"><option value="completed">Genomförd</option><option value="cancelled">Inställd</option><option value="no_show">Uteblev</option></select></div><div class="mentor-report-summary"><label class="form-label" for="mentorPortalReportSummary">Kort sammanfattning</label><textarea id="mentorPortalReportSummary" name="summary" class="form-control" rows="3" required></textarea></div><div><label class="form-label" for="mentorPortalNextContact">Nästa kontakt (valfritt)</label><input id="mentorPortalNextContact" name="nextContactOn" class="form-control" type="date"></div><div class="form-check mentor-report-support"><input id="mentorPortalNeedsSupport" name="needsHandlerSupport" class="form-check-input" type="checkbox"><label class="form-check-label" for="mentorPortalNeedsSupport">Jag behöver stöd från handläggaren</label></div><div class="mentor-report-actions"><button class="btn btn-primary" type="submit">Skicka rapport</button></div></form>`}</section>
    <section class="record-section record-section-wide"><h3 class="record-section-title">Tidigare rapporter</h3><div class="table-responsive border rounded"><table class="table table-sm align-middle mb-0"><thead class="table-light"><tr><th>Datum</th><th>Kontaktform</th><th>Tid</th><th>Resultat</th><th>Sammanfattning</th></tr></thead><tbody>${reports.map((report) => `<tr><td>${escapeHtml(formatDate(report.occurredOn))}</td><td>${escapeHtml(contactModeLabels[report.mode] || report.mode)}</td><td>${escapeHtml(formatMinutes(report.durationMinutes))}</td><td>${escapeHtml(reportOutcomeLabels[report.outcome] || report.outcome)}${report.needsHandlerSupport ? '<small class="d-block text-danger">Stöd begärt</small>' : ""}</td><td>${escapeHtml(report.summary)}</td></tr>`).join("") || '<tr><td colspan="5" class="text-center text-secondary py-3">Ingen rapport har registrerats ännu.</td></tr>'}</tbody></table></div></section></div></section>`;
}

function renderMentorProfile() {
  const mentor = currentMentorUser();
  if (!mentor) return renderMentorHome();
  const owner = handlers.find((handler) => handler.id === mentor.coordinatorId);
  const experienceAreas = normalizeMentorSupportAreas(mentor.supportAreas);
  els.mentorPortalView.innerHTML = `<section class="card mentor-profile-card"><div class="card-header record-header bg-white"><div class="record-type">Mentorprofil</div><h2 class="h5 mb-1">${escapeHtml(mentor.name)}</h2><p class="text-secondary mb-0">De uppgifter kommunen använder vid matchning och kontakt.</p></div><div class="card-body"><dl class="mentor-profile-facts"><div><dt>Kontaktuppgift</dt><dd>${escapeHtml(mentor.contactDetails || mentor.contact || "Ej angivet")}</dd></div><div><dt>Område</dt><dd>${escapeHtml(mentor.area || "Ej angivet")}</dd></div><div><dt>Språk</dt><dd>${escapeHtml(mentor.languages || "Ej angivet")}</dd></div><div><dt>Tillgänglighet</dt><dd>${escapeHtml(mentor.availability || "Ej angivet")}</dd></div><div><dt>Status</dt><dd><span class="${statusClass(mentor)}">${escapeHtml(mentor.status)}</span></dd></div><div><dt>Kontaktperson</dt><dd>${escapeHtml(owner?.name || mentor.coordinator || "Ej tilldelad")}</dd></div></dl><section class="record-section mt-4"><h3 class="record-section-title">Mina erfarenhetsområden</h3><p class="small text-secondary">Uppgifterna används som underlag när kommunen bedömer en möjlig matchning.</p><div class="support-area-facts">${experienceAreas.length ? experienceAreas.map((entry) => `<div class="support-area-fact"><strong>${escapeHtml(supportAreaById(entry.areaId)?.title || entry.areaId)}</strong><span>${escapeHtml(entry.experienceLevels.map((level) => Object.fromEntries(MENTOR_EXPERIENCE_LEVELS)[level]).filter(Boolean).join(" · ") || "Erfarenhet registrerad")}</span></div>`).join("") : '<p class="text-secondary mb-0">Inga erfarenhetsområden är registrerade.</p>'}</div></section><div class="alert alert-light border mt-4 mb-0"><strong>Behöver något ändras?</strong><p class="mb-0 mt-1">Kontakta din handläggare. Känsliga register- och identitetsuppgifter visas inte i mentorportalen.</p></div></div></section>`;
}

function renderMentorPortal() {
  if (currentView === "mentor-home") renderMentorHome();
  else if (currentView === "mentor-assignments") renderMentorAssignments();
  else if (currentView === "mentor-assignment") renderMentorAssignment();
  else renderMentorProfile();
}

function renderPublicHome() {
  const materials = selectedPublicLearningContent();
  els.publicPortalView.innerHTML = `
    <section class="public-intro">
      <div><div class="record-type">Föräldramentorer</div><h2>Du kan söka stöd i din vardag som förälder</h2><p>Kommunen kan hjälpa dig att beskriva ditt behov och bedöma om stöd av en föräldramentor passar. Du behöver inte veta exakt vilket stöd du ska söka.</p><div class="d-flex flex-wrap gap-2 mt-4"><a class="btn btn-primary" href="#/public-support">Sök stöd</a><a class="btn btn-outline-primary" href="#/public-learning">Läs råd och material</a></div></div>
      <aside><strong>Är situationen akut?</strong><p>Vid omedelbar fara, ring 112. Föräldramentorstöd är inte en akutinsats.</p></aside>
    </section>
    <section class="public-process" aria-labelledby="publicProcessTitle"><div><h3 id="publicProcessTitle" class="h5 mb-1">Så går det till</h3><p class="text-secondary mb-0">En förfrågan leder inte automatiskt till ett beslut eller ett mentoruppdrag.</p></div><ol><li><span>1</span><div><strong>Skicka en förfrågan</strong><p>Beskriv kort vad du vill ha hjälp med och hur kommunen kan kontakta dig.</p></div></li><li><span>2</span><div><strong>Kommunen kontaktar dig</strong><p>En handläggare går igenom behovet tillsammans med dig.</p></div></li><li><span>3</span><div><strong>Ni tar ställning</strong><p>Om stödet passar får både du och en föreslagen mentor tacka ja innan ett uppdrag startar.</p></div></li></ol></section>
    <section class="card"><div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-start gap-3"><div><h3 class="h5 mb-1">Råd och information</h3><p class="text-secondary mb-0">Referensmaterial som kommunen har valt att publicera.</p></div><a href="#/public-learning">Visa allt material</a></div><div class="public-material-preview">${materials.slice(0, 3).map((item) => `<a href="#/public-learning/${encodeURIComponent(item.id)}"><span class="record-type">Information</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary)}</small></a>`).join("") || '<p class="text-secondary mb-0">Kommunen har ännu inte publicerat något material.</p>'}</div></section>`;
}

function renderPublicSupport() {
  const receipt = publicSupportRequests.find((request) => request.id === lastPublicSupportRequestId);
  if (receipt) {
    els.publicPortalView.innerHTML = `<section class="card public-support-confirmation"><div class="card-body"><div class="public-confirmation-mark" aria-hidden="true">✓</div><div class="record-type">Förfrågan registrerad</div><h2 class="h4">Tack, ${escapeHtml(receipt.name)}</h2><p>Förfrågan är registrerad med ${escapeHtml(receipt.contactMethod === "phone" ? "telefon" : "e-post")} som önskad kontaktväg.</p><dl><div><dt>Valda stödområden</dt><dd>${escapeHtml(supportAreaLabels(receipt.supportAreaIds).join(", ") || (receipt.supportAreaUncertain ? "Behöver preciseras tillsammans med kommunen" : "Inga valda"))}</dd></div></dl><div class="alert alert-warning mt-3">I prototypmiljön sparas förfrågan endast lokalt i den här webbläsaren och skickas inte till kommunen.</div><dl><div><dt>Referens</dt><dd>${escapeHtml(receipt.reference)}</dd></div><div><dt>Registrerad</dt><dd>${escapeHtml(formatDateTime(receipt.createdAt))}</dd></div></dl><p class="small text-secondary">Skicka inte känsliga uppgifter i en ny förfrågan.</p><div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-outline-primary" data-new-public-support>Skicka en ny förfrågan</button><a class="btn btn-primary" href="#/public-home">Till startsidan</a></div></div></section>`;
    return;
  }
  els.publicPortalView.innerHTML = `<section class="card public-support-card"><div class="card-header bg-white"><div class="record-type">Förfrågan om stöd</div><h2 class="h5 mb-1">Berätta kort hur kommunen kan hjälpa dig</h2><p class="text-secondary mb-0">Fyll bara i det som behövs för att kommunen ska kunna kontakta dig. Du får beskriva behovet närmare tillsammans med en handläggare.</p></div><form id="publicSupportForm" class="card-body public-support-form"><div><label class="form-label" for="publicSupportName">Namn</label><input id="publicSupportName" name="name" class="form-control" autocomplete="name" required></div><div><label class="form-label" for="publicSupportContactMethod">Jag vill bli kontaktad via</label><select id="publicSupportContactMethod" name="contactMethod" class="form-select"><option value="phone">Telefon</option><option value="email">E-post</option></select></div><div><label class="form-label" for="publicSupportContact">Telefonnummer eller e-post</label><input id="publicSupportContact" name="contact" class="form-control" autocomplete="tel" required></div><div><label class="form-label" for="publicSupportArea">Område eller stadsdel <span class="text-secondary">(valfritt)</span></label><input id="publicSupportArea" name="area" class="form-control"></div><div class="public-support-description"><label class="form-label mb-1">Vad vill du ha stöd med?</label><p class="form-text mt-0">Välj gärna flera områden. Du behöver inte ha en diagnos eller veta exakt vilket stöd som passar.</p><div id="publicSupportAreaChoices" class="support-area-choices public-support-area-choices"></div><label class="form-check mt-2"><input class="form-check-input" type="checkbox" name="supportAreaUncertain" value="yes"><span class="form-check-label">Jag vet inte ännu och vill prata med kommunen</span></label></div><div class="public-support-description"><label class="form-label" for="publicSupportDescription">Beskriv kort vad du vill ha hjälp med</label><textarea id="publicSupportDescription" name="description" class="form-control" rows="4" maxlength="1000" required></textarea><div class="form-text">Ange inte personnummer, journaluppgifter eller andra känsliga uppgifter.</div></div><div class="public-support-description"><label class="form-label" for="publicSupportAvailability">När passar det att kommunen kontaktar dig? <span class="text-secondary">(valfritt)</span></label><input id="publicSupportAvailability" name="availability" class="form-control" placeholder="Till exempel vardagar efter klockan 15"></div><div class="form-check public-support-consent"><input id="publicSupportConsent" name="consent" class="form-check-input" type="checkbox" required><label class="form-check-label" for="publicSupportConsent">Jag förstår att detta är en förfrågan och att kommunen kontaktar mig innan något stöd eller uppdrag startar.</label></div><div class="public-support-actions"><a class="btn btn-outline-secondary" href="#/public-home">Avbryt</a><button type="submit" class="btn btn-primary">Skicka förfrågan</button></div></form></section>`;
  renderSupportAreaChoices(els.publicPortalView.querySelector("#publicSupportAreaChoices"), [], { name: "publicSupportArea", publicOnly: true });
}

function renderPublicLearning() {
  const route = parseRoute();
  const materials = selectedPublicLearningContent();
  const item = route.id ? learningContentById(materials, route.id) : null;
  if (route.id) {
    els.publicPortalView.innerHTML = item
      ? `<article class="card public-material-detail"><div class="card-header record-header bg-white"><a class="small" href="#/public-learning">Tillbaka till råd och material</a><div class="record-type mt-3">Information från kommunen</div><h2 class="h5 mb-1">${escapeHtml(item.title)}</h2><p class="text-secondary mb-0">${escapeHtml(item.summary)}</p></div><div class="card-body learning-markdown learning-material-body">${renderLearningMarkdown(item.bodyMarkdown)}</div><div class="card-footer bg-white"><a class="btn btn-primary btn-sm" href="#/public-support">Sök stöd</a></div></article>`
      : '<section class="card"><div class="card-body py-5"><h2 class="h5">Materialet är inte publicerat</h2><p class="text-secondary">Materialet finns inte eller har tagits bort från kommunens publika urval.</p><a class="btn btn-outline-primary btn-sm" href="#/public-learning">Till råd och material</a></div></section>';
    return;
  }
  els.publicPortalView.innerHTML = `<section class="card"><div class="card-header bg-white"><h2 class="h5 mb-1">Råd och material</h2><p class="text-secondary mb-0">Information som kommunen har valt att göra tillgänglig utan inloggning.</p></div><div class="public-learning-grid">${materials.map((material) => `<article><div class="record-type">Referensmaterial</div><h3>${escapeHtml(material.title)}</h3><p>${escapeHtml(material.summary)}</p><a class="btn btn-outline-primary btn-sm" href="#/public-learning/${encodeURIComponent(material.id)}">Läs materialet</a></article>`).join("") || '<div class="empty-list text-secondary">Kommunen har ännu inte publicerat något material.</div>'}</div></section>`;
}

function renderPublicPortal() {
  if (currentView === "public-home") renderPublicHome();
  else if (currentView === "public-support") renderPublicSupport();
  else renderPublicLearning();
}

function appendSupportMessage(role, text, response = null) {
  const message = document.createElement("div");
  message.className = `support-message support-message-${role}`;
  const label = document.createElement("div");
  label.className = "support-message-label";
  label.textContent = role === "user" ? "Du" : "AI-support";
  const body = document.createElement("p");
  body.className = "mb-0";
  body.textContent = text;
  message.append(label, body);
  if (response) {
    const meta = document.createElement("div");
    meta.className = "support-answer-meta";
    const mode = document.createElement("span");
    mode.className = "badge text-bg-light border";
    mode.textContent = response.mode === "ai" ? "AI-svar" : "Lokalt supportsvar";
    const category = document.createElement("span");
    category.className = "badge text-bg-light border";
    category.textContent = supportCategoryLabel(response.category);
    meta.append(mode, category);
    message.append(meta);
    if (response.sources?.length) {
      const links = document.createElement("div");
      links.className = "support-answer-links";
      for (const source of response.sources.slice(0, 3)) {
        const link = document.createElement("a");
        link.href = source.href;
        link.textContent = source.title || source.label || "Öppna funktion";
        links.append(link);
      }
      message.append(links);
    }
  }
  els.supportConversation.append(message);
  els.supportConversation.scrollTop = els.supportConversation.scrollHeight;
}

function supportContext() {
  return {
    role: currentUser().role,
    view: currentView,
    route: window.location.hash || "#/dashboard"
  };
}

async function askSupport(question) {
  const context = supportContext();
  const knowledge = findSupportKnowledge(question, context).map(({ title, answer, href }) => ({ title, answer, href }));
  try {
    const response = await fetch("./api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, context, knowledge })
    });
    if (!response.ok) throw new Error(`Support endpoint returned ${response.status}`);
    const result = await response.json();
    if (!result?.answer) throw new Error("Support response was empty");
    return {
      ...result,
      category: result.category || "general",
      mode: "ai",
      sources: Array.isArray(result.sources) ? result.sources : knowledge.slice(0, 2)
    };
  } catch (error) {
    console.info("AI-support is not configured; using local support knowledge.", error);
    return localSupportResponse(question, context);
  }
}

function supportTicketStatusLabel(status) {
  return { new: "Nytt", in_progress: "Pågår", resolved: "Avslutat" }[status] || "Nytt";
}

const publicSupportRequestStatusLabels = { received: "Ny", intake_created: "I mottagning", closed: "Avslutad" };

function renderPublicSupportRequestQueue() {
  if (!els.publicSupportRequestTableBody) return;
  const rows = publicSupportRequests.filter((request) => request.status !== "closed");
  els.publicSupportRequestTableBody.replaceChildren();
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "text-center text-secondary py-4";
    cell.textContent = "Inga publika stödförfrågningar väntar på mottagning.";
    row.append(cell);
    els.publicSupportRequestTableBody.append(row);
    return;
  }
  for (const request of rows) {
    const row = document.createElement("tr");
    const existingContact = incomingContacts.find((contact) => contact.publicSupportRequestId === request.id);
    const action = existingContact
      ? `<button type="button" class="btn btn-outline-primary btn-sm" data-open-incoming-contact="${escapeHtml(existingContact.id)}">Öppna mottagning</button>`
      : `<button type="button" class="btn btn-primary btn-sm" data-create-intake-from-public-support="${escapeHtml(request.id)}">Ta emot</button>`;
    row.innerHTML = `<td>${escapeHtml(formatDateTime(request.createdAt))}<div class="small text-secondary">${escapeHtml(request.reference)}</div></td><td><strong>${escapeHtml(request.name)}</strong><div class="small text-secondary">${escapeHtml(request.area || "Område ej angivet")}</div></td><td>${escapeHtml(request.contactMethod === "email" ? "E-post" : "Telefon")}<div class="small text-secondary">${escapeHtml(request.contact)}</div></td><td>${escapeHtml(supportAreaLabels(request.supportAreaIds).join(", ") || (request.supportAreaUncertain ? "Behöver preciseras" : "Ej valt"))}</td><td><span class="badge text-bg-light border">${escapeHtml(publicSupportRequestStatusLabels[request.status] || request.status)}</span></td><td class="text-end">${action}</td>`;
    els.publicSupportRequestTableBody.append(row);
  }
}

function renderSupportAdministration() {
  if (!els.supportTicketTableBody) return;
  renderPublicSupportRequestQueue();
  const visible = supportTickets.filter((ticket) => supportTicketStatusFilter === "all" || ticket.status === supportTicketStatusFilter);
  els.supportTicketTableBody.replaceChildren();
  if (!visible.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "text-center text-secondary py-4";
    cell.textContent = "Inga supportärenden i detta urval.";
    row.append(cell);
    els.supportTicketTableBody.append(row);
    return;
  }
  for (const ticket of visible) {
    const row = document.createElement("tr");
    const created = document.createElement("td");
    created.textContent = new Date(ticket.createdAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
    const type = document.createElement("td");
    type.textContent = supportCategoryLabel(ticket.category);
    const question = document.createElement("td");
    question.textContent = ticket.source === "demo_feedback" && ticket.presentationStepTitle
      ? `${ticket.presentationStepTitle}: ${ticket.question}`
      : ticket.question;
    const reporter = document.createElement("td");
    reporter.textContent = `${ticket.reporterName} · ${ticket.contextRole}`;
    const status = document.createElement("td");
    status.textContent = supportTicketStatusLabel(ticket.status);
    const action = document.createElement("td");
    action.className = "text-end";
    const select = document.createElement("select");
    select.className = "form-select form-select-sm d-inline-block w-auto";
    select.dataset.supportTicketStatus = ticket.id;
    for (const [value, labelText] of [["new", "Nytt"], ["in_progress", "Pågår"], ["resolved", "Avslutat"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = labelText;
      option.selected = ticket.status === value;
      select.append(option);
    }
    action.append(select);
    row.append(created, type, question, reporter, status, action);
    els.supportTicketTableBody.append(row);
  }
}

function renderSupportAreaAdministration() {
  const selectionById = new Map(tenantSupportAreaSelection.map((selection) => [selection.supportAreaId, selection]));
  const enabledCount = tenantSupportAreaSelection.filter((selection) => selection.enabled).length;
  const publicCount = tenantSupportAreaSelection.filter((selection) => selection.enabled && selection.public).length;
  els.supportAreaAdminSummary.textContent = `${enabledCount} används · ${publicCount} visas publikt`;
  els.supportAreaAdminGroups.innerHTML = SUPPORT_AREA_CATEGORIES.map((category) => {
    const areas = SUPPORT_AREAS.filter((area) => area.categoryId === category.id);
    return `<section class="support-area-admin-group"><header><h3>${escapeHtml(category.label)}</h3><span>${areas.length} områden</span></header><div class="support-area-admin-list">${areas.map((area) => {
      const selection = selectionById.get(area.id) || {};
      return `<article class="support-area-admin-row"><div class="support-area-admin-description"><strong>${escapeHtml(area.title)}</strong><p>${escapeHtml(area.publicDescription)}</p><small>${escapeHtml(area.scopeNote)}</small></div><div class="support-area-admin-controls"><label class="form-check form-switch"><input class="form-check-input" type="checkbox" data-support-area-enabled="${escapeHtml(area.id)}" ${selection.enabled ? "checked" : ""}><span class="form-check-label">Används av kommunen</span></label><label class="form-check form-switch"><input class="form-check-input" type="checkbox" data-support-area-public="${escapeHtml(area.id)}" ${selection.public ? "checked" : ""} ${selection.enabled ? "" : "disabled"}><span class="form-check-label">Visas för föräldrar</span></label></div></article>`;
    }).join("")}</div></section>`;
  }).join("");
}

function selectedCaseNumberMode() {
  return els.caseNumberingForm.querySelector('input[name="caseNumberMode"]:checked')?.value || "sequential";
}

function updateCaseNumberingPreview() {
  const sequential = selectedCaseNumberMode() === "sequential";
  els.caseNumberSequenceFields.hidden = !sequential;
  els.nextCaseSequenceInput.required = sequential;
  els.caseNumberPreview.textContent = sequential
    ? formatSequentialCaseNumber(Math.max(1, Number(els.nextCaseSequenceInput.value || 1)))
    : "Skapas slumpmässigt";
}

function renderCaseNumberingAdministration() {
  const settings = caseNumberSettings || defaultCaseNumberSettings();
  const modeInput = els.caseNumberingForm.querySelector(`input[name="caseNumberMode"][value="${settings.caseNumberMode}"]`);
  if (modeInput) modeInput.checked = true;
  els.nextCaseSequenceInput.value = String(settings.caseNumberYear === currentCaseNumberYear() ? settings.nextCaseSequence : 1);
  els.caseNumberingUpdated.textContent = settings.updatedAt
    ? `Senast ändrad ${formatDateTime(settings.updatedAt)} av ${handlerNameById(settings.updatedBy) || "System"}.`
    : "Grundinställning: löpande nummer.";
  updateCaseNumberingPreview();
}

function renderVersions() {
  els.versionHistoryList.innerHTML = APP_VERSION_HISTORY.map((item) => `
    <article class="version-history-item">
      <div class="version-history-meta">
        <span class="version-badge">v${escapeHtml(item.version)}</span>
        <time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time>
      </div>
      <div class="version-history-content">
        <h3 class="h6 mb-2">${escapeHtml(item.title)}</h3>
        <dl class="version-flow-summary">
          <div>
            <dt>Berört flöde</dt>
            <dd>${escapeHtml(item.flow)}</dd>
          </div>
          <div>
            <dt>Förenklat</dt>
            <dd>${escapeHtml(item.simplified)}</dd>
          </div>
          <div>
            <dt>Bevarat</dt>
            <dd>${escapeHtml(item.retained)}</dd>
          </div>
        </dl>
        <ul class="mb-0">${item.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  const renderStartedAt = Date.now();
  applyRoute();
  renderCurrentUser();
  renderSummary();
  const viewRenderer = {
    dashboard: () => { renderPipeline(); renderDashboard(); },
    versions: renderVersions,
    presentation: renderPresentation,
    cases: renderCases,
    case: renderCaseDetail,
    parents: renderParents,
    parent: renderParentDetail,
    learning: renderLearning,
    mentors: renderTable,
    mentor: renderDetail,
    administration: renderHandlers,
    "case-numbering": renderCaseNumberingAdministration,
    "case-types": selectedActivityTypeId ? renderActivityTypeAdministration : renderCaseTypeAdministration,
    "activity-types": renderActivityTypeAdministration,
    "support-areas": renderSupportAreaAdministration,
    "learning-admin": renderLearningAdministration,
    "support-admin": renderSupportAdministration,
    "mentor-home": renderMentorPortal,
    "mentor-assignments": renderMentorPortal,
    "mentor-assignment": renderMentorPortal,
    "mentor-profile": renderMentorPortal,
    "public-home": renderPublicPortal,
    "public-support": renderPublicPortal,
    "public-learning": renderPublicPortal,
    handler: renderHandlerDetail
  }[currentView];
  viewRenderer?.();
  applyCurrentRouteIntent();
  document.body.dataset.renderView = currentView;
  document.body.dataset.renderDurationMs = String(Date.now() - renderStartedAt);
}

function applyCurrentRouteIntent() {
  if (currentView !== "case" || !caseRouteIntent) return;
  requestAnimationFrame(() => {
    if (caseRouteIntent === "activities") {
      bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-activities-tab")).show();
      els.activityDetailPanel?.scrollIntoView({ block: "start" });
      return;
    }
    if (caseRouteIntent === "matching") {
      bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-overview-tab")).show();
      els.caseTransitionPanel?.scrollIntoView({ block: "start" });
      els.matchingProposalInput?.focus({ preventScroll: true });
      return;
    }
    if (caseRouteIntent === "assignment-followup") {
      bootstrap.Tab.getOrCreateInstance(document.querySelector("#assignment-followup-tab")).show();
      const activity = caseActivities.find((item) => item.id === caseRouteTargetId);
      const workInput = activity ? activityWorkInputSummary(activity, selectedCaseRecord()) : null;
      const target = workInput?.kind === "parent_checkin"
        ? els.parentCheckInForm
        : workInput?.kind === "assignment_evidence"
          ? els.mentorReportsTableWrap
          : els.assignmentPlanForm;
      target?.scrollIntoView({ block: "start" });
      return;
    }
    if (caseRouteIntent === "meetings") {
      bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-meetings-tab")).show();
      if (caseRouteTargetId && els.caseMeetingForm.hidden) {
        openCaseMeetingForm();
        els.caseMeetingActivityInput.value = caseRouteTargetId;
        els.caseMeetingSummaryInput.focus({ preventScroll: true });
      }
    }
  });
}

function currentMentorUser() {
  const assignedMentorIds = new Set(cases
    .filter((caseRecord) => caseRecord.caseTypeId === "mentor-assignment")
    .map((caseRecord) => caseRecord.mentorId)
    .filter(Boolean));
  return candidates.find((candidate) => assignedMentorIds.has(candidate.id))
    || candidates.find((candidate) => normalizeMentorStatus(candidate.status) === "Godkänd")
    || candidates[0]
    || null;
}

function currentUser() {
  if (activeTestUserType === "public") {
    return { id: "public-visitor", name: "Ej inloggad", role: "Förälder", active: true };
  }
  if (activeTestUserType === "mentor") {
    const mentor = currentMentorUser();
    return mentor
      ? { id: mentor.id, name: mentor.name, role: "Mentor", active: true, mentorId: mentor.id }
      : { ...DEMO_MENTOR_USER, role: "Mentor", active: true, mentorId: DEMO_MENTOR_USER.id };
  }
  const requestedId = activeTestUserType === "handler" ? "handler-jonas" : "handler-sara";
  return handlers.find((handler) => handler.id === requestedId)
    || seedHandlers.find((handler) => handler.id === requestedId)
    || { id: requestedId, name: activeTestUserType === "handler" ? "Jonas Berg" : "Sara Lind", role: activeTestUserType === "handler" ? "Handläggare" : "Samordnare" };
}

function currentActorId() {
  return currentUser().id;
}

function isMentorSession() {
  return activeTestUserType === "mentor";
}

function isPublicSession() {
  return activeTestUserType === "public";
}

function currentUserName() {
  return currentUser().name;
}

function buildCheckMeta(checks = {}, fallback = {}) {
  return Object.fromEntries(CHECKS.map(([key]) => {
    const checked = Boolean(checks?.[key]);
    return [key, checked
      ? {
        checkedAt: fallback.checkedAt || new Date().toISOString(),
        checkedBy: fallback.checkedBy || "System",
        note: fallback.note || ""
      }
      : { checkedAt: "", checkedBy: "", note: "" }];
  }));
}

function normalizeCheckMeta(candidate) {
  const fallback = {
    checkedAt: candidate.updatedAt || candidate.createdAt || new Date().toISOString(),
    checkedBy: candidate.coordinator || "System"
  };
  const existing = candidate.checkMeta || {};
  return Object.fromEntries(CHECKS.map(([key]) => {
    const checked = Boolean(candidate.checks?.[key]);
    const meta = existing[key] || {};
    if (!checked) return [key, { checkedAt: "", checkedBy: "", note: "" }];
    if (key === "identityVerified") {
      return [key, {
        checkedAt: candidate.identityVerifiedAt || meta.checkedAt || fallback.checkedAt,
        checkedBy: candidate.identityVerifiedBy || meta.checkedBy || fallback.checkedBy,
        note: meta.note || ""
      }];
    }
    return [key, {
      checkedAt: meta.checkedAt || fallback.checkedAt,
      checkedBy: meta.checkedBy || fallback.checkedBy,
      note: meta.note || ""
    }];
  }));
}

function userInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("sv-SE") || "?";
}

function renderCurrentUser() {
  const user = currentUser();
  CURRENT_USER_ID = user.id;
  els.currentUserName.textContent = user.name;
  els.currentUserRole.textContent = user.active === false ? `${user.role} · Inaktiv` : user.role;
  els.currentUserInitials.textContent = userInitials(user.name);
  els.currentUserLabel.textContent = isPublicSession() ? "Besökarläge" : "Inloggad som";
  els.testUserTypeSelect.value = activeTestUserType;
}

async function migrateCoordinatorReferences() {
  const fullNames = {
    Maja: "Maja Ekström",
    Jonas: "Jonas Berg",
    Sara: "Sara Lind"
  };
  const changed = [];
  for (const candidate of candidates) {
    const handler = candidate.coordinatorId
      ? handlers.find((item) => item.id === candidate.coordinatorId)
      : handlers.find((item) => item.name === candidate.coordinator
        || item.name.split(/\s+/)[0] === candidate.coordinator);
    const coordinatorChanged = Boolean(handler
      && (candidate.coordinatorId !== handler.id || candidate.coordinator !== handler.name));
    const identityVerifiedBy = fullNames[candidate.identityVerifiedBy] || candidate.identityVerifiedBy;
    const history = (candidate.history || []).map((item) => ({
      ...item,
      actor: fullNames[item.actor] || item.actor
    }));
    const historyChanged = history.some((item, index) => item.actor !== candidate.history?.[index]?.actor);
    const identityChanged = identityVerifiedBy !== candidate.identityVerifiedBy;
    if (!coordinatorChanged && !historyChanged && !identityChanged) continue;
    Object.assign(candidate, {
      ...(handler ? { coordinatorId: handler.id, coordinator: handler.name } : {}),
      identityVerifiedBy,
      history
    });
    changed.push(saveCandidate(candidate));
  }
  await Promise.all(changed);
}

function normalizeCandidate(candidate, index = 0) {
  const personalNumber = candidate.personalNumber || (candidate.exampleData ? makeExamplePersonalNumber(index) : "");
  const identityMethod = candidate.identityMethod
    || (candidate.exampleData && candidate.checks?.identityVerified ? (index % 2 === 0 ? "bankid" : "physical_id") : "");
  // Identity data is saved before the case projection is rebuilt. Preserve its
  // audit metadata during that refresh instead of trusting only the stale flag.
  const identityVerified = Boolean(
    personalNumber
    && identityMethod
    && (candidate.checks?.identityVerified || candidate.identityVerifiedAt)
  );
  const createdBy = actorId(candidate.createdBy || candidate.history?.[0]?.actor);
  const normalized = {
    ...candidate,
    status: normalizeMentorStatus(candidate.status),
    tenantId: candidate.tenantId || DEFAULT_TENANT_ID,
    active: candidate.active !== false,
    checks: {
      ...(candidate.checks || {}),
      identityVerified
    },
    personalNumber,
    identityMethod,
    supportAreas: normalizeMentorSupportAreas(candidate.supportAreas),
    createdBy,
    updatedBy: actorId(candidate.updatedBy || createdBy),
    identityVerifiedAt: identityVerified ? candidate.identityVerifiedAt || candidate.updatedAt || candidate.createdAt : "",
    identityVerifiedBy: identityVerified ? candidate.identityVerifiedBy || candidate.coordinator || "System" : ""
  };
  return {
    ...normalized,
    personalNumber,
    identityMethod,
    checkMeta: normalizeCheckMeta(normalized),
    caseNumber: candidate.caseNumber || "",
    coordinatorId: candidate.coordinatorId || "",
    coordinator: candidate.coordinator || "",
    interviewMode: candidate.interviewMode || "",
    history: candidate.history || [
      {
        at: candidate.createdAt || new Date().toISOString(),
        text: "Ärende skapat"
      }
    ]
  };
}

async function ensureUniqueCaseNumbers() {
  const seen = new Set();
  let changed = false;

  for (const candidate of candidates) {
    if (!candidate.caseNumber || seen.has(candidate.caseNumber)) {
      candidate.caseNumber = await reserveCaseNumber();
      candidate.updatedAt = new Date().toISOString();
      candidate.history = [
        ...(candidate.history || []),
        { at: candidate.updatedAt, text: `Ärendenummer satt till ${candidate.caseNumber}` }
      ];
      changed = true;
    }
    seen.add(candidate.caseNumber);
  }

  if (changed) {
    await Promise.all(candidates.map(saveCandidate));
  }
}

function selectedCandidate() {
  return candidates.find((candidate) => candidate.id === selectedId);
}

function isCreatingMentor() {
  return currentView === "mentor" && selectedId === "new";
}

function filteredCandidates() {
  const term = searchTerm.trim().toLowerCase();
  return candidates.filter((candidate) => {
    const statusMatches = !statusFilter || candidate.status === statusFilter;
    const queueMatches = !workQueueOnly || candidateNeedsAction(candidate);
    const text = [
      candidate.caseNumber,
      candidate.name,
      candidate.personalNumber,
      candidate.area,
      candidate.languages,
      candidate.availability,
      candidate.coordinator,
      candidate.status
    ].join(" ").toLowerCase();
    return queueMatches && statusMatches && (!term || text.includes(term));
  });
}

function candidatesNeedingAction() {
  return candidates.filter(candidateNeedsAction);
}

function candidateNeedsAction(candidate) {
  return candidate.status !== "Godkänd" || !candidate.coordinatorId;
}

function isComplete(candidate) {
  return Boolean(
    candidate.coordinatorId
    && candidate.interviewDate
    && candidate.interviewMode
    && CHECKS.every(([key]) => candidate.checks?.[key])
  );
}

function certificationApprovalAssessment(candidate) {
  const caseRecord = cases.find((item) => item.mentorId === candidate?.id && item.caseTypeId === "mentor-certification");
  if (!caseRecord) return { allowed: false, reasons: ["Ärendet om godkännande saknas."] };
  return assessCertificationApproval({
    caseRecord,
    activities: activitiesForCase(caseRecord.id),
    deviations: activityDeviations.filter((deviation) => deviation.caseId === caseRecord.id),
    hasResponsible: Boolean(responsibleHandler(caseRecord)),
    identityComplete: Boolean(candidate?.personalNumber && candidate?.identityMethod)
  });
}

function isBlocked(candidate) {
  return !candidate.checks?.identityVerified || !candidate.checks?.registryChecked || !candidate.checks?.referencesDone;
}

function statusFromChecks(checks) {
  if (!checks?.identityVerified) return "Anmäld";
  if (!checks.registryChecked || !checks.referencesDone) return "Kontrollerad";
  if (!checks.trainingDone || !checks.quizDone) return "Utbildning pågår";
  return "Redo för intervju";
}

function nextStepText(candidate) {
  return nextActionFor(candidate).label;
}

function nextActionFor(candidate) {
  if (!candidate.coordinatorId) {
    return {
      key: "coordinatorAssigned",
      label: "Tilldela handläggare",
      description: "Utse en ansvarig handläggare innan ärendet går vidare i introduktionsflödet.",
      tabId: "mentor-base-tab",
      buttonLabel: "Tilldela handläggare"
    };
  }

  if (candidate.status === "Godkänd") {
    return {
      key: null,
      label: "Ingen åtgärd",
      description: "Mentorn är godkänd och tillgänglig för matchning.",
      tabId: null,
      buttonLabel: ""
    };
  }

  const next = NEXT_ACTIONS.find((action) => !candidate.checks?.[action.key]);
  return next || {
    key: "decision",
    label: "Fatta beslut",
    description: "Alla krav är klara. Granska underlaget och godkänn mentorn.",
    tabId: "mentor-cases-tab",
    buttonLabel: "Öppna beslut"
  };
}

function parseRoute() {
  const hash = window.location.hash || "#/dashboard";
  const [path, query = ""] = hash.split("?");
  const [, view, id] = path.match(/^#\/([^/]+)\/?(.+)?$/) || [];
  return {
    view: normalizeRouteView(view || "dashboard"),
    id: id || null,
    params: new URLSearchParams(query)
  };
}

function normalizeRouteView(view) {
  if (view === "candidates") return "mentors";
  if (view === "candidate") return "mentor";
  return view;
}

function scrollToRoutineSection(targetId) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function navigateToRoutineSection(sectionKey) {
  const route = routineSectionRoute(sectionKey);
  if (window.location.hash === route) {
    scrollToRoutineSection(`rutin-${sectionKey}`);
    return;
  }
  window.location.hash = route;
}

function routineIllustrationElement(tagName, className = "", textContent = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

function configureRoutineFeatureLink(link, feature) {
  link.href = new URL(feature.href, window.location.href).href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
}

function routineProcessLink(title, sectionKey) {
  const link = routineIllustrationElement("a", "routine-process-link", title);
  link.href = routineSectionRoute(sectionKey);
  return link;
}

function routineProcessStep(number, title, sectionKey, note = "") {
  const item = routineIllustrationElement("li", "routine-process-step");
  item.append(
    routineIllustrationElement("span", "routine-process-number", String(number)),
    routineProcessLink(title, sectionKey)
  );
  if (note) item.append(routineIllustrationElement("span", "routine-process-note", note));
  return item;
}

function routineProcessOutcome(condition, title, sectionKey, tone = "") {
  const item = routineIllustrationElement("div", `routine-process-outcome ${tone ? `is-${tone}` : ""}`);
  item.append(
    routineIllustrationElement("span", "routine-process-condition", condition),
    routineProcessLink(title, sectionKey)
  );
  return item;
}

function buildRoutineProcessMap(kind) {
  const figure = routineIllustrationElement("figure", `routine-process-map routine-process-${kind}`);
  const header = routineIllustrationElement("div", "routine-process-header");
  const track = routineIllustrationElement("ol", "routine-process-track");
  const outcomes = routineIllustrationElement("div", "routine-process-outcomes");
  const caption = routineIllustrationElement("figcaption", "routine-process-caption");

  if (kind === "lifecycle") {
    figure.setAttribute("aria-label", "Övergripande livscykel från mentorbehov och förälderns stödärende till avslut");
    header.append(
      routineIllustrationElement("span", "routine-process-kicker", "Processkarta"),
      routineIllustrationElement("strong", "routine-process-heading", "Från mentorbehov och stödärende till avslut")
    );
    [
      ["Analysera behov", "6-1"],
      ["Genomför rekryteringsinsats", "6-2"],
      ["Registrera intresseanmälan", "7-1"],
      ["Pröva mentor för godkännande", "8"],
      ["Gör mentor tillgänglig", "8-8"],
      ["Registrera eller hitta förälder", "10-1", "Separat ingång som kan ske parallellt"],
      ["Skapa avgränsat stödärende", "10-2"],
      ["Matcha stödärende med mentor", "10-3"],
      ["Starta uppdrag för stödärendet", "11"],
      ["Följ upp uppdrag", "11"]
    ].forEach(([title, sectionKey, note = ""], index) => track.append(routineProcessStep(index + 1, title, sectionKey, note)));
    outcomes.append(
      routineProcessOutcome("Prövning: avbruten eller inte godkänd", "Avsluta och bevara motivering", "8-8", "stop"),
      routineProcessOutcome("Matchning: ingen match", "Behåll stödärendet och pröva ny matchning", "10-3", "return"),
      routineProcessOutcome("Uppföljning: behov av åtgärd", "Skapa uppföljnings- eller avvikelseärende", "11", "attention"),
      routineProcessOutcome("Uppföljning: klart", "Avsluta ärendet", "13", "complete")
    );
    caption.textContent = "Föräldern kan ha flera stödärenden över tid. Varje matchning och uppdrag hör till ett bestämt stödärende, medan mentorprocessen kan ske parallellt. Avvikande vägar kräver uttryckliga beslut.";
  } else {
    figure.setAttribute("aria-label", "Process för avvikelse och ställningstagande");
    header.append(
      routineIllustrationElement("span", "routine-process-kicker", "Beslutsflöde"),
      routineIllustrationElement("strong", "routine-process-heading", "Avvikelse och ställningstagande")
    );
    track.append(
      routineProcessStep(1, "Aktivitet avslutas", "9", "Avvikande resultat registreras"),
      routineProcessStep(2, "Ställningstagande öppnas", "9", "Systemet lägger det i arbetskön"),
      routineProcessStep(3, "Behörig handläggare bedömer", "9", "Ett uttryckligt val krävs")
    );
    outcomes.append(
      routineProcessOutcome("Fortsätt", "Dokumentera skäl och fortsätt processen", "9", "complete"),
      routineProcessOutcome("Begär komplettering", "Skapa aktivitet och sätt bevakningsdatum", "9", "attention"),
      routineProcessOutcome("Pausa", "Ange orsak och bevakningsdatum", "13", "return"),
      routineProcessOutcome("Avsluta", "Ange avslutsorsak och beslutsfattare", "13", "stop")
    );
    caption.textContent = "Ställningstagandet ligger kvar i arbetskön tills ett behörigt och dokumenterat val har gjorts.";
  }

  const outcomesHeading = routineIllustrationElement("h4", "routine-process-outcomes-heading", kind === "lifecycle" ? "Avvikande vägar" : "Möjliga ställningstaganden");
  figure.append(header, track, outcomesHeading, outcomes, caption);
  return figure;
}

function renderRoutineFlowDiagrams() {
  els.routinesContent.querySelectorAll("pre > code.language-mermaid").forEach((code) => {
    const source = code.textContent;
    const kind = source.includes("Analysera behov")
      ? "lifecycle"
      : source.includes("Aktivitet avslutas med avvikande resultat") ? "deviation" : "";
    if (!kind) return;
    code.parentElement.replaceWith(buildRoutineProcessMap(kind));
  });
}

function renderRoutineIllustrations() {
  els.routinesContent.querySelectorAll("[data-routine-illustration]").forEach((placeholder) => {
    const illustrationId = placeholder.dataset.routineIllustration;
    const illustration = ROUTINE_ILLUSTRATIONS[illustrationId];
    if (!illustration) {
      placeholder.textContent = "Illustrationen är inte tillgänglig i denna version.";
      placeholder.className = "alert alert-warning";
      return;
    }

    const figure = routineIllustrationElement("figure", "routine-illustration");
    figure.setAttribute("aria-label", `Illustration: ${illustration.title}. Ej interaktiv.`);

    const canvas = routineIllustrationElement("div", "routine-illustration-canvas");
    canvas.setAttribute("aria-hidden", "true");
    const watermark = routineIllustrationElement("div", "routine-illustration-watermark", "SKISS");
    const chrome = routineIllustrationElement("div", "routine-illustration-chrome");
    chrome.append(
      routineIllustrationElement("span", "routine-illustration-kind", illustration.kind),
      routineIllustrationElement("strong", "routine-illustration-title", illustration.title),
      routineIllustrationElement("span", "routine-illustration-status", illustration.status)
    );

    const meta = routineIllustrationElement("div", "routine-illustration-meta");
    illustration.meta.forEach(([label, value]) => {
      const item = routineIllustrationElement("div", "routine-illustration-field");
      item.append(
        routineIllustrationElement("span", "routine-illustration-field-label", label),
        routineIllustrationElement("strong", "routine-illustration-field-value", value)
      );
      meta.append(item);
    });

    const panels = routineIllustrationElement("div", "routine-illustration-panels");
    illustration.panels.forEach((panel) => {
      const panelElement = routineIllustrationElement("section", "routine-illustration-panel");
      panelElement.append(routineIllustrationElement("h4", "routine-illustration-panel-title", panel.title));
      const rows = routineIllustrationElement("div", "routine-illustration-rows");
      panel.rows.forEach(([label, value, tone = ""]) => {
        const row = routineIllustrationElement("div", "routine-illustration-row");
        row.append(
          routineIllustrationElement("span", "routine-illustration-row-label", label),
          routineIllustrationElement("span", `routine-illustration-row-value ${tone ? `is-${tone}` : ""}`, value)
        );
        rows.append(row);
      });
      panelElement.append(rows);
      panels.append(panelElement);
    });

    const callouts = routineIllustrationElement("ol", "routine-illustration-callouts");
    illustration.callouts.forEach((text) => {
      callouts.append(routineIllustrationElement("li", "", text));
    });

    canvas.append(watermark, chrome, meta, panels, callouts);
    const caption = routineIllustrationElement("figcaption", "routine-illustration-caption");
    caption.append(routineIllustrationElement("span", "", illustration.caption));
    const feature = resolveFeatureLink(illustration.featureId);
    if (feature) {
      const link = routineIllustrationElement("a", "routine-illustration-link", "Öppna motsvarande funktion");
      configureRoutineFeatureLink(link, feature);
      link.dataset.featureId = illustration.featureId;
      caption.append(link);
    }

    figure.append(canvas, caption);
    placeholder.replaceWith(figure);
  });
}

function buildRoutinesNavigation() {
  const headings = [...els.routinesContent.querySelectorAll("h2, h3")];
  let generatedHeadingIndex = headings.length;
  els.routinesToc.innerHTML = "";

  headings.forEach((heading, index) => {
    const headingText = heading.textContent;
    const sectionKey = routineSectionKey(headingText, index);
    heading.id = `rutin-${sectionKey}`;
    heading.dataset.routineKey = sectionKey;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `routines-toc-link routines-toc-${heading.tagName.toLowerCase()}`;
    button.textContent = headingText;
    button.addEventListener("click", () => navigateToRoutineSection(sectionKey));
    els.routinesToc.append(button);
  });

  let currentHeading = headings[0]?.id || "";
  els.routinesContent.querySelectorAll("h2, h3, h4, p, li, td").forEach((node) => {
    if (/^H[2-4]$/.test(node.tagName)) {
      if (!node.id) node.id = `rutin-${routineSectionKey(node.textContent, generatedHeadingIndex++)}`;
      currentHeading = node.id;
    }
    node.dataset.routineSection = currentHeading;
  });
}

function searchRoutines() {
  const term = els.routinesSearchInput.value.trim().toLocaleLowerCase("sv-SE");
  els.clearRoutinesSearchButton.hidden = !term;
  els.routinesSearchResults.innerHTML = "";
  els.routinesSearchResults.hidden = !term;
  if (!term) return;

  const matches = [...els.routinesContent.querySelectorAll("h2, h3, h4, p, li, td")]
    .filter((node) => node.textContent.toLocaleLowerCase("sv-SE").includes(term))
    .slice(0, 20);

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "routines-search-empty";
    empty.textContent = "Inga avsnitt matchar sökningen.";
    els.routinesSearchResults.append(empty);
    return;
  }

  matches.forEach((node) => {
    const sectionId = node.dataset.routineSection || node.id;
    const section = document.getElementById(sectionId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "routines-search-result";

    const title = document.createElement("strong");
    title.textContent = section?.textContent || "Träff i rutindokumentet";
    const excerpt = document.createElement("span");
    const text = node.textContent.trim();
    excerpt.textContent = text.length > 150 ? `${text.slice(0, 147)}...` : text;
    button.append(title, excerpt);
    button.addEventListener("click", () => {
      const sectionKey = document.getElementById(sectionId)?.dataset.routineKey;
      if (sectionKey) navigateToRoutineSection(sectionKey);
      else scrollToRoutineSection(sectionId);
    });
    els.routinesSearchResults.append(button);
  });
}

async function loadRoutinesDocument(sectionKey = "") {
  if (routinesLoaded) {
    if (sectionKey) requestAnimationFrame(() => scrollToRoutineSection(`rutin-${sectionKey}`));
    return;
  }
  els.routinesContent.innerHTML = '<p class="text-secondary">Läser in rutindokumentet...</p>';

  try {
    const response = await fetch("./docs/verksamhetsfloden-och-handlaggningsrutiner.md?v=20260808-completion-and-learning-v4");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    els.routinesContent.innerHTML = marked.parse(markdown, { gfm: true });
    els.routinesContent.querySelector(":scope > h1")?.remove();
    els.routinesContent.querySelectorAll("a[href^='http']").forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
    els.routinesContent.querySelectorAll("a[href$='.md']").forEach((link) => {
      const filename = link.getAttribute("href").split("/").pop();
      link.href = `./docs/${filename}`;
    });
    els.routinesContent.querySelectorAll("a[href^='feature:']").forEach((link) => {
      const featureId = link.getAttribute("href").slice("feature:".length);
      const feature = resolveFeatureLink(featureId);
      link.classList.add("routine-feature-link");
      link.dataset.featureId = featureId;
      if (feature) {
        configureRoutineFeatureLink(link, feature);
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.title = "Funktionen är inte tillgänglig i denna version";
      }
    });
    renderRoutineFlowDiagrams();
    renderRoutineIllustrations();
    buildRoutinesNavigation();
    routinesLoaded = true;
    if (sectionKey) requestAnimationFrame(() => scrollToRoutineSection(`rutin-${sectionKey}`));
  } catch (error) {
    els.routinesContent.innerHTML = `
      <div class="alert alert-danger" role="alert">
        Rutindokumentet kunde inte läsas in. Försök att ladda om sidan.
      </div>
    `;
    console.error("Could not load routines document", error);
  }
}

function applyRoute() {
  let route = parseRoute();
  const mentorRoutes = new Set(["mentor-home", "mentor-assignments", "mentor-assignment", "mentor-profile", "learning"]);
  const publicRoutes = new Set(["public-home", "public-support", "public-learning"]);
  if (isPublicSession() && !publicRoutes.has(route.view)) {
    window.history.replaceState(null, "", "#/public-home");
    route = { view: "public-home", id: null };
  } else if (isMentorSession() && !mentorRoutes.has(route.view)) {
    window.history.replaceState(null, "", "#/mentor-home");
    route = { view: "mentor-home", id: null };
  } else if (!isMentorSession() && !isPublicSession() && (mentorRoutes.has(route.view) && route.view !== "learning" || publicRoutes.has(route.view))) {
    window.history.replaceState(null, "", "#/dashboard");
    route = { view: "dashboard", id: null };
  }
  if (route.view === "activity-types" && !route.id) {
    window.history.replaceState(null, "", "#/case-types");
    route = { view: "case-types", id: null };
  }
  const nestedActivityRoute = route.view === "case-types" ? route.id?.match(/^([^/]+)\/activities\/([^/]+)$/) : null;
  const nestedCaseRoute = route.view === "case" && route.id && !route.id.startsWith("new")
    ? route.id.match(/^([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/)
    : null;
  const nestedMentorRoute = route.view === "mentor" && route.id && route.id !== "new"
    ? route.id.match(/^([^/]+)(?:\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?)?$/)
    : null;
  const routeCaseId = nestedCaseRoute?.[1] || route.id;
  const routeMentorId = nestedMentorRoute?.[1] || route.id;
  const previousCaseRecordId = selectedCaseRecordId;
  currentView = ["dashboard", "versions", "presentation", "cases", "case", "mentors", "mentor", "parents", "parent", "learning", "administration", "case-numbering", "case-types", "activity-types", "support-areas", "learning-admin", "support-admin", "routines", "handler", "mentor-home", "mentor-assignments", "mentor-assignment", "mentor-profile", "public-home", "public-support", "public-learning"].includes(route.view) ? route.view : "dashboard";
  selectedId = currentView === "mentor" ? routeMentorId : selectedId;
  mentorRouteIntent = currentView === "mentor" ? nestedMentorRoute?.[2] || "" : "";
  mentorRouteCaseId = currentView === "mentor" ? nestedMentorRoute?.[3] || "" : "";
  mentorRouteActivityId = currentView === "mentor" ? nestedMentorRoute?.[4] || "" : "";
  if (currentView === "mentor" && mentorRouteIntent === "identity") pendingIdentityEditorId = routeMentorId;
  selectedParentId = currentView === "parent" ? route.id : selectedParentId;
  if (currentView !== "parent") parentEditMode = false;
  selectedCaseRecordId = currentView === "case" ? routeCaseId : selectedCaseRecordId;
  caseRouteIntent = currentView === "case" ? nestedCaseRoute?.[2] || "" : "";
  caseRouteTargetId = currentView === "case" ? nestedCaseRoute?.[3] || "" : "";
  if (currentView !== "case") {
    selectedCaseActivityId = null;
  } else if (caseRouteIntent === "activities" && caseRouteTargetId) {
    selectedCaseActivityId = caseRouteTargetId;
  } else if (selectedCaseActivityId && caseActivities.find((activity) => activity.id === selectedCaseActivityId)?.caseId !== routeCaseId) {
    selectedCaseActivityId = null;
  }
  if (currentView !== "case" || routeCaseId !== previousCaseRecordId) activityListFilter = "all";
  if (currentView !== "case" || routeCaseId !== previousCaseRecordId) caseEditMode = false;
  if (currentView === "case" && caseRouteIntent === "edit") caseEditMode = true;
  selectedHandlerId = currentView === "handler" ? route.id : selectedHandlerId;
  selectedCaseTypeId = currentView === "case-types" ? (nestedActivityRoute?.[1] || route.id) : null;
  selectedActivityParentCaseTypeId = nestedActivityRoute?.[1] || null;
  selectedActivityTypeId = nestedActivityRoute?.[2] || (currentView === "activity-types" ? route.id : null);
  if (currentView !== "case-types" || !route.id || nestedActivityRoute) caseTypeEditMode = false;
  if (!selectedActivityTypeId) activityTypeEditMode = false;
  workQueueOnly = currentView === "mentors" && route.id === "action";
  caseTypeFilter = currentView === "cases" && caseTypeById(route.id) ? route.id : "";
  if (currentView === "cases" && route.params?.has("status")) {
    const status = route.params.get("status");
    caseStatusFilter = ["open", "new", "in_progress", "waiting", "paused", "decision_required", "closed"].includes(status) ? status : "";
    casePage = 1;
  }

  els.dashboardView.hidden = currentView !== "dashboard";
  els.versionsView.hidden = currentView !== "versions";
  els.presentationView.hidden = currentView !== "presentation";
  els.casesView.hidden = currentView !== "cases";
  els.caseDetailView.hidden = currentView !== "case";
  els.candidatesView.hidden = currentView !== "mentors";
  els.detailView.hidden = currentView !== "mentor";
  els.parentsView.hidden = currentView !== "parents";
  els.parentDetailView.hidden = currentView !== "parent";
  els.learningView.hidden = currentView !== "learning";
  els.mentorPortalView.hidden = !["mentor-home", "mentor-assignments", "mentor-assignment", "mentor-profile"].includes(currentView);
  els.publicPortalView.hidden = !["public-home", "public-support", "public-learning"].includes(currentView);
  els.administrationView.hidden = currentView !== "administration";
  els.caseNumberingAdministrationView.hidden = currentView !== "case-numbering";
  els.caseTypesAdministrationView.hidden = currentView !== "case-types" || Boolean(nestedActivityRoute);
  els.activityTypesAdministrationView.hidden = currentView !== "activity-types" && !nestedActivityRoute;
  els.supportAreasAdministrationView.hidden = currentView !== "support-areas";
  els.learningAdministrationView.hidden = currentView !== "learning-admin";
  els.supportAdministrationView.hidden = currentView !== "support-admin";
  els.routinesView.hidden = currentView !== "routines";
  els.handlerDetailView.hidden = currentView !== "handler";

  const mentorSession = isMentorSession();
  const publicSession = isPublicSession();
  for (const navigationItem of [els.navDashboard, els.navPresentation, els.navIntake, els.navCases, els.navMatchings, els.navAssignments, els.navCandidates, els.navParents, els.navLearning, els.navAdministration]) {
    navigationItem.hidden = mentorSession || publicSession;
  }
  document.querySelectorAll(".sidebar-nav > .nav-link.disabled").forEach((navigationItem) => {
    navigationItem.hidden = mentorSession || publicSession;
  });
  document.querySelector(".sidebar-menu-group").hidden = mentorSession || publicSession;
  for (const navigationItem of [els.navMentorHome, els.navMentorAssignments, els.navMentorLearning, els.navMentorProfile]) {
    navigationItem.hidden = !mentorSession;
  }
  for (const navigationItem of [els.navPublicHome, els.navPublicSupport, els.navPublicLearning]) {
    navigationItem.hidden = !publicSession;
  }
  document.querySelectorAll(".mobile-navigation .dropdown-menu > li").forEach((item) => {
    item.hidden = mentorSession
      ? !item.classList.contains("mentor-mobile-nav")
      : publicSession
        ? !item.classList.contains("public-mobile-nav")
        : item.classList.contains("mentor-mobile-nav") || item.classList.contains("public-mobile-nav");
  });

  els.navDashboard.classList.toggle("active", currentView === "dashboard");
  els.navPresentation.classList.toggle("active", currentView === "presentation");
  els.navIntake.classList.toggle("active", currentView === "cases" && caseTypeFilter === "incoming-contact");
  els.navCases.classList.toggle("active", (currentView === "cases" && !caseTypeFilter) || currentView === "case");
  els.navMatchings.classList.toggle("active", currentView === "cases" && caseTypeFilter === "matching");
  els.navAssignments.classList.toggle("active", currentView === "cases" && caseTypeFilter === "mentor-assignment");
  els.navCandidates.classList.toggle("active", currentView === "mentors" || currentView === "mentor");
  els.navParents.classList.toggle("active", currentView === "parents" || currentView === "parent");
  els.navLearning.classList.toggle("active", currentView === "learning");
  els.navAdministration.classList.toggle("active", ["administration", "case-numbering", "case-types", "activity-types", "support-areas", "learning-admin", "support-admin", "presentation", "routines", "versions", "handler"].includes(currentView));
  els.navHandlers.classList.toggle("active", currentView === "administration" || currentView === "handler");
  els.navCaseNumbering.classList.toggle("active", currentView === "case-numbering");
  els.navCaseTypes.classList.toggle("active", ["case-types", "activity-types"].includes(currentView));
  els.navSupportAreas.classList.toggle("active", currentView === "support-areas");
  els.navLearningAdmin.classList.toggle("active", currentView === "learning-admin");
  els.navSupportAdmin.classList.toggle("active", currentView === "support-admin");
  els.navRoutines.classList.toggle("active", currentView === "routines");
  els.navVersions.classList.toggle("active", currentView === "versions");
  els.navMentorHome.classList.toggle("active", currentView === "mentor-home");
  els.navMentorAssignments.classList.toggle("active", ["mentor-assignments", "mentor-assignment"].includes(currentView));
  els.navMentorLearning.classList.toggle("active", currentView === "learning");
  els.navMentorProfile.classList.toggle("active", currentView === "mentor-profile");
  els.navPublicHome.classList.toggle("active", currentView === "public-home");
  els.navPublicSupport.classList.toggle("active", currentView === "public-support");
  els.navPublicLearning.classList.toggle("active", currentView === "public-learning");

  if (currentView === "dashboard") {
    els.pageTitle.textContent = "Dashboard";
    els.breadcrumb.textContent = "Start / Dashboard";
  } else if (currentView === "versions") {
    els.pageTitle.textContent = "Versioner";
    els.breadcrumb.textContent = "Start / Systemadministration / Versioner";
  } else if (currentView === "presentation") {
    els.pageTitle.textContent = "Demoläge";
    els.breadcrumb.textContent = "Start / Systemadministration / Demoläge";
  } else if (currentView === "cases") {
    const sectionTitle = caseTypeFilter ? caseTypeRelationshipName(caseTypeFilter) : "Ärenderegister";
    els.pageTitle.textContent = sectionTitle;
    els.breadcrumb.textContent = `Start / ${sectionTitle}${caseStatusFilter === "open" ? " / Öppna ärenden" : ""}`;
  } else if (currentView === "case") {
    const isNewCase = route.id?.startsWith("new");
    els.pageTitle.textContent = isNewCase ? "Ny registrering" : "Ärendekort";
    els.breadcrumb.textContent = isNewCase ? "Start / Ärenden / Ny registrering" : "Start / Ärenden / Ärendekort";
  } else if (currentView === "mentors") {
    els.pageTitle.textContent = workQueueOnly ? "Arbetskö" : "Mentorregister";
    els.breadcrumb.textContent = workQueueOnly ? "Start / Onboarding / Arbetskö" : "Start / Onboarding / Mentorregister";
    els.mentorListTitle.textContent = workQueueOnly ? "Arbetskö" : "Mentorregister";
  } else if (currentView === "mentor") {
    const isNewMentor = route.id === "new";
    els.pageTitle.textContent = isNewMentor ? "Registrera mentor" : "Mentorkort";
    els.breadcrumb.textContent = isNewMentor ? "Start / Onboarding / Registrera mentor" : "Start / Onboarding / Mentorkort";
  } else if (currentView === "parents") {
    els.pageTitle.textContent = "Föräldraregister";
    els.breadcrumb.textContent = "Start / Föräldrar";
  } else if (currentView === "parent") {
    const isNewParent = route.id === "new";
    els.pageTitle.textContent = isNewParent ? "Registrera förälder" : "Föräldrakort";
    els.breadcrumb.textContent = isNewParent ? "Start / Föräldrar / Registrera förälder" : "Start / Föräldrar / Föräldrakort";
  } else if (currentView === "learning") {
    els.pageTitle.textContent = route.id ? "Utbildningsinnehåll" : "Utbildning";
    els.breadcrumb.textContent = route.id ? `${mentorSession ? "Min portal" : "Start"} / Utbildning / Innehåll` : `${mentorSession ? "Min portal" : "Start"} / Utbildning`;
  } else if (currentView === "mentor-home") {
    els.pageTitle.textContent = "Min översikt";
    els.breadcrumb.textContent = "Min portal / Översikt";
  } else if (currentView === "mentor-assignments") {
    els.pageTitle.textContent = "Mina uppdrag";
    els.breadcrumb.textContent = "Min portal / Mina uppdrag";
  } else if (currentView === "mentor-assignment") {
    els.pageTitle.textContent = "Uppdrag";
    els.breadcrumb.textContent = "Min portal / Mina uppdrag / Uppdrag";
  } else if (currentView === "mentor-profile") {
    els.pageTitle.textContent = "Min profil";
    els.breadcrumb.textContent = "Min portal / Min profil";
  } else if (currentView === "public-home") {
    els.pageTitle.textContent = "Stöd för föräldrar";
    els.breadcrumb.textContent = "Start";
  } else if (currentView === "public-support") {
    els.pageTitle.textContent = "Sök stöd";
    els.breadcrumb.textContent = "Start / Sök stöd";
  } else if (currentView === "public-learning") {
    els.pageTitle.textContent = route.id ? "Råd och material" : "Råd och material";
    els.breadcrumb.textContent = route.id ? "Start / Råd och material / Läs" : "Start / Råd och material";
  } else if (currentView === "administration") {
    els.pageTitle.textContent = "Handläggare";
    els.breadcrumb.textContent = "Start / Systemadministration / Handläggare";
  } else if (currentView === "case-numbering") {
    els.pageTitle.textContent = "Ärendenummer";
    els.breadcrumb.textContent = "Start / Systemadministration / Ärendenummer";
  } else if (currentView === "case-types") {
    els.pageTitle.textContent = nestedActivityRoute ? "Aktivitetsmall" : route.id ? "Ärendetyp" : "Ärendetyper";
    els.breadcrumb.textContent = nestedActivityRoute ? "Start / Systemadministration / Ärendetyper / Aktivitetsmall" : route.id ? "Start / Systemadministration / Ärendetyper / Ärendetyp" : "Start / Systemadministration / Ärendetyper";
  } else if (currentView === "activity-types") {
    els.pageTitle.textContent = route.id ? "Aktivitetsmall" : "Aktivitetsmallar";
    els.breadcrumb.textContent = route.id ? "Start / Systemadministration / Ärendetyper / Aktivitetsmall" : "Start / Systemadministration / Ärendetyper";
  } else if (currentView === "support-areas") {
    els.pageTitle.textContent = "Stödområden";
    els.breadcrumb.textContent = "Start / Systemadministration / Stödområden";
  } else if (currentView === "learning-admin") {
    els.pageTitle.textContent = route.id ? "Utbildningsinnehåll" : "Utbildningsbibliotek";
    els.breadcrumb.textContent = route.id ? "Start / Systemadministration / Utbildningsinnehåll / Innehåll" : "Start / Systemadministration / Utbildningsinnehåll";
  } else if (currentView === "support-admin") {
    els.pageTitle.textContent = "Supportärenden";
    els.breadcrumb.textContent = "Start / Systemadministration / Supportärenden";
  } else if (currentView === "routines") {
    els.pageTitle.textContent = "Rutiner";
    els.breadcrumb.textContent = "Start / Systemadministration / Rutiner";
    loadRoutinesDocument(route.id || "");
  } else {
    els.pageTitle.textContent = "Handläggarkort";
    els.breadcrumb.textContent = "Start / Systemadministration / Handläggarkort";
  }
}

function navigateToCandidate(id) {
  window.location.hash = `#/mentor/${id}`;
}

function navigateToCase(id) {
  window.location.hash = `#/case/${id}`;
}

function navigateToNewCase(mentorId = "") {
  window.location.hash = mentorId ? `#/case/new-${mentorId}` : "#/case/new";
}

function navigateToNewCandidate() {
  window.location.hash = "#/mentor/new";
}

function navigateToParent(id) {
  window.location.hash = `#/parent/${id}`;
}

function navigateToNewParent() {
  window.location.hash = "#/parent/new";
}

function navigateToNewParentCase(parentId) {
  newCaseTypePreset = "parent-support";
  window.location.hash = `#/case/new-parent-${parentId}`;
}

function navigateToNewMatching(supportCaseId) {
  newCaseTypePreset = "matching";
  window.location.hash = `#/case/new-support-${supportCaseId}`;
}

function navigateToHandler(id) {
  window.location.hash = `#/handler/${id}`;
}

function navigateTo(hash) {
  if (window.location.hash === hash) {
    renderAll();
    return;
  }
  window.location.hash = hash;
}

function navigateToCandidateListWithStatus(status) {
  statusFilter = status;
  els.statusFilter.value = status;
  navigateTo("#/mentors");
  renderTable();
}

function resetMentorFilters() {
  searchTerm = "";
  statusFilter = "";
  els.searchInput.value = "";
  els.statusFilter.value = "";
}

function renderSummary() {
  els.totalCount.textContent = candidates.length;
  renderSeedButtonState();
}

function statusCount(status) {
  return candidates.filter((candidate) => candidate.status === status).length;
}

function renderPipeline() {
  for (const status of STATUSES) {
    const count = els.pipelineGrid.querySelector(`[data-pipeline-count="${cssEscape(status)}"]`);
    if (count) {
      count.textContent = statusCount(status);
    }
  }
}

function pipelineDescription(status) {
  return {
    "Anmäld": "Ny intresseanmälan",
    "Kontrollerad": "Register och referenser klara",
    "Utbildning pågår": "Utbildningsmoment återstår",
    "Redo för intervju": "Intervju eller beslut återstår",
    "Godkänd": "Tillgänglig för matchning"
  }[status] || "";
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function renderSeedButtonState() {
  const sizes = [1, 10, 250];
  const size = sizes.includes(candidates.length)
    && candidates.every((candidate) => candidate.exampleData === true && candidate.exampleDatasetSize === candidates.length)
    ? candidates.length
    : null;
  els.seedButton.disabled = !db || prototypeDataLoading;
  els.seedButton.textContent = prototypeDataLoading
    ? "Laddar prototypdata"
    : size
      ? `Prototypdata: ${size} ${size === 1 ? "mentor" : "mentorer"}`
      : "Prototypdata";
}

const incomingContactChannelLabels = { phone: "Telefon", email: "E-post", visit: "Besök", other: "Annan" };
const incomingContactStatusLabels = { registered: "Behöver hanteras", needs_follow_up: "Ska följas upp", linked: "Kopplad", closed: "Avslutad" };

function incomingContactById(id) {
  return incomingContacts.find((contact) => contact.id === id) || null;
}

function renderIncomingContactTable() {
  const visible = incomingContacts.filter((contact) => !["closed", "linked"].includes(contact.status)).slice(0, 10);
  if (!visible.length) {
    els.incomingContactTableBody.innerHTML = '<tr><td colspan="6" class="text-secondary py-3">Inga inkommande kontakter väntar på hantering.</td></tr>';
    return;
  }
  els.incomingContactTableBody.innerHTML = visible.map((contact) => {
    const parent = parents.find((item) => item.id === contact.parentId);
    return `<tr><td>${escapeHtml(formatDateTime(contact.occurredAt))}</td><td>${escapeHtml(incomingContactChannelLabels[contact.channel] || contact.channel)}</td><td><strong>${escapeHtml(contact.parentName || contact.contactDetails)}</strong><div class="small text-secondary">${escapeHtml(contact.summary)}</div></td><td>${parent ? `<a href="#/parent/${escapeHtml(parent.id)}">${escapeHtml(parent.name)}</a>` : '<span class="text-secondary">Ingen personpost vald</span>'}</td><td><span class="badge text-bg-light border">${escapeHtml(incomingContactStatusLabels[contact.status] || contact.status)}</span></td><td class="text-end"><button type="button" class="btn btn-outline-primary btn-sm" data-open-incoming-contact="${escapeHtml(contact.id)}">Hantera</button></td></tr>`;
  }).join("");
}

function openIncomingContact(contactId = null, parentId = null) {
  const existing = incomingContactById(contactId);
  activeIncomingContactId = existing?.id || null;
  incomingContactParentId = existing?.parentId || parentId || null;
  incomingContactStartedAt = existing?.occurredAt || new Date().toISOString();
  els.incomingContactForm.reset();
  els.incomingContactChannelInput.value = existing?.channel || "phone";
  els.incomingContactDetailsInput.value = existing?.contactDetails || parents.find((parent) => parent.id === parentId)?.contactDetails || "";
  els.incomingContactParentNameInput.value = existing?.parentName || parents.find((parent) => parent.id === parentId)?.name || "";
  els.incomingContactCallerTypeInput.value = existing?.callerType || "self";
  els.incomingContactSummaryInput.value = existing?.summary || "";
  els.incomingContactNextStepInput.value = existing?.nextStep || "";
  els.incomingContactOccurredAt.textContent = formatDateTime(incomingContactStartedAt);
  els.incomingContactReceivedBy.textContent = currentUserName();
  els.incomingContactCaptureStep.hidden = false;
  els.incomingContactNextStep.hidden = true;
  bootstrap.Offcanvas.getOrCreateInstance(els.incomingContactOffcanvas).show();
  setTimeout(() => els.incomingContactDetailsInput.focus(), 150);
}

function showIncomingContactNextStep(contact) {
  activeIncomingContactId = contact.id;
  incomingContactParentId = contact.parentId || null;
  els.incomingContactCaptureStep.hidden = true;
  els.incomingContactNextStep.hidden = false;
  els.incomingContactSavedSummary.textContent = contact.nextStep
    ? `Nästa steg: ${contact.nextStep}`
    : "Kontakten är sparad.";
  const options = caseTypeDefinitions
    .filter((definition) => definition.creationMode === "manual" && definition.id !== "incoming-contact")
    .map((definition) => `<option value="${escapeHtml(definition.id)}">${escapeHtml(definition.name)}</option>`);
  els.incomingContactCaseTypeInput.innerHTML = ['<option value="">Välj ärendetyp</option>', ...options].join("");
  els.incomingContactCaseTypeInput.setCustomValidity("");
}

function prefillCaseFromIncomingContact(contact) {
  if (!contact) return;
  const firstLine = contact.summary.split(/[.!?\n]/)[0].trim();
  els.caseTitleInput.value = (firstLine || contact.parentName || contact.contactDetails).slice(0, 100);
  els.caseDescriptionInput.value = [
    contact.summary,
    contact.nextStep ? `Nästa steg: ${contact.nextStep}` : "",
    `Kontaktväg: ${incomingContactChannelLabels[contact.channel] || contact.channel}`,
    `Kontaktuppgift: ${contact.contactDetails}`
  ].filter(Boolean).join("\n\n");
  if (els.caseTypeInput.value === "parent-support" && els.supportPurposeInput) {
    els.supportPurposeInput.value = contact.summary;
  }
}

function prefillCaseFromSourceCase(sourceCase) {
  if (!sourceCase) return;
  const targetTypeId = els.caseTypeInput.value;
  const titlePrefix = targetTypeId === "recruitment" ? "Rekrytering" : targetTypeId === "mentor-follow-up" ? "Uppföljning" : "Fortsatt ärende";
  els.caseTitleInput.value = `${titlePrefix}: ${sourceCase.title}`.slice(0, 100);
  els.caseDescriptionInput.value = [
    sourceCase.description,
    `Skapat från ${sourceCase.number} · ${sourceCase.type}.`
  ].filter(Boolean).join("\n\n");
  if (targetTypeId === "mentor-follow-up") {
    const mentor = caseMentor(sourceCase);
    els.caseMentorInput.value = mentor?.name || "";
    els.caseMentorIdInput.value = mentor?.id || "";
  }
}

async function registerSuccessorLink(sourceCase, successorCaseId, successorNumber, successorType) {
  const now = new Date().toISOString();
  const updatedSource = { ...sourceCase, version: sourceCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
  await atomicPut({
    [CASES_STORE]: [updatedSource],
    [CASE_EVENTS_STORE]: [caseEventRecord({
      caseId: sourceCase.id,
      eventType: "successor_case_created",
      entityType: "case",
      entityId: successorCaseId,
      message: `${successorType} ${successorNumber} skapades från ärendet`,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
      now
    })]
  });
  pendingSourceCaseId = null;
}

async function createIncomingContactCase(contact, now = new Date().toISOString()) {
  const caseType = caseTypeById("incoming-contact");
  if (!caseType) return { contact, records: {} };
  const caseId = crypto.randomUUID();
  const titlePrefix = incomingContactChannelLabels[contact.channel] || "Kontakt";
  const title = `${titlePrefix}: ${contact.parentName || contact.contactDetails}`.slice(0, 100);
  const description = [contact.summary, contact.nextStep ? `Nästa steg: ${contact.nextStep}` : ""].filter(Boolean).join("\n\n");
  const caseRecord = {
    id: caseId,
    tenantId: DEFAULT_TENANT_ID,
    number: await reserveCaseNumber(),
    caseTypeId: caseType.id,
    caseTypeVersion: caseType.version,
    organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID,
    type: caseType.name,
    title,
    description,
    details: {
      contactChannel: contact.channel,
      contactDetails: contact.contactDetails,
      callerType: contact.callerType,
      affectedPerson: contact.parentName,
      nextStep: contact.nextStep
    },
    mentorId: null,
    parentId: contact.parentId || null,
    supportCaseId: null,
    sourceMatchingCaseId: null,
    status: "new",
    priority: "normal",
    dueDate: null,
    version: 1,
    createdAt: now,
    createdBy: CURRENT_USER_ID,
    updatedAt: now,
    updatedBy: CURRENT_USER_ID,
    closedAt: null,
    closedBy: null
  };
  const owner = { id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, handlerId: CURRENT_USER_ID, role: "responsible", version: 1, assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null };
  const activities = (caseType.suggestedActivities || []).map((title, sortOrder) => ({ id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, templateVersion: 1, title, status: "not_started", resultCode: null, resultClassification: null, handlerIdOverride: null, waitingForParty: null, dueDate: null, sortOrder, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, completedAt: null, completedBy: null }));
  return {
    contact: { ...contact, intakeCaseId: caseId },
    records: {
      [CASES_STORE]: [caseRecord],
      [CASE_ASSIGNMENTS_STORE]: [owner],
      [CASE_ACTIVITIES_STORE]: activities,
      [CASE_EVENTS_STORE]: [caseEventRecord({ caseId, eventType: "case_created", entityType: "case", entityId: caseId, message: "Mottagningsärende skapades från registrerad kontakt", idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now })]
    }
  };
}

async function updateIncomingContactHandling(contact, status, { closeCase = false, feedback = "" } = {}) {
  const now = new Date().toISOString();
  const updatedContact = { ...contact, status, updatedAt: now, updatedBy: CURRENT_USER_ID };
  const intakeCase = cases.find((item) => item.id === contact.intakeCaseId);
  const caseUpdates = [];
  const activityUpdates = [];
  const events = [];
  if (intakeCase) {
    const nextCase = closeCase
      ? { ...intakeCase, status: "closed", closeNote: feedback || "Kontakten avslutades utan fortsatt ärende.", closedAt: now, closedBy: CURRENT_USER_ID, version: intakeCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID }
      : { ...intakeCase, status: "waiting", version: intakeCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
    caseUpdates.push(nextCase);
    if (closeCase) {
      for (const activity of activitiesForCase(intakeCase.id)) {
        if (["completed", "not_applicable"].includes(activity.status)) continue;
        activityUpdates.push({ ...activity, status: "not_applicable", version: activity.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID });
      }
    }
    events.push(caseEventRecord({ caseId: intakeCase.id, eventType: closeCase ? "case_closed" : "case_updated", entityType: "case", entityId: intakeCase.id, message: feedback || "Kontakten markerades för uppföljning", idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now }));
  }
  await atomicPut({
    [INCOMING_CONTACTS_STORE]: [updatedContact],
    ...(caseUpdates.length ? { [CASES_STORE]: caseUpdates, [CASE_EVENTS_STORE]: events } : {}),
    ...(activityUpdates.length ? { [CASE_ACTIVITIES_STORE]: activityUpdates } : {})
  });
}

async function completeIncomingContactWithCase(contact, caseId, caseNumber) {
  const now = new Date().toISOString();
  const intakeCase = cases.find((item) => item.id === contact.intakeCaseId);
  const linkedContact = { ...contact, caseId, status: "linked", updatedAt: now, updatedBy: CURRENT_USER_ID };
  const closedIntakeCase = intakeCase
    ? {
        ...intakeCase,
        status: "closed",
        closeNote: `Ärende ${caseNumber || caseId} skapades från kontakten.`,
        closedAt: now,
        closedBy: CURRENT_USER_ID,
        version: intakeCase.version + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      }
    : null;
  const events = [
    caseEventRecord({ caseId, eventType: "case_updated", entityType: "incoming_contact", entityId: contact.id, message: "Ärendet skapades från en inkommande kontakt", idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now })
  ];
  if (closedIntakeCase) {
    events.push(caseEventRecord({ caseId: closedIntakeCase.id, eventType: "case_closed", entityType: "case", entityId: closedIntakeCase.id, message: `Mottagningsärendet avslutades när ärende ${caseNumber || caseId} skapades`, idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now }));
  }
  const activityUpdates = intakeCase
    ? activitiesForCase(intakeCase.id)
        .filter((activity) => !["completed", "not_applicable"].includes(activity.status))
        .map((activity) => ({ ...activity, status: "not_applicable", version: activity.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID }))
    : [];
  await atomicPut({
    [INCOMING_CONTACTS_STORE]: [linkedContact],
    ...(closedIntakeCase ? { [CASES_STORE]: [closedIntakeCase] } : {}),
    ...(activityUpdates.length ? { [CASE_ACTIVITIES_STORE]: activityUpdates } : {}),
    [CASE_EVENTS_STORE]: events
  });
  pendingIncomingContactId = null;
}

function incomingContactCasePatch(contact, now) {
  const intakeCase = cases.find((item) => item.id === contact.intakeCaseId);
  if (!intakeCase) return null;
  const description = [contact.summary, contact.nextStep ? `Nästa steg: ${contact.nextStep}` : ""].filter(Boolean).join("\n\n");
  return {
    ...intakeCase,
    title: `${incomingContactChannelLabels[contact.channel] || "Kontakt"}: ${contact.parentName || contact.contactDetails}`.slice(0, 100),
    description,
    details: {
      ...(intakeCase.details || {}),
      contactChannel: contact.channel,
      contactDetails: contact.contactDetails,
      callerType: contact.callerType,
      affectedPerson: contact.parentName,
      nextStep: contact.nextStep
    },
    updatedAt: now,
    updatedBy: CURRENT_USER_ID
  };
}

async function createIncomingContactFromPublicSupportRequest(request) {
  const now = new Date().toISOString();
  const contactId = crypto.randomUUID();
  const contact = {
    id: contactId,
    tenantId: DEFAULT_TENANT_ID,
    occurredAt: request.createdAt || now,
    channel: request.contactMethod === "email" ? "email" : "phone",
    contactDetails: request.contact,
    parentName: request.name,
    callerType: "self",
    summary: request.description,
    parentId: null,
    caseId: null,
    status: "registered",
    receivedBy: CURRENT_USER_ID,
    registeredBy: CURRENT_USER_ID,
    publicSupportRequestId: request.id,
    supportAreaIds: normalizeSupportAreaIds(request.supportAreaIds),
    supportAreaUncertain: Boolean(request.supportAreaUncertain),
    availability: request.availability || "",
    createdAt: now,
    createdBy: CURRENT_USER_ID,
    updatedAt: now,
    updatedBy: CURRENT_USER_ID
  };
  await atomicPut({
    [INCOMING_CONTACTS_STORE]: [contact],
    [PUBLIC_SUPPORT_REQUESTS_STORE]: [{ ...request, status: "intake_created", incomingContactId: contactId, updatedAt: now, updatedBy: CURRENT_USER_ID }]
  });
  markSaved();
  await refresh();
  openIncomingContact(contactId);
  showFeedback("Stödförfrågan är flyttad till mottagningen.");
}

async function createSupportCaseFromIncomingContact(contact, parent) {
  const now = new Date().toISOString();
  const caseId = crypto.randomUUID();
  const caseType = caseTypeById("parent-support");
  const supportAreaIds = normalizeSupportAreaIds(contact.supportAreaIds);
  const supportCase = { id: caseId, tenantId: DEFAULT_TENANT_ID, number: await reserveCaseNumber(), caseTypeId: caseType.id, caseTypeVersion: caseType.version, organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID, type: caseType.name, title: contact.summary.slice(0, 100), description: contact.summary, details: { supportPurpose: contact.summary, desiredOutcome: "Kompletteras i fortsatt kontakt", supportAreaIds, supportAreaStatus: supportAreaIds.length ? "confirmed" : "to_confirm", intakeContactId: contact.id }, mentorId: null, parentId: parent.id, supportCaseId: null, sourceMatchingCaseId: null, status: "new", priority: "normal", dueDate: null, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, closedAt: null, closedBy: null };
  const owner = { id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, handlerId: CURRENT_USER_ID, role: "responsible", version: 1, assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null };
  const activities = (caseType.suggestedActivities || []).map((title, sortOrder) => ({ id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId, templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, templateVersion: 1, title, status: "not_started", resultCode: null, resultClassification: null, handlerIdOverride: null, waitingForParty: null, dueDate: null, sortOrder, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, completedAt: null, completedBy: null }));
  const updatedContact = { ...contact, parentId: parent.id, caseId, status: "linked", updatedAt: now, updatedBy: CURRENT_USER_ID };
  const publicRequest = publicSupportRequests.find((request) => request.id === contact.publicSupportRequestId);
  const intakeCase = cases.find((item) => item.id === contact.intakeCaseId);
  const closedIntakeCase = intakeCase ? { ...intakeCase, status: "closed", closeNote: `Stödärende ${supportCase.number} skapades.`, closedAt: now, closedBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID } : null;
  const events = [
    caseEventRecord({ caseId, eventType: "case_created", entityType: "case", entityId: caseId, message: "Stödärende skapades från en registrerad kontakt", idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now })
  ];
  if (closedIntakeCase) events.push(caseEventRecord({ caseId: closedIntakeCase.id, eventType: "case_closed", entityType: "case", entityId: closedIntakeCase.id, message: `Mottagningsärendet avslutades när stödärende ${supportCase.number} skapades`, idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now }));
  await atomicPut({ [CASES_STORE]: [supportCase, closedIntakeCase].filter(Boolean), [CASE_ASSIGNMENTS_STORE]: [owner], [CASE_ACTIVITIES_STORE]: activities, [CASE_EVENTS_STORE]: events, [INCOMING_CONTACTS_STORE]: [updatedContact], ...(publicRequest ? { [PUBLIC_SUPPORT_REQUESTS_STORE]: [{ ...publicRequest, status: "closed", caseId, updatedAt: now, updatedBy: CURRENT_USER_ID }] } : {}) });
  await saveSupportMatchingProfile(supportCase);
  await refresh();
  bootstrap.Offcanvas.getOrCreateInstance(els.incomingContactOffcanvas).hide();
  navigateToCase(caseId);
  showFeedback("Kontakten har kopplats och ett stödärende har skapats.");
}

function renderCaseFlowBoard(openCases) {
  if (!els.caseFlowBoard) return;
  const totalOpen = openCases.length;
  const { groups, standalone } = caseTypeRelationshipGroups();
  const renderNode = (caseTypeId, position) => {
    const definition = caseTypeById(caseTypeId);
    const stepCases = cases.filter((caseRecord) => caseRecord.caseTypeId === caseTypeId);
    const openStepCases = stepCases.filter((caseRecord) => caseRecord.status !== "closed");
    const waitingCount = openStepCases.filter((caseRecord) => caseRecord.status === "waiting").length;
    const decisionCount = openStepCases.filter((caseRecord) => caseRecord.status === "decision_required").length;
    const overdueCount = openStepCases.filter((caseRecord) => activitiesForCase(caseRecord.id).some((activity) => activityDueState(activity) === "overdue")).length;
    const share = totalOpen ? Math.round((openStepCases.length / totalOpen) * 100) : 0;
    const route = `#/cases/${encodeURIComponent(caseTypeId)}?status=open`;
    const signals = [
      waitingCount ? `${waitingCount} väntar` : "",
      overdueCount ? `${overdueCount} försenade` : "",
      decisionCount ? `${decisionCount} ställningstaganden` : ""
    ].filter(Boolean);
    return `
      <a class="case-flow-step" href="${route}" data-case-flow-type="${escapeHtml(caseTypeId)}">
        <span class="case-flow-index">${position}</span>
        <span class="case-flow-copy">
          <span class="case-flow-label">${escapeHtml(definition?.name || caseTypeId)}</span>
          <small>${escapeHtml(caseTypeCreationModeLabel(definition?.creationMode))}</small>
        </span>
        <span class="case-flow-count">
          <strong>${openStepCases.length}</strong>
          <small>${stepCases.length === openStepCases.length ? "öppna" : `${stepCases.length} totalt`}</small>
        </span>
        <span class="case-flow-meter" aria-hidden="true"><span style="width: ${share}%"></span></span>
        <span class="case-flow-signals">${signals.length ? signals.map((signal) => `<span>${escapeHtml(signal)}</span>`).join("") : "<span>Inga stopp</span>"}</span>
      </a>
    `;
  };
  const renderTrack = (items) => items.map((item, index) => `
    ${item.relationship ? `<div class="case-flow-connector">
      <span>${escapeHtml(relationshipKindLabel(item.relationship.kind))}</span>
      <i aria-hidden="true">&rarr;</i>
      <small>${escapeHtml(item.relationship.label)}</small>
    </div>` : ""}
    ${renderNode(item.caseTypeId, index + 1)}
  `).join("");
  els.caseFlowBoard.innerHTML = groups.map(({ title, items }) => `
    <section class="case-flow-group" aria-label="${escapeHtml(title)}">
      <h3>${escapeHtml(title)}</h3>
      <div class="case-flow-track">
        ${renderTrack(items)}
      </div>
    </section>
  `).join("") + (standalone.length ? `
    <section class="case-flow-group" aria-label="Fristående ärendetyper">
      <h3>Fristående ärendetyper</h3>
      <div class="case-flow-standalone">
        ${standalone.map((definition, index) => renderNode(definition.id, index + 1)).join("")}
      </div>
    </section>
  ` : "");
}

function renderDashboard() {
  renderIncomingContactTable();
  els.actionTableBody.innerHTML = "";
  const openCases = cases.filter((caseRecord) => caseRecord.status !== "closed");
  renderCaseFlowBoard(openCases);
  const nextActivities = openCases
    .map((caseRecord) => ({ caseRecord, activity: nextCaseActivity(caseRecord) }))
    .filter((item) => item.activity);
  const queue = nextActivities.filter(({ caseRecord, activity }) => {
    const effectiveOwner = effectiveActivityHandler(activity, caseRecord);
    if (dashboardQueueMode === "unassigned") return !effectiveOwner;
    if (dashboardQueueMode === "overdue") {
      return activityDueState(activity) === "overdue";
    }
    if (dashboardQueueMode === "decision") return caseRecord.status === "decision_required" || activityHasBlockingResult(activity);
    return effectiveOwner?.id === currentActorId();
  }).sort((left, right) => {
    const leftDue = left.activity.dueDate || "9999-12-31";
    const rightDue = right.activity.dueDate || "9999-12-31";
    if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return (priorityOrder[left.caseRecord.priority] ?? 1) - (priorityOrder[right.caseRecord.priority] ?? 1)
      || new Date(right.caseRecord.updatedAt) - new Date(left.caseRecord.updatedAt);
  });
  const rows = queue.slice(0, 8);
  const queueLabels = {
    mine: "aktiviteter i din arbetskö",
    unassigned: "otilldelade aktiviteter",
    overdue: "försenade aktiviteter",
    decision: "aktiviteter som kräver ställningstagande"
  };
  const queueSingularLabels = {
    mine: "aktivitet i din arbetskö",
    unassigned: "otilldelad aktivitet",
    overdue: "försenad aktivitet",
    decision: "aktivitet som kräver ställningstagande"
  };
  els.actionQueueSummary.textContent = queue.length > rows.length
    ? `Visar ${rows.length} av ${queue.length} ${queueLabels[dashboardQueueMode]}.`
    : queue.length === 1
      ? `1 ${queueSingularLabels[dashboardQueueMode]} behöver hanteras.`
      : queue.length > 1
        ? `${queue.length} ${queueLabels[dashboardQueueMode]} behöver hanteras.`
        : `Inga ${queueLabels[dashboardQueueMode]} att hantera.`;
  els.openActionQueueButton.hidden = queue.length === 0;
  for (const [mode, button] of [
    ["mine", els.myActivitiesQueueButton],
    ["unassigned", els.unassignedQueueButton],
    ["overdue", els.overdueQueueButton],
    ["decision", els.decisionQueueButton]
  ]) {
    const active = dashboardQueueMode === mode;
    button.classList.toggle("btn-primary", active);
    button.classList.toggle("btn-outline-secondary", !active);
    button.setAttribute("aria-pressed", String(active));
  }

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="text-secondary">Inga aktiviteter kräver åtgärd i den här arbetskön.</td>`;
    els.actionTableBody.append(row);
    return;
  }

  for (const { caseRecord, activity } of rows) {
    const mentor = caseMentor(caseRecord);
    const parent = caseParent(caseRecord);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="case-number-text text-nowrap">${escapeHtml(caseRecord.number)}</span></td>
      <td>${escapeHtml(mentor?.name || parent?.name || caseRecord.title)}<small>${escapeHtml(activityHandlerLabel(activity, caseRecord))}</small></td>
      <td>${escapeHtml(activity.title)}<small class="${activityDueState(activity) ? `activity-due-${activityDueState(activity)}` : ""}">${escapeHtml(activityHasBlockingResult(activity) ? "Ställningstagande krävs" : `Förfaller: ${activityDueLabel(activity)}`)}</small></td>
      <td><button type="button" class="btn btn-outline-primary btn-sm" data-open-activity="${activity.id}">Öppna</button></td>
    `;
    els.actionTableBody.append(row);
  }
}

function selectedPresentationStep() {
  return PRESENTATION_STEPS.find((step) => step.id === selectedPresentationStepId) || PRESENTATION_STEPS[0];
}

function presentationRoute(step) {
  const configuredRoute = resolveFeatureLink(step.featureId)?.href || "#/presentation";
  if (step.id === "mentor-record") {
    const candidate = candidates[0];
    return candidate ? `#/mentor/${candidate.id}` : "#/mentor/new";
  }
  if (step.id === "case-work") {
    const caseRecord = cases.find((item) => item.status !== "closed") || cases[0];
    return caseRecord ? `#/case/${caseRecord.id}` : "#/cases";
  }
  return configuredRoute;
}

function renderPresentation() {
  const selectedStep = selectedPresentationStep();
  const selectedIndex = PRESENTATION_STEPS.findIndex((step) => step.id === selectedStep.id);
  els.presentationStepList.innerHTML = "";

  for (const [index, step] of PRESENTATION_STEPS.entries()) {
    const commentsForStep = supportTickets.filter((ticket) => ticket.source === "demo_feedback" && ticket.presentationStepId === step.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `presentation-step-button ${step.id === selectedStep.id ? "active" : ""}`;
    button.dataset.presentationStep = step.id;
    button.innerHTML = `
      <span class="presentation-step-index">${index + 1}</span>
      <span>
        <strong>${escapeHtml(step.title)}</strong>
        <small>${commentsForStep.length} ${commentsForStep.length === 1 ? "återkoppling" : "återkopplingar"}</small>
      </span>
    `;
    els.presentationStepList.append(button);
  }

  els.presentationStepNumber.textContent = `Steg ${selectedIndex + 1}`;
  els.presentationStepTitle.textContent = selectedStep.title;
  els.presentationStepSummary.textContent = selectedStep.summary;
  els.presentationStepPoints.innerHTML = selectedStep.points
    .map((point) => `<li>${escapeHtml(point)}</li>`)
    .join("");
  els.presentationOpenStepButton.textContent = `Öppna: ${selectedStep.title}`;
  renderPresentationComments(selectedStep.id);
}

function renderPresentationComments(stepId) {
  const comments = supportTickets
    .filter((ticket) => ticket.source === "demo_feedback" && ticket.presentationStepId === stepId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  els.presentationCommentsEmpty.hidden = comments.length > 0;
  els.presentationCommentsList.innerHTML = "";

  for (const comment of comments) {
    const item = document.createElement("article");
    item.className = "presentation-comment border rounded";
    item.innerHTML = `
      <div class="presentation-comment-meta">
        <strong>${escapeHtml(comment.reporterName || "Okänd")}</strong>
        <span>${escapeHtml(supportTicketStatusLabel(comment.status))}</span>
        <time datetime="${escapeHtml(comment.createdAt)}">${escapeHtml(formatDateTime(comment.createdAt))}</time>
      </div>
      <p class="mb-0">${escapeHtml(comment.question)}</p>
    `;
    els.presentationCommentsList.append(item);
  }
}

function selectedCaseRecord() {
  return cases.find((item) => item.id === selectedCaseRecordId);
}

function selectedParent() {
  return parents.find((item) => item.id === selectedParentId);
}

function caseParent(caseRecord) {
  return parents.find((parent) => parent.id === caseRecord?.parentId);
}

function caseSupportCase(caseRecord) {
  if (!caseRecord) return null;
  return caseRecord.caseTypeId === "parent-support"
    ? caseRecord
    : cases.find((item) => item.id === caseRecord.supportCaseId && item.caseTypeId === "parent-support");
}

function supportCasesForParent(parentId) {
  return cases.filter((item) => item.parentId === parentId && item.caseTypeId === "parent-support");
}

function matchingCasesForSupport(supportCaseId) {
  return cases.filter((item) => item.supportCaseId === supportCaseId && item.caseTypeId === "matching");
}

function assignmentCasesForSupport(supportCaseId) {
  return cases.filter((item) => item.supportCaseId === supportCaseId && item.caseTypeId === "mentor-assignment");
}

function renderParents() {
  if (!els.parentTableBody) return;
  const term = parentSearchTerm.trim().toLocaleLowerCase("sv-SE");
  const rows = parents.filter((parent) => !term || [parent.name, parent.contactDetails, parent.area]
    .some((value) => String(value || "").toLocaleLowerCase("sv-SE").includes(term)));
  els.parentListCount.textContent = term ? `Visar ${rows.length} av ${parents.length} föräldrar.` : `${parents.length} föräldrar i registret.`;
  els.parentTableBody.innerHTML = "";
  if (!rows.length) {
    els.parentTableBody.innerHTML = '<tr><td colspan="6" class="text-secondary py-4 text-center">Inga föräldrar matchar sökningen.</td></tr>';
    return;
  }
  for (const parent of rows) {
    const supportCases = supportCasesForParent(parent.id);
    const openSupport = supportCases.filter((item) => item.status !== "closed").length;
    const activeAssignments = supportCases.flatMap((item) => assignmentCasesForSupport(item.id)).filter((item) => item.status !== "closed").length;
    const row = document.createElement("tr");
    row.innerHTML = `<td><a class="fw-semibold" href="#/parent/${escapeHtml(parent.id)}">${escapeHtml(parent.name)}</a></td><td>${escapeHtml(parent.contactDetails || "Ej angivet")}</td><td>${escapeHtml(parent.area || "Ej angivet")}</td><td>${openSupport}</td><td>${activeAssignments}</td><td>${escapeHtml(formatDateTime(parent.updatedAt))}</td>`;
    els.parentTableBody.append(row);
  }
}

function renderParentDetail() {
  if (!els.parentDetail) return;
  const creating = currentView === "parent" && selectedParentId === "new";
  const parent = selectedParent();
  els.parentDetailEmpty.hidden = creating || Boolean(parent);
  els.parentDetail.hidden = !creating && !parent;
  if (!creating && !parent) return;

  const editing = creating || parentEditMode;
  els.parentForm.hidden = !editing;
  els.parentReadView.hidden = editing;
  els.editParentButton.hidden = creating || editing;
  els.newParentSupportCaseButton.hidden = creating || editing;
  els.initialSupportCaseSection.hidden = !creating;
  els.selectedParentId.textContent = creating ? "Post-ID skapas när registreringen sparas" : `FP-${parent.id.slice(0, 8).toUpperCase()}`;
  els.selectedParentName.textContent = creating ? "Ny förälder" : parent.name;
  els.selectedParentCreatedBy.textContent = creating ? currentUserName() : handlerNameById(parent.createdBy);
  els.selectedParentCreated.textContent = creating ? "Inte sparat" : formatDateTime(parent.createdAt);
  els.selectedParentUpdated.textContent = creating ? "Inte sparat" : formatDateTime(parent.updatedAt);

  const routeKey = creating ? "new" : `${parent.id}-${parent.updatedAt}-${editing}`;
  if (editing && els.parentForm.dataset.route !== routeKey) {
    els.parentForm.reset();
    els.createInitialSupportCaseInput.checked = true;
    els.initialSupportCaseFields.hidden = false;
    els.initialSupportPurposeInput.required = creating;
    els.initialSupportOutcomeInput.required = creating;
    els.parentNameInput.value = parent?.name || "";
    els.parentContactInput.value = parent?.contactDetails || "";
    els.parentInformationStatusInput.value = parent?.informationStatus || "";
    els.parentAreaInput.value = parent?.area || "";
    els.parentLanguagesInput.value = parent?.languages || "";
    els.parentAvailabilityInput.value = parent?.availability || "";
    renderSupportAreaChoices(els.initialSupportAreaChoices, [], { name: "initialSupportArea" });
    els.parentForm.dataset.route = routeKey;
  }
  if (creating) return;

  els.parentNameFact.textContent = parent.name;
  els.parentContactFact.textContent = parent.contactDetails || "Ej angivet";
  els.parentInformationStatusFact.textContent = informationStatusLabel(parent.informationStatus);
  els.parentAreaFact.textContent = parent.area || "Ej angivet";
  els.parentLanguagesFact.textContent = parent.languages || "Ej angivet";
  els.parentAvailabilityFact.textContent = parent.availability || "Ej angivet";
  const parentCaseGroups = groupParentCases(cases, parent.id);
  const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  const supportCases = parentCaseGroups.supportCases.sort(byNewest);
  const matchingCases = parentCaseGroups.matchingCases.sort(byNewest);
  const assignmentCases = parentCaseGroups.assignmentCases.sort(byNewest);
  els.parentSupportCaseTabCount.textContent = supportCases.length;
  els.parentMatchingCaseTabCount.textContent = matchingCases.length;
  els.parentAssignmentCaseTabCount.textContent = assignmentCases.length;

  els.parentSupportCaseTableBody.innerHTML = supportCases.length ? "" : '<tr><td colspan="4" class="text-secondary py-4 text-center">Inga stödärenden registrerade.</td></tr>';
  for (const supportCase of supportCases) {
    const nextActivity = nextCaseActivity(supportCase);
    const row = document.createElement("tr");
    row.innerHTML = `<td><a class="case-number-link" href="#/case/${escapeHtml(supportCase.id)}">${escapeHtml(supportCase.number)}</a></td><td><a href="#/case/${escapeHtml(supportCase.id)}">${escapeHtml(supportCase.details?.supportPurpose || supportCase.title)}</a></td><td><span class="${caseStatusBadge(supportCase.status)}">${escapeHtml(caseStatusLabel(supportCase.status))}</span></td><td>${escapeHtml(nextActivity?.title || "Ingen återstående")}</td>`;
    els.parentSupportCaseTableBody.append(row);
  }

  els.parentMatchingCaseTableBody.innerHTML = matchingCases.length ? "" : '<tr><td colspan="5" class="text-secondary py-4 text-center">Inga matchningar registrerade.</td></tr>';
  for (const matchingCase of matchingCases) {
    const supportCase = cases.find((caseRecord) => caseRecord.id === matchingCase.supportCaseId);
    const mentor = caseMentor(matchingCase);
    const nextActivity = nextCaseActivity(matchingCase);
    const row = document.createElement("tr");
    row.innerHTML = `<td><a class="case-number-link" href="#/case/${escapeHtml(matchingCase.id)}">${escapeHtml(matchingCase.number)}</a></td><td>${escapeHtml(supportCase?.details?.supportPurpose || supportCase?.title || "Ej kopplat")}</td><td>${escapeHtml(mentor?.name || "Mentor ej vald")}</td><td><span class="${caseStatusBadge(matchingCase.status)}">${escapeHtml(caseStatusLabel(matchingCase.status))}</span></td><td>${escapeHtml(nextActivity?.title || "Ingen återstående")}</td>`;
    els.parentMatchingCaseTableBody.append(row);
  }

  els.parentAssignmentCaseTableBody.innerHTML = assignmentCases.length ? "" : '<tr><td colspan="5" class="text-secondary py-4 text-center">Inga uppdrag registrerade.</td></tr>';
  for (const assignmentCase of assignmentCases) {
    const supportCase = cases.find((caseRecord) => caseRecord.id === assignmentCase.supportCaseId);
    const mentor = caseMentor(assignmentCase);
    const nextActivity = nextCaseActivity(assignmentCase);
    const row = document.createElement("tr");
    row.innerHTML = `<td><a class="case-number-link" href="#/case/${escapeHtml(assignmentCase.id)}">${escapeHtml(assignmentCase.number)}</a></td><td>${escapeHtml(supportCase?.details?.supportPurpose || supportCase?.title || "Ej kopplat")}</td><td>${escapeHtml(mentor?.name || "Mentor ej vald")}</td><td><span class="${caseStatusBadge(assignmentCase.status)}">${escapeHtml(caseStatusLabel(assignmentCase.status))}</span></td><td>${escapeHtml(nextActivity?.title || "Ingen återstående")}</td>`;
    els.parentAssignmentCaseTableBody.append(row);
  }
}

function caseMentor(caseRecord) {
  return candidates.find((candidate) => candidate.id === caseRecord?.mentorId);
}

function assignmentsForCase(caseId) {
  return caseAssignments.filter((assignment) => assignment.caseId === caseId && !assignment.endedAt);
}

function handlerForAssignment(assignment) {
  return handlers.find((handler) => handler.id === assignment?.handlerId);
}

function responsibleHandler(caseRecord) {
  const assignment = assignmentsForCase(caseRecord?.id).find((item) => item.role === "responsible");
  return handlerForAssignment(assignment);
}

function coHandlers(caseRecord) {
  return assignmentsForCase(caseRecord?.id)
    .filter((item) => item.role === "co_handler")
    .map(handlerForAssignment)
    .filter(Boolean);
}

function activitiesForCase(caseId) {
  return caseActivities.filter((activity) => activity.caseId === caseId);
}

function activityResultOptions(activity) {
  return ACTIVITY_RESULT_OPTIONS[activity?.templateId] || ACTIVITY_RESULT_OPTIONS.default;
}

function quickActivityResultOptions(activity) {
  const allowedCodes = new Set(activityTemplateById(activity?.templateId)?.quickCompletionResultCodes || []);
  return activityResultOptions(activity).filter(([resultCode]) => allowedCodes.has(resultCode));
}

const WORK_INPUT_STATE_LABELS = {
  not_started: "Inte påbörjad",
  in_progress: "Påbörjad",
  complete: "Fullständig"
};

function workInputStateClass(state) {
  return state === "complete"
    ? "text-bg-success"
    : state === "in_progress"
      ? "text-bg-warning"
      : "text-bg-secondary";
}

function latestRecord(records = []) {
  return [...records].sort((left, right) => new Date(right.updatedAt || right.createdAt || right.occurredAt || right.occurredOn || 0)
    - new Date(left.updatedAt || left.createdAt || left.occurredAt || left.occurredOn || 0))[0] || null;
}

function activityWorkInputSummary(activity, caseRecord) {
  const definition = activityWorkInputDefinition(activity, caseRecord?.caseTypeId);
  if (!definition || !caseRecord) return null;

  let started = false;
  let complete = false;
  let updatedAt = null;
  let updatedBy = null;
  let help = "Öppna den kopplade registreringen och komplettera underlaget innan aktiviteten avslutas.";
  const routeParameters = { caseId: caseRecord.id, activityId: activity.id, mentorId: caseRecord.mentorId };

  if (definition.kind === "mentor_identity") {
    const mentor = caseMentor(caseRecord);
    started = Boolean(mentor?.personalNumber || mentor?.identityMethod);
    complete = Boolean(mentor?.personalNumber && mentor?.identityMethod);
    updatedAt = mentor?.identityVerifiedAt || mentor?.updatedAt;
    updatedBy = mentor?.identityVerifiedBy || mentor?.updatedBy;
    help = "Registrera personnummer och hur identiteten har kontrollerats på mentorkortet.";
  } else if (definition.kind === "case_meeting") {
    const records = caseMeetings.filter((meeting) => meeting.caseId === caseRecord.id
      && !meeting.supersededByMeetingId
      && (meeting.activityId === activity.id || activity.templateId === "interviewDone" && meeting.meetingType === "certification_interview"));
    const latest = latestRecord(records);
    started = records.length > 0;
    complete = records.some((meeting) => Boolean(meeting.occurredAt && meeting.summary?.trim()));
    updatedAt = latest?.updatedAt || latest?.createdAt;
    updatedBy = latest?.updatedBy || latest?.createdBy;
    help = activity.templateId === "matchingFirstMeeting"
      ? "Registrera överenskommen tid, kontaktform och praktiska förutsättningar och koppla mötet till aktiviteten."
      : "Registrera intervjun som ett möte och koppla den till aktiviteten. En saklig sammanfattning krävs.";
  } else if (definition.kind === "matching_basis") {
    const snapshot = matchingSnapshot(caseRecord.id);
    started = Boolean(snapshot);
    complete = Boolean(snapshot?.supportProfile && snapshot?.mentorProfile);
    updatedAt = snapshot?.createdAt;
    updatedBy = snapshot?.createdBy;
    help = "Granska det frysta stöd- och mentorunderlaget som matchningen grundas på.";
  } else if (definition.kind === "matching_proposal") {
    const proposal = caseRecord.details?.matchingProposal?.trim();
    started = Boolean(proposal);
    complete = Boolean(proposal);
    updatedAt = proposal ? caseRecord.updatedAt : null;
    updatedBy = proposal ? caseRecord.updatedBy : null;
    help = "Dokumentera varför mentorn bedöms passa stödbehovet och ange eventuella begränsningar.";
  } else if (definition.kind === "matching_responses") {
    const validResponses = new Set(["accepted", "declined"]);
    const parentResponse = caseRecord.details?.parentResponse;
    const mentorResponse = caseRecord.details?.mentorResponse;
    started = validResponses.has(parentResponse) || validResponses.has(mentorResponse);
    complete = validResponses.has(parentResponse) && validResponses.has(mentorResponse);
    updatedAt = started ? caseRecord.updatedAt : null;
    updatedBy = started ? caseRecord.updatedBy : null;
    help = "Registrera förälderns och mentorns svar var för sig. Uteblivet svar är inte ett godkännande.";
  } else if (definition.kind === "matching_decision") {
    const outcome = caseRecord.details?.matchingOutcome;
    started = Boolean(outcome && outcome !== "pending");
    complete = ["accepted", "declined"].includes(outcome);
    updatedAt = started ? caseRecord.updatedAt : null;
    updatedBy = started ? caseRecord.updatedBy : null;
    help = "Kontrollera underlaget och registrera det samlade utfallet. Ett uppdrag skapas inte utan båda parters godkännande.";
  } else if (definition.kind === "support_profile") {
    const profile = supportMatchingProfile(caseRecord.id);
    const areaCount = profile ? supportMatchingAreas.filter((entry) => entry.profileId === profile.id).length : 0;
    const details = caseRecord.details || {};
    started = Boolean(details.supportPurpose?.trim() || details.desiredOutcome?.trim() || areaCount);
    complete = Boolean(details.supportPurpose?.trim() && details.desiredOutcome?.trim() && areaCount);
    updatedAt = started ? profile?.updatedAt || caseRecord.updatedAt : null;
    updatedBy = started ? profile?.updatedBy || caseRecord.updatedBy : null;
    help = "Komplettera stödets syfte, önskat resultat och minst ett bekräftat stödområde.";
  } else if (definition.kind === "assignment_plan") {
    const plan = caseRecord.details?.assignmentPlan;
    started = Boolean(plan && Object.values(plan).some(Boolean));
    complete = Boolean(plan?.startDate && plan?.contactFrequency && plan?.firstFollowUpDate);
    updatedAt = plan?.updatedAt;
    updatedBy = plan?.updatedBy;
    help = "Ange uppdragets start, kontaktfrekvens och första planerade uppföljning.";
  } else if (definition.kind === "parent_checkin") {
    const records = parentCheckIns.filter((record) => record.caseId === caseRecord.id
      && (!record.activityId || record.activityId === activity.id));
    const latest = latestRecord(records);
    started = records.length > 0;
    complete = Boolean(latest?.occurredOn && latest?.contactConfirmed && latest?.continueStatus);
    updatedAt = latest?.updatedAt || latest?.createdAt;
    updatedBy = latest?.updatedBy || latest?.createdBy;
    help = "Registrera handläggarens avstämning med föräldern och hur stödet ska fortsätta.";
  } else if (definition.kind === "assignment_evidence") {
    const reports = mentorReports.filter((record) => record.caseId === caseRecord.id
      && (!record.activityId || record.activityId === activity.id));
    const meetings = caseMeetings.filter((record) => record.caseId === caseRecord.id
      && !record.supersededByMeetingId
      && (!record.activityId || record.activityId === activity.id));
    const latest = latestRecord([...reports, ...meetings]);
    started = reports.length > 0 || meetings.length > 0;
    complete = reports.some((report) => report.outcome === "completed" && report.summary?.trim());
    updatedAt = latest?.updatedAt || latest?.createdAt;
    updatedBy = latest?.updatedBy || latest?.createdBy;
    help = "Kontrollera mentorrapporter, mötesuppgifter och underlag för uppföljning och ersättning.";
  }

  const state = deriveWorkInputState({ started, complete });
  const href = resolveFeatureRoute(definition.featureKey, routeParameters);
  return {
    ...definition,
    state,
    stateLabel: WORK_INPUT_STATE_LABELS[state],
    stateClass: workInputStateClass(state),
    updatedAt,
    updatedBy,
    help,
    href,
    actionLabel: state === "not_started" ? "Påbörja registrering" : state === "in_progress" ? "Fortsätt registrering" : "Öppna registrering"
  };
}

function defaultCompletedResult(activity) {
  return activityResultOptions(activity)[0]?.[0] || "";
}

function activityResultValue(activity) {
  if (activity?.resultCode) return activity.resultCode;
  return normalizeActivityStatus(activity?.status) === "completed" ? defaultCompletedResult(activity) : "";
}

function activityResultLabel(activity) {
  const value = activityResultValue(activity);
  return activityResultOptions(activity).find(([key]) => key === value)?.[1] || "";
}

function effectiveActivityHandler(activity, caseRecord) {
  const handlerId = activityOwnerOverrideId(activity, caseRecord) || responsibleHandler(caseRecord)?.id || "";
  return handlers.find((handler) => handler.id === handlerId);
}

function activityOwnerOverrideId(activity, caseRecord) {
  return activity?.handlerIdOverride || "";
}

function activityHandlerLabel(activity, caseRecord) {
  const handler = effectiveActivityHandler(activity, caseRecord);
  if (!handler) return "Ej tilldelad";
  return activityOwnerOverrideId(activity, caseRecord) ? `${handler.name} (särskilt tilldelad)` : `${handler.name} (ärendeansvarig)`;
}

function activityDocuments(activityId) {
  return currentCaseDocuments().filter((document) => document.activityId === activityId);
}

function currentCaseDocuments() {
  const supersededIds = new Set(caseDocuments.map((document) => document.supersedesDocumentId).filter(Boolean));
  return caseDocuments.filter((document) => !supersededIds.has(document.id));
}

function latestActivityNote(activityId) {
  return activityDocuments(activityId)
    .filter((document) => document.type === "service_note")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.description || "";
}

function documentTypeLabel(type) {
  return ({ incoming: "Inkommen handling", created: "Upprättad handling", service_note: "Tjänsteanteckning" })[type] || type;
}

function activityStatusLabel(status) {
  return domainActivityStatusLabel(status);
}

function waitingForPartyLabel(value) {
  return ({ mentor: "mentorn", handler: "handläggaren", external: "extern part" })[value] || "";
}

function activityWorkStateLabel(activity) {
  if (activityHasBlockingResult(activity)) return "Ställningstagande krävs";
  if (activity.status === "waiting" && activity.waitingForParty) return `Väntar på ${waitingForPartyLabel(activity.waitingForParty)}`;
  return activityStatusLabel(activity.status);
}

function activityStatusClass(activity) {
  if (activityHasBlockingResult(activity)) return "text-bg-danger";
  if (activity.status === "completed") return "text-bg-success";
  if (activity.status === "in_progress") return "text-bg-primary";
  if (activity.status === "waiting") return "text-bg-warning";
  if (activity.status === "not_applicable") return "text-bg-light border text-secondary";
  return "text-bg-secondary";
}

function activityDueState(activity) {
  if (!activity?.dueDate || ["completed", "not_applicable"].includes(activity.status)) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (activity.dueDate < today) return "overdue";
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  return activity.dueDate <= soon.toISOString().slice(0, 10) ? "soon" : "";
}

function activityDueLabel(activity) {
  if (!activity?.dueDate) return "Ej angivet";
  const suffix = activityDueState(activity) === "overdue"
    ? " · Försenad"
    : activityDueState(activity) === "soon"
      ? " · Förfaller snart"
      : "";
  return `${formatDate(activity.dueDate)}${suffix}`;
}

function activityHasBlockingResult(activity) {
  return activityDeviations.some((deviation) => deviation.activityId === activity.id && deviation.status === "open" && !deviation.activeDecisionId);
}

function nextCaseActivity(caseRecord) {
  const activities = activitiesForCase(caseRecord?.id);
  return activities.find(activityHasBlockingResult)
    || activities.find((activity) => !["completed", "not_applicable"].includes(activity.status));
}

function caseStatusBadge(status) {
  if (status === "closed") return "badge rounded-pill text-bg-success";
  if (status === "decision_required") return "badge rounded-pill text-bg-danger";
  if (status === "waiting" || status === "paused") return "badge rounded-pill text-bg-warning";
  if (status === "in_progress") return "badge rounded-pill text-bg-primary";
  return "badge rounded-pill text-bg-secondary";
}

function filteredCases() {
  const term = caseSearchTerm.trim().toLowerCase();
  return cases.filter((caseRecord) => {
    const mentor = caseMentor(caseRecord);
    const parent = caseParent(caseRecord);
    const handlerNames = assignmentsForCase(caseRecord.id)
      .map(handlerForAssignment)
      .filter(Boolean)
      .map((handler) => handler.name);
    const text = [caseRecord.number, caseRecord.title, caseRecord.type, mentor?.name, parent?.name, ...handlerNames].join(" ").toLowerCase();
    const matchesStatus = caseStatusFilter === "open"
      ? caseRecord.status !== "closed"
      : !caseStatusFilter || caseRecord.status === caseStatusFilter;
    return (!caseTypeFilter || caseRecord.caseTypeId === caseTypeFilter)
      && matchesStatus
      && (!term || text.includes(term));
  });
}

function caseListRoute(typeFilter = caseTypeFilter, statusFilter = caseStatusFilter) {
  const base = typeFilter ? `#/cases/${encodeURIComponent(typeFilter)}` : "#/cases";
  return statusFilter ? `${base}?status=${encodeURIComponent(statusFilter)}` : base;
}

function newCaseButtonLabel(caseTypeId) {
  if (!caseTypeId) return "Ny registrering";
  const name = caseTypeRelationshipName(caseTypeId);
  const article = ["mentor-assignment", "parent-support", "mentor-certification", "other"].includes(caseTypeId) ? "Nytt" : "Ny";
  return `${article} ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

function syncCaseTypeFilterOptions() {
  const options = ['<option value="">Alla ärendetyper</option>']
    .concat(caseTypeDefinitions.map((definition) => `<option value="${escapeHtml(definition.id)}">${escapeHtml(definition.name)}</option>`));
  els.caseTypeFilter.innerHTML = options.join("");
}

function renderCases() {
  const filteredRows = filteredCases();
  const typeRows = caseTypeFilter ? cases.filter((caseRecord) => caseRecord.caseTypeId === caseTypeFilter) : cases;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / CASE_PAGE_SIZE));
  casePage = Math.min(casePage, pageCount);
  const start = (casePage - 1) * CASE_PAGE_SIZE;
  const rows = filteredRows.slice(start, start + CASE_PAGE_SIZE);
  els.caseRegisterTitle.textContent = caseTypeFilter ? caseTypeRelationshipName(caseTypeFilter) : "Ärenderegister";
  els.newGeneralCaseButton.textContent = newCaseButtonLabel(caseTypeFilter);
  els.newGeneralCaseButton.hidden = ["matching", "mentor-assignment"].includes(caseTypeFilter);
  syncCaseTypeFilterOptions();
  if (els.caseTypeFilter.value !== caseTypeFilter) els.caseTypeFilter.value = caseTypeFilter;
  if (els.caseStatusFilter.value !== caseStatusFilter) els.caseStatusFilter.value = caseStatusFilter;
  els.caseListCount.textContent = filteredRows.length === typeRows.length
    ? `${typeRows.length} ${typeRows.length === 1 ? "ärende" : "ärenden"} i registret.`
    : `Visar ${filteredRows.length} av ${typeRows.length} ärenden.`;
  els.casePageSummary.textContent = filteredRows.length
    ? `Visar ${start + 1}–${start + rows.length} av ${filteredRows.length}`
    : "Inga träffar";
  els.previousCasePageButton.disabled = casePage <= 1;
  els.nextCasePageButton.disabled = casePage >= pageCount;
  els.caseTableBody.innerHTML = "";

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7" class="text-secondary">Inga ärenden matchar urvalet.</td>';
    els.caseTableBody.append(row);
    return;
  }

  for (const caseRecord of rows) {
    const mentor = caseMentor(caseRecord);
    const parent = caseParent(caseRecord);
    const owner = responsibleHandler(caseRecord);
    const nextActivity = nextCaseActivity(caseRecord);
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.dataset.caseId = caseRecord.id;
    row.setAttribute("aria-label", `Öppna ärende ${caseRecord.number}: ${caseRecord.title}`);
    row.innerHTML = `
      <td><span class="case-number-text">${escapeHtml(caseRecord.number)}</span><small>${escapeHtml(formatDate(caseRecord.updatedAt))}</small></td>
      <td>${escapeHtml(caseRecord.title)}</td>
      <td>${escapeHtml(caseRecord.type)}</td>
      <td>${mentor ? escapeHtml(mentor.name) : parent ? escapeHtml(parent.name) : '<span class="text-secondary">Ej personanknutet</span>'}</td>
      <td><span class="${caseStatusBadge(caseRecord.status)}">${escapeHtml(caseStatusLabel(caseRecord.status))}</span></td>
      <td>${escapeHtml(owner?.name || "Ej tilldelad")}</td>
      <td>${escapeHtml(nextActivity?.title || "Ingen återstående")}</td>
    `;
    row.addEventListener("click", () => navigateToCase(caseRecord.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") navigateToCase(caseRecord.id);
    });
    els.caseTableBody.append(row);
  }
}

function organizationUnitLabel(unitId) {
  return ORGANIZATION_UNIT_LABELS[unitId] || unitId || ORGANIZATION_UNIT_LABELS[DEFAULT_ORGANIZATION_UNIT_ID];
}

function caseDetailInput(fieldId) {
  return {
    supportPurpose: els.supportPurposeInput,
    desiredOutcome: els.desiredOutcomeInput,
    targetGroup: els.needsTargetGroupInput,
    area: els.needsAreaInput,
    languages: els.needsLanguagesInput,
    desiredCount: els.needsDesiredCountInput,
    desiredDate: els.needsDesiredDateInput
  }[fieldId] || null;
}

function configuredDetailFields(caseType) {
  const enabled = new Set(caseType?.detailFieldIds || []);
  return CASE_DETAIL_FIELD_DEFINITIONS.filter((field) => enabled.has(field.id));
}

function renderCaseTypeGuidance(caseRecord = null) {
  const caseType = caseTypeById(els.caseTypeInput.value, caseRecord?.caseTypeVersion);
  els.caseTypeGuidance.hidden = !caseType;
  els.caseTypeGuidanceTitle.textContent = caseType ? `När används ${caseType.name.toLocaleLowerCase("sv-SE")}?` : "";
  els.caseTypeGuidanceText.textContent = caseType?.helpText || "";
  els.caseTypeRegistrationHint.textContent = caseType ? `Registrera: ${caseType.registrationHint}` : "";

  const mentorMode = caseType?.mentorMode || "optional";
  els.caseMentorField.hidden = mentorMode === "none";
  els.caseMentorInput.required = mentorMode === "required";
  els.caseMentorLabel.innerHTML = mentorMode === "required"
    ? "Mentor"
    : 'Mentor <span class="text-secondary fw-normal">(valfritt)</span>';
  if (mentorMode === "none") {
    els.caseMentorInput.value = "";
    els.caseMentorIdInput.value = "";
    els.caseMentorSuggestions.hidden = true;
    els.caseMentorSuggestions.innerHTML = "";
    els.caseDuplicatePanel.hidden = true;
  }

  const parentMode = caseType?.parentMode || "none";
  els.caseParentField.hidden = parentMode !== "required";
  els.caseParentInput.required = parentMode === "required";
  const usesSupportCase = parentMode === "via_support_case";
  els.caseSupportCaseField.hidden = !usesSupportCase;
  els.caseSupportCaseInput.required = usesSupportCase;
  if (!usesSupportCase) els.caseSupportCaseInput.value = "";

  const needsAnalysis = caseType?.id === "needs-analysis";
  const detailFields = configuredDetailFields(caseType);
  els.needsAnalysisFields.hidden = detailFields.length === 0;
  const supportAreaField = els.caseSupportAreaChoices?.closest("#caseSupportAreaField");
  if (supportAreaField) supportAreaField.hidden = caseType?.id !== "parent-support";
  renderSupportAreaChoices(els.caseSupportAreaChoices, caseRecord?.caseTypeId === "parent-support" ? supportAreaIdsForCase(caseRecord) : [], { name: "caseSupportArea" });
  for (const field of CASE_DETAIL_FIELD_DEFINITIONS) {
    const input = caseDetailInput(field.id);
    if (!input) continue;
    input.closest("[class*='col-md']").hidden = !detailFields.some((item) => item.id === field.id);
    input.value = caseRecord?.details?.[field.id] ?? "";
  }
  els.caseDescriptionInput.required = needsAnalysis;
  els.caseDescriptionLabel.textContent = needsAnalysis ? "Kort beskrivning av behovet" : "Kort beskrivning";

  const titlePlaceholders = {
    "parent-support": "Exempel: Stöd kring skolfrånvaro",
    "mentor-certification": "Exempel: Godkännande av Amina Ekström",
    "mentor-follow-up": "Exempel: Uppföljning efter första uppdraget",
    matching: "Exempel: Matchning för stödbehov i område Öster",
    "mentor-assignment": "Exempel: Mentoruppdrag område Öster",
    recruitment: "Exempel: Rekrytering av arabisktalande mentorer",
    "needs-analysis": "Exempel: Behov av arabisktalande mentorer",
    other: "Beskriv frågan kort och konkret"
  };
  const descriptionPlaceholders = {
    "parent-support": "Beskriv stödbehovet kort och sakligt. Detaljer kan kompletteras senare.",
    "mentor-certification": "Ange vad som initierat prövningen och eventuell viktig bakgrund.",
    "mentor-follow-up": "Ange vad som ska följas upp och vilket resultat som förväntas.",
    matching: "Sammanfatta stödbehovet och de viktigaste matchningskriterierna.",
    "mentor-assignment": "Beskriv uppdragets syfte, omfattning och överenskomna ramar.",
    recruitment: "Beskriv målgrupp, önskat utfall och bakomliggande beslut eller behov.",
    "needs-analysis": "Beskriv vilket behov som har uppmärksammats och vilket underlag bedömningen bygger på.",
    other: "Beskriv frågan och vad som behöver vara gjort för att ärendet ska kunna avslutas."
  };
  els.caseTitleInput.placeholder = caseType ? titlePlaceholders[caseType.id] : "Välj ärendetyp först";
  els.caseDescriptionInput.placeholder = caseType ? descriptionPlaceholders[caseType.id] : "";

}

function renderCaseTypeDetails(caseRecord) {
  const details = caseRecord.details || {};
  const caseType = caseTypeById(caseRecord.caseTypeId, caseRecord.caseTypeVersion);
  const detailFields = configuredDetailFields(caseType);
  const supportCase = caseRecord.caseTypeId === "parent-support" ? caseRecord : cases.find((item) => item.id === caseRecord.supportCaseId);
  const activeSupportProfile = supportCase ? supportMatchingProfile(supportCase.id) : null;
  const profileSupportAreaIds = activeSupportProfile
    ? supportMatchingAreas.filter((entry) => entry.profileId === activeSupportProfile.id).map((entry) => entry.supportAreaId)
    : [];
  const supportAreaIds = normalizeSupportAreaIds(profileSupportAreaIds.length ? profileSupportAreaIds : supportCase?.details?.supportAreaIds);
  const snapshot = caseRecord.caseTypeId === "matching" ? matchingSnapshot(caseRecord.id) : null;
  if (!detailFields.length && !supportAreaIds.length && !["parent-support", "matching"].includes(caseRecord.caseTypeId)) {
    els.caseTypeDetailsSection.hidden = true;
    els.caseTypeDetailsFacts.innerHTML = "";
    return;
  }
  const facts = detailFields.map((field) => {
    const rawValue = details[field.id];
    const value = field.id === "desiredCount" && rawValue
      ? `${rawValue} st`
      : field.inputType === "date" && rawValue ? formatDate(rawValue) : rawValue;
    return [field.label, value];
  });
  if (supportCase?.caseTypeId === "parent-support") {
    facts.push(["Stödområden", supportAreaIds.length ? supportAreaLabels(supportAreaIds).join(", ") : "Behöver bekräftas före matchning"]);
    if (caseRecord.caseTypeId === "parent-support" && activeSupportProfile) facts.push(["Matchningsunderlag", `Version ${activeSupportProfile.version} · uppdaterat ${formatDateTime(activeSupportProfile.updatedAt)}`]);
  }
  if (caseRecord.caseTypeId === "matching" && caseRecord.mentorId) {
    const mentor = caseMentor(caseRecord);
    const overlap = snapshot
      ? supportAreaLabels(snapshot.overlapSupportAreaIds).map((title, index) => ({ id: snapshot.overlapSupportAreaIds[index], title }))
      : supportAreaOverlap(supportAreaIds, mentor?.supportAreas);
    facts.push(["Överlappning med mentor", overlap.length ? overlap.map((area) => area.title).join(", ") : "Ingen registrerad överlappning – handläggaren behöver bedöma matchningen"]);
    facts.push(["Bedömningsunderlag", snapshot
      ? `Fryst vid start · stödprofil v${snapshot.supportProfile?.version || "-"} · mentorprofil v${snapshot.mentorProfile?.version || "-"}`
      : "Saknas · matchningen behöver kontrolleras"]);
  }
  els.caseTypeDetailsSection.hidden = false;
  els.caseTypeDetailsTitle.textContent = caseRecord.caseTypeId === "matching" ? "Matchningsunderlag" : caseRecord.caseTypeId === "needs-analysis" ? "Behovets omfattning" : "Kompletterande uppgifter";
  els.caseTypeDetailsFacts.innerHTML = facts
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "Ej angivet")}</dd></div>`)
    .join("");
}

const matchResponseLabels = { accepted: "Accepterar", declined: "Tackar nej", waiting: "Vill avvakta", "": "Inte registrerat" };

function renderMatchingDecisionSummary(caseRecord) {
  if (!els.matchingDecisionSummary) return;
  if (caseRecord.caseTypeId !== "matching") {
    els.matchingDecisionSummary.hidden = true;
    els.matchingDecisionSummary.innerHTML = "";
    return;
  }
  const supportCase = caseSupportCase(caseRecord);
  const mentor = caseMentor(caseRecord);
  const snapshot = matchingSnapshot(caseRecord.id);
  const supportAreaIds = snapshot?.supportProfile?.supportAreas?.map((entry) => entry.supportAreaId)
    || supportAreaIdsForCase(supportCase);
  const mentorAreaIds = snapshot?.mentorProfile?.supportAreas?.map((entry) => entry.supportAreaId)
    || normalizeSupportAreaIds(mentor?.supportAreas?.map((entry) => entry.areaId || entry.supportAreaId));
  const overlapIds = snapshot?.overlapSupportAreaIds
    || supportAreaOverlap(supportAreaIds, mentor?.supportAreas).map((area) => area.id);
  const supportLanguages = snapshot?.supportProfile?.languages?.map((entry) => entry.label)
    || normalizeLanguageEntries(supportCase?.details?.languages).map((entry) => entry.label);
  const mentorLanguages = snapshot?.mentorProfile?.languages?.map((entry) => entry.label)
    || normalizeLanguageEntries(mentor?.languages).map((entry) => entry.label);
  const sharedLanguages = supportLanguages.filter((language) => mentorLanguages.some((mentorLanguage) => mentorLanguage.localeCompare(language, "sv", { sensitivity: "base" }) === 0));
  const responseStatus = matchingOutcome(caseRecord.details?.parentResponse, caseRecord.details?.mentorResponse);
  const decisionText = responseStatus === "accepted"
    ? "Redo att skapa uppdrag när intern avstämning är klar."
    : responseStatus === "declined"
      ? "Matchningen kan avslutas utan uppdrag."
      : "Invänta återstående svar innan beslut.";
  els.matchingDecisionSummary.hidden = false;
  els.matchingDecisionSummary.innerHTML = `
    <div class="matching-decision-card">
      <span class="record-type">Beslutsunderlag</span>
      <strong>${escapeHtml(supportCase?.details?.supportPurpose || supportCase?.title || "Stödärende saknas")}</strong>
      <small>${escapeHtml(supportCase?.details?.desiredOutcome || "Önskat resultat behöver kompletteras")}</small>
    </div>
    <div class="matching-decision-card">
      <span class="record-type">Föreslagen mentor</span>
      <strong>${escapeHtml(mentor?.name || "Mentor saknas")}</strong>
      <small>${escapeHtml([mentor?.area, mentor?.availability].filter(Boolean).join(" · ") || "Område och tillgänglighet behöver kontrolleras")}</small>
    </div>
    <div class="matching-decision-card">
      <span class="record-type">Överlappning</span>
      <strong>${escapeHtml(overlapIds.length ? supportAreaLabels(overlapIds).join(", ") : "Ingen registrerad")}</strong>
      <small>${escapeHtml(sharedLanguages.length ? `Gemensamt språk: ${sharedLanguages.join(", ")}` : "Språk behöver bedömas")}</small>
    </div>
    <div class="matching-decision-card matching-decision-card-primary">
      <span class="record-type">Svar och beslut</span>
      <strong>${escapeHtml(decisionText)}</strong>
      <small>Förälder: ${escapeHtml(matchResponseLabels[caseRecord.details?.parentResponse || ""] || "Inte registrerat")} · Mentor: ${escapeHtml(matchResponseLabels[caseRecord.details?.mentorResponse || ""] || "Inte registrerat")}</small>
    </div>
  `;
}

function supportCaseReadiness(caseRecord) {
  const details = caseRecord.details || {};
  const missing = [];
  if (!details.supportPurpose?.trim()) missing.push("stödets syfte");
  if (!details.desiredOutcome?.trim()) missing.push("önskat resultat");
  if (!supportAreaIdsForCase(caseRecord).length) missing.push("stödområde");
  return { ready: missing.length === 0, missing };
}

function renderCaseSecondaryDetails(caseRecord, guided) {
  els.caseSecondarySummary.hidden = !guided;
  if (els.caseSecondaryDetails.dataset.caseId !== caseRecord.id) {
    els.caseSecondaryDetails.open = !guided;
    els.caseSecondaryDetails.dataset.caseId = caseRecord.id;
  } else if (!guided) {
    els.caseSecondaryDetails.open = true;
  }
  els.caseSecondaryDetails.classList.toggle("is-guided", guided);
}

function renderSupportCaseChoices(caseRecord) {
  const readiness = supportCaseReadiness(caseRecord);
  els.caseTransitionStatus.hidden = false;
  els.caseTransitionStatus.textContent = readiness.ready
    ? "Underlaget innehåller syfte, önskat resultat och stödområde. Matchning kan startas."
    : `Komplettera ${readiness.missing.join(", ")} innan matchningen startas.`;
  els.caseTransitionChoices.hidden = caseRecord.status === "closed";
  els.caseTransitionChoices.innerHTML = caseRecord.status === "closed" ? "" : `
    <button type="button" class="btn ${readiness.ready ? "btn-outline-primary" : "btn-primary"}" data-case-flow-action="edit_case">Komplettera stödbehovet</button>
    <button type="button" class="btn ${readiness.ready ? "btn-primary" : "btn-outline-primary"}" data-case-flow-action="start_matching">Starta matchning</button>
    <button type="button" class="btn btn-outline-secondary" data-case-flow-action="close_case">Avsluta stödärendet</button>
  `;
}

function renderMatchingCaseChoices(caseRecord) {
  const linkedAssignment = cases.find((item) => item.sourceMatchingCaseId === caseRecord.id && item.caseTypeId === "mentor-assignment");
  const outcome = matchingOutcome(caseRecord.details?.parentResponse, caseRecord.details?.mentorResponse);
  const parentResponse = matchResponseLabels[caseRecord.details?.parentResponse || ""] || "Inte registrerat";
  const mentorResponse = matchResponseLabels[caseRecord.details?.mentorResponse || ""] || "Inte registrerat";
  els.caseTransitionStatus.hidden = false;
  els.caseTransitionStatus.textContent = linkedAssignment
    ? `Mentoruppdrag ${linkedAssignment.number} har skapats.`
    : outcome === "accepted"
      ? "Båda parter accepterar. Matchningen är redo att bli ett mentoruppdrag."
      : outcome === "declined"
        ? `Matchningen avslutades. Förälder: ${parentResponse}. Mentor: ${mentorResponse}.`
        : `Förälder: ${parentResponse}. Mentor: ${mentorResponse}.`;
  const actions = linkedAssignment
    ? [
        ["open_case", `Öppna ${linkedAssignment.number}`, "btn-primary", linkedAssignment.id],
        ["open_matching_details", "Visa matchningsunderlaget", "btn-outline-primary"],
        ["open_support_case", "Öppna stödärendet", "btn-outline-secondary", caseRecord.supportCaseId]
      ]
    : outcome === "accepted" && caseRecord.status !== "closed"
      ? [
          ["create_assignment", "Skapa mentoruppdrag", "btn-primary"],
          ["open_matching_details", "Ändra parternas svar", "btn-outline-primary"],
          ["close_case", "Avsluta utan uppdrag", "btn-outline-secondary"]
        ]
      : caseRecord.status === "closed"
        ? [
            ["open_matching_details", "Visa beslut och underlag", "btn-primary"],
            ["open_support_case", "Öppna stödärendet", "btn-outline-secondary", caseRecord.supportCaseId]
          ]
        : [
            ["open_matching_details", "Registrera parternas svar", "btn-primary"],
            ["open_activities", "Fortsätt aktiviteterna", "btn-outline-primary"],
            ["close_case", "Avsluta matchningen", "btn-outline-secondary"]
          ];
  els.caseTransitionChoices.hidden = false;
  els.caseTransitionChoices.innerHTML = actions
    .filter(([, , , targetId]) => targetId !== null)
    .map(([action, label, className, targetId = ""]) => `<button type="button" class="btn ${className}" data-case-flow-action="${action}" data-target-id="${escapeHtml(targetId)}">${escapeHtml(label)}</button>`)
    .join("");
}

function renderCertificationCaseChoices(caseRecord) {
  const candidate = caseMentor(caseRecord);
  const activities = activitiesForCase(caseRecord.id);
  const applicable = activities.filter((activity) => activity.status !== "not_applicable");
  const completed = applicable.filter((activity) => activity.status === "completed");
  const attentionActivity = activities.find(activityHasBlockingResult);
  const approval = certificationApprovalAssessment(candidate);
  const projectedCandidate = candidate ? projectMentorWorkflow(candidate) : null;
  const nextAction = projectedCandidate ? nextActionFor(projectedCandidate) : null;
  const nextActivity = attentionActivity
    || activities.find((activity) => activity.templateId === nextAction?.key)
    || activities.find((activity) => !["completed", "not_applicable"].includes(activity.status));
  els.caseTransitionStatus.hidden = false;
  els.caseTransitionStatus.textContent = caseRecord.status === "closed"
    ? `Prövningen är avslutad. ${completed.length} av ${applicable.length} kontroller slutfördes.`
    : attentionActivity
      ? `En avvikelse i ${attentionActivity.title.toLocaleLowerCase("sv-SE")} måste hanteras innan prövningen går vidare.`
      : approval.allowed
        ? "Alla krav är klara. Handläggaren kan fatta beslut om godkännande."
        : `${completed.length} av ${applicable.length} kontroller är klara. Nästa steg: ${nextAction?.label || nextActivity?.title || "granska prövningen"}.`;
  const primary = caseRecord.status === "closed"
    ? ["view_mentor", "Öppna mentorposten", "btn-primary", candidate?.id]
    : nextActivity
      ? ["open_activity", attentionActivity ? "Hantera avvikelsen" : approval.allowed ? "Fatta beslut" : `Fortsätt: ${nextActivity.title}`, "btn-primary", nextActivity.id]
      : ["open_mentor_next", "Granska prövningen", "btn-primary", candidate?.id];
  const actions = [
    primary,
    ["open_activities", "Visa alla kontroller", "btn-outline-primary"],
    ...(caseRecord.status === "closed" ? [] : [["close_case", "Avsluta utan godkännande", "btn-outline-secondary"]])
  ];
  els.caseTransitionChoices.hidden = false;
  els.caseTransitionChoices.innerHTML = actions
    .filter(([, , , targetId]) => targetId !== null)
    .map(([action, label, className, targetId = ""]) => `<button type="button" class="btn ${className}" data-case-flow-action="${action}" data-target-id="${escapeHtml(targetId)}">${escapeHtml(label)}</button>`)
    .join("");
}

function needsAnalysisReadiness(caseRecord) {
  const details = caseRecord.details || {};
  const missing = [];
  if (!caseRecord.description?.trim()) missing.push("behovsbeskrivning");
  if (!details.targetGroup?.trim()) missing.push("målgrupp");
  if (!details.area?.trim()) missing.push("område");
  if (!Number(details.desiredCount)) missing.push("önskat antal mentorer");
  if (!details.desiredDate) missing.push("önskat datum");
  return { ready: missing.length === 0, missing };
}

function renderNeedsAnalysisChoices(caseRecord) {
  const readiness = needsAnalysisReadiness(caseRecord);
  const recruitmentCase = successorCases(caseRecord).find((item) => item.caseTypeId === "recruitment");
  els.caseTransitionStatus.hidden = false;
  els.caseTransitionStatus.textContent = recruitmentCase
    ? `Rekryteringsinsats ${recruitmentCase.number} har skapats från analysen.`
    : readiness.ready
      ? "Analysen innehåller målgrupp, område, omfattning och önskat datum. En rekryteringsinsats kan skapas."
      : `Komplettera ${readiness.missing.join(", ")} innan analysen omsätts i en rekryteringsinsats.`;
  const actions = recruitmentCase
    ? [
        ["open_case", `Öppna ${recruitmentCase.number}`, "btn-primary", recruitmentCase.id],
        ["edit_case", "Uppdatera analysen", "btn-outline-primary"],
        ...(caseRecord.status === "closed" ? [] : [["close_case", "Avsluta analysen", "btn-outline-secondary"]])
      ]
    : caseRecord.status === "closed"
      ? [["expand_secondary", "Visa analysunderlaget", "btn-primary"]]
      : [
          ["edit_case", "Komplettera analysen", readiness.ready ? "btn-outline-primary" : "btn-primary"],
          ["create_successor", "Skapa rekryteringsinsats", readiness.ready ? "btn-primary" : "btn-outline-primary", "recruitment"],
          ["close_case", "Avsluta utan insats", "btn-outline-secondary"]
        ];
  els.caseTransitionChoices.hidden = false;
  els.caseTransitionChoices.innerHTML = actions
    .map(([action, label, className, targetId = ""]) => `<button type="button" class="btn ${className}" data-case-flow-action="${action}" data-target-id="${escapeHtml(targetId)}">${escapeHtml(label)}</button>`)
    .join("");
}

function renderAssignmentCaseChoices(caseRecord) {
  const records = assignmentRecords(caseRecord.id);
  const plan = caseRecord.details?.assignmentPlan || {};
  const planReady = Boolean(plan.startDate && plan.endDate && plan.firstFollowUpDate);
  const followUpCase = successorCases(caseRecord).find((item) => item.caseTypeId === "mentor-follow-up");
  const latestReport = records.reports[0];
  els.caseTransitionStatus.hidden = false;
  els.caseTransitionStatus.textContent = caseRecord.status === "closed"
    ? "Mentoruppdraget är avslutat. Rapporter, avstämningar och ersättningsunderlag finns kvar."
    : latestReport?.needsHandlerSupport
      ? "Den senaste mentorrapporten anger att mentorn behöver stöd från handläggaren."
      : !planReady
        ? "Uppdragsplanen behöver kompletteras innan den löpande uppföljningen börjar."
        : `${records.reports.length} mentorrapporter och ${records.checkIns.length} föräldraavstämningar är registrerade.`;
  const actions = followUpCase
    ? [
        ["open_followup", "Öppna uppföljningen", "btn-primary"],
        ["open_case", `Öppna ${followUpCase.number}`, "btn-outline-primary", followUpCase.id],
        ...(caseRecord.status === "closed" ? [] : [["close_case", "Avsluta uppdraget", "btn-outline-secondary"]])
      ]
    : caseRecord.status === "closed"
      ? [["open_followup", "Visa uppföljningshistoriken", "btn-primary"]]
      : [
          ["open_followup", planReady ? "Registrera uppföljning" : "Komplettera uppdragsplanen", "btn-primary"],
          ["create_successor", "Skapa uppföljningsärende", "btn-outline-primary", "mentor-follow-up"],
          ["close_case", "Avsluta uppdraget", "btn-outline-secondary"]
        ];
  els.caseTransitionChoices.hidden = false;
  els.caseTransitionChoices.innerHTML = actions
    .map(([action, label, className, targetId = ""]) => `<button type="button" class="btn ${className}" data-case-flow-action="${action}" data-target-id="${escapeHtml(targetId)}">${escapeHtml(label)}</button>`)
    .join("");
}

function renderCaseTransitionPanel(caseRecord) {
  const isSupport = caseRecord.caseTypeId === "parent-support";
  const isMatching = caseRecord.caseTypeId === "matching";
  const isCertification = caseRecord.caseTypeId === "mentor-certification";
  const isNeedsAnalysis = caseRecord.caseTypeId === "needs-analysis";
  const isAssignment = caseRecord.caseTypeId === "mentor-assignment";
  els.caseTransitionPanel.hidden = !isSupport && !isMatching && !isCertification && !isNeedsAnalysis && !isAssignment;
  els.caseTransitionStatus.hidden = true;
  els.caseTransitionChoices.hidden = true;
  els.caseTransitionChoices.innerHTML = "";
  els.matchingDetails.hidden = !isMatching;
  if (isMatching && els.matchingDetails.dataset.caseId !== caseRecord.id) {
    els.matchingDetails.open = false;
    els.matchingDetails.dataset.caseId = caseRecord.id;
  }
  els.matchingOutcomeForm.hidden = !isMatching || caseRecord.status === "closed";
  renderMatchingDecisionSummary(caseRecord);
  renderCaseSecondaryDetails(caseRecord, isSupport || isMatching || isCertification || isNeedsAnalysis || isAssignment);
  if (isSupport) {
    els.caseWorkGuidance.hidden = true;
    els.caseTransitionTitle.textContent = "Vad ska hända med stödärendet?";
    els.caseTransitionHelp.textContent = "Välj nästa steg. Uppgifter, aktiviteter och historik finns kvar under Ärendeuppgifter och fler åtgärder.";
    renderSupportCaseChoices(caseRecord);
  }
  if (isMatching) {
    const linkedAssignment = cases.find((item) => item.sourceMatchingCaseId === caseRecord.id && item.caseTypeId === "mentor-assignment");
    const acceptedWithoutAssignment = !linkedAssignment && matchingOutcome(caseRecord.details?.parentResponse, caseRecord.details?.mentorResponse) === "accepted";
    els.caseWorkGuidance.hidden = true;
    els.caseTransitionTitle.textContent = "Vad ska hända med matchningen?";
    els.caseTransitionHelp.textContent = "Välj nästa steg. Underlag och separata svar från båda parter finns kvar under den utfällbara rubriken.";
    els.matchingOutcomeForm.hidden = Boolean(linkedAssignment) || caseRecord.status === "closed";
    els.matchingProposalInput.value = caseRecord.details?.matchingProposal || "";
    els.parentMatchResponseInput.value = caseRecord.details?.parentResponse || "";
    els.mentorMatchResponseInput.value = caseRecord.details?.mentorResponse || "";
    els.matchingOutcomeNoteInput.value = caseRecord.details?.matchingNote || "";
    els.createAssignmentAfterMatchInput.checked = true;
    els.matchingOutcomeSubmitButton.textContent = acceptedWithoutAssignment ? "Skapa mentoruppdrag" : "Spara matchningsunderlag";
    renderMatchingCaseChoices(caseRecord);
  }
  if (isCertification) {
    els.caseWorkGuidance.hidden = true;
    els.caseTransitionTitle.textContent = "Vad är nästa steg i mentorprövningen?";
    els.caseTransitionHelp.textContent = "Arbeta med nästa kontroll eller avvikelse. Hela kontrollkedjan, underlaget och loggen finns kvar i sina flikar.";
    renderCertificationCaseChoices(caseRecord);
  }
  if (isNeedsAnalysis) {
    els.caseWorkGuidance.hidden = true;
    els.caseTransitionTitle.textContent = "Vad ska hända med behovsanalysen?";
    els.caseTransitionHelp.textContent = "Komplettera analysen, skapa en rekryteringsinsats eller avsluta. Analysunderlaget förs vidare när en insats skapas.";
    renderNeedsAnalysisChoices(caseRecord);
  }
  if (isAssignment) {
    els.caseWorkGuidance.hidden = true;
    els.caseTransitionTitle.textContent = "Vad ska hända med mentoruppdraget?";
    els.caseTransitionHelp.textContent = "Öppna den löpande uppföljningen, skapa ett separat uppföljningsärende vid behov eller avsluta uppdraget.";
    renderAssignmentCaseChoices(caseRecord);
  }
}

const contactModeLabels = { physical: "Fysiskt möte", digital: "Digitalt möte", phone: "Telefon", message: "Meddelande", mixed: "Blandat" };
const reportOutcomeLabels = { completed: "Genomförd", cancelled: "Inställd", no_show: "Uteblev" };
const parentConfirmationLabels = { yes: "Ja", partly: "Delvis", no: "Nej" };
const collaborationLabels = { well: "Fungerar", issues: "Behöver justeras", not_started: "Inte kommit igång" };
const relevanceLabels = { yes: "Relevant", partly: "Delvis relevant", no: "Inte relevant" };
const safetyLabels = { yes: "Trygg", concern: "Oro finns" };
const continueLabels = { continue: "Fortsätt enligt plan", change: "Ändra uppdraget", pause: "Pausa", end: "Avsluta" };
const compensationStatusLabels = {
  awaiting_reports: "Väntar på mentorrapport",
  awaiting_parent_checkin: "Väntar på föräldraavstämning",
  under_review: "Redo för granskning",
  needs_completion: "Kräver komplettering",
  approved: "Godkänd för ersättning",
  paid: "Utbetald"
};

function assignmentRecords(caseId) {
  return {
    reports: mentorReports.filter((item) => item.caseId === caseId).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
    checkIns: parentCheckIns.filter((item) => item.caseId === caseId).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
    periods: compensationPeriods.filter((item) => item.caseId === caseId).sort((a, b) => b.periodFrom.localeCompare(a.periodFrom))
  };
}

function recordsInPeriod(records, period, dateField = "occurredOn") {
  return records.filter((item) => item[dateField] >= period.periodFrom && item[dateField] <= period.periodTo);
}

function compensationEvidence(period) {
  const reports = recordsInPeriod(mentorReports.filter((item) => item.caseId === period.caseId && item.outcome === "completed"), period);
  const checkIns = recordsInPeriod(parentCheckIns.filter((item) => item.caseId === period.caseId), period);
  const latestCheckIn = [...checkIns].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0] || null;
  const minutes = reports.reduce((sum, report) => sum + Number(report.durationMinutes || 0), 0);
  return { reports, checkIns, latestCheckIn, minutes };
}

function effectiveCompensationStatus(period) {
  if (["approved", "paid", "needs_completion"].includes(period.status)) return period.status;
  const evidence = compensationEvidence(period);
  return compensationReadiness({ completedReportCount: evidence.reports.length, latestCheckIn: evidence.latestCheckIn });
}

function renderCompensationReadinessChecklist(caseRecord, records) {
  if (!els.compensationReadinessChecklist) return;
  const { reports, checkIns, periods } = records;
  const latestPeriod = periods[0] || null;
  const latestEvidence = latestPeriod ? compensationEvidence(latestPeriod) : null;
  const plan = caseRecord.details?.assignmentPlan || {};
  const safeCheckIn = latestEvidence?.latestCheckIn?.contactConfirmed === "yes" && latestEvidence.latestCheckIn.safety === "yes";
  const checklist = [
    { label: "Uppdragsplan fastställd", done: Boolean(plan.startDate && plan.endDate && plan.firstFollowUpDate), help: "Ange start, slutdatum och första avstämning." },
    { label: "Genomförd mentorrapport finns", done: latestPeriod ? latestEvidence.reports.length > 0 : reports.some((report) => report.outcome === "completed"), help: "Spara minst en genomförd rapport i perioden." },
    { label: "Föräldraavstämning finns", done: latestPeriod ? Boolean(latestEvidence.latestCheckIn) : checkIns.length > 0, help: "Stäm av kontakt och fortsatt läge med föräldern." },
    { label: "Trygg kontakt bekräftad", done: safeCheckIn || (!latestPeriod && checkIns.some((checkIn) => checkIn.contactConfirmed === "yes" && checkIn.safety === "yes")), help: "Avstämningen ska bekräfta genomförd och trygg kontakt." },
    { label: "Ersättningsperiod skapad", done: Boolean(latestPeriod), help: "Skapa perioden som ska granskas och beslutas." }
  ];
  const status = latestPeriod ? effectiveCompensationStatus(latestPeriod) : "awaiting_reports";
  els.compensationReadinessChecklist.innerHTML = `
    <div class="compensation-readiness-header">
      <div><strong>Saknas för ersättning</strong><p class="small text-secondary mb-0">${latestPeriod ? `Senaste period: ${formatDate(latestPeriod.periodFrom)}-${formatDate(latestPeriod.periodTo)}` : "Ingen ersättningsperiod är skapad ännu."}</p></div>
      <span class="badge text-bg-${["approved", "paid"].includes(status) ? "success" : status === "needs_completion" ? "warning" : "secondary"}">${escapeHtml(compensationStatusLabels[status] || "Ej påbörjad")}</span>
    </div>
    <ul>${checklist.map((item) => `<li class="${item.done ? "is-done" : "is-missing"}"><span aria-hidden="true">${item.done ? "✓" : "!"}</span><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.done ? "Klart" : item.help)}</small></div></li>`).join("")}</ul>
  `;
}

function renderCompensationNextSteps(caseRecord, records) {
  const latestPeriod = records.periods[0] || null;
  const status = latestPeriod ? effectiveCompensationStatus(latestPeriod) : "not_started";
  const evidence = latestPeriod ? compensationEvidence(latestPeriod) : null;
  if (els.compensationDetails.dataset.caseId !== caseRecord.id) {
    els.compensationDetails.open = false;
    els.compensationDetails.dataset.caseId = caseRecord.id;
  }
  let message = "Skapa en ersättningsperiod när mentorrapport och föräldraavstämning ska sammanställas.";
  let primaryAction = ["new_period", "Skapa ersättningsperiod", "btn-primary", ""];
  if (status === "awaiting_reports") {
    message = `Perioden ${formatDate(latestPeriod.periodFrom)}-${formatDate(latestPeriod.periodTo)} saknar en genomförd mentorrapport.`;
    primaryAction = ["new_report", "Registrera mentorrapport", "btn-primary", ""];
  } else if (status === "awaiting_parent_checkin") {
    message = `Perioden ${formatDate(latestPeriod.periodFrom)}-${formatDate(latestPeriod.periodTo)} saknar en föräldraavstämning.`;
    primaryAction = ["new_checkin", "Registrera föräldraavstämning", "btn-primary", ""];
  } else if (status === "under_review") {
    message = `${evidence.reports.length} rapporter och ${formatMinutes(evidence.minutes)} är redo att granskas för ersättning.`;
    primaryAction = ["approve_period", "Godkänn ersättningsperiod", "btn-primary", latestPeriod.id];
  } else if (status === "needs_completion") {
    const assessment = assessCompensationApproval({ completedReportCount: evidence.reports.length, latestCheckIn: evidence.latestCheckIn });
    const needsReport = evidence.reports.length < 1;
    message = assessment.reasons.join(" ") || "Kompletteringen är registrerad. Perioden kan granskas på nytt.";
    primaryAction = needsReport
      ? ["new_report", "Komplettera med mentorrapport", "btn-primary", ""]
      : assessment.reasons.length
        ? ["new_checkin", "Komplettera med föräldraavstämning", "btn-primary", ""]
        : ["approve_period", "Godkänn ersättningsperiod", "btn-primary", latestPeriod.id];
  } else if (status === "approved") {
    message = `Perioden ${formatDate(latestPeriod.periodFrom)}-${formatDate(latestPeriod.periodTo)} är godkänd och väntar på registrerad utbetalning.`;
    primaryAction = ["mark_paid", "Markera som utbetald", "btn-primary", latestPeriod.id];
  } else if (status === "paid") {
    message = `Perioden ${formatDate(latestPeriod.periodFrom)}-${formatDate(latestPeriod.periodTo)} är utbetald.`;
    primaryAction = ["new_period", "Skapa nästa period", "btn-primary", ""];
  }
  els.compensationNextStepStatus.textContent = message;
  const actions = [primaryAction, ["open_details", "Visa underlag och historik", "btn-outline-secondary", ""]];
  els.compensationNextStepActions.innerHTML = actions
    .map(([action, label, className, targetId]) => `<button type="button" class="btn ${className}" data-compensation-next-action="${action}" data-target-id="${escapeHtml(targetId)}">${escapeHtml(label)}</button>`)
    .join("");
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}

function renderAssignmentNextSteps(caseRecord, records) {
  const plan = caseRecord.details?.assignmentPlan || {};
  const planReady = Boolean(plan.startDate && plan.endDate && plan.firstFollowUpDate);
  const latestReport = records.reports[0];
  const followUpCase = successorCases(caseRecord).find((item) => item.caseTypeId === "mentor-follow-up");
  if (els.assignmentFollowupDetails.dataset.caseId !== caseRecord.id) {
    els.assignmentFollowupDetails.open = false;
    els.assignmentFollowupDetails.dataset.caseId = caseRecord.id;
  }
  els.assignmentNextStepStatus.textContent = caseRecord.status === "closed"
    ? "Uppdraget är avslutat. Underlagen är låsta men finns kvar för granskning."
    : latestReport?.needsHandlerSupport
      ? "Mentorn har efterfrågat stöd. Registrera handläggarens fortsatta uppföljning."
      : !planReady
        ? "Börja med att komplettera uppdragsplanen."
        : "Registrera nästa mentorrapport och föräldraavstämning när kontakterna har genomförts.";
  const actions = caseRecord.status === "closed"
    ? [["expand_history", "Visa uppföljningshistoriken", "btn-primary"]]
    : [
        [planReady ? "new_report" : "open_plan", planReady ? "Registrera mentorrapport" : "Komplettera uppdragsplanen", "btn-primary"],
        ["new_checkin", "Registrera föräldraavstämning", "btn-outline-primary"],
        followUpCase
          ? ["open_case", `Öppna ${followUpCase.number}`, "btn-outline-secondary", followUpCase.id]
          : ["create_followup", "Skapa uppföljningsärende", "btn-outline-secondary", "mentor-follow-up"]
      ];
  els.assignmentNextStepActions.innerHTML = actions
    .map(([action, label, className, targetId = ""]) => `<button type="button" class="btn ${className}" data-assignment-followup-action="${action}" data-target-id="${escapeHtml(targetId)}">${escapeHtml(label)}</button>`)
    .join("");
}

function renderAssignmentFollowup(caseRecord) {
  const isAssignment = caseRecord.caseTypeId === "mentor-assignment";
  els.assignmentFollowupTabItem.hidden = !isAssignment;
  if (!isAssignment) {
    if (document.querySelector("#assignment-followup-tab")?.classList.contains("active")) {
      requestAnimationFrame(() => bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-overview-tab")).show());
    }
    return;
  }

  const { reports, checkIns, periods } = assignmentRecords(caseRecord.id);
  els.assignmentFollowupCount.textContent = reports.length + checkIns.length + periods.length;
  renderAssignmentNextSteps(caseRecord, { reports, checkIns, periods });
  renderCompensationNextSteps(caseRecord, { reports, checkIns, periods });
  renderCompensationReadinessChecklist(caseRecord, { reports, checkIns, periods });
  const plan = caseRecord.details?.assignmentPlan || {};
  const planKey = `${caseRecord.id}-${caseRecord.updatedAt}`;
  if (els.assignmentPlanForm.dataset.caseKey !== planKey) {
    els.assignmentStartDateInput.value = plan.startDate || "";
    els.assignmentEndDateInput.value = plan.endDate || "";
    els.assignmentContactFrequencyInput.value = plan.contactFrequency || "weekly";
    els.assignmentContactModeInput.value = plan.contactMode || "physical";
    els.assignmentFirstFollowUpInput.value = plan.firstFollowUpDate || "";
    els.assignmentFollowUpFrequencyInput.value = plan.followUpFrequency || "monthly";
    els.assignmentReportDeadlineInput.value = plan.reportDeadlineDays ?? 3;
    els.assignmentPlanNoteInput.value = plan.note || "";
    els.assignmentPlanForm.dataset.caseKey = planKey;
  }
  els.assignmentPlanStatus.textContent = plan.updatedAt
    ? `Senast ändrad ${formatDateTime(plan.updatedAt)} av ${handlerNameById(plan.updatedBy)}`
    : "Planen behöver fastställas innan uppdragets återkommande kontakter börjar.";

  els.mentorReportsEmpty.hidden = reports.length > 0;
  els.mentorReportsTableWrap.hidden = reports.length === 0;
  els.mentorReportsTableBody.innerHTML = reports.map((report) => {
    const mentor = candidates.find((candidate) => candidate.id === report.reportedByMentorId);
    return `<tr><td>${escapeHtml(formatDate(report.occurredOn))}</td><td>${escapeHtml(contactModeLabels[report.mode] || report.mode)}</td><td>${escapeHtml(formatMinutes(report.durationMinutes))}</td><td>${escapeHtml(reportOutcomeLabels[report.outcome] || report.outcome)}${report.needsHandlerSupport ? '<span class="d-block text-danger small">Kontakt med handläggare behövs</span>' : ""}</td><td>${escapeHtml(report.summary)}</td><td>${escapeHtml(mentor?.name || "Mentorn")}<span class="d-block text-secondary small">Registrerad av ${escapeHtml(actorNameById(report.recordedBy || report.createdBy))}</span></td></tr>`;
  }).join("");

  els.parentCheckInsEmpty.hidden = checkIns.length > 0;
  els.parentCheckInsTableWrap.hidden = checkIns.length === 0;
  els.parentCheckInsTableBody.innerHTML = checkIns.map((checkIn) => `<tr><td>${escapeHtml(formatDate(checkIn.occurredOn))}</td><td>${escapeHtml(parentConfirmationLabels[checkIn.contactConfirmed] || checkIn.contactConfirmed)}</td><td>${escapeHtml(collaborationLabels[checkIn.collaboration] || checkIn.collaboration)}</td><td>${escapeHtml(relevanceLabels[checkIn.relevance] || checkIn.relevance)}</td><td>${escapeHtml(safetyLabels[checkIn.safety] || checkIn.safety)}</td><td>${escapeHtml(continueLabels[checkIn.continueStatus] || checkIn.continueStatus)}</td><td>${escapeHtml(handlerNameById(checkIn.createdBy))}</td></tr>`).join("");

  els.compensationPeriodsEmpty.hidden = periods.length > 0;
  els.compensationPeriodsTableWrap.hidden = periods.length === 0;
  els.compensationPeriodsTableBody.innerHTML = periods.map((period) => {
    const evidence = compensationEvidence(period);
    const status = effectiveCompensationStatus(period);
    const frozen = ["approved", "paid"].includes(status);
    const approvedCheckIn = frozen && period.approvedCheckInId ? checkIns.find((item) => item.id === period.approvedCheckInId) : null;
    const displayedCheckIn = approvedCheckIn || evidence.latestCheckIn;
    const reportCount = frozen && Array.isArray(period.approvedReportIds) ? period.approvedReportIds.length : evidence.reports.length;
    const minutes = frozen && Number.isFinite(Number(period.approvedMinutes)) ? Number(period.approvedMinutes) : evidence.minutes;
    const checkInText = displayedCheckIn ? `${formatDate(displayedCheckIn.occurredOn)} · ${parentConfirmationLabels[displayedCheckIn.contactConfirmed]}` : "Saknas";
    let actions = "";
    if (["under_review", "needs_completion"].includes(status)) actions = `<div class="d-flex flex-wrap justify-content-end gap-1"><button type="button" class="btn btn-outline-secondary btn-sm" data-compensation-complete="${escapeHtml(period.id)}">Begär komplettering</button><button type="button" class="btn btn-primary btn-sm" data-compensation-approve="${escapeHtml(period.id)}">Godkänn</button></div>`;
    if (status === "approved") actions = `<button type="button" class="btn btn-outline-primary btn-sm" data-compensation-paid="${escapeHtml(period.id)}">Markera utbetald</button>`;
    return `<tr><td>${escapeHtml(formatDate(period.periodFrom))}–${escapeHtml(formatDate(period.periodTo))}</td><td>${reportCount} st</td><td>${escapeHtml(formatMinutes(minutes))}</td><td>${escapeHtml(checkInText)}</td><td><span class="badge text-bg-${["approved", "paid"].includes(status) ? "success" : status === "needs_completion" ? "warning" : "secondary"}">${escapeHtml(compensationStatusLabels[status])}</span></td><td class="text-end">${actions}</td></tr>`;
  }).join("");
}

function availableCaseTypesForForm({ mentorId = "", caseRecord = null, parentId = "", supportCaseId = "" } = {}) {
  if (caseRecord) return caseTypeDefinitions;
  if (supportCaseId) return caseTypeDefinitions.filter((definition) => definition.creationMode === "support_case");
  if (parentId) return caseTypeDefinitions.filter((definition) => definition.id === "parent-support");
  if (mentorId) {
    return caseTypeDefinitions.filter((definition) => definition.creationMode === "mentor_context"
      || (definition.creationMode === "manual" && definition.mentorMode !== "none" && definition.parentMode !== "required"));
  }
  return caseTypeDefinitions.filter((definition) => definition.creationMode === "manual");
}

function populateCaseTypeOptions(context) {
  const selectedValue = context.caseRecord?.caseTypeId || els.caseTypeInput.value || newCaseTypePreset;
  const definitions = availableCaseTypesForForm(context);
  els.caseTypeInput.innerHTML = '<option value="">Välj ärendetyp</option>';
  for (const definition of definitions) {
    const option = document.createElement("option");
    option.value = definition.id;
    option.textContent = definition.name;
    option.selected = definition.id === selectedValue;
    els.caseTypeInput.append(option);
  }
}

function currentCaseCreationContext() {
  const route = selectedCaseRecordId || "";
  return {
    mentorId: route.startsWith("new-") && !route.startsWith("new-parent-") && !route.startsWith("new-support-") ? route.slice(4) : "",
    supportCaseId: route.startsWith("new-support-") ? route.slice("new-support-".length) : "",
    acceptedMatchingCaseId: ""
  };
}

function populateCaseForm(mentorId = "", caseRecord = null, parentId = "", supportCaseId = "") {
  populateCaseTypeOptions({ mentorId, caseRecord, parentId, supportCaseId });
  const currentOwnerId = responsibleHandler(caseRecord)?.id || CURRENT_USER_ID;
  const currentCoHandlerIds = new Set(coHandlers(caseRecord).map((handler) => handler.id));
  const selectedMentor = candidates.find((candidate) => candidate.id === mentorId);
  els.caseMentorInput.value = selectedMentor?.name || "";
  els.caseMentorIdInput.value = selectedMentor?.id || "";
  els.caseMentorSuggestions.hidden = true;
  els.caseMentorSuggestions.innerHTML = "";
  const selectedParent = parents.find((parent) => parent.id === (parentId || caseRecord?.parentId));
  els.caseParentInput.value = selectedParent?.name || "";
  els.caseParentIdInput.value = selectedParent?.id || "";
  els.caseParentSuggestions.hidden = true;
  els.caseParentSuggestions.innerHTML = "";
  els.caseSupportCaseInput.innerHTML = '<option value="">Välj stödärende</option>';
  for (const supportCase of cases.filter((item) => item.caseTypeId === "parent-support" && item.status !== "closed")) {
    const parent = caseParent(supportCase);
    const option = document.createElement("option");
    option.value = supportCase.id;
    option.textContent = `${supportCase.number} · ${parent?.name || "Okänd förälder"} · ${supportCase.details?.supportPurpose || supportCase.title}`;
    option.selected = supportCase.id === (supportCaseId || caseRecord?.supportCaseId);
    els.caseSupportCaseInput.append(option);
  }
  els.caseOrganizationUnitInput.value = caseRecord?.organizationUnitId || DEFAULT_ORGANIZATION_UNIT_ID;

  els.caseOwnerInput.innerHTML = '<option value="">Välj ansvarig</option>';
  els.caseCoHandlerInputs.innerHTML = "";
  for (const handler of handlers.filter((item) => item.active)) {
    const ownerOption = document.createElement("option");
    ownerOption.value = handler.id;
    ownerOption.textContent = handler.name;
    ownerOption.selected = handler.id === currentOwnerId;
    els.caseOwnerInput.append(ownerOption);

    const label = document.createElement("label");
    label.className = "form-check";
    label.innerHTML = `<input class="form-check-input" type="checkbox" name="coHandler" value="${escapeHtml(handler.id)}" ${currentCoHandlerIds.has(handler.id) ? "checked" : ""}><span class="form-check-label">${escapeHtml(handler.name)}</span>`;
    els.caseCoHandlerInputs.append(label);
  }
}

function renderCaseDetail() {
  const creating = currentView === "case" && selectedCaseRecordId?.startsWith("new");
  const caseRecord = selectedCaseRecord();
  els.caseDetailEmpty.hidden = creating || Boolean(caseRecord);
  els.caseDetail.hidden = !creating && !caseRecord;
  if (!creating && !caseRecord) return;

  els.caseCreateForm.hidden = !creating && !caseEditMode;
  els.caseReadView.hidden = creating || caseEditMode;
  for (const element of document.querySelectorAll(".case-advanced-field")) element.hidden = creating && !caseEditMode;
  els.newCaseActivityButton.hidden = creating || caseEditMode || Boolean(selectedCaseActivityId);
  els.editCaseButton.hidden = creating || caseEditMode;
  els.saveCaseButton.textContent = creating ? "Spara registrering" : "Spara ändringar";
  els.caseTypeInput.disabled = !creating;

  if (creating) {
    els.assignmentFollowupTabItem.hidden = true;
    const mentorId = selectedCaseRecordId.startsWith("new-") && !selectedCaseRecordId.startsWith("new-parent-") && !selectedCaseRecordId.startsWith("new-support-") ? selectedCaseRecordId.slice(4) : "";
    const parentId = selectedCaseRecordId.startsWith("new-parent-") ? selectedCaseRecordId.slice("new-parent-".length) : "";
    const supportCaseId = selectedCaseRecordId.startsWith("new-support-") ? selectedCaseRecordId.slice("new-support-".length) : "";
    const supportCase = cases.find((item) => item.id === supportCaseId);
    els.selectedCaseType.textContent = "Ny registrering";
    els.selectedCaseNumber.textContent = "Ärendenummer skapas när ärendet sparas";
    els.selectedCaseTitle.textContent = supportCase ? `Ny matchning för ${supportCase.number}` : parentId ? `Nytt stödärende för ${parents.find((parent) => parent.id === parentId)?.name || "förälder"}` : mentorId ? `Ny registrering för ${candidates.find((candidate) => candidate.id === mentorId)?.name || "mentor"}` : "Ny registrering";
    els.selectedCaseStatus.textContent = "Nytt";
    els.selectedCaseStatus.className = caseStatusBadge("new");
    els.selectedCaseMentor.textContent = mentorId ? candidates.find((candidate) => candidate.id === mentorId)?.name || "Saknas" : "Ej personanknutet";
    els.selectedCaseParent.textContent = supportCase ? caseParent(supportCase)?.name || "Saknas" : parentId ? parents.find((parent) => parent.id === parentId)?.name || "Saknas" : "Ej personanknutet";
    els.selectedCaseSupportCase.textContent = supportCase?.number || "Ej kopplat";
    els.selectedCaseOwner.textContent = currentUserName();
    els.selectedCaseUpdated.textContent = "Inte sparat";
    if (els.caseCreateForm.dataset.route !== selectedCaseRecordId) {
      els.caseCreateForm.reset();
      clearCaseFormError();
      populateCaseForm(mentorId, null, parentId || supportCase?.parentId || "", supportCaseId);
      if (newCaseTypePreset) els.caseTypeInput.value = newCaseTypePreset;
      if (supportCaseId) els.caseTypeInput.value = "matching";
      if (parentId) els.caseTypeInput.value = "parent-support";
      renderCaseTypeGuidance();
      if (selectedCaseRecordId === "new" && pendingIncomingContactId) {
        prefillCaseFromIncomingContact(incomingContactById(pendingIncomingContactId));
      }
      if (selectedCaseRecordId === "new" && pendingSourceCaseId) {
        prefillCaseFromSourceCase(cases.find((item) => item.id === pendingSourceCaseId));
      }
      els.caseCreateForm.dataset.route = selectedCaseRecordId;
    }
    return;
  }

  const mentor = caseMentor(caseRecord);
  const parent = caseParent(caseRecord);
  const supportCase = caseSupportCase(caseRecord);
  const owner = responsibleHandler(caseRecord);
  const caseCoHandlers = coHandlers(caseRecord);
  const activities = activitiesForCase(caseRecord.id);
  const documents = currentCaseDocuments().filter((document) => document.caseId === caseRecord.id);
  const meetingsForCase = caseMeetings.filter((meeting) => meeting.caseId === caseRecord.id);
  const events = caseEvents.filter((item) => item.caseId === caseRecord.id);
  if (selectedCaseActivityId && !activities.some((activity) => activity.id === selectedCaseActivityId)) {
    selectedCaseActivityId = null;
  }
  els.newCaseActivityButton.hidden = caseEditMode || Boolean(selectedCaseActivityId);

  els.selectedCaseType.textContent = caseRecord.type;
  els.selectedCaseNumber.textContent = caseRecord.number;
  els.selectedCaseTitle.textContent = caseRecord.title;
  els.selectedCaseStatus.textContent = caseStatusLabel(caseRecord.status);
  els.selectedCaseStatus.className = caseStatusBadge(caseRecord.status);
  els.selectedCaseMentor.innerHTML = mentor ? `<a href="#/mentor/${escapeHtml(mentor.id)}">${escapeHtml(mentor.name)}</a>` : "Ej personanknutet";
  els.selectedCaseParent.innerHTML = parent ? `<a href="#/parent/${escapeHtml(parent.id)}">${escapeHtml(parent.name)}</a>` : "Ej personanknutet";
  els.selectedCaseSupportCase.innerHTML = supportCase ? `<a href="#/case/${escapeHtml(supportCase.id)}">${escapeHtml(supportCase.number)}</a>` : "Ej kopplat";
  els.selectedCaseOwner.textContent = owner?.name || "Ej tilldelad";
  els.selectedCaseUpdated.textContent = formatDateTime(caseRecord.updatedAt);
  els.caseStatusFact.textContent = caseStatusLabel(caseRecord.status);
  els.casePriorityFact.textContent = ({ high: "Hög", normal: "Normal", low: "Låg" })[caseRecord.priority] || "Normal";
  els.caseDueDateFact.textContent = caseRecord.dueDate ? formatDate(caseRecord.dueDate) : "Ej angivet";
  els.caseDescriptionFact.textContent = caseRecord.description || "Ingen beskrivning";
  els.caseOwnerFact.textContent = owner?.name || "Ej tilldelad";
  els.caseOrganizationUnitFact.textContent = organizationUnitLabel(caseRecord.organizationUnitId);
  els.caseCoHandlersFact.textContent = caseCoHandlers.length ? caseCoHandlers.map((handler) => handler.name).join(", ") : "Inga";
  els.caseMentorFact.innerHTML = mentor ? `<a href="#/mentor/${escapeHtml(mentor.id)}">${escapeHtml(mentor.name)}</a>` : "Ej personanknutet";
  els.caseParentFact.innerHTML = parent ? `<a href="#/parent/${escapeHtml(parent.id)}">${escapeHtml(parent.name)}</a>` : "Ej personanknutet";
  els.caseSupportCaseFact.innerHTML = supportCase ? `<a href="#/case/${escapeHtml(supportCase.id)}">${escapeHtml(supportCase.number)} · ${escapeHtml(supportCase.details?.supportPurpose || supportCase.title)}</a>` : "Ej kopplat";
  els.caseCreatedFact.textContent = `${formatDateTime(caseRecord.createdAt)} av ${handlerNameById(caseRecord.createdBy)}`;
  renderCaseClosureSummary(caseRecord);
  const caseGuidance = caseTypeById(caseRecord.caseTypeId)?.workInstruction?.trim() || "";
  els.caseWorkGuidance.hidden = !caseGuidance;
  els.caseWorkGuidanceText.textContent = caseGuidance;
  renderCaseTypeDetails(caseRecord);
  renderCaseTransitionPanel(caseRecord);
  renderAssignmentFollowup(caseRecord);
  els.caseActivityCount.textContent = activities.length;
  els.caseDocumentCount.textContent = documents.length;
  els.caseMeetingCount.textContent = meetingsForCase.filter((meeting) => !meeting.supersededByMeetingId).length;
  els.caseEventCount.textContent = events.length;

  renderCaseActivities(caseRecord, activities);
  renderCaseDocuments(documents);
  renderCaseMeetings(caseRecord, meetingsForCase);
  renderCaseEvents(events);
  renderActivityDetail(caseRecord);
  if (selectedCaseActivityId) {
    requestAnimationFrame(() => bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-activities-tab")).show());
  }
  if (pendingCaseMeetingsId === caseRecord.id) {
    pendingCaseMeetingsId = null;
    requestAnimationFrame(() => bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-meetings-tab")).show());
  }

  if (caseEditMode && els.caseCreateForm.dataset.route !== `edit-${caseRecord.id}-${caseRecord.updatedAt}`) {
    els.caseCreateForm.reset();
    clearCaseFormError();
    populateCaseForm(caseRecord.mentorId, caseRecord, caseRecord.parentId, caseRecord.supportCaseId);
    els.caseTypeInput.value = caseRecord.caseTypeId;
    els.caseTitleInput.value = caseRecord.title;
    els.casePriorityInput.value = caseRecord.priority || "normal";
    els.caseDueDateInput.value = caseRecord.dueDate || "";
    els.caseDescriptionInput.value = caseRecord.description || "";
    renderCaseTypeGuidance(caseRecord);
    els.caseCreateForm.dataset.route = `edit-${caseRecord.id}-${caseRecord.updatedAt}`;
  }
  els.pauseCaseAction.hidden = ["paused", "closed"].includes(caseRecord.status);
  els.resumeCaseAction.hidden = caseRecord.status !== "paused";
  els.closeCaseAction.hidden = caseRecord.status === "closed";
  els.reopenCaseAction.hidden = caseRecord.status !== "closed";
  els.editCaseAction.hidden = caseRecord.status === "closed";
}

function activityCompletionDecision(caseRecord) {
  const linkedCases = successorCases(caseRecord);
  if (linkedCases.length) {
    const linkedCase = linkedCases[0];
    return {
      primaryLabel: `Öppna ${linkedCase.number}`,
      primaryAction: "open_case",
      targetId: linkedCase.id,
      nextText: `Det finns redan ett länkat följdärende (${linkedCase.type}). Granska det innan det aktuella ärendet avslutas.`
    };
  }
  if (caseRecord.caseTypeId === "parent-support") {
    return {
      primaryLabel: "Starta matchning",
      primaryAction: "start_matching",
      nextText: "Starta en matchning om föräldern vill gå vidare. Avsluta i stället stödärendet om behovet inte längre ska handläggas."
    };
  }
  if (caseRecord.caseTypeId === "matching") {
    return {
      primaryLabel: "Registrera parternas svar",
      primaryAction: "review_overview",
      nextText: "Registrera förälderns och mentorns svar. Ett mentoruppdrag skapas bara efter ett uttryckligt val när båda accepterar."
    };
  }
  if (caseRecord.caseTypeId === "mentor-assignment") {
    return {
      primaryLabel: "Granska uppdraget",
      primaryAction: "review_overview",
      nextText: "Granska rapporter, uppföljning och ersättningsunderlag. Avsluta därefter uppdraget uttryckligen om handläggningen är klar."
    };
  }
  const nextTypeId = caseTypeById(caseRecord.caseTypeId)?.nextCaseTypeId || "";
  if (nextTypeId) {
    return {
      primaryLabel: `Registrera ${caseTypeRelationshipName(nextTypeId).toLocaleLowerCase("sv-SE")}`,
      primaryAction: "create_next_case",
      targetId: nextTypeId,
      nextText: `Ta ställning till om ${caseTypeRelationshipName(nextTypeId).toLocaleLowerCase("sv-SE")} ska registreras. Det sker inte automatiskt.`
    };
  }
  return {
    primaryLabel: "Granska ärendet",
    primaryAction: "review_overview",
    nextText: "Granska ärendets uppgifter och avsluta ärendet uttryckligen om handläggningen är klar."
  };
}

function renderActivityCompletionDecision(caseRecord, applicableActivities, openActivities, attentionActivities) {
  const ready = caseRecord.status !== "closed"
    && caseRecord.status !== "paused"
    && applicableActivities.length > 0
    && openActivities.length === 0
    && attentionActivities.length === 0;
  els.activityCaseReadyNotice.hidden = !ready;
  if (!ready) return;
  const decision = activityCompletionDecision(caseRecord);
  els.activityCaseReadyTitle.textContent = "Alla aktiviteter är klara – ärendet är fortfarande öppet";
  els.activityCaseReadyText.textContent = "Aktivitetsresultaten, tidpunkterna och registrerande användare har sparats i ärendet och dess logg. Inget följdärende skapades och ingen person- eller mentorpost ändrades när den sista aktiviteten avslutades.";
  els.activityCaseReadyNextText.innerHTML = `<strong>Nästa steg:</strong> ${escapeHtml(decision.nextText)}`;
  els.activityCaseReadyPrimaryButton.textContent = decision.primaryLabel;
  els.activityCaseReadyPrimaryButton.dataset.action = decision.primaryAction;
  els.activityCaseReadyPrimaryButton.dataset.targetId = decision.targetId || "";
}

function renderCaseActivities(caseRecord, activities) {
  els.caseActivityTableBody.innerHTML = "";
  const applicableActivities = activities.filter((activity) => activity.status !== "not_applicable");
  const completedActivities = applicableActivities.filter((activity) => activity.status === "completed");
  const openActivities = applicableActivities.filter((activity) => activity.status !== "completed");
  const attentionActivities = activities.filter(activityHasBlockingResult);
  renderActivityCompletionDecision(caseRecord, applicableActivities, openActivities, attentionActivities);
  const progress = applicableActivities.length
    ? Math.round((completedActivities.length / applicableActivities.length) * 100)
    : 0;
  els.activityProgressText.textContent = `${completedActivities.length} av ${applicableActivities.length} avslutade`;
  els.activityProgressBar.style.width = `${progress}%`;
  els.activityProgressBar.parentElement.setAttribute("aria-valuenow", String(progress));
  els.activityProgressBar.parentElement.setAttribute("aria-valuetext", els.activityProgressText.textContent);
  els.activityOpenCount.textContent = String(openActivities.length);
  els.activityAttentionCount.textContent = String(attentionActivities.length);
  els.activityAttentionCount.parentElement.classList.toggle("has-attention", attentionActivities.length > 0);

  for (const button of els.activityFilterButtons) {
    const active = button.dataset.activityFilter === activityListFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  const visibleActivities = activities.filter((activity) => {
    if (activityListFilter === "open") return !["completed", "not_applicable"].includes(activity.status);
    if (activityListFilter === "attention") return activityHasBlockingResult(activity);
    if (activityListFilter === "done") return ["completed", "not_applicable"].includes(activity.status);
    return true;
  });
  els.activityFilteredCount.textContent = activityListFilter === "all"
    ? `${activities.length} aktiviteter`
    : `${visibleActivities.length} av ${activities.length} visas`;

  if (!visibleActivities.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="activity-empty">${activities.length ? "Inga aktiviteter matchar filtret." : "Inga aktiviteter har registrerats."}</td>`;
    els.caseActivityTableBody.append(row);
  }

  const assignedHandlerIds = new Set(assignmentsForCase(caseRecord.id).map((assignment) => assignment.handlerId));
  const availableHandlers = handlers.filter((handler) => handler.active || assignedHandlerIds.has(handler.id));
  const caseOwner = responsibleHandler(caseRecord);
  els.activityOwnerInput.innerHTML = `<option value="">${caseOwner ? `Ärendeansvarig: ${escapeHtml(caseOwner.name)}` : "Ej tilldelad"}</option>`;
  for (const handler of availableHandlers) {
    const option = document.createElement("option");
    option.value = handler.id;
    option.textContent = handler.name;
    els.activityOwnerInput.append(option);
  }

  for (const activity of visibleActivities) {
    const documents = activityDocuments(activity.id);
    const workInput = activityWorkInputSummary(activity, caseRecord);
    const handler = effectiveActivityHandler(activity, caseRecord);
    const ownerSource = handler
      ? activityOwnerOverrideId(activity, caseRecord) ? "Särskilt tilldelad" : "Ärendeansvarig"
      : "";
    const result = activity.status === "completed" ? activityResultLabel(activity) : "";
    const instruction = activityTemplateDefinitionById(activity.templateId)?.workInstruction || "";
    const note = latestActivityNote(activity.id);
    const completionMeta = activity.status === "completed" && activity.completedAt
      ? `Avslutad ${formatDateTime(activity.completedAt)} av ${handlerNameById(activity.completedBy)}`
      : "";
    const quickResults = !["completed", "not_applicable"].includes(activity.status)
      && !["paused", "closed"].includes(caseRecord.status)
      && (!workInput?.required || workInput.state === "complete")
      ? quickActivityResultOptions(activity)
      : [];
    const quickFinishButton = quickResults.length
      ? `<button type="button" class="btn btn-outline-primary btn-sm activity-quick-finish-button" data-quick-finish-activity="${escapeHtml(activity.id)}">Avsluta</button>`
      : "";
    const stepNumber = Number.isFinite(activity.sortOrder) ? activity.sortOrder + 1 : activities.indexOf(activity) + 1;
    const row = document.createElement("tr");
    if (activityHasBlockingResult(activity)) row.classList.add("activity-row-attention");
    row.innerHTML = `
      <td>
        <div class="activity-name">
          <span class="activity-step" aria-hidden="true">${stepNumber}</span>
          <div>
            <button type="button" class="activity-title-button" data-open-activity="${escapeHtml(activity.id)}">${escapeHtml(activity.title)}</button>
            ${instruction ? `<small class="activity-instruction-preview"><strong>Gör så här:</strong> ${escapeHtml(instruction)}</small>` : ""}
            ${workInput ? `<small class="activity-linked-input"><strong>Kopplad registrering:</strong> <a href="${escapeHtml(workInput.href || "#")}">${escapeHtml(workInput.label)}</a> <span class="badge ${escapeHtml(workInput.stateClass)}">${escapeHtml(workInput.stateLabel)}</span>${workInput.updatedAt ? `<span>Senast ändrad ${escapeHtml(formatDateTime(workInput.updatedAt))}</span>` : ""}</small>` : ""}
            ${result ? `<small class="activity-result-summary"><strong>Registrerat utfall:</strong> ${escapeHtml(result)}</small>` : ""}
            ${note ? `<small class="activity-note-summary"><strong>Tjänsteanteckning:</strong> ${escapeHtml(note)}</small>` : ""}
            ${completionMeta ? `<small class="activity-completion-meta">${escapeHtml(completionMeta)}</small>` : ""}
            ${quickFinishButton ? `<div class="activity-mobile-result mt-2">${quickFinishButton}</div>` : ""}
          </div>
        </div>
      </td>
      <td><span class="badge activity-status-badge ${activityStatusClass(activity)}">${escapeHtml(activityWorkStateLabel(activity))}</span></td>
      <td><span class="activity-owner-name">${escapeHtml(handler?.name || "Ej tilldelad")}</span>${ownerSource ? `<small>${ownerSource}</small>` : ""}</td>
      <td class="${activityDueState(activity) ? `activity-due-${activityDueState(activity)}` : ""}">${escapeHtml(activityDueLabel(activity))}</td>
      <td>${documents.length ? `${documents.length} st` : '<span class="text-secondary">0</span>'}</td>
      <td class="text-end"><div class="activity-row-actions">${quickFinishButton ? `<div class="activity-desktop-result">${quickFinishButton}</div>` : ""}<button type="button" class="btn btn-outline-primary btn-sm activity-open-button" data-open-activity="${escapeHtml(activity.id)}">Öppna</button></div></td>
    `;
    els.caseActivityTableBody.append(row);
  }
}

function renderActivityDetail(caseRecord) {
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId && item.caseId === caseRecord.id);
  els.activityDetailPanel.hidden = !activity;
  els.activityListPanel.hidden = Boolean(activity);
  if (!activity) {
    activityDetailBaseline = null;
    return;
  }

  const owner = responsibleHandler(caseRecord);
  const availableHandlers = handlers.filter((handler) => handler.active || handler.id === activity.handlerIdOverride || handler.id === owner?.id);
  els.activityDetailTitle.textContent = activity.title;
  els.activityDetailContext.textContent = `${caseRecord.number} · ${caseMentor(caseRecord)?.name || caseRecord.title}`;
  const changedBy = handlerNameById(activity.updatedBy || activity.completedBy || activity.createdBy);
  const auditParts = [`Senast ändrad ${formatDateTime(activity.updatedAt || activity.createdAt)} av ${changedBy}`];
  if (activity.completedAt) auditParts.push(`Avslutad ${formatDateTime(activity.completedAt)} av ${handlerNameById(activity.completedBy)}`);
  els.activityDetailAudit.textContent = auditParts.join(" · ");
  renderActivityGuidance(activity, caseRecord);
  renderActivityWorkInput(activity, caseRecord);
  els.activityDetailStatus.textContent = activityWorkStateLabel(activity);
  els.activityDetailStatus.className = activityHasBlockingResult(activity)
    ? "badge text-bg-danger"
    : activity.status === "completed"
      ? "badge text-bg-success"
    : activity.status === "waiting"
      ? "badge text-bg-warning"
      : "badge text-bg-secondary";
  els.activityDetailStatusInput.value = activity.status;
  els.activityDetailOwnerInput.innerHTML = `<option value="">${owner ? `Ärendeansvarig: ${escapeHtml(owner.name)}` : "Ej tilldelad"}</option>`;
  for (const handler of availableHandlers) {
    const option = document.createElement("option");
    option.value = handler.id;
    option.textContent = `${handler.name} (särskilt tilldelad)`;
    els.activityDetailOwnerInput.append(option);
  }
  els.activityDetailOwnerInput.value = activityOwnerOverrideId(activity, caseRecord);
  els.activityDetailDueDateInput.value = activity.dueDate || "";
  els.activityDetailWaitingForInput.value = activity.waitingForParty || "";
  els.activityWaitingForRow.hidden = activity.status !== "waiting";
  els.activityDetailNoteInput.value = latestActivityNote(activity.id);
  renderActivityResultInput(activity);
  const locked = ["completed", "not_applicable"].includes(activity.status);
  els.activityDetailStatusInput.disabled = locked;
  els.activityDetailResultInput.disabled = locked || activity.status !== "completed";
  els.activityDetailOwnerInput.disabled = locked;
  els.activityDetailDueDateInput.disabled = locked;
  els.activityDetailWaitingForInput.disabled = locked || activity.status !== "waiting";
  els.activityDetailNoteInput.disabled = locked;
  els.reopenActivityButton.hidden = !locked;
  const deviation = activityDeviations.find((item) => item.activityId === activity.id && item.status === "open" && !item.activeDecisionId);
  els.activityDeviationPanel.hidden = !deviation;
  els.activityDeviationPanel.dataset.deviationId = deviation?.id || "";
  if (deviation) {
    els.activityDeviationHelp.textContent = activity.templateId === "registryChecked"
      ? "Kontrollen behöver ett särskilt ställningstagande. Ange inte brott, påföljd eller andra uppgifter ur registerutdraget i den vanliga ärendeinformationen."
      : "Aktivitetsresultatet är avvikande. Ansvarig handläggare behöver besluta hur ärendet ska fortsätta.";
    els.deviationOutcomeInput.value = "continue";
    els.deviationReasonInput.value = "";
    els.deviationResumeDateInput.value = "";
    els.deviationNoteInput.value = "";
  }
  renderActivityDocuments(activity);
  activityDetailBaseline = activityDetailFormSnapshot();
  updateActivityDetailDirtyState();
}

function renderActivityWorkInput(activity, caseRecord) {
  const workInput = activityWorkInputSummary(activity, caseRecord);
  els.activityWorkInputPanel.hidden = !workInput;
  if (!workInput) return;
  els.activityWorkInputTitle.textContent = workInput.label;
  els.activityWorkInputStatus.textContent = workInput.stateLabel;
  els.activityWorkInputStatus.className = `badge ${workInput.stateClass}`;
  els.activityWorkInputHelp.textContent = workInput.help;
  els.activityWorkInputMeta.textContent = workInput.updatedAt
    ? `Senast ändrad ${formatDateTime(workInput.updatedAt)} av ${actorNameById(workInput.updatedBy)}`
    : "Ingen registrering har gjorts ännu.";
  els.activityWorkInputLink.href = workInput.href || "#";
  els.activityWorkInputLink.textContent = workInput.actionLabel;
  els.activityWorkInputLink.hidden = !workInput.href;
}

function renderActivityGuidance(activity, caseRecord) {
  const mentor = caseMentor(caseRecord);
  const templateGuidance = activityTemplateDefinitionById(activity.templateId)?.workInstruction?.trim() || "";
  const identityDataMissing = activity.templateId === "identityVerified"
    && mentor
    && (!mentor.personalNumber || !mentor.identityMethod);
  els.activityDetailGuidance.hidden = !templateGuidance && !identityDataMissing;
  els.activityDetailGuidanceButton.dataset.mentorId = identityDataMissing ? mentor.id : "";
  els.activityDetailGuidanceTitle.textContent = "Så gör du";
  els.activityDetailGuidanceText.textContent = [
    templateGuidance,
    identityDataMissing ? "Personnummer och verifieringssätt saknas och måste registreras på mentorkortet innan resultatet Verifierad kan sparas." : ""
  ].filter(Boolean).join(" ");
  els.activityDetailGuidanceButton.hidden = !identityDataMissing;
  els.activityDetailGuidanceButton.textContent = identityDataMissing ? "Öppna identitetsuppgifter" : "";
}

function activityDetailFormSnapshot() {
  const status = els.activityDetailStatusInput.value;
  return {
    status,
    result: status === "completed" ? els.activityDetailResultInput.value : "",
    handlerId: els.activityDetailOwnerInput.value,
    dueDate: els.activityDetailDueDateInput.value,
    waitingForParty: status === "waiting" ? els.activityDetailWaitingForInput.value : "",
    note: els.activityDetailNoteInput.value.trim()
  };
}

function activityDetailHasChanges() {
  return Boolean(activityDetailBaseline)
    && JSON.stringify(activityDetailFormSnapshot()) !== JSON.stringify(activityDetailBaseline);
}

function updateActivityDetailDirtyState() {
  const dirty = activityDetailHasChanges();
  const completingActivity = dirty
    && activityDetailBaseline?.status !== "completed"
    && els.activityDetailStatusInput.value === "completed";
  els.activityDetailSaveButton.disabled = !dirty;
  els.activityDetailSaveButton.textContent = completingActivity ? "Avsluta aktivitet" : "Spara ändringar";
  els.activityDetailSaveState.textContent = dirty ? "Osparade ändringar" : "Inga osparade ändringar";
  els.activityDetailSaveState.classList.toggle("activity-save-pending", dirty);
  els.backToActivitiesButton.textContent = dirty ? "Avbryt och gå tillbaka" : "Tillbaka till aktiviteterna";
}

function renderActivityResultInput(activity) {
  const completed = els.activityDetailStatusInput.value === "completed";
  const selectedResult = activityResultValue(activity);
  els.activityDetailResultInput.innerHTML = '<option value="">Välj resultat</option>';
  for (const [value, label] of activityResultOptions(activity)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    els.activityDetailResultInput.append(option);
  }
  els.activityDetailResultInput.value = completed ? selectedResult : "";
  els.activityDetailResultInput.disabled = !completed;
  els.activityDetailResultInput.required = completed;
  els.activityResultHelp.textContent = activity.templateId === "registryChecked"
    ? "Välj särskilt ställningstagande om kontrollen behöver bedömas vidare. Dokumentera inte registerutdragets innehåll."
    : completed
      ? "Resultat krävs när aktiviteten avslutas."
      : "Resultat anges när status sätts till Avslutad.";
  updateActivityValidationState();
}

function updateActivityValidationState() {
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId);
  const caseRecord = cases.find((item) => item.id === activity?.caseId);
  const completed = els.activityDetailStatusInput.value === "completed";
  const waiting = els.activityDetailStatusInput.value === "waiting";
  const requiresNote = Boolean(activity
    && completed
    && resultClassification(activity.templateId, els.activityDetailResultInput.value) === "deviation");

  els.activityDetailNoteRequirement.hidden = !requiresNote;
  els.activityDetailWaitingForInput.setCustomValidity(waiting && !els.activityDetailWaitingForInput.value
    ? "Ange vem eller vad aktiviteten väntar på."
    : "");
  els.activityDetailResultInput.setCustomValidity(completed && !els.activityDetailResultInput.value
    ? "Välj resultat innan aktiviteten avslutas."
    : "");
  els.activityDetailNoteInput.setCustomValidity(requiresNote && !els.activityDetailNoteInput.value.trim()
    ? "Ange en kort notering när resultatet kräver ställningstagande."
    : "");
  const workInput = activity && caseRecord ? activityWorkInputSummary(activity, caseRecord) : null;
  els.activityDetailStatusInput.setCustomValidity(completed && workInput?.required && workInput.state !== "complete"
    ? `Komplettera ${workInput.label.toLocaleLowerCase("sv-SE")} innan aktiviteten avslutas.`
    : "");
}

function renderActivityDocuments(activity) {
  const documents = activityDocuments(activity.id).sort((a, b) => new Date(b.documentDate) - new Date(a.documentDate));
  const registerControl = activity.templateId === "registryChecked";
  els.addActivityDocumentButton.hidden = registerControl;
  els.activityDocumentsSummary.textContent = registerControl && !documents.length
    ? "Registerutdrag och kontrollresultat ska inte laddas upp. Själva kontrollen registreras ovan."
    : documents.length
    ? `${documents.length} ${documents.length === 1 ? "handling är" : "handlingar är"} kopplad${documents.length === 1 ? "" : "e"} till aktiviteten.`
    : "Inga handlingar är kopplade till aktiviteten.";
  els.activityDocumentsList.innerHTML = "";
  for (const caseDocument of documents) {
    const article = document.createElement("article");
    article.className = "document-row border rounded";
    article.innerHTML = `
      <div><strong>${escapeHtml(caseDocument.title)}</strong><small>${escapeHtml(documentTypeLabel(caseDocument.type))} · ${escapeHtml(formatDate(caseDocument.documentDate))}${caseDocument.fileName ? ` · ${escapeHtml(caseDocument.fileName)}` : ""}</small></div>
      <div class="text-secondary small">${escapeHtml(caseDocument.description || "Ingen beskrivning")}</div>
      <div class="text-secondary small">Registrerad av ${escapeHtml(handlerNameById(caseDocument.createdBy))}</div>
    `;
    els.activityDocumentsList.append(article);
  }
}

function renderCaseDocuments(caseDocumentRows) {
  els.caseDocumentsEmpty.hidden = caseDocumentRows.length > 0;
  els.caseDocumentsList.innerHTML = "";
  const caseRecord = selectedCaseRecord();
  const activities = activitiesForCase(caseRecord?.id);
  els.documentActivityInput.innerHTML = '<option value="">Hela ärendet</option>';
  for (const activity of activities) {
    const option = document.createElement("option");
    option.value = activity.id;
    option.textContent = activity.title;
    els.documentActivityInput.append(option);
  }
  const linkedActivity = activities.find((activity) => activity.id === els.caseDocumentForm.dataset.activityId);
  els.documentActivityInput.value = linkedActivity?.id || "";
  els.documentActivityContext.innerHTML = linkedActivity
    ? `<strong>Kopplad aktivitet</strong><button type="button" class="btn btn-link btn-sm p-0" data-open-activity="${escapeHtml(linkedActivity.id)}">${escapeHtml(linkedActivity.title)}</button>`
    : "<strong>Koppling</strong><span>Handlingen gäller hela ärendet.</span>";
  for (const caseDocument of [...caseDocumentRows].sort((a, b) => new Date(b.documentDate) - new Date(a.documentDate))) {
    const activity = activities.find((item) => item.id === caseDocument.activityId);
    const article = document.createElement("article");
    article.className = "document-row border rounded";
    article.innerHTML = `
      <div><strong>${escapeHtml(caseDocument.title)}</strong><small>${escapeHtml(documentTypeLabel(caseDocument.type))} · ${escapeHtml(formatDate(caseDocument.documentDate))}${caseDocument.fileName ? ` · ${escapeHtml(caseDocument.fileName)} (${escapeHtml(formatFileSize(caseDocument.sizeBytes))})` : ""} · ${caseDocument.informationClass === "restricted" ? "Begränsad" : "Normal"}</small>${activity ? `<button type="button" class="document-activity-link" data-open-activity="${escapeHtml(activity.id)}">Kopplad till: ${escapeHtml(activity.title)}</button>` : '<small>Gäller hela ärendet</small>'}</div>
      <div class="text-secondary small">${escapeHtml(caseDocument.description || "Ingen beskrivning")}</div>
      <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center"><span class="text-secondary small">Registrerad av ${escapeHtml(handlerNameById(caseDocument.createdBy))}${caseDocument.supersedesDocumentId ? " · Rättelse" : ""}</span><button type="button" class="btn btn-outline-secondary btn-sm" data-correct-document="${escapeHtml(caseDocument.id)}">Registrera rättelse</button></div>
    `;
    els.caseDocumentsList.append(article);
  }
}

function renderCaseMeetings(caseRecord, meetingRows) {
  meetingRows = meetingRows.filter((meeting) => !meeting.supersededByMeetingId);
  els.caseMeetingsEmpty.hidden = meetingRows.length > 0;
  els.caseMeetingsList.innerHTML = "";
  els.caseMeetingActivityInput.innerHTML = '<option value="">Ingen</option>';
  for (const activity of activitiesForCase(caseRecord.id)) {
    const option = document.createElement("option");
    option.value = activity.id;
    option.textContent = activity.title;
    els.caseMeetingActivityInput.append(option);
  }
  if (!els.caseMeetingDateInput.value) els.caseMeetingDateInput.value = localDateTimeValue();
  for (const meeting of [...meetingRows].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))) {
    const activity = caseActivities.find((item) => item.id === meeting.activityId);
    const article = document.createElement("article");
    article.className = "document-row border rounded";
    article.innerHTML = `
      <div><strong>${escapeHtml(({ certification_interview: "Intervju inför godkännande", follow_up: "Uppföljning", other: "Annat möte" })[meeting.meetingType])}</strong><small>${escapeHtml(formatDateTime(meeting.occurredAt))} · ${escapeHtml(({ physical: "Fysiskt", digital: "Digitalt", phone: "Telefon" })[meeting.mode] || "Ej angivet")}</small>${activity ? `<button type="button" class="document-activity-link" data-open-activity="${escapeHtml(activity.id)}">Kopplad till: ${escapeHtml(activity.title)}</button>` : ""}</div>
      <div class="text-secondary small">${escapeHtml(meeting.summary)}${meeting.nextStep ? `<span class="d-block mt-1">Nästa steg: ${escapeHtml(meeting.nextStep)}</span>` : ""}</div>
      <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center"><span class="text-secondary small">Registrerat av ${escapeHtml(handlerNameById(meeting.createdBy))}${meeting.supersedesMeetingId ? " · Rättad version" : ""}</span><button type="button" class="btn btn-outline-secondary btn-sm" data-edit-case-meeting="${escapeHtml(meeting.id)}">Öppna</button></div>
    `;
    els.caseMeetingsList.append(article);
  }
}

function closeCaseMeetingForm() {
  els.caseMeetingForm.reset();
  els.caseMeetingForm.dataset.meetingId = "";
  els.caseMeetingForm.hidden = true;
  els.newCaseMeetingButton.hidden = false;
}

function openCaseMeetingForm(meeting = null) {
  els.caseMeetingForm.reset();
  els.caseMeetingForm.dataset.meetingId = meeting?.id || "";
  els.caseMeetingFormTitle.textContent = meeting ? "Registrera rättelse" : "Nytt möte";
  if (meeting) {
    els.caseMeetingTypeInput.value = meeting.meetingType;
    els.caseMeetingDateInput.value = localDateTimeValue(meeting.occurredAt);
    els.caseMeetingModeInput.value = meeting.mode;
    els.caseMeetingActivityInput.value = meeting.activityId || "";
    els.caseMeetingSummaryInput.value = meeting.summary;
    els.caseMeetingNextStepInput.value = meeting.nextStep || "";
  } else {
    els.caseMeetingDateInput.value = localDateTimeValue();
  }
  els.caseMeetingForm.hidden = false;
  els.newCaseMeetingButton.hidden = true;
  els.caseMeetingSummaryInput.focus({ preventScroll: true });
}

function renderCaseEvents(events) {
  els.caseEventTableBody.innerHTML = "";
  for (const item of events) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${escapeHtml(formatDateTime(item.occurredAt || item.createdAt))}</td><td>${escapeHtml(item.payload?.message || item.text || item.eventType)}</td><td>${escapeHtml(handlerNameById(item.actorId))}</td>`;
    els.caseEventTableBody.append(row);
  }
  if (!events.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="3" class="text-secondary">Inga händelser har registrerats.</td>';
    els.caseEventTableBody.append(row);
  }
}

function renderMentorCases(candidate) {
  const mentorCases = cases.filter((caseRecord) => caseRecord.mentorId === candidate.id);
  els.mentorCasesTabCount.textContent = mentorCases.length;
  els.mentorCaseTableBody.innerHTML = "";
  for (const caseRecord of mentorCases) {
    const owner = responsibleHandler(caseRecord);
    const nextActivity = nextCaseActivity(caseRecord);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><a class="case-number-link" href="#/case/${escapeHtml(caseRecord.id)}">${escapeHtml(caseRecord.number)}</a></td>
      <td>${escapeHtml(caseRecord.type)}</td>
      <td><span class="${caseStatusBadge(caseRecord.status)}">${escapeHtml(caseStatusLabel(caseRecord.status))}</span></td>
      <td>${escapeHtml(owner?.name || "Ej tilldelad")}</td>
      <td>${escapeHtml(nextActivity?.title || "Ingen återstående")}</td>
    `;
    els.mentorCaseTableBody.append(row);
  }
}

function renderTable() {
  els.candidateTableBody.innerHTML = "";
  const rows = filteredCandidates();
  const mentorLabel = candidates.length === 1 ? "mentor" : "mentorer";
  els.mentorListCount.textContent = rows.length === candidates.length
    ? `${candidates.length} ${mentorLabel} i registret.`
    : `Visar ${rows.length} av ${candidates.length} ${mentorLabel}.`;

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="text-secondary">Inga mentorer matchar urvalet.</td>`;
    els.candidateTableBody.append(row);
    return;
  }

  for (const candidate of rows) {
    const row = document.createElement("tr");
    row.className = candidate.id === selectedId ? "active" : "";
    row.innerHTML = `
      <td><span class="case-number-text">${escapeHtml(candidate.caseNumber)}</span><small>${escapeHtml(daysSinceText(candidate.createdAt))}</small></td>
      <td>${escapeHtml(candidate.name)}<small>${escapeHtml(candidate.languages)}</small></td>
      <td><span class="${statusClass(candidate)}">${escapeHtml(candidate.status)}</span></td>
      <td>${escapeHtml(candidate.area)}</td>
      <td>${escapeHtml(candidate.coordinator || "Ej tilldelad")}</td>
      <td>${escapeHtml(formatDate(candidate.updatedAt || candidate.createdAt))}</td>
    `;
    row.addEventListener("click", () => navigateToCandidate(candidate.id));
    els.candidateTableBody.append(row);
  }
}

function filteredHandlers() {
  const term = handlerSearchTerm.trim().toLowerCase();
  return handlers.filter((handler) => {
    const statusMatches = !handlerStatusFilter
      || (handlerStatusFilter === "active" ? handler.active : !handler.active);
    const text = [handler.name, handler.email, handler.role].join(" ").toLowerCase();
    return statusMatches && (!term || text.includes(term));
  });
}

function mentorModeLabel(mode) {
  return { required: "Obligatorisk", optional: "Valfri", none: "Visas inte" }[mode] || "Valfri";
}

function caseDetailFieldTypeLabel(inputType) {
  return { text: "Textfält", number: "Numeriskt fält", date: "Datumfält" }[inputType] || "Fält";
}

function relationshipKindLabel(kind) {
  return {
    next_case: "Nästa ärende",
    process_step: "Processsteg",
    linked_case: "Länkat ärende",
    optional_follow_up: "Vid behov",
    prerequisite: "Förutsättning"
  }[kind] || "Samband";
}

function caseTypeCreationModeLabel(mode) {
  return {
    manual: "Manuell registrering",
    mentor_context: "Från en mentorpost",
    support_case: "Från ett stödärende",
    accepted_matching: "Från en accepterad matchning"
  }[mode] || "Systemstyrd registrering";
}

function nextCaseRelationshipLabel(fromId, toId) {
  if (toId === "matching") return "Startas från stödärendet när underlaget är klart; stödärendet behöver inte avslutas.";
  if (toId === "mentor-assignment") return "Skapas när både föräldern och mentorn har accepterat matchningen.";
  if (toId === "mentor-follow-up") return "Kan skapas från uppdraget när en separat uppföljning behövs.";
  if (toId === "mentor-certification") return "Startas från mentorposten när en intresserad person ska prövas för godkännande.";
  if (toId === "recruitment") return "Kan registreras när behovsanalysen visar att en rekryteringsinsats behövs.";
  return `När ärendet är avslutat kan ${caseTypeRelationshipName(toId)} registreras.`;
}

function caseTypeRelationshipName(caseTypeId) {
  return caseTypeById(caseTypeId)?.name || caseTypeId;
}

function caseTypeRelationshipLink(caseTypeId, compact = false) {
  const definition = caseTypeById(caseTypeId);
  const name = escapeHtml(definition?.name || caseTypeId);
  return compact
    ? `<a class="case-type-detail-link" href="#/case-types/${encodeURIComponent(caseTypeId)}">${name}</a>`
    : `<a class="case-type-relationship-node" href="#/case-types/${encodeURIComponent(caseTypeId)}"><span>${name}</span><small>${escapeHtml(caseTypeCreationModeLabel(definition?.creationMode))}</small></a>`;
}

function configuredNextCaseTypeRelationships() {
  return caseTypeDefinitions
    .filter((definition) => definition.nextCaseTypeId && caseTypeById(definition.nextCaseTypeId))
    .map((definition) => ({
      from: definition.id,
      to: definition.nextCaseTypeId,
      kind: "next_case",
      label: nextCaseRelationshipLabel(definition.id, definition.nextCaseTypeId)
    }));
}

function configuredCaseTypeRelationships() {
  return [...configuredNextCaseTypeRelationships(), ...CASE_TYPE_RELATIONSHIPS];
}

function caseTypeRelationshipTrackItems(startId, relationships, usedKeys) {
  const items = [{ caseTypeId: startId, relationship: null }];
  const visited = new Set([startId]);
  let currentId = startId;
  while (currentId) {
    const relationship = relationships.find((item) => item.from === currentId);
    if (!relationship || visited.has(relationship.to)) break;
    usedKeys.add(`${relationship.from}:${relationship.to}`);
    items.push({ caseTypeId: relationship.to, relationship });
    visited.add(relationship.to);
    currentId = relationship.to;
  }
  return items;
}

function caseTypeRelationshipTrack(startId, relationships, usedKeys) {
  return caseTypeRelationshipTrackContent(caseTypeRelationshipTrackItems(startId, relationships, usedKeys));
}

function caseTypeRelationshipTrackContent(items) {
  return items.map((item) => `
      ${item.relationship ? `<div class="case-type-relationship-connector">
        <span>${escapeHtml(relationshipKindLabel(item.relationship.kind))}</span>
        <i aria-hidden="true">&rarr;</i>
        <small>${escapeHtml(item.relationship.label)}</small>
      </div>` : ""}
      ${caseTypeRelationshipLink(item.caseTypeId)}
    `).join("");
}

function caseTypeRelationshipGroups() {
  const nextRelationships = configuredNextCaseTypeRelationships();
  const usedKeys = new Set();
  const groups = [];
  for (const [rootId, title] of [["needs-analysis", "Tillgång till mentorer"], ["parent-support", "Stöd till förälder"]]) {
    if (nextRelationships.some((relationship) => relationship.from === rootId)) {
      groups.push({ title, items: caseTypeRelationshipTrackItems(rootId, nextRelationships, usedKeys) });
    }
  }
  const remaining = () => nextRelationships.filter((relationship) => !usedKeys.has(`${relationship.from}:${relationship.to}`));
  while (remaining().length) {
    const pending = remaining();
    const targets = new Set(pending.map((relationship) => relationship.to));
    const startId = pending.find((relationship) => !targets.has(relationship.from))?.from || pending[0].from;
    groups.push({ title: "Övrigt konfigurerat flöde", items: caseTypeRelationshipTrackItems(startId, pending, usedKeys) });
  }
  for (const relationship of CASE_TYPE_RELATIONSHIPS) {
    groups.push({ title: "Tvärgående förutsättning", items: caseTypeRelationshipTrackItems(relationship.from, [relationship], new Set()) });
  }
  const involvedIds = new Set(nextRelationships.flatMap((relationship) => [relationship.from, relationship.to]));
  const standalone = caseTypeDefinitions.filter((definition) => !involvedIds.has(definition.id) && !CASE_TYPE_RELATIONSHIPS.some((relationship) => relationship.from === definition.id || relationship.to === definition.id));
  return { groups, standalone };
}

function nextCaseTypeSelectionCreatesCycle(sourceId, nextCaseTypeId) {
  if (!nextCaseTypeId) return false;
  const nextById = new Map(caseTypeDefinitions.map((definition) => [definition.id, definition.nextCaseTypeId || null]));
  nextById.set(sourceId, nextCaseTypeId);
  const visited = new Set();
  let currentId = sourceId;
  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = nextById.get(currentId) || null;
  }
  return false;
}

function renderCaseTypeRelationshipMap() {
  if (!els.caseTypeRelationshipMap) return;
  const { groups, standalone } = caseTypeRelationshipGroups();
  els.caseTypeRelationshipMap.innerHTML = groups.map(({ title, items }) => `
      <section class="case-type-relationship-group" aria-label="${escapeHtml(title)}">
        <h4>${escapeHtml(title)}</h4>
        <div class="case-type-relationship-track">
          ${caseTypeRelationshipTrackContent(items)}
        </div>
      </section>
    `).join("") + (standalone.length ? `
      <section class="case-type-relationship-group" aria-label="Fristående ärendetyper">
        <h4>Fristående ärendetyper</h4>
        ${standalone.map((definition) => `<div class="case-type-relationship-standalone">${caseTypeRelationshipLink(definition.id)}<small>Ingen nästa ärendetyp är vald.</small></div>`).join("")}
      </section>
    ` : "");
}

function renderCaseTypeRelationshipsFact(caseTypeId) {
  const relationships = configuredCaseTypeRelationships().filter((relationship) => relationship.from === caseTypeId || relationship.to === caseTypeId);
  if (!relationships.length) {
    els.caseTypeRelationshipsFact.innerHTML = '<p class="text-secondary mb-0">Fristående ärendetyp utan systemstyrt samband till en annan ärendetyp.</p>';
    return;
  }
  els.caseTypeRelationshipsFact.innerHTML = relationships.map((relationship) => `
    <div class="case-type-detail-relation">
      <span class="badge text-bg-light border">${escapeHtml(relationshipKindLabel(relationship.kind))}</span>
      <div>${caseTypeRelationshipLink(relationship.from, true)} <span aria-hidden="true">&rarr;</span> ${caseTypeRelationshipLink(relationship.to, true)}</div>
      <small>${escapeHtml(relationship.label)}</small>
    </div>
  `).join("");
}

function caseTypeActivitySummary(definition) {
  const templateCount = definition.activityTemplateIds?.length || 0;
  const suggestionCount = definition.suggestedActivities?.length || 0;
  if (templateCount) return `${templateCount} standardmallar`;
  if (suggestionCount) return `${suggestionCount} aktivitetsförslag`;
  return "Läggs till vid behov";
}

function activityTemplateAdminRoute(caseTypeId, templateId) {
  return `#/case-types/${encodeURIComponent(caseTypeId)}/activities/${encodeURIComponent(templateId)}`;
}

function renderCaseTypeActivitiesFact(definition) {
  const templateIds = definition.activityTemplateIds || [];
  const suggestions = definition.suggestedActivities || [];
  if (templateIds.length) {
    els.caseTypeActivitiesFact.innerHTML = `
      <ol class="case-type-activity-list">
        ${templateIds.map((templateId) => {
          const template = activityTemplateDefinitionById(templateId);
          if (!template) return "";
          const quickCount = template.quickCompletionResultCodes?.length || 0;
          return `<li>
            <span class="case-type-activity-order" aria-hidden="true"></span>
            <div>
              <a href="${activityTemplateAdminRoute(definition.id, template.id)}"><strong>${escapeHtml(template.title)}</strong></a>
              <small>${template.results?.length || 0} resultatval · ${quickCount ? "snabbavslut tillåtet för normalt utfall" : "öppnas för fullständig registrering"}</small>
            </div>
          </li>`;
        }).join("")}
      </ol>
      <p class="form-text mb-0">Aktiviteterna skapas automatiskt i den här ordningen när ärendet registreras.</p>`;
    return;
  }
  if (suggestions.length) {
    els.caseTypeActivitiesFact.innerHTML = `
      <ol class="case-type-activity-list suggested">
        ${suggestions.map((title) => `<li><span class="case-type-activity-order" aria-hidden="true"></span><div><strong>${escapeHtml(title)}</strong><small>Föreslagen manuell aktivitet</small></div></li>`).join("")}
      </ol>
      <p class="form-text mb-0">Förslagen är verksamhetsstöd. Handläggaren väljer vilka som behövs och de använder mallen <a href="${activityTemplateAdminRoute(definition.id, AD_HOC_ACTIVITY_TEMPLATE_ID)}">Annan aktivitet</a>.</p>`;
    return;
  }
  els.caseTypeActivitiesFact.innerHTML = `<div class="empty-list border rounded text-secondary">Inget fast aktivitetsflöde. Handläggaren kan lägga till aktiviteter med mallen <a href="${activityTemplateAdminRoute(definition.id, AD_HOC_ACTIVITY_TEMPLATE_ID)}">Annan aktivitet</a>.</div>`;
}

function caseTypesUsingActivityTemplate(templateId) {
  if (templateId === AD_HOC_ACTIVITY_TEMPLATE_ID) return caseTypeDefinitions;
  return caseTypeDefinitions.filter((definition) => definition.activityTemplateIds?.includes(templateId));
}

function activityResultClassificationLabel(classification) {
  return classification === "acceptable" ? "Normalt utfall" : "Kräver ställningstagande";
}

function renderActivityTypeConfiguration(definition) {
  const results = definition.results || [];
  const quickCodes = new Set(definition.quickCompletionResultCodes || []);
  const quickResults = results.filter(([code]) => quickCodes.has(code));
  const usage = caseTypesUsingActivityTemplate(definition.id);
  els.activityTypeStatusFact.textContent = Object.values(ACTIVITY_STATUS_LABELS).join(", ");
  els.activityTypeCompletionFact.textContent = definition.id === "decision"
    ? "Resultat krävs. Godkänd avslutar godkännandeärendet; avvikande resultat kräver tjänsteanteckning och ställningstagande."
    : "Resultat krävs när aktiviteten avslutas. Avvikande resultat kräver tjänsteanteckning och ställningstagande.";
  els.activityTypeQuickFact.textContent = quickResults.length
    ? `Tillåtet för: ${quickResults.map(([, label]) => label).join(", ")}. Handläggaren bekräftar valet innan det sparas.`
    : "Inte tillåtet. Aktiviteten måste öppnas för att resultatet ska registreras.";
  els.activityTypeWorkInputFact.textContent = definition.workInput
    ? `${definition.workInput.label} · måste vara fullständig före avslut`
    : "Ingen systemstyrd registrering";
  els.activityTypeUsageFact.innerHTML = definition.id === AD_HOC_ACTIVITY_TEMPLATE_ID
    ? "Alla ärendetyper när handläggaren lägger till en manuell aktivitet."
    : usage.length
      ? usage.map((caseType) => `<a href="#/case-types/${encodeURIComponent(caseType.id)}">${escapeHtml(caseType.name)}</a>`).join(", ")
      : "Ingen publicerad ärendetyp använder mallen automatiskt.";
  els.activityTypeResultsFact.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead class="table-light"><tr><th>Resultat</th><th>Klassificering</th><th>Snabbavslut</th><th>Teknisk kod</th></tr></thead>
        <tbody>${results.map(([code, label, classification]) => `<tr>
          <td><strong>${escapeHtml(label)}</strong></td>
          <td><span class="badge ${classification === "acceptable" ? "text-bg-success" : "text-bg-warning"}">${escapeHtml(activityResultClassificationLabel(classification))}</span></td>
          <td>${quickCodes.has(code) ? "Ja" : "Nej"}</td>
          <td><code>${escapeHtml(code)}</code></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function renderCaseTypeAdministration() {
  const selectedDefinition = selectedCaseTypeId ? caseTypeById(selectedCaseTypeId) : null;
  els.caseTypeListPanel.hidden = Boolean(selectedCaseTypeId);
  els.caseTypeDetailPanel.hidden = !selectedDefinition;
  renderCaseTypeRelationshipMap();
  els.caseTypeAdminTableBody.innerHTML = "";
  for (const definition of caseTypeDefinitions) {
    const fields = configuredDetailFields(definition);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(definition.name)}</strong><small class="d-block text-secondary">Tekniskt ID ${escapeHtml(definition.id)}</small></td>
      <td>${escapeHtml(caseTypeCreationModeLabel(definition.creationMode))}</td>
      <td>${escapeHtml(mentorModeLabel(definition.mentorMode))}</td>
      <td>${fields.length ? escapeHtml(fields.map((field) => field.label).join(", ")) : '<span class="text-secondary">Inga</span>'}</td>
      <td>${escapeHtml(caseTypeActivitySummary(definition))}</td>
      <td>${definition.updatedAt ? escapeHtml(formatDateTime(definition.updatedAt)) : '<span class="text-secondary">Grundinställning</span>'}</td>
      <td class="text-end"><a class="btn btn-outline-primary btn-sm" href="#/case-types/${encodeURIComponent(definition.id)}">Öppna</a></td>
    `;
    els.caseTypeAdminTableBody.append(row);
  }
  if (!selectedCaseTypeId) return;
  if (!selectedDefinition) {
    els.caseTypeListPanel.hidden = true;
    els.caseTypeDetailPanel.hidden = false;
    els.caseTypeDetailPanel.innerHTML = `<div class="card-body py-5"><h2 class="h5">Ärendetypen finns inte</h2><p class="text-secondary">Posten kan ha ändrats eller tagits bort.</p><a class="btn btn-outline-primary btn-sm" href="#/case-types">Tillbaka till ärendetyper</a></div>`;
    return;
  }

  const fields = configuredDetailFields(selectedDefinition);
  els.caseTypeAdminIdInput.value = selectedDefinition.id;
  els.caseTypeAdminTitle.textContent = selectedDefinition.name;
  els.caseTypeAdminTechnicalId.textContent = `Tekniskt ID ${selectedDefinition.id}`;
  els.caseTypeVersionMeta.textContent = String(selectedDefinition.version || 1);
  els.caseTypeUpdatedMeta.textContent = selectedDefinition.updatedAt ? formatDateTime(selectedDefinition.updatedAt) : "Grundinställning";
  els.caseTypeHelpFact.textContent = selectedDefinition.helpText || "Ej angivet";
  els.caseTypeHintFact.textContent = selectedDefinition.registrationHint || "Ej angivet";
  els.caseTypeWorkInstructionFact.textContent = selectedDefinition.workInstruction || "Ej angivet";
  els.caseTypeCreationModeFact.textContent = caseTypeCreationModeLabel(selectedDefinition.creationMode);
  els.caseTypeMentorModeFact.textContent = mentorModeLabel(selectedDefinition.mentorMode);
  els.caseTypeNextTypeFact.textContent = selectedDefinition.nextCaseTypeId ? caseTypeRelationshipName(selectedDefinition.nextCaseTypeId) : "Ingen";
  renderCaseTypeActivitiesFact(selectedDefinition);
  els.caseTypeFieldsFact.innerHTML = fields.length
    ? `<dl class="record-fields case-type-configured-fields mb-0">${fields.map((field) => `<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(caseDetailFieldTypeLabel(field.inputType))}</dd></div>`).join("")}</dl>`
    : '<div class="empty-list border rounded text-secondary">Inga kompletterande fält.</div>';
  renderCaseTypeRelationshipsFact(selectedDefinition.id);

  if (caseTypeEditMode) {
    els.caseTypeAdminHelpInput.value = selectedDefinition.helpText || "";
    els.caseTypeAdminHintInput.value = selectedDefinition.registrationHint || "";
    els.caseTypeAdminWorkInstructionInput.value = selectedDefinition.workInstruction || "";
    els.caseTypeAdminMentorModeInput.value = selectedDefinition.mentorMode || "optional";
    els.caseTypeAdminNextTypeInput.innerHTML = [
      '<option value="">Ingen</option>',
      ...caseTypeDefinitions
        .filter((definition) => definition.id !== selectedDefinition.id)
        .map((definition) => `<option value="${escapeHtml(definition.id)}">${escapeHtml(definition.name)}</option>`)
    ].join("");
    els.caseTypeAdminNextTypeInput.value = selectedDefinition.nextCaseTypeId || "";
    const selectedFields = new Set(selectedDefinition.detailFieldIds || []);
    els.caseTypeAdminFieldChoices.innerHTML = CASE_DETAIL_FIELD_DEFINITIONS.map((field) => `
      <div class="form-check">
        <input id="case-type-field-${escapeHtml(field.id)}" class="form-check-input" type="checkbox" value="${escapeHtml(field.id)}" ${selectedFields.has(field.id) ? "checked" : ""}>
        <label class="form-check-label" for="case-type-field-${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
      </div>
    `).join("");
  }
  els.caseTypeReadView.hidden = caseTypeEditMode;
  els.caseTypeAdminForm.hidden = !caseTypeEditMode;
  els.editCaseTypeButton.hidden = caseTypeEditMode;
  els.caseTypeEditActions.hidden = !caseTypeEditMode;
}

function setCaseTypeEditMode(editing) {
  caseTypeEditMode = editing;
  renderCaseTypeAdministration();
  if (editing) els.caseTypeAdminHelpInput.focus({ preventScroll: true });
}

function renderActivityTypeAdministration() {
  const selectedDefinition = selectedActivityTypeId ? activityTemplateDefinitionById(selectedActivityTypeId) : null;
  els.activityTypeListPanel.hidden = Boolean(selectedActivityTypeId);
  els.activityTypeDetailPanel.hidden = !selectedDefinition;
  els.activityTypeAdminTableBody.innerHTML = "";
  for (const definition of activityTemplateDefinitions) {
    const usage = caseTypesUsingActivityTemplate(definition.id);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(definition.title)}</strong><small class="d-block text-secondary activity-guidance-preview">${escapeHtml(definition.workInstruction || "Ej angivet")}</small></td>
      <td>${definition.results?.length || 0}</td>
      <td>${definition.id === AD_HOC_ACTIVITY_TEMPLATE_ID ? "Alla, vid manuell aktivitet" : usage.map((caseType) => escapeHtml(caseType.name)).join(", ") || '<span class="text-secondary">Ingen automatisk</span>'}</td>
      <td>${definition.updatedAt ? escapeHtml(formatDateTime(definition.updatedAt)) : '<span class="text-secondary">Grundinställning</span>'}</td>
      <td class="text-end"><a class="btn btn-outline-primary btn-sm" href="${activityTemplateAdminRoute(usage[0]?.id || "other", definition.id)}">Öppna</a></td>
    `;
    els.activityTypeAdminTableBody.append(row);
  }
  if (!selectedActivityTypeId) return;
  if (!selectedDefinition) {
    els.activityTypeListPanel.hidden = true;
    els.activityTypeDetailPanel.hidden = false;
    els.activityTypeDetailPanel.innerHTML = '<div class="card-body py-5"><h2 class="h5">Aktivitetsmallen finns inte</h2><a class="btn btn-outline-primary btn-sm" href="#/case-types">Tillbaka till ärendetyper</a></div>';
    return;
  }
  els.activityTypeAdminIdInput.value = selectedDefinition.id;
  const parentCaseType = caseTypeById(selectedActivityParentCaseTypeId) || caseTypesUsingActivityTemplate(selectedDefinition.id)[0] || null;
  els.activityTypeBackLink.href = parentCaseType ? `#/case-types/${encodeURIComponent(parentCaseType.id)}` : "#/case-types";
  els.activityTypeBackLink.textContent = parentCaseType ? `Tillbaka till ${parentCaseType.name}` : "Tillbaka till ärendetyper";
  els.activityTypeAdminTitle.textContent = selectedDefinition.title;
  els.activityTypeAdminTechnicalId.textContent = `Tekniskt ID ${selectedDefinition.id}`;
  els.activityTypeVersionMeta.textContent = String(selectedDefinition.version || 1);
  els.activityTypeUpdatedMeta.textContent = selectedDefinition.updatedAt ? formatDateTime(selectedDefinition.updatedAt) : "Grundinställning";
  els.activityTypeWorkInstructionFact.textContent = selectedDefinition.workInstruction || "Ej angivet";
  renderActivityTypeConfiguration(selectedDefinition);
  if (activityTypeEditMode) els.activityTypeAdminWorkInstructionInput.value = selectedDefinition.workInstruction || "";
  els.activityTypeReadView.hidden = activityTypeEditMode;
  els.activityTypeAdminForm.hidden = !activityTypeEditMode;
  els.editActivityTypeButton.hidden = activityTypeEditMode;
  els.activityTypeEditActions.hidden = !activityTypeEditMode;
}

function setActivityTypeEditMode(editing) {
  activityTypeEditMode = editing;
  renderActivityTypeAdministration();
  if (editing) els.activityTypeAdminWorkInstructionInput.focus({ preventScroll: true });
}

function handlerMentorCount(handler) {
  return new Set(caseAssignments
    .filter((assignment) => assignment.handlerId === handler.id)
    .map((assignment) => assignment.caseId)).size;
}

function renderHandlers() {
  const rows = filteredHandlers();
  const activeCount = handlers.filter((handler) => handler.active).length;
  els.handlerListCount.textContent = rows.length === handlers.length
    ? `${handlers.length} handläggare i registret, varav ${activeCount} aktiva.`
    : `Visar ${rows.length} av ${handlers.length} handläggare.`;
  els.handlerTableBody.innerHTML = "";

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7" class="text-secondary">Inga handläggare matchar urvalet.</td>';
    els.handlerTableBody.append(row);
    return;
  }

  for (const handler of rows) {
    const assignedCount = handlerMentorCount(handler);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(handler.name)}</strong><small>Användar-ID ${escapeHtml(handler.userId)}</small></td>
      <td><a href="mailto:${escapeHtml(handler.email)}">${escapeHtml(handler.email)}</a></td>
      <td>${escapeHtml(handler.role)}</td>
      <td>${assignedCount}</td>
      <td><span class="badge ${handler.active ? "text-bg-success" : "text-bg-secondary"}">${handler.active ? "Aktiv" : "Inaktiv"}</span></td>
      <td>${escapeHtml(formatDate(handler.updatedAt || handler.createdAt))}</td>
      <td class="text-end text-nowrap">
        <button type="button" class="btn btn-outline-primary btn-sm" data-open-handler="${handler.id}">Öppna</button>
      </td>
    `;
    row.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      navigateToHandler(handler.id);
    });
    els.handlerTableBody.append(row);
  }
}

function selectedHandler() {
  return handlers.find((handler) => handler.id === selectedHandlerId);
}

function renderHandlerDetail() {
  const handler = selectedHandler();
  if (!handler) {
    els.handlerDetailEmpty.hidden = false;
    els.handlerDetail.hidden = true;
    return;
  }

  els.handlerDetailEmpty.hidden = true;
  els.handlerDetail.hidden = false;
  const assignedCount = handlerMentorCount(handler);
  const status = handler.active ? "Aktiv" : "Inaktiv";
  els.selectedHandlerUserId.textContent = `Användar-ID ${handler.userId}`;
  els.selectedHandlerName.textContent = handler.name;
  els.selectedHandlerStatus.textContent = status;
  els.selectedHandlerStatus.className = `badge ${handler.active ? "text-bg-success" : "text-bg-secondary"}`;
  els.selectedHandlerRoleMeta.textContent = handler.role;
  els.selectedHandlerCreatedMeta.textContent = formatDateTime(handler.createdAt);
  els.selectedHandlerUpdatedMeta.textContent = formatDateTime(handler.updatedAt || handler.createdAt);
  els.handlerNameFact.textContent = handler.name;
  els.handlerEmailFact.textContent = handler.email;
  els.handlerRoleFact.textContent = handler.role;
  els.handlerStatusFact.textContent = status;
  els.handlerAssignedFact.textContent = assignedCount;
  els.handlerAssignedEditFact.textContent = assignedCount;
  els.toggleSelectedHandlerButton.textContent = handler.active ? "Inaktivera handläggare" : "Aktivera handläggare";
  els.toggleSelectedHandlerButton.classList.toggle("text-danger", handler.active);
  setHandlerEditMode(false);
}

function setHandlerEditMode(editing) {
  const handler = selectedHandler();
  if (editing && handler) {
    els.editHandlerNameInput.value = handler.name;
    els.editHandlerEmailInput.value = handler.email;
    els.editHandlerEmailInput.setCustomValidity("");
    els.editHandlerRoleInput.value = handler.role;
    els.editHandlerActiveInput.value = handler.active ? "active" : "inactive";
  }
  els.handlerReadView.hidden = editing;
  els.handlerEditForm.hidden = !editing;
  els.editHandlerButton.hidden = editing;
  els.handlerEditActions.hidden = !editing;
  if (editing) els.editHandlerNameInput.focus({ preventScroll: true });
}

function populateCoordinatorSelect(candidate) {
  els.coordinatorInput.innerHTML = '<option value="">Ej tilldelad</option>';
  const available = handlers.filter((handler) => handler.active || handler.id === candidate.coordinatorId);
  for (const handler of available) {
    const option = document.createElement("option");
    option.value = handler.id;
    option.textContent = handler.active ? handler.name : `${handler.name} (inaktiv)`;
    els.coordinatorInput.append(option);
  }
  els.coordinatorInput.value = candidate.coordinatorId || "";
}

function renderMentorLearning(candidate) {
  const courses = selectedLearningContent().filter((item) => item.type === "course");
  els.mentorLearningTabCount.textContent = courses.length;
  els.mentorLearningList.innerHTML = courses.map((course) => {
    const progress = learningProgressRecord(candidate.id, course.id);
    const percent = courseProgressPercent(course, progress.completedModuleIds);
    const attempts = (progress.attempts || []).filter((attempt) => attempt.testId);
    return `<article class="document-list-item">
      <div class="document-list-content">
        <div class="d-flex flex-wrap gap-2 align-items-center"><strong>${escapeHtml(course.title)}</strong><span class="badge ${percent === 100 ? "text-bg-success" : "text-bg-light border"}">${percent === 100 ? "Genomförd" : `${percent}%`}</span></div>
        <small>${course.modules.length} moment · ${attempts.length} testförsök · version ${course.version}</small>
      </div>
      <button type="button" class="btn btn-outline-primary btn-sm" data-open-mentor-course="${escapeHtml(course.id)}" data-mentor-id="${escapeHtml(candidate.id)}">Öppna kurs</button>
    </article>`;
  }).join("") || '<div class="empty-list border rounded text-secondary">Kommunens urval innehåller inga kurser.</div>';
}

function renderDetail() {
  if (isCreatingMentor()) {
    renderNewCandidateDetail();
    return;
  }

  const candidate = selectedCandidate();

  if (!candidate) {
    els.detailEmpty.hidden = false;
    els.candidateDetail.hidden = true;
    renderedDetailId = null;
    return;
  }

  els.detailEmpty.hidden = true;
  els.candidateDetail.hidden = false;
  els.recordMoreActions.hidden = false;
  els.deleteButton.textContent = candidate.active === false ? "Aktivera mentor" : "Inaktivera mentor";
  els.nextActionBar.hidden = false;
  document.querySelectorAll(".detail-tabs .nav-item").forEach((item) => {
    item.hidden = false;
  });
  els.savePersonEditButton.textContent = "Spara ändringar";
  if (renderedDetailId !== candidate.id) {
    closeMeetingForm();
    identityEditMode = false;
    showDefaultMentorTab();
    renderedDetailId = candidate.id;
  }
  els.selectedCaseId.textContent = candidate.caseNumber;
  els.selectedName.textContent = candidate.name;
  els.selectedCoordinatorMeta.textContent = candidate.coordinator || "Ej tilldelad";
  els.selectedRegisteredByMeta.textContent = handlerNameById(candidate.createdBy);
  els.selectedCreatedMeta.textContent = formatDateTime(candidate.createdAt);
  els.selectedUpdatedMeta.textContent = formatDateTime(candidate.updatedAt || candidate.createdAt);
  els.selectedStatus.textContent = candidate.status;
  els.selectedStatus.className = statusClass(candidate);
  els.nameFact.textContent = candidate.name;
  els.personalNumberFact.textContent = candidate.personalNumber || "Saknas";
  els.contactDetailsFact.textContent = candidate.contactDetails || "Ej angivet";
  els.informationStatusFact.textContent = informationStatusLabel(candidate.informationStatus);
  els.interestNoteFact.textContent = candidate.interestNote || "Ej angivet";
  els.languageFact.textContent = candidate.languages || "Ej angivet";
  els.availabilityFact.textContent = candidate.availability || "Ej angivet";
  els.areaFact.textContent = candidate.area || "Ej angivet";
  renderMentorSupportAreas(candidate);
  els.mentorMatchingProfileMeta.textContent = candidate.matchingProfile
    ? `Version ${candidate.matchingProfile.version} · uppdaterad ${formatDateTime(candidate.matchingProfile.updatedAt)}`
    : "Matchningsprofil saknas";
  els.statusFact.textContent = candidate.status;
  els.coordinatorFact.textContent = candidate.coordinator || "Ej tilldelad";
  const identitySummary = candidate.checks?.identityVerified
    ? `Verifierad med ${identityMethodLabel(candidate.identityMethod)}`
    : "Ej verifierad";
  els.identityMethodFact.textContent = identitySummary;
  els.identityMethodEditFact.textContent = identitySummary;
  const nextAction = nextActionFor(candidate);
  els.nextStepFact.textContent = nextAction.label;
  els.nextStepEditFact.textContent = nextAction.label;
  els.nextActionTitle.textContent = nextAction.label;
  els.nextActionDescription.textContent = nextAction.description;
  els.openNextActionButton.textContent = nextAction.buttonLabel;
  els.openNextActionButton.hidden = !nextAction.tabId;
  els.nextActionBar.classList.toggle("complete", !nextAction.tabId);
  document.querySelectorAll(".detail-tabs .nav-link").forEach((tab) => tab.classList.remove("next-action-tab"));
  if (nextAction.tabId) {
    document.querySelector(`#${nextAction.tabId}`)?.classList.add("next-action-tab");
  }
  els.logTabCount.textContent = candidate.history.length;
  renderMentorCases(candidate);
  renderMentorLearning(candidate);
  setPersonEditMode(false);

  els.statusSelect.innerHTML = "";
  for (const status of STATUSES) {
    if (status === "Godkänd" && candidate.status !== "Godkänd") continue;
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === candidate.status;
    els.statusSelect.append(option);
  }

  populateCoordinatorSelect(candidate);
  els.coordinatorFieldRow.classList.toggle("next-required", nextAction.key === "coordinatorAssigned");
  els.interviewDateInput.value = candidate.interviewDate || "";
  els.interviewModeInput.value = ({ physical: "Fysiskt möte", digital: "Digitalt möte", phone: "Telefon" })[candidate.interviewMode] || candidate.interviewMode || "";
  els.interviewDoneInput.checked = Boolean(candidate.checks?.interviewDone);
  const interviewDoneMeta = candidate.checkMeta?.interviewDone || {};
  els.interviewDoneMeta.textContent = candidate.checks?.interviewDone
    ? `Klar ${formatDateTime(interviewDoneMeta.checkedAt)} av ${interviewDoneMeta.checkedBy || "Ej angivet"}`
    : "Ej klar";
  els.interviewCompletion.classList.toggle("next-required", nextAction.key === "interviewDone");
  const identityVerified = Boolean(candidate.checks?.identityVerified);
  const identityMethodText = identityMethodLabel(candidate.identityMethod);
  els.identityPersonalNumberFact.textContent = candidate.personalNumber || "Saknas";
  els.identityMethodCheckFact.textContent = identityVerified ? identityMethodText : "Ej verifierad";
  els.identityPersonalNumberInput.value = candidate.personalNumber || "";
  els.identityMethodSelect.value = candidate.identityMethod || "";
  els.identityVerificationMeta.hidden = !identityVerified;
  els.identityVerifiedAtFact.textContent = identityVerified ? formatDateTime(candidate.identityVerifiedAt) : "";
  els.identityVerifiedByFact.textContent = identityVerified ? handlerNameById(candidate.identityVerifiedBy) : "";
  els.identityNoteFact.textContent = identityVerified ? candidate.checkMeta?.identityVerified?.note || "Ingen notering" : "";
  setIdentityEditMode(!identityVerified || identityEditMode);
  els.identityVerificationPanel.classList.toggle("next-required", nextAction.key === "identityVerified");
  els.checklist.innerHTML = "";

  for (const [key, label] of CHECKS) {
    if (key === "identityVerified") continue;
    const column = document.createElement("div");
    column.className = "col-md-6";
    const isNextAction = nextAction.key === key;
    const checked = Boolean(candidate.checks?.[key]);
    const meta = candidate.checkMeta?.[key] || {};
    const metaText = checked
      ? `Klar ${formatDateTime(meta.checkedAt)} av ${meta.checkedBy || "Ej angivet"}`
      : "Ej klar";
    const noteText = checked && meta.note
      ? `<span class="check-row-note">Notering: ${escapeHtml(meta.note)}</span>`
      : "";
    const certificationCase = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
    const activity = activitiesForCase(certificationCase?.id).find((item) => item.templateId === key);
    column.innerHTML = `
      <section class="check-row border rounded h-100 ${isNextAction ? "next-required" : ""}">
        <span class="check-row-body">
          <span class="form-check-label">${label}</span>
          <span class="check-row-meta">${escapeHtml(metaText)}</span>
          ${noteText}
        </span>
        <button type="button" class="btn btn-outline-primary btn-sm" data-open-check-activity="${escapeHtml(activity?.id || "")}" ${activity ? "" : "disabled"}>Öppna aktivitet</button>
        ${isNextAction ? '<span class="next-required-marker">Nästa åtgärd</span>' : ""}
      </section>
    `;
    els.checklist.append(column);
  }

  const approval = certificationApprovalAssessment(candidate);
  els.approveButton.disabled = !approval.allowed;
  els.decisionHint.textContent = approval.allowed
    ? "Mentorn uppfyller samtliga krav och kan godkännas."
    : approval.reasons[0] || "Ärendet om godkännande är inte redo för beslut.";

  els.auditLog.innerHTML = "";
  for (const item of [...candidate.history].reverse()) {
    const row = document.createElement("tr");
    const actor = item.actor || (item.text.startsWith("Ärende skapat") ? "System" : candidate.coordinator || "System");
    row.innerHTML = `
      <td><time datetime="${escapeHtml(item.at)}">${escapeHtml(formatDateTime(item.at))}</time></td>
      <td>${escapeHtml(item.text)}</td>
      <td>${escapeHtml(actor)}</td>
    `;
    els.auditLog.append(row);
  }

  if (pendingNextActionId === candidate.id) {
    pendingNextActionId = null;
    requestAnimationFrame(() => showNextAction(candidate));
  }
  if (pendingIdentityEditorId === candidate.id) {
    pendingIdentityEditorId = null;
    requestAnimationFrame(() => {
      bootstrap.Tab.getOrCreateInstance(document.querySelector("#mentor-base-tab")).show();
      setIdentityEditMode(true);
      els.identityPersonalNumberInput.focus({ preventScroll: true });
    });
  }
}

function renderNewCandidateDetail() {
  els.detailEmpty.hidden = true;
  els.candidateDetail.hidden = false;
  if (renderedDetailId !== "new") {
    closeMeetingForm();
    identityEditMode = false;
    showDefaultMentorTab();
    renderedDetailId = "new";
  }

  els.selectedCaseId.textContent = "Nytt ärende";
  els.selectedName.textContent = "Ny mentor";
  els.selectedCoordinatorMeta.textContent = "Ej tilldelad";
  els.selectedRegisteredByMeta.textContent = currentUserName();
  els.selectedCreatedMeta.textContent = "Ej skapad";
  els.selectedUpdatedMeta.textContent = "Ej sparad";
  els.selectedStatus.textContent = "Ny";
  els.selectedStatus.className = "badge rounded-pill text-bg-secondary";
  els.recordMoreActions.hidden = true;
  els.nextActionBar.hidden = true;
  document.querySelectorAll(".detail-tabs .nav-item").forEach((item, index) => {
    item.hidden = index > 0;
  });

  els.personReadView.hidden = true;
  els.personEditForm.hidden = false;
  els.editPersonButton.hidden = true;
  els.personEditActions.hidden = false;
  els.savePersonEditButton.textContent = "Spara mentor";
  els.editNameInput.value = "";
  els.editPersonalNumberInput.value = "";
  els.editContactDetailsInput.value = "";
  els.editInformationStatusInput.value = "";
  els.editInterestNoteInput.value = "";
  els.editContactDetailsInput.required = true;
  els.editInformationStatusInput.required = true;
  els.editInterestNoteInput.required = true;
  els.editAreaInput.value = "";
  els.editLanguagesInput.value = "";
  els.editAvailabilityInput.value = "";
  renderMentorSupportAreaEditor();
  els.statusSelect.innerHTML = "";
  const statusOption = document.createElement("option");
  statusOption.value = "Anmäld";
  statusOption.textContent = "Anmäld";
  els.statusSelect.append(statusOption);
  populateCoordinatorSelect({ coordinatorId: "" });
  els.identityMethodEditFact.textContent = "Ej verifierad";
  els.nextStepEditFact.textContent = "Tilldela handläggare";
}

function renderMeetings(candidate) {
  const mentorCaseIds = new Set(cases.filter((caseRecord) => caseRecord.mentorId === candidate.id).map((caseRecord) => caseRecord.id));
  const candidateMeetings = caseMeetings.filter((meeting) => mentorCaseIds.has(meeting.caseId) && !meeting.supersededByMeetingId);
  els.meetingsTabCount.textContent = candidateMeetings.length;
  els.meetingsEmpty.hidden = candidateMeetings.length > 0;
  els.meetingsTableWrap.hidden = candidateMeetings.length === 0;
  els.meetingsTableBody.innerHTML = "";

  for (const meeting of candidateMeetings) {
    const meetingType = ({ certification_interview: "Intervju inför godkännande", follow_up: "Uppföljning", other: "Annat möte" })[meeting.meetingType] || meeting.meetingType;
    const row = document.createElement("tr");
    const nextStep = meeting.nextStep
      ? `<small class="d-block text-secondary mt-1">Nästa steg: ${escapeHtml(meeting.nextStep)}</small>`
      : "";
    row.innerHTML = `
      <td><time datetime="${escapeHtml(meeting.occurredAt)}">${escapeHtml(formatDateTime(meeting.occurredAt))}</time></td>
      <td>${escapeHtml(meetingType)}<small class="d-block text-secondary">${escapeHtml(({ physical: "Fysiskt möte", digital: "Digitalt möte", phone: "Telefon" })[meeting.mode] || "Ej angivet")}</small></td>
      <td class="meeting-summary">${escapeHtml(meeting.summary)}${nextStep}</td>
      <td>${escapeHtml(handlerNameById(meeting.createdBy))}</td>
      <td class="text-end"><button type="button" class="btn btn-outline-primary btn-sm" data-edit-meeting="${escapeHtml(meeting.id)}">Öppna</button></td>
    `;
    els.meetingsTableBody.append(row);
  }
}

function localDateTimeValue(value = new Date()) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function closeMeetingForm() {
  selectedMeetingId = null;
  els.meetingForm.reset();
  els.meetingForm.hidden = true;
}

function openMeetingForm(meeting = null) {
  selectedMeetingId = meeting?.id || null;
  els.meetingForm.reset();
  els.meetingFormTitle.textContent = meeting ? "Redigera möte" : "Nytt möte";
  els.meetingTypeInput.value = ({ certification_interview: "Intervju inför godkännande", follow_up: "Uppföljning", other: "Annat möte" })[meeting?.meetingType] || "";
  els.meetingDateInput.value = meeting?.occurredAt ? localDateTimeValue(meeting.occurredAt) : localDateTimeValue();
  els.meetingModeInput.value = ({ physical: "Fysiskt möte", digital: "Digitalt möte", phone: "Telefon" })[meeting?.mode] || "";
  els.meetingSummaryInput.value = meeting?.summary || "";
  els.meetingNextStepInput.value = meeting?.nextStep || "";
  els.meetingForm.hidden = false;
  els.meetingTypeInput.focus({ preventScroll: true });
  els.meetingForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setIdentityEditMode(editing) {
  const candidate = selectedCandidate();
  const identityVerified = Boolean(candidate?.checks?.identityVerified);
  identityEditMode = !identityVerified || editing;
  els.identityReadView.hidden = identityEditMode;
  els.identityEditView.hidden = !identityEditMode;
  els.editIdentityVerificationButton.hidden = identityEditMode || !identityVerified;
  els.cancelIdentityVerificationButton.hidden = !identityEditMode || !identityVerified;
  els.saveIdentityVerificationButton.hidden = !identityEditMode;
  els.saveIdentityVerificationButton.textContent = identityVerified ? "Spara identitet" : "Registrera identitet";

  if (identityEditMode) {
    els.identityPersonalNumberInput.value = candidate?.personalNumber || "";
    els.identityMethodSelect.value = candidate?.identityMethod || "";
  }
}

function setPersonEditMode(editing) {
  const candidate = selectedCandidate();
  if (editing && candidate) {
    els.editNameInput.value = candidate.name || "";
    els.editPersonalNumberInput.value = candidate.personalNumber || "";
    els.editContactDetailsInput.value = candidate.contactDetails || "";
    els.editInformationStatusInput.value = candidate.informationStatus || "";
    els.editInterestNoteInput.value = candidate.interestNote || "";
    els.editContactDetailsInput.required = false;
    els.editInformationStatusInput.required = false;
    els.editInterestNoteInput.required = false;
    els.editAreaInput.value = candidate.area || "";
    els.editLanguagesInput.value = candidate.languages || "";
    els.editAvailabilityInput.value = candidate.availability || "";
    renderMentorSupportAreaEditor(candidate);
    els.statusSelect.value = candidate.status || STATUSES[0];
    els.coordinatorInput.value = candidate.coordinatorId || "";
  }

  els.personReadView.hidden = editing;
  els.personEditForm.hidden = !editing;
  els.editPersonButton.hidden = editing;
  els.personEditActions.hidden = !editing;

  if (editing) {
    els.editNameInput.focus({ preventScroll: true });
  }
}

function showDefaultMentorTab() {
  const tab = document.querySelector("#mentor-base-tab");
  if (window.bootstrap && tab) {
    bootstrap.Tab.getOrCreateInstance(tab).show();
  }
}

function showNextAction(candidate) {
  const action = nextActionFor(candidate);
  if (!action.tabId) return;
  if (action.key !== "coordinatorAssigned") {
    const certificationCase = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
    const activity = activitiesForCase(certificationCase?.id).find((item) => item.templateId === action.key);
    if (activity) {
      openCaseActivity(activity.id);
      return;
    }
  }
  const tabElement = document.querySelector(`#${action.tabId}`);
  if (!tabElement || !window.bootstrap) return;
  bootstrap.Tab.getOrCreateInstance(tabElement).show();
  if (action.key !== "coordinatorAssigned") return;
  if (action.key === "coordinatorAssigned") setPersonEditMode(true);

  requestAnimationFrame(() => {
    const target = action.key === "coordinatorAssigned"
      ? els.coordinatorInput
      : action.key === "identityVerified"
      ? els.identityPersonalNumberInput
      : action.key === "decision"
      ? els.approveButton
      : action.key === "interviewDone"
        ? !els.interviewDateInput.value
          ? els.interviewDateInput
          : !els.interviewModeInput.value
            ? els.interviewModeInput
            : els.interviewDoneInput
        : els.checklist.querySelector(`[data-check="${cssEscape(action.key)}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  });
}

async function updateSelected(patch, logText) {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const updated = {
    ...candidate,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  if (logText) {
    updated.history = [
      ...(candidate.history || []),
      { at: updated.updatedAt, text: logText, actor: currentUserName() }
    ];
  }
  await saveCandidate(updated);
  markSaved();
  await refresh();
}

function caseEventRecord({ caseId, eventType, entityType = "case", entityId = caseId, message, idempotencyKey, correlationId, now }) {
  return {
    id: crypto.randomUUID(),
    tenantId: DEFAULT_TENANT_ID,
    caseId,
    eventType,
    schemaVersion: 1,
    entityType,
    entityId,
    actorId: CURRENT_USER_ID,
    occurredAt: now,
    correlationId,
    idempotencyKey,
    payload: { message }
  };
}

function executeCaseCommand({
  commandType,
  caseId,
  expectedVersion = null,
  idempotencyKey = crypto.randomUUID(),
  payload = {},
  additionalStores = [],
  allowMissingCase = false,
  mutate
}) {
  const requestHash = stableHash({ commandType, caseId, payload });
  const storeNames = [...new Set([
    CASES_STORE,
    CASE_EVENTS_STORE,
    PROCESSED_COMMANDS_STORE,
    ...additionalStores
  ])];
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, "readwrite");
    const processedStore = transaction.objectStore(PROCESSED_COMMANDS_STORE);
    let response;
    let failure;
    const processedRequest = processedStore.get([DEFAULT_TENANT_ID, idempotencyKey]);

    const fail = (code, message) => {
      failure = Object.assign(new Error(message), { code });
      transaction.abort();
    };

    processedRequest.onsuccess = () => {
      const processed = processedRequest.result;
      if (processed) {
        if (processed.requestHash !== requestHash) {
          fail("IDEMPOTENCY_CONFLICT", "Idempotensnyckeln har redan använts för ett annat kommando.");
          return;
        }
        response = processed.response;
        return;
      }

      const caseRequest = transaction.objectStore(CASES_STORE).get(caseId);
      caseRequest.onsuccess = () => {
        const currentCase = caseRequest.result || null;
        if (!currentCase && !allowMissingCase) {
          fail("CASE_NOT_FOUND", "Ärendet finns inte.");
          return;
        }
        if (currentCase && currentCase.tenantId !== DEFAULT_TENANT_ID) {
          fail("CASE_NOT_FOUND", "Ärendet finns inte.");
          return;
        }
        if (expectedVersion !== null && currentCase?.version !== expectedVersion) {
          fail("VERSION_CONFLICT", "Ärendet har ändrats av någon annan. Läs in den senaste versionen.");
          return;
        }

        const now = new Date().toISOString();
        const correlationId = crypto.randomUUID();
        response = mutate({
          currentCase,
          now,
          correlationId,
          idempotencyKey,
          store: (name) => transaction.objectStore(name),
          put: (name, value) => transaction.objectStore(name).put(value),
          event: (eventType, entityType, entityId, message) => {
            const record = caseEventRecord({
              caseId,
              eventType,
              entityType,
              entityId,
              message,
              idempotencyKey,
              correlationId,
              now
            });
            transaction.objectStore(CASE_EVENTS_STORE).put(record);
            return record;
          }
        });
        processedStore.put({
          tenantId: DEFAULT_TENANT_ID,
          idempotencyKey,
          commandType,
          requestHash,
          response,
          processedAt: now
        });
      };
    };

    transaction.oncomplete = () => resolve(response);
    transaction.onerror = () => reject(failure || transaction.error);
    transaction.onabort = () => reject(failure || transaction.error || new Error("Kommandot avbröts."));
  });
}

function saveActivityCommand({ activity, caseRecord, nextStatus, nextResult, nextHandlerId, nextDueDate, nextWaitingForParty = null, note, reopen = false, meeting = null }) {
  const sourceStatus = normalizeActivityStatus(activity.status);
  const targetStatus = normalizeActivityStatus(nextStatus);
  if (!canTransitionActivity(sourceStatus, targetStatus, { reopen })) {
    return Promise.reject(Object.assign(new Error("Den valda statusövergången är inte tillåten."), { code: "INVALID_TRANSITION" }));
  }
  if (caseRecord.status === "closed") {
    return Promise.reject(Object.assign(new Error("Ärendet måste återöppnas innan aktiviteter kan ändras."), { code: "CASE_CLOSED" }));
  }
  if (caseRecord.status === "paused") {
    return Promise.reject(Object.assign(new Error("Ärendet måste återupptas innan aktiviteter kan ändras."), { code: "CASE_PAUSED" }));
  }
  if (targetStatus === "waiting" && !["mentor", "handler", "external"].includes(nextWaitingForParty)) {
    return Promise.reject(Object.assign(new Error("Ange vem eller vad aktiviteten väntar på."), { code: "WAITING_PARTY_REQUIRED" }));
  }
  const classification = targetStatus === "completed" ? resultClassification(activity.templateId, nextResult) : null;
  if (targetStatus === "completed" && !classification) {
    return Promise.reject(Object.assign(new Error("Välj ett giltigt resultat innan aktiviteten avslutas."), { code: "RESULT_REQUIRED" }));
  }
  if (classification === "deviation" && !note.trim()) {
    return Promise.reject(Object.assign(new Error("En kort tjänsteanteckning krävs för ett avvikande resultat."), { code: "NOTE_REQUIRED" }));
  }

  return executeCaseCommand({
    commandType: reopen ? "reopen_activity" : "update_activity",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { activityId: activity.id, nextStatus: targetStatus, nextResult, nextHandlerId, nextDueDate, nextWaitingForParty, note, meeting },
    additionalStores: [CASE_ACTIVITIES_STORE, CASE_DOCUMENTS_STORE, ACTIVITY_DEVIATIONS_STORE, ...(meeting ? [CASE_MEETINGS_STORE] : [])],
    mutate: ({ currentCase, now, put, event }) => {
      const resultChanged = nextResult !== (activity.resultCode || null);
      const completionEvent = targetStatus === "completed" && (sourceStatus !== "completed" || resultChanged)
        ? event("activity_updated", "activity", activity.id, `${activity.title} avslutades med resultatet ${activityResultOptions(activity).find(([code]) => code === nextResult)?.[1] || nextResult}`)
        : null;
      if (!completionEvent) {
        event(reopen ? "activity_updated" : "activity_updated", "activity", activity.id, reopen
          ? `${activity.title} återöppnades`
          : `${activity.title} uppdaterades`);
      }

      const updatedActivity = {
        ...activity,
        status: targetStatus,
        resultCode: targetStatus === "completed" ? nextResult : null,
        resultClassification: classification,
        handlerIdOverride: nextHandlerId || null,
        waitingForParty: targetStatus === "waiting" ? nextWaitingForParty : null,
        dueDate: nextDueDate || null,
        version: Number(activity.version || 1) + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID,
        completedAt: targetStatus === "completed" ? now : null,
        completedBy: targetStatus === "completed" ? CURRENT_USER_ID : null
      };
      put(CASE_ACTIVITIES_STORE, updatedActivity);

      if (meeting) {
        const meetingId = crypto.randomUUID();
        put(CASE_MEETINGS_STORE, {
          id: meetingId, tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, activityId: activity.id,
          meetingType: meeting.meetingType, occurredAt: meeting.occurredAt, mode: meeting.mode,
          summary: meeting.summary, nextStep: meeting.nextStep || "", participantHandlerIds: [CURRENT_USER_ID],
          externalParticipantNames: [],
          supersedesMeetingId: null, supersededByMeetingId: null, version: 1,
          createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID
        });
        event("meeting_registered", "meeting", meetingId, `Mötet registrerades: ${meeting.summary}`);
      }

      if (note.trim() && note.trim() !== latestActivityNote(activity.id)) {
        const serviceNote = {
          id: crypto.randomUUID(),
          tenantId: DEFAULT_TENANT_ID,
          caseId: currentCase.id,
          activityId: activity.id,
          meetingId: null,
          type: "service_note",
          title: `Tjänsteanteckning: ${activity.title}`,
          description: note.trim(),
          documentDate: now.slice(0, 10),
          storageObjectId: null,
          mimeType: null,
          sizeBytes: null,
          checksum: null,
          informationClass: "normal",
          supersedesDocumentId: null,
          createdAt: now,
          createdBy: CURRENT_USER_ID
        };
        put(CASE_DOCUMENTS_STORE, serviceNote);
        event("document_registered", "document", serviceNote.id, `Tjänsteanteckning registrerades för ${activity.title}`);
      }

      const openDeviation = activityDeviations.find((deviation) => deviation.activityId === activity.id && deviation.status === "open");
      let newDeviation = null;
      if (reopen && openDeviation) {
        put(ACTIVITY_DEVIATIONS_STORE, {
          ...openDeviation,
          status: "superseded",
          version: openDeviation.version + 1,
          resolvedAt: now,
          resolvedBy: CURRENT_USER_ID
        });
      } else if (classification === "deviation" && completionEvent) {
        newDeviation = {
          id: crypto.randomUUID(),
          tenantId: DEFAULT_TENANT_ID,
          caseId: currentCase.id,
          activityId: activity.id,
          activityCompletionEventId: completionEvent.id,
          resultCode: nextResult,
          status: "open",
          version: 1,
          openedAt: now,
          openedBy: CURRENT_USER_ID,
          resolvedAt: null,
          resolvedBy: null,
          activeDecisionId: null
        };
        put(ACTIVITY_DEVIATIONS_STORE, newDeviation);
        event("deviation_opened", "deviation", newDeviation.id, `Avvikelse registrerades för ${activity.title}`);
      }

      const allActivities = activitiesForCase(currentCase.id).map((item) => item.id === activity.id ? updatedActivity : item);
      let nextCaseStatus = newDeviation ? "decision_required" : deriveDomainCaseStatus(
        { ...currentCase, status: currentCase.status === "decision_required" ? "in_progress" : currentCase.status },
        allActivities,
        activityDeviations.filter((deviation) => deviation.caseId === currentCase.id && deviation.id !== openDeviation?.id)
      );
      let closePatch = {};
      if (activity.templateId === "decision" && targetStatus === "completed" && nextResult === "approved") {
        nextCaseStatus = "closed";
        closePatch = { closeReasonCode: "mentor_approved", closeNote: note.trim() || "Mentorn godkänd", closedAt: now, closedBy: CURRENT_USER_ID };
        for (const otherActivity of allActivities) {
          if (otherActivity.id === activity.id || ["completed", "not_applicable"].includes(otherActivity.status)) continue;
          put(CASE_ACTIVITIES_STORE, {
            ...otherActivity,
            status: "not_applicable",
            resultCode: null,
            resultClassification: null,
            version: Number(otherActivity.version || 1) + 1,
            updatedAt: now,
            updatedBy: CURRENT_USER_ID
          });
        }
        event("case_closed", "case", currentCase.id, "Ärendet avslutades: mentorn godkänd");
      }
      const updatedCase = {
        ...currentCase,
        ...closePatch,
        status: nextCaseStatus,
        version: currentCase.version + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      };
      put(CASES_STORE, updatedCase);
      return { caseId: currentCase.id, activityId: activity.id, status: nextCaseStatus, version: updatedCase.version, deviationId: newDeviation?.id || null };
    }
  });
}

function decideDeviationCommand({ deviation, caseRecord, outcome, reasonCode, note, resumeAt = null }) {
  if (!reasonCode || !note.trim()) return Promise.reject(new Error("Orsak och motivering måste anges."));
  return executeCaseCommand({
    commandType: "decide_deviation",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { deviationId: deviation.id, outcome, reasonCode, note, resumeAt },
    additionalStores: [ACTIVITY_DEVIATIONS_STORE, DEVIATION_DECISIONS_STORE, CASE_ACTIVITIES_STORE, CASE_ASSIGNMENTS_STORE],
    mutate: ({ currentCase, now, put, event }) => {
      const decision = {
        id: crypto.randomUUID(),
        tenantId: DEFAULT_TENANT_ID,
        deviationId: deviation.id,
        outcome,
        reasonCode,
        note: note.trim(),
        resumeAt: resumeAt || null,
        supersedesDecisionId: deviation.activeDecisionId || null,
        decidedAt: now,
        decidedBy: CURRENT_USER_ID
      };
      put(DEVIATION_DECISIONS_STORE, decision);
      put(ACTIVITY_DEVIATIONS_STORE, {
        ...deviation,
        status: "resolved",
        version: deviation.version + 1,
        resolvedAt: now,
        resolvedBy: CURRENT_USER_ID,
        activeDecisionId: decision.id
      });
      event("deviation_decided", "decision", decision.id, `Ställningstagande registrerades: ${{
        continue: "fortsätt handläggningen",
        request_supplement: "begär komplettering",
        pause_case: "pausa ärendet",
        close_case: "avsluta ärendet"
      }[outcome]}`);

      const casePatch = {};
      let nextStatus = "in_progress";
      if (outcome === "request_supplement") {
        if (!responsibleHandler(currentCase)) {
          const assignment = {
            id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, handlerId: CURRENT_USER_ID,
            role: "responsible", assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null, version: 1
          };
          put(CASE_ASSIGNMENTS_STORE, assignment);
          event("assignment_changed", "assignment", assignment.id, `${currentUserName()} blev ansvarig handläggare`);
        }
        const sourceActivity = caseActivities.find((item) => item.id === deviation.activityId);
        const followUpTitle = ({
          referencesDone: "Kontakta mentorn om ny referens",
          registryChecked: "Begär nytt registerutdrag",
          trainingDone: "Följ upp återstående e-learning",
          quizDone: "Planera kompletterande kunskapsavstämning",
          interviewDone: "Planera kompletterande intervju"
        })[sourceActivity?.templateId] || "Begär komplettering från mentorn";
        const activity = {
          id: crypto.randomUUID(),
          tenantId: DEFAULT_TENANT_ID,
          caseId: currentCase.id,
          templateId: AD_HOC_ACTIVITY_TEMPLATE_ID,
          templateVersion: 1,
          title: followUpTitle,
          status: "waiting",
          resultCode: null,
          resultClassification: null,
          handlerIdOverride: null,
          waitingForParty: "mentor",
          dueDate: resumeAt || null,
          sortOrder: activitiesForCase(currentCase.id).length,
          version: 1,
          createdAt: now,
          createdBy: CURRENT_USER_ID,
          updatedAt: now,
          updatedBy: CURRENT_USER_ID,
          completedAt: null,
          completedBy: null
        };
        put(CASE_ACTIVITIES_STORE, activity);
        event("activity_updated", "activity", activity.id, `Uppföljningsaktivitet skapades: ${followUpTitle}`);
        nextStatus = "waiting";
      } else if (outcome === "pause_case") {
        nextStatus = "paused";
        Object.assign(casePatch, { pauseReasonCode: reasonCode, pauseNote: note.trim(), resumeAt: resumeAt || null });
        event("case_paused", "case", currentCase.id, "Ärendet pausades efter ställningstagande");
      } else if (outcome === "close_case") {
        nextStatus = "closed";
        Object.assign(casePatch, { closeReasonCode: reasonCode, closeNote: note.trim(), closedAt: now, closedBy: CURRENT_USER_ID });
        for (const activity of activitiesForCase(currentCase.id)) {
          if (["completed", "not_applicable"].includes(activity.status)) continue;
          put(CASE_ACTIVITIES_STORE, {
            ...activity,
            status: "not_applicable",
            resultCode: null,
            resultClassification: null,
            version: activity.version + 1,
            updatedAt: now,
            updatedBy: CURRENT_USER_ID
          });
        }
        event("case_closed", "case", currentCase.id, "Ärendet avslutades efter ställningstagande");
      }
      const updatedCase = {
        ...currentCase,
        ...casePatch,
        status: nextStatus,
        version: currentCase.version + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      };
      put(CASES_STORE, updatedCase);
      return { caseId: currentCase.id, deviationId: deviation.id, decisionId: decision.id, status: nextStatus, version: updatedCase.version };
    }
  });
}

function verifyIdentityCommand({ candidate, caseRecord, activity, personalNumber, method, note }) {
  return executeCaseCommand({
    commandType: "verify_identity",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { candidateId: candidate.id, method, hasNote: Boolean(note) },
    additionalStores: [STORE, CASE_ACTIVITIES_STORE, CASE_DOCUMENTS_STORE],
    mutate: ({ currentCase, now, put, event }) => {
      put(STORE, {
        ...candidate,
        personalNumber,
        identityMethod: method,
        identityVerifiedAt: now,
        identityVerifiedBy: CURRENT_USER_ID,
        updatedAt: now
      });
      const updatedActivity = {
        ...activity,
        status: "completed",
        resultCode: "verified",
        resultClassification: "acceptable",
        version: activity.version + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID,
        completedAt: now,
        completedBy: CURRENT_USER_ID
      };
      put(CASE_ACTIVITIES_STORE, updatedActivity);
      if (note) {
        put(CASE_DOCUMENTS_STORE, {
          id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, activityId: activity.id, meetingId: null,
          type: "service_note", title: "Tjänsteanteckning: identitetsverifiering", description: note,
          documentDate: now.slice(0, 10), storageObjectId: null, mimeType: null, sizeBytes: null, checksum: null,
          informationClass: "restricted", supersedesDocumentId: null, createdAt: now, createdBy: CURRENT_USER_ID
        });
      }
      const updatedActivities = activitiesForCase(currentCase.id).map((item) => item.id === activity.id ? updatedActivity : item);
      const updatedCase = {
        ...currentCase,
        status: deriveDomainCaseStatus(currentCase, updatedActivities, activityDeviations.filter((item) => item.caseId === currentCase.id)),
        version: currentCase.version + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      };
      put(CASES_STORE, updatedCase);
      event("activity_updated", "activity", activity.id, `Identiteten verifierades med ${identityMethodLabel(method)}`);
      return { caseId: currentCase.id, activityId: activity.id, version: updatedCase.version };
    }
  });
}

async function sha256Hex(file) {
  if (!file) return null;
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function registerDocumentCommand({ caseRecord, activityId, type, title, documentDate, description, informationClass, file, supersedesDocumentId = null }) {
  if (["incoming", "created"].includes(type) && !file) {
    throw new Error("Välj en fil för en inkommen eller upprättad handling.");
  }
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();
  const storageObjectId = file ? crypto.randomUUID() : null;
  const checksum = await sha256Hex(file);
  return executeCaseCommand({
    commandType: supersedesDocumentId ? "correct_document" : "register_document",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { activityId, type, title, documentDate, description, informationClass, checksum, supersedesDocumentId },
    additionalStores: [CASE_DOCUMENTS_STORE, CASE_DOCUMENT_BLOBS_STORE],
    mutate: ({ currentCase, put, event }) => {
      const record = {
        id: documentId,
        tenantId: DEFAULT_TENANT_ID,
        caseId: currentCase.id,
        activityId: activityId || null,
        meetingId: null,
        type,
        title,
        description,
        documentDate,
        storageObjectId,
        fileName: file?.name || null,
        mimeType: file?.type || null,
        sizeBytes: file?.size || null,
        checksum,
        informationClass,
        supersedesDocumentId,
        createdAt: now,
        createdBy: CURRENT_USER_ID
      };
      put(CASE_DOCUMENTS_STORE, record);
      if (file) {
        put(CASE_DOCUMENT_BLOBS_STORE, {
          id: storageObjectId,
          tenantId: DEFAULT_TENANT_ID,
          documentId,
          blob: file,
          createdAt: now
        });
      }
      const updatedCase = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updatedCase);
      event(supersedesDocumentId ? "document_corrected" : "document_registered", "document", documentId,
        `${supersedesDocumentId ? "Rättelse registrerades" : "Handlingen registrerades"}: ${title}`);
      return { caseId: currentCase.id, documentId, version: updatedCase.version };
    }
  });
}

function registerCaseMeetingCommand({ caseRecord, existing = null, meetingType, occurredAt, mode, activityId, summary, nextStep = "" }) {
  const now = new Date().toISOString();
  const meetingId = crypto.randomUUID();
  return executeCaseCommand({
    commandType: existing ? "revise_meeting" : "register_meeting",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { existingId: existing?.id || null, meetingType, occurredAt, mode, activityId, summary, nextStep },
    additionalStores: [CASE_MEETINGS_STORE],
    mutate: ({ currentCase, put, event }) => {
      if (existing) put(CASE_MEETINGS_STORE, { ...existing, supersededByMeetingId: meetingId, updatedAt: now, updatedBy: CURRENT_USER_ID });
      put(CASE_MEETINGS_STORE, {
        id: meetingId,
        tenantId: DEFAULT_TENANT_ID,
        caseId: currentCase.id,
        activityId: activityId || null,
        meetingType,
        occurredAt,
        mode,
        summary,
        nextStep,
        participantHandlerIds: [CURRENT_USER_ID],
        externalParticipantNames: [],
        supersedesMeetingId: existing?.id || null,
        supersededByMeetingId: null,
        version: Number(existing?.version || 0) + 1,
        createdAt: now,
        createdBy: CURRENT_USER_ID,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      });
      const updatedCase = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updatedCase);
      event(existing ? "meeting_revised" : "meeting_registered", "meeting", meetingId,
        `${existing ? "Mötesanteckningen rättades" : "Mötet registrerades"}: ${summary}`);
      return { caseId: currentCase.id, meetingId, version: updatedCase.version };
    }
  });
}

function updateMentorProfileCommand({ candidate, caseRecord, profilePatch, coordinatorId }) {
  const nextCandidate = { ...candidate, ...profilePatch };
  const changesMatchingProfile = ["area", "languages", "availability", "supportAreas", "meetingModes", "availableAssignmentCapacity"]
    .some((field) => Object.prototype.hasOwnProperty.call(profilePatch, field));
  const previousProfile = changesMatchingProfile ? mentorMatchingProfile(candidate.id) : null;
  const profileId = changesMatchingProfile ? crypto.randomUUID() : null;
  if (!caseRecord) {
    const now = new Date().toISOString();
    const records = { [STORE]: [{ ...nextCandidate, updatedAt: now }] };
    if (changesMatchingProfile) {
      const built = buildMentorMatchingProfile({ tenantId: DEFAULT_TENANT_ID, mentor: nextCandidate, profileId, previousProfile, actorId: CURRENT_USER_ID, now });
      Object.assign(records, profileWrites(built, MENTOR_MATCHING_PROFILES_STORE, MENTOR_MATCHING_AREAS_STORE, MENTOR_MATCHING_LANGUAGES_STORE, previousProfile));
    }
    return atomicPut(records);
  }
  const currentResponsible = assignmentsForCase(caseRecord.id).find((assignment) => assignment.role === "responsible" && !assignment.endedAt);
  return executeCaseCommand({
    commandType: "update_mentor_profile",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { candidateId: candidate.id, profilePatch, coordinatorId },
    additionalStores: [STORE, CASE_ASSIGNMENTS_STORE, ...(changesMatchingProfile ? [MENTOR_MATCHING_PROFILES_STORE, MENTOR_MATCHING_AREAS_STORE, MENTOR_MATCHING_LANGUAGES_STORE] : [])],
    mutate: ({ currentCase, now, put, event }) => {
      put(STORE, { ...nextCandidate, updatedAt: now });
      if (changesMatchingProfile) {
        const built = buildMentorMatchingProfile({ tenantId: DEFAULT_TENANT_ID, mentor: nextCandidate, profileId, previousProfile, actorId: CURRENT_USER_ID, now });
        if (previousProfile) put(MENTOR_MATCHING_PROFILES_STORE, { ...previousProfile, status: "superseded", supersededAt: now, supersededBy: profileId, updatedAt: now, updatedBy: CURRENT_USER_ID });
        put(MENTOR_MATCHING_PROFILES_STORE, built.profile);
        for (const area of built.supportAreas) put(MENTOR_MATCHING_AREAS_STORE, area);
        for (const language of built.languages) put(MENTOR_MATCHING_LANGUAGES_STORE, language);
      }
      if ((currentResponsible?.handlerId || "") !== (coordinatorId || "")) {
        if (currentResponsible) {
          put(CASE_ASSIGNMENTS_STORE, { ...currentResponsible, endedAt: now, endedBy: CURRENT_USER_ID, version: Number(currentResponsible.version || 1) + 1 });
        }
        if (coordinatorId) {
          put(CASE_ASSIGNMENTS_STORE, {
            id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, handlerId: coordinatorId,
            role: "responsible", assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null, version: 1
          });
        }
        event("assignment_changed", "assignment", currentResponsible?.id || currentCase.id, coordinatorId
          ? `Ansvarig handläggare ändrades till ${handlerNameById(coordinatorId)}`
          : "Ansvarig handläggare togs bort");
      }
      const updatedCase = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updatedCase);
      event("mentor_profile_updated", "mentor", candidate.id, "Mentorns grunduppgifter uppdaterades");
      return { caseId: currentCase.id, candidateId: candidate.id, version: updatedCase.version };
    }
  });
}

function changeCaseLifecycleCommand({ caseRecord, action, reasonCode, note, resumeAt = null }) {
  if (!reasonCode || !note.trim()) return Promise.reject(new Error("Orsak och motivering måste anges."));
  const statusByAction = { pause: "paused", resume: "in_progress", close: "closed", reopen: "in_progress" };
  const eventByAction = { pause: "case_paused", resume: "case_resumed", close: "case_closed", reopen: "case_reopened" };
  const labelByAction = { pause: "pausades", resume: "återupptogs", close: "avslutades", reopen: "återöppnades" };
  return executeCaseCommand({
    commandType: `${action}_case`,
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { action, reasonCode, note, resumeAt },
    additionalStores: [CASE_ACTIVITIES_STORE],
    mutate: ({ currentCase, now, put, event }) => {
      if (action === "reopen" && currentUser().role !== "Samordnare") throw new Error("Endast samordnare kan återöppna ärenden.");
      if (action === "close") {
        for (const activity of activitiesForCase(currentCase.id)) {
          if (["completed", "not_applicable"].includes(activity.status)) continue;
          put(CASE_ACTIVITIES_STORE, { ...activity, status: "not_applicable", version: activity.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID });
        }
      }
      const lifecyclePatch = action === "pause"
        ? { pauseReasonCode: reasonCode, pauseNote: note.trim(), resumeAt: resumeAt || null }
        : action === "close"
          ? { closeReasonCode: reasonCode, closeNote: note.trim(), closedAt: now, closedBy: CURRENT_USER_ID }
          : action === "reopen"
            ? { closeReasonCode: null, closeNote: null, closedAt: null, closedBy: null }
            : { pauseReasonCode: null, pauseNote: null, resumeAt: null };
      const updatedCase = {
        ...currentCase,
        ...lifecyclePatch,
        status: statusByAction[action],
        version: currentCase.version + 1,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      };
      put(CASES_STORE, updatedCase);
      event(eventByAction[action], "case", currentCase.id, `Ärendet ${labelByAction[action]}: ${note.trim()}`);
      return { caseId: currentCase.id, status: updatedCase.status, version: updatedCase.version };
    }
  });
}

function caseCloseReasonOptions(caseRecord) {
  if (caseRecord.caseTypeId === "parent-support") return [
    ["support_completed", "Stödbehovet är färdighandlagt"],
    ["parent_declined", "Föräldern vill inte gå vidare"],
    ["support_no_longer_current", "Stödbehovet är inte längre aktuellt"],
    ["transferred", "Överfört till annan insats"],
    ["duplicate", "Felregistrering eller dubblett"],
    ["other", "Annan avslutsorsak"]
  ];
  if (caseRecord.caseTypeId === "matching") return [
    ["assignment_created", "Matchningen har övergått i mentoruppdrag"],
    ["party_declined", "En av parterna tackade nej"],
    ["matching_no_longer_current", "Matchningen är inte längre aktuell"],
    ["other", "Annan avslutsorsak"]
  ];
  if (caseRecord.caseTypeId === "mentor-assignment") return [
    ["assignment_completed", "Mentoruppdraget är slutfört"],
    ["parent_ended", "Föräldern avslutade deltagandet"],
    ["mentor_ended", "Mentorn avslutade uppdraget"],
    ["transferred", "Överfört till annan insats"],
    ["other", "Annan avslutsorsak"]
  ];
  if (caseRecord.caseTypeId === "mentor-certification") return [
    ["completed", "Handläggningen slutförd"],
    ["unsuitable", "Mentorn bedöms inte lämplig"],
    ["withdrawn", "Ansökan återkallad"],
    ["duplicate", "Felregistrering eller dubblett"],
    ["other", "Annan avslutsorsak"]
  ];
  return [
    ["completed", "Handläggningen slutförd"],
    ["no_longer_current", "Ärendet är inte längre aktuellt"],
    ["duplicate", "Felregistrering eller dubblett"],
    ["other", "Annan avslutsorsak"]
  ];
}

function openCaseLifecycle(action) {
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  pendingCaseLifecycleAction = action;
  const content = {
    pause: ["Pausa ärendet", "Öppna aktiviteter ligger kvar men ska inte handläggas under pausen. Ange orsak och bevakningsdatum.", "Pausa ärendet"],
    resume: ["Återuppta ärendet", "Ärendet blir aktivt igen. Tidigare paus och motivering ligger kvar i loggen.", "Återuppta ärendet"],
    close: ["Avsluta ärendet", "Öppna aktiviteter markeras som ej aktuella. Ärendet och all historik bevaras.", "Avsluta ärendet"],
    reopen: ["Återöppna ärendet", "Ärendet blir aktivt igen. Åtgärden kräver samordnarbehörighet och registreras i loggen.", "Återöppna ärendet"]
  }[action];
  els.caseLifecycleForm.reset();
  const reasonOptions = {
    pause: [
      ["awaiting_information", "Inväntar information under längre tid"],
      ["mentor_requested_pause", "Mentorn har begärt uppehåll"],
      ["external_dependency", "Inväntar extern hantering"],
      ["other", "Annan tillfällig orsak"]
    ],
    close: caseCloseReasonOptions(caseRecord),
    resume: [
      ["conditions_met", "Förutsättningarna är uppfyllda"],
      ["new_information", "Ny information har kommit in"],
      ["other", "Annan orsak"]
    ],
    reopen: [
      ["correction", "Rättelse"],
      ["new_information", "Ny information har kommit in"],
      ["other", "Annan orsak"]
    ]
  }[action];
  els.caseLifecycleReasonInput.innerHTML = '<option value="">Välj orsak</option>';
  for (const [value, label] of reasonOptions) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    els.caseLifecycleReasonInput.append(option);
  }
  els.caseLifecycleTitle.textContent = content[0];
  els.caseLifecycleDescription.textContent = content[1];
  els.caseLifecycleSubmitButton.textContent = content[2];
  els.caseLifecycleSubmitButton.classList.toggle("btn-danger", action === "close");
  els.caseLifecycleSubmitButton.classList.toggle("btn-primary", action !== "close");
  els.caseLifecycleResumeRow.hidden = action !== "pause";
  els.caseLifecycleResumeInput.required = action === "pause";
  caseLifecycleModal.show();
}

function derivedCaseStatus(caseRecord, updatedActivities) {
  const deviations = activityDeviations.filter((deviation) => deviation.caseId === caseRecord.id);
  return deriveDomainCaseStatus(caseRecord, updatedActivities, deviations);
}

async function syncCandidateFromActivity(activity, status, note, now, result = "") {
  const caseRecord = cases.find((item) => item.id === activity.caseId);
  const candidate = candidates.find((item) => item.id === caseRecord?.mentorId);
  if (!candidate) return true;
  const completed = status === "completed" && resultClassification(activity.templateId, result) === "acceptable";

  if (activity.templateId === "identityVerified" && completed && (!candidate.personalNumber || !candidate.identityMethod)) {
    showFeedback("Registrera personnummer och verifieringssätt på mentorkortet innan identitetsaktiviteten slutförs.");
    return false;
  }
  if (activity.templateId === "decision" && completed) {
    const prerequisites = activitiesForCase(caseRecord.id).filter((item) => item.id !== activity.id && item.templateId !== "decision");
    if (prerequisites.some((item) => item.status !== "completed" || item.resultClassification === "deviation")) {
      showFeedback("Samtliga kontroller och intervjun måste vara klara innan beslutet kan registreras.");
      return false;
    }
  }
  return true;
}

async function syncActivityFromCandidate(candidate, templateKey, completed, note = "", context = {}) {
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  const activity = caseActivities.find((item) => item.caseId === caseRecord?.id && item.templateId === templateKey);
  if (!caseRecord || !activity) return;
  await saveActivityCommand({
    activity,
    caseRecord,
    nextStatus: completed ? "completed" : "in_progress",
    nextResult: completed ? defaultCompletedResult(activity) : "",
    nextHandlerId: activity.handlerIdOverride || "",
    nextDueDate: activity.dueDate || "",
    note,
    reopen: !completed && ["completed", "not_applicable"].includes(activity.status),
    meeting: context.meeting || null
  });
}

function activityTemplatesForCaseType(type) {
  const templates = {
    Uppföljning: ["Kontakta mentorn", "Dokumentera uppföljningen", "Bedöm fortsatt behov"],
    Rekryteringsinsats: ["Analysera behov", "Skapa platsannons", "Publicera annons", "Följ upp ansökningar"],
    Behovsanalys: ["Samla in underlag", "Analysera behov", "Dokumentera slutsats"]
  };
  return templates[type] || [];
}

function newCandidate(formData, caseNumber) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    tenantId: DEFAULT_TENANT_ID,
    caseNumber,
    name: formData.get("name").trim(),
    personalNumber: formData.get("personalNumber").trim(),
    area: formData.get("area").trim(),
    languages: formData.get("languages").trim(),
    availability: formData.get("availability").trim(),
    coordinatorId: "",
    coordinator: "",
    status: "Anmäld",
    checks: Object.fromEntries(CHECKS.map(([key]) => [key, false])),
    checkMeta: buildCheckMeta(),
    interviewDate: "",
    interviewMode: "",
    notes: "",
    identityMethod: "",
    identityVerifiedAt: "",
    identityVerifiedBy: "",
    history: [{ at: now, text: "Mentor registrerad", actor: currentUserName() }],
    createdBy: CURRENT_USER_ID,
    updatedBy: CURRENT_USER_ID,
    createdAt: now,
    updatedAt: now
  };
}

function candidateDuplicateMatches() {
  return findMentorDuplicates(candidates, {
    personalNumber: els.candidatePersonalNumberInput.value,
    name: els.candidateNameInput.value
  });
}

function renderCandidateDuplicateCheck() {
  const { exactPersonalNumber, sameName } = candidateDuplicateMatches();
  const panel = els.candidateDuplicatePanel;
  if (!exactPersonalNumber && !sameName.length) {
    panel.hidden = true;
    panel.innerHTML = "";
    panel.dataset.choice = "";
    return { blocked: false };
  }
  panel.hidden = false;
  if (exactPersonalNumber) {
    panel.innerHTML = `<strong>Personnumret finns redan.</strong><p class="mb-2">Öppna den befintliga mentorposten i stället för att skapa en dubblett.</p><button type="button" class="btn btn-warning btn-sm" data-open-duplicate-mentor="${escapeHtml(exactPersonalNumber.id)}">Öppna ${escapeHtml(exactPersonalNumber.name)}</button>`;
    return { blocked: true, candidate: exactPersonalNumber };
  }
  const match = sameName[0];
  const accepted = panel.dataset.choice === "create-anyway";
  panel.innerHTML = `<strong>En mentor med samma namn finns redan.</strong><p class="mb-2">Kontrollera att det är en annan person innan du fortsätter.</p><div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-warning btn-sm" data-open-duplicate-mentor="${escapeHtml(match.id)}">Öppna ${escapeHtml(match.name)}</button><button type="button" class="btn btn-outline-secondary btn-sm ${accepted ? "active" : ""}" data-create-duplicate-mentor>Det är en annan person</button></div>`;
  return { blocked: !accepted, candidate: match };
}

function renderMentorEditorDuplicateCheck() {
  const panel = els.mentorEditorDuplicatePanel;
  if (!isCreatingMentor()) {
    panel.hidden = true;
    return { blocked: false };
  }
  const matches = findMentorDuplicates(candidates, { name: els.editNameInput.value }).sameName;
  if (!matches.length) {
    panel.hidden = true;
    panel.innerHTML = "";
    panel.dataset.choice = "";
    return { blocked: false };
  }
  const match = matches[0];
  const accepted = panel.dataset.choice === "create-anyway";
  panel.hidden = false;
  panel.innerHTML = `<strong>En mentor med samma namn finns redan.</strong><p class="mb-2">Kontrollera att det är en annan person innan du fortsätter.</p><div class="d-flex flex-wrap gap-2"><a class="btn btn-warning btn-sm" href="#/mentor/${escapeHtml(match.id)}">Öppna ${escapeHtml(match.name)}</a><button type="button" class="btn btn-outline-secondary btn-sm ${accepted ? "active" : ""}" data-create-editor-duplicate>Det är en annan person</button></div>`;
  return { blocked: !accepted };
}

function newCandidateFromEditor(caseNumber) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  return {
    id,
    tenantId: DEFAULT_TENANT_ID,
    caseNumber,
    name: els.editNameInput.value.trim(),
    personalNumber: els.editPersonalNumberInput.value.trim(),
    contactDetails: els.editContactDetailsInput.value.trim(),
    informationStatus: els.editInformationStatusInput.value,
    interestNote: els.editInterestNoteInput.value.trim(),
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
    supportAreas: mentorSupportAreasFromEditor(),
    coordinatorId: coordinator?.id || "",
    coordinator: coordinator?.name || "",
    status: "Anmäld",
    checks: Object.fromEntries(CHECKS.map(([key]) => [key, false])),
    checkMeta: buildCheckMeta(),
    interviewDate: "",
    interviewMode: "",
    notes: "",
    identityMethod: "",
    identityVerifiedAt: "",
    identityVerifiedBy: "",
    history: [{ at: now, text: "Mentor registrerad", actor: currentUserName() }],
    createdBy: CURRENT_USER_ID,
    updatedBy: CURRENT_USER_ID,
    createdAt: now,
    updatedAt: now
  };
}

function randomDigits(length) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 10 ** length).padStart(length, "0");
}

function nextHandlerUserId() {
  const highest = handlers.reduce((max, handler) => {
    const match = String(handler.userId || "").match(/^FMU-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  return `FMU-${highest + 1}`;
}

function makeExamplePersonalNumber(index) {
  const year = 1970 + index % 30;
  const month = String(index % 12 + 1).padStart(2, "0");
  const day = String(index % 27 + 1).padStart(2, "0");
  const serial = String(100 + index % 900).padStart(3, "0");
  const luhnBase = `${String(year).slice(-2)}${month}${day}${serial}`;
  const validDigit = luhnCheckDigit(luhnBase);
  const invalidDigit = (validDigit + 1) % 10;
  return `${year}${month}${day}-${serial}${invalidDigit}`;
}

function luhnCheckDigit(digits) {
  const sum = [...digits].reduce((total, digit, index) => {
    let value = Number(digit) * (index % 2 === 0 ? 2 : 1);
    if (value > 9) value -= 9;
    return total + value;
  }, 0);
  return (10 - sum % 10) % 10;
}

function identityMethodLabel(method) {
  return {
    bankid: "BankID",
    physical_id: "ID-kort kontrollerat på plats"
  }[method] || "Ej angivet";
}

function informationStatusLabel(status) {
  return ({
    provided: "Information lämnad",
    pending: "Information ska lämnas",
    not_applicable: "Ej aktuell"
  })[status] || "Ej angivet";
}

function statusClass(candidate) {
  if (candidate.status === "Godkänd") {
    return "badge rounded-pill text-bg-success";
  }
  if (isComplete(candidate)) {
    return "badge rounded-pill text-bg-primary";
  }
  if (isBlocked(candidate)) {
    return "badge rounded-pill text-bg-warning";
  }
  return "badge rounded-pill text-bg-secondary";
}

function formatDate(value) {
  if (!value) return "Saknas";
  return new Intl.DateTimeFormat("sv-SE").format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Saknas";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysSinceText(value) {
  if (!value) return "Skapat datum saknas";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? "Skapat idag" : `Skapat för ${days} dagar sedan`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

for (const status of STATUSES) {
  const option = document.createElement("option");
  option.value = status;
  option.textContent = status;
  els.statusFilter.append(option);
}

function openCandidateModal() {
  candidateModal.show();
}

function openHandlerModal(handler = null) {
  els.handlerForm.reset();
  els.handlerEmailInput.setCustomValidity("");
  els.handlerIdInput.value = handler?.id || "";
  els.handlerNameInput.value = handler?.name || "";
  els.handlerEmailInput.value = handler?.email || "";
  els.handlerRoleInput.value = handler?.role || "Handläggare";
  els.handlerActiveInput.checked = handler ? Boolean(handler.active) : true;
  els.handlerModalTitle.textContent = handler ? "Redigera handläggare" : "Ny handläggare";
  handlerModal.show();
}

els.testUserTypeSelect.addEventListener("change", () => {
  const nextType = els.testUserTypeSelect.value;
  if (!TEST_USER_TYPES.has(nextType)) return;
  activeTestUserType = nextType;
  localStorage.setItem(TEST_USER_TYPE_KEY, nextType);
  if (nextType === "mentor") {
    selectedLearnerId = currentMentorUser()?.id || "";
    navigateTo("#/mentor-home");
  } else if (nextType === "public") {
    navigateTo("#/public-home");
  } else {
    dashboardQueueMode = "mine";
    navigateTo("#/dashboard");
  }
  renderAll();
});

els.mentorPortalView.addEventListener("submit", async (event) => {
  const form = event.target.closest("#mentorPortalReportForm");
  if (!form) return;
  event.preventDefault();
  const caseRecord = mentorAssignments().find((assignment) => assignment.id === form.dataset.caseId);
  if (!caseRecord || caseRecord.status === "closed") return;
  const formData = new FormData(form);
  const reportId = crypto.randomUUID();
  const actor = currentActorId();
  const occurredOn = String(formData.get("occurredOn") || "");
  await executeCaseCommand({
    commandType: "register_mentor_self_report",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { reportId, occurredOn },
    additionalStores: [MENTOR_REPORTS_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      put(MENTOR_REPORTS_STORE, {
        id: reportId,
        tenantId: DEFAULT_TENANT_ID,
        caseId: currentCase.id,
        mentorId: currentCase.mentorId,
        occurredOn,
        durationMinutes: Number(formData.get("durationMinutes")),
        mode: String(formData.get("mode") || "physical"),
        outcome: String(formData.get("outcome") || "completed"),
        nextContactOn: String(formData.get("nextContactOn") || "") || null,
        summary: String(formData.get("summary") || "").trim(),
        needsHandlerSupport: formData.get("needsHandlerSupport") === "on",
        reportedByMentorId: currentCase.mentorId,
        recordedBy: actor,
        createdAt: now,
        createdBy: actor
      });
      const updated = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: actor };
      put(CASES_STORE, updated);
      recordEvent("mentor_self_report_registered", "mentor_report", reportId, `Mentorn återrapporterade kontakt ${occurredOn}`);
      return { caseId: currentCase.id, version: updated.version };
    }
  });
  markSaved();
  showFeedback("Rapporten har skickats till handläggaren.");
  await refresh();
});

els.publicPortalView.addEventListener("click", (event) => {
  if (!event.target.closest("[data-new-public-support]")) return;
  lastPublicSupportRequestId = "";
  renderPublicSupport();
});

els.publicPortalView.addEventListener("submit", async (event) => {
  const form = event.target.closest("#publicSupportForm");
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const request = {
    id,
    tenantId: DEFAULT_TENANT_ID,
    reference: `FMP-${now.slice(0, 4)}-${id.slice(0, 6).toUpperCase()}`,
    name: String(formData.get("name") || "").trim(),
    contactMethod: String(formData.get("contactMethod") || "phone"),
    contact: String(formData.get("contact") || "").trim(),
    area: String(formData.get("area") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    supportAreaIds: normalizeSupportAreaIds(formData.getAll("publicSupportArea")),
    supportAreaUncertain: formData.get("supportAreaUncertain") === "yes",
    availability: String(formData.get("availability") || "").trim(),
    status: "received",
    createdAt: now,
    source: "public_portal"
  };
  await savePublicSupportRequest(request);
  lastPublicSupportRequestId = id;
  markSaved();
  await refresh();
});

els.navDashboard.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/dashboard");
});

els.navIntake.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/cases/incoming-contact");
});

els.navPresentation.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/presentation");
});

els.navCases.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/cases");
});

els.navMatchings.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/cases/matching");
});

els.navAssignments.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/cases/mentor-assignment");
});

els.navCandidates.addEventListener("click", (event) => {
  event.preventDefault();
  resetMentorFilters();
  navigateTo("#/mentors");
});

els.navAdministration.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/administration");
});

els.navSupportAdmin.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/support-admin");
});

els.supportOffcanvas.addEventListener("shown.bs.offcanvas", () => {
  sessionStorage.setItem(SUPPORT_PANEL_SESSION_KEY, "true");
  els.supportQuestionInput.focus();
});

els.supportOffcanvas.addEventListener("hidden.bs.offcanvas", () => {
  sessionStorage.removeItem(SUPPORT_PANEL_SESSION_KEY);
});

els.supportQuestionInput.addEventListener("input", () => {
  els.supportQuestionInput.setCustomValidity("");
});

els.supportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = els.supportQuestionInput.value.trim();
  if (!question) return;
  if (containsSensitivePersonalData(question)) {
    els.supportQuestionInput.setCustomValidity("Ta bort personnummer eller känsliga registeruppgifter innan frågan skickas.");
    els.supportQuestionInput.reportValidity();
    return;
  }
  els.supportQuestionInput.setCustomValidity("");
  appendSupportMessage("user", question);
  els.askSupportButton.disabled = true;
  els.supportStatus.textContent = "Söker i systemstödet…";
  const answer = await askSupport(question);
  lastSupportExchange = { question, answer, context: supportContext() };
  appendSupportMessage("assistant", answer.answer, answer);
  els.supportQuestionInput.value = "";
  els.askSupportButton.disabled = false;
  els.supportStatus.textContent = answer.mode === "ai" ? "Svar från AI-supporten." : "Lokalt svar; AI-tjänsten är inte aktiverad.";
  els.supportTicketActions.hidden = false;
});

els.createSupportTicketButton.addEventListener("click", async () => {
  if (!lastSupportExchange) return;
  const now = new Date().toISOString();
  const actor = currentUser();
  const ticket = {
    id: crypto.randomUUID(),
    tenantId: DEFAULT_TENANT_ID,
    category: lastSupportExchange.answer.category || "general",
    status: "new",
    question: lastSupportExchange.question,
    answer: lastSupportExchange.answer.answer,
    answerMode: lastSupportExchange.answer.mode,
    contextView: lastSupportExchange.context.view,
    contextRoute: lastSupportExchange.context.route,
    contextRole: lastSupportExchange.context.role,
    reporterId: actor.id,
    reporterName: actor.name,
    createdAt: now,
    updatedAt: now
  };
  await saveSupportTicket(ticket);
  supportTickets.unshift(ticket);
  els.supportTicketActions.hidden = true;
  const email = document.createElement("a");
  const emailSubject = encodeURIComponent(`Support: ${supportCategoryLabel(ticket.category)}`);
  const emailBody = encodeURIComponent(`${ticket.question}\n\nAktuell vy: ${ticket.contextRoute}`);
  email.href = `mailto:support@programenta.se?subject=${emailSubject}&body=${emailBody}`;
  email.textContent = "Skicka även via e-post";
  const notice = document.createElement("div");
  notice.className = "support-message support-message-assistant";
  notice.append("Supportärendet är sparat i prototypens lokala supportkö. ", email);
  els.supportConversation.append(notice);
  markSaved();
});

els.supportTicketStatusFilter.addEventListener("change", () => {
  supportTicketStatusFilter = els.supportTicketStatusFilter.value;
  renderSupportAdministration();
});

els.supportTicketTableBody.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-support-ticket-status]");
  if (!select) return;
  const ticket = supportTickets.find((item) => item.id === select.dataset.supportTicketStatus);
  if (!ticket) return;
  ticket.status = select.value;
  ticket.updatedAt = new Date().toISOString();
  ticket.updatedBy = currentActorId();
  await saveSupportTicket(ticket);
  renderSupportAdministration();
  markSaved();
});

els.publicSupportRequestTableBody?.addEventListener("click", async (event) => {
  const intakeButton = event.target.closest("[data-create-intake-from-public-support]");
  if (intakeButton) {
    const request = publicSupportRequests.find((item) => item.id === intakeButton.dataset.createIntakeFromPublicSupport);
    if (request) await createIncomingContactFromPublicSupportRequest(request);
    return;
  }
  const openButton = event.target.closest("[data-open-incoming-contact]");
  if (openButton) openIncomingContact(openButton.dataset.openIncomingContact);
});

els.navHandlers.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/administration");
});

els.navRoutines.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/routines");
});

els.navVersions.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/versions");
});

els.copyRoutinesLinkButton.addEventListener("click", async () => {
  const route = window.location.hash.startsWith("#/routines") ? window.location.hash : "#/routines";
  const url = `${window.location.origin}${window.location.pathname}${route}`;
  try {
    await navigator.clipboard.writeText(url);
    els.copyRoutinesLinkButton.textContent = "Länk kopierad";
    window.setTimeout(() => {
      els.copyRoutinesLinkButton.textContent = "Kopiera länk";
    }, 1800);
  } catch {
    showFeedback("Länken kunde inte kopieras automatiskt.");
  }
});

els.routinesSearchInput.addEventListener("input", searchRoutines);
els.clearRoutinesSearchButton.addEventListener("click", () => {
  els.routinesSearchInput.value = "";
  searchRoutines();
  els.routinesSearchInput.focus();
});

els.openActionQueueButton.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/cases");
});

els.dashboardMentorRegisterLink.addEventListener("click", (event) => {
  event.preventDefault();
  resetMentorFilters();
  navigateTo("#/mentors");
});

els.navIncomingContact.addEventListener("click", () => openIncomingContact());
els.mobileIncomingContact.addEventListener("click", () => openIncomingContact());
els.dashboardIncomingContactButton.addEventListener("click", () => openIncomingContact());
els.newIncomingContactButton.addEventListener("click", () => openIncomingContact());
els.parentIncomingContactButton.addEventListener("click", () => openIncomingContact(null, selectedParent()?.id));
els.incomingContactTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-incoming-contact]");
  if (button) openIncomingContact(button.dataset.openIncomingContact);
});
els.incomingContactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existing = incomingContactById(activeIncomingContactId);
  const now = new Date().toISOString();
  let contact = {
    ...(existing || {}), id: existing?.id || crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID,
    occurredAt: existing?.occurredAt || incomingContactStartedAt || now,
    channel: els.incomingContactChannelInput.value, contactDetails: els.incomingContactDetailsInput.value.trim(),
    parentName: els.incomingContactParentNameInput.value.trim(), callerType: els.incomingContactCallerTypeInput.value,
    summary: els.incomingContactSummaryInput.value.trim(), parentId: incomingContactParentId || null,
    caseId: existing?.caseId || null, status: existing?.status || "registered",
    receivedBy: existing?.receivedBy || CURRENT_USER_ID, registeredBy: existing?.registeredBy || CURRENT_USER_ID,
    createdAt: existing?.createdAt || now, createdBy: existing?.createdBy || CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID
  };
  contact.nextStep = els.incomingContactNextStepInput.value.trim();
  contact.parentId = existing?.parentId || incomingContactParentId || null;
  const existingIntakeCase = contact.intakeCaseId ? incomingContactCasePatch(contact, now) : null;
  const intakeCase = contact.intakeCaseId ? { contact, records: existingIntakeCase ? { [CASES_STORE]: [existingIntakeCase] } : {} } : await createIncomingContactCase(contact, now);
  contact = intakeCase.contact;
  await atomicPut({ [INCOMING_CONTACTS_STORE]: [contact], ...intakeCase.records });
  await refresh();
  showIncomingContactNextStep(incomingContactById(contact.id));
  showFeedback("Den inkommande kontakten har sparats.");
});
els.incomingContactOpenCaseButton.addEventListener("click", () => {
  const contact = incomingContactById(activeIncomingContactId);
  bootstrap.Offcanvas.getOrCreateInstance(els.incomingContactOffcanvas).hide();
  if (contact?.intakeCaseId) navigateToCase(contact.intakeCaseId);
});
els.incomingContactFollowUpButton.addEventListener("click", async () => {
  const contact = incomingContactById(activeIncomingContactId);
  if (!contact) return;
  await updateIncomingContactHandling(contact, "needs_follow_up", { feedback: `Nästa steg: ${contact.nextStep}` });
  bootstrap.Offcanvas.getOrCreateInstance(els.incomingContactOffcanvas).hide();
  await refresh();
  showFeedback("Kontakten är markerad för uppföljning.");
});
els.incomingContactCreateCaseButton.addEventListener("click", () => {
  const contact = incomingContactById(activeIncomingContactId);
  const caseTypeId = els.incomingContactCaseTypeInput.value;
  if (!contact) return;
  if (!caseTypeId) {
    els.incomingContactCaseTypeInput.setCustomValidity("Välj vilken ärendetyp som ska skapas.");
    els.incomingContactCaseTypeInput.reportValidity();
    return;
  }
  els.incomingContactCaseTypeInput.setCustomValidity("");
  pendingIncomingContactId = contact.id;
  newCaseTypePreset = caseTypeId;
  els.caseCreateForm.dataset.route = "";
  bootstrap.Offcanvas.getOrCreateInstance(els.incomingContactOffcanvas).hide();
  navigateTo("#/case/new");
});
els.incomingContactCaseTypeInput.addEventListener("change", () => els.incomingContactCaseTypeInput.setCustomValidity(""));
els.incomingContactCloseButton.addEventListener("click", async () => {
  const contact = incomingContactById(activeIncomingContactId);
  if (!contact) return;
  await updateIncomingContactHandling(contact, "closed", { closeCase: true, feedback: "Kontakten avslutades utan fortsatt handläggning." });
  bootstrap.Offcanvas.getOrCreateInstance(els.incomingContactOffcanvas).hide();
  await refresh();
  showFeedback("Kontakten har avslutats. Historiken finns kvar.");
});

els.caseSearchInput.addEventListener("input", () => {
  caseSearchTerm = els.caseSearchInput.value;
  casePage = 1;
  renderCases();
});

els.caseTypeFilter.addEventListener("change", () => {
  caseTypeFilter = els.caseTypeFilter.value;
  casePage = 1;
  navigateTo(caseListRoute());
});

els.caseStatusFilter.addEventListener("change", () => {
  caseStatusFilter = els.caseStatusFilter.value;
  casePage = 1;
  navigateTo(caseListRoute());
});

els.parentSearchInput.addEventListener("input", () => {
  parentSearchTerm = els.parentSearchInput.value;
  renderParents();
});

els.newParentButton.addEventListener("click", navigateToNewParent);
els.editParentButton.addEventListener("click", () => {
  parentEditMode = true;
  els.parentForm.dataset.route = "";
  renderParentDetail();
});
els.newParentSupportCaseButton.addEventListener("click", () => {
  const parent = selectedParent();
  if (parent) navigateToNewParentCase(parent.id);
});
els.cancelParentButton.addEventListener("click", () => {
  if (selectedParentId === "new") navigateTo("#/parents");
  else {
    parentEditMode = false;
    els.parentForm.dataset.route = "";
    renderParentDetail();
  }
});
els.createInitialSupportCaseInput.addEventListener("change", () => {
  const enabled = els.createInitialSupportCaseInput.checked;
  els.initialSupportCaseFields.hidden = !enabled;
  els.initialSupportPurposeInput.required = enabled;
  els.initialSupportOutcomeInput.required = enabled;
});

els.parentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existing = selectedParent();
  const creating = selectedParentId === "new";
  const name = els.parentNameInput.value.trim();
  const contactDetails = els.parentContactInput.value.trim();
  const duplicate = parents.find((parent) => parent.id !== existing?.id
    && parent.name.localeCompare(name, "sv", { sensitivity: "base" }) === 0
    && parent.contactDetails.localeCompare(contactDetails, "sv", { sensitivity: "base" }) === 0);
  if (duplicate) {
    showFeedback(`En förälder med samma namn och kontaktuppgift finns redan: ${duplicate.name}.`);
    return;
  }
  const createSupportCase = creating && els.createInitialSupportCaseInput.checked;
  if (createSupportCase && (!els.initialSupportPurposeInput.value.trim() || !els.initialSupportOutcomeInput.value.trim())) {
    els.initialSupportPurposeInput.setCustomValidity(els.initialSupportPurposeInput.value.trim() ? "" : "Ange vilket stöd föräldern söker.");
    els.initialSupportOutcomeInput.setCustomValidity(els.initialSupportOutcomeInput.value.trim() ? "" : "Ange önskat resultat för stödet.");
    if (!els.initialSupportPurposeInput.reportValidity()) return;
    if (!els.initialSupportOutcomeInput.reportValidity()) return;
  }
  els.initialSupportPurposeInput.setCustomValidity("");
  els.initialSupportOutcomeInput.setCustomValidity("");
  const now = new Date().toISOString();
  const parentId = existing?.id || crypto.randomUUID();
  const parent = {
    ...(existing || {}), id: parentId, tenantId: DEFAULT_TENANT_ID, name, contactDetails,
    informationStatus: els.parentInformationStatusInput.value, area: els.parentAreaInput.value.trim(),
    languages: els.parentLanguagesInput.value.trim(), availability: els.parentAvailabilityInput.value.trim(),
    active: existing?.active !== false, version: Number(existing?.version || 0) + 1,
    createdAt: existing?.createdAt || now, createdBy: existing?.createdBy || CURRENT_USER_ID,
    updatedAt: now, updatedBy: CURRENT_USER_ID
  };
  const records = { [PARENTS_STORE]: [parent] };
  let supportCaseId = null;
  if (createSupportCase) {
    supportCaseId = crypto.randomUUID();
    const supportCaseNumber = await reserveCaseNumber();
    const caseType = caseTypeById("parent-support");
    const supportCase = {
      id: supportCaseId, tenantId: DEFAULT_TENANT_ID, number: supportCaseNumber,
      caseTypeId: caseType.id, caseTypeVersion: caseType.version, organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID,
      type: caseType.name, title: els.initialSupportPurposeInput.value.trim(), description: els.initialSupportDescriptionInput.value.trim(),
      details: { supportPurpose: els.initialSupportPurposeInput.value.trim(), desiredOutcome: els.initialSupportOutcomeInput.value.trim(), supportAreaIds: selectedSupportAreaIdsFrom(els.initialSupportAreaChoices, "initialSupportArea"), supportAreaStatus: selectedSupportAreaIdsFrom(els.initialSupportAreaChoices, "initialSupportArea").length ? "confirmed" : "to_confirm", area: parent.area || null, languages: parent.languages || null },
      mentorId: null, parentId, supportCaseId: null, sourceMatchingCaseId: null, status: "new", priority: "normal", dueDate: null,
      version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, closedAt: null, closedBy: null
    };
    const owner = { id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: supportCaseId, handlerId: CURRENT_USER_ID, role: "responsible", version: 1, assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null };
    const activities = (caseType.suggestedActivities || []).map((title, sortOrder) => ({ id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: supportCaseId, templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, templateVersion: 1, title, status: "not_started", resultCode: null, resultClassification: null, handlerIdOverride: null, waitingForParty: null, dueDate: null, sortOrder, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, completedAt: null, completedBy: null }));
    const eventRecord = caseEventRecord({ caseId: supportCaseId, eventType: "case_created", entityType: "case", entityId: supportCaseId, message: `Stödärende skapades tillsammans med förälderposten`, idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), now });
    records[CASES_STORE] = [supportCase];
    records[CASE_ASSIGNMENTS_STORE] = [owner];
    records[CASE_ACTIVITIES_STORE] = activities;
    records[CASE_EVENTS_STORE] = [eventRecord];
  }
  await atomicPut(records);
  if (supportCaseId && records[CASES_STORE]?.[0]) await saveSupportMatchingProfile(records[CASES_STORE][0]);
  parentEditMode = false;
  els.parentForm.dataset.route = "";
  markSaved();
  showFeedback(createSupportCase ? "Föräldern och stödärendet har registrerats." : existing ? "Förälderns uppgifter har sparats." : "Föräldern har registrerats utan stödärende.");
  await refresh();
  if (supportCaseId) navigateToCase(supportCaseId); else navigateToParent(parentId);
});

els.caseTransitionChoices.addEventListener("click", (event) => {
  const button = event.target.closest("[data-case-flow-action]");
  const caseRecord = selectedCaseRecord();
  if (!button || !caseRecord) return;
  const action = button.dataset.caseFlowAction;
  if (action === "edit_case") {
    caseEditMode = true;
    els.caseCreateForm.dataset.route = "";
    renderCaseDetail();
    requestAnimationFrame(() => els.caseDescriptionInput.focus());
    return;
  }
  if (action === "start_matching" && caseRecord.caseTypeId === "parent-support") {
    navigateToNewMatching(caseRecord.id);
    return;
  }
  if (action === "open_matching_details") {
    els.matchingDetails.open = true;
    requestAnimationFrame(() => els.matchingProposalInput.focus());
    return;
  }
  if (action === "create_assignment") {
    els.createAssignmentAfterMatchInput.checked = true;
    els.matchingOutcomeForm.requestSubmit();
    return;
  }
  if (action === "create_successor" && button.dataset.targetId) {
    pendingSourceCaseId = caseRecord.id;
    newCaseTypePreset = button.dataset.targetId;
    els.caseCreateForm.dataset.route = "";
    navigateTo("#/case/new");
    return;
  }
  if (action === "open_followup") {
    bootstrap.Tab.getOrCreateInstance(document.querySelector("#assignment-followup-tab")).show();
    return;
  }
  if (action === "expand_secondary") {
    els.caseSecondaryDetails.open = true;
    requestAnimationFrame(() => els.caseSecondaryDetails.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
  if (action === "open_activities") {
    const firstOpenActivity = activitiesForCase(caseRecord.id).find((activity) => !["completed", "not_applicable"].includes(activity.status));
    if (firstOpenActivity) openCaseActivity(firstOpenActivity.id);
    else bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-activities-tab")).show();
    return;
  }
  if (action === "open_activity" && button.dataset.targetId) {
    openCaseActivity(button.dataset.targetId);
    return;
  }
  if ((action === "open_mentor_next" || action === "view_mentor") && button.dataset.targetId) {
    if (action === "open_mentor_next") pendingNextActionId = button.dataset.targetId;
    navigateToCandidate(button.dataset.targetId);
    return;
  }
  if (action === "open_case" || action === "open_support_case") {
    if (button.dataset.targetId) navigateToCase(button.dataset.targetId);
    return;
  }
  if (action === "close_case") openCaseLifecycle("close");
});

els.assignmentNextStepActions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-assignment-followup-action]");
  const caseRecord = selectedCaseRecord();
  if (!button || !caseRecord || caseRecord.caseTypeId !== "mentor-assignment") return;
  const action = button.dataset.assignmentFollowupAction;
  if (["expand_history", "open_plan", "new_report", "new_checkin"].includes(action)) {
    els.assignmentFollowupDetails.open = true;
  }
  if (action === "open_plan") {
    requestAnimationFrame(() => els.assignmentStartDateInput.focus());
    return;
  }
  if (action === "new_report") {
    els.newMentorReportButton.click();
    return;
  }
  if (action === "new_checkin") {
    els.newParentCheckInButton.click();
    return;
  }
  if (action === "create_followup") {
    pendingSourceCaseId = caseRecord.id;
    newCaseTypePreset = button.dataset.targetId || "mentor-follow-up";
    els.caseCreateForm.dataset.route = "";
    navigateTo("#/case/new");
    return;
  }
  if (action === "open_case" && button.dataset.targetId) navigateToCase(button.dataset.targetId);
});

els.matchingOutcomeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matchingCase = selectedCaseRecord();
  if (!matchingCase || matchingCase.caseTypeId !== "matching") return;
  const returnActivityId = caseRouteIntent === "matching" ? caseRouteTargetId : "";
  const matchingProposal = els.matchingProposalInput.value.trim();
  const parentResponse = els.parentMatchResponseInput.value;
  const mentorResponse = els.mentorMatchResponseInput.value;
  if (!matchingProposal && !parentResponse && !mentorResponse) {
    els.matchingProposalInput.setCustomValidity("Dokumentera matchningsförslaget eller registrera minst ett svar.");
    els.matchingProposalInput.reportValidity();
    return;
  }
  els.matchingProposalInput.setCustomValidity("");
  const outcome = matchingOutcome(parentResponse, mentorResponse);
  const note = els.matchingOutcomeNoteInput.value.trim();
  if (outcome === "declined" && !note) {
    els.matchingOutcomeNoteInput.setCustomValidity("Ange en kort neutral notering när någon tackar nej.");
    els.matchingOutcomeNoteInput.reportValidity();
    return;
  }
  els.matchingOutcomeNoteInput.setCustomValidity("");
  const createAssignment = outcome === "accepted" && els.createAssignmentAfterMatchInput.checked;
  const supportCase = caseSupportCase(matchingCase);
  const ownerId = responsibleHandler(matchingCase)?.id || CURRENT_USER_ID;
  if (createAssignment && !canCreateMentorAssignment({
    ...matchingCase,
    details: { ...(matchingCase.details || {}), parentResponse, mentorResponse }
  })) {
    showFeedback("Uppdraget kan inte skapas förrän stödärende, förälder, mentor och båda parters godkännande är registrerade.");
    return;
  }
  if (createAssignment) {
    const overlap = cases.find((item) => item.caseTypeId === "mentor-assignment" && item.parentId === matchingCase.parentId && item.status !== "closed");
    if (overlap) {
      const confirmation = await confirmAction({ eyebrow: "Samtidiga uppdrag", title: "Skapa ytterligare ett aktivt uppdrag?", body: `${caseParent(matchingCase)?.name || "Föräldern"} har redan uppdraget ${overlap.number}. Kontrollera att stödärendena har olika syften och dokumentera hur kontakterna ska samordnas.`, mentorName: caseMentor(matchingCase)?.name || "Mentor", confirmLabel: "Skapa ytterligare uppdrag" });
      if (!confirmation.confirmed) return;
    }
    const supportAreaIds = supportAreaIdsForCase(supportCase);
    const confirmation = await confirmAction({
      eyebrow: "Matchning till uppdrag",
      title: "Skapa mentoruppdrag?",
      body: "Matchningen stängs som godkänd och ett nytt mentoruppdrag skapas med koppling till stödärendet, föräldern och mentorn.",
      subjectLabel: "Matchning",
      subjectValue: matchingCase.number,
      confirmLabel: "Skapa uppdrag",
      summaryItems: [
        { label: "Förälder", value: caseParent(matchingCase)?.name || "Saknas" },
        { label: "Mentor", value: caseMentor(matchingCase)?.name || "Saknas" },
        { label: "Stödärende", value: supportCase ? `${supportCase.number} · ${supportCase.details?.supportPurpose || supportCase.title}` : "Saknas" },
        { label: "Stödområden", value: supportAreaLabels(supportAreaIds).join(", ") || "Behöver kompletteras" }
      ]
    });
    if (!confirmation.confirmed) return;
  }
  let createdAssignmentId = null;
  const assignmentCaseNumber = createAssignment ? await reserveCaseNumber() : null;
  await executeCaseCommand({
    commandType: createAssignment ? "accept_match_and_create_assignment" : "save_matching_outcome",
    caseId: matchingCase.id,
    expectedVersion: matchingCase.version,
    payload: { matchingProposal, parentResponse, mentorResponse, note, createAssignment },
    additionalStores: [CASE_ASSIGNMENTS_STORE, CASE_ACTIVITIES_STORE, CASE_DOCUMENTS_STORE],
    mutate: ({ currentCase, now, correlationId, idempotencyKey, put, event: recordEvent }) => {
      const details = { ...(currentCase.details || {}), matchingProposal, parentResponse, mentorResponse, matchingNote: note, matchingOutcome: outcome };
      const finalizesMatch = outcome === "declined" || createAssignment;
      const updated = { ...currentCase, details, status: finalizesMatch ? "closed" : outcome === "waiting" ? "waiting" : "in_progress", version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID, closedAt: finalizesMatch ? now : null, closedBy: finalizesMatch ? CURRENT_USER_ID : null };
      put(CASES_STORE, updated);
      recordEvent("matching_outcome_saved", "case", currentCase.id, `Matchningsutfall registrerat: ${outcome}`);
      const matchingActivities = activitiesForCase(currentCase.id);
      const responseActivity = matchingActivities.find((activity) => activity.templateId === "matchingPartyResponses");
      const decisionActivity = matchingActivities.find((activity) => activity.templateId === "matchingDecision");
      const automaticallyHandledActivityIds = new Set();
      const responseResult = parentResponse === "accepted" && mentorResponse === "accepted"
        ? "both_accept"
        : parentResponse === "declined" && mentorResponse === "declined"
          ? "both_decline"
          : parentResponse === "declined"
            ? "parent_declines"
            : mentorResponse === "declined"
              ? "mentor_declines"
              : null;
      if (responseActivity) {
        const completed = Boolean(responseResult);
        put(CASE_ACTIVITIES_STORE, {
          ...responseActivity,
          status: completed ? "completed" : outcome === "waiting" ? "waiting" : "in_progress",
          resultCode: completed ? responseResult : null,
          resultClassification: completed ? resultClassification(responseActivity.templateId, responseResult) : null,
          waitingForParty: outcome === "waiting" ? "external" : null,
          version: responseActivity.version + 1,
          updatedAt: now,
          updatedBy: CURRENT_USER_ID,
          completedAt: completed ? now : null,
          completedBy: completed ? CURRENT_USER_ID : null
        });
        automaticallyHandledActivityIds.add(responseActivity.id);
        if (note) {
          put(CASE_DOCUMENTS_STORE, {
            id: crypto.randomUUID(), tenantId: currentCase.tenantId, caseId: currentCase.id,
            activityId: responseActivity.id, meetingId: null, type: "service_note",
            title: "Tjänsteanteckning: parternas återkoppling", description: note,
            documentDate: now.slice(0, 10), storageObjectId: null, fileName: null, mimeType: null,
            sizeBytes: null, checksum: null, informationClass: "normal", supersedesDocumentId: null,
            createdAt: now, createdBy: CURRENT_USER_ID
          });
        }
      }
      if (decisionActivity && finalizesMatch) {
        const decisionResult = createAssignment ? "match_approved" : "match_rejected";
        put(CASE_ACTIVITIES_STORE, {
          ...decisionActivity, status: "completed", resultCode: decisionResult,
          resultClassification: resultClassification(decisionActivity.templateId, decisionResult),
          waitingForParty: null, version: decisionActivity.version + 1, updatedAt: now,
          updatedBy: CURRENT_USER_ID, completedAt: now, completedBy: CURRENT_USER_ID
        });
        automaticallyHandledActivityIds.add(decisionActivity.id);
      }
      if (finalizesMatch) {
        for (const activity of matchingActivities.filter((item) => !automaticallyHandledActivityIds.has(item.id) && !["completed", "not_applicable"].includes(item.status))) {
          put(CASE_ACTIVITIES_STORE, { ...activity, status: "not_applicable", version: activity.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID });
        }
      }
      if (!createAssignment) return { caseId: currentCase.id, version: updated.version };
      createdAssignmentId = crypto.randomUUID();
      const assignmentType = caseTypeById("mentor-assignment");
      const frozenMatchingBasis = matchingSnapshot(currentCase.id);
      const assignmentSupportAreaIds = frozenMatchingBasis?.supportProfile?.supportAreas?.map((entry) => entry.supportAreaId) || supportAreaIdsForCase(supportCase);
      const assignmentCase = { id: createdAssignmentId, tenantId: DEFAULT_TENANT_ID, number: assignmentCaseNumber, caseTypeId: assignmentType.id, caseTypeVersion: assignmentType.version, organizationUnitId: currentCase.organizationUnitId, type: assignmentType.name, title: `Mentoruppdrag: ${supportCase?.details?.supportPurpose || supportCase?.title || currentCase.title}`, description: supportCase?.details?.desiredOutcome || currentCase.description, details: { supportPurpose: supportCase?.details?.supportPurpose || null, desiredOutcome: supportCase?.details?.desiredOutcome || null, supportAreaIds: normalizeSupportAreaIds(assignmentSupportAreaIds), matchingSnapshotId: frozenMatchingBasis?.id || null }, mentorId: currentCase.mentorId, parentId: currentCase.parentId, supportCaseId: currentCase.supportCaseId, sourceMatchingCaseId: currentCase.id, status: "new", priority: currentCase.priority || "normal", dueDate: null, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, closedAt: null, closedBy: null };
      put(CASES_STORE, assignmentCase);
      put(CASE_ASSIGNMENTS_STORE, { id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: createdAssignmentId, handlerId: ownerId, role: "responsible", version: 1, assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null });
      for (const [sortOrder, title] of (assignmentType.suggestedActivities || []).entries()) {
        put(CASE_ACTIVITIES_STORE, { id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: createdAssignmentId, templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, templateVersion: 1, title, status: "not_started", resultCode: null, resultClassification: null, handlerIdOverride: null, waitingForParty: null, dueDate: null, sortOrder, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, completedAt: null, completedBy: null });
      }
      put(CASE_EVENTS_STORE, caseEventRecord({ caseId: createdAssignmentId, eventType: "assignment_created_from_matching", entityType: "case", entityId: createdAssignmentId, message: `Uppdrag skapades från matchning ${currentCase.number}`, idempotencyKey, correlationId, now }));
      return { caseId: currentCase.id, version: updated.version, assignmentCaseId: createdAssignmentId };
    }
  });
  markSaved();
  if (!createdAssignmentId && returnActivityId) {
    window.history.replaceState(null, "", resolveFeatureRoute("case.activity", { caseId: matchingCase.id, activityId: returnActivityId }));
    selectedCaseActivityId = returnActivityId;
    caseRouteIntent = "activities";
    caseRouteTargetId = returnActivityId;
  }
  await refresh();
  showFeedback(createAssignment ? "Matchningen har accepterats och mentoruppdraget har skapats." : "Matchningsunderlaget har sparats.");
  if (createdAssignmentId) navigateToCase(createdAssignmentId);
});

els.assignmentPlanForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord || caseRecord.caseTypeId !== "mentor-assignment") return;
  if (els.assignmentEndDateInput.value < els.assignmentStartDateInput.value) {
    els.assignmentEndDateInput.setCustomValidity("Slutdatum får inte ligga före startdatum.");
    els.assignmentEndDateInput.reportValidity();
    return;
  }
  els.assignmentEndDateInput.setCustomValidity("");
  const firstFollowUp = els.assignmentFirstFollowUpInput.value;
  if (firstFollowUp && (firstFollowUp < els.assignmentStartDateInput.value || firstFollowUp > els.assignmentEndDateInput.value)) {
    els.assignmentFirstFollowUpInput.setCustomValidity("Första föräldraavstämningen ska ligga inom uppdragstiden.");
    els.assignmentFirstFollowUpInput.reportValidity();
    return;
  }
  els.assignmentFirstFollowUpInput.setCustomValidity("");
  await executeCaseCommand({
    commandType: "save_assignment_plan",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { startDate: els.assignmentStartDateInput.value, endDate: els.assignmentEndDateInput.value },
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      const assignmentPlan = {
        startDate: els.assignmentStartDateInput.value,
        endDate: els.assignmentEndDateInput.value,
        contactFrequency: els.assignmentContactFrequencyInput.value,
        contactMode: els.assignmentContactModeInput.value,
        firstFollowUpDate: els.assignmentFirstFollowUpInput.value,
        followUpFrequency: els.assignmentFollowUpFrequencyInput.value,
        reportDeadlineDays: Number(els.assignmentReportDeadlineInput.value),
        note: els.assignmentPlanNoteInput.value.trim(),
        updatedAt: now,
        updatedBy: CURRENT_USER_ID
      };
      const updated = { ...currentCase, details: { ...(currentCase.details || {}), assignmentPlan }, status: currentCase.status === "new" ? "in_progress" : currentCase.status, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updated);
      recordEvent("assignment_plan_saved", "case", currentCase.id, "Uppdragsplanen uppdaterades");
      return { caseId: currentCase.id, version: updated.version };
    }
  });
  markSaved();
  showFeedback("Uppdragsplanen har sparats.");
  await refresh();
});

els.newMentorReportButton.addEventListener("click", () => {
  els.mentorReportForm.reset();
  els.mentorReportDateInput.value = new Date().toISOString().slice(0, 10);
  els.mentorReportForm.hidden = false;
  els.mentorReportDateInput.focus();
});
els.cancelMentorReportButton.addEventListener("click", () => { els.mentorReportForm.hidden = true; });

els.mentorReportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord || caseRecord.caseTypeId !== "mentor-assignment") return;
  const linkedActivity = caseActivities.find((activity) => activity.id === caseRouteTargetId
    && activity.caseId === caseRecord.id
    && activityWorkInputDefinition(activity, caseRecord.caseTypeId)?.kind === "assignment_evidence");
  const reportId = crypto.randomUUID();
  await executeCaseCommand({
    commandType: "register_mentor_report",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { reportId, occurredOn: els.mentorReportDateInput.value },
    additionalStores: [MENTOR_REPORTS_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      put(MENTOR_REPORTS_STORE, {
        id: reportId, tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, mentorId: currentCase.mentorId,
        activityId: linkedActivity?.id || null,
        occurredOn: els.mentorReportDateInput.value, durationMinutes: Number(els.mentorReportDurationInput.value),
        mode: els.mentorReportModeInput.value, outcome: els.mentorReportOutcomeInput.value,
        nextContactOn: els.mentorReportNextDateInput.value || null, summary: els.mentorReportSummaryInput.value.trim(),
        needsHandlerSupport: els.mentorReportNeedsSupportInput.checked, reportedByMentorId: currentCase.mentorId,
        recordedBy: CURRENT_USER_ID, createdAt: now, createdBy: CURRENT_USER_ID
      });
      const updated = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updated);
      recordEvent("mentor_report_registered", "mentor_report", reportId, `Mentorrapport registrerades för ${els.mentorReportDateInput.value}`);
      return { caseId: currentCase.id, version: updated.version };
    }
  });
  els.mentorReportForm.hidden = true;
  markSaved();
  showFeedback("Mentorrapporten har registrerats.");
  await refresh();
});

els.newParentCheckInButton.addEventListener("click", () => {
  els.parentCheckInForm.reset();
  els.parentCheckInDateInput.value = new Date().toISOString().slice(0, 10);
  els.parentCheckInForm.hidden = false;
  els.parentCheckInDateInput.focus();
});
els.cancelParentCheckInButton.addEventListener("click", () => { els.parentCheckInForm.hidden = true; });

els.parentCheckInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord || caseRecord.caseTypeId !== "mentor-assignment") return;
  const requiresNote = els.parentContactConfirmedInput.value !== "yes"
    || els.parentCollaborationInput.value !== "well"
    || els.parentRelevanceInput.value !== "yes"
    || els.parentSafetyInput.value !== "yes"
    || els.parentContinueInput.value !== "continue";
  const note = els.parentCheckInNoteInput.value.trim();
  els.parentCheckInNoteInput.setCustomValidity(requiresNote && !note ? "Beskriv kort vad som avviker och vad som ska hända härnäst." : "");
  if (!els.parentCheckInForm.reportValidity()) return;
  const linkedActivity = caseActivities.find((activity) => activity.id === caseRouteTargetId
    && activity.caseId === caseRecord.id
    && activityWorkInputDefinition(activity, caseRecord.caseTypeId)?.kind === "parent_checkin");
  const checkInId = crypto.randomUUID();
  await executeCaseCommand({
    commandType: "register_parent_checkin",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { checkInId, occurredOn: els.parentCheckInDateInput.value },
    additionalStores: [PARENT_CHECK_INS_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      put(PARENT_CHECK_INS_STORE, {
        id: checkInId, tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, parentId: currentCase.parentId,
        activityId: linkedActivity?.id || null,
        occurredOn: els.parentCheckInDateInput.value, mode: els.parentCheckInModeInput.value,
        contactConfirmed: els.parentContactConfirmedInput.value, collaboration: els.parentCollaborationInput.value,
        relevance: els.parentRelevanceInput.value, safety: els.parentSafetyInput.value,
        continueStatus: els.parentContinueInput.value, note,
        createdAt: now, createdBy: CURRENT_USER_ID
      });
      const updated = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updated);
      recordEvent("parent_checkin_registered", "parent_checkin", checkInId, `Föräldraavstämning registrerades för ${els.parentCheckInDateInput.value}`);
      return { caseId: currentCase.id, version: updated.version };
    }
  });
  els.parentCheckInForm.hidden = true;
  markSaved();
  showFeedback("Föräldraavstämningen har registrerats.");
  await refresh();
});

els.newCompensationPeriodButton.addEventListener("click", () => {
  els.compensationPeriodForm.reset();
  const today = new Date();
  els.compensationPeriodFromInput.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  els.compensationPeriodToInput.value = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  els.compensationPeriodForm.hidden = false;
  els.compensationPeriodFromInput.focus();
});
els.cancelCompensationPeriodButton.addEventListener("click", () => { els.compensationPeriodForm.hidden = true; });

els.compensationNextStepActions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-compensation-next-action]");
  if (!button) return;
  const action = button.dataset.compensationNextAction;
  if (["open_details", "new_period", "approve_period", "mark_paid"].includes(action)) els.compensationDetails.open = true;
  if (action === "new_period") {
    els.newCompensationPeriodButton.click();
    return;
  }
  if (action === "new_report" || action === "new_checkin") {
    els.assignmentFollowupDetails.open = true;
    if (action === "new_report") els.newMentorReportButton.click();
    else els.newParentCheckInButton.click();
    return;
  }
  if (["approve_period", "mark_paid"].includes(action) && button.dataset.targetId) {
    const datasetKey = action === "approve_period" ? "compensationApprove" : "compensationPaid";
    const target = [...els.compensationPeriodsTableBody.querySelectorAll("button")]
      .find((item) => item.dataset[datasetKey] === button.dataset.targetId);
    target?.click();
  }
});

els.compensationPeriodForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord || caseRecord.caseTypeId !== "mentor-assignment") return;
  const periodFrom = els.compensationPeriodFromInput.value;
  const periodTo = els.compensationPeriodToInput.value;
  if (periodTo < periodFrom) {
    els.compensationPeriodToInput.setCustomValidity("Periodens slutdatum får inte ligga före startdatum.");
    els.compensationPeriodToInput.reportValidity();
    return;
  }
  els.compensationPeriodToInput.setCustomValidity("");
  const overlap = compensationPeriods.find((period) => period.caseId === caseRecord.id && !(periodTo < period.periodFrom || periodFrom > period.periodTo));
  if (overlap) {
    showFeedback(`Perioden överlappar ${formatDate(overlap.periodFrom)}–${formatDate(overlap.periodTo)}. Samma tid får inte ersättas två gånger.`);
    return;
  }
  const periodId = crypto.randomUUID();
  const draft = { id: periodId, caseId: caseRecord.id, periodFrom, periodTo };
  const evidence = compensationEvidence(draft);
  const status = compensationReadiness({ completedReportCount: evidence.reports.length, latestCheckIn: evidence.latestCheckIn });
  await executeCaseCommand({
    commandType: "create_compensation_period",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { periodId, periodFrom, periodTo },
    additionalStores: [COMPENSATION_PERIODS_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      put(COMPENSATION_PERIODS_STORE, { ...draft, tenantId: DEFAULT_TENANT_ID, status, version: 1, createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID });
      const updated = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updated);
      recordEvent("compensation_period_created", "compensation_period", periodId, `Ersättningsperiod skapades: ${periodFrom}–${periodTo}`);
      return { caseId: currentCase.id, version: updated.version };
    }
  });
  els.compensationPeriodForm.hidden = true;
  markSaved();
  showFeedback("Ersättningsperioden har skapats.");
  await refresh();
});

els.compensationPeriodsTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-compensation-approve], button[data-compensation-complete], button[data-compensation-paid]");
  if (!button) return;
  const periodId = button.dataset.compensationApprove || button.dataset.compensationComplete || button.dataset.compensationPaid;
  const period = compensationPeriods.find((item) => item.id === periodId);
  const caseRecord = selectedCaseRecord();
  if (!period || !caseRecord) return;
  const evidence = compensationEvidence(period);
  let nextStatus = "needs_completion";
  let commandType = "request_compensation_completion";
  let title = "Begär komplettering";
  let body = "Perioden markeras som ofullständig tills handläggaren har fått tillräckligt underlag.";
  let confirmLabel = "Begär komplettering";
  if (button.dataset.compensationApprove) {
    const assessment = assessCompensationApproval({ completedReportCount: evidence.reports.length, latestCheckIn: evidence.latestCheckIn });
    if (!assessment.allowed) {
      showFeedback(assessment.reasons.join(" "));
      return;
    }
    nextStatus = "approved";
    commandType = "approve_compensation_period";
    title = "Godkänn ersättningsperiod";
    body = `${evidence.reports.length} mentorrapporter och ${formatMinutes(evidence.minutes)} låses som ersättningsunderlag.`;
    confirmLabel = "Godkänn för ersättning";
  } else if (button.dataset.compensationPaid) {
    nextStatus = "paid";
    commandType = "mark_compensation_paid";
    title = "Markera perioden som utbetald";
    body = "Bekräfta först när utbetalningen har genomförts i kommunens ekonomiflöde.";
    confirmLabel = "Markera utbetald";
  }
  const confirmation = await confirmAction({ eyebrow: "Ersättningsunderlag", title, body, mentorName: caseMentor(caseRecord)?.name, confirmLabel, danger: nextStatus === "needs_completion" });
  if (!confirmation.confirmed) return;
  await executeCaseCommand({
    commandType,
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { periodId, nextStatus, note: confirmation.note },
    additionalStores: [COMPENSATION_PERIODS_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      const updatedPeriod = {
        ...period, status: nextStatus, version: Number(period.version || 1) + 1, updatedAt: now, updatedBy: CURRENT_USER_ID,
        decisionNote: confirmation.note || null,
        ...(nextStatus === "approved" ? { approvedAt: now, approvedBy: CURRENT_USER_ID, approvedMinutes: evidence.minutes, approvedReportIds: evidence.reports.map((item) => item.id), approvedCheckInId: evidence.latestCheckIn?.id || null } : {}),
        ...(nextStatus === "paid" ? { paidAt: now, paidBy: CURRENT_USER_ID } : {})
      };
      put(COMPENSATION_PERIODS_STORE, updatedPeriod);
      const updatedCase = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updatedCase);
      recordEvent(commandType, "compensation_period", period.id, `${compensationStatusLabels[nextStatus]}: ${period.periodFrom}–${period.periodTo}`);
      return { caseId: currentCase.id, version: updatedCase.version };
    }
  });
  markSaved();
  showFeedback(`Ersättningsperioden är nu ${compensationStatusLabels[nextStatus].toLocaleLowerCase("sv-SE")}.`);
  await refresh();
});

els.completeCaseButton.addEventListener("click", () => {
  caseEditMode = true;
  renderCaseDetail();
  requestAnimationFrame(() => els.caseDescriptionInput.focus());
});
els.pauseCaseButton.addEventListener("click", () => openCaseLifecycle("pause"));
els.resumeCaseButton.addEventListener("click", () => openCaseLifecycle("resume"));
els.closeCaseButton.addEventListener("click", () => openCaseLifecycle("close"));
els.reopenCaseButton.addEventListener("click", () => openCaseLifecycle("reopen"));

els.caseLifecycleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord || !pendingCaseLifecycleAction) return;
  try {
    await changeCaseLifecycleCommand({
      caseRecord,
      action: pendingCaseLifecycleAction,
      reasonCode: els.caseLifecycleReasonInput.value,
      note: els.caseLifecycleNoteInput.value,
      resumeAt: els.caseLifecycleResumeInput.value || null
    });
    caseLifecycleModal.hide();
    pendingCaseLifecycleAction = null;
    markSaved();
    showFeedback("Ärendets status har uppdaterats.");
    await refresh();
  } catch (error) {
    showFeedback(error.message);
  }
});

function compatibleRegistrationTargets(mentorId, caseTypeId, excludeCaseId = null) {
  const parentId = els.caseParentIdInput.value || null;
  const supportCaseId = els.caseSupportCaseInput.value || null;
  if (!mentorId && !parentId && !supportCaseId) return [];
  const organizationUnitId = els.caseOrganizationUnitInput.value || DEFAULT_ORGANIZATION_UNIT_ID;
  return cases.filter((caseRecord) => caseRecord.id !== excludeCaseId
    && caseRecord.tenantId === DEFAULT_TENANT_ID
    && caseRecord.organizationUnitId === organizationUnitId
    && (mentorId ? caseRecord.mentorId === mentorId : true)
    && (parentId ? caseRecord.parentId === parentId : true)
    && (supportCaseId ? caseRecord.supportCaseId === supportCaseId : true)
    && caseRecord.caseTypeId === caseTypeId
    && caseRecord.status !== "closed");
}

function renderRegistrationTargets() {
  if (caseEditMode || pendingSourceCaseId || !selectedCaseRecordId?.startsWith("new")) {
    els.caseDuplicatePanel.hidden = true;
    return;
  }
  const targets = compatibleRegistrationTargets(els.caseMentorIdInput.value, els.caseTypeInput.value);
  els.caseDuplicatePanel.hidden = targets.length === 0;
  els.caseDuplicatePanel.dataset.choice = "";
  if (!targets.length) return;
  const target = targets[0];
  els.caseDuplicatePanel.innerHTML = `
    <strong>Ett kompatibelt öppet ärende finns.</strong>
    <span class="d-block mb-2">${escapeHtml(target.number)} · ${escapeHtml(target.title)}</span>
    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-warning btn-sm" data-registration-target="${escapeHtml(target.id)}">Registrera i befintligt ärende</button>
      <button type="button" class="btn btn-outline-secondary btn-sm" data-registration-new>Skapa separat ärende</button>
    </div>`;
}

els.caseMentorInput.addEventListener("input", () => {
  const value = els.caseMentorInput.value.trim();
  const mentor = candidates.find((candidate) => candidate.name.localeCompare(value, "sv", { sensitivity: "base" }) === 0);
  els.caseMentorIdInput.value = mentor?.id || "";
  els.caseMentorInput.setCustomValidity("");
  const supportCase = cases.find((item) => item.id === els.caseSupportCaseInput.value && item.caseTypeId === "parent-support");
  const supportAreaIds = supportAreaIdsForCase(supportCase);
  const matches = value.length < 2
    ? []
    : candidates
      .filter((candidate) => !["matching", "mentor-assignment"].includes(els.caseTypeInput.value) || (candidate.status === "Godkänd" && candidate.active !== false))
      .filter((candidate) => candidate.name.toLocaleLowerCase("sv-SE").includes(value.toLocaleLowerCase("sv-SE")))
      .sort((a, b) => supportAreaOverlap(supportAreaIds, b.supportAreas).length - supportAreaOverlap(supportAreaIds, a.supportAreas).length || a.name.localeCompare(b.name, "sv"))
      .slice(0, 8);
  els.caseMentorSuggestions.innerHTML = "";
  els.caseMentorSuggestions.hidden = matches.length === 0 || Boolean(mentor);
  for (const candidate of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-group-item list-group-item-action";
    button.dataset.selectCaseMentor = candidate.id;
    const overlap = supportAreaOverlap(supportAreaIds, candidate.supportAreas);
    button.innerHTML = `<span class="d-block fw-semibold">${escapeHtml(candidate.name)}</span><small class="text-secondary">${supportAreaIds.length ? overlap.length ? `${overlap.length} matchande stödområden: ${escapeHtml(overlap.map((area) => area.title).join(", "))}` : "Ingen registrerad överlappning" : "Stödområden behöver anges i stödärendet"}</small>`;
    els.caseMentorSuggestions.append(button);
  }
  renderRegistrationTargets();
});

els.caseParentInput.addEventListener("input", () => {
  const value = els.caseParentInput.value.trim();
  const parent = parents.find((item) => item.name.localeCompare(value, "sv", { sensitivity: "base" }) === 0);
  els.caseParentIdInput.value = parent?.id || "";
  const matches = value.length < 2 ? [] : parents
    .filter((item) => item.active !== false && item.name.toLocaleLowerCase("sv-SE").includes(value.toLocaleLowerCase("sv-SE")))
    .slice(0, 8);
  els.caseParentSuggestions.innerHTML = "";
  els.caseParentSuggestions.hidden = !matches.length || Boolean(parent);
  for (const item of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-group-item list-group-item-action";
    button.dataset.selectCaseParent = item.id;
    button.textContent = item.name;
    els.caseParentSuggestions.append(button);
  }
});

els.caseParentSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-case-parent]");
  if (!button) return;
  const parent = parents.find((item) => item.id === button.dataset.selectCaseParent);
  if (!parent) return;
  els.caseParentInput.value = parent.name;
  els.caseParentIdInput.value = parent.id;
  els.caseParentSuggestions.hidden = true;
});

els.caseSupportCaseInput.addEventListener("change", () => {
  const supportCase = cases.find((item) => item.id === els.caseSupportCaseInput.value && item.caseTypeId === "parent-support");
  const parent = caseParent(supportCase);
  els.caseParentInput.value = parent?.name || "";
  els.caseParentIdInput.value = parent?.id || "";
  if (supportCase && !els.caseTitleInput.value.trim()) {
    els.caseTitleInput.value = `Matchning: ${supportCase.details?.supportPurpose || supportCase.title}`;
  }
});

els.caseTypeInput.addEventListener("change", () => {
  renderCaseTypeGuidance();
  renderRegistrationTargets();
});
els.caseOrganizationUnitInput.addEventListener("change", renderRegistrationTargets);

els.caseMentorSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-case-mentor]");
  if (!button) return;
  const mentor = candidates.find((candidate) => candidate.id === button.dataset.selectCaseMentor);
  if (!mentor) return;
  els.caseMentorInput.value = mentor.name;
  els.caseMentorIdInput.value = mentor.id;
  els.caseMentorSuggestions.hidden = true;
  els.caseMentorSuggestions.innerHTML = "";
  renderRegistrationTargets();
});

els.caseDuplicatePanel.addEventListener("click", (event) => {
  const targetButton = event.target.closest("[data-registration-target]");
  const newButton = event.target.closest("[data-registration-new]");
  if (!targetButton && !newButton) return;
  clearCaseFormError();
  els.caseDuplicatePanel.dataset.choice = targetButton ? targetButton.dataset.registrationTarget : "new";
  for (const button of els.caseDuplicatePanel.querySelectorAll("button")) button.classList.remove("active");
  (targetButton || newButton).classList.add("active");
});

els.previousCasePageButton.addEventListener("click", () => {
  casePage = Math.max(1, casePage - 1);
  renderCases();
});

els.nextCasePageButton.addEventListener("click", () => {
  casePage += 1;
  renderCases();
});

els.newGeneralCaseButton.addEventListener("click", () => {
  newCaseTypePreset = caseTypeFilter;
  els.caseCreateForm.dataset.route = "";
  navigateToNewCase();
});
els.newMentorCaseButton.addEventListener("click", () => {
  const candidate = selectedCandidate();
  if (candidate) navigateToNewCase(candidate.id);
});

els.editCaseButton.addEventListener("click", () => {
  caseEditMode = true;
  els.caseCreateForm.dataset.route = "";
  renderCaseDetail();
});

els.cancelCaseCreateButton.addEventListener("click", () => {
  newCaseTypePreset = "";
  pendingIncomingContactId = null;
  pendingSourceCaseId = null;
  if (caseEditMode) {
    caseEditMode = false;
    renderCaseDetail();
    return;
  }
  navigateTo("#/cases");
});

async function submitCaseForm(event) {
  event.preventDefault();
  clearCaseFormError();
  const existingCase = caseEditMode ? selectedCaseRecord() : null;
  const sourceIncomingContact = existingCase ? null : incomingContactById(pendingIncomingContactId);
  const sourceCase = existingCase ? null : cases.find((item) => item.id === pendingSourceCaseId);
  const returnActivityId = existingCase && caseRouteIntent === "edit" ? caseRouteTargetId : "";
  const id = existingCase?.id || crypto.randomUUID();
  const requestedMentorName = els.caseMentorInput.value.trim();
  const matchedMentor = candidates.find((candidate) => candidate.name.localeCompare(requestedMentorName, "sv", { sensitivity: "base" }) === 0);
  if (requestedMentorName && !matchedMentor) {
    els.caseMentorInput.setCustomValidity("Välj en mentor från förslagslistan.");
    showCaseFormError("Mentorn måste väljas från förslagslistan innan ärendet kan sparas.", els.caseMentorInput);
    els.caseMentorInput.reportValidity();
    return;
  }
  els.caseMentorInput.setCustomValidity("");
  const mentorId = matchedMentor?.id || null;
  els.caseMentorIdInput.value = mentorId || "";
  const caseType = caseTypeById(els.caseTypeInput.value, existingCase?.caseTypeVersion);
  if (!caseType) return;
  if (!existingCase && !canStartCaseType(caseType, currentCaseCreationContext())) {
    const creationPath = caseTypeCreationModeLabel(caseType.creationMode).toLowerCase();
    showCaseFormError(`${caseType.name} kan inte skapas som ett fristående ärende. Registreringen ska startas ${creationPath}.`, els.caseTypeInput);
    return;
  }
  if (caseType.mentorMode === "required" && !mentorId) {
    els.caseMentorInput.setCustomValidity("Välj en mentor från förslagslistan.");
    showCaseFormError("Den här ärendetypen kräver att en mentor väljs från förslagslistan.", els.caseMentorInput);
    els.caseMentorInput.reportValidity();
    return;
  }
  if (["matching", "mentor-assignment"].includes(caseType.id) && mentorId) {
    const selectedMentor = candidates.find((candidate) => candidate.id === mentorId);
    if (!selectedMentor || selectedMentor.status !== "Godkänd" || selectedMentor.active === false) {
      showCaseFormError("Matchning och uppdrag kräver en godkänd och aktiv mentor.", els.caseMentorInput);
      return;
    }
  }
  const requestedParentName = els.caseParentInput.value.trim();
  const matchedParent = parents.find((parent) => parent.name.localeCompare(requestedParentName, "sv", { sensitivity: "base" }) === 0);
  const selectedSupportCase = cases.find((item) => item.id === els.caseSupportCaseInput.value && item.caseTypeId === "parent-support");
  const parentId = selectedSupportCase?.parentId || matchedParent?.id || existingCase?.parentId || null;
  const supportCaseId = selectedSupportCase?.id || existingCase?.supportCaseId || null;
  if (caseType.parentMode === "required" && !parentId) {
    showCaseFormError("Den här ärendetypen kräver att en förälder väljs från förslagslistan.", els.caseParentInput);
    return;
  }
  if (caseType.parentMode === "via_support_case" && !supportCaseId) {
    showCaseFormError("Välj vilket stödärende som matchningen eller uppdraget hör till.", els.caseSupportCaseInput);
    return;
  }
  if (caseType.id === "mentor-assignment" && !existingCase?.sourceMatchingCaseId) {
    showCaseFormError("Mentoruppdrag skapas från en accepterad matchning. Öppna matchningen och registrera parternas svar.", els.caseTypeInput);
    return;
  }

  if (!existingCase) {
    const targets = sourceCase ? [] : compatibleRegistrationTargets(mentorId, caseType.id);
    const choice = els.caseDuplicatePanel.dataset.choice;
    if (targets.length && !choice) {
      renderRegistrationTargets();
      els.caseDuplicatePanel.scrollIntoView({ block: "center" });
      showCaseFormError("Det finns redan ett kompatibelt öppet ärende. Välj om registreringen ska läggas där eller om ett separat ärende ska skapas.");
      return;
    }
    if (choice && choice !== "new") {
      const targetCase = targets.find((item) => item.id === choice);
      const description = els.caseDescriptionInput.value.trim();
      if (!targetCase || !description) {
        els.caseDescriptionInput.setCustomValidity("Ange en kort beskrivning för registreringen i det befintliga ärendet.");
        els.caseDescriptionInput.reportValidity();
        return;
      }
      els.caseDescriptionInput.setCustomValidity("");
      await executeCaseCommand({
        commandType: "quick_register_existing",
        caseId: targetCase.id,
        expectedVersion: targetCase.version,
        payload: { caseTypeId: caseType.id, mentorId, title: els.caseTitleInput.value.trim(), description },
        additionalStores: [CASE_DOCUMENTS_STORE],
        mutate: ({ currentCase, now, put, event }) => {
          const note = {
            id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, activityId: null, meetingId: null,
            type: "service_note", title: els.caseTitleInput.value.trim(), description, documentDate: now.slice(0, 10),
            storageObjectId: null, mimeType: null, sizeBytes: null, checksum: null, informationClass: "normal", supersedesDocumentId: null,
            createdAt: now, createdBy: CURRENT_USER_ID
          };
          put(CASE_DOCUMENTS_STORE, note);
          const updated = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
          put(CASES_STORE, updated);
          event("registration_added_to_case", "document", note.id, `Registrering tillagd: ${note.title}`);
          return { caseId: currentCase.id, version: updated.version };
        }
      });
      if (sourceIncomingContact) {
        await completeIncomingContactWithCase(sourceIncomingContact, targetCase.id, targetCase.number);
      }
      markSaved();
      await refresh();
      navigateToCase(targetCase.id);
      return;
    }
  }

  const ownerId = els.caseOwnerInput.value || (existingCase ? responsibleHandler(existingCase)?.id : CURRENT_USER_ID);
  const coHandlerIds = [...els.caseCoHandlerInputs.querySelectorAll('input[name="coHandler"]:checked')]
    .map((input) => input.value)
    .filter((handlerId) => handlerId !== ownerId);
  const previousOwner = existingCase ? responsibleHandler(existingCase) : null;
  if (existingCase && (previousOwner?.id || "") !== (ownerId || "")) {
    const nextOwner = handlers.find((handler) => handler.id === ownerId);
    const specialAssignments = activitiesForCase(existingCase.id).filter((activity) => activity.handlerIdOverride).length;
    const dueSoon = activitiesForCase(existingCase.id).filter((activity) => ["overdue", "soon"].includes(activityDueState(activity))).length;
    const confirmation = await confirmAction({
      eyebrow: "Överlämning av ärende",
      title: "Byt ansvarig handläggare?",
      body: `${nextOwner?.name || "Ingen handläggare"} blir ansvarig. Aktiviteter med ärvt ansvar följer med. ${specialAssignments} särskilt tilldelade aktiviteter ligger kvar hos nuvarande handläggare och ${dueSoon} aktiviteter är försenade eller förfaller snart.`,
      mentorName: caseMentor(existingCase)?.name || existingCase.title,
      confirmLabel: "Bekräfta överlämning"
    });
    if (!confirmation.confirmed) return;
  }
  const selectedActivities = existingCase ? [] : [
    ...(caseType.activityTemplateIds || []).map((templateId, sortOrder) => ({ templateId, title: activityTemplateById(templateId).title, sortOrder })),
    ...(caseType.suggestedActivities || []).map((title, index) => ({ templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, title, sortOrder: (caseType.activityTemplateIds || []).length + index }))
  ];
  const configuredDetails = { ...(existingCase?.details || {}) };
  for (const field of configuredDetailFields(caseType)) {
    const input = caseDetailInput(field.id);
    const value = input?.value || "";
    configuredDetails[field.id] = field.inputType === "number"
      ? (value ? Number(value) : null)
      : (value.trim?.() || value || null);
  }
  if (caseType.id === "parent-support") {
    configuredDetails.supportAreaIds = selectedSupportAreaIdsFrom(els.caseSupportAreaChoices, "caseSupportArea");
    configuredDetails.supportAreaStatus = configuredDetails.supportAreaIds.length ? "confirmed" : "to_confirm";
  }
  if (sourceIncomingContact) configuredDetails.intakeContactId = sourceIncomingContact.id;
  if (sourceCase) configuredDetails.sourceCaseId = sourceCase.id;
  const allocatedCaseNumber = existingCase?.number || await reserveCaseNumber();
  await executeCaseCommand({
    commandType: existingCase ? "update_case" : "quick_register_case",
    caseId: id,
    expectedVersion: existingCase?.version ?? null,
    allowMissingCase: !existingCase,
    payload: {
      caseTypeId: caseType.id,
      mentorId,
      parentId,
      supportCaseId,
      organizationUnitId: els.caseOrganizationUnitInput.value,
      title: els.caseTitleInput.value.trim(),
      description: els.caseDescriptionInput.value.trim(),
      details: configuredDetails,
      ownerId,
      coHandlerIds
    },
    additionalStores: [CASE_ASSIGNMENTS_STORE, CASE_ACTIVITIES_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      const caseRecord = {
        ...(currentCase || {}),
        id,
        tenantId: DEFAULT_TENANT_ID,
        number: currentCase?.number || allocatedCaseNumber,
        caseTypeId: caseType.id,
        caseTypeVersion: caseType.version,
        organizationUnitId: els.caseOrganizationUnitInput.value || DEFAULT_ORGANIZATION_UNIT_ID,
        type: caseType.name,
        title: els.caseTitleInput.value.trim(),
        description: els.caseDescriptionInput.value.trim(),
        details: Object.keys(configuredDetails).length ? configuredDetails : null,
        mentorId,
        parentId,
        supportCaseId,
        sourceMatchingCaseId: currentCase?.sourceMatchingCaseId || null,
        status: currentCase?.status || "new",
        priority: els.casePriorityInput.value || caseType.defaultPriority,
        dueDate: els.caseDueDateInput.value || null,
        pauseReasonCode: currentCase?.pauseReasonCode || null,
        pauseNote: currentCase?.pauseNote || null,
        resumeAt: currentCase?.resumeAt || null,
        closeReasonCode: currentCase?.closeReasonCode || null,
        closeNote: currentCase?.closeNote || null,
        version: Number(currentCase?.version || 0) + 1,
        createdAt: currentCase?.createdAt || now,
        createdBy: currentCase?.createdBy || CURRENT_USER_ID,
        updatedAt: now,
        updatedBy: CURRENT_USER_ID,
        closedAt: currentCase?.closedAt || null,
        closedBy: currentCase?.closedBy || null
      };
      put(CASES_STORE, caseRecord);

      if (currentCase) {
        for (const assignment of assignmentsForCase(id)) {
          put(CASE_ASSIGNMENTS_STORE, { ...assignment, version: assignment.version + 1, endedAt: now, endedBy: CURRENT_USER_ID });
        }
      }
      for (const [role, handlerId] of [["responsible", ownerId], ...coHandlerIds.map((handlerId) => ["co_handler", handlerId])]) {
        if (!handlerId) continue;
        put(CASE_ASSIGNMENTS_STORE, {
          id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: id, handlerId, role, version: 1,
          assignedAt: now, assignedBy: CURRENT_USER_ID, endedAt: null, endedBy: null
        });
      }
      if (currentCase && (previousOwner?.id || "") !== (ownerId || "")) {
        recordEvent("assignment_changed", "assignment", id, `Ansvarig handläggare ändrades från ${previousOwner?.name || "ej tilldelad"} till ${handlerNameById(ownerId)}`);
      }
      for (const template of selectedActivities) {
        const activity = {
          id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: id, templateId: template.templateId, templateVersion: 1,
          title: template.title, status: "not_started", resultCode: null, resultClassification: null, handlerIdOverride: null,
          waitingForParty: null, dueDate: null, sortOrder: template.sortOrder, version: 1,
          createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID, completedAt: null, completedBy: null
        };
        put(CASE_ACTIVITIES_STORE, activity);
      }
      recordEvent(currentCase ? "case_updated" : "case_created", "case", id, currentCase
        ? "Ärendeuppgifter och handläggare uppdaterades"
        : `Ärendet skapades${selectedActivities.length ? ` med ${selectedActivities.length} aktiviteter` : ""}`);
      return { caseId: id, version: caseRecord.version };
    }
  });
  if (sourceIncomingContact) {
    await completeIncomingContactWithCase(sourceIncomingContact, id, allocatedCaseNumber);
  }
  if (sourceCase) {
    await registerSuccessorLink(sourceCase, id, allocatedCaseNumber, caseType.name);
  }
  const savedCaseForMatching = {
    ...(existingCase || {}),
    id,
    tenantId: DEFAULT_TENANT_ID,
    caseTypeId: caseType.id,
    parentId,
    mentorId,
    supportCaseId,
    details: Object.keys(configuredDetails).length ? configuredDetails : null,
    createdAt: existingCase?.createdAt || new Date().toISOString(),
    createdBy: existingCase?.createdBy || CURRENT_USER_ID,
    updatedAt: new Date().toISOString(),
    updatedBy: CURRENT_USER_ID
  };
  if (caseType.id === "parent-support") await saveSupportMatchingProfile(savedCaseForMatching);
  if (caseType.id === "matching" && !existingCase) await saveMatchingSnapshotForCase(savedCaseForMatching);
  caseEditMode = false;
  newCaseTypePreset = "";
  els.caseCreateForm.dataset.route = "";
  markSaved();
  showFeedback(existingCase ? "Ärendet har uppdaterats." : "Ärendet har skapats.");
  if (returnActivityId) {
    window.history.replaceState(null, "", resolveFeatureRoute("case.activity", { caseId: id, activityId: returnActivityId }));
    selectedCaseActivityId = returnActivityId;
    caseRouteIntent = "activities";
    caseRouteTargetId = returnActivityId;
  }
  await refresh();
  if (!returnActivityId) navigateToCase(id);
}

els.caseCreateForm.addEventListener("submit", (event) => {
  submitCaseForm(event).catch((error) => {
    console.error("Could not save case", error);
    showCaseFormError("Ärendet kunde inte sparas lokalt. Ladda om sidan och försök igen. Om felet kvarstår, nollställ prototypdatan i den här webbläsaren.");
  });
});

els.caseCreateForm.addEventListener("invalid", (event) => {
  const field = event.target;
  const label = field.id ? document.querySelector(`label[for="${cssEscape(field.id)}"]`)?.textContent.trim() : "";
  showCaseFormError(`${label || "Ett obligatoriskt fält"} måste fyllas i innan ärendet kan sparas.`, field);
}, true);

els.caseCreateForm.addEventListener("input", clearCaseFormError);
els.caseCreateForm.addEventListener("change", clearCaseFormError);

els.newCaseActivityButton.addEventListener("click", () => {
  els.caseActivityForm.hidden = false;
  els.activityTitleInput.focus();
});

els.cancelCaseActivityButton.addEventListener("click", () => {
  els.caseActivityForm.reset();
  els.caseActivityForm.hidden = true;
});

els.caseActivityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  const activityId = crypto.randomUUID();
  const title = els.activityTitleInput.value.trim();
  const note = els.activityNoteInput.value.trim();
  await executeCaseCommand({
    commandType: "add_activity",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { activityId, title, handlerId: els.activityOwnerInput.value, dueDate: els.activityDueDateInput.value, note },
    additionalStores: [CASE_ACTIVITIES_STORE, CASE_DOCUMENTS_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      const activity = {
        id: activityId, tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id,
        templateId: AD_HOC_ACTIVITY_TEMPLATE_ID, templateVersion: 1, title, status: "not_started",
        resultCode: null, resultClassification: null, handlerIdOverride: els.activityOwnerInput.value || null,
        waitingForParty: null, dueDate: els.activityDueDateInput.value || null,
        sortOrder: activitiesForCase(currentCase.id).length, version: 1,
        createdAt: now, createdBy: CURRENT_USER_ID, updatedAt: now, updatedBy: CURRENT_USER_ID,
        completedAt: null, completedBy: null
      };
      put(CASE_ACTIVITIES_STORE, activity);
      if (note) {
        put(CASE_DOCUMENTS_STORE, {
          id: crypto.randomUUID(), tenantId: DEFAULT_TENANT_ID, caseId: currentCase.id, activityId, meetingId: null,
          type: "service_note", title: `Tjänsteanteckning: ${title}`, description: note, documentDate: now.slice(0, 10),
          storageObjectId: null, mimeType: null, sizeBytes: null, checksum: null, informationClass: "normal", supersedesDocumentId: null,
          createdAt: now, createdBy: CURRENT_USER_ID
        });
      }
      const updatedCase = { ...currentCase, version: currentCase.version + 1, updatedAt: now, updatedBy: CURRENT_USER_ID };
      put(CASES_STORE, updatedCase);
      recordEvent("activity_updated", "activity", activityId, `Aktiviteten "${title}" lades till`);
      return { caseId: currentCase.id, activityId, version: updatedCase.version };
    }
  });
  els.caseActivityForm.reset();
  els.caseActivityForm.hidden = true;
  markSaved();
  showFeedback("Aktiviteten har lagts till.");
  await refresh();
});

for (const button of els.activityFilterButtons) {
  button.addEventListener("click", () => {
    activityListFilter = button.dataset.activityFilter;
    const caseRecord = selectedCaseRecord();
    if (caseRecord) renderCaseActivities(caseRecord, activitiesForCase(caseRecord.id));
  });
}

els.caseActivityTableBody.addEventListener("click", (event) => {
  const quickFinishButton = event.target.closest("[data-quick-finish-activity]");
  if (quickFinishButton) {
    const activityId = quickFinishButton.dataset.quickFinishActivity;
    for (const matchingButton of els.caseActivityTableBody.querySelectorAll(`[data-quick-finish-activity="${CSS.escape(activityId)}"]`)) matchingButton.disabled = true;
    registerQuickActivityResult(activityId)
      .catch((error) => {
        console.error("Kunde inte avsluta aktiviteten", error);
        showFeedback(error.message || "Aktiviteten kunde inte avslutas.");
      })
      .finally(() => {
        for (const matchingButton of els.caseActivityTableBody.querySelectorAll(`[data-quick-finish-activity="${CSS.escape(activityId)}"]`)) matchingButton.disabled = false;
      });
    return;
  }
  const openButton = event.target.closest("[data-open-activity]");
  if (openButton) openCaseActivity(openButton.dataset.openActivity);
});

els.backToActivitiesButton.addEventListener("click", () => {
  selectedCaseActivityId = null;
  renderCaseDetail();
});

els.showCaseClosureButton.addEventListener("click", () => {
  bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-overview-tab")).show();
  requestAnimationFrame(() => els.caseClosureSummary.scrollIntoView({ behavior: "smooth", block: "start" }));
});

els.activityCaseReadyPrimaryButton.addEventListener("click", () => {
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  const action = els.activityCaseReadyPrimaryButton.dataset.action;
  const targetId = els.activityCaseReadyPrimaryButton.dataset.targetId;
  if (action === "start_matching") {
    navigateToNewMatching(caseRecord.id);
    return;
  }
  if (action === "open_case" && targetId) {
    navigateToCase(targetId);
    return;
  }
  if (action === "create_next_case" && targetId) {
    newCaseTypePreset = targetId;
    navigateToNewCase();
    return;
  }
  bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-overview-tab")).show();
  requestAnimationFrame(() => {
    const target = !els.caseTransitionPanel.hidden ? els.caseTransitionPanel : els.caseStatusFact.closest(".record-section");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

els.activityCaseReadyCloseButton.addEventListener("click", () => openCaseLifecycle("close"));

els.activityDetailStatusInput.addEventListener("change", () => {
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId);
  if (activity) {
    renderActivityResultInput(activity);
    const waiting = els.activityDetailStatusInput.value === "waiting";
    els.activityWaitingForRow.hidden = !waiting;
    els.activityDetailWaitingForInput.disabled = !waiting;
    els.activityDetailWaitingForInput.required = waiting;
    if (!waiting) els.activityDetailWaitingForInput.value = "";
    updateActivityValidationState();
    updateActivityDetailDirtyState();
  }
});

els.activityDetailForm.addEventListener("input", () => {
  updateActivityValidationState();
  updateActivityDetailDirtyState();
});
els.activityDetailForm.addEventListener("change", () => {
  updateActivityValidationState();
  updateActivityDetailDirtyState();
});

els.activityDetailGuidanceButton.addEventListener("click", () => {
  const mentorId = els.activityDetailGuidanceButton.dataset.mentorId;
  if (!mentorId) return;
  pendingIdentityEditorId = mentorId;
  navigateToCandidate(mentorId);
});

els.activityDetailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId);
  const caseRecord = cases.find((item) => item.id === activity?.caseId);
  if (!activity || !caseRecord) return;
  if (!activityDetailHasChanges()) return;

  const nextStatus = els.activityDetailStatusInput.value;
  const nextResult = nextStatus === "completed" ? els.activityDetailResultInput.value : "";
  const nextHandlerId = els.activityDetailOwnerInput.value;
  const currentHandlerOverrideId = activityOwnerOverrideId(activity, caseRecord);
  const nextDueDate = els.activityDetailDueDateInput.value;
  const nextWaitingForParty = nextStatus === "waiting" ? els.activityDetailWaitingForInput.value : null;
  const nextNote = els.activityDetailNoteInput.value.trim();
  const closesCase = activitySaveRequiresConfirmation(activity, nextStatus, nextResult);
  updateActivityValidationState();
  if (!els.activityDetailForm.reportValidity()) return;

  if (closesCase) {
    const confirmation = await confirmAction({
      eyebrow: "Beslut i ärendet",
      title: "Godkänn mentor och avsluta ärendet?",
      body: "Mentorn registreras som godkänd och godkännandeärendet avslutas. Beslutet och tidpunkten registreras i ärendets logg.",
      mentorName: caseMentor(caseRecord)?.name || "Ej personanknutet",
      confirmLabel: "Godkänn och avsluta"
    });
    if (!confirmation.confirmed) return;
  }

  const candidateSynced = await syncCandidateFromActivity(activity, nextStatus, nextNote, new Date().toISOString(), nextResult);
  if (!candidateSynced) return;
  await saveActivityCommand({ activity, caseRecord, nextStatus, nextResult, nextHandlerId, nextDueDate, nextWaitingForParty, note: nextNote });
  if (nextStatus === "completed") selectedCaseActivityId = null;
  markSaved();
  showFeedback(nextStatus === "completed" ? "Aktiviteten har avslutats." : "Aktiviteten har sparats.");
  await refresh();
  if (closesCase) {
    requestAnimationFrame(() => els.activityCaseClosedNotice.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
});

els.reopenActivityButton.addEventListener("click", async () => {
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId);
  const caseRecord = cases.find((item) => item.id === activity?.caseId);
  if (!activity || !caseRecord) return;
  const confirmation = await confirmAction({
    eyebrow: "Återöppna aktivitet",
    title: "Återöppna aktiviteten?",
    body: "Det tidigare resultatet bevaras i loggen. Aktiviteten får status Pågår och måste avslutas på nytt.",
    mentorName: caseMentor(caseRecord)?.name || "Ej personanknutet",
    confirmLabel: "Återöppna aktivitet",
    danger: true
  });
  if (!confirmation.confirmed) return;
  if (!confirmation.note) {
    showFeedback("Ange en motivering för återöppningen.");
    return;
  }
  await saveActivityCommand({
    activity,
    caseRecord,
    nextStatus: activity.status === "not_applicable" ? "not_started" : "in_progress",
    nextResult: "",
    nextHandlerId: activity.handlerIdOverride || "",
    nextDueDate: activity.dueDate || "",
    note: confirmation.note,
    reopen: true
  });
  markSaved();
  showFeedback("Aktiviteten har återöppnats.");
  await refresh();
});

els.saveDeviationDecisionButton.addEventListener("click", async () => {
  const deviation = activityDeviations.find((item) => item.id === els.activityDeviationPanel.dataset.deviationId);
  const caseRecord = selectedCaseRecord();
  if (!deviation || !caseRecord) return;
  const reasonCode = els.deviationReasonInput.value;
  const note = els.deviationNoteInput.value.trim();
  if (!reasonCode || !note) {
    showFeedback("Välj orsak och ange en motivering.");
    return;
  }
  const outcome = els.deviationOutcomeInput.value;
  const confirmation = await confirmAction({
    eyebrow: "Ställningstagande",
    title: "Registrera ställningstagandet?",
    body: `Valet registreras som ett separat beslut och ändrar inte det ursprungliga aktivitetsresultatet.${outcome === "request_supplement" && !responsibleHandler(caseRecord) ? " Eftersom ärendet saknar ansvarig blir du ansvarig handläggare." : ""}`,
    mentorName: caseMentor(caseRecord)?.name || "Ej personanknutet",
    confirmLabel: "Registrera ställningstagande",
    danger: ["pause_case", "close_case"].includes(outcome)
  });
  if (!confirmation.confirmed) return;
  await decideDeviationCommand({ deviation, caseRecord, outcome, reasonCode, note, resumeAt: els.deviationResumeDateInput.value || null });
  markSaved();
  showFeedback("Ställningstagandet har registrerats.");
  await refresh();
});

els.addActivityDocumentButton.addEventListener("click", () => {
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId);
  if (activity) openDocumentFormForActivity(activity);
});

function openCaseActivity(activityId) {
  const activity = caseActivities.find((item) => item.id === activityId);
  if (!activity) return;
  selectedCaseActivityId = activity.id;
  if (selectedCaseRecordId !== activity.caseId || currentView !== "case") {
    navigateToCase(activity.caseId);
    return;
  }
  bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-activities-tab")).show();
  renderCaseDetail();
}

function openCaseActivityWithResult(activityId, resultCode) {
  const activity = caseActivities.find((item) => item.id === activityId);
  if (!activity) return;
  openCaseActivity(activityId);
  els.activityDetailStatusInput.value = "completed";
  renderActivityResultInput(activity);
  els.activityDetailResultInput.value = resultCode;
  updateActivityValidationState();
  updateActivityDetailDirtyState();
  requestAnimationFrame(() => {
    const classification = resultClassification(activity.templateId, resultCode);
    (classification === "deviation" ? els.activityDetailNoteInput : els.activityDetailSaveButton).focus();
  });
}

async function registerQuickActivityResult(activityId) {
  const activity = caseActivities.find((item) => item.id === activityId);
  const caseRecord = cases.find((item) => item.id === activity?.caseId);
  const resultOptions = activity ? quickActivityResultOptions(activity) : [];
  if (!activity || !caseRecord || !resultOptions.length) throw new Error("Aktiviteten kan inte snabbavslutas.");
  const workInput = activityWorkInputSummary(activity, caseRecord);
  if (workInput?.required && workInput.state !== "complete") {
    openCaseActivity(activity.id);
    showFeedback(`Komplettera ${workInput.label.toLocaleLowerCase("sv-SE")} innan aktiviteten avslutas.`);
    return;
  }
  const confirmation = await confirmAction({
    eyebrow: "Snabbregistrering",
    title: "Avsluta aktiviteten?",
    body: "Välj resultat innan aktiviteten avslutas. Resultatet, registrerande användare och tidpunkt sparas i ärendets logg. Välj Komplettera uppgifter om du behöver registrera mer information eller koppla ett underlag.",
    subjectLabel: "Aktivitet",
    subjectValue: activity.title,
    confirmLabel: "Avsluta aktivitet",
    alternativeLabel: "Komplettera uppgifter",
    resultOptions,
    summaryItems: [
      { label: "Ärende", value: `${caseRecord.number} · ${caseRecord.title}` },
      { label: "Status", value: "Aktiviteten avslutas och loggas" },
      { label: "Underlag", value: workInput ? `${workInput.label}: ${workInput.stateLabel}` : "Ingen kopplad registrering krävs" }
    ]
  });
  const resultCode = confirmation.resultCode;
  if (confirmation.action === "alternative") {
    if (resultCode) openCaseActivityWithResult(activity.id, resultCode);
    else openCaseActivity(activity.id);
    if (confirmation.note) els.activityDetailNoteInput.value = confirmation.note;
    updateActivityDetailDirtyState();
    return;
  }
  if (!confirmation.confirmed) return;

  const validResult = resultOptions.some(([value]) => value === resultCode);
  if (!validResult) throw new Error("Välj ett giltigt resultat.");

  const candidateSynced = await syncCandidateFromActivity(activity, "completed", confirmation.note, new Date().toISOString(), resultCode);
  if (!candidateSynced) {
    openCaseActivityWithResult(activity.id, resultCode);
    return;
  }
  await saveActivityCommand({
    activity,
    caseRecord,
    nextStatus: "completed",
    nextResult: resultCode,
    nextHandlerId: activity.handlerIdOverride || "",
    nextDueDate: activity.dueDate || "",
    nextWaitingForParty: null,
    note: confirmation.note
  });
  markSaved();
  showFeedback(`Aktiviteten har avslutats med resultatet ${activityResultOptions(activity).find(([value]) => value === resultCode)?.[1] || resultCode}.`);
  await refresh();
}

function openCaseMeetings(caseId) {
  pendingCaseMeetingsId = caseId;
  if (selectedCaseRecordId === caseId && currentView === "case") {
    pendingCaseMeetingsId = null;
    bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-meetings-tab")).show();
    return;
  }
  navigateToCase(caseId);
}

function openDocumentFormForActivity(activity) {
  selectedCaseActivityId = null;
  els.caseDocumentForm.dataset.activityId = activity.id;
  els.documentTitleInput.value = `Underlag: ${activity.title}`;
  els.documentDateInput.value = new Date().toISOString().slice(0, 10);
  bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-documents-tab")).show();
  renderCaseDetail();
  requestAnimationFrame(() => els.documentTitleInput.focus());
}

els.documentActivityInput.addEventListener("change", () => {
  els.caseDocumentForm.dataset.activityId = els.documentActivityInput.value;
  renderCaseDocuments(caseDocuments.filter((document) => document.caseId === selectedCaseRecordId));
});

els.caseDocumentsList.addEventListener("click", (event) => {
  const activityButton = event.target.closest("[data-open-activity]");
  if (activityButton) openCaseActivity(activityButton.dataset.openActivity);
  const correctionButton = event.target.closest("[data-correct-document]");
  if (!correctionButton) return;
  const original = caseDocuments.find((item) => item.id === correctionButton.dataset.correctDocument);
  if (!original) return;
  els.caseDocumentForm.dataset.supersedesDocumentId = original.id;
  els.caseDocumentForm.dataset.activityId = original.activityId || "";
  els.documentTypeInput.value = original.type;
  els.documentActivityInput.value = original.activityId || "";
  els.documentTitleInput.value = original.title;
  els.documentDateInput.value = new Date().toISOString().slice(0, 10);
  els.documentDescriptionInput.value = `Rättelse av handling registrerad ${formatDate(original.documentDate)}. `;
  els.documentInformationClassInput.value = original.informationClass || "normal";
  els.documentTitleInput.focus();
});

els.documentActivityContext.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-activity]");
  if (button) openCaseActivity(button.dataset.openActivity);
});

els.caseDocumentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  await registerDocumentCommand({
    caseRecord,
    activityId: els.documentActivityInput.value || null,
    type: els.documentTypeInput.value,
    title: els.documentTitleInput.value.trim(),
    documentDate: els.documentDateInput.value,
    description: els.documentDescriptionInput.value.trim(),
    informationClass: els.documentInformationClassInput.value,
    file: els.documentFileInput.files[0] || null,
    supersedesDocumentId: els.caseDocumentForm.dataset.supersedesDocumentId || null
  });
  els.caseDocumentForm.reset();
  els.caseDocumentForm.dataset.activityId = "";
  els.caseDocumentForm.dataset.supersedesDocumentId = "";
  markSaved();
  showFeedback("Handlingen har registrerats.");
  await refresh();
});

els.caseMeetingsList.addEventListener("click", (event) => {
  const activityButton = event.target.closest("[data-open-activity]");
  if (activityButton) openCaseActivity(activityButton.dataset.openActivity);
  const meetingButton = event.target.closest("[data-edit-case-meeting]");
  if (!meetingButton) return;
  const meeting = caseMeetings.find((item) => item.id === meetingButton.dataset.editCaseMeeting);
  if (!meeting) return;
  openCaseMeetingForm(meeting);
});

els.newCaseMeetingButton.addEventListener("click", () => openCaseMeetingForm());
els.cancelCaseMeetingButton.addEventListener("click", closeCaseMeetingForm);

els.caseMeetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  const returnActivityId = caseRouteIntent === "meetings" ? caseRouteTargetId : "";
  const existing = caseMeetings.find((item) => item.id === els.caseMeetingForm.dataset.meetingId);
  await registerCaseMeetingCommand({
    caseRecord,
    existing,
    meetingType: els.caseMeetingTypeInput.value,
    occurredAt: els.caseMeetingDateInput.value,
    mode: els.caseMeetingModeInput.value,
    activityId: els.caseMeetingActivityInput.value || null,
    summary: els.caseMeetingSummaryInput.value.trim(),
    nextStep: els.caseMeetingNextStepInput.value.trim()
  });
  closeCaseMeetingForm();
  markSaved();
  if (returnActivityId) {
    window.history.replaceState(null, "", resolveFeatureRoute("case.activity", { caseId: caseRecord.id, activityId: returnActivityId }));
    selectedCaseActivityId = returnActivityId;
    caseRouteIntent = "activities";
    caseRouteTargetId = returnActivityId;
  }
  showFeedback(existing ? "En rättad version av mötesanteckningen har sparats." : "Mötet har registrerats.");
  await refresh();
});

els.presentationStepList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-presentation-step]");
  if (!button) return;
  selectedPresentationStepId = button.dataset.presentationStep;
  renderPresentation();
});

els.presentationOpenStepButton.addEventListener("click", () => {
  navigateTo(presentationRoute(selectedPresentationStep()));
});

els.presentationCommentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = els.presentationCommentInput.value.trim();
  if (!text) return;
  if (containsSensitivePersonalData(text)) {
    els.presentationCommentInput.setCustomValidity("Ta bort personnummer eller känsliga registeruppgifter innan återkopplingen registreras.");
    els.presentationCommentInput.reportValidity();
    return;
  }
  els.presentationCommentInput.setCustomValidity("");
  const now = new Date().toISOString();
  const actor = currentUser();
  const ticket = {
    id: crypto.randomUUID(),
    tenantId: DEFAULT_TENANT_ID,
    category: "feature_request",
    status: "new",
    question: text,
    answer: "",
    answerMode: "demo_feedback",
    contextView: "presentation",
    contextRoute: "#/presentation",
    contextRole: actor.role,
    reporterId: actor.id,
    reporterName: actor.name,
    presentationStepId: selectedPresentationStep().id,
    presentationStepTitle: selectedPresentationStep().title,
    source: "demo_feedback",
    createdAt: now,
    updatedAt: now
  };
  await saveSupportTicket(ticket);
  supportTickets.unshift(ticket);
  els.presentationCommentInput.value = "";
  markSaved();
  showFeedback("Återkopplingen har registrerats i supportkön.");
  renderPresentation();
});

els.newCaseButton.addEventListener("click", navigateToNewCandidate);
els.dashboardNewCaseButton.addEventListener("click", () => navigateToNewCase());
els.dashboardNewMentorButton.addEventListener("click", navigateToNewCandidate);

els.cancelNewCaseButton.addEventListener("click", () => {
  els.candidateForm.reset();
});

els.candidateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const duplicateCheck = renderCandidateDuplicateCheck();
  if (duplicateCheck.blocked) {
    showFeedback("Kontrollera den möjliga dubbletten innan mentorn sparas.");
    return;
  }
  const candidate = newCandidate(new FormData(els.candidateForm), await reserveCaseNumber());
  await saveNewMentorWithMatchingProfile(candidate);
  selectedId = candidate.id;
  els.candidateForm.reset();
  candidateModal.hide();
  markSaved();
  showFeedback("Mentorn har registrerats.");
  await refresh();
  navigateToCandidate(candidate.id);
});

for (const input of [els.candidateNameInput, els.candidatePersonalNumberInput]) {
  input.addEventListener("input", () => {
    els.candidateDuplicatePanel.dataset.choice = "";
    renderCandidateDuplicateCheck();
  });
}

els.candidateDuplicatePanel.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-duplicate-mentor]");
  if (openButton) {
    candidateModal.hide();
    navigateToCandidate(openButton.dataset.openDuplicateMentor);
    return;
  }
  if (event.target.closest("[data-create-duplicate-mentor]")) {
    els.candidateDuplicatePanel.dataset.choice = "create-anyway";
    renderCandidateDuplicateCheck();
  }
});

els.searchInput.addEventListener("input", () => {
  searchTerm = els.searchInput.value;
  renderTable();
});

els.statusFilter.addEventListener("change", () => {
  statusFilter = els.statusFilter.value;
  renderTable();
});

els.caseTypeAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const definition = caseTypeById(els.caseTypeAdminIdInput.value);
  if (!definition) return;
  const detailFieldIds = [...els.caseTypeAdminFieldChoices.querySelectorAll("input:checked")]
    .map((input) => input.value);
  const nextCaseTypeId = els.caseTypeAdminNextTypeInput.value || null;
  if (nextCaseTypeSelectionCreatesCycle(definition.id, nextCaseTypeId)) {
    showFeedback("Valet skulle skapa ett cirkulärt ärendeflöde. Välj en annan ärendetyp eller Ingen.");
    els.caseTypeAdminNextTypeInput.focus();
    return;
  }
  const now = new Date().toISOString();
  const nextVersion = Math.max(0, ...caseTypeDefinitionVersions
    .filter((item) => item.id === definition.id)
    .map((item) => Number(item.version || 1))) + 1;
  await atomicPut({ [CASE_TYPE_DEFINITIONS_STORE]: [{
    ...definition,
    status: "retired",
    updatedAt: now,
    updatedBy: CURRENT_USER_ID
  }, {
    ...definition,
    tenantId: DEFAULT_TENANT_ID,
    version: nextVersion,
    status: "published",
    helpText: els.caseTypeAdminHelpInput.value.trim(),
    registrationHint: els.caseTypeAdminHintInput.value.trim(),
    workInstruction: els.caseTypeAdminWorkInstructionInput.value.trim(),
    mentorMode: els.caseTypeAdminMentorModeInput.value,
    nextCaseTypeId,
    detailFieldIds,
    updatedAt: now,
    updatedBy: CURRENT_USER_ID
  }] });
  caseTypeEditMode = false;
  markSaved();
  showFeedback("Ärendetypen har uppdaterats.");
  await refresh();
});

els.editCaseTypeButton.addEventListener("click", () => setCaseTypeEditMode(true));
els.cancelCaseTypeEditButton.addEventListener("click", () => setCaseTypeEditMode(false));

els.activityTypeAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const definition = activityTemplateDefinitionById(els.activityTypeAdminIdInput.value);
  if (!definition) return;
  const now = new Date().toISOString();
  const nextVersion = Math.max(0, ...activityTemplateDefinitionVersions
    .filter((item) => item.id === definition.id)
    .map((item) => Number(item.version || 1))) + 1;
  await atomicPut({ [ACTIVITY_TEMPLATE_DEFINITIONS_STORE]: [{
    ...definition,
    status: "retired",
    updatedAt: now,
    updatedBy: CURRENT_USER_ID
  }, {
    ...definition,
    tenantId: DEFAULT_TENANT_ID,
    version: nextVersion,
    status: "published",
    workInstruction: els.activityTypeAdminWorkInstructionInput.value.trim(),
    updatedAt: now,
    updatedBy: CURRENT_USER_ID
  }] });
  activityTypeEditMode = false;
  markSaved();
  showFeedback("Aktivitetsmallen har uppdaterats.");
  await refresh();
});

els.editActivityTypeButton.addEventListener("click", () => setActivityTypeEditMode(true));
els.cancelActivityTypeEditButton.addEventListener("click", () => setActivityTypeEditMode(false));

els.caseNumberingForm.addEventListener("change", updateCaseNumberingPreview);
els.nextCaseSequenceInput.addEventListener("input", updateCaseNumberingPreview);
els.caseNumberingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mode = selectedCaseNumberMode();
  const nextSequence = Math.max(1, Number(els.nextCaseSequenceInput.value || 1));
  if (mode === "sequential" && existingCaseNumbers().has(formatSequentialCaseNumber(nextSequence))) {
    els.nextCaseSequenceInput.setCustomValidity("Det här ärendenumret används redan. Ange ett annat nästa löpnummer.");
    els.nextCaseSequenceInput.reportValidity();
    return;
  }
  els.nextCaseSequenceInput.setCustomValidity("");
  caseNumberSettings = {
    ...(caseNumberSettings || defaultCaseNumberSettings()),
    tenantId: DEFAULT_TENANT_ID,
    caseNumberMode: mode,
    caseNumberYear: currentCaseNumberYear(),
    nextCaseSequence: nextSequence,
    caseNumberCounterInitialized: true,
    updatedAt: new Date().toISOString(),
    updatedBy: CURRENT_USER_ID
  };
  await saveTenantSettings(caseNumberSettings);
  markSaved();
  showFeedback("Inställningen för ärendenummer har sparats.");
  renderCaseNumberingAdministration();
});

els.handlerSearchInput.addEventListener("input", () => {
  handlerSearchTerm = els.handlerSearchInput.value;
  renderHandlers();
});

els.handlerStatusFilter.addEventListener("change", () => {
  handlerStatusFilter = els.handlerStatusFilter.value;
  renderHandlers();
});

els.newHandlerButton.addEventListener("click", () => openHandlerModal());

els.editHandlerButton.addEventListener("click", () => setHandlerEditMode(true));
els.cancelHandlerEditButton.addEventListener("click", () => setHandlerEditMode(false));

els.toggleSelectedHandlerButton.addEventListener("click", async () => {
  const handler = selectedHandler();
  if (!handler) return;
  const assignedCount = handlerMentorCount(handler);
  if (handler.active && assignedCount) {
    const confirmed = window.confirm(`${handler.name} har ${assignedCount} tilldelade mentorärenden. Inaktivera ändå? Befintliga tilldelningar behålls.`);
    if (!confirmed) return;
  }
  await saveHandler({ ...handler, active: !handler.active, updatedAt: new Date().toISOString() });
  markSaved();
  showFeedback(`${handler.name} har ${handler.active ? "inaktiverats" : "aktiverats"}.`);
  await refresh();
});

els.handlerEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const handler = selectedHandler();
  if (!handler) return;
  const name = els.editHandlerNameInput.value.trim();
  const email = els.editHandlerEmailInput.value.trim().toLowerCase();
  const active = els.editHandlerActiveInput.value === "active";
  const duplicate = handlers.some((item) => item.id !== handler.id && item.email.toLowerCase() === email);
  if (duplicate) {
    els.editHandlerEmailInput.setCustomValidity("E-postadressen används redan av en annan handläggare.");
    els.editHandlerEmailInput.reportValidity();
    return;
  }
  els.editHandlerEmailInput.setCustomValidity("");
  const assignedCount = handlerMentorCount(handler);
  if (handler.active && !active && assignedCount) {
    const confirmed = window.confirm(`${handler.name} har ${assignedCount} tilldelade mentorärenden. Inaktivera ändå? Befintliga tilldelningar behålls.`);
    if (!confirmed) return;
  }
  const now = new Date().toISOString();
  await saveHandler({
    ...handler,
    name,
    email,
    role: els.editHandlerRoleInput.value,
    active,
    updatedAt: now
  });
  markSaved();
  showFeedback("Handläggaren har uppdaterats.");
  await refresh();
});

els.editHandlerEmailInput.addEventListener("input", () => els.editHandlerEmailInput.setCustomValidity(""));

els.handlerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.handlerIdInput.value || crypto.randomUUID();
  const existing = handlers.find((handler) => handler.id === id);
  const name = els.handlerNameInput.value.trim();
  const email = els.handlerEmailInput.value.trim().toLowerCase();
  const duplicate = handlers.some((handler) => handler.id !== id && handler.email.toLowerCase() === email);
  if (duplicate) {
    els.handlerEmailInput.setCustomValidity("E-postadressen används redan av en annan handläggare.");
    els.handlerEmailInput.reportValidity();
    return;
  }
  els.handlerEmailInput.setCustomValidity("");
  if (existing?.active && !els.handlerActiveInput.checked) {
    const assignedCount = handlerMentorCount(existing);
    if (assignedCount) {
      const confirmed = window.confirm(`${existing.name} har ${assignedCount} tilldelade mentorärenden. Inaktivera ändå? Befintliga tilldelningar behålls.`);
      if (!confirmed) return;
    }
  }
  const now = new Date().toISOString();
  await saveHandler({
    id,
    tenantId: existing?.tenantId || DEFAULT_TENANT_ID,
    userId: existing?.userId || nextHandlerUserId(),
    name,
    email,
    role: els.handlerRoleInput.value,
    active: els.handlerActiveInput.checked,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
  handlerModal.hide();
  markSaved();
  showFeedback(existing ? "Handläggaren har uppdaterats." : "Handläggaren har registrerats.");
  await refresh();
  if (!existing) navigateToHandler(id);
});

els.handlerEmailInput.addEventListener("input", () => els.handlerEmailInput.setCustomValidity(""));

for (const [mode, button] of [
  ["mine", els.myActivitiesQueueButton],
  ["unassigned", els.unassignedQueueButton],
  ["overdue", els.overdueQueueButton],
  ["decision", els.decisionQueueButton]
]) {
  button.addEventListener("click", () => {
    dashboardQueueMode = mode;
    renderDashboard();
  });
}

els.caseSummaryBoard?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-case-summary-status]");
  if (!button) return;
  caseTypeFilter = "";
  caseStatusFilter = button.dataset.caseSummaryStatus;
  caseSearchTerm = "";
  casePage = 1;
  els.caseStatusFilter.value = caseStatusFilter;
  els.caseSearchInput.value = "";
  navigateTo("#/cases");
});

els.caseFlowBoard?.addEventListener("click", (event) => {
  const link = event.target.closest("[data-case-flow-type]");
  if (!link) return;
  event.preventDefault();
  caseTypeFilter = link.dataset.caseFlowType;
  caseStatusFilter = "open";
  caseSearchTerm = "";
  casePage = 1;
  els.caseStatusFilter.value = "open";
  els.caseSearchInput.value = "";
  navigateTo(caseListRoute());
});

els.actionTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-activity]");
  if (!button) return;
  openCaseActivity(button.dataset.openActivity);
});

els.pipelineGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pipeline-status]");
  if (!button) return;
  navigateToCandidateListWithStatus(button.dataset.pipelineStatus);
});

els.openNextActionButton.addEventListener("click", () => {
  const candidate = selectedCandidate();
  if (candidate) showNextAction(candidate);
});

els.editPersonButton.addEventListener("click", () => setPersonEditMode(true));
els.cancelPersonEditButton.addEventListener("click", () => {
  if (isCreatingMentor()) {
    navigateTo("#/mentors");
    return;
  }
  setPersonEditMode(false);
});
els.personEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateMentorSupportAreaEditor()) return;
  if (isCreatingMentor()) {
    if (renderMentorEditorDuplicateCheck().blocked) {
      showFeedback("Kontrollera den möjliga dubbletten innan mentorn sparas.");
      return;
    }
    try {
      const candidate = newCandidateFromEditor(await reserveCaseNumber());
      await saveNewMentorWithMatchingProfile(candidate);
      selectedId = candidate.id;
      markSaved();
      showFeedback("Mentorn har registrerats.");
      await refresh();
      navigateToCandidate(candidate.id);
    } catch (error) {
      console.error("Kunde inte registrera mentor", error);
      showFeedback("Mentorn kunde inte sparas. Försök igen eller kontrollera den lokala lagringen.");
    }
    return;
  }
  const candidate = selectedCandidate();
  if (!candidate) return;
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  const profilePatch = {
    name: els.editNameInput.value.trim(),
    contactDetails: els.editContactDetailsInput.value.trim(),
    informationStatus: els.editInformationStatusInput.value,
    interestNote: els.editInterestNoteInput.value.trim(),
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
    supportAreas: mentorSupportAreasFromEditor()
  };
  const certificationCase = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  await updateMentorProfileCommand({ candidate, caseRecord: certificationCase, profilePatch, coordinatorId: coordinator?.id || "" });
  markSaved();
  await refresh();
  setPersonEditMode(false);
  showFeedback("Grunduppgifterna har sparats.");
});
els.editNameInput.addEventListener("input", () => {
  if (!isCreatingMentor()) return;
  els.mentorEditorDuplicatePanel.dataset.choice = "";
  renderMentorEditorDuplicateCheck();
});
els.mentorSupportAreasEdit.addEventListener("change", (event) => {
  const input = event.target.closest("[data-mentor-support-area]");
  if (input) {
    input.setCustomValidity("");
    const levelInputs = els.mentorSupportAreasEdit.querySelectorAll(`[data-mentor-experience-level="${input.dataset.mentorSupportArea}"]`);
    levelInputs.forEach((levelInput) => { levelInput.disabled = !input.checked; });
    const confidenceInput = els.mentorSupportAreasEdit.querySelector(`[data-mentor-confidence="${input.dataset.mentorSupportArea}"]`);
    if (confidenceInput) confidenceInput.disabled = !input.checked;
    const assessment = els.mentorSupportAreasEdit.querySelector(`[data-mentor-support-assessment="${input.dataset.mentorSupportArea}"]`);
    if (assessment) assessment.hidden = !input.checked;
    return;
  }
  const levelInput = event.target.closest("[data-mentor-experience-level]");
  if (levelInput) els.mentorSupportAreasEdit.querySelector(`[data-mentor-support-area="${levelInput.dataset.mentorExperienceLevel}"]`)?.setCustomValidity("");
});
els.mentorEditorDuplicatePanel.addEventListener("click", (event) => {
  if (!event.target.closest("[data-create-editor-duplicate]")) return;
  els.mentorEditorDuplicatePanel.dataset.choice = "create-anyway";
  renderMentorEditorDuplicateCheck();
});
els.interviewDateInput.addEventListener("change", () => { els.saveStatus.textContent = "Intervjuuppgifter ej registrerade"; });
els.interviewModeInput.addEventListener("change", () => { els.saveStatus.textContent = "Intervjuuppgifter ej registrerade"; });

els.newMeetingButton.addEventListener("click", () => {
  const candidate = selectedCandidate();
  const caseRecord = cases.find((item) => item.mentorId === candidate?.id && item.caseTypeId === "mentor-certification")
    || cases.find((item) => item.mentorId === candidate?.id && item.status !== "closed");
  if (caseRecord) openCaseMeetings(caseRecord.id);
  else showFeedback("Skapa ett ärende för mentorn innan ett möte registreras.");
});
els.cancelMeetingButton.addEventListener("click", closeMeetingForm);
els.meetingsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-meeting]");
  if (!button) return;
  const meeting = caseMeetings.find((item) => item.id === button.dataset.editMeeting);
  if (meeting) openCaseMeetings(meeting.caseId);
});

els.meetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = selectedCandidate();
  if (!candidate) return;
  const existing = caseMeetings.find((meeting) => meeting.id === selectedMeetingId);
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification")
    || cases.find((item) => item.mentorId === candidate.id && item.status !== "closed");
  if (!caseRecord) throw new Error("Skapa ett ärende för mentorn innan mötet registreras.");
  const meetingType = ({ "Intervju inför godkännande": "certification_interview", "Uppföljning": "follow_up" })[els.meetingTypeInput.value] || "other";
  const mode = ({ "Fysiskt möte": "physical", "Digitalt möte": "digital", "Telefon": "phone" })[els.meetingModeInput.value];
  await registerCaseMeetingCommand({
    caseRecord,
    existing,
    meetingType,
    occurredAt: els.meetingDateInput.value,
    mode,
    activityId: meetingType === "certification_interview"
      ? activitiesForCase(caseRecord.id).find((item) => item.templateId === "interviewDone")?.id || null
      : null,
    summary: els.meetingSummaryInput.value.trim(),
    nextStep: els.meetingNextStepInput.value.trim()
  });
  closeMeetingForm();
  markSaved();
  showFeedback(existing ? "Mötet har uppdaterats." : "Mötet har registrerats.");
  await refresh();
});

els.editIdentityVerificationButton.addEventListener("click", () => {
  setIdentityEditMode(true);
  els.identityPersonalNumberInput.focus({ preventScroll: true });
});

els.cancelIdentityVerificationButton.addEventListener("click", () => {
  identityEditMode = false;
  setIdentityEditMode(false);
});

els.saveIdentityVerificationButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const returnCaseId = mentorRouteIntent === "identity" ? mentorRouteCaseId : "";
  const returnActivityId = mentorRouteIntent === "identity" ? mentorRouteActivityId : "";
  const personalNumberValid = els.identityPersonalNumberInput.reportValidity();
  const methodValid = els.identityMethodSelect.reportValidity();
  if (!personalNumberValid || !methodValid) return;
  const duplicateIdentity = findMentorDuplicates(candidates.filter((item) => item.id !== candidate.id), {
    personalNumber: els.identityPersonalNumberInput.value
  }).exactPersonalNumber;
  if (duplicateIdentity) {
    showFeedback(`Personnumret är redan registrerat på ${duplicateIdentity.name}. Identiteten har inte sparats.`);
    return;
  }

  const method = els.identityMethodSelect.value;
  const alreadyVerified = Boolean(candidate.checks?.identityVerified);
  const confirmation = await confirmAction({
    eyebrow: "Identitetsverifiering",
    title: alreadyVerified ? "Spara ändrad identitet?" : "Registrera identitet?",
    body: `Personnummer och verifieringssätt sparas. Verifieringssätt: ${identityMethodLabel(method)}. Åtgärden registreras med tidpunkt och ansvarig handläggare i ärendets logg.`,
    mentorName: candidate.name,
    confirmLabel: alreadyVerified ? "Spara identitet" : "Registrera identitet"
  });
  if (!confirmation.confirmed) return;
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  const activity = activitiesForCase(caseRecord?.id).find((item) => item.templateId === "identityVerified");
  if (!caseRecord || !activity) throw new Error("Mentorns ärende om godkännande saknas.");
  identityEditMode = false;
  await verifyIdentityCommand({
    candidate,
    caseRecord,
    activity,
    personalNumber: els.identityPersonalNumberInput.value.trim(),
    method,
    note: confirmation.note
  });
  markSaved();
  if (returnCaseId && returnActivityId) {
    window.history.replaceState(null, "", resolveFeatureRoute("case.activity", { caseId: returnCaseId, activityId: returnActivityId }));
  }
  await refresh();
  showFeedback(`Identiteten har verifierats med ${identityMethodLabel(method)}.`);
});

async function updateCandidateCheck(key, checked, context = {}) {
  const candidate = selectedCandidate();
  if (!candidate) return false;
  const previousChecked = Boolean(candidate.checks?.[key]);
  if (previousChecked === checked) return true;
  const label = CHECK_LABELS[key] || "Kontroll";
  const confirmation = await confirmAction({
    eyebrow: checked ? "Kontroll i godkännandeflödet" : "Ändra genomförd kontroll",
    title: checked ? `Markera ${label.toLowerCase()} som klar?` : `Ta bort markering för ${label.toLowerCase()}?`,
    body: checked
      ? "Åtgärden registreras med tidpunkt och ansvarig handläggare i ärendets logg."
      : "Kontrollen blir ej klar och ändringen registreras i ärendets logg.",
    mentorName: candidate.name,
    confirmLabel: checked ? "Markera som klar" : "Ta bort markering",
    danger: !checked
  });
  if (!confirmation.confirmed) return false;
  if (!checked && !confirmation.note) {
    showFeedback("Ange en motivering när en genomförd kontroll återöppnas.");
    return false;
  }
  await syncActivityFromCandidate(candidate, key, checked, confirmation.note, context);
  markSaved();
  await refresh();
  return true;
}

els.checklist.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-check-activity]");
  if (!button?.dataset.openCheckActivity) return;
  openCaseActivity(button.dataset.openCheckActivity);
});

els.interviewDoneInput.addEventListener("change", async () => {
  if (els.interviewDoneInput.checked && (!els.interviewDateInput.value || !els.interviewModeInput.value)) {
    els.interviewDoneInput.checked = false;
    showFeedback("Ange intervjutid och intervjuform innan intervjun markeras som genomförd.");
    const missingField = !els.interviewDateInput.value ? els.interviewDateInput : els.interviewModeInput;
    missingField.focus();
    return;
  }
  const mode = ({ "Fysiskt möte": "physical", "Digitalt möte": "digital", "Telefon": "phone" })[els.interviewModeInput.value];
  const context = els.interviewDoneInput.checked ? {
    meeting: {
      meetingType: "certification_interview",
      occurredAt: els.interviewDateInput.value,
      mode,
      summary: "Intervju inför godkännande genomförd"
    }
  } : {};
  const changed = await updateCandidateCheck("interviewDone", els.interviewDoneInput.checked, context);
  if (!changed) els.interviewDoneInput.checked = !els.interviewDoneInput.checked;
});

els.approveButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const approval = certificationApprovalAssessment(candidate);
  if (!approval.allowed) {
    showFeedback(approval.reasons[0] || "Ärendet är inte redo för godkännande.");
    return;
  }
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  const activity = activitiesForCase(caseRecord?.id).find((item) => item.templateId === "decision");
  if (!caseRecord || !activity) return;
  await saveActivityCommand({ activity, caseRecord, nextStatus: "completed", nextResult: "approved", nextHandlerId: activity.handlerIdOverride || "", nextDueDate: activity.dueDate || "", note: "Mentorn godkänd" });
  markSaved();
  await refresh();
  showFeedback("Mentorn är godkänd.");
});

els.deleteButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const activating = candidate.active === false;
  const confirmation = await confirmAction({ eyebrow: activating ? "Aktivera mentor" : "Inaktivera mentor", title: `${activating ? "Aktivera" : "Inaktivera"} ${candidate.name}?`, body: activating ? "Mentorn blir aktiv i registret igen." : "Mentorposten och ärendehistoriken bevaras. Personen visas som inaktiv och kan aktiveras igen senare.", mentorName: candidate.name, confirmLabel: activating ? "Aktivera mentor" : "Inaktivera mentor", danger: !activating });
  if (!confirmation.confirmed) return;
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  await updateMentorProfileCommand({
    candidate,
    caseRecord,
    profilePatch: { active: activating },
    coordinatorId: responsibleHandler(caseRecord)?.id || ""
  });
  markSaved();
  showFeedback(activating ? "Mentorn har aktiverats." : "Mentorn har inaktiverats. Ärendehistoriken är bevarad.");
  await refresh();
});

els.exampleDataMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-example-count]");
  if (!button) return;
  const count = Number(button.dataset.exampleCount);
  if (![1, 10, 250].includes(count)) return;

  if (!db || prototypeDataLoading) {
    showFeedback("Den lokala databasen är inte redo ännu. Ladda om sidan om meddelandet kvarstår.");
    return;
  }

  const datasetName = count === 1 ? "Litet scenario" : count === 10 ? "Normal verksamhet" : "Volymtest";
  if (candidates.length || parents.length || cases.length) {
    const confirmation = await confirmAction({ eyebrow: "Byt prototypdata", title: `Ladda ${datasetName.toLowerCase()}?`, body: "Nuvarande lokala prototypdata ersätts först när hela den nya datamängden har kunnat valideras och sparas.", subjectLabel: "Datamängd", subjectValue: `${datasetName} · ${count} ${count === 1 ? "mentor" : "mentorer"}`, confirmLabel: "Ersätt prototypdata", danger: true });
    if (!confirmation.confirmed) return;
  }

  prototypeDataLoading = true;
  renderSeedButtonState();
  try {
    await ensureDefaultHandlers();
    const exampleCandidates = buildExampleDataset(count);
    const workflowRecords = buildExampleParentWorkflows(exampleCandidates, count);
    await replacePrototypeDataset(exampleCandidates, workflowRecords);
    const seededCaseNumbers = [
      ...exampleCandidates.map((candidate) => candidate.caseNumber),
      ...(workflowRecords.cases || []).map((caseRecord) => caseRecord.number)
    ];
    const highestSeededSequence = seededCaseNumbers.reduce((highest, caseNumber) => {
      const match = String(caseNumber || "").match(/^FM-\d{2}-(\d{5})$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    caseNumberSettings = {
      ...defaultCaseNumberSettings(),
      nextCaseSequence: highestSeededSequence + 1,
      caseNumberCounterInitialized: true
    };
    await saveTenantSettings(caseNumberSettings);
    selectedId = null;
    selectedParentId = null;
    selectedCaseRecordId = null;
    searchTerm = "";
    statusFilter = "";
    els.searchInput.value = "";
    els.statusFilter.value = "";
    await refresh();
    markSaved();
    showFeedback(`${datasetName} har laddats med sammanhängande prototypdata.`);
    if (currentView === "mentor") window.location.hash = "#/mentors";
  } catch (error) {
    console.error("Kunde inte ladda prototypdata", error);
    showFeedback("Prototypdatan kunde inte laddas. Tidigare data har behållits.");
  } finally {
    prototypeDataLoading = false;
    renderSeedButtonState();
  }
});

els.resetButton.addEventListener("click", async () => {
  const confirmed = window.confirm("Nollställ all lokalt sparad prototypdata? Mentorärenden tas bort och grundhandläggarna återställs. Åtgärden kan inte ångras.");
  if (!confirmed) return;
  await Promise.all([clearCandidates(), clearParents(), clearHandlers(), clearMeetings(), clearPresentationComments(), clearAllCaseData(), clearStores(MATCHING_PROFILE_STORES), clearStore(caseTypeDefinitionTx), clearStore(learningContentTx), clearStore(tenantLearningSelectionTx), clearStore(learningProgressTx), clearPublicSupportRequests(), clearSupportTickets(), clearTenantSupportAreaSelections()]);
  await ensureDefaultHandlers();
  selectedId = null;
  markSaved();
  showFeedback("Prototypdatan har nollställts och grundhandläggare har återställts.");
  await refresh();
});

els.learningView.addEventListener("change", (event) => {
  if (event.target.id !== "learningLearnerSelect") return;
  selectedLearnerId = event.target.value;
  renderLearning();
});

els.mentorLearningList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-mentor-course]");
  if (!button) return;
  selectedLearnerId = button.dataset.mentorId;
  navigateTo(`#/learning/${button.dataset.openMentorCourse}`);
});

els.learningView.addEventListener("click", async (event) => {
  const filterButton = event.target.closest("[data-learning-filter]");
  if (filterButton) {
    learningTypeFilter = filterButton.dataset.learningFilter;
    renderLearning();
    return;
  }
  const completeButton = event.target.closest("[data-complete-learning-module]");
  if (!completeButton || !selectedLearnerId) return;
  completeButton.disabled = true;
  const courseId = completeButton.dataset.courseId;
  const moduleId = completeButton.dataset.completeLearningModule;
  await queueLearningMutation(() => completeLearningModule(courseId, moduleId));
  showFeedback("Kursmomentet har markerats som klart.");
});

els.learningView.addEventListener("submit", async (event) => {
  const reflectionForm = event.target.closest("[data-learning-reflection]");
  if (reflectionForm) {
    event.preventDefault();
    const courseId = reflectionForm.dataset.courseId;
    const moduleId = reflectionForm.dataset.learningReflection;
    const reflection = reflectionForm.querySelector("textarea").value.trim();
    reflectionForm.querySelector('button[type="submit"]').disabled = true;
    await queueLearningMutation(() => {
      const record = learningProgressRecord(selectedLearnerId, courseId);
      return completeLearningModule(courseId, moduleId, {
        reflections: { ...(record.reflections || {}), [moduleId]: reflection }
      });
    });
    showFeedback("Reflektionen har sparats.");
    return;
  }
  const testForm = event.target.closest("[data-learning-test]");
  if (!testForm) return;
  event.preventDefault();
  const test = learningContentById(selectedLearningContent(), testForm.dataset.learningTest);
  if (!test || !selectedLearnerId) return;
  testForm.querySelector('button[type="submit"]').disabled = true;
  const answers = Object.fromEntries(test.questions.map((question) => [question.id, new FormData(testForm).get(question.id)]));
  const result = scoreKnowledgeTest(test, answers);
  const courseId = testForm.dataset.courseId || `test:${test.id}`;
  const moduleId = testForm.dataset.moduleId;
  await queueLearningMutation(async () => {
    const record = learningProgressRecord(selectedLearnerId, courseId);
    const completedModuleIds = result.passed ? [...new Set([...(record.completedModuleIds || []), moduleId])] : record.completedModuleIds || [];
    await saveLearningProgress({
      ...record,
      completedModuleIds,
      attempts: [...(record.attempts || []), { testId: test.id, testVersion: test.version, answers, ...result, attemptedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString()
    });
    markSaved();
    await refresh();
  });
  showFeedback(result.passed ? `Testet är godkänt med ${result.score}%.` : `Resultatet blev ${result.score}%. Testet behöver göras om.`);
});

els.learningAdministrationView.addEventListener("change", async (event) => {
  const publicInput = event.target.closest("[data-learning-public]");
  if (publicInput) {
    await updateTenantLearningPublic(publicInput.dataset.learningPublic, publicInput.checked);
    markSaved();
    showFeedback("Det publika materialurvalet har uppdaterats.");
    await refresh();
    return;
  }
  const selectionInput = event.target.closest("[data-learning-selection]");
  if (!selectionInput) return;
  await updateTenantLearningSelection(selectionInput.dataset.learningSelection, selectionInput.checked);
  markSaved();
  showFeedback("Kommunens utbildningsurval har uppdaterats.");
  await refresh();
});

els.supportAreasAdministrationView.addEventListener("change", async (event) => {
  const enabledInput = event.target.closest("[data-support-area-enabled]");
  const publicInput = event.target.closest("[data-support-area-public]");
  if (!enabledInput && !publicInput) return;
  const areaId = enabledInput?.dataset.supportAreaEnabled || publicInput?.dataset.supportAreaPublic;
  const existing = tenantSupportAreaSelection.find((selection) => selection.supportAreaId === areaId);
  if (!existing) return;
  const enabled = enabledInput ? enabledInput.checked : existing.enabled;
  await saveTenantSupportAreaSelection({
    ...existing,
    enabled,
    public: enabled ? (publicInput ? publicInput.checked : existing.public) : false,
    updatedAt: new Date().toISOString(),
    updatedBy: CURRENT_USER_ID
  });
  markSaved();
  showFeedback("Kommunens urval av stödområden har uppdaterats.");
  await refresh();
});

els.learningAdministrationView.addEventListener("click", async (event) => {
  const filterButton = event.target.closest("[data-learning-admin-filter]");
  if (filterButton) {
    learningAdminFilter = filterButton.dataset.learningAdminFilter;
    renderLearningAdministration();
    return;
  }
  const latestButton = event.target.closest("[data-use-latest-learning]");
  if (!latestButton) return;
  const contentId = latestButton.dataset.useLatestLearning;
  const requiredIds = requiredLearningContentIds(learningContent, [contentId]);
  await Promise.all(requiredIds.map((id) => {
    const latest = learningContentById(learningContent, id);
    const existing = tenantLearningSelection.find((item) => item.contentId === id);
    return saveTenantLearningSelection({
      tenantId: DEFAULT_TENANT_ID,
      contentId: id,
      selectedVersion: latest.version,
      explicit: id === contentId ? true : Boolean(existing?.explicit),
      public: Boolean(existing?.public),
      selectedAt: existing?.selectedAt || new Date().toISOString(),
      selectedBy: CURRENT_USER_ID
    });
  }));
  markSaved();
  showFeedback("Kommunens urval använder nu den senaste versionen.");
  await refresh();
});

els.learningAdministrationView.addEventListener("submit", async (event) => {
  const form = event.target.closest("#learningAdminForm");
  if (!form) return;
  event.preventDefault();
  const item = learningContentById(learningContent, form.dataset.contentId);
  if (!item) return;
  const nextVersion = Math.max(0, ...learningContentVersions.filter((version) => version.id === item.id).map((version) => Number(version.version))) + 1;
  await saveLearningContent({
    ...item,
    version: nextVersion,
    title: form.querySelector("#learningAdminTitle").value.trim(),
    summary: form.querySelector("#learningAdminSummary").value.trim(),
    bodyMarkdown: form.querySelector("#learningAdminMarkdown").value.trim(),
    ...(item.type === "test" ? { passingScore: Number(form.querySelector("#learningAdminPassingScore").value) } : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: CURRENT_USER_ID
  });
  markSaved();
  showFeedback("En ny version av innehållet har sparats.");
  await refresh();
});

document.addEventListener("keydown", (event) => {
  if (!["PageUp", "PageDown"].includes(event.key) || event.defaultPrevented) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  if (document.querySelector(".modal.show")) return;

  event.preventDefault();
  window.scrollBy({
    top: window.innerHeight * 0.85 * (event.key === "PageDown" ? 1 : -1),
    behavior: "smooth"
  });
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#/']");
  if (!link || event.defaultPrevented || event.button !== 0) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== "_self") return;
  event.preventDefault();
  navigateTo(link.getAttribute("href"));
});

window.addEventListener("hashchange", () => {
  if (pendingIncomingContactId && window.location.hash !== "#/case/new") pendingIncomingContactId = null;
  if (pendingSourceCaseId && window.location.hash !== "#/case/new") pendingSourceCaseId = null;
  renderAll();
});

openDatabase()
  .then(async (database) => {
    const modalElement = document.querySelector("#candidateModal");
    candidateModal = new bootstrap.Modal(modalElement);
    const handlerModalElement = document.querySelector("#handlerModal");
    handlerModal = new bootstrap.Modal(handlerModalElement);
    caseLifecycleModal = new bootstrap.Modal(els.caseLifecycleModal);
    confirmActionModal = new bootstrap.Modal(els.confirmActionModal);
    modalElement.addEventListener("shown.bs.modal", () => document.querySelector("#nameInput").focus());
    handlerModalElement.addEventListener("shown.bs.modal", () => els.handlerNameInput.focus());
    els.confirmActionButton.addEventListener("click", () => {
      if (resolveConfirmation("confirm")) confirmActionModal.hide();
    });
    els.confirmActionAlternativeButton.addEventListener("click", () => {
      if (resolveConfirmation("alternative")) confirmActionModal.hide();
    });
    els.confirmActionModal.addEventListener("hidden.bs.modal", () => resolveConfirmation("cancel"));
    els.identityVerificationPanel.classList.add("mt-4", "mb-0");
    els.mentorIdentityHost.append(els.identityVerificationPanel);
    db = database;
    await ensureDefaultHandlers();
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }
    await refresh();
    if (sessionStorage.getItem(SUPPORT_PANEL_SESSION_KEY) === "true") {
      bootstrap.Offcanvas.getOrCreateInstance(els.supportOffcanvas).show();
    }
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="p-4"><h1>Kunde inte öppna IndexedDB</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
