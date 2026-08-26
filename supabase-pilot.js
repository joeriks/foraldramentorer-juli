import { createClient } from "@supabase/supabase-js";
import { createSupabaseRepository, VersionConflictError } from "./supabase-repository.js";

const elements = {
  state: document.querySelector("#pilotState"),
  login: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  email: document.querySelector("#loginEmail"),
  password: document.querySelector("#loginPassword"),
  workspace: document.querySelector("#workspacePanel"),
  identity: document.querySelector("#sessionIdentity"),
  signOut: document.querySelector("#signOutButton"),
  cases: document.querySelector("#caseList"),
  caseDetail: document.querySelector("#caseDetail"),
  passwordPanel: document.querySelector("#passwordPanel"),
  passwordForm: document.querySelector("#passwordForm"),
  newPassword: document.querySelector("#newPassword"),
  platformPanel: document.querySelector("#platformPanel"),
  invitationForm: document.querySelector("#invitationForm"),
  invitationResult: document.querySelector("#invitationResult"),
  definitionPanel: document.querySelector("#activityDefinitionPanel"),
  definitionList: document.querySelector("#activityDefinitionList"),
  newDefinition: document.querySelector("#newActivityDefinitionButton"),
  definitionForm: document.querySelector("#activityDefinitionForm"),
  definitionId: document.querySelector("#activityDefinitionId"),
  definitionExpectedVersion: document.querySelector("#activityDefinitionExpectedVersion"),
  definitionStableKey: document.querySelector("#activityDefinitionStableKey"),
  definitionTitle: document.querySelector("#activityDefinitionTitle"),
  definitionDescription: document.querySelector("#activityDefinitionDescription"),
  definitionReason: document.querySelector("#activityDefinitionReason"),
  definitionResultRows: document.querySelector("#activityDefinitionResultRows"),
  addDefinitionResult: document.querySelector("#addActivityResultButton"),
  cancelDefinition: document.querySelector("#cancelActivityDefinitionButton"),
  definitionReview: document.querySelector("#activityDefinitionReview"),
  definitionReviewContent: document.querySelector("#activityDefinitionReviewContent"),
  publishDefinition: document.querySelector("#publishActivityDefinitionButton"),
  backToDefinition: document.querySelector("#backToActivityDefinitionButton")
};

let supabase;
let repository;
let currentSession;
let currentContext;
let selectedCaseId;
let selectedWorkspace;
let activityDefinitionCatalog;
let pendingDefinitionPublication;

const CASE_LIFECYCLE_REASONS = {
  pause: [
    ["awaiting_information", "Inväntar information"],
    ["external_dependency", "Inväntar extern hantering"],
    ["temporary_stop", "Tillfälligt stopp"]
  ],
  resume: [
    ["information_received", "Information har kommit in"],
    ["dependency_resolved", "Externt hinder är löst"],
    ["work_resumed", "Handläggningen återupptas"]
  ],
  close: [
    ["completed", "Arbetet är slutfört"],
    ["no_further_action", "Ingen ytterligare åtgärd"],
    ["transferred", "Överfört till annat ärende"]
  ],
  reopen: [
    ["new_information", "Nya uppgifter"],
    ["correction", "Rättelse behövs"],
    ["continued_work", "Fortsatt arbete krävs"]
  ]
};

function setState(message, kind = "info") {
  elements.state.textContent = message;
  elements.state.dataset.kind = kind;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showLoggedOut() {
  currentSession = null;
  currentContext = null;
  selectedCaseId = null;
  selectedWorkspace = null;
  activityDefinitionCatalog = null;
  pendingDefinitionPublication = null;
  elements.login.hidden = false;
  elements.workspace.hidden = true;
  elements.passwordPanel.hidden = true;
  elements.platformPanel.hidden = true;
  elements.definitionPanel.hidden = true;
  elements.definitionForm.hidden = true;
  elements.definitionReview.hidden = true;
  elements.caseDetail.innerHTML = "";
  setState("Inte inloggad.");
}

function renderCaseList(cases) {
  if (!cases.length) {
    elements.cases.innerHTML = "<li>Inga ärenden är synliga för den här användaren.</li>";
    return;
  }
  elements.cases.innerHTML = cases.map((caseRecord) => `
    <li>
      <button type="button" data-case-id="${escapeHtml(caseRecord.id)}">
        <strong>${escapeHtml(caseRecord.number)}</strong>
        <span>${escapeHtml(caseRecord.title)}</span>
        <small>${escapeHtml(caseRecord.status)} · ${escapeHtml(caseRecord.priority)}</small>
      </button>
    </li>
  `).join("");
}

function canCompleteActivities() {
  return ["administrator", "coordinator", "handler"].includes(currentContext?.membership?.role);
}

function canReopenActivities() {
  return ["administrator", "coordinator"].includes(currentContext?.membership?.role);
}

function caseLifecycleReasonOptions(action) {
  return (CASE_LIFECYCLE_REASONS[action] || []).map(([value, label]) =>
    `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
  ).join("");
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("sv-SE") : "–";
}

function latestNoteVersions(notes) {
  const replaced = new Set(notes.map((note) => note.supersedes_version_id).filter(Boolean));
  return notes.filter((note) => !replaced.has(note.id));
}

function activityTitle(activityId) {
  return selectedWorkspace?.activities.find((activity) => activity.id === activityId)?.title || "Okänd aktivitet";
}

function resultDefinitionsForActivity(activity, resultDefinitions) {
  return resultDefinitions.filter((definition) =>
    definition.activity_definition_id === activity.activity_definition_id
      && definition.activity_definition_version === activity.activity_definition_version
  );
}

function renderActivity(activity, resultDefinitions, canWrite) {
  const final = ["completed", "cancelled"].includes(activity.status);
  const activityResultDefinitions = resultDefinitionsForActivity(activity, resultDefinitions);
  const resultLabel = activityResultDefinitions.find((definition) =>
    definition.code === activity.result_code
  )?.label || activity.result_code;
  if (final || !canWrite) {
    const reopenForm = final && canWrite && canReopenActivities() ? `
      <form data-reopen-activity data-activity-id="${escapeHtml(activity.id)}" data-expected-version="${escapeHtml(activity.version)}" data-idempotency-key="${crypto.randomUUID()}">
        <label>Motivering till återöppning<textarea name="reason" maxlength="2000" required></textarea></label>
        <button type="submit">Återöppna aktivitet</button>
      </form>` : "";
    return `<li class="activity-card">
      <strong>${escapeHtml(activity.title)}</strong>
      <span>${escapeHtml(activity.status)} · version ${escapeHtml(activity.version)}</span>
      ${resultLabel ? `<small>Resultat: ${escapeHtml(resultLabel)}</small>` : ""}
      ${reopenForm}
    </li>`;
  }

  if (!activityResultDefinitions.length) {
    return `<li class="activity-card">
      <strong>${escapeHtml(activity.title)}</strong>
      <span>${escapeHtml(activity.status)} · version ${escapeHtml(activity.version)}</span>
      <small>Definitionen saknar publicerade resultat.</small>
    </li>`;
  }

  const options = activityResultDefinitions.map((definition) =>
    `<option value="${escapeHtml(definition.code)}">${escapeHtml(definition.label)}</option>`
  ).join("");
  const workStateForm = `<form data-transition-activity-work-state data-activity-id="${escapeHtml(activity.id)}" data-expected-version="${escapeHtml(activity.version)}" data-idempotency-key="${crypto.randomUUID()}">
      <label>Arbetsläge<select name="targetStatus">
        <option value="active">${activity.status === "waiting" ? "Fortsätt aktivitet" : "Pågående"}</option>
        <option value="waiting">Sätt i vänteläge</option>
      </select></label>
      <label data-waiting-party hidden>Väntar på<select name="waitingForParty">
        <option value="">Välj part</option>
        <option value="mentor">Mentorn</option>
        <option value="handler">Handläggaren</option>
        <option value="external">Extern part</option>
      </select></label>
      <label>Bevakningsdatum<input name="dueDate" type="date" value="${escapeHtml(activity.due_date || "")}"></label>
      <label>Motivering<textarea name="reason" maxlength="2000" placeholder="Obligatorisk när aktiviteten sätts i vänteläge"></textarea></label>
      <button type="submit">Uppdatera arbetsläge</button>
    </form>`;
  return `<li class="activity-card">
    <strong>${escapeHtml(activity.title)}</strong>
    <span>${escapeHtml(activity.status)} · version ${escapeHtml(activity.version)}</span>
    ${activity.waiting_for_party ? `<small>Väntar på: ${escapeHtml(activity.waiting_for_party)}${activity.due_date ? ` · bevakning ${escapeHtml(activity.due_date)}` : ""}</small>` : ""}
    ${workStateForm}
    <form data-complete-activity data-activity-id="${escapeHtml(activity.id)}" data-expected-version="${escapeHtml(activity.version)}" data-idempotency-key="${crypto.randomUUID()}">
      <label>Resultat<select name="resultCode" required>${options}</select></label>
      <button type="submit">Slutför aktivitet</button>
    </form>
  </li>`;
}

function renderCaseWorkspace(workspace) {
  selectedWorkspace = workspace;
  const canWrite = canCompleteActivities() && workspace.case.status === "open";
  const activityDefinitions = selectableActivityDefinitions();
  const activityDefinitionOptions = activityDefinitions.map(({ definition, version }) =>
    `<option value="${escapeHtml(definition.id)}@${escapeHtml(definition.current_version)}" data-definition-title="${escapeHtml(version.title)}">${escapeHtml(version.title)} · version ${escapeHtml(definition.current_version)}</option>`
  ).join("");
  const initialActivityTitle = activityDefinitions[0]?.version.title || "";
  const createActivityForm = canWrite && activityDefinitions.length ? `
    <form data-create-activity data-idempotency-key="${crypto.randomUUID()}" class="activity-create-form">
      <label>Publicerad definition<select name="definition" required>${activityDefinitionOptions}</select></label>
      <label>Aktivitetsrubrik<input name="title" data-activity-title data-autofilled="true" maxlength="160" value="${escapeHtml(initialActivityTitle)}" required></label>
      <label>Förfallodatum<input name="dueDate" type="date"></label>
      <small>Vald definitionsversion fryses på aktiviteten och ändras inte av senare publiceringar.</small>
      <button type="submit">Skapa aktivitet</button>
    </form>` : canWrite
      ? '<p class="workspace-warning">Ingen aktiv och publicerad aktivitetsdefinition finns att välja.</p>'
      : "";
  const lifecycleActions = !canCompleteActivities()
    ? []
    : workspace.case.status === "open"
    ? [["pause", "Pausa ärendet"], ["close", "Avsluta ärendet"]]
    : workspace.case.status === "paused"
      ? [["resume", "Återuppta ärendet"], ["close", "Avsluta ärendet"]]
      : canReopenActivities()
        ? [["reopen", "Återöppna ärendet"]]
        : [];
  const initialLifecycleAction = lifecycleActions[0]?.[0];
  const lifecycleForm = lifecycleActions.length ? `
    <form data-transition-case-lifecycle data-idempotency-key="${crypto.randomUUID()}" class="case-lifecycle-form">
      <label>Åtgärd<select name="action">${lifecycleActions.map(([value, label]) =>
        `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
      ).join("")}</select></label>
      <label>Orsak<select name="reasonCode" required>${caseLifecycleReasonOptions(initialLifecycleAction)}</select></label>
      <label data-case-resume-at ${initialLifecycleAction === "pause" ? "" : "hidden"}>Bevakningsdatum<input name="resumeAt" type="date"></label>
      <label>Motivering<textarea name="note" maxlength="4000" required></textarea></label>
      <button type="submit">Registrera ärendeåtgärd</button>
    </form>` : "";
  const activities = workspace.activities.map((activity) =>
    renderActivity(activity, workspace.activityResults, canWrite)
  ).join("") || "<li>Inga aktiviteter.</li>";
  const descriptionHistory = workspace.descriptionVersions.map((version) => `
    <li><strong>Version ${escapeHtml(version.version)}</strong> · ${escapeHtml(formatDateTime(version.created_at))}<br>${escapeHtml(version.text || "Tom beskrivning")}</li>
  `).join("") || "<li>Ingen versionshistorik.</li>";
  const noteTargetOptions = [
    '<option value="case:">Hela ärendet</option>',
    ...workspace.activities.map((activity) => `<option value="activity:${escapeHtml(activity.id)}">Aktivitet · ${escapeHtml(activity.title)}</option>`)
  ].join("");
  const notes = latestNoteVersions(workspace.notes).map((note) => `
    <li class="workspace-card">
      <strong>${note.target_type === "activity" ? `Aktivitet · ${escapeHtml(activityTitle(note.target_id))}` : "Hela ärendet"}</strong>
      <small>Version ${escapeHtml(note.version)} · ${escapeHtml(formatDateTime(note.created_at))}</small>
      <p>${escapeHtml(note.text)}</p>
      ${canWrite ? `<details><summary>Registrera rättelse</summary>
        <form data-save-note data-note-id="${escapeHtml(note.note_id)}" data-target-type="${escapeHtml(note.target_type)}" data-target-id="${escapeHtml(note.target_id || "")}" data-supersedes-version-id="${escapeHtml(note.id)}" data-idempotency-key="${crypto.randomUUID()}">
          <label>Rättad text<textarea name="text" maxlength="8000" required>${escapeHtml(note.text)}</textarea></label>
          <button type="submit">Spara rättelse</button>
        </form>
      </details>` : ""}
    </li>
  `).join("") || "<li>Inga anteckningar.</li>";
  const deviations = workspace.deviations.map((deviation) => {
    const decision = workspace.deviationDecisions.find((record) => record.id === deviation.active_decision_id);
    const openForm = deviation.status === "open" && canWrite ? `
      <form data-decide-deviation data-deviation-id="${escapeHtml(deviation.id)}" data-expected-version="${escapeHtml(deviation.version)}" data-idempotency-key="${crypto.randomUUID()}">
        <label>Ställningstagande<select name="outcome" required>
          <option value="continue">Fortsätt handläggningen</option>
          <option value="request_supplement">Begär komplettering</option>
          <option value="pause_case">Pausa ärendet</option>
          <option value="close_case">Avsluta ärendet</option>
        </select></label>
        <label>Orsakskod<input name="reasonCode" maxlength="120" required></label>
        <label>Motivering<textarea name="note" maxlength="4000" required></textarea></label>
        <label>Återuppta/förfallodatum<input name="resumeAt" type="date"></label>
        <label>Uppföljningsaktivitet<input name="followUpTitle" maxlength="160" value="Begär komplettering"></label>
        <button type="submit">Registrera ställningstagande</button>
      </form>` : "";
    return `<li class="workspace-card" data-deviation-card>
      <strong>${escapeHtml(activityTitle(deviation.activity_id))}</strong>
      <span>${escapeHtml(deviation.status)} · resultat ${escapeHtml(deviation.result_code)} · version ${escapeHtml(deviation.version)}</span>
      ${decision ? `<p>Beslut: ${escapeHtml(decision.outcome)} · ${escapeHtml(decision.reason_code)}<br>${escapeHtml(decision.note)}</p>` : ""}
      ${openForm}
    </li>`;
  }).join("") || "<li>Inga avvikelser.</li>";
  const documents = workspace.documents.map((document) => {
    const version = workspace.documentVersions.find((record) =>
      record.document_id === document.id && record.version === document.current_version
    );
    return `<li class="workspace-card">
      <strong>${escapeHtml(document.title)}</strong>
      <span>${escapeHtml(document.category)} · ${escapeHtml(version?.status || document.status)}</span>
      ${version ? `<small>${escapeHtml(version.file_name)} · ${escapeHtml(version.mime_type)} · ${escapeHtml(version.actual_size_bytes || version.expected_size_bytes)} byte</small>` : ""}
    </li>`;
  }).join("") || "<li>Inga dokument.</li>";
  const events = workspace.events.map((event) => `
    <li>${escapeHtml(event.type)} <small>${escapeHtml(formatDateTime(event.occurred_at))}</small></li>
  `).join("") || "<li>Ingen historik.</li>";
  elements.caseDetail.innerHTML = `
    <h3>${escapeHtml(workspace.case.number)} · ${escapeHtml(workspace.case.title)}</h3>
    <p class="workspace-meta">${escapeHtml(workspace.case.status)} · version ${escapeHtml(workspace.case.version)}</p>
    ${lifecycleForm}
    <section class="workspace-section">
      <h4>Beskrivning</h4>
      <p>${escapeHtml(workspace.case.description || "Ingen beskrivning.")}</p>
      ${canWrite ? `<form data-update-description data-idempotency-key="${crypto.randomUUID()}">
        <label>Ny version<textarea name="text" maxlength="12000">${escapeHtml(workspace.case.description || "")}</textarea></label>
        <button type="submit">Spara ny beskrivningsversion</button>
      </form>` : ""}
      <details><summary>Versionshistorik (${escapeHtml(workspace.descriptionVersions.length)})</summary><ul>${descriptionHistory}</ul></details>
    </section>
    <section class="workspace-section"><h4>Aktiviteter</h4>${createActivityForm}<ul class="activity-list">${activities}</ul></section>
    <section class="workspace-section">
      <h4>Anteckningar</h4><ul class="workspace-list">${notes}</ul>
      ${canWrite ? `<form data-save-note data-idempotency-key="${crypto.randomUUID()}">
        <label>Koppling<select name="target">${noteTargetOptions}</select></label>
        <label>Ny anteckning<textarea name="text" maxlength="8000" required></textarea></label>
        <button type="submit">Lägg till anteckning</button>
      </form>` : ""}
    </section>
    <section class="workspace-section"><h4>Avvikelser och beslut</h4><ul class="workspace-list">${deviations}</ul></section>
    <section class="workspace-section">
      <h4>Dokument</h4><ul class="workspace-list">${documents}</ul>
      ${canWrite ? `<form data-upload-document data-idempotency-key="${crypto.randomUUID()}">
        <label>Titel<input name="title" maxlength="200" required></label>
        <label>Kategori<select name="category"><option value="case_attachment">Ärendebilaga</option><option value="identity_evidence">Identitetsunderlag</option><option value="consent">Samtycke</option><option value="report">Rapport</option><option value="other">Övrigt</option></select></label>
        <label>Fil<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" required></label>
        <button type="submit">Ladda upp privat dokument</button>
      </form>` : ""}
    </section>
    <section class="workspace-section"><h4>Historik</h4><ul>${events}</ul></section>
  `;
}

function currentActivityDefinitionVersion(definition) {
  return activityDefinitionCatalog?.versions.find((version) =>
    version.activity_definition_id === definition.id
      && version.version === definition.current_version
  );
}

function currentActivityDefinitionResults(definition) {
  return activityDefinitionCatalog?.results.filter((result) =>
    result.activity_definition_id === definition.id
      && result.activity_definition_version === definition.current_version
  ) || [];
}

function selectableActivityDefinitions() {
  return (activityDefinitionCatalog?.definitions || []).flatMap((definition) => {
    const version = currentActivityDefinitionVersion(definition);
    return definition.status === "active" && version?.status === "published"
      ? [{ definition, version }]
      : [];
  });
}

function renderActivityDefinitionAdmin(catalog) {
  activityDefinitionCatalog = catalog;
  if (!catalog.definitions.length) {
    elements.definitionList.innerHTML = "<p>Inga aktivitetsdefinitioner finns ännu.</p>";
    return;
  }

  elements.definitionList.innerHTML = catalog.definitions.map((definition) => {
    const version = currentActivityDefinitionVersion(definition);
    const results = currentActivityDefinitionResults(definition);
    const latestEvent = catalog.events.find((event) => event.activity_definition_id === definition.id);
    return `<article class="definition-card">
      <p class="eyebrow">${definition.is_default ? "Standarddefinition" : "Aktivitetsdefinition"}</p>
      <h4>${escapeHtml(version?.title || definition.stable_key)}</h4>
      <p><code>${escapeHtml(definition.stable_key)}</code> · version ${escapeHtml(definition.current_version)}</p>
      ${version?.description ? `<p>${escapeHtml(version.description)}</p>` : ""}
      <ul>${results.map((result) =>
        `<li>${escapeHtml(result.label)} <small>(${escapeHtml(result.classification)})</small></li>`
      ).join("")}</ul>
      ${latestEvent ? `<small>Senast publicerad: ${escapeHtml(latestEvent.reason)}</small>` : ""}
      <button type="button" data-edit-activity-definition="${escapeHtml(definition.id)}">Publicera ny version</button>
    </article>`;
  }).join("");
}

function activityResultRow(result = {}, index = 0) {
  const classification = result.classification || "accepted";
  return `<div class="result-row" data-activity-result-row>
    <label>Kod<input data-result-code value="${escapeHtml(result.code || "")}" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="80" required></label>
    <label>Etikett<input data-result-label value="${escapeHtml(result.label || "")}" maxlength="160" required></label>
    <label>Klassificering<select data-result-classification>
      <option value="accepted"${classification === "accepted" ? " selected" : ""}>Accepterat</option>
      <option value="deviation"${classification === "deviation" ? " selected" : ""}>Avvikelse</option>
    </select></label>
    <button type="button" class="secondary" data-remove-activity-result aria-label="Ta bort resultat">Ta bort</button>
    <input data-result-sort-order type="hidden" value="${escapeHtml(result.sort_order ?? (index + 1) * 10)}">
  </div>`;
}

function setActivityResultRows(results) {
  elements.definitionResultRows.innerHTML = results.map(activityResultRow).join("");
}

function openActivityDefinitionEditor(definitionId = null) {
  const definition = activityDefinitionCatalog?.definitions.find((record) => record.id === definitionId);
  const version = definition && currentActivityDefinitionVersion(definition);
  const results = definition ? currentActivityDefinitionResults(definition) : [
    { code: "completed", label: "Genomförd", classification: "accepted", sort_order: 10 },
    { code: "not-completed", label: "Kunde inte genomföras", classification: "deviation", sort_order: 20 }
  ];

  elements.definitionForm.reset();
  elements.definitionId.value = definition?.id || "";
  elements.definitionExpectedVersion.value = definition?.current_version || "";
  elements.definitionStableKey.value = definition?.stable_key || "";
  elements.definitionStableKey.readOnly = Boolean(definition);
  elements.definitionTitle.value = version?.title || "";
  elements.definitionDescription.value = version?.description || "";
  elements.definitionReason.value = "";
  setActivityResultRows(results);
  pendingDefinitionPublication = null;
  elements.definitionReview.hidden = true;
  elements.definitionForm.hidden = false;
  elements.definitionStableKey.focus();
}

function collectActivityDefinitionResults() {
  return [...elements.definitionResultRows.querySelectorAll("[data-activity-result-row]")].map((row, index) => ({
    code: row.querySelector("[data-result-code]").value.trim(),
    label: row.querySelector("[data-result-label]").value.trim(),
    classification: row.querySelector("[data-result-classification]").value,
    sortOrder: (index + 1) * 10
  }));
}

async function reloadActivityDefinitionAdmin() {
  const catalog = await repository.listActivityDefinitions();
  renderActivityDefinitionAdmin(catalog);
  return catalog;
}

function closeActivityDefinitionEditor() {
  pendingDefinitionPublication = null;
  elements.definitionForm.hidden = true;
  elements.definitionReview.hidden = true;
}

async function showLoggedIn(session) {
  currentSession = session;
  elements.login.hidden = true;
  elements.workspace.hidden = false;
  elements.passwordPanel.hidden = false;
  elements.identity.textContent = session.user.email || session.user.id;
  setState("Läser RLS-skyddad organisationsdata …");

  const context = await repository.getSessionContext();
  currentContext = context;
  elements.platformPanel.hidden = !context.is_platform_superadmin;
  elements.definitionPanel.hidden = context.membership?.role !== "administrator";
  const organizationName = context.organization?.name;
  const role = context.membership?.role;
  elements.identity.textContent = organizationName
    ? `${context.membership.display_name} · ${organizationName} · ${role}`
    : `${session.user.email || session.user.id}${context.is_platform_superadmin ? " · superadministratör" : " · ingen aktiv organisation"}`;

  const [cases, definitionCatalog] = await Promise.all([
    repository.listCases(),
    ["administrator", "coordinator", "handler"].includes(context.membership?.role)
      ? repository.listActivityDefinitions()
      : Promise.resolve(null)
  ]);
  renderCaseList(cases);
  activityDefinitionCatalog = definitionCatalog;
  if (definitionCatalog && context.membership?.role === "administrator") {
    renderActivityDefinitionAdmin(definitionCatalog);
  }
  setState(`Inloggad. ${cases.length} isolerade ärenden kunde läsas.`, "success");
}

async function refreshForSession(session) {
  try {
    if (!session) return showLoggedOut();
    await showLoggedIn(session);
  } catch (error) {
    setState(error.message, "error");
  }
}

async function initialize() {
  setState("Ansluter till Supabase …");
  const response = await fetch("/api/runtime-config", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Supabase är inte konfigurerat på servern.");
  const configuration = await response.json();
  supabase = createClient(configuration.supabaseUrl, configuration.supabasePublishableKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  repository = createSupabaseRepository(supabase);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") elements.passwordPanel.hidden = false;
    window.setTimeout(() => refreshForSession(session), 0);
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  await refreshForSession(data.session);
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setState("Loggar in …");
  const { error } = await supabase.auth.signInWithPassword({
    email: elements.email.value.trim(),
    password: elements.password.value
  });
  if (error) setState("Inloggningen misslyckades.", "error");
});

elements.signOut.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

elements.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = elements.newPassword.value;
  if (password.length < 10) return setState("Lösenordet måste vara minst 10 tecken.", "error");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return setState("Lösenordet kunde inte sparas.", "error");
  elements.newPassword.value = "";
  setState("Lösenordet är sparat.", "success");
});

elements.cases.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-case-id]");
  if (!button) return;
  selectedCaseId = button.dataset.caseId;
  setState("Läser ärendet …");
  try {
    renderCaseWorkspace(await repository.getCaseWorkspace(selectedCaseId));
    setState("Ärendet lästes genom organisationens RLS-regler.", "success");
  } catch (error) {
    setState(error.message, "error");
  }
});

async function reloadSelectedWorkspace(message) {
  if (!selectedCaseId) return;
  renderCaseWorkspace(await repository.getCaseWorkspace(selectedCaseId));
  setState(message, "success");
}

async function handleWorkspaceError(error, submitButton) {
  if (error instanceof VersionConflictError && selectedCaseId) {
    try {
      renderCaseWorkspace(await repository.getCaseWorkspace(selectedCaseId));
      setState("Ärendet ändrades av någon annan. Senaste versionen visas – kontrollera den innan du försöker igen.", "warning");
    } catch {
      setState("Ärendet ändrades av någon annan, men den senaste versionen kunde inte läsas. Ladda om sidan.", "error");
    }
    return;
  }
  if (submitButton) submitButton.disabled = false;
  setState(error.message, "error");
}

elements.caseDetail.addEventListener("submit", async (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  const values = new FormData(form);
  if (!selectedCaseId || !selectedWorkspace) return setState("Välj ett ärende först.", "error");
  submitButton.disabled = true;

  try {
    if (form.matches("[data-create-activity]")) {
      const [activityDefinitionId, version] = String(values.get("definition") || "").split("@");
      setState("Skapar aktiviteten med fryst definitionsversion …");
      try {
        await repository.createCaseActivity({
          caseId: selectedCaseId,
          activityDefinitionId,
          expectedActivityDefinitionVersion: Number(version),
          title: values.get("title"),
          dueDate: values.get("dueDate") || null,
          idempotencyKey: form.dataset.idempotencyKey
        });
      } catch (error) {
        if (error instanceof VersionConflictError) {
          try {
            activityDefinitionCatalog = await repository.listActivityDefinitions();
          } catch {
            // The shared conflict handler still reloads the case and reports the original conflict.
          }
        }
        throw error;
      }
      await reloadSelectedWorkspace(`Aktiviteten skapades med definitionsversion ${version} fryst.`);
    } else if (form.matches("[data-transition-case-lifecycle]")) {
      const action = values.get("action");
      setState("Registrerar ärendets livscykelåtgärd …");
      await repository.transitionCaseLifecycle({
        caseId: selectedCaseId,
        expectedVersion: selectedWorkspace.case.version,
        action,
        reasonCode: values.get("reasonCode"),
        note: values.get("note"),
        resumeAt: action === "pause" ? values.get("resumeAt") || null : null,
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace({
        pause: "Ärendet pausades. Aktiviteterna ligger kvar men kan inte ändras.",
        resume: "Ärendet återupptogs och är öppet för fortsatt arbete.",
        close: "Ärendet avslutades och återstående aktiviteter markerades som inställda.",
        reopen: "Ärendet återöppnades. Tidigare inställda aktiviteter återaktiverades inte."
      }[action]);
    } else if (form.matches("[data-transition-activity-work-state]")) {
      const targetStatus = values.get("targetStatus");
      setState(targetStatus === "waiting" ? "Sätter aktiviteten i vänteläge …" : "Återupptar aktiviteten …");
      await repository.transitionCaseActivityWorkState({
        activityId: form.dataset.activityId,
        expectedVersion: Number(form.dataset.expectedVersion),
        targetStatus,
        waitingForParty: targetStatus === "waiting" ? values.get("waitingForParty") : null,
        dueDate: values.get("dueDate") || null,
        reason: values.get("reason") || null,
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace(targetStatus === "waiting"
        ? "Aktiviteten sattes i vänteläge och övergången registrerades i historiken."
        : "Aktiviteten är pågående igen och väntande part har rensats.");
    } else if (form.matches("[data-reopen-activity]")) {
      setState("Återöppnar aktiviteten …");
      await repository.reopenCaseActivity({
        activityId: form.dataset.activityId,
        expectedVersion: Number(form.dataset.expectedVersion),
        reason: values.get("reason"),
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace("Aktiviteten återöppnades. Tidigare resultat och eventuell avvikelse finns kvar i historiken.");
    } else if (form.matches("[data-complete-activity]")) {
      const resultCode = values.get("resultCode");
      const activity = selectedWorkspace.activities.find((record) => record.id === form.dataset.activityId);
      const resultDefinition = activity && resultDefinitionsForActivity(
        activity,
        selectedWorkspace.activityResults
      ).find((definition) => definition.code === resultCode);
      if (!resultDefinition) throw new TypeError("Välj ett giltigt aktivitetsresultat.");
      setState("Slutför aktiviteten …");
      await repository.completeCaseActivity({
        activityId: form.dataset.activityId,
        expectedVersion: Number(form.dataset.expectedVersion),
        resultCode,
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace(
        resultDefinition.classification === "deviation"
          ? "Aktiviteten slutfördes och en isolerad avvikelse öppnades automatiskt."
          : "Aktiviteten slutfördes och historiken uppdaterades."
      );
    } else if (form.matches("[data-update-description]")) {
      setState("Sparar ny beskrivningsversion …");
      await repository.updateCaseDescription({
        caseId: selectedCaseId,
        expectedCaseVersion: selectedWorkspace.case.version,
        text: values.get("text"),
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace("En ny immutable beskrivningsversion sparades.");
    } else if (form.matches("[data-save-note]")) {
      let targetType = form.dataset.targetType;
      let targetId = form.dataset.targetId || null;
      if (!targetType) [targetType, targetId = null] = String(values.get("target") || "case:").split(":");
      setState(form.dataset.supersedesVersionId ? "Sparar rättelsen …" : "Sparar anteckningen …");
      await repository.saveCaseNote({
        caseId: selectedCaseId,
        expectedCaseVersion: selectedWorkspace.case.version,
        noteId: form.dataset.noteId || null,
        targetType,
        targetId: targetId || null,
        text: values.get("text"),
        supersedesVersionId: form.dataset.supersedesVersionId || null,
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace(form.dataset.supersedesVersionId
        ? "Rättelsen sparades utan att originalanteckningen raderades."
        : "Anteckningen sparades i ärendehistoriken.");
    } else if (form.matches("[data-decide-deviation]")) {
      setState("Registrerar ställningstagandet …");
      await repository.decideActivityDeviation({
        deviationId: form.dataset.deviationId,
        expectedDeviationVersion: Number(form.dataset.expectedVersion),
        expectedCaseVersion: selectedWorkspace.case.version,
        outcome: values.get("outcome"),
        reasonCode: values.get("reasonCode"),
        note: values.get("note"),
        resumeAt: values.get("resumeAt") || null,
        followUpTitle: values.get("followUpTitle") || null,
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace("Ställningstagandet registrerades och avvikelsen löstes.");
    } else if (form.matches("[data-upload-document]")) {
      setState("Laddar upp dokumentet till privat organisationslagring …");
      await repository.uploadCaseDocument({
        caseId: selectedCaseId,
        title: values.get("title"),
        category: values.get("category"),
        file: values.get("file"),
        idempotencyKey: form.dataset.idempotencyKey
      });
      await reloadSelectedWorkspace("Dokumentet laddades upp och verifierades i privat Storage.");
    }
  } catch (error) {
    await handleWorkspaceError(error, submitButton);
  }
});

elements.caseDetail.addEventListener("change", (event) => {
  const lifecycleAction = event.target.closest('[data-transition-case-lifecycle] select[name="action"]');
  if (lifecycleAction) {
    const form = lifecycleAction.form;
    form.querySelector('select[name="reasonCode"]').innerHTML = caseLifecycleReasonOptions(lifecycleAction.value);
    const resumeAt = form.querySelector("[data-case-resume-at]");
    resumeAt.hidden = lifecycleAction.value !== "pause";
    if (resumeAt.hidden) resumeAt.querySelector("input").value = "";
    return;
  }
  const workStateSelect = event.target.closest('[data-transition-activity-work-state] select[name="targetStatus"]');
  if (workStateSelect) {
    const waiting = workStateSelect.value === "waiting";
    const waitingParty = workStateSelect.form.querySelector("[data-waiting-party]");
    const waitingPartySelect = waitingParty.querySelector("select");
    const reason = workStateSelect.form.querySelector('[name="reason"]');
    waitingParty.hidden = !waiting;
    waitingPartySelect.required = waiting;
    reason.required = waiting;
    return;
  }
  const select = event.target.closest('[data-create-activity] select[name="definition"]');
  if (!select) return;
  const title = select.form.querySelector("[data-activity-title]");
  if (title?.dataset.autofilled === "true") {
    title.value = select.selectedOptions[0]?.dataset.definitionTitle || "";
  }
});

elements.caseDetail.addEventListener("input", (event) => {
  const title = event.target.closest("[data-activity-title]");
  if (title) title.dataset.autofilled = "false";
});

elements.newDefinition.addEventListener("click", () => openActivityDefinitionEditor());

elements.definitionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-activity-definition]");
  if (button) openActivityDefinitionEditor(button.dataset.editActivityDefinition);
});

elements.addDefinitionResult.addEventListener("click", () => {
  const index = elements.definitionResultRows.querySelectorAll("[data-activity-result-row]").length;
  if (index >= 20) return setState("En definition kan ha högst 20 resultat.", "error");
  elements.definitionResultRows.insertAdjacentHTML("beforeend", activityResultRow({}, index));
});

elements.definitionResultRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-activity-result]");
  if (!button) return;
  const rows = elements.definitionResultRows.querySelectorAll("[data-activity-result-row]");
  if (rows.length === 1) return setState("Minst ett resultat måste finnas.", "error");
  button.closest("[data-activity-result-row]").remove();
});

elements.cancelDefinition.addEventListener("click", closeActivityDefinitionEditor);

elements.definitionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const definitionId = elements.definitionId.value || null;
  const expectedCurrentVersion = elements.definitionExpectedVersion.value
    ? Number(elements.definitionExpectedVersion.value)
    : null;
  pendingDefinitionPublication = {
    activityDefinitionId: definitionId,
    expectedCurrentVersion,
    stableKey: elements.definitionStableKey.value.trim(),
    title: elements.definitionTitle.value.trim(),
    description: elements.definitionDescription.value.trim(),
    results: collectActivityDefinitionResults(),
    reason: elements.definitionReason.value.trim(),
    idempotencyKey: crypto.randomUUID()
  };

  const nextVersion = expectedCurrentVersion ? expectedCurrentVersion + 1 : 1;
  elements.definitionReviewContent.innerHTML = `
    <h4>${escapeHtml(pendingDefinitionPublication.title)} · version ${escapeHtml(nextVersion)}</h4>
    <p><code>${escapeHtml(pendingDefinitionPublication.stableKey)}</code></p>
    <p><strong>Skäl:</strong> ${escapeHtml(pendingDefinitionPublication.reason)}</p>
    <ul>${pendingDefinitionPublication.results.map((result) =>
      `<li>${escapeHtml(result.label)} · ${escapeHtml(result.code)} · ${escapeHtml(result.classification)}</li>`
    ).join("")}</ul>
    <p><strong>Kontrollera noga:</strong> efter publicering är versionen och dess resultat låsta. Rättelser görs som ytterligare en version.</p>
  `;
  elements.definitionForm.hidden = true;
  elements.definitionReview.hidden = false;
});

elements.backToDefinition.addEventListener("click", () => {
  elements.definitionReview.hidden = true;
  elements.definitionForm.hidden = false;
});

elements.publishDefinition.addEventListener("click", async () => {
  if (!pendingDefinitionPublication) return;
  elements.publishDefinition.disabled = true;
  setState("Publicerar den granskade aktivitetsdefinitionen …");
  try {
    const definition = await repository.publishActivityDefinition(pendingDefinitionPublication);
    await reloadActivityDefinitionAdmin();
    closeActivityDefinitionEditor();
    setState(`Aktivitetsdefinitionen publicerades som version ${definition.current_version}.`, "success");
  } catch (error) {
    if (error instanceof VersionConflictError) {
      await reloadActivityDefinitionAdmin();
      closeActivityDefinitionEditor();
      setState("Definitionen publicerades av någon annan. Senaste versionen visas; öppna den och granska ändringarna igen.", "warning");
    } else {
      setState(error.message, "error");
    }
  } finally {
    elements.publishDefinition.disabled = false;
  }
});

elements.invitationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(elements.invitationForm);
  const payload = Object.fromEntries(form.entries());
  payload.idempotencyKey = crypto.randomUUID();
  setState("Skapar organisation och skickar inbjudan …");
  const response = await fetch("/api/platform/organization-invitations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${currentSession.access_token}`
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) return setState(`Inbjudan misslyckades (${result.code}).`, "error");
  elements.invitationResult.textContent = `Organisation ${result.organizationId} skapad; inbjudan skickad till ${result.email}.`;
  elements.invitationForm.reset();
  setState("Organisationen är skapad och administratören inbjuden.", "success");
});

initialize().catch((error) => setState(error.message, "error"));
