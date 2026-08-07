export const LEARNING_CONTENT = [
  {
    id: "material-role-and-boundaries",
    type: "material",
    version: 1,
    scope: "shared",
    title: "Mentorns roll och gränser",
    summary: "Referensmaterial om uppdraget, sekretess och när en handläggare ska kontaktas.",
    bodyMarkdown: "## Uppdragets ram\n\nMentorn ger vardagsnära stöd inom ramen för det överenskomna uppdraget.\n\nMentorn ska inte fatta beslut åt föräldern eller ta över handläggarens ansvar.\n\n> Oro för säkerhet, barnets situation eller uppdragets genomförande ska rapporteras till ansvarig handläggare utan dröjsmål.",
    status: "published",
    updatedAt: null
  },
  {
    id: "material-contact-and-reporting",
    type: "material",
    version: 1,
    scope: "shared",
    title: "Kontakt och återrapportering",
    summary: "Praktisk vägledning för möten, avvikelser och återrapportering.",
    bodyMarkdown: "## Kontakt med föräldern\n\nKom överens om kontaktväg och tid för nästa avstämning tillsammans med föräldern.\n\n## Återrapportering\n\nRegistrera genomförda möten sakligt och utan fler personuppgifter än vad uppföljningen kräver.\n\nKontakta handläggaren när ett planerat möte inte kan genomföras eller när stödbehovet har förändrats.",
    status: "published",
    updatedAt: null
  },
  {
    id: "material-first-meeting",
    type: "material",
    version: 1,
    scope: "shared",
    title: "Första mötet med föräldern",
    summary: "Checklista för förberedelse, överenskommelser och en trygg start på mentoruppdraget.",
    bodyMarkdown: "## Före mötet\n\n- Läs uppdragets mål och avgränsningar.\n- Kontrollera vem du kontaktar vid frågor eller avvikelser.\n- Bestäm en neutral och tillgänglig mötesplats tillsammans med föräldern.\n\n## Under mötet\n\nPresentera din roll och låt föräldern beskriva vad som är viktigast just nu. Kom överens om kontaktväg, ungefärlig mötesfrekvens och hur återbud ska hanteras.\n\n## Efter mötet\n\nRegistrera att mötet genomförts och de överenskommelser som behövs för nästa steg. Dokumentera inte fler personuppgifter än uppdraget kräver.",
    status: "published",
    updatedAt: null
  },
  {
    id: "material-difficult-situations",
    type: "material",
    version: 1,
    scope: "shared",
    title: "Svåra samtal och avvikelser",
    summary: "Handlingsstöd när kontakten inte fungerar, uppdraget förändras eller oro uppstår.",
    bodyMarkdown: "## Stanna upp och bedöm\n\nLyssna lugnt och skilj mellan det som kan hanteras inom mentoruppdraget och det som behöver lämnas vidare. Lova inte insatser eller förändringar som du inte ansvarar för.\n\n## Kontakta handläggaren när\n\n- föräldern efterfrågar stöd utanför uppdraget,\n- kontakten återkommande uteblir,\n- en konflikt gör att uppdraget inte kan genomföras,\n- du känner oro för säkerhet eller ett barns situation.\n\n> Vid akut fara: kontakta 112. Informera därefter ansvarig handläggare enligt kommunens rutin.\n\n## Dokumentera sakligt\n\nBeskriv vad som inträffat, när det hände, vilka åtgärder du vidtog och vad som behöver följas upp. Undvik antaganden om personers motiv.",
    status: "published",
    updatedAt: null
  },
  {
    id: "material-child-perspective",
    type: "material",
    version: 1,
    scope: "shared",
    title: "Barnperspektiv och trygghet",
    summary: "Grundläggande stöd för att uppmärksamma barnets situation utan att ta över myndighetsansvar.",
    bodyMarkdown: "## Barnets perspektiv i uppdraget\n\nMentorn arbetar med föräldern men behöver vara uppmärksam på hur stödet påverkar barnets vardag. Ställ öppna frågor till föräldern och håll dig till uppdragets syfte.\n\n## Mentorns ansvar\n\nMentorn ska inte utreda barnets situation eller göra egna myndighetsbedömningar. Iakttagelser och oro ska föras vidare till ansvarig handläggare enligt kommunens fastställda rutin.\n\n## Vid oro\n\nAnteckna konkreta iakttagelser och tidpunkt. Skilj tydligt mellan vad du själv har sett eller hört och vad någon annan har berättat.",
    status: "published",
    updatedAt: null
  },
  {
    id: "test-foundation",
    type: "test",
    version: 1,
    scope: "shared",
    title: "Kunskapstest: grunderna i mentoruppdraget",
    summary: "Tre frågor om ansvar, avvikelser och dokumentation.",
    bodyMarkdown: "Besvara samtliga frågor. Efter rättning visas resultatet och en förklaring till varje fråga.",
    passingScore: 67,
    questions: [
      {
        id: "q-role",
        prompt: "Vad ska mentorn göra om stödbehovet förändras tydligt?",
        options: [
          { id: "a", text: "Själv besluta om ett nytt stöd" },
          { id: "b", text: "Kontakta ansvarig handläggare" },
          { id: "c", text: "Avsluta kontakten utan återkoppling" }
        ],
        correctOptionId: "b",
        explanation: "Handläggaren ansvarar för att bedöma förändrade behov och ändra uppdragets ramar."
      },
      {
        id: "q-note",
        prompt: "Hur ska ett genomfört möte dokumenteras?",
        options: [
          { id: "a", text: "Sakligt och med relevanta uppgifter" },
          { id: "b", text: "Med alla personliga detaljer som nämndes" },
          { id: "c", text: "Det behöver inte dokumenteras" }
        ],
        correctOptionId: "a",
        explanation: "Dokumentationen ska vara saklig, relevant och begränsad till uppföljningens behov."
      },
      {
        id: "q-safety",
        prompt: "Vad gäller vid oro för säkerhet eller barnets situation?",
        options: [
          { id: "a", text: "Vänta till nästa ordinarie uppföljning" },
          { id: "b", text: "Diskutera bara med andra mentorer" },
          { id: "c", text: "Kontakta ansvarig handläggare utan dröjsmål" }
        ],
        correctOptionId: "c",
        explanation: "Sådan oro ska alltid föras vidare till ansvarig handläggare skyndsamt."
      }
    ],
    status: "published",
    updatedAt: null
  },
  {
    id: "course-foundation",
    type: "course",
    version: 1,
    scope: "shared",
    title: "Grundkurs för föräldramentorer",
    summary: "Introduktion till rollen, kontakten med föräldern och kommunens uppföljning.",
    estimatedMinutes: 35,
    bodyMarkdown: "Kursen varvar kort referensmaterial med en egen reflektion och ett avslutande kunskapstest.",
    modules: [
      { id: "role", type: "material", contentId: "material-role-and-boundaries", title: "Roll och gränser" },
      { id: "reflection", type: "reflection", title: "Egen reflektion", prompt: "Beskriv kort när du skulle kontakta handläggaren i stället för att själv försöka lösa situationen." },
      { id: "reporting", type: "material", contentId: "material-contact-and-reporting", title: "Kontakt och återrapportering" },
      { id: "test", type: "test", contentId: "test-foundation", title: "Kunskapstest" }
    ],
    status: "published",
    updatedAt: null
  },
  {
    id: "test-safe-contact",
    type: "test",
    version: 1,
    scope: "shared",
    title: "Kunskapstest: trygg kontakt och avvikelser",
    summary: "Fyra frågor om gränsdragning, dokumentation och situationer som ska lämnas vidare.",
    bodyMarkdown: "Testet utgår från materialet om första mötet, svåra situationer och barnperspektiv. Minst 75 procent krävs för godkänt resultat.",
    passingScore: 75,
    questions: [
      {
        id: "q-first-meeting",
        prompt: "Vad bör mentorn och föräldern komma överens om vid det första mötet?",
        options: [
          { id: "a", text: "Kontaktväg, mötesfrekvens och hantering av återbud" },
          { id: "b", text: "Vilka myndighetsbeslut mentorn får fatta" },
          { id: "c", text: "Att handläggaren inte behöver kontaktas igen" }
        ],
        correctOptionId: "a",
        explanation: "Tydliga praktiska överenskommelser ger en trygg start och minskar risken för missförstånd."
      },
      {
        id: "q-boundary",
        prompt: "Föräldern efterfrågar stöd som ligger utanför uppdraget. Vad ska mentorn göra?",
        options: [
          { id: "a", text: "Utöka uppdraget direkt" },
          { id: "b", text: "Kontakta ansvarig handläggare" },
          { id: "c", text: "Ignorera frågan" }
        ],
        correctOptionId: "b",
        explanation: "Det är handläggaren som bedömer behovet och beslutar om uppdragets ramar ska ändras."
      },
      {
        id: "q-observation",
        prompt: "Hur ska en avvikelse dokumenteras?",
        options: [
          { id: "a", text: "Med konkreta iakttagelser, tidpunkt och vidtagna åtgärder" },
          { id: "b", text: "Med antaganden om varför personen agerade som den gjorde" },
          { id: "c", text: "Endast muntligt till en annan mentor" }
        ],
        correctOptionId: "a",
        explanation: "Sakliga och konkreta uppgifter gör att handläggaren kan bedöma nästa steg."
      },
      {
        id: "q-child-perspective",
        prompt: "Vilken roll har mentorn när det uppstår oro för ett barns situation?",
        options: [
          { id: "a", text: "Genomföra en egen utredning" },
          { id: "b", text: "Själv besluta om en insats" },
          { id: "c", text: "Föra konkreta iakttagelser vidare enligt kommunens rutin" }
        ],
        correctOptionId: "c",
        explanation: "Mentorn ska uppmärksamma och rapportera oro men inte ta över myndighetsansvaret."
      }
    ],
    status: "published",
    updatedAt: null
  },
  {
    id: "course-safe-contact",
    type: "course",
    version: 1,
    scope: "shared",
    title: "Trygg kontakt och hantering av avvikelser",
    summary: "Praktisk fördjupning inför möten och situationer som behöver lämnas vidare till handläggaren.",
    estimatedMinutes: 45,
    bodyMarkdown: "Kursen ger ett konkret arbetssätt från första mötet till dokumentation och rapportering av en avvikelse.",
    modules: [
      { id: "first-meeting", type: "material", contentId: "material-first-meeting", title: "Första mötet" },
      { id: "difficult-situations", type: "material", contentId: "material-difficult-situations", title: "Svåra samtal och avvikelser" },
      { id: "child-perspective", type: "material", contentId: "material-child-perspective", title: "Barnperspektiv och trygghet" },
      { id: "reflection", type: "reflection", title: "Egen handlingsplan", prompt: "Beskriv kort hur du skulle agera om en förälder återkommande uteblir från planerade möten." },
      { id: "test", type: "test", contentId: "test-safe-contact", title: "Kunskapstest" }
    ],
    status: "published",
    updatedAt: null
  }
];

export const DEFAULT_TENANT_LEARNING_SELECTION = ["course-foundation", "course-safe-contact"];

export function learningContentById(content, id) {
  return content.find((item) => item.id === id) || null;
}

export function prepareLearningMarkdown(source) {
  return String(source || "").replaceAll("<", "&lt;");
}

export function scoreKnowledgeTest(test, answers = {}) {
  const total = test?.questions?.length || 0;
  const correct = test?.questions?.filter((question) => answers[question.id] === question.correctOptionId).length || 0;
  const score = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, score, passed: total > 0 && score >= Number(test.passingScore || 0) };
}

export function courseProgressPercent(course, completedModuleIds = []) {
  const moduleIds = course?.modules?.map((module) => module.id) || [];
  if (!moduleIds.length) return 0;
  const completed = new Set(completedModuleIds);
  return Math.round((moduleIds.filter((id) => completed.has(id)).length / moduleIds.length) * 100);
}

export function validateLearningContent(content) {
  const ids = new Set(content.map((item) => item.id));
  const errors = [];
  for (const item of content) {
    if (!item.id || !item.title || !item.version || !item.bodyMarkdown || !["material", "course", "test"].includes(item.type)) errors.push(`Ogiltigt innehåll: ${item.id || "utan id"}`);
    if (item.type === "course") {
      for (const module of item.modules || []) {
        if (["material", "test"].includes(module.type) && !ids.has(module.contentId)) errors.push(`${item.id} refererar till ${module.contentId}`);
      }
    }
    if (item.type === "test") {
      for (const question of item.questions || []) {
        if (!question.options?.some((option) => option.id === question.correctOptionId)) errors.push(`${item.id}/${question.id} saknar giltigt rätt svar`);
      }
    }
  }
  return errors;
}

export function requiredLearningContentIds(content, selectedIds = []) {
  const byId = new Map(content.map((item) => [item.id, item]));
  const required = new Set(selectedIds.filter((id) => byId.has(id)));
  const pending = [...required];
  while (pending.length) {
    const item = byId.get(pending.shift());
    if (item?.type !== "course") continue;
    for (const module of item.modules || []) {
      if (!module.contentId || required.has(module.contentId) || !byId.has(module.contentId)) continue;
      required.add(module.contentId);
      pending.push(module.contentId);
    }
  }
  return [...required];
}
