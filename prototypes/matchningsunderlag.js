const viewButtons = [...document.querySelectorAll("[data-view]")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];

function showView(view) {
  for (const button of viewButtons) {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  for (const panel of viewPanels) panel.hidden = panel.dataset.viewPanel !== view;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

for (const button of viewButtons) button.addEventListener("click", () => showView(button.dataset.view));
for (const button of document.querySelectorAll("[data-go-view]")) button.addEventListener("click", () => showView(button.dataset.goView));

const complexSupportTopics = [
  {
    title: "Vardag med neuropsykiatriska funktionsnedsättningar (NPF) eller behov av extra tydlighet",
    can: "Dela erfarenheter av struktur, tydlighet, energihantering och att förbereda vardagliga förändringar.",
    cannot: "Bedöma eller diagnostisera, rekommendera behandling eller ersätta habilitering, vård eller elevhälsa."
  },
  {
    title: "Långvarig eller återkommande skolfrånvaro",
    can: "Stötta med morgonrutiner, motivation i små steg, förberedelse inför skolmöten och uthållighet över tid.",
    cannot: "Besluta om skolåtgärder, behandla bakomliggande ohälsa eller ta över skolans och elevhälsans ansvar."
  },
  {
    title: "Kontakter med myndigheter och verksamheter",
    can: "Hjälpa föräldern att sortera frågor, förbereda möten, anteckna och följa upp vad som har sagts.",
    cannot: "Ge juridisk rådgivning, fatta beslut, lova insatser eller företräda föräldern utan ett särskilt uppdrag."
  },
  {
    title: "När psykisk eller fysisk ohälsa påverkar vardagen",
    can: "Vara ett medmänskligt extrastöd, bidra till fungerande vardagsrutiner och uppmuntra kontakt med rätt professionell hjälp.",
    cannot: "Bedöma symtom, ge medicinska råd, bedriva behandling eller ansvara för akuta situationer."
  }
];

function scopeBoundariesMarkup(headingId) {
  return `
    <details class="scope-boundaries">
      <summary id="${headingId}">Se vad mentorn kan och inte kan hjälpa till med</summary>
      <div class="scope-guide-body">
        <div class="scope-topic-list">
          ${complexSupportTopics.map(topic => `
            <article class="scope-topic">
              <h4>${topic.title}</h4>
              <div><strong>Mentorn kan</strong><p>${topic.can}</p></div>
              <div><strong>Mentorn kan inte</strong><p>${topic.cannot}</p></div>
            </article>`).join("")}
        </div>
        <p class="scope-escalation"><strong>Vid akut oro för hälsa eller säkerhet:</strong> kontakta ansvarig professionell aktör eller akut hjälp. Mentorn ska inte ensam hantera situationen.</p>
      </div>
    </details>`;
}

function parentComplementarySupportMarkup(headingId) {
  return `
    <section class="complementary-support" aria-labelledby="${headingId}">
      <div class="complementary-heading">
        <div><span class="eyebrow">Valfritt matchningsunderlag</span><h3 id="${headingId}">Kompletterande mentorstöd</h3></div>
        <p>Mentorn kan ge vardagsnära stöd även när föräldern redan får, väntar på eller söker professionell hjälp. Uppgiften används för att avgränsa mentoruppdraget, inte för att bedöma rätten till stöd.</p>
      </div>
      <label class="complementary-toggle"><input id="parentComplementarySupport" type="checkbox" checked><span><strong>Jag vill ha en mentor som kompletterande stöd</strong><small>Det professionella stödet fortsätter som vanligt. Mentorn ersätter inte vård, skola eller myndighetsinsatser.</small></span></label>
      <div id="parentComplementarySupportFields" class="complementary-fields">
        <fieldset>
          <legend>I vilket sammanhang önskas stödet?</legend>
          <p>Välj bara det som hjälper handläggaren att förstå mentorrollen. Ange inga diagnos-, behandlings- eller journaluppgifter.</p>
          <div id="parentComplementaryContexts" class="complementary-options">
            <label><input type="checkbox" value="NPF eller behov av extra tydlighet" checked> NPF eller behov av extra tydlighet i vardagen</label>
            <label><input type="checkbox" value="Långvarig eller återkommande skolfrånvaro"> Långvarig eller återkommande skolfrånvaro</label>
            <label><input type="checkbox" value="Kontakter med myndigheter eller verksamheter"> Kontakter med myndigheter eller verksamheter</label>
            <label><input type="checkbox" value="Psykisk eller fysisk ohälsa påverkar vardagen"> Psykisk eller fysisk ohälsa påverkar vardagen</label>
          </div>
        </fieldset>
        <div class="complementary-grid">
          <label class="field-block"><span>Hur ser det professionella stödet ut?</span><select id="parentProfessionalSupportStatus"><option selected>Stöd finns idag</option><option>Kontakt är tagen eller föräldern väntar på stöd</option><option>Föräldern önskar hjälp av handläggaren att hitta rätt kontakt</option><option>Vill inte ange</option></select></label>
          <fieldset>
            <legend>Vad önskas av mentorn?</legend>
            <div id="parentComplementaryRoles" class="complementary-options compact">
              <label><input type="checkbox" value="Vardagsrutiner" checked> Hjälp att få vardagsrutiner att fungera</label>
              <label><input type="checkbox" value="Förbereda frågor och möten" checked> Förbereda frågor och möten</label>
              <label><input type="checkbox" value="Vardagssteg mellan professionella kontakter" checked> Följa upp vardagssteg mellan professionella kontakter</label>
              <label><input type="checkbox" value="Medmänskligt stöd"> Vara ett medmänskligt stöd</label>
            </div>
          </fieldset>
        </div>
      </div>
      ${scopeBoundariesMarkup(`${headingId}Boundaries`)}
    </section>`;
}

function mentorComplementarySupportMarkup(headingId) {
  return `
    <section class="complementary-support" aria-labelledby="${headingId}">
      <div class="complementary-heading">
        <div><span class="eyebrow">Valfritt matchningsunderlag</span><h3 id="${headingId}">Stöd när professionella aktörer är involverade</h3></div>
        <p>Markera endast sammanhang där du vill bli matchad som ett kompletterande vardagsstöd.</p>
      </div>
      <fieldset class="mentor-complementary-contexts">
        <legend>Jag kan tänka mig att ge kompletterande stöd kring</legend>
        <div class="complementary-options">
          <label><input type="checkbox" value="NPF eller behov av extra tydlighet" checked> NPF eller behov av extra tydlighet i vardagen</label>
          <label><input type="checkbox" value="Långvarig eller återkommande skolfrånvaro" checked> Långvarig eller återkommande skolfrånvaro</label>
          <label><input type="checkbox" value="Kontakter med myndigheter eller verksamheter"> Kontakter med myndigheter eller verksamheter</label>
          <label><input type="checkbox" value="Psykisk eller fysisk ohälsa påverkar vardagen"> Psykisk eller fysisk ohälsa påverkar vardagen</label>
        </div>
        <p class="data-use-note">Valet betyder att du kan vara ett stöd i vardagen. Du tar inte över professionellt ansvar och ska inte ge vård-, behandlings- eller myndighetsråd.</p>
      </fieldset>
      ${scopeBoundariesMarkup(`${headingId}Boundaries`)}
    </section>`;
}

for (const [index, guide] of [...document.querySelectorAll("[data-scope-guide]")].entries()) {
  const headingId = `scopeGuideHeading${index + 1}`;
  guide.innerHTML = guide.dataset.scopeGuide === "mentor"
    ? mentorComplementarySupportMarkup(headingId)
    : parentComplementarySupportMarkup(headingId);
}

const parentPreferredLanguage = document.querySelector("#parentPreferredLanguage");
const parentAlternativeLanguages = document.querySelector("#parentAlternativeLanguages");
const coordinatorLanguageRequirements = document.querySelector("#coordinatorLanguageRequirements");

function syncParentLanguages() {
  const preferred = parentPreferredLanguage.value;
  for (const input of parentAlternativeLanguages.querySelectorAll('input[type="checkbox"]')) {
    const sameAsPreferred = input.value === preferred;
    if (sameAsPreferred) input.checked = false;
    input.disabled = sameAsPreferred;
    input.closest("label").classList.toggle("is-unavailable", sameAsPreferred);
  }
  const alternatives = [...parentAlternativeLanguages.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  const alternativeText = alternatives.length ? `${alternatives.join(", ")} fungerar också` : "inga alternativa språk angivna";
  coordinatorLanguageRequirements.textContent = `${preferred} helst · ${alternativeText} · kvällstid`;
  const languageAssessment = document.querySelector("#coordinatorLanguageAssessment");
  const selectedMentorLanguageReason = document.querySelector("#selectedMentorLanguageReason");
  if (preferred === "Svenska") {
    languageAssessment.textContent = "Svenska är förstahandsval och mentorn kan använda svenska obehindrat.";
    selectedMentorLanguageReason.textContent = "Förstahandsspråk: svenska";
  } else if (alternatives.includes("Svenska")) {
    languageAssessment.textContent = `Svenska fungerar för föräldern; ${preferred.toLowerCase()} är förstahandsval.`;
    selectedMentorLanguageReason.textContent = "Svenska fungerar";
  } else {
    languageAssessment.textContent = `Mentorn saknar angiven överensstämmelse med ${preferred.toLowerCase()}. Språkfrågan behöver lösas före matchning.`;
    selectedMentorLanguageReason.textContent = "Språk behöver lösas";
  }
}

parentPreferredLanguage.addEventListener("change", syncParentLanguages);
parentAlternativeLanguages.addEventListener("change", syncParentLanguages);
syncParentLanguages();

for (const row of document.querySelectorAll(".mentor-language-list label")) {
  const checkbox = row.querySelector('input[type="checkbox"]');
  const level = row.querySelector("select");
  const syncMentorLanguage = () => {
    level.disabled = !checkbox.checked;
    row.classList.toggle("selected", checkbox.checked);
  };
  checkbox.addEventListener("change", syncMentorLanguage);
  syncMentorLanguage();
}

const parentComplementarySupport = document.querySelector("#parentComplementarySupport");
const parentComplementarySupportFields = document.querySelector("#parentComplementarySupportFields");
const parentComplementaryContexts = document.querySelector("#parentComplementaryContexts");
const parentProfessionalSupportStatus = document.querySelector("#parentProfessionalSupportStatus");
const parentComplementaryRoles = document.querySelector("#parentComplementaryRoles");
const coordinatorComplementarySupport = document.querySelector("#coordinatorComplementarySupport");

function syncComplementarySupport() {
  const enabled = parentComplementarySupport.checked;
  parentComplementarySupportFields.hidden = !enabled;
  for (const input of parentComplementarySupportFields.querySelectorAll("input, select")) input.disabled = !enabled;
  coordinatorComplementarySupport.hidden = !enabled;
  if (!enabled) return;

  const contexts = [...parentComplementaryContexts.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  const roles = [...parentComplementaryRoles.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  document.querySelector("#coordinatorProfessionalSupportContext").textContent = contexts.join(" · ") || "Sammanhang behöver förtydligas";
  document.querySelector("#coordinatorProfessionalSupportStatus").textContent = parentProfessionalSupportStatus.value;
  document.querySelector("#coordinatorComplementaryRole").textContent = roles.join(", ") || "Önskad mentorroll behöver förtydligas";
}

parentComplementarySupport.addEventListener("change", syncComplementarySupport);
parentComplementarySupportFields.addEventListener("change", syncComplementarySupport);
syncComplementarySupport();

function selectedValues(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function bindLimitedChoices(container, limit, countElement, messageElement, onChange = () => {}) {
  container.addEventListener("change", (event) => {
    const checked = selectedValues(container);
    if (checked.length > limit) {
      event.target.checked = false;
      messageElement.textContent = `Du kan välja högst ${limit} områden.`;
    } else {
      messageElement.textContent = "";
    }
    for (const label of container.querySelectorAll("label")) label.classList.toggle("selected", Boolean(label.querySelector("input:checked")));
    countElement.textContent = String(selectedValues(container).length);
    onChange();
  });
}

const parentAreas = document.querySelector("#parentAreas");
const parentDetails = document.querySelector("#parentDetails");
const parentAreaCount = document.querySelector("#parentAreaCount");
const parentAreaLimit = document.querySelector("#parentAreaLimit");

function renderParentDetails() {
  const selectedInputs = [...parentAreas.querySelectorAll("input:checked")];
  const existing = new Set([...parentDetails.querySelectorAll("input:checked")].map((input) => input.value));
  const details = selectedInputs.flatMap((input) => input.dataset.detail.split("|"));
  parentDetails.innerHTML = details.map((detail, index) => `<label><input type="checkbox" value="${detail}" ${existing.has(detail) || index < 2 ? "checked" : ""}> ${detail}</label>`).join("");
  const compactLabels = selectedInputs.map((input) => input.value.replace("Konflikter, gränser och överenskommelser", "Konflikter och gränser").replace("Skola, skolnärvaro och lärande", "Skola och skolnärvaro"));
  document.querySelector("#coordinatorParentAreas").textContent = compactLabels.join(" · ") || "Inga områden valda";
}

bindLimitedChoices(parentAreas, 3, parentAreaCount, parentAreaLimit, renderParentDetails);
renderParentDetails();

const mentorAreas = document.querySelector("#mentorAreas");
const mentorRows = document.querySelector("#mentorExperienceRows");
const mentorAreaCount = document.querySelector("#mentorAreaCount");
const mentorAreaLimit = document.querySelector("#mentorAreaLimit");

function renderMentorExperienceRows() {
  const selected = selectedValues(mentorAreas);
  const existingProfiles = new Map(
    [...mentorRows.querySelectorAll(".experience-row")].map((row) => [
      row.dataset.area,
      {
        confidence: row.querySelector('.confidence-options input:checked')?.value,
        bases: new Set([...row.querySelectorAll('.experience-bases input:checked')].map((input) => input.value))
      }
    ])
  );
  mentorRows.innerHTML = selected.map((area, index) => `
    <div class="experience-row" data-area="${area}">
      <div class="experience-area"><span>Stödområde</span><strong>${area}</strong></div>
      <fieldset class="support-confidence">
        <legend>Hur trygg känner du dig i att ge stöd?</legend>
        <p>Utgå från vardagliga situationer inom området, inte från professionell rådgivning eller behandling.</p>
        <div class="confidence-options">
          <label>
            <input type="radio" name="mentor-confidence-${index}" value="Viss trygghet" ${existingProfiles.get(area)?.confidence === "Viss trygghet" ? "checked" : ""}>
            <span><strong>Viss trygghet</strong><small>Jag kan ge stöd i tydliga och avgränsade vardagssituationer.</small></span>
          </label>
          <label>
            <input type="radio" name="mentor-confidence-${index}" value="God trygghet" ${existingProfiles.get(area)?.confidence === "God trygghet" || (!existingProfiles.has(area) && index === 1) ? "checked" : ""}>
            <span><strong>God trygghet</strong><small>Jag känner mig trygg att ge stöd i flera vanliga situationer inom området.</small></span>
          </label>
          <label>
            <input type="radio" name="mentor-confidence-${index}" value="Mycket god trygghet" ${existingProfiles.get(area)?.confidence === "Mycket god trygghet" || (!existingProfiles.has(area) && index !== 1) ? "checked" : ""}>
            <span><strong>Mycket god trygghet</strong><small>Jag känner mig trygg även när vardagssituationen är mer sammansatt, inom mentorskapets gränser.</small></span>
          </label>
        </div>
      </fieldset>
      <fieldset class="experience-bases">
        <legend>Vad bygger du din bedömning på? <span>Kompletterande uppgift</span></legend>
        <label><input type="checkbox" value="Egen erfarenhet eller erfarenhet som närstående" ${existingProfiles.get(area)?.bases.has("Egen erfarenhet eller erfarenhet som närstående") || (!existingProfiles.has(area) && index !== 2) ? "checked" : ""}> Egen erfarenhet eller erfarenhet som närstående</label>
        <label><input type="checkbox" value="Erfarenhet av att ge vardagsnära stöd till andra" ${existingProfiles.get(area)?.bases.has("Erfarenhet av att ge vardagsnära stöd till andra") || (!existingProfiles.has(area) && (index === 1 || index === 2)) ? "checked" : ""}> Erfarenhet av att ge vardagsnära stöd till andra</label>
        <label><input type="checkbox" value="Utbildning eller yrkeserfarenhet" ${existingProfiles.get(area)?.bases.has("Utbildning eller yrkeserfarenhet") ? "checked" : ""}> Utbildning eller yrkeserfarenhet</label>
      </fieldset>
    </div>`).join("");
}

bindLimitedChoices(mentorAreas, 5, mentorAreaCount, mentorAreaLimit, renderMentorExperienceRows);
renderMentorExperienceRows();

for (const candidate of document.querySelectorAll(".candidate-row")) {
  candidate.addEventListener("change", () => {
    for (const row of document.querySelectorAll(".candidate-row")) row.classList.toggle("selected", Boolean(row.querySelector("input:checked")));
    document.querySelector("#assessmentHeading").textContent = candidate.querySelector(".candidate-main strong").textContent;
    document.querySelector("#continueWithMentor").textContent = `Fortsätt med ${candidate.querySelector(".candidate-main strong").textContent}`;
  });
}
