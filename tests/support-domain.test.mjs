import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySupportQuestion,
  containsSensitivePersonalData,
  findSupportKnowledge,
  localSupportResponse
} from "../support-domain.js";

test("classifies errors and development proposals", () => {
  assert.equal(classifySupportQuestion("Jag fastnar och kan inte spara"), "bug_report");
  assert.equal(classifySupportQuestion("Det borde kunna gå att exportera"), "feature_request");
});

test("blocks actual personal identity numbers but allows conceptual questions", () => {
  assert.equal(containsSensitivePersonalData("Mitt personnummer är 19800101-1234"), true);
  assert.equal(containsSensitivePersonalData("Hur registrerar jag personnummer?"), false);
});

test("returns relevant system routes", () => {
  const [createMentor] = findSupportKnowledge("Hur lägger jag till en mentor?", { role: "Samordnare", route: "#/dashboard" });
  assert.equal(createMentor.href, "#/mentor/new");
  assert.match(createMentor.answer, /Registrera mentor/);
  const [match] = findSupportKnowledge("Hur avslutar jag en aktivitet?", { route: "#/case/1" });
  assert.equal(match.href, "#/cases");
  const response = localSupportResponse("Hur matchar jag en förälder med mentor?");
  assert.equal(response.needsHuman, false);
  assert.ok(response.sources.some((source) => source.href === "#/cases/matching"));
  const [publicAnswer] = findSupportKnowledge("Hur söker jag hjälp som förälder?", { role: "Förälder", route: "#/public-home" });
  assert.equal(publicAnswer.href, "#/public-support");
});
