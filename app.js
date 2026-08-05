import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TEMPLATES,
  AD_HOC_ACTIVITY_TEMPLATE_ID,
  CASE_STATUS_LABELS,
  CASE_TYPE_DEFINITIONS,
  DEFAULT_ORGANIZATION_UNIT_ID,
  DEFAULT_TENANT_ID,
  activityStatusLabel as domainActivityStatusLabel,
  activityTemplateById,
  assessCertificationApproval,
  canTransitionActivity,
  caseStatusLabel,
  caseTypeById,
  caseTypeByName,
  deriveCaseStatus as deriveDomainCaseStatus,
  findMentorDuplicates,
  normalizeActivityStatus,
  normalizeCaseStatus,
  resultClassification,
  resultOptions,
  stableHash
} from "./case-domain.js";
import { marked } from "./vendor/marked/marked.esm.js";
import { resolveFeatureLink, routineSectionKey, routineSectionRoute } from "./feature-links.js";

const DB_NAME = "foraldramentorer";
const DB_VERSION = 6;
const STORE = "candidates";
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
const CASE_DOCUMENT_BLOBS_STORE = "caseDocumentBlobs";
const CASE_TYPE_DEFINITIONS_STORE = "caseTypeDefinitions";
const ACTIVITY_TEMPLATE_DEFINITIONS_STORE = "activityTemplateDefinitions";
const PROCESSED_COMMANDS_STORE = "processedCommands";
const CURRENT_USER_ID = "handler-sara";

const STATUSES = [
  "Anmäld",
  "Kontrollerad",
  "Utbildning pågår",
  "Redo för intervju",
  "Godkänd/Certifierad"
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

const NEXT_ACTIONS = [
  {
    key: "identityVerified",
    label: "Verifiera identitet",
    description: "Kontrollera personens identitet och markera kontrollen som klar.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "registryChecked",
    label: "Granska belastningsregister",
    description: "Granska registerutdraget och markera kontrollen som klar.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "referencesDone",
    label: "Slutför referenser",
    description: "Dokumentera att referenserna är färdiga.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "trainingDone",
    label: "Slutför e-learning",
    description: "Följ upp utbildningen och markera momentet som klart.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "quizDone",
    label: "Genomför kunskapsavstämning",
    description: "Genomför avstämningen och markera momentet som klart.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "inviteInterview",
    label: "Kalla till intervju",
    description: "Skicka kallelsen och registrera att intervjun är bokad.",
    tabId: "mentor-interview-tab",
    buttonLabel: "Öppna intervju"
  },
  {
    key: "interviewDone",
    label: "Genomför intervju",
    description: "Boka eller dokumentera intervjun innan ärendet går till beslut.",
    tabId: "mentor-interview-tab",
    buttonLabel: "Öppna intervju"
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
    status: "Godkänd/Certifierad",
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
    ...seedCandidates[6],
    name: "Omar Rahimi",
    area: "Öster",
    languages: "Svenska, dari",
    availability: "Dagtid och helger",
    coordinator: "Maja Ekström"
  }
];

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
    title: "Dashboard och mentorflöde",
    route: "#/dashboard",
    summary: "Visa hur kommunen snabbt ser var mentorerna befinner sig i onboardingflödet och vilka ärenden som behöver handläggning."
  },
  {
    id: "register",
    title: "Mentorregister",
    route: "#/mentors",
    summary: "Visa registerlistan, sökning, statusfilter och hur en post öppnas som ett mentorkort."
  },
  {
    id: "cases",
    title: "Ärenden och aktiviteter",
    route: "#/cases",
    summary: "Visa ärenderegistret, flera handläggare, certifieringsaktiviteter, fria uppföljningar, handlingar och automatisk logg."
  },
  {
    id: "new-mentor",
    title: "Registrera ny mentor",
    route: "#/mentor/new",
    summary: "Visa att ny mentor registreras som ett vanligt mentorkort, inte som en separat dialogruta."
  },
  {
    id: "controls",
    title: "Kontroller och spårbarhet",
    route: "#/mentor",
    summary: "Visa identitet, kontroller, bekräftelsedialoger, ansvarig handläggare, tidpunkt och frivillig notering."
  },
  {
    id: "meetings",
    title: "Möten och uppföljningar",
    route: "#/mentor",
    summary: "Visa mötesjournalen för certifieringsintervju, uppföljningar och andra kontakter."
  },
  {
    id: "handlers",
    title: "Administration av handläggare",
    route: "#/administration",
    summary: "Visa handläggarregistret och att handläggare redigeras i samma registerkortsmönster."
  }
];

let db;
let candidates = [];
let handlers = [];
let meetings = [];
let presentationComments = [];
let cases = [];
let caseAssignments = [];
let caseActivities = [];
let caseDocuments = [];
let caseEvents = [];
let activityDeviations = [];
let deviationDecisions = [];
let caseMeetings = [];
let selectedPresentationStepId = PRESENTATION_STEPS[0].id;
let selectedId = null;
let selectedCaseRecordId = null;
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
let handlerSearchTerm = "";
let handlerStatusFilter = "";
let handlerModal;
let selectedHandlerId = null;
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

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  breadcrumb: document.querySelector("#breadcrumb"),
  currentUserInitials: document.querySelector("#currentUserInitials"),
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  navDashboard: document.querySelector("#navDashboard"),
  navPresentation: document.querySelector("#navPresentation"),
  navCases: document.querySelector("#navCases"),
  navMatchings: document.querySelector("#navMatchings"),
  navAssignments: document.querySelector("#navAssignments"),
  navCandidates: document.querySelector("#navCandidates"),
  navAdministration: document.querySelector("#navAdministration"),
  navHandlers: document.querySelector("#navHandlers"),
  navRoutines: document.querySelector("#navRoutines"),
  dashboardView: document.querySelector("#dashboardView"),
  presentationView: document.querySelector("#presentationView"),
  casesView: document.querySelector("#casesView"),
  caseDetailView: document.querySelector("#caseDetailView"),
  candidatesView: document.querySelector("#candidatesView"),
  detailView: document.querySelector("#detailView"),
  administrationView: document.querySelector("#administrationView"),
  routinesView: document.querySelector("#routinesView"),
  routinesSearchInput: document.querySelector("#routinesSearchInput"),
  clearRoutinesSearchButton: document.querySelector("#clearRoutinesSearchButton"),
  routinesSearchResults: document.querySelector("#routinesSearchResults"),
  routinesToc: document.querySelector("#routinesToc"),
  routinesContent: document.querySelector("#routinesContent"),
  copyRoutinesLinkButton: document.querySelector("#copyRoutinesLinkButton"),
  handlerDetailView: document.querySelector("#handlerDetailView"),
  handlerDetailEmpty: document.querySelector("#handlerDetailEmpty"),
  handlerDetail: document.querySelector("#handlerDetail"),
  totalCount: document.querySelector("#totalCount"),
  pipelineGrid: document.querySelector("#pipelineBoard .pipeline-grid"),
  actionTableBody: document.querySelector("#actionTableBody"),
  actionQueueSummary: document.querySelector("#actionQueueSummary"),
  openActionQueueButton: document.querySelector("#openActionQueueButton"),
  myActivitiesQueueButton: document.querySelector("#myActivitiesQueueButton"),
  unassignedQueueButton: document.querySelector("#unassignedQueueButton"),
  overdueQueueButton: document.querySelector("#overdueQueueButton"),
  dashboardMentorRegisterLink: document.querySelector("#dashboardMentorRegisterLink"),
  presentationStepList: document.querySelector("#presentationStepList"),
  presentationOpenStepButton: document.querySelector("#presentationOpenStepButton"),
  presentationStepNumber: document.querySelector("#presentationStepNumber"),
  presentationStepTitle: document.querySelector("#presentationStepTitle"),
  presentationStepSummary: document.querySelector("#presentationStepSummary"),
  presentationCommentForm: document.querySelector("#presentationCommentForm"),
  presentationCommentInput: document.querySelector("#presentationCommentInput"),
  presentationCommentsEmpty: document.querySelector("#presentationCommentsEmpty"),
  presentationCommentsList: document.querySelector("#presentationCommentsList"),
  caseListCount: document.querySelector("#caseListCount"),
  caseRegisterTitle: document.querySelector("#caseRegisterTitle"),
  caseSearchInput: document.querySelector("#caseSearchInput"),
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
  selectedCaseOwner: document.querySelector("#selectedCaseOwner"),
  selectedCaseUpdated: document.querySelector("#selectedCaseUpdated"),
  caseCreateForm: document.querySelector("#caseCreateForm"),
  caseReadView: document.querySelector("#caseReadView"),
  caseTypeInput: document.querySelector("#caseTypeInput"),
  caseTitleInput: document.querySelector("#caseTitleInput"),
  caseMentorInput: document.querySelector("#caseMentorInput"),
  caseMentorIdInput: document.querySelector("#caseMentorIdInput"),
  caseMentorSuggestions: document.querySelector("#caseMentorSuggestions"),
  caseDuplicatePanel: document.querySelector("#caseDuplicatePanel"),
  caseOwnerInput: document.querySelector("#caseOwnerInput"),
  casePriorityInput: document.querySelector("#casePriorityInput"),
  caseDueDateInput: document.querySelector("#caseDueDateInput"),
  caseDescriptionInput: document.querySelector("#caseDescriptionInput"),
  caseCoHandlerInputs: document.querySelector("#caseCoHandlerInputs"),
  cancelCaseCreateButton: document.querySelector("#cancelCaseCreateButton"),
  saveCaseButton: document.querySelector("#saveCaseButton"),
  editCaseButton: document.querySelector("#editCaseButton"),
  newCaseActivityButton: document.querySelector("#newCaseActivityButton"),
  completeCaseButton: document.querySelector("#completeCaseButton"),
  pauseCaseButton: document.querySelector("#pauseCaseButton"),
  resumeCaseButton: document.querySelector("#resumeCaseButton"),
  closeCaseButton: document.querySelector("#closeCaseButton"),
  reopenCaseButton: document.querySelector("#reopenCaseButton"),
  caseActivityCount: document.querySelector("#caseActivityCount"),
  caseDocumentCount: document.querySelector("#caseDocumentCount"),
  caseMeetingCount: document.querySelector("#caseMeetingCount"),
  caseEventCount: document.querySelector("#caseEventCount"),
  caseStatusFact: document.querySelector("#caseStatusFact"),
  casePriorityFact: document.querySelector("#casePriorityFact"),
  caseDueDateFact: document.querySelector("#caseDueDateFact"),
  caseDescriptionFact: document.querySelector("#caseDescriptionFact"),
  caseOwnerFact: document.querySelector("#caseOwnerFact"),
  caseCoHandlersFact: document.querySelector("#caseCoHandlersFact"),
  caseMentorFact: document.querySelector("#caseMentorFact"),
  caseCreatedFact: document.querySelector("#caseCreatedFact"),
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
  activityDetailForm: document.querySelector("#activityDetailForm"),
  activityDetailStatusInput: document.querySelector("#activityDetailStatusInput"),
  activityDetailResultInput: document.querySelector("#activityDetailResultInput"),
  activityResultHelp: document.querySelector("#activityResultHelp"),
  activityDetailOwnerInput: document.querySelector("#activityDetailOwnerInput"),
  activityDetailDueDateInput: document.querySelector("#activityDetailDueDateInput"),
  activityWaitingForRow: document.querySelector("#activityWaitingForRow"),
  activityDetailWaitingForInput: document.querySelector("#activityDetailWaitingForInput"),
  activityDetailNoteInput: document.querySelector("#activityDetailNoteInput"),
  activityDetailSaveState: document.querySelector("#activityDetailSaveState"),
  activityDetailSaveButton: document.querySelector("#activityDetailSaveButton"),
  reopenActivityButton: document.querySelector("#reopenActivityButton"),
  activityDeviationPanel: document.querySelector("#activityDeviationPanel"),
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
  caseMeetingForm: document.querySelector("#caseMeetingForm"),
  caseMeetingTypeInput: document.querySelector("#caseMeetingTypeInput"),
  caseMeetingDateInput: document.querySelector("#caseMeetingDateInput"),
  caseMeetingModeInput: document.querySelector("#caseMeetingModeInput"),
  caseMeetingActivityInput: document.querySelector("#caseMeetingActivityInput"),
  caseMeetingSummaryInput: document.querySelector("#caseMeetingSummaryInput"),
  caseMeetingsEmpty: document.querySelector("#caseMeetingsEmpty"),
  caseMeetingsList: document.querySelector("#caseMeetingsList"),
  caseEventTableBody: document.querySelector("#caseEventTableBody"),
  seedButton: document.querySelector("#seedButton"),
  exampleDataMenu: document.querySelector("#exampleDataMenu"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  dashboardNewCaseButton: document.querySelector("#dashboardNewCaseButton"),
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
  editAreaInput: document.querySelector("#editAreaInput"),
  editLanguagesInput: document.querySelector("#editLanguagesInput"),
  editAvailabilityInput: document.querySelector("#editAvailabilityInput"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
  coordinatorFieldRow: document.querySelector("#coordinatorFieldRow"),
  nameFact: document.querySelector("#nameFact"),
  personalNumberFact: document.querySelector("#personalNumberFact"),
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
  mentorCaseTableBody: document.querySelector("#mentorCaseTableBody"),
  newMentorCaseButton: document.querySelector("#newMentorCaseButton"),
  meetingsTabCount: document.querySelector("#meetingsTabCount"),
  logTabCount: document.querySelector("#logTabCount"),
  checklist: document.querySelector("#checklist"),
  identityVerificationPanel: document.querySelector("#identityVerificationPanel"),
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
  confirmActionMentor: document.querySelector("#confirmActionMentor"),
  confirmActionActor: document.querySelector("#confirmActionActor"),
  confirmActionTime: document.querySelector("#confirmActionTime"),
  confirmActionNote: document.querySelector("#confirmActionNote"),
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

function confirmAction({ eyebrow = "Bekräfta ändring", title, body, mentorName, confirmLabel = "Bekräfta", danger = false }) {
  if (!confirmActionModal) return Promise.resolve({ confirmed: window.confirm(body), note: "" });
  els.confirmActionEyebrow.textContent = eyebrow;
  els.confirmActionTitle.textContent = title;
  els.confirmActionBody.textContent = body;
  els.confirmActionMentor.textContent = mentorName || "Ej angivet";
  els.confirmActionActor.textContent = currentUserName();
  els.confirmActionTime.textContent = formatDateTime(new Date().toISOString());
  els.confirmActionNote.value = "";
  els.confirmActionButton.textContent = confirmLabel;
  els.confirmActionButton.classList.toggle("btn-danger", danger);
  els.confirmActionButton.classList.toggle("btn-primary", !danger);
  confirmActionModal.show();

  return new Promise((resolve) => {
    pendingConfirmation = resolve;
  });
}

function resolveConfirmation(value) {
  if (!pendingConfirmation) return;
  const resolve = pendingConfirmation;
  pendingConfirmation = null;
  resolve({ confirmed: value, note: value ? els.confirmActionNote.value.trim() : "" });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
      const blobStore = ensureStore(CASE_DOCUMENT_BLOBS_STORE);
      ensureIndex(blobStore, "tenantDocument", ["tenantId", "documentId"], { unique: true });
      ensureStore(CASE_TYPE_DEFINITIONS_STORE, { keyPath: ["tenantId", "id", "version"] });
      ensureStore(ACTIVITY_TEMPLATE_DEFINITIONS_STORE, { keyPath: ["tenantId", "id", "version"] });
      ensureStore(PROCESSED_COMMANDS_STORE, { keyPath: ["tenantId", "idempotencyKey"] });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
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

function clearAllCaseData() {
  return Promise.all([
    clearCases(),
    clearCaseAssignments(),
    clearCaseActivities(),
    clearCaseDocuments(),
    clearCaseEvents(),
    clearStore(activityDeviationTx),
    clearStore(deviationDecisionTx),
    clearStore(caseMeetingTx)
  ]);
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

function getAllPresentationComments() {
  return new Promise((resolve, reject) => {
    const request = presentationCommentTx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function savePresentationComment(comment) {
  return new Promise((resolve, reject) => {
    const request = presentationCommentTx("readwrite").put(comment);
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

function exampleTemplates(count) {
  if (count === 1) return seedCandidates.slice(3, 4);
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

function buildExampleDataset(count) {
  const now = new Date().toISOString();
  return exampleTemplates(count).map((candidate, index) => {
    const id = crypto.randomUUID();
    const identityVerified = Boolean(candidate.checks?.identityVerified);
    const coordinator = index % 2 === 0 ? "" : candidate.coordinator;
    const checkMeta = buildCheckMeta(candidate.checks, {
      checkedAt: now,
      checkedBy: coordinator || "System"
    });
    return {
      ...candidate,
      tenantId: DEFAULT_TENANT_ID,
      checks: { ...candidate.checks },
      checkMeta,
      id,
      coordinatorId: "",
      coordinator,
      personalNumber: makeExamplePersonalNumber(index),
      identityMethod: identityVerified ? (index % 2 === 0 ? "bankid" : "physical_id") : "",
      identityVerifiedAt: identityVerified ? now : "",
      identityVerifiedBy: identityVerified ? "Sara Lind" : "",
      exampleData: true,
      exampleDataVersion: 3,
      exampleDatasetSize: count,
      caseNumber: makeCaseNumber(id),
      history: [
        { at: now, text: "Ärende skapat som exempeldata", actor: "System" },
        { at: now, text: `Status satt till ${candidate.status}`, actor: "System" }
      ],
      createdAt: now,
      updatedAt: now
    };
  });
}

async function loadCaseData() {
  [cases, caseAssignments, caseActivities, caseDocuments, caseEvents, activityDeviations, deviationDecisions, caseMeetings] = await Promise.all([
    getAllCases(),
    getAllCaseAssignments(),
    getAllCaseActivities(),
    getAllCaseDocuments(),
    getAllCaseEvents(),
    getAllActivityDeviations(),
    getAllDeviationDecisions(),
    getAllCaseMeetings()
  ]);
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

function normalizedCaseRecord(caseRecord) {
  const type = caseTypeById(caseRecord.caseTypeId) || caseTypeByName(caseRecord.type);
  return {
    ...caseRecord,
    tenantId: caseRecord.tenantId || DEFAULT_TENANT_ID,
    organizationUnitId: caseRecord.organizationUnitId || DEFAULT_ORGANIZATION_UNIT_ID,
    caseTypeId: type.id,
    caseTypeVersion: caseRecord.caseTypeVersion || type.version,
    type: type.name,
    mentorId: caseRecord.mentorId || null,
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
  const templateId = activity.templateId || activity.templateKey || AD_HOC_ACTIVITY_TEMPLATE_ID;
  const status = normalizeActivityStatus(activity.status);
  const resultCode = activity.resultCode || activity.result || (status === "completed" ? defaultCompletedResult({ templateId }) : null);
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
    caseRecord.status = deriveDomainCaseStatus(
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
      activityId: meeting.type === "Certifieringsintervju"
        ? normalizedActivities.find((activity) => activity.caseId === caseRecord.id && activity.templateId === "interviewDone")?.id || null
        : null,
      meetingType: meeting.type === "Certifieringsintervju" ? "certification_interview" : meeting.type === "Uppföljning" ? "follow_up" : "other",
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
  const caseDefinitions = CASE_TYPE_DEFINITIONS.map((definition) => ({
    ...definition,
    tenantId: DEFAULT_TENANT_ID,
    status: "published",
    activityTemplateRefs: (definition.activityTemplateIds || []).map((templateId) => ({ templateId, version: 1 }))
  }));
  const activityDefinitions = ACTIVITY_TEMPLATES.map((template, sortOrder) => ({
    id: template.id,
    tenantId: DEFAULT_TENANT_ID,
    version: template.version,
    status: "published",
    title: template.title,
    sortOrder,
    resultDefinitions: template.results.map(([code, label, classification]) => ({ code, label, classification, requiresNote: classification === "deviation" }))
  }));

  await atomicPut({
    [CASES_STORE]: normalizedCases,
    [CASE_ASSIGNMENTS_STORE]: normalizedAssignments,
    [CASE_ACTIVITIES_STORE]: normalizedActivities,
    [CASE_DOCUMENTS_STORE]: normalizedDocuments,
    [CASE_EVENTS_STORE]: normalizedEvents,
    [ACTIVITY_DEVIATIONS_STORE]: migratedDeviations,
    [CASE_MEETINGS_STORE]: [...caseMeetings, ...migratedMeetings],
    [CASE_TYPE_DEFINITIONS_STORE]: caseDefinitions,
    [ACTIVITY_TEMPLATE_DEFINITIONS_STORE]: activityDefinitions
  });
}

function handlerNameById(id) {
  if (!id || id === "system") return "System";
  return handlers.find((handler) => [handler.id, handler.userId, handler.name].includes(id))?.name || "Okänd användare";
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
  if (decision?.status === "completed" && decision.resultCode === "approved" && caseRecord.status === "closed") status = "Godkänd/Certifierad";
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
  if (candidate.status === "Godkänd/Certifierad") return "closed";
  if (CHECKS.every(([key]) => candidate.checks?.[key])) {
    return "in_progress";
  }
  if (Object.values(candidate.checks || {}).some(Boolean) || candidate.coordinatorId) return "in_progress";
  return "new";
}

function certificationActivityState(candidate, key) {
  if (key === "inviteInterview") return candidate.interviewDate ? "completed" : "not_started";
  if (key === "decision") return candidate.status === "Godkänd/Certifierad" ? "completed" : "not_started";
  return candidate.checks?.[key] ? "completed" : "not_started";
}

function certificationActivityMeta(candidate, key) {
  if (key === "inviteInterview" && candidate.interviewDate) {
    return { completedAt: candidate.updatedAt, completedBy: candidate.coordinator || "System", note: `Intervju bokad ${formatDateTime(candidate.interviewDate)}` };
  }
  if (key === "decision" && candidate.status === "Godkänd/Certifierad") {
    return { completedAt: candidate.updatedAt, completedBy: candidate.coordinator || "System", note: "Mentorn godkänd och certifierad" };
  }
  const meta = candidate.checkMeta?.[key] || {};
  return { completedAt: meta.checkedAt || "", completedBy: meta.checkedBy || "", note: meta.note || "" };
}

async function ensureCertificationCases() {
  const existingActivities = new Set(caseActivities.map((activity) => activity.id));
  const existingAssignments = new Set(caseAssignments.map((assignment) => assignment.id));
  const writes = [];

  for (const candidate of candidates) {
    const existingCase = cases.find((item) => item.mentorId === candidate.id && (item.caseTypeId === "mentor-certification" || item.type === "Certifiering av mentor"));
    const caseId = existingCase?.id || `cert-${candidate.id}`;
    const now = new Date().toISOString();
    const existingCaseActivities = caseActivities.filter((activity) => activity.caseId === caseId);
    const currentCaseStatus = existingCase
      ? normalizeCaseStatus(existingCase.status)
      : certificationCaseStatus(candidate);
    const caseRecord = {
      id: caseId,
      tenantId: existingCase?.tenantId || DEFAULT_TENANT_ID,
      number: existingCase?.number || candidate.caseNumber || makeCaseNumber(caseId),
      caseTypeId: "mentor-certification",
      caseTypeVersion: 1,
      organizationUnitId: existingCase?.organizationUnitId || DEFAULT_ORGANIZATION_UNIT_ID,
      type: "Certifiering av mentor",
      title: `Certifiering av ${candidate.name}`,
      mentorId: candidate.id,
      status: currentCaseStatus,
      priority: existingCase?.priority || "normal",
      dueDate: existingCase?.dueDate || null,
      description: existingCase?.description || "Prövning och certifiering inför uppdrag som föräldramentor.",
      createdAt: existingCase?.createdAt || candidate.createdAt || now,
      createdBy: existingCase?.createdBy || "system",
      updatedAt: existingCase?.updatedAt || candidate.updatedAt || now,
      updatedBy: existingCase?.updatedBy || "system",
      version: Number(existingCase?.version || 1),
      closedAt: existingCase?.closedAt || (candidate.status === "Godkänd/Certifierad" ? candidate.updatedAt : null),
      closedBy: existingCase?.closedBy || (candidate.status === "Godkänd/Certifierad" ? actorId(candidate.coordinator) : null)
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
        text: "Certifieringsärendet skapades från mentorposten",
        actorId: "system",
        actor: "System",
        occurredAt: caseRecord.createdAt,
        createdAt: caseRecord.createdAt,
        schemaVersion: 1,
        entityType: "case",
        entityId: caseId,
        correlationId: crypto.randomUUID(),
        idempotencyKey: `seed-case-${caseId}`,
        payload: { message: "Certifieringsärendet skapades från mentorposten" }
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
  handlers = await getAllHandlers();
  await migrateDefaultHandlerRecords();
  handlers.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  const storedCandidates = await getAllCandidates();
  candidates = storedCandidates.map(normalizeCandidate);
  await Promise.all(candidates.filter((candidate, index) => !storedCandidates[index].tenantId).map(saveCandidate));
  meetings = await getAllMeetings();
  presentationComments = await getAllPresentationComments();
  await migrateSingleExampleMentor();
  await migrateExampleCoordinatorDistribution();
  await migrateCoordinatorReferences();
  await ensureUniqueCaseNumbers();
  await migrateLegacyMeetingNotes();
  await loadCaseData();
  await ensureCertificationCases();
  await loadCaseData();
  await migrateCaseDomainV6();
  await loadCaseData();
  candidates = candidates.map(projectMentorWorkflow);
  meetings = await getAllMeetings();
  meetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  caseMeetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  cases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  caseActivities.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || new Date(a.createdAt) - new Date(b.createdAt));
  caseEvents.sort((a, b) => new Date(b.occurredAt || b.createdAt) - new Date(a.occurredAt || a.createdAt));
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  renderAll();
}

async function migrateLegacyMeetingNotes() {
  const existingIds = new Set(meetings.map((meeting) => meeting.id));
  const legacyCandidates = candidates.filter((candidate) => candidate.notes);
  const legacyMeetings = legacyCandidates
    .filter((candidate) => !existingIds.has(`legacy-${candidate.id}`))
    .map((candidate) => ({
      id: `legacy-${candidate.id}`,
      mentorId: candidate.id,
      type: candidate.interviewDate || candidate.checks?.interviewDone ? "Certifieringsintervju" : "Övrig kontakt",
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

function renderAll() {
  applyRoute();
  renderCurrentUser();
  renderSummary();
  renderPipeline();
  renderDashboard();
  renderPresentation();
  renderCases();
  renderCaseDetail();
  renderTable();
  renderDetail();
  renderHandlers();
  renderHandlerDetail();
}

function currentUser() {
  return handlers.find((handler) => handler.id === CURRENT_USER_ID)
    || { id: CURRENT_USER_ID, userId: "FMU-1003", name: "Sara Lind", role: "Samordnare" };
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
  els.currentUserName.textContent = user.name;
  els.currentUserRole.textContent = user.active === false ? `${user.role} · Inaktiv` : user.role;
  els.currentUserInitials.textContent = userInitials(user.name);
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
  const identityVerified = Boolean(candidate.checks?.identityVerified && personalNumber && identityMethod);
  const normalized = {
    ...candidate,
    tenantId: candidate.tenantId || DEFAULT_TENANT_ID,
    active: candidate.active !== false,
    checks: {
      ...(candidate.checks || {}),
      identityVerified
    },
    personalNumber,
    identityMethod,
    identityVerifiedAt: identityVerified ? candidate.identityVerifiedAt || candidate.updatedAt || candidate.createdAt : "",
    identityVerifiedBy: identityVerified ? candidate.identityVerifiedBy || candidate.coordinator || "System" : ""
  };
  return {
    ...normalized,
    personalNumber,
    identityMethod,
    checkMeta: normalizeCheckMeta(normalized),
    caseNumber: candidate.caseNumber || makeCaseNumber(candidate.id || candidate.createdAt),
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
      candidate.caseNumber = makeCaseNumber(candidate.id || candidate.createdAt, seen);
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
  return candidate.status !== "Godkänd/Certifierad" || !candidate.coordinatorId;
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
  if (!caseRecord) return { allowed: false, reasons: ["Certifieringsärendet saknas."] };
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

  if (candidate.status === "Godkänd/Certifierad") {
    return {
      key: null,
      label: "Ingen åtgärd",
      description: "Mentorn är certifierad och tillgänglig för matchning.",
      tabId: null,
      buttonLabel: ""
    };
  }

  const next = NEXT_ACTIONS.find((action) => !candidate.checks?.[action.key]);
  return next || {
    key: "decision",
    label: "Fatta beslut",
    description: "Alla krav är klara. Granska underlaget och certifiera mentorn.",
    tabId: "mentor-decision-tab",
    buttonLabel: "Öppna beslut"
  };
}

function parseRoute() {
  const hash = window.location.hash || "#/dashboard";
  const [, view, id] = hash.match(/^#\/([^/]+)\/?(.+)?$/) || [];
  return {
    view: normalizeRouteView(view || "dashboard"),
    id: id || null
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
    const response = await fetch("./docs/verksamhetsfloden-och-handlaggningsrutiner.md?v=20260805-feature-links-v1");
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
        link.href = feature.href;
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.title = "Funktionen är inte tillgänglig i denna version";
      }
    });
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
  const route = parseRoute();
  const previousCaseRecordId = selectedCaseRecordId;
  currentView = ["dashboard", "presentation", "cases", "case", "mentors", "mentor", "administration", "routines", "handler"].includes(route.view) ? route.view : "dashboard";
  selectedId = currentView === "mentor" ? route.id : selectedId;
  selectedCaseRecordId = currentView === "case" ? route.id : selectedCaseRecordId;
  if (currentView !== "case") {
    selectedCaseActivityId = null;
  } else if (selectedCaseActivityId && caseActivities.find((activity) => activity.id === selectedCaseActivityId)?.caseId !== route.id) {
    selectedCaseActivityId = null;
  }
  if (currentView !== "case" || route.id !== previousCaseRecordId) activityListFilter = "all";
  if (currentView !== "case" || route.id !== previousCaseRecordId) caseEditMode = false;
  selectedHandlerId = currentView === "handler" ? route.id : selectedHandlerId;
  workQueueOnly = currentView === "mentors" && route.id === "action";
  caseTypeFilter = currentView === "cases" && ["matching", "mentor-assignment"].includes(route.id) ? route.id : "";

  els.dashboardView.hidden = currentView !== "dashboard";
  els.presentationView.hidden = currentView !== "presentation";
  els.casesView.hidden = currentView !== "cases";
  els.caseDetailView.hidden = currentView !== "case";
  els.candidatesView.hidden = currentView !== "mentors";
  els.detailView.hidden = currentView !== "mentor";
  els.administrationView.hidden = currentView !== "administration";
  els.routinesView.hidden = currentView !== "routines";
  els.handlerDetailView.hidden = currentView !== "handler";

  els.navDashboard.classList.toggle("active", currentView === "dashboard");
  els.navPresentation.classList.toggle("active", currentView === "presentation");
  els.navCases.classList.toggle("active", (currentView === "cases" && !caseTypeFilter) || currentView === "case");
  els.navMatchings.classList.toggle("active", currentView === "cases" && caseTypeFilter === "matching");
  els.navAssignments.classList.toggle("active", currentView === "cases" && caseTypeFilter === "mentor-assignment");
  els.navCandidates.classList.toggle("active", currentView === "mentors" || currentView === "mentor");
  els.navAdministration.classList.toggle("active", ["administration", "routines", "handler"].includes(currentView));
  els.navHandlers.classList.toggle("active", currentView === "administration" || currentView === "handler");
  els.navRoutines.classList.toggle("active", currentView === "routines");

  if (currentView === "dashboard") {
    els.pageTitle.textContent = "Dashboard";
    els.breadcrumb.textContent = "Start / Dashboard";
  } else if (currentView === "presentation") {
    els.pageTitle.textContent = "Presentation";
    els.breadcrumb.textContent = "Start / Presentation";
  } else if (currentView === "cases") {
    const sectionTitle = caseTypeFilter === "matching" ? "Matchningar" : caseTypeFilter === "mentor-assignment" ? "Uppdrag" : "Ärenderegister";
    els.pageTitle.textContent = sectionTitle;
    els.breadcrumb.textContent = `Start / ${sectionTitle}`;
  } else if (currentView === "case") {
    const isNewCase = route.id?.startsWith("new");
    els.pageTitle.textContent = isNewCase ? "Nytt ärende" : "Ärendekort";
    els.breadcrumb.textContent = isNewCase ? "Start / Ärenden / Nytt ärende" : "Start / Ärenden / Ärendekort";
  } else if (currentView === "mentors") {
    els.pageTitle.textContent = workQueueOnly ? "Arbetskö" : "Mentorregister";
    els.breadcrumb.textContent = workQueueOnly ? "Start / Onboarding / Arbetskö" : "Start / Onboarding / Mentorregister";
    els.mentorListTitle.textContent = workQueueOnly ? "Arbetskö" : "Mentorregister";
  } else if (currentView === "mentor") {
    const isNewMentor = route.id === "new";
    els.pageTitle.textContent = isNewMentor ? "Registrera mentor" : "Mentorkort";
    els.breadcrumb.textContent = isNewMentor ? "Start / Onboarding / Registrera mentor" : "Start / Onboarding / Mentorkort";
  } else if (currentView === "administration") {
    els.pageTitle.textContent = "Handläggare";
    els.breadcrumb.textContent = "Start / Systemadministration / Handläggare";
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
    "Godkänd/Certifierad": "Tillgänglig för matchning"
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
  els.seedButton.textContent = size
    ? `Prototypdata: ${size} ${size === 1 ? "mentor" : "mentorer"}`
    : "Prototypdata";
}

function renderDashboard() {
  els.actionTableBody.innerHTML = "";
  const openCases = cases.filter((caseRecord) => caseRecord.status !== "closed");
  const nextActivities = openCases
    .map((caseRecord) => ({ caseRecord, activity: nextCaseActivity(caseRecord) }))
    .filter((item) => item.activity);
  const queue = nextActivities.filter(({ caseRecord, activity }) => {
    const effectiveOwner = effectiveActivityHandler(activity, caseRecord);
    if (dashboardQueueMode === "unassigned") return !effectiveOwner;
    if (dashboardQueueMode === "overdue") {
      return effectiveOwner?.id === CURRENT_USER_ID && activityDueState(activity) === "overdue";
    }
    return effectiveOwner?.id === CURRENT_USER_ID;
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
    mine: "mina aktiviteter",
    unassigned: "otilldelade aktiviteter",
    overdue: "försenade aktiviteter"
  };
  const queueSingularLabels = {
    mine: "aktivitet i din arbetskö",
    unassigned: "otilldelad aktivitet",
    overdue: "försenad aktivitet"
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
    ["overdue", els.overdueQueueButton]
  ]) {
    const active = dashboardQueueMode === mode;
    button.classList.toggle("btn-primary", active);
    button.classList.toggle("btn-outline-secondary", !active);
    button.setAttribute("aria-pressed", String(active));
  }

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="text-secondary">Inga aktiviteter kräver åtgärd i den här arbetskön.</td>`;
    els.actionTableBody.append(row);
    return;
  }

  for (const { caseRecord, activity } of rows) {
    const mentor = caseMentor(caseRecord);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(caseRecord.number)}</strong></td>
      <td>${escapeHtml(mentor?.name || caseRecord.title)}<small>${escapeHtml(activityHandlerLabel(activity, caseRecord))}</small></td>
      <td>${escapeHtml(activity.title)}<small>${escapeHtml(activityHasBlockingResult(activity) ? "Ställningstagande krävs" : activityStatusLabel(activity.status))}</small></td>
      <td class="${activityDueState(activity) ? `activity-due-${activityDueState(activity)}` : ""}">${escapeHtml(activityDueLabel(activity))}</td>
      <td><button type="button" class="btn btn-outline-primary btn-sm" data-open-activity="${activity.id}">Öppna</button></td>
    `;
    els.actionTableBody.append(row);
  }
}

function selectedPresentationStep() {
  return PRESENTATION_STEPS.find((step) => step.id === selectedPresentationStepId) || PRESENTATION_STEPS[0];
}

function presentationRoute(step) {
  if (step.route !== "#/mentor") return step.route;
  const candidate = candidates[0];
  return candidate ? `#/mentor/${candidate.id}` : "#/mentor/new";
}

function renderPresentation() {
  const selectedStep = selectedPresentationStep();
  const selectedIndex = PRESENTATION_STEPS.findIndex((step) => step.id === selectedStep.id);
  els.presentationStepList.innerHTML = "";

  for (const [index, step] of PRESENTATION_STEPS.entries()) {
    const commentsForStep = presentationComments.filter((comment) => comment.stepId === step.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `presentation-step-button ${step.id === selectedStep.id ? "active" : ""}`;
    button.dataset.presentationStep = step.id;
    button.innerHTML = `
      <span class="presentation-step-index">${index + 1}</span>
      <span>
        <strong>${escapeHtml(step.title)}</strong>
        <small>${commentsForStep.length} ${commentsForStep.length === 1 ? "kommentar" : "kommentarer"}</small>
      </span>
    `;
    els.presentationStepList.append(button);
  }

  els.presentationStepNumber.textContent = `Steg ${selectedIndex + 1}`;
  els.presentationStepTitle.textContent = selectedStep.title;
  els.presentationStepSummary.textContent = selectedStep.summary;
  els.presentationOpenStepButton.textContent = `Öppna: ${selectedStep.title}`;
  renderPresentationComments(selectedStep.id);
}

function renderPresentationComments(stepId) {
  const comments = presentationComments
    .filter((comment) => comment.stepId === stepId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  els.presentationCommentsEmpty.hidden = comments.length > 0;
  els.presentationCommentsList.innerHTML = "";

  for (const comment of comments) {
    const item = document.createElement("article");
    item.className = "presentation-comment border rounded";
    item.innerHTML = `
      <div class="presentation-comment-meta">
        <strong>${escapeHtml(comment.createdBy || "Okänd")}</strong>
        <time datetime="${escapeHtml(comment.createdAt)}">${escapeHtml(formatDateTime(comment.createdAt))}</time>
      </div>
      <p class="mb-0">${escapeHtml(comment.text)}</p>
    `;
    els.presentationCommentsList.append(item);
  }
}

function selectedCaseRecord() {
  return cases.find((item) => item.id === selectedCaseRecordId);
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
    const handlerNames = assignmentsForCase(caseRecord.id)
      .map(handlerForAssignment)
      .filter(Boolean)
      .map((handler) => handler.name);
    const text = [caseRecord.number, caseRecord.title, caseRecord.type, mentor?.name, ...handlerNames].join(" ").toLowerCase();
    return (!caseTypeFilter || caseRecord.caseTypeId === caseTypeFilter)
      && (!caseStatusFilter || caseRecord.status === caseStatusFilter)
      && (!term || text.includes(term));
  });
}

function renderCases() {
  const filteredRows = filteredCases();
  const typeRows = caseTypeFilter ? cases.filter((caseRecord) => caseRecord.caseTypeId === caseTypeFilter) : cases;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / CASE_PAGE_SIZE));
  casePage = Math.min(casePage, pageCount);
  const start = (casePage - 1) * CASE_PAGE_SIZE;
  const rows = filteredRows.slice(start, start + CASE_PAGE_SIZE);
  els.caseRegisterTitle.textContent = caseTypeFilter === "matching" ? "Matchningsärenden" : caseTypeFilter === "mentor-assignment" ? "Mentoruppdrag" : "Ärenderegister";
  els.newGeneralCaseButton.textContent = caseTypeFilter === "matching" ? "Ny matchning" : caseTypeFilter === "mentor-assignment" ? "Nytt uppdrag" : "Nytt ärende";
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
    const owner = responsibleHandler(caseRecord);
    const nextActivity = nextCaseActivity(caseRecord);
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.dataset.caseId = caseRecord.id;
    row.setAttribute("aria-label", `Öppna ärende ${caseRecord.number}: ${caseRecord.title}`);
    row.innerHTML = `
      <td><strong>${escapeHtml(caseRecord.number)}</strong><small>${escapeHtml(formatDate(caseRecord.updatedAt))}</small></td>
      <td>${escapeHtml(caseRecord.title)}</td>
      <td>${escapeHtml(caseRecord.type)}</td>
      <td>${mentor ? escapeHtml(mentor.name) : '<span class="text-secondary">Ej personanknutet</span>'}</td>
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

function populateCaseForm(mentorId = "", caseRecord = null) {
  const currentOwnerId = responsibleHandler(caseRecord)?.id || CURRENT_USER_ID;
  const currentCoHandlerIds = new Set(coHandlers(caseRecord).map((handler) => handler.id));
  const selectedMentor = candidates.find((candidate) => candidate.id === mentorId);
  els.caseMentorInput.value = selectedMentor?.name || "";
  els.caseMentorIdInput.value = selectedMentor?.id || "";
  els.caseMentorSuggestions.hidden = true;
  els.caseMentorSuggestions.innerHTML = "";

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
  els.saveCaseButton.textContent = creating ? "Skapa ärende" : "Spara ändringar";

  if (creating) {
    const mentorId = selectedCaseRecordId.startsWith("new-") ? selectedCaseRecordId.slice(4) : "";
    els.selectedCaseType.textContent = "Nytt ärende";
    els.selectedCaseNumber.textContent = "Ärendenummer skapas när ärendet sparas";
    els.selectedCaseTitle.textContent = mentorId ? `Nytt ärende för ${candidates.find((candidate) => candidate.id === mentorId)?.name || "mentor"}` : "Nytt generellt ärende";
    els.selectedCaseStatus.textContent = "Nytt";
    els.selectedCaseStatus.className = caseStatusBadge("new");
    els.selectedCaseMentor.textContent = mentorId ? candidates.find((candidate) => candidate.id === mentorId)?.name || "Saknas" : "Ej personanknutet";
    els.selectedCaseOwner.textContent = currentUserName();
    els.selectedCaseUpdated.textContent = "Inte sparat";
    if (els.caseCreateForm.dataset.route !== selectedCaseRecordId) {
      els.caseCreateForm.reset();
      populateCaseForm(mentorId);
      if (newCaseTypePreset) els.caseTypeInput.value = newCaseTypePreset;
      els.caseCreateForm.dataset.route = selectedCaseRecordId;
    }
    return;
  }

  const mentor = caseMentor(caseRecord);
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
  els.selectedCaseOwner.textContent = owner?.name || "Ej tilldelad";
  els.selectedCaseUpdated.textContent = formatDateTime(caseRecord.updatedAt);
  els.caseStatusFact.textContent = caseStatusLabel(caseRecord.status);
  els.casePriorityFact.textContent = ({ high: "Hög", normal: "Normal", low: "Låg" })[caseRecord.priority] || "Normal";
  els.caseDueDateFact.textContent = caseRecord.dueDate ? formatDate(caseRecord.dueDate) : "Ej angivet";
  els.caseDescriptionFact.textContent = caseRecord.description || "Ingen beskrivning";
  els.caseOwnerFact.textContent = owner?.name || "Ej tilldelad";
  els.caseCoHandlersFact.textContent = caseCoHandlers.length ? caseCoHandlers.map((handler) => handler.name).join(", ") : "Inga";
  els.caseMentorFact.innerHTML = mentor ? `<a href="#/mentor/${escapeHtml(mentor.id)}">${escapeHtml(mentor.name)}</a>` : "Ej personanknutet";
  els.caseCreatedFact.textContent = `${formatDateTime(caseRecord.createdAt)} av ${handlerNameById(caseRecord.createdBy)}`;
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

  if (caseEditMode && els.caseCreateForm.dataset.route !== `edit-${caseRecord.id}-${caseRecord.updatedAt}`) {
    els.caseCreateForm.reset();
    populateCaseForm(caseRecord.mentorId, caseRecord);
    els.caseTypeInput.value = caseRecord.caseTypeId;
    els.caseTitleInput.value = caseRecord.title;
    els.casePriorityInput.value = caseRecord.priority || "normal";
    els.caseDueDateInput.value = caseRecord.dueDate || "";
    els.caseDescriptionInput.value = caseRecord.description || "";
    els.caseCreateForm.dataset.route = `edit-${caseRecord.id}-${caseRecord.updatedAt}`;
  }
  els.pauseCaseButton.hidden = ["paused", "closed"].includes(caseRecord.status);
  els.resumeCaseButton.hidden = caseRecord.status !== "paused";
  els.closeCaseButton.hidden = caseRecord.status === "closed";
  els.reopenCaseButton.hidden = caseRecord.status !== "closed";
  els.completeCaseButton.hidden = caseRecord.status === "closed";
}

function renderCaseActivities(caseRecord, activities) {
  els.caseActivityTableBody.innerHTML = "";
  const applicableActivities = activities.filter((activity) => activity.status !== "not_applicable");
  const completedActivities = applicableActivities.filter((activity) => activity.status === "completed");
  const openActivities = applicableActivities.filter((activity) => activity.status !== "completed");
  const attentionActivities = activities.filter(activityHasBlockingResult);
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
    const handler = effectiveActivityHandler(activity, caseRecord);
    const ownerSource = handler
      ? activityOwnerOverrideId(activity, caseRecord) ? "Särskilt tilldelad" : "Ärendeansvarig"
      : "";
    const result = activity.status === "completed" ? activityResultLabel(activity) : "";
    const stepNumber = Number.isFinite(activity.sortOrder) ? activity.sortOrder + 1 : activities.indexOf(activity) + 1;
    const row = document.createElement("tr");
    if (activityHasBlockingResult(activity)) row.classList.add("activity-row-attention");
    row.innerHTML = `
      <td>
        <div class="activity-name">
          <span class="activity-step" aria-hidden="true">${stepNumber}</span>
          <div>
            <button type="button" class="activity-title-button" data-open-activity="${escapeHtml(activity.id)}">${escapeHtml(activity.title)}</button>
            ${result ? `<small>Resultat: ${escapeHtml(result)}</small>` : ""}
          </div>
        </div>
      </td>
      <td><span class="badge activity-status-badge ${activityStatusClass(activity)}">${escapeHtml(activityWorkStateLabel(activity))}</span></td>
      <td><span class="activity-owner-name">${escapeHtml(handler?.name || "Ej tilldelad")}</span>${ownerSource ? `<small>${ownerSource}</small>` : ""}</td>
      <td class="${activityDueState(activity) ? `activity-due-${activityDueState(activity)}` : ""}">${escapeHtml(activityDueLabel(activity))}</td>
      <td>${documents.length ? `${documents.length} st` : '<span class="text-secondary">0</span>'}</td>
      <td class="text-end"><button type="button" class="btn btn-outline-primary btn-sm activity-open-button" data-open-activity="${escapeHtml(activity.id)}">Öppna</button></td>
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
    els.deviationOutcomeInput.value = "continue";
    els.deviationReasonInput.value = "";
    els.deviationResumeDateInput.value = "";
    els.deviationNoteInput.value = "";
  }
  renderActivityDocuments(activity);
  activityDetailBaseline = activityDetailFormSnapshot();
  updateActivityDetailDirtyState();
}

function renderActivityGuidance(activity, caseRecord) {
  const mentor = caseMentor(caseRecord);
  const identityDataMissing = activity.templateId === "identityVerified"
    && mentor
    && (!mentor.personalNumber || !mentor.identityMethod);
  els.activityDetailGuidance.hidden = !identityDataMissing;
  els.activityDetailGuidanceButton.dataset.mentorId = identityDataMissing ? mentor.id : "";
  if (!identityDataMissing) return;
  els.activityDetailGuidanceTitle.textContent = "Identitetsuppgifter behöver registreras";
  els.activityDetailGuidanceText.textContent = "Personnummer och verifieringssätt måste finnas på mentorkortet innan aktiviteten kan avslutas med resultatet Verifierad.";
  els.activityDetailGuidanceButton.textContent = "Öppna identitetsuppgifter";
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
  els.activityDetailSaveButton.disabled = !dirty;
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
    ? "Registrera endast att utdraget har visats och kontrollerats. Dokumentera inte innehållet."
    : completed
      ? "Resultat krävs när aktiviteten avslutas."
      : "Resultat anges när status sätts till Avslutad.";
}

function renderActivityDocuments(activity) {
  const documents = activityDocuments(activity.id).sort((a, b) => new Date(b.documentDate) - new Date(a.documentDate));
  els.activityDocumentsSummary.textContent = documents.length
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
      <div><strong>${escapeHtml(({ certification_interview: "Certifieringsintervju", follow_up: "Uppföljning", other: "Annat möte" })[meeting.meetingType])}</strong><small>${escapeHtml(formatDateTime(meeting.occurredAt))} · ${escapeHtml(({ physical: "Fysiskt", digital: "Digitalt", phone: "Telefon" })[meeting.mode] || "Ej angivet")}</small>${activity ? `<button type="button" class="document-activity-link" data-open-activity="${escapeHtml(activity.id)}">Kopplad till: ${escapeHtml(activity.title)}</button>` : ""}</div>
      <div class="text-secondary small">${escapeHtml(meeting.summary)}</div>
      <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center"><span class="text-secondary small">Registrerat av ${escapeHtml(handlerNameById(meeting.createdBy))}${meeting.supersedesMeetingId ? " · Rättad version" : ""}</span><button type="button" class="btn btn-outline-secondary btn-sm" data-edit-case-meeting="${escapeHtml(meeting.id)}">Öppna</button></div>
    `;
    els.caseMeetingsList.append(article);
  }
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
      <td><a href="#/case/${escapeHtml(caseRecord.id)}"><strong>${escapeHtml(caseRecord.number)}</strong></a></td>
      <td>${escapeHtml(caseRecord.type)}</td>
      <td><span class="${caseStatusBadge(caseRecord.status)}">${escapeHtml(caseRecord.status)}</span></td>
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
      <td><strong>${escapeHtml(candidate.caseNumber)}</strong><small>${escapeHtml(daysSinceText(candidate.createdAt))}</small></td>
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
  els.selectedCreatedMeta.textContent = formatDateTime(candidate.createdAt);
  els.selectedUpdatedMeta.textContent = formatDateTime(candidate.updatedAt || candidate.createdAt);
  els.selectedStatus.textContent = candidate.status;
  els.selectedStatus.className = statusClass(candidate);
  els.nameFact.textContent = candidate.name;
  els.personalNumberFact.textContent = candidate.personalNumber || "Saknas";
  els.languageFact.textContent = candidate.languages;
  els.availabilityFact.textContent = candidate.availability;
  els.areaFact.textContent = candidate.area;
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
  const completedChecks = CHECKS.filter(([key]) => candidate.checks?.[key]).length;
  els.checksTabCount.textContent = `${completedChecks}/${CHECKS.length}`;
  els.logTabCount.textContent = candidate.history.length;
  renderMentorCases(candidate);
  renderMeetings(candidate);
  setPersonEditMode(false);

  els.statusSelect.innerHTML = "";
  for (const status of STATUSES) {
    if (status === "Godkänd/Certifierad" && candidate.status !== "Godkänd/Certifierad") continue;
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
    column.innerHTML = `
      <label class="check-row form-check border rounded h-100 ${isNextAction ? "next-required" : ""}">
        <input class="form-check-input" type="checkbox" data-check="${key}" ${checked ? "checked" : ""}>
        <span class="check-row-body">
          <span class="form-check-label">${label}</span>
          <span class="check-row-meta">${escapeHtml(metaText)}</span>
          ${noteText}
        </span>
        ${isNextAction ? '<span class="next-required-marker">Nästa åtgärd</span>' : ""}
      </label>
    `;
    els.checklist.append(column);
  }

  const approval = certificationApprovalAssessment(candidate);
  els.approveButton.disabled = !approval.allowed;
  els.decisionHint.textContent = approval.allowed
    ? "Mentorn uppfyller samtliga krav och kan certifieras."
    : approval.reasons[0] || "Certifieringsärendet är inte redo för beslut.";

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
  els.editAreaInput.value = "";
  els.editLanguagesInput.value = "";
  els.editAvailabilityInput.value = "";
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
    const meetingType = ({ certification_interview: "Certifieringsintervju", follow_up: "Uppföljning", other: "Annat möte" })[meeting.meetingType] || meeting.meetingType;
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
  els.meetingTypeInput.value = ({ certification_interview: "Certifieringsintervju", follow_up: "Uppföljning", other: "Annat möte" })[meeting?.meetingType] || "";
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
    els.editAreaInput.value = candidate.area || "";
    els.editLanguagesInput.value = candidate.languages || "";
    els.editAvailabilityInput.value = candidate.availability || "";
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
  const tabElement = document.querySelector(`#${action.tabId}`);
  if (!tabElement || !window.bootstrap) return;
  bootstrap.Tab.getOrCreateInstance(tabElement).show();
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
        const activity = {
          id: crypto.randomUUID(),
          tenantId: DEFAULT_TENANT_ID,
          caseId: currentCase.id,
          templateId: AD_HOC_ACTIVITY_TEMPLATE_ID,
          templateVersion: 1,
          title: "Begär komplettering från mentorn",
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
        event("activity_updated", "activity", activity.id, "Uppföljningsaktivitet skapades: begär komplettering från mentorn");
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
  if (!caseRecord) return saveCandidate({ ...candidate, ...profilePatch, updatedAt: new Date().toISOString() });
  const currentResponsible = assignmentsForCase(caseRecord.id).find((assignment) => assignment.role === "responsible" && !assignment.endedAt);
  return executeCaseCommand({
    commandType: "update_mentor_profile",
    caseId: caseRecord.id,
    expectedVersion: caseRecord.version,
    payload: { candidateId: candidate.id, profilePatch, coordinatorId },
    additionalStores: [STORE, CASE_ASSIGNMENTS_STORE],
    mutate: ({ currentCase, now, put, event }) => {
      put(STORE, { ...candidate, ...profilePatch, updatedAt: now });
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

function openCaseLifecycle(action) {
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  pendingCaseLifecycleAction = action;
  const content = {
    pause: ["Pausa ärendet", "Öppna aktiviteter ligger kvar. Ange varför handläggningen pausas och vid behov ett bevakningsdatum.", "Pausa ärendet"],
    resume: ["Återuppta ärendet", "Ärendet blir aktivt igen. Tidigare paus och motivering ligger kvar i loggen.", "Återuppta ärendet"],
    close: ["Avsluta ärendet", "Öppna aktiviteter markeras som ej aktuella. Ärendet och all historik bevaras.", "Avsluta ärendet"],
    reopen: ["Återöppna ärendet", "Ärendet blir aktivt igen. Åtgärden kräver samordnarbehörighet och registreras i loggen.", "Återöppna ärendet"]
  }[action];
  els.caseLifecycleForm.reset();
  els.caseLifecycleTitle.textContent = content[0];
  els.caseLifecycleDescription.textContent = content[1];
  els.caseLifecycleSubmitButton.textContent = content[2];
  els.caseLifecycleSubmitButton.classList.toggle("btn-danger", action === "close");
  els.caseLifecycleSubmitButton.classList.toggle("btn-primary", action !== "close");
  els.caseLifecycleResumeRow.hidden = action !== "pause";
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

function newCandidate(formData) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    tenantId: DEFAULT_TENANT_ID,
    caseNumber: makeCaseNumber(id),
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
    history: [{ at: now, text: "Ärende skapat", actor: currentUserName() }],
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

function newCandidateFromEditor() {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  return {
    id,
    tenantId: DEFAULT_TENANT_ID,
    caseNumber: makeCaseNumber(id),
    name: els.editNameInput.value.trim(),
    personalNumber: els.editPersonalNumberInput.value.trim(),
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
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
    history: [{ at: now, text: "Ärende skapat", actor: currentUserName() }],
    createdAt: now,
    updatedAt: now
  };
}

function makeCaseNumber(seed, reserved = new Set()) {
  const digits = String(seed || Date.now()).replace(/\D/g, "");
  const base = digits ? digits.slice(-4).padStart(4, "0") : String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  let suffix = randomDigits(3);
  let caseNumber = `FM-${base}-${suffix}`;

  while (reserved.has(caseNumber)) {
    suffix = randomDigits(3);
    caseNumber = `FM-${base}-${suffix}`;
  }

  return caseNumber;
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

function statusClass(candidate) {
  if (candidate.status === "Godkänd/Certifierad") {
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

els.navDashboard.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/dashboard");
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

els.navHandlers.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/administration");
});

els.navRoutines.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/routines");
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

els.caseSearchInput.addEventListener("input", () => {
  caseSearchTerm = els.caseSearchInput.value;
  casePage = 1;
  renderCases();
});

els.caseStatusFilter.addEventListener("change", () => {
  caseStatusFilter = els.caseStatusFilter.value;
  casePage = 1;
  renderCases();
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
  if (!mentorId) return [];
  return cases.filter((caseRecord) => caseRecord.id !== excludeCaseId
    && caseRecord.tenantId === DEFAULT_TENANT_ID
    && caseRecord.organizationUnitId === DEFAULT_ORGANIZATION_UNIT_ID
    && caseRecord.mentorId === mentorId
    && caseRecord.caseTypeId === caseTypeId
    && caseRecord.status !== "closed");
}

function renderRegistrationTargets() {
  if (caseEditMode || !selectedCaseRecordId?.startsWith("new")) {
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
  const matches = value.length < 2
    ? []
    : candidates
      .filter((candidate) => candidate.name.toLocaleLowerCase("sv-SE").includes(value.toLocaleLowerCase("sv-SE")))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"))
      .slice(0, 8);
  els.caseMentorSuggestions.innerHTML = "";
  els.caseMentorSuggestions.hidden = matches.length === 0 || Boolean(mentor);
  for (const candidate of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-group-item list-group-item-action";
    button.dataset.selectCaseMentor = candidate.id;
    button.textContent = candidate.name;
    els.caseMentorSuggestions.append(button);
  }
  renderRegistrationTargets();
});

els.caseTypeInput.addEventListener("change", renderRegistrationTargets);

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
  if (caseEditMode) {
    caseEditMode = false;
    renderCaseDetail();
    return;
  }
  navigateTo("#/cases");
});

els.caseCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existingCase = caseEditMode ? selectedCaseRecord() : null;
  const id = existingCase?.id || crypto.randomUUID();
  const requestedMentorName = els.caseMentorInput.value.trim();
  const matchedMentor = candidates.find((candidate) => candidate.name.localeCompare(requestedMentorName, "sv", { sensitivity: "base" }) === 0);
  if (requestedMentorName && !matchedMentor) {
    els.caseMentorInput.setCustomValidity("Välj en mentor från förslagslistan.");
    els.caseMentorInput.reportValidity();
    return;
  }
  els.caseMentorInput.setCustomValidity("");
  const mentorId = matchedMentor?.id || null;
  els.caseMentorIdInput.value = mentorId || "";
  const caseType = caseTypeById(els.caseTypeInput.value);
  if (!caseType) return;

  if (!existingCase) {
    const targets = compatibleRegistrationTargets(mentorId, caseType.id);
    const choice = els.caseDuplicatePanel.dataset.choice;
    if (targets.length && !choice) {
      renderRegistrationTargets();
      els.caseDuplicatePanel.scrollIntoView({ block: "center" });
      showFeedback("Välj om registreringen ska kopplas till det befintliga ärendet eller skapa ett separat ärende.");
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
  await executeCaseCommand({
    commandType: existingCase ? "update_case" : "quick_register_case",
    caseId: id,
    expectedVersion: existingCase?.version ?? null,
    allowMissingCase: !existingCase,
    payload: { caseTypeId: caseType.id, mentorId, title: els.caseTitleInput.value.trim(), description: els.caseDescriptionInput.value.trim(), ownerId, coHandlerIds },
    additionalStores: [CASE_ASSIGNMENTS_STORE, CASE_ACTIVITIES_STORE],
    mutate: ({ currentCase, now, put, event: recordEvent }) => {
      const caseRecord = {
        ...(currentCase || {}),
        id,
        tenantId: DEFAULT_TENANT_ID,
        number: currentCase?.number || makeCaseNumber(id, new Set(cases.map((item) => item.number))),
        caseTypeId: caseType.id,
        caseTypeVersion: caseType.version,
        organizationUnitId: DEFAULT_ORGANIZATION_UNIT_ID,
        type: caseType.name,
        title: els.caseTitleInput.value.trim(),
        description: els.caseDescriptionInput.value.trim(),
        mentorId,
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
  caseEditMode = false;
  newCaseTypePreset = "";
  els.caseCreateForm.dataset.route = "";
  markSaved();
  showFeedback(existingCase ? "Ärendet har uppdaterats." : "Ärendet har skapats.");
  await refresh();
  navigateToCase(id);
});

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
  const openButton = event.target.closest("[data-open-activity]");
  if (openButton) openCaseActivity(openButton.dataset.openActivity);
});

els.backToActivitiesButton.addEventListener("click", () => {
  selectedCaseActivityId = null;
  renderCaseDetail();
});

els.activityDetailStatusInput.addEventListener("change", () => {
  const activity = caseActivities.find((item) => item.id === selectedCaseActivityId);
  if (activity) {
    renderActivityResultInput(activity);
    const waiting = els.activityDetailStatusInput.value === "waiting";
    els.activityWaitingForRow.hidden = !waiting;
    els.activityDetailWaitingForInput.disabled = !waiting;
    els.activityDetailWaitingForInput.required = waiting;
    if (!waiting) els.activityDetailWaitingForInput.value = "";
    updateActivityDetailDirtyState();
  }
});

els.activityDetailForm.addEventListener("input", updateActivityDetailDirtyState);
els.activityDetailForm.addEventListener("change", updateActivityDetailDirtyState);

els.activityDetailGuidanceButton.addEventListener("click", () => {
  const mentorId = els.activityDetailGuidanceButton.dataset.mentorId;
  if (!mentorId) return;
  pendingNextActionId = mentorId;
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
  if (nextStatus === "waiting" && !nextWaitingForParty) {
    els.activityDetailWaitingForInput.setCustomValidity("Ange vem eller vad aktiviteten väntar på.");
    els.activityDetailWaitingForInput.reportValidity();
    return;
  }
  els.activityDetailWaitingForInput.setCustomValidity("");
  if (nextStatus === "completed" && !nextResult) {
    els.activityDetailResultInput.setCustomValidity("Välj resultat innan aktiviteten avslutas.");
    els.activityDetailResultInput.reportValidity();
    return;
  }
  els.activityDetailResultInput.setCustomValidity("");
  if (nextStatus === "completed" && resultClassification(activity.templateId, nextResult) === "deviation" && !nextNote) {
    els.activityDetailNoteInput.setCustomValidity("Ange en kort notering när resultatet kräver uppföljning.");
    els.activityDetailNoteInput.reportValidity();
    return;
  }
  els.activityDetailNoteInput.setCustomValidity("");

  const statusChanged = nextStatus !== activity.status;
  const resultChanged = nextResult !== activityResultValue(activity);
  if (statusChanged || resultChanged) {
    const resultLabel = activityResultOptions(activity).find(([value]) => value === nextResult)?.[1] || "";
    const confirmation = await confirmAction({
      eyebrow: "Aktivitet i ärendet",
      title: nextStatus === "completed" ? "Avsluta aktiviteten?" : "Spara ändrad status?",
      body: nextStatus === "completed"
        ? `Aktiviteten "${activity.title}" avslutas med resultatet "${resultLabel}". Ändringen registreras i ärendets logg.`
        : `Aktiviteten "${activity.title}" får status ${activityStatusLabel(nextStatus).toLowerCase()}. Ändringen registreras i ärendets logg.`,
      mentorName: caseMentor(caseRecord)?.name || "Ej personanknutet",
      confirmLabel: nextStatus === "completed" ? "Avsluta aktivitet" : "Spara status"
    });
    if (!confirmation.confirmed) return;
  }

  const candidateSynced = await syncCandidateFromActivity(activity, nextStatus, nextNote, new Date().toISOString(), nextResult);
  if (!candidateSynced) return;
  await saveActivityCommand({ activity, caseRecord, nextStatus, nextResult, nextHandlerId, nextDueDate, nextWaitingForParty, note: nextNote });
  markSaved();
  showFeedback("Aktiviteten har sparats.");
  await refresh();
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
  els.caseMeetingForm.dataset.meetingId = meeting.id;
  els.caseMeetingTypeInput.value = meeting.meetingType;
  els.caseMeetingDateInput.value = localDateTimeValue(meeting.occurredAt);
  els.caseMeetingModeInput.value = meeting.mode;
  els.caseMeetingActivityInput.value = meeting.activityId || "";
  els.caseMeetingSummaryInput.value = meeting.summary;
  els.caseMeetingSummaryInput.focus();
});

els.caseMeetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  const existing = caseMeetings.find((item) => item.id === els.caseMeetingForm.dataset.meetingId);
  await registerCaseMeetingCommand({
    caseRecord,
    existing,
    meetingType: els.caseMeetingTypeInput.value,
    occurredAt: els.caseMeetingDateInput.value,
    mode: els.caseMeetingModeInput.value,
    activityId: els.caseMeetingActivityInput.value || null,
    summary: els.caseMeetingSummaryInput.value.trim()
  });
  els.caseMeetingForm.reset();
  els.caseMeetingForm.dataset.meetingId = "";
  markSaved();
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
  await savePresentationComment({
    id: crypto.randomUUID(),
    stepId: selectedPresentationStep().id,
    text,
    createdBy: currentUserName(),
    createdAt: new Date().toISOString()
  });
  els.presentationCommentInput.value = "";
  markSaved();
  showFeedback("Kommentaren har sparats.");
  presentationComments = await getAllPresentationComments();
  renderPresentation();
});

els.newCaseButton.addEventListener("click", navigateToNewCandidate);
els.dashboardNewCaseButton.addEventListener("click", navigateToNewCandidate);

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
  const candidate = newCandidate(new FormData(els.candidateForm));
  await saveCandidate(candidate);
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
  ["overdue", els.overdueQueueButton]
]) {
  button.addEventListener("click", () => {
    dashboardQueueMode = mode;
    renderDashboard();
  });
}

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
  if (isCreatingMentor()) {
    if (renderMentorEditorDuplicateCheck().blocked) {
      showFeedback("Kontrollera den möjliga dubbletten innan mentorn sparas.");
      return;
    }
    const candidate = newCandidateFromEditor();
    await saveCandidate(candidate);
    selectedId = candidate.id;
    markSaved();
    showFeedback("Mentorn har registrerats.");
    await refresh();
    navigateToCandidate(candidate.id);
    return;
  }
  const candidate = selectedCandidate();
  if (!candidate) return;
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  const profilePatch = {
    name: els.editNameInput.value.trim(),
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim()
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
els.mentorEditorDuplicatePanel.addEventListener("click", (event) => {
  if (!event.target.closest("[data-create-editor-duplicate]")) return;
  els.mentorEditorDuplicatePanel.dataset.choice = "create-anyway";
  renderMentorEditorDuplicateCheck();
});
els.interviewDateInput.addEventListener("change", () => { els.saveStatus.textContent = "Intervjuuppgifter ej registrerade"; });
els.interviewModeInput.addEventListener("change", () => { els.saveStatus.textContent = "Intervjuuppgifter ej registrerade"; });

els.newMeetingButton.addEventListener("click", () => openMeetingForm());
els.cancelMeetingButton.addEventListener("click", closeMeetingForm);
els.meetingsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-meeting]");
  if (!button) return;
  const meeting = caseMeetings.find((item) => item.id === button.dataset.editMeeting);
  if (meeting) openMeetingForm(meeting);
});

els.meetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = selectedCandidate();
  if (!candidate) return;
  const existing = caseMeetings.find((meeting) => meeting.id === selectedMeetingId);
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification")
    || cases.find((item) => item.mentorId === candidate.id && item.status !== "closed");
  if (!caseRecord) throw new Error("Skapa ett ärende för mentorn innan mötet registreras.");
  const meetingType = ({ "Certifieringsintervju": "certification_interview", "Uppföljning": "follow_up" })[els.meetingTypeInput.value] || "other";
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
  if (!caseRecord || !activity) throw new Error("Mentorns certifieringsärende saknas.");
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
    eyebrow: checked ? "Kontroll i certifieringsflödet" : "Ändra genomförd kontroll",
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

els.checklist.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-check]");
  if (!input) return;
  const changed = await updateCandidateCheck(input.dataset.check, input.checked);
  if (!changed) input.checked = !input.checked;
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
      summary: "Certifieringsintervju genomförd"
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
    showFeedback(approval.reasons[0] || "Ärendet är inte redo för certifiering.");
    return;
  }
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.caseTypeId === "mentor-certification");
  const activity = activitiesForCase(caseRecord?.id).find((item) => item.templateId === "decision");
  if (!caseRecord || !activity) return;
  await saveActivityCommand({ activity, caseRecord, nextStatus: "completed", nextResult: "approved", nextHandlerId: activity.handlerIdOverride || "", nextDueDate: activity.dueDate || "", note: "Mentorn godkänd och certifierad" });
  markSaved();
  await refresh();
  showFeedback("Mentorn är godkänd och certifierad.");
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

  if (candidates.length) {
    const confirmed = window.confirm(`Ersätt nuvarande lokala data med en exempelsamling med ${count} ${count === 1 ? "mentor" : "mentorer"}?`);
    if (!confirmed) return;
  }

  await ensureDefaultHandlers();
  await clearMeetings();
  await clearAllCaseData();
  await replaceCandidates(buildExampleDataset(count));
  selectedId = null;
  searchTerm = "";
  statusFilter = "";
  els.searchInput.value = "";
  els.statusFilter.value = "";
  markSaved();
  showFeedback(`Exempeldata med ${count} ${count === 1 ? "mentor" : "mentorer"} har laddats.`);
  await refresh();
  if (currentView === "mentor") {
    window.location.hash = "#/mentors";
  }
});

els.resetButton.addEventListener("click", async () => {
  const confirmed = window.confirm("Nollställ all lokalt sparad prototypdata? Mentorärenden tas bort och grundhandläggarna återställs. Åtgärden kan inte ångras.");
  if (!confirmed) return;
  await Promise.all([clearCandidates(), clearHandlers(), clearMeetings(), clearPresentationComments(), clearAllCaseData()]);
  await ensureDefaultHandlers();
  selectedId = null;
  markSaved();
  showFeedback("Prototypdatan har nollställts och grundhandläggare har återställts.");
  await refresh();
});

window.addEventListener("hashchange", renderAll);

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
      resolveConfirmation(true);
      confirmActionModal.hide();
    });
    els.confirmActionModal.addEventListener("hidden.bs.modal", () => resolveConfirmation(false));
    db = database;
    await ensureDefaultHandlers();
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }
    await refresh();
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="p-4"><h1>Kunde inte öppna IndexedDB</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
