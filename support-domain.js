export const SUPPORT_KNOWLEDGE = [
  {
    id: "public-support",
    title: "Sök stöd som förälder",
    roles: ["Förälder"],
    keywords: ["söka hjälp", "sök stöd", "förälder", "kontakt", "intresseanmälan"],
    answer: "Öppna Sök stöd, fyll i kontaktväg och en kort beskrivning av vilket stöd du söker och skicka formuläret. Skriv inte känsliga personuppgifter i den första intresseanmälan.",
    href: "#/public-support"
  },
  {
    id: "mentor-portal",
    title: "Mentorns översikt",
    roles: ["Mentor"],
    keywords: ["mitt uppdrag", "min profil", "mentor", "rapportera", "översikt"],
    answer: "På Min översikt ser du aktuella uppdrag, utbildningar och vad som behöver återrapporteras. Öppna uppdraget för att registrera genomförda kontakter eller kontakta ansvarig handläggare vid avvikelse.",
    href: "#/mentor-home"
  },
  {
    id: "cases",
    title: "Ärenden och aktiviteter",
    keywords: ["ärende", "aktivitet", "avsluta", "resultat", "förfallodatum", "ansvarig", "handling"],
    answer: "Öppna Ärenden och välj ärendet. Under Aktiviteter ser du nästa arbetsmoment. Öppna en aktivitet för fullständig registrering eller använd Avsluta när snabbavslut är tillåtet. Ett nytt ärende skapas aldrig dolt; efter sista aktiviteten visas vilket ställningstagande som återstår.",
    href: "#/cases"
  },
  {
    id: "register-mentor",
    title: "Registrera ny mentor",
    keywords: ["lägga till mentor", "lägga till en mentor", "lägger till mentor", "lägger till en mentor", "lägger jag till en mentor", "ny mentor", "registrera mentor", "skapa mentor", "intresseanmälan mentor"],
    answer: "Gå till Mentorer och välj Registrera mentor. Fyll i grunduppgifterna och välj Spara mentor längst ned i formuläret. Systemet skapar då mentorposten och ett kopplat ärende för godkännande; inget godkännandebeslut fattas automatiskt.",
    href: "#/mentor/new"
  },
  {
    id: "mentors",
    title: "Mentorer",
    keywords: ["mentor", "mentorkort", "godkänn", "grunduppgift", "kontroll", "intervju"],
    answer: "Mentorregistret innehåller personposten. Själva prövningen och uppföljningen hanteras i kopplade ärenden, så historik och ansvar blir spårbara.",
    href: "#/mentors"
  },
  {
    id: "parents",
    title: "Föräldrar och stödbehov",
    keywords: ["förälder", "stöd", "stödbehov", "söka hjälp", "ansökan"],
    answer: "Registrera föräldern och välj därefter om ett stödärende ska skapas. Ett nytt stödbehov får ett eget ärende så att samma förälder kan få olika stöd och matchningar över tid.",
    href: "#/parents"
  },
  {
    id: "matching",
    title: "Matchning",
    keywords: ["matchning", "matcha", "lämplig mentor", "accepterar"],
    answer: "En matchning ska vara kopplad till ett bestämt stödärende. När båda parter accepterar kan den övergå i ett mentoruppdrag; övergången bekräftas av handläggaren.",
    href: "#/cases/matching"
  },
  {
    id: "assignments",
    title: "Mentoruppdrag",
    keywords: ["uppdrag", "möte", "återrapport", "uppföljning", "ersättning"],
    answer: "I mentoruppdraget planeras ramar och uppföljningar. Mentorn återrapporterar genomförda kontakter och handläggaren stämmer av med föräldern innan uppföljning och ersättningsunderlag godkänns.",
    href: "#/cases/mentor-assignment"
  },
  {
    id: "learning",
    title: "Utbildning och kunskapstest",
    keywords: ["utbildning", "kurs", "material", "kunskapstest", "test", "e-learning"],
    answer: "Under Utbildning finns kommunens valda referensmaterial, kurser och kunskapstest. Systemadministrationen styr vilket innehåll som är tillgängligt för mentorer och offentligt.",
    href: "#/learning"
  },
  {
    id: "routines",
    title: "Handläggningsrutiner",
    keywords: ["rutin", "hur gör", "arbetsflöde", "process", "instruktion", "lathund"],
    answer: "Rutindokumentet beskriver normalflöden, avvikelser och vad som ska registreras. Följ länkarna i dokumentet till motsvarande funktion i systemet.",
    href: "#/routines"
  },
  {
    id: "administration",
    title: "Systemadministration",
    keywords: ["administration", "ärendetyp", "aktivitetsmall", "handläggare", "konfiguration"],
    answer: "Systemadministration innehåller handläggare, ärendetyper, aktivitetsmallar, utbildningsinnehåll, rutiner och supportärenden. Ändringar ska göras i respektive post för att samma redigeringsprincip ska gälla överallt.",
    href: "#/administration"
  }
];

const normalize = (value) => String(value || "").toLocaleLowerCase("sv");

export function containsSensitivePersonalData(text) {
  const value = String(text || "");
  return /\b(?:19|20)?\d{6}[-+]?\d{4}\b/.test(value)
    || /\b(?:bankid|belastningsregister)\s*[:=-]\s*[^\s]{4,}/i.test(value);
}

export function classifySupportQuestion(text) {
  const value = normalize(text);
  if (/(personnummer|sekretess|personuppgift|bankid|säkerhet|behörighet)/.test(value)) return "privacy_or_security";
  if (/(felrapport|bugg|bug|fungerar inte|går inte|fastnar|felmeddelande|trasig)/.test(value)) return "bug_report";
  if (/(förslag|önskemål|borde kunna|utveckla|ny funktion|förbättra)/.test(value)) return "feature_request";
  if (/(hur|var|vad händer|kan jag|ska jag|hjälp)/.test(value)) return "how_to";
  return "general";
}

export function supportCategoryLabel(category) {
  return {
    bug_report: "Felrapport",
    feature_request: "Utvecklingsförslag",
    how_to: "Fråga om systemet",
    privacy_or_security: "Integritet eller säkerhet",
    general: "Supportfråga"
  }[category] || "Supportfråga";
}

export function findSupportKnowledge(query, context = {}, limit = 3) {
  const queryValue = normalize(query);
  const compact = (value) => normalize(value).replace(/\b(?:jag|du|man|en|ett|den|det)\b/g, " ").replace(/\s+/g, " ").trim();
  const compactQuery = compact(queryValue);
  const words = new Set(queryValue.split(/[^a-zåäö0-9-]+/).filter((word) => word.length > 2));
  const route = normalize(context.route || context.view);
  return SUPPORT_KNOWLEDGE
    .map((entry) => {
      const haystack = normalize(`${entry.title} ${entry.keywords.join(" ")} ${entry.answer}`);
      let score = entry.keywords.reduce((sum, keyword) => {
        const keywordValue = normalize(keyword);
        if (!queryValue.includes(keywordValue) && !compactQuery.includes(compact(keywordValue))) return sum;
        return sum + (keyword.includes(" ") ? 8 : 4);
      }, 0);
      for (const word of words) if (haystack.includes(word)) score += 1;
      if (route && entry.href.includes(route.replace(/^#\//, ""))) score += 2;
      if (entry.roles?.includes(context.role)) score += 6;
      if (entry.roles && !entry.roles.includes(context.role)) score -= 4;
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function localSupportResponse(question, context = {}) {
  const category = classifySupportQuestion(question);
  const sources = findSupportKnowledge(question, context);
  if (category === "privacy_or_security") {
    return {
      answer: "Lämna inte personnummer, registeruppgifter eller andra känsliga personuppgifter i supporten. Frågan bör tas vidare till en behörig administratör eller dataskyddsansvarig.",
      category,
      confidence: "high",
      needsHuman: true,
      mode: "local",
      sources: sources.slice(0, 1)
    };
  }
  if (category === "bug_report") {
    return {
      answer: "Det låter som ett tekniskt fel. Registrera gärna ett supportärende med vad du försökte göra, vilken vy du var i och vad som hände. Lägg inte in personuppgifter. Supportkön sparar automatiskt aktuell roll och vy.",
      category,
      confidence: "high",
      needsHuman: true,
      mode: "local",
      sources
    };
  }
  if (category === "feature_request") {
    return {
      answer: "Det kan registreras som ett utvecklingsförslag. Beskriv vilket arbetsmoment som ska bli enklare och vilket resultat du förväntar dig; aktuell roll och vy följer med supportärendet.",
      category,
      confidence: "high",
      needsHuman: true,
      mode: "local",
      sources
    };
  }
  if (sources.length) {
    return {
      answer: sources[0].answer,
      category,
      confidence: sources[0].score >= 6 ? "high" : "medium",
      needsHuman: false,
      mode: "local",
      sources
    };
  }
  return {
    answer: "Jag hittar inget tillräckligt säkert svar i systemets lokala stödmaterial. Registrera frågan som ett supportärende så kan en administratör följa upp den.",
    category,
    confidence: "low",
    needsHuman: true,
    mode: "local",
    sources: []
  };
}
