export const DEFAULT_GEOGRAPHIC_AREAS = [
  { id: "apotekskogen-hasselgatan", label: "Apoteksskogen/Hasselgatan" },
  { id: "bollstanas", label: "Bollstanäs" },
  { id: "odenslunda-fresta", label: "Odenslunda/Fresta" },
  { id: "runby-ed", label: "Runby/Ed" },
  { id: "smedby", label: "Smedby" },
  { id: "skalby-brunnby-vik", label: "Skälby/Brunnby Vik" },
  { id: "vilunda", label: "Vilunda" }
];

export const LANGUAGE_OPTIONS = [
  ["svenska", "Svenska"],
  ["arabiska", "Arabiska"],
  ["engelska", "Engelska"],
  ["finska", "Finska"],
  ["kurdiska", "Kurdiska"],
  ["persiska-dari", "Persiska/dari"],
  ["polska", "Polska"],
  ["somaliska", "Somaliska"],
  ["spanska", "Spanska"],
  ["bks", "Bosniska/kroatiska/serbiska"],
  ["thailandska", "Thailändska"],
  ["tigrinja", "Tigrinja"],
  ["turkiska", "Turkiska"]
];

export const AVAILABILITY_OPTIONS = [
  ["physical-weekday-day", "Fysiska möten · vardagar 08–17"],
  ["physical-weekday-evening", "Fysiska möten · vardagar 17–19"],
  ["physical-saturday", "Fysiska möten · lördagar 09–15"],
  ["physical-sunday", "Fysiska möten · söndagar 09–15"],
  ["phone-weekday", "Telefon · vardagar 08–19"]
];

export function normalizeSelectionIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))];
}

export function defaultTenantGeographicAreas(tenantId, now = new Date().toISOString()) {
  return DEFAULT_GEOGRAPHIC_AREAS.map((area) => ({
    tenantId,
    ...area,
    active: true,
    createdAt: now,
    createdBy: "system",
    updatedAt: now,
    updatedBy: "system"
  }));
}

export function selectedOptionLabels(ids, options) {
  const labels = new Map(options);
  return normalizeSelectionIds(ids).map((id) => labels.get(id)).filter(Boolean);
}

export function geographicAreaLabels(ids, areas) {
  const labels = new Map((areas || []).map((area) => [area.id, area.label]));
  return normalizeSelectionIds(ids).map((id) => labels.get(id)).filter(Boolean);
}

export function structuredLanguageEntries(ids) {
  const labels = new Map(LANGUAGE_OPTIONS);
  return normalizeSelectionIds(ids).map((languageId) => ({ languageId, label: labels.get(languageId) })).filter((entry) => entry.label);
}

export function selectionsOverlap(left, right) {
  const rightIds = new Set(normalizeSelectionIds(right));
  return normalizeSelectionIds(left).filter((id) => rightIds.has(id));
}

export function slugifyCatalogLabel(label) {
  return String(label || "")
    .trim()
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
