const DB_NAME = "foraldramentorer";
const DB_VERSION = 5;
const STORE = "candidates";
const HANDLERS_STORE = "handlers";
const MEETINGS_STORE = "meetings";
const PRESENTATION_COMMENTS_STORE = "presentationComments";
const CASES_STORE = "cases";
const CASE_ASSIGNMENTS_STORE = "caseAssignments";
const CASE_ACTIVITIES_STORE = "caseActivities";
const CASE_DOCUMENTS_STORE = "caseDocuments";
const CASE_EVENTS_STORE = "caseEvents";
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

const CASE_STATUSES = ["Nytt", "Pågår", "Väntar", "Kräver åtgärd", "Redo för beslut", "Avslutat"];
const CASE_PAGE_SIZE = 50;
const ACTIVITY_RESULT_OPTIONS = {
  identityVerified: [
    ["verified", "Verifierad"],
    ["not_verified", "Inte verifierad"]
  ],
  registryChecked: [
    ["shown_checked", "Visat och kontrollerat"],
    ["not_shown", "Inte visat"],
    ["authenticity_unconfirmed", "Äkthet inte bekräftad"]
  ],
  referencesDone: [
    ["acceptable", "Godtagbara"],
    ["not_acceptable", "Inte godtagbara"],
    ["incomplete", "Ofullständiga"]
  ],
  trainingDone: [
    ["completed", "Genomförd"],
    ["not_completed", "Inte genomförd"]
  ],
  quizDone: [
    ["passed", "Godkänd"],
    ["not_passed", "Inte godkänd"]
  ],
  inviteInterview: [
    ["invitation_sent", "Kallelse skickad"],
    ["not_reached", "Kunde inte nå personen"]
  ],
  interviewDone: [
    ["completed", "Genomförd"],
    ["cancelled", "Inställd"],
    ["no_show", "Uteblev"]
  ],
  decision: [
    ["approved", "Godkänd"],
    ["not_approved", "Inte godkänd"]
  ],
  default: [
    ["completed", "Genomförd"],
    ["not_completed", "Kunde inte genomföras"],
    ["not_assessable", "Ej bedömningsbar"]
  ]
};
const BLOCKING_ACTIVITY_RESULTS = new Set([
  "not_verified",
  "not_shown",
  "authenticity_unconfirmed",
  "not_acceptable",
  "incomplete",
  "not_completed",
  "not_passed",
  "not_reached",
  "cancelled",
  "no_show",
  "not_approved",
  "not_assessable"
]);

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
  { id: "handler-maja", userId: "FMU-1001", name: "Maja Ekström", email: "maja.ekstrom@kommun.example", role: "Handläggare", active: true },
  { id: "handler-jonas", userId: "FMU-1002", name: "Jonas Berg", email: "jonas.berg@kommun.example", role: "Handläggare", active: true },
  { id: "handler-sara", userId: "FMU-1003", name: "Sara Lind", email: "sara.lind@kommun.example", role: "Samordnare", active: true }
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
let selectedPresentationStepId = PRESENTATION_STEPS[0].id;
let selectedId = null;
let selectedCaseRecordId = null;
let searchTerm = "";
let statusFilter = "";
let caseSearchTerm = "";
let caseStatusFilter = "";
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
let identityEditMode = false;
let caseEditMode = false;
let selectedCaseActivityId = null;
let activityListFilter = "all";
let activityDetailBaseline = null;

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  breadcrumb: document.querySelector("#breadcrumb"),
  currentUserInitials: document.querySelector("#currentUserInitials"),
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  navDashboard: document.querySelector("#navDashboard"),
  navPresentation: document.querySelector("#navPresentation"),
  navCases: document.querySelector("#navCases"),
  navCandidates: document.querySelector("#navCandidates"),
  navAdministration: document.querySelector("#navAdministration"),
  dashboardView: document.querySelector("#dashboardView"),
  presentationView: document.querySelector("#presentationView"),
  casesView: document.querySelector("#casesView"),
  caseDetailView: document.querySelector("#caseDetailView"),
  candidatesView: document.querySelector("#candidatesView"),
  detailView: document.querySelector("#detailView"),
  administrationView: document.querySelector("#administrationView"),
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
  caseOwnerInput: document.querySelector("#caseOwnerInput"),
  casePriorityInput: document.querySelector("#casePriorityInput"),
  caseDueDateInput: document.querySelector("#caseDueDateInput"),
  caseDescriptionInput: document.querySelector("#caseDescriptionInput"),
  caseCoHandlerInputs: document.querySelector("#caseCoHandlerInputs"),
  cancelCaseCreateButton: document.querySelector("#cancelCaseCreateButton"),
  saveCaseButton: document.querySelector("#saveCaseButton"),
  editCaseButton: document.querySelector("#editCaseButton"),
  newCaseActivityButton: document.querySelector("#newCaseActivityButton"),
  caseActivityCount: document.querySelector("#caseActivityCount"),
  caseDocumentCount: document.querySelector("#caseDocumentCount"),
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
  activityDetailNoteInput: document.querySelector("#activityDetailNoteInput"),
  activityDetailSaveState: document.querySelector("#activityDetailSaveState"),
  activityDetailSaveButton: document.querySelector("#activityDetailSaveButton"),
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
  caseDocumentsEmpty: document.querySelector("#caseDocumentsEmpty"),
  caseDocumentsList: document.querySelector("#caseDocumentsList"),
  caseEventTableBody: document.querySelector("#caseEventTableBody"),
  seedButton: document.querySelector("#seedButton"),
  exampleDataMenu: document.querySelector("#exampleDataMenu"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  dashboardNewCaseButton: document.querySelector("#dashboardNewCaseButton"),
  cancelNewCaseButton: document.querySelector("#cancelNewCaseButton"),
  candidateForm: document.querySelector("#candidateForm"),
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
  deleteMeetingButton: document.querySelector("#deleteMeetingButton"),
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
        const caseStore = nextDb.createObjectStore(CASES_STORE, { keyPath: "id" });
        caseStore.createIndex("mentorId", "mentorId", { unique: false });
      }
      if (!nextDb.objectStoreNames.contains(CASE_ASSIGNMENTS_STORE)) {
        const assignmentStore = nextDb.createObjectStore(CASE_ASSIGNMENTS_STORE, { keyPath: "id" });
        assignmentStore.createIndex("caseId", "caseId", { unique: false });
        assignmentStore.createIndex("handlerId", "handlerId", { unique: false });
      }
      if (!nextDb.objectStoreNames.contains(CASE_ACTIVITIES_STORE)) {
        const activityStore = nextDb.createObjectStore(CASE_ACTIVITIES_STORE, { keyPath: "id" });
        activityStore.createIndex("caseId", "caseId", { unique: false });
      }
      if (!nextDb.objectStoreNames.contains(CASE_DOCUMENTS_STORE)) {
        const documentStore = nextDb.createObjectStore(CASE_DOCUMENTS_STORE, { keyPath: "id" });
        documentStore.createIndex("caseId", "caseId", { unique: false });
      }
      if (!nextDb.objectStoreNames.contains(CASE_EVENTS_STORE)) {
        const eventStore = nextDb.createObjectStore(CASE_EVENTS_STORE, { keyPath: "id" });
        eventStore.createIndex("caseId", "caseId", { unique: false });
      }
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

function clearAllCaseData() {
  return Promise.all([
    clearCases(),
    clearCaseAssignments(),
    clearCaseActivities(),
    clearCaseDocuments(),
    clearCaseEvents()
  ]);
}

function deleteCaseBundle(caseId) {
  return new Promise((resolve, reject) => {
    const storeNames = [CASES_STORE, CASE_ASSIGNMENTS_STORE, CASE_ACTIVITIES_STORE, CASE_DOCUMENTS_STORE, CASE_EVENTS_STORE];
    const transaction = db.transaction(storeNames, "readwrite");
    transaction.objectStore(CASES_STORE).delete(caseId);
    for (const storeName of storeNames.slice(1)) {
      const index = transaction.objectStore(storeName).index("caseId");
      const request = index.openCursor(IDBKeyRange.only(caseId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function replaceCaseAssignments(caseId, assignments) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CASE_ASSIGNMENTS_STORE, "readwrite");
    const store = transaction.objectStore(CASE_ASSIGNMENTS_STORE);
    const request = store.index("caseId").openCursor(IDBKeyRange.only(caseId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
        return;
      }
      for (const assignment of assignments) store.put(assignment);
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
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

function deleteCandidate(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, MEETINGS_STORE], "readwrite");
    transaction.objectStore(STORE).delete(id);
    const meetingIndex = transaction.objectStore(MEETINGS_STORE).index("mentorId");
    const cursorRequest = meetingIndex.openCursor(IDBKeyRange.only(id));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
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

function deleteMeeting(id) {
  return new Promise((resolve, reject) => {
    const request = meetingTx("readwrite").delete(id);
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
  [cases, caseAssignments, caseActivities, caseDocuments, caseEvents] = await Promise.all([
    getAllCases(),
    getAllCaseAssignments(),
    getAllCaseActivities(),
    getAllCaseDocuments(),
    getAllCaseEvents()
  ]);
}

function certificationCaseStatus(candidate) {
  if (candidate.status === "Godkänd/Certifierad") return "Avslutat";
  if (CHECKS.every(([key]) => candidate.checks?.[key])) {
    return "Redo för beslut";
  }
  if (Object.values(candidate.checks || {}).some(Boolean) || candidate.coordinatorId) return "Pågår";
  return "Nytt";
}

function certificationActivityState(candidate, key) {
  if (key === "inviteInterview") return candidate.interviewDate ? "Klar" : "Ej påbörjad";
  if (key === "decision") return candidate.status === "Godkänd/Certifierad" ? "Klar" : "Ej påbörjad";
  return candidate.checks?.[key] ? "Klar" : "Ej påbörjad";
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
    const existingCase = cases.find((item) => item.mentorId === candidate.id && item.type === "Certifiering av mentor");
    const caseId = existingCase?.id || `cert-${candidate.id}`;
    const now = new Date().toISOString();
    const existingCaseActivities = caseActivities.filter((activity) => activity.caseId === caseId);
    const currentCaseStatus = candidate.status === "Godkänd/Certifierad"
      ? "Avslutat"
      : existingCaseActivities.length
        ? derivedCaseStatus({ ...(existingCase || {}), status: "Nytt" }, existingCaseActivities)
        : certificationCaseStatus(candidate);
    const caseRecord = {
      id: caseId,
      number: existingCase?.number || candidate.caseNumber || makeCaseNumber(caseId),
      type: "Certifiering av mentor",
      title: `Certifiering av ${candidate.name}`,
      mentorId: candidate.id,
      status: currentCaseStatus,
      priority: existingCase?.priority || "Normal",
      dueDate: existingCase?.dueDate || "",
      description: existingCase?.description || "Prövning och certifiering inför uppdrag som föräldramentor.",
      createdAt: existingCase?.createdAt || candidate.createdAt || now,
      createdBy: existingCase?.createdBy || "System",
      updatedAt: existingCase?.updatedAt || candidate.updatedAt || now,
      closedAt: candidate.status === "Godkänd/Certifierad" ? candidate.updatedAt : ""
    };
    if (!existingCase) {
      writes.push(saveCase(caseRecord));
      cases.push(caseRecord);
      writes.push(saveCaseEvent({
        id: crypto.randomUUID(),
        caseId,
        type: "case_created",
        text: "Certifieringsärendet skapades från mentorposten",
        actor: "System",
        createdAt: caseRecord.createdAt
      }));
    } else if (existingCase.title !== caseRecord.title
      || existingCase.number !== caseRecord.number
      || existingCase.status !== caseRecord.status) {
      Object.assign(existingCase, {
        title: caseRecord.title,
        number: caseRecord.number,
        status: caseRecord.status,
        closedAt: caseRecord.closedAt,
        updatedAt: now
      });
      writes.push(saveCase(existingCase));
    }

    const hasResponsibleAssignment = caseAssignments.some((assignment) => assignment.caseId === caseId && assignment.role === "Ansvarig");
    if (candidate.coordinatorId && !hasResponsibleAssignment) {
      const assignmentId = `${caseId}-${candidate.coordinatorId}`;
      if (!existingAssignments.has(assignmentId)) {
        const assignment = {
          id: assignmentId,
          caseId,
          handlerId: candidate.coordinatorId,
          role: "Ansvarig",
          assignedAt: candidate.updatedAt || now
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
        caseId,
        templateKey: key,
        title,
        status: state,
        handlerId: "",
        dueDate: "",
        note: meta.note,
        order,
        createdAt: candidate.createdAt || now,
        createdBy: "System",
        updatedAt: meta.completedAt || candidate.createdAt || now,
        completedAt: state === "Klar" ? meta.completedAt || candidate.updatedAt || now : "",
        completedBy: state === "Klar" ? meta.completedBy || "System" : "",
        result: state === "Klar" ? defaultCompletedResult({ templateKey: key }) : ""
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
  candidates = await getAllCandidates();
  candidates = candidates.map(normalizeCandidate);
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
  meetings = await getAllMeetings();
  meetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  cases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  caseActivities.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || new Date(a.createdAt) - new Date(b.createdAt));
  caseEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    if (name === handler.name && email === handler.email && userId === handler.userId) continue;
    Object.assign(handler, { name, email, userId, updatedAt: new Date().toISOString() });
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

function applyRoute() {
  const route = parseRoute();
  const previousCaseRecordId = selectedCaseRecordId;
  currentView = ["dashboard", "presentation", "cases", "case", "mentors", "mentor", "administration", "handler"].includes(route.view) ? route.view : "dashboard";
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

  els.dashboardView.hidden = currentView !== "dashboard";
  els.presentationView.hidden = currentView !== "presentation";
  els.casesView.hidden = currentView !== "cases";
  els.caseDetailView.hidden = currentView !== "case";
  els.candidatesView.hidden = currentView !== "mentors";
  els.detailView.hidden = currentView !== "mentor";
  els.administrationView.hidden = currentView !== "administration";
  els.handlerDetailView.hidden = currentView !== "handler";

  els.navDashboard.classList.toggle("active", currentView === "dashboard");
  els.navPresentation.classList.toggle("active", currentView === "presentation");
  els.navCases.classList.toggle("active", currentView === "cases" || currentView === "case");
  els.navCandidates.classList.toggle("active", currentView === "mentors" || currentView === "mentor");
  els.navAdministration.classList.toggle("active", currentView === "administration" || currentView === "handler");

  if (currentView === "dashboard") {
    els.pageTitle.textContent = "Dashboard";
    els.breadcrumb.textContent = "Start / Dashboard";
  } else if (currentView === "presentation") {
    els.pageTitle.textContent = "Presentation";
    els.breadcrumb.textContent = "Start / Presentation";
  } else if (currentView === "cases") {
    els.pageTitle.textContent = "Ärenderegister";
    els.breadcrumb.textContent = "Start / Ärenden";
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
    els.pageTitle.textContent = "Administration";
    els.breadcrumb.textContent = "Start / Administration / Handläggare";
  } else {
    els.pageTitle.textContent = "Handläggarkort";
    els.breadcrumb.textContent = "Start / Administration / Handläggarkort";
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
  const openCases = cases.filter((caseRecord) => caseRecord.status !== "Avslutat");
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
    const priorityOrder = { Hög: 0, Normal: 1, Låg: 2 };
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
      <td>${escapeHtml(activity.title)}<small>${escapeHtml(activityHasBlockingResult(activity) ? "Kräver åtgärd" : activityStatusLabel(activity.status))}</small></td>
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
  return caseAssignments.filter((assignment) => assignment.caseId === caseId);
}

function handlerForAssignment(assignment) {
  return handlers.find((handler) => handler.id === assignment?.handlerId);
}

function responsibleHandler(caseRecord) {
  const assignment = assignmentsForCase(caseRecord?.id).find((item) => item.role === "Ansvarig");
  return handlerForAssignment(assignment);
}

function coHandlers(caseRecord) {
  return assignmentsForCase(caseRecord?.id)
    .filter((item) => item.role === "Medhandläggare")
    .map(handlerForAssignment)
    .filter(Boolean);
}

function activitiesForCase(caseId) {
  return caseActivities.filter((activity) => activity.caseId === caseId);
}

function activityResultOptions(activity) {
  return ACTIVITY_RESULT_OPTIONS[activity?.templateKey] || ACTIVITY_RESULT_OPTIONS.default;
}

function defaultCompletedResult(activity) {
  return activityResultOptions(activity)[0]?.[0] || "";
}

function activityResultValue(activity) {
  if (activity?.result) return activity.result;
  return activity?.status === "Klar" ? defaultCompletedResult(activity) : "";
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
  const caseOwnerId = responsibleHandler(caseRecord)?.id || "";
  if (activity?.templateKey && activity.handlerId === caseOwnerId) return "";
  return activity?.handlerId || "";
}

function activityHandlerLabel(activity, caseRecord) {
  const handler = effectiveActivityHandler(activity, caseRecord);
  if (!handler) return "Ej tilldelad";
  return activityOwnerOverrideId(activity, caseRecord) ? `${handler.name} (särskilt tilldelad)` : `${handler.name} (ärendeansvarig)`;
}

function activityDocuments(activityId) {
  return caseDocuments.filter((document) => document.activityId === activityId);
}

function activityStatusLabel(status) {
  return status === "Klar" ? "Avslutad" : status;
}

function activityStatusClass(activity) {
  if (activityHasBlockingResult(activity)) return "text-bg-danger";
  if (activity.status === "Klar") return "text-bg-success";
  if (activity.status === "Pågår") return "text-bg-primary";
  if (activity.status === "Väntar") return "text-bg-warning";
  if (activity.status === "Ej aktuell") return "text-bg-light border text-secondary";
  return "text-bg-secondary";
}

function activityDueState(activity) {
  if (!activity?.dueDate || ["Klar", "Ej aktuell"].includes(activity.status)) return "";
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
  return activity.status === "Klar" && BLOCKING_ACTIVITY_RESULTS.has(activityResultValue(activity));
}

function nextCaseActivity(caseRecord) {
  const activities = activitiesForCase(caseRecord?.id);
  return activities.find(activityHasBlockingResult)
    || activities.find((activity) => activity.status !== "Klar" && activity.status !== "Ej aktuell");
}

function caseStatusBadge(status) {
  if (status === "Avslutat") return "badge rounded-pill text-bg-success";
  if (status === "Kräver åtgärd") return "badge rounded-pill text-bg-danger";
  if (status === "Väntar") return "badge rounded-pill text-bg-warning";
  if (status === "Redo för beslut") return "badge rounded-pill text-bg-primary";
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
    return (!caseStatusFilter || caseRecord.status === caseStatusFilter) && (!term || text.includes(term));
  });
}

function renderCases() {
  const filteredRows = filteredCases();
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / CASE_PAGE_SIZE));
  casePage = Math.min(casePage, pageCount);
  const start = (casePage - 1) * CASE_PAGE_SIZE;
  const rows = filteredRows.slice(start, start + CASE_PAGE_SIZE);
  els.caseListCount.textContent = filteredRows.length === cases.length
    ? `${cases.length} ${cases.length === 1 ? "ärende" : "ärenden"} i registret.`
    : `Visar ${filteredRows.length} av ${cases.length} ärenden.`;
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
      <td><span class="${caseStatusBadge(caseRecord.status)}">${escapeHtml(caseRecord.status)}</span></td>
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
  els.newCaseActivityButton.hidden = creating || caseEditMode || Boolean(selectedCaseActivityId);
  els.editCaseButton.hidden = creating || caseEditMode;
  els.saveCaseButton.textContent = creating ? "Skapa ärende" : "Spara ändringar";

  if (creating) {
    const mentorId = selectedCaseRecordId.startsWith("new-") ? selectedCaseRecordId.slice(4) : "";
    els.selectedCaseType.textContent = "Nytt ärende";
    els.selectedCaseNumber.textContent = "Ärendenummer skapas när ärendet sparas";
    els.selectedCaseTitle.textContent = mentorId ? `Nytt ärende för ${candidates.find((candidate) => candidate.id === mentorId)?.name || "mentor"}` : "Nytt generellt ärende";
    els.selectedCaseStatus.textContent = "Nytt";
    els.selectedCaseStatus.className = caseStatusBadge("Nytt");
    els.selectedCaseMentor.textContent = mentorId ? candidates.find((candidate) => candidate.id === mentorId)?.name || "Saknas" : "Ej personanknutet";
    els.selectedCaseOwner.textContent = currentUserName();
    els.selectedCaseUpdated.textContent = "Inte sparat";
    if (els.caseCreateForm.dataset.route !== selectedCaseRecordId) {
      els.caseCreateForm.reset();
      populateCaseForm(mentorId);
      els.caseCreateForm.dataset.route = selectedCaseRecordId;
    }
    return;
  }

  const mentor = caseMentor(caseRecord);
  const owner = responsibleHandler(caseRecord);
  const caseCoHandlers = coHandlers(caseRecord);
  const activities = activitiesForCase(caseRecord.id);
  const documents = caseDocuments.filter((document) => document.caseId === caseRecord.id);
  const events = caseEvents.filter((item) => item.caseId === caseRecord.id);
  if (selectedCaseActivityId && !activities.some((activity) => activity.id === selectedCaseActivityId)) {
    selectedCaseActivityId = null;
  }
  els.newCaseActivityButton.hidden = caseEditMode || Boolean(selectedCaseActivityId);

  els.selectedCaseType.textContent = caseRecord.type;
  els.selectedCaseNumber.textContent = caseRecord.number;
  els.selectedCaseTitle.textContent = caseRecord.title;
  els.selectedCaseStatus.textContent = caseRecord.status;
  els.selectedCaseStatus.className = caseStatusBadge(caseRecord.status);
  els.selectedCaseMentor.innerHTML = mentor ? `<a href="#/mentor/${escapeHtml(mentor.id)}">${escapeHtml(mentor.name)}</a>` : "Ej personanknutet";
  els.selectedCaseOwner.textContent = owner?.name || "Ej tilldelad";
  els.selectedCaseUpdated.textContent = formatDateTime(caseRecord.updatedAt);
  els.caseStatusFact.textContent = caseRecord.status;
  els.casePriorityFact.textContent = caseRecord.priority || "Normal";
  els.caseDueDateFact.textContent = caseRecord.dueDate ? formatDate(caseRecord.dueDate) : "Ej angivet";
  els.caseDescriptionFact.textContent = caseRecord.description || "Ingen beskrivning";
  els.caseOwnerFact.textContent = owner?.name || "Ej tilldelad";
  els.caseCoHandlersFact.textContent = caseCoHandlers.length ? caseCoHandlers.map((handler) => handler.name).join(", ") : "Inga";
  els.caseMentorFact.innerHTML = mentor ? `<a href="#/mentor/${escapeHtml(mentor.id)}">${escapeHtml(mentor.name)}</a>` : "Ej personanknutet";
  els.caseCreatedFact.textContent = `${formatDateTime(caseRecord.createdAt)} av ${caseRecord.createdBy || "System"}`;
  els.caseActivityCount.textContent = activities.length;
  els.caseDocumentCount.textContent = documents.length;
  els.caseEventCount.textContent = events.length;

  renderCaseActivities(caseRecord, activities);
  renderCaseDocuments(documents);
  renderCaseEvents(events);
  renderActivityDetail(caseRecord);
  if (selectedCaseActivityId) {
    requestAnimationFrame(() => bootstrap.Tab.getOrCreateInstance(document.querySelector("#case-activities-tab")).show());
  }

  if (caseEditMode && els.caseCreateForm.dataset.route !== `edit-${caseRecord.id}-${caseRecord.updatedAt}`) {
    els.caseCreateForm.reset();
    populateCaseForm(caseRecord.mentorId, caseRecord);
    els.caseTypeInput.value = caseRecord.type;
    els.caseTitleInput.value = caseRecord.title;
    els.casePriorityInput.value = caseRecord.priority || "Normal";
    els.caseDueDateInput.value = caseRecord.dueDate || "";
    els.caseDescriptionInput.value = caseRecord.description || "";
    els.caseCreateForm.dataset.route = `edit-${caseRecord.id}-${caseRecord.updatedAt}`;
  }
}

function renderCaseActivities(caseRecord, activities) {
  els.caseActivityTableBody.innerHTML = "";
  const applicableActivities = activities.filter((activity) => activity.status !== "Ej aktuell");
  const completedActivities = applicableActivities.filter((activity) => activity.status === "Klar");
  const openActivities = applicableActivities.filter((activity) => activity.status !== "Klar");
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
    if (activityListFilter === "open") return !["Klar", "Ej aktuell"].includes(activity.status);
    if (activityListFilter === "attention") return activityHasBlockingResult(activity);
    if (activityListFilter === "done") return ["Klar", "Ej aktuell"].includes(activity.status);
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
    const result = activity.status === "Klar" ? activityResultLabel(activity) : "";
    const stepNumber = Number.isFinite(activity.order) ? activity.order + 1 : activities.indexOf(activity) + 1;
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
      <td><span class="badge activity-status-badge ${activityStatusClass(activity)}">${escapeHtml(activityHasBlockingResult(activity) ? "Kräver åtgärd" : activityStatusLabel(activity.status))}</span></td>
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
  const availableHandlers = handlers.filter((handler) => handler.active || handler.id === activity.handlerId || handler.id === owner?.id);
  els.activityDetailTitle.textContent = activity.title;
  els.activityDetailContext.textContent = `${caseRecord.number} · ${caseMentor(caseRecord)?.name || caseRecord.title}`;
  const changedBy = activity.updatedBy || activity.completedBy || activity.createdBy || "Ej angivet";
  const auditParts = [`Senast ändrad ${formatDateTime(activity.updatedAt || activity.createdAt)} av ${changedBy}`];
  if (activity.completedAt) auditParts.push(`Avslutad ${formatDateTime(activity.completedAt)} av ${activity.completedBy || "Ej angivet"}`);
  els.activityDetailAudit.textContent = auditParts.join(" · ");
  renderActivityGuidance(activity, caseRecord);
  els.activityDetailStatus.textContent = activityHasBlockingResult(activity) ? "Kräver åtgärd" : activityStatusLabel(activity.status);
  els.activityDetailStatus.className = activityHasBlockingResult(activity)
    ? "badge text-bg-danger"
    : activity.status === "Klar"
      ? "badge text-bg-success"
    : activity.status === "Väntar"
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
  els.activityDetailNoteInput.value = activity.note || "";
  renderActivityResultInput(activity);
  renderActivityDocuments(activity);
  activityDetailBaseline = activityDetailFormSnapshot();
  updateActivityDetailDirtyState();
}

function renderActivityGuidance(activity, caseRecord) {
  const mentor = caseMentor(caseRecord);
  const identityDataMissing = activity.templateKey === "identityVerified"
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
    result: status === "Klar" ? els.activityDetailResultInput.value : "",
    handlerId: els.activityDetailOwnerInput.value,
    dueDate: els.activityDetailDueDateInput.value,
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
  const completed = els.activityDetailStatusInput.value === "Klar";
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
  els.activityResultHelp.textContent = activity.templateKey === "registryChecked"
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
      <div><strong>${escapeHtml(caseDocument.title)}</strong><small>${escapeHtml(caseDocument.type)} · ${escapeHtml(formatDate(caseDocument.documentDate))}</small></div>
      <div class="text-secondary small">${escapeHtml(caseDocument.description || "Ingen beskrivning")}</div>
      <div class="text-secondary small">Registrerad av ${escapeHtml(caseDocument.createdBy)}</div>
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
      <div><strong>${escapeHtml(caseDocument.title)}</strong><small>${escapeHtml(caseDocument.type)} · ${escapeHtml(formatDate(caseDocument.documentDate))}</small>${activity ? `<button type="button" class="document-activity-link" data-open-activity="${escapeHtml(activity.id)}">Kopplad till: ${escapeHtml(activity.title)}</button>` : '<small>Gäller hela ärendet</small>'}</div>
      <div class="text-secondary small">${escapeHtml(caseDocument.description || "Ingen beskrivning")}</div>
      <div class="text-secondary small">Registrerad av ${escapeHtml(caseDocument.createdBy)}</div>
    `;
    els.caseDocumentsList.append(article);
  }
}

function renderCaseEvents(events) {
  els.caseEventTableBody.innerHTML = "";
  for (const item of events) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${escapeHtml(formatDateTime(item.createdAt))}</td><td>${escapeHtml(item.text)}</td><td>${escapeHtml(item.actor || "System")}</td>`;
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
  els.interviewModeInput.value = candidate.interviewMode || "";
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
  els.identityVerifiedByFact.textContent = identityVerified ? candidate.identityVerifiedBy || "Ej angivet" : "";
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

  const complete = isComplete(candidate);
  els.approveButton.disabled = !complete;
  els.decisionHint.textContent = complete
    ? "Mentorn uppfyller samtliga krav och kan certifieras."
    : "Handläggare, samtliga kontroller, intervjutid och intervjuform måste vara registrerade innan certifiering.";

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
  const candidateMeetings = meetings.filter((meeting) => meeting.mentorId === candidate.id);
  els.meetingsTabCount.textContent = candidateMeetings.length;
  els.meetingsEmpty.hidden = candidateMeetings.length > 0;
  els.meetingsTableWrap.hidden = candidateMeetings.length === 0;
  els.meetingsTableBody.innerHTML = "";

  for (const meeting of candidateMeetings) {
    const meetingType = meeting.type === "Intervju" ? "Certifieringsintervju" : meeting.type;
    const row = document.createElement("tr");
    const nextStep = meeting.nextStep
      ? `<small class="d-block text-secondary mt-1">Nästa steg: ${escapeHtml(meeting.nextStep)}</small>`
      : "";
    row.innerHTML = `
      <td><time datetime="${escapeHtml(meeting.occurredAt)}">${escapeHtml(formatDateTime(meeting.occurredAt))}</time></td>
      <td>${escapeHtml(meetingType)}<small class="d-block text-secondary">${escapeHtml(meeting.mode || "Ej angivet")}</small></td>
      <td class="meeting-summary">${escapeHtml(meeting.summary)}${nextStep}</td>
      <td>${escapeHtml(meeting.createdBy || "Ej angivet")}</td>
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
  els.deleteMeetingButton.hidden = true;
}

function openMeetingForm(meeting = null) {
  selectedMeetingId = meeting?.id || null;
  els.meetingForm.reset();
  els.meetingFormTitle.textContent = meeting ? "Redigera möte" : "Nytt möte";
  els.meetingTypeInput.value = meeting?.type === "Intervju" ? "Certifieringsintervju" : meeting?.type || "";
  els.meetingDateInput.value = meeting?.occurredAt ? localDateTimeValue(meeting.occurredAt) : localDateTimeValue();
  els.meetingModeInput.value = meeting?.mode === "Ej angivet" ? "" : meeting?.mode || "";
  els.meetingSummaryInput.value = meeting?.summary || "";
  els.meetingNextStepInput.value = meeting?.nextStep || "";
  els.deleteMeetingButton.hidden = !meeting;
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

async function addCaseEvent(caseId, text, type = "case_updated") {
  return saveCaseEvent({
    id: crypto.randomUUID(),
    caseId,
    type,
    text,
    actor: currentUserName(),
    createdAt: new Date().toISOString()
  });
}

function derivedCaseStatus(caseRecord, updatedActivities) {
  if (caseRecord.status === "Avslutat") return "Avslutat";
  if (updatedActivities.some(activityHasBlockingResult)) return "Kräver åtgärd";
  if (updatedActivities.some((activity) => activity.status === "Väntar")) return "Väntar";
  const openActivities = updatedActivities.filter((activity) => !["Klar", "Ej aktuell"].includes(activity.status));
  if (!openActivities.length && updatedActivities.length) return "Redo för beslut";
  if (openActivities.length === 1 && openActivities[0].templateKey === "decision") return "Redo för beslut";
  if (updatedActivities.some((activity) => activity.status !== "Ej påbörjad")) return "Pågår";
  return "Nytt";
}

async function syncCandidateFromActivity(activity, status, note, now, result = "") {
  if (!activity.templateKey) return true;
  const caseRecord = cases.find((item) => item.id === activity.caseId);
  const candidate = candidates.find((item) => item.id === caseRecord?.mentorId);
  if (!candidate) return true;
  const completed = status === "Klar" && !BLOCKING_ACTIVITY_RESULTS.has(result);

  if (activity.templateKey === "identityVerified" && completed && (!candidate.personalNumber || !candidate.identityMethod)) {
    showFeedback("Registrera personnummer och verifieringssätt på mentorkortet innan identitetsaktiviteten slutförs.");
    return false;
  }
  if (activity.templateKey === "decision") {
    if (completed && !isComplete(candidate)) {
      showFeedback("Samtliga kontroller och intervjun måste vara klara innan beslutet kan registreras.");
      return false;
    }
    await saveCandidate({
      ...candidate,
      status: completed ? "Godkänd/Certifierad" : statusFromChecks(candidate.checks),
      updatedAt: now,
      history: [...(candidate.history || []), {
        at: now,
        text: completed ? "Mentor godkänd och certifierad via ärendet" : "Beslut om godkännande återöppnat",
        actor: currentUserName()
      }]
    });
    return true;
  }
  if (activity.templateKey === "inviteInterview") return true;
  if (!CHECK_LABELS[activity.templateKey]) return true;

  const checks = { ...candidate.checks, [activity.templateKey]: completed };
  const checkMeta = {
    ...candidate.checkMeta,
    [activity.templateKey]: completed
      ? { checkedAt: now, checkedBy: currentUserName(), note }
      : { checkedAt: "", checkedBy: "", note: "" }
  };
  await saveCandidate({
    ...candidate,
    checks,
    checkMeta,
    status: candidate.status === "Godkänd/Certifierad" && !completed ? statusFromChecks(checks) : candidate.status,
    updatedAt: now,
    history: [...(candidate.history || []), {
      at: now,
      text: `${CHECK_LABELS[activity.templateKey]}: ${completed ? "klar" : status.toLowerCase()}${note ? `: ${note}` : ""}`,
      actor: currentUserName()
    }]
  });
  return true;
}

async function syncActivityFromCandidate(candidate, templateKey, completed, note = "") {
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.type === "Certifiering av mentor");
  const activity = caseActivities.find((item) => item.caseId === caseRecord?.id && item.templateKey === templateKey);
  if (!caseRecord || !activity) return;
  const now = new Date().toISOString();
  await Promise.all([
    saveCaseActivity({
      ...activity,
      status: completed ? "Klar" : "Ej påbörjad",
      result: completed ? defaultCompletedResult(activity) : "",
      note: completed ? note : "",
      updatedAt: now,
      completedAt: completed ? now : "",
      completedBy: completed ? currentUserName() : ""
    }),
    saveCase({ ...caseRecord, status: certificationCaseStatus({ ...candidate, checks: { ...candidate.checks, [templateKey]: completed } }), updatedAt: now }),
    addCaseEvent(caseRecord.id, `${activity.title}: ${completed ? "klar" : "återöppnad"}${note ? ` – ${note}` : ""}`, "activity_updated")
  ]);
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

function newCandidateFromEditor() {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  return {
    id,
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

els.navCandidates.addEventListener("click", (event) => {
  event.preventDefault();
  resetMentorFilters();
  navigateTo("#/mentors");
});

els.navAdministration.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/administration");
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
});

els.caseMentorSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-case-mentor]");
  if (!button) return;
  const mentor = candidates.find((candidate) => candidate.id === button.dataset.selectCaseMentor);
  if (!mentor) return;
  els.caseMentorInput.value = mentor.name;
  els.caseMentorIdInput.value = mentor.id;
  els.caseMentorSuggestions.hidden = true;
  els.caseMentorSuggestions.innerHTML = "";
});

els.previousCasePageButton.addEventListener("click", () => {
  casePage = Math.max(1, casePage - 1);
  renderCases();
});

els.nextCasePageButton.addEventListener("click", () => {
  casePage += 1;
  renderCases();
});

els.newGeneralCaseButton.addEventListener("click", () => navigateToNewCase());
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
  if (caseEditMode) {
    caseEditMode = false;
    renderCaseDetail();
    return;
  }
  navigateTo("#/cases");
});

els.caseCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const now = new Date().toISOString();
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
  const mentorId = matchedMentor?.id || "";
  els.caseMentorIdInput.value = mentorId;
  const ownerId = els.caseOwnerInput.value;
  const caseRecord = {
    id,
    number: existingCase?.number || makeCaseNumber(id, new Set(cases.map((item) => item.number))),
    type: els.caseTypeInput.value,
    title: els.caseTitleInput.value.trim(),
    mentorId,
    status: existingCase?.status || "Nytt",
    priority: els.casePriorityInput.value,
    dueDate: els.caseDueDateInput.value,
    description: els.caseDescriptionInput.value.trim(),
    createdAt: existingCase?.createdAt || now,
    createdBy: existingCase?.createdBy || currentUserName(),
    updatedAt: now,
    closedAt: existingCase?.closedAt || ""
  };
  const assignments = [{
    id: `${id}-${ownerId}`,
    caseId: id,
    handlerId: "",
    role: "Ansvarig",
    assignedAt: now
  }];
  for (const input of els.caseCoHandlerInputs.querySelectorAll('input[name="coHandler"]:checked')) {
    if (input.value === ownerId) continue;
    assignments.push({
      id: `${id}-${input.value}`,
      caseId: id,
      handlerId: input.value,
      role: "Medhandläggare",
      assignedAt: now
    });
  }
  const activities = existingCase ? [] : activityTemplatesForCaseType(caseRecord.type).map((title, order) => ({
    id: crypto.randomUUID(),
    caseId: id,
    templateKey: "",
    title,
    status: "Ej påbörjad",
    handlerId: ownerId,
    dueDate: "",
    note: "",
    order,
    createdAt: now,
    createdBy: currentUserName(),
    updatedAt: now,
    completedAt: "",
    completedBy: "",
    result: ""
  }));
  const linkedMentor = candidates.find((candidate) => candidate.id === mentorId);
  const selectedOwner = handlers.find((handler) => handler.id === ownerId);
  const mentorSync = existingCase?.type === "Certifiering av mentor" && linkedMentor
    ? saveCandidate({
      ...linkedMentor,
      coordinatorId: ownerId,
      coordinator: selectedOwner?.name || "",
      updatedAt: now,
      history: [...(linkedMentor.history || []), { at: now, text: "Ansvarig handläggare uppdaterad via ärendet", actor: currentUserName() }]
    })
    : Promise.resolve();
  await Promise.all([
    saveCase(caseRecord),
    replaceCaseAssignments(id, assignments),
    mentorSync,
    ...activities.map(saveCaseActivity),
    saveCaseEvent({
      id: crypto.randomUUID(),
      caseId: id,
      type: existingCase ? "case_updated" : "case_created",
      text: existingCase
        ? "Ärendeuppgifter och handläggare uppdaterades"
        : `Ärendet skapades${activities.length ? ` med ${activities.length} föreslagna aktiviteter` : ""}`,
      actor: currentUserName(),
      createdAt: now
    })
  ]);
  caseEditMode = false;
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
  const now = new Date().toISOString();
  const activity = {
    id: crypto.randomUUID(),
    caseId: caseRecord.id,
    templateKey: "",
    title: els.activityTitleInput.value.trim(),
    status: "Ej påbörjad",
    handlerId: els.activityOwnerInput.value,
    dueDate: els.activityDueDateInput.value,
    note: els.activityNoteInput.value.trim(),
    order: activitiesForCase(caseRecord.id).length,
    createdAt: now,
    createdBy: currentUserName(),
    updatedAt: now,
    completedAt: "",
    completedBy: "",
    result: ""
  };
  await Promise.all([
    saveCaseActivity(activity),
    saveCase({ ...caseRecord, updatedAt: now }),
    addCaseEvent(caseRecord.id, `Aktiviteten "${activity.title}" lades till`, "activity_created")
  ]);
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
  const nextResult = nextStatus === "Klar" ? els.activityDetailResultInput.value : "";
  const nextHandlerId = els.activityDetailOwnerInput.value;
  const currentHandlerOverrideId = activityOwnerOverrideId(activity, caseRecord);
  const nextDueDate = els.activityDetailDueDateInput.value;
  const nextNote = els.activityDetailNoteInput.value.trim();
  if (nextStatus === "Klar" && !nextResult) {
    els.activityDetailResultInput.setCustomValidity("Välj resultat innan aktiviteten avslutas.");
    els.activityDetailResultInput.reportValidity();
    return;
  }
  els.activityDetailResultInput.setCustomValidity("");
  if (nextStatus === "Klar" && BLOCKING_ACTIVITY_RESULTS.has(nextResult) && !nextNote) {
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
      title: nextStatus === "Klar" ? "Avsluta aktiviteten?" : "Spara ändrad status?",
      body: nextStatus === "Klar"
        ? `Aktiviteten "${activity.title}" avslutas med resultatet "${resultLabel}". Ändringen registreras i ärendets logg.`
        : `Aktiviteten "${activity.title}" får status ${nextStatus.toLowerCase()}. Ändringen registreras i ärendets logg.`,
      mentorName: caseMentor(caseRecord)?.name || "Ej personanknutet",
      confirmLabel: nextStatus === "Klar" ? "Avsluta aktivitet" : "Spara status",
      danger: activity.status === "Klar" && nextStatus !== "Klar"
    });
    if (!confirmation.confirmed) return;
  }

  const now = new Date().toISOString();
  const candidateSynced = await syncCandidateFromActivity(activity, nextStatus, nextNote, now, nextResult);
  if (!candidateSynced) return;
  const updatedActivity = {
    ...activity,
    status: nextStatus,
    result: nextResult,
    handlerId: nextHandlerId,
    dueDate: nextDueDate,
    note: nextNote,
    updatedAt: now,
    updatedBy: currentUserName(),
    completedAt: nextStatus === "Klar" ? (activity.completedAt || now) : "",
    completedBy: nextStatus === "Klar" ? currentUserName() : ""
  };
  const updatedActivities = activitiesForCase(caseRecord.id).map((item) => item.id === activity.id ? updatedActivity : item);
  const nextCaseStatus = activity.templateKey === "decision" && nextStatus === "Klar" && nextResult === "approved"
    ? "Avslutat"
    : derivedCaseStatus(caseRecord, updatedActivities);
  const changes = [];
  if (statusChanged) changes.push(`status ${activityStatusLabel(activity.status)} → ${activityStatusLabel(nextStatus)}`);
  if (resultChanged && nextResult) changes.push(`resultat ${activityResultLabel(updatedActivity)}`);
  if (nextHandlerId !== currentHandlerOverrideId) changes.push(`ansvarig ${activityHandlerLabel(updatedActivity, caseRecord)}`);
  if (nextDueDate !== (activity.dueDate || "")) changes.push(`förfallodatum ${nextDueDate ? formatDate(nextDueDate) : "borttaget"}`);
  if (nextNote !== (activity.note || "")) changes.push("tjänsteanteckning uppdaterad");
  await Promise.all([
    saveCaseActivity(updatedActivity),
    saveCase({ ...caseRecord, status: nextCaseStatus, updatedAt: now, closedAt: nextCaseStatus === "Avslutat" ? now : "" }),
    addCaseEvent(caseRecord.id, `${activity.title}: ${changes.join(", ") || "aktiviteten uppdaterades"}`, "activity_updated")
  ]);
  markSaved();
  showFeedback("Aktiviteten har sparats.");
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
  const button = event.target.closest("[data-open-activity]");
  if (button) openCaseActivity(button.dataset.openActivity);
});

els.documentActivityContext.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-activity]");
  if (button) openCaseActivity(button.dataset.openActivity);
});

els.caseDocumentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseRecord = selectedCaseRecord();
  if (!caseRecord) return;
  const now = new Date().toISOString();
  const caseDocument = {
    id: crypto.randomUUID(),
    caseId: caseRecord.id,
    activityId: els.documentActivityInput.value || "",
    type: els.documentTypeInput.value,
    title: els.documentTitleInput.value.trim(),
    documentDate: els.documentDateInput.value,
    description: els.documentDescriptionInput.value.trim(),
    createdAt: now,
    createdBy: currentUserName()
  };
  await Promise.all([
    saveCaseDocument(caseDocument),
    saveCase({ ...caseRecord, updatedAt: now }),
    addCaseEvent(caseRecord.id, `Handlingen "${caseDocument.title}" registrerades`, "document_registered")
  ]);
  els.caseDocumentForm.reset();
  els.caseDocumentForm.dataset.activityId = "";
  markSaved();
  showFeedback("Handlingen har registrerats.");
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
  if (handler.name !== name) {
    const assigned = candidates.filter((candidate) => candidate.coordinatorId === handler.id);
    await Promise.all(assigned.map((candidate) => saveCandidate({
      ...candidate,
      coordinator: name,
      updatedAt: now,
      history: [...(candidate.history || []), { at: now, text: `Handläggarnamn uppdaterat till ${name}`, actor: currentUserName() }]
    })));
  }
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
    userId: existing?.userId || nextHandlerUserId(),
    name,
    email,
    role: els.handlerRoleInput.value,
    active: els.handlerActiveInput.checked,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
  if (existing && existing.name !== name) {
    const assigned = candidates.filter((candidate) => candidate.coordinatorId === id);
    await Promise.all(assigned.map((candidate) => saveCandidate({
      ...candidate,
      coordinator: name,
      updatedAt: now,
      history: [...(candidate.history || []), { at: now, text: `Handläggarnamn uppdaterat till ${name}`, actor: currentUserName() }]
    })));
  }
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
  const personalNumber = els.editPersonalNumberInput.value.trim();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  const requestedStatus = els.statusSelect.value;
  const status = candidate.status !== "Godkänd/Certifierad" && requestedStatus === "Godkänd/Certifierad"
    ? candidate.status
    : requestedStatus;
  const identityInvalidated = candidate.checks?.identityVerified && personalNumber !== candidate.personalNumber;
  const patch = {
    name: els.editNameInput.value.trim(),
    personalNumber,
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
    status,
    coordinatorId: coordinator?.id || "",
    coordinator: coordinator?.name || ""
  };
  if (identityInvalidated) {
    patch.checks = { ...candidate.checks, identityVerified: false };
    patch.checkMeta = {
      ...candidate.checkMeta,
      identityVerified: { checkedAt: "", checkedBy: "", note: "" }
    };
    patch.identityMethod = "";
    patch.identityVerifiedAt = "";
    patch.identityVerifiedBy = "";
  }
  if ((candidate.coordinatorId || "") !== (patch.coordinatorId || "")) {
    const certificationCase = cases.find((item) => item.mentorId === candidate.id && item.type === "Certifiering av mentor");
    if (certificationCase) {
      const now = new Date().toISOString();
      const retainedCoHandlers = assignmentsForCase(certificationCase.id).filter((assignment) => assignment.role === "Medhandläggare");
      const responsibleAssignment = patch.coordinatorId
        ? [{
          id: `${certificationCase.id}-${patch.coordinatorId}`,
          caseId: certificationCase.id,
          handlerId: patch.coordinatorId,
          role: "Ansvarig",
          assignedAt: now
        }]
        : [];
      await Promise.all([
        replaceCaseAssignments(certificationCase.id, [...responsibleAssignment, ...retainedCoHandlers]),
        saveCase({ ...certificationCase, updatedAt: now }),
        addCaseEvent(
          certificationCase.id,
          patch.coordinatorId ? `Ansvarig handläggare ändrades till ${coordinator.name}` : "Ansvarig handläggare togs bort",
          "assignment_updated"
        )
      ]);
    }
  }
  await updateSelected(
    patch,
    identityInvalidated
      ? "Personnummer ändrat; identitetsverifiering måste göras om"
      : "Grund- och ärendeuppgifter uppdaterade"
  );
  setPersonEditMode(false);
  showFeedback("Grunduppgifterna har sparats.");
});
els.interviewDateInput.addEventListener("change", () => updateSelected({ interviewDate: els.interviewDateInput.value }, "Intervjutid uppdaterad"));
els.interviewModeInput.addEventListener("change", () => updateSelected({ interviewMode: els.interviewModeInput.value }, "Intervjuform uppdaterad"));

els.newMeetingButton.addEventListener("click", () => openMeetingForm());
els.cancelMeetingButton.addEventListener("click", closeMeetingForm);
els.meetingsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-meeting]");
  if (!button) return;
  const meeting = meetings.find((item) => item.id === button.dataset.editMeeting);
  if (meeting) openMeetingForm(meeting);
});

els.meetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = selectedCandidate();
  if (!candidate) return;
  const existing = meetings.find((meeting) => meeting.id === selectedMeetingId);
  const now = new Date().toISOString();
  const type = els.meetingTypeInput.value;
  const occurredAt = els.meetingDateInput.value;
  const mode = els.meetingModeInput.value;
  await saveMeeting({
    id: existing?.id || crypto.randomUUID(),
    mentorId: candidate.id,
    type,
    occurredAt,
    mode,
    summary: els.meetingSummaryInput.value.trim(),
    nextStep: els.meetingNextStepInput.value.trim(),
    createdBy: existing?.createdBy || currentUserName(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });

  const patch = type === "Certifieringsintervju"
    ? { interviewDate: occurredAt, interviewMode: mode }
    : {};
  await saveCandidate({
    ...candidate,
    ...patch,
    updatedAt: now,
    history: [
      ...(candidate.history || []),
      { at: now, text: `${type} ${existing ? "uppdaterat" : "registrerat"}`, actor: currentUserName() }
    ]
  });
  closeMeetingForm();
  markSaved();
  showFeedback(existing ? "Mötet har uppdaterats." : "Mötet har registrerats.");
  await refresh();
});

els.deleteMeetingButton.addEventListener("click", async () => {
  const meeting = meetings.find((item) => item.id === selectedMeetingId);
  const candidate = selectedCandidate();
  if (!meeting || !candidate) return;
  if (!window.confirm(`Ta bort mötesanteckningen från ${formatDateTime(meeting.occurredAt)}?`)) return;
  await deleteMeeting(meeting.id);
  const now = new Date().toISOString();
  await saveCandidate({
    ...candidate,
    updatedAt: now,
    history: [
      ...(candidate.history || []),
      { at: now, text: `${meeting.type} borttaget`, actor: currentUserName() }
    ]
  });
  closeMeetingForm();
  markSaved();
  showFeedback("Mötet har tagits bort.");
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

  const verifiedAt = new Date().toISOString();
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
  identityEditMode = false;
  await syncActivityFromCandidate(candidate, "identityVerified", true, confirmation.note);
  await updateSelected({
    personalNumber: els.identityPersonalNumberInput.value.trim(),
    identityMethod: method,
    identityVerifiedAt: verifiedAt,
    identityVerifiedBy: currentUserName(),
    checks: { ...candidate.checks, identityVerified: true },
    checkMeta: {
      ...candidate.checkMeta,
      identityVerified: { checkedAt: verifiedAt, checkedBy: currentUserName(), note: confirmation.note }
    }
  }, `Identitet registrerad med ${identityMethodLabel(method)}${confirmation.note ? `: ${confirmation.note}` : ""}`);
  showFeedback(`Identiteten har verifierats med ${identityMethodLabel(method)}.`);
});

async function updateCandidateCheck(key, checked) {
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
  const now = new Date().toISOString();
  const checks = { ...candidate.checks, [key]: checked };
  const checkMeta = {
    ...candidate.checkMeta,
    [key]: checked
      ? { checkedAt: now, checkedBy: currentUserName(), note: confirmation.note }
      : { checkedAt: "", checkedBy: "", note: "" }
  };
  let status = candidate.status;
  if (isComplete({ ...candidate, checks }) && status !== "Godkänd/Certifierad") {
    status = "Redo för intervju";
  } else if (!isComplete({ ...candidate, checks }) && status === "Godkänd/Certifierad") {
    status = statusFromChecks(checks);
  }
  const noteSuffix = confirmation.note ? `: ${confirmation.note}` : "";
  await syncActivityFromCandidate(candidate, key, checked, confirmation.note);
  await updateSelected({ checks, checkMeta, status }, `${label}: ${checked ? "klar" : "ej klar"}${noteSuffix}`);
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
  const changed = await updateCandidateCheck("interviewDone", els.interviewDoneInput.checked);
  if (!changed) els.interviewDoneInput.checked = !els.interviewDoneInput.checked;
});

els.approveButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate || !isComplete(candidate)) return;
  await syncActivityFromCandidate(candidate, "decision", true, "Mentorn godkänd och certifierad");
  const caseRecord = cases.find((item) => item.mentorId === candidate.id && item.type === "Certifiering av mentor");
  if (caseRecord) {
    const now = new Date().toISOString();
    await saveCase({ ...caseRecord, status: "Avslutat", updatedAt: now, closedAt: now });
  }
  await updateSelected({ status: "Godkänd/Certifierad" }, "Mentor godkänd och certifierad");
  showFeedback("Mentorn är godkänd och certifierad.");
});

els.deleteButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const mentorCases = cases.filter((caseRecord) => caseRecord.mentorId === candidate.id);
  const confirmed = window.confirm(`Ta bort ${candidate.name} och personens ${mentorCases.length} ${mentorCases.length === 1 ? "ärende" : "ärenden"}? Åtgärden kan inte ångras.`);
  if (!confirmed) return;
  await Promise.all(mentorCases.map((caseRecord) => deleteCaseBundle(caseRecord.id)));
  await deleteCandidate(candidate.id);
  selectedId = null;
  markSaved();
  showFeedback("Mentorn och ärendet har tagits bort.");
  await refresh();
  window.location.hash = "#/mentors";
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
