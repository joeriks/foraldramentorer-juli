const DB_NAME = "foraldramentorer";
const DB_VERSION = 1;
const STORE = "candidates";

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

const seedCandidates = [
  {
    name: "Anna Lind",
    area: "Centrum",
    languages: "Svenska, engelska",
    availability: "Vardagskvällar",
    coordinator: "Maja",
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
    notes: "Varm och tydlig. Har lång erfarenhet från föreningsliv."
  },
  {
    name: "Bo Karlsson",
    area: "Väster",
    languages: "Svenska",
    availability: "Dag dagtid",
    coordinator: "Maja",
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
    notes: "Ska bokas för digital intervju."
  },
  {
    name: "Samira Haddad",
    area: "Öster",
    languages: "Svenska, arabiska",
    availability: "Helgförmiddagar",
    coordinator: "Jonas",
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
    notes: "God förmåga att lyssna. Tydlig kring gränser och uppdragets roll."
  }
];

let db;
let candidates = [];
let selectedId = null;

const els = {
  totalCount: document.querySelector("#totalCount"),
  readyCount: document.querySelector("#readyCount"),
  certifiedCount: document.querySelector("#certifiedCount"),
  blockedCount: document.querySelector("#blockedCount"),
  seedButton: document.querySelector("#seedButton"),
  resetButton: document.querySelector("#resetButton"),
  candidateForm: document.querySelector("#candidateForm"),
  candidateList: document.querySelector("#candidateList"),
  emptyState: document.querySelector("#emptyState"),
  candidateDetail: document.querySelector("#candidateDetail"),
  selectedStatus: document.querySelector("#selectedStatus"),
  selectedName: document.querySelector("#selectedName"),
  selectedMeta: document.querySelector("#selectedMeta"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
  checklist: document.querySelector("#checklist"),
  interviewDateInput: document.querySelector("#interviewDateInput"),
  notesInput: document.querySelector("#notesInput"),
  decisionHint: document.querySelector("#decisionHint"),
  approveButton: document.querySelector("#approveButton"),
  deleteButton: document.querySelector("#deleteButton")
};

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const nextDb = request.result;
      if (!nextDb.objectStoreNames.contains(STORE)) {
        nextDb.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
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
    const request = tx("readwrite").delete(id);
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

async function refresh() {
  candidates = await getAllCandidates();
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  renderSummary();
  renderList();
  renderDetail();
}

function selectedCandidate() {
  return candidates.find((candidate) => candidate.id === selectedId);
}

function isComplete(candidate) {
  return CHECKS.every(([key]) => candidate.checks?.[key]);
}

function isBlocked(candidate) {
  return !candidate.checks?.identityVerified || !candidate.checks?.registryChecked || !candidate.checks?.referencesDone;
}

function renderSummary() {
  els.totalCount.textContent = candidates.length;
  els.readyCount.textContent = candidates.filter((candidate) => isComplete(candidate) && candidate.status !== "Godkänd/Certifierad").length;
  els.certifiedCount.textContent = candidates.filter((candidate) => candidate.status === "Godkänd/Certifierad").length;
  els.blockedCount.textContent = candidates.filter(isBlocked).length;
}

function renderList() {
  els.candidateList.innerHTML = "";

  if (!candidates.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "Inga kandidater ännu.";
    els.candidateList.append(empty);
    return;
  }

  for (const candidate of candidates) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `candidate-card${candidate.id === selectedId ? " active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(candidate.name)}</strong>
      <small>${escapeHtml(candidate.status)} · ${escapeHtml(candidate.area)}</small>
      <small>${escapeHtml(candidate.languages)} · ${escapeHtml(candidate.availability)}</small>
    `;
    button.addEventListener("click", () => {
      selectedId = candidate.id;
      renderList();
      renderDetail();
    });
    els.candidateList.append(button);
  }
}

function renderDetail() {
  const candidate = selectedCandidate();

  if (!candidate) {
    els.emptyState.hidden = false;
    els.candidateDetail.hidden = true;
    return;
  }

  els.emptyState.hidden = true;
  els.candidateDetail.hidden = false;
  els.selectedName.textContent = candidate.name;
  els.selectedMeta.textContent = `${candidate.area} · ${candidate.languages} · ${candidate.availability}`;
  els.selectedStatus.textContent = candidate.status;
  els.selectedStatus.className = `status-pill ${isComplete(candidate) ? "ready" : isBlocked(candidate) ? "blocked" : ""}`;

  els.statusSelect.innerHTML = "";
  for (const status of STATUSES) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === candidate.status;
    els.statusSelect.append(option);
  }

  els.coordinatorInput.value = candidate.coordinator || "";
  els.interviewDateInput.value = candidate.interviewDate || "";
  els.notesInput.value = candidate.notes || "";
  els.checklist.innerHTML = "";

  for (const [key, label] of CHECKS) {
    const item = document.createElement("label");
    item.className = "check-item";
    item.innerHTML = `
      <input type="checkbox" data-check="${key}" ${candidate.checks?.[key] ? "checked" : ""}>
      <span>${label}</span>
    `;
    els.checklist.append(item);
  }

  const complete = isComplete(candidate);
  els.approveButton.disabled = !complete;
  els.decisionHint.textContent = complete
    ? "Kandidaten uppfyller kraven och kan certifieras."
    : "Alla kritiska steg måste vara klara innan certifiering.";
}

async function updateSelected(patch) {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const updated = { ...candidate, ...patch, updatedAt: new Date().toISOString() };
  await saveCandidate(updated);
  await refresh();
}

function newCandidate(formData) {
  return {
    id: crypto.randomUUID(),
    name: formData.get("name").trim(),
    area: formData.get("area").trim(),
    languages: formData.get("languages").trim(),
    availability: formData.get("availability").trim(),
    coordinator: "",
    status: "Anmäld",
    checks: Object.fromEntries(CHECKS.map(([key]) => [key, false])),
    interviewDate: "",
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
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

els.candidateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = newCandidate(new FormData(els.candidateForm));
  await saveCandidate(candidate);
  selectedId = candidate.id;
  els.candidateForm.reset();
  await refresh();
});

els.statusSelect.addEventListener("change", () => updateSelected({ status: els.statusSelect.value }));
els.coordinatorInput.addEventListener("change", () => updateSelected({ coordinator: els.coordinatorInput.value.trim() }));
els.interviewDateInput.addEventListener("change", () => updateSelected({ interviewDate: els.interviewDateInput.value }));
els.notesInput.addEventListener("change", () => updateSelected({ notes: els.notesInput.value.trim() }));

els.checklist.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-check]");
  const candidate = selectedCandidate();
  if (!input || !candidate) return;
  const checks = { ...candidate.checks, [input.dataset.check]: input.checked };
  let status = candidate.status;
  if (isComplete({ ...candidate, checks }) && status !== "Godkänd/Certifierad") {
    status = "Redo för intervju";
  }
  await updateSelected({ checks, status });
});

els.approveButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate || !isComplete(candidate)) return;
  await updateSelected({ status: "Godkänd/Certifierad" });
});

els.deleteButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  await deleteCandidate(candidate.id);
  selectedId = null;
  await refresh();
});

els.seedButton.addEventListener("click", async () => {
  const now = new Date().toISOString();
  for (const candidate of seedCandidates) {
    await saveCandidate({
      ...candidate,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    });
  }
  await refresh();
});

els.resetButton.addEventListener("click", async () => {
  await clearCandidates();
  selectedId = null;
  await refresh();
});

openDatabase()
  .then(async (database) => {
    db = database;
    await refresh();
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="empty-state"><h1>Kunde inte öppna IndexedDB</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
