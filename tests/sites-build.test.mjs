import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", String(Date.now()));
const { default: worker } = await import(workerUrl.href);

const context = {
  waitUntil() {},
  passThroughOnException() {}
};

test("serves the application shell", async () => {
  const response = await worker.fetch(new Request("https://example.test/"), {}, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  const html = await response.text();
  assert.match(html, /FöräldraMentorer/);
  assert.match(html, /id="dashboardView"/);
  assert.match(html, /id="caseSummaryBoard"/);
  assert.match(html, /id="decisionQueueButton"/);
  assert.match(html, /id="presentationStepPoints"/);
  assert.match(html, />Nytt ärende</);
  assert.match(html, /id="caseTypeDetailPanel"/);
  assert.match(html, /form="caseTypeAdminForm"/);
  assert.doesNotMatch(html, /id="caseTypeAdminModal"/);
});

test("serves application assets and returns 404 for unknown files", async () => {
  const script = await worker.fetch(new Request("https://example.test/app.js"), {}, context);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /^text\/javascript/);
  assert.equal(script.headers.get("cache-control"), "no-cache");
  const scriptText = await script.text();
  assert.match(scriptText, /CASE_ACTIVITIES_STORE/);
  assert.match(scriptText, /#\/case-types\/\$\{encodeURIComponent\(definition\.id\)\}/);
  assert.match(scriptText, /renderRoutineFlowDiagrams/);

  const domain = await worker.fetch(new Request("https://example.test/case-domain.js"), {}, context);
  assert.equal(domain.status, 200);
  assert.match(await domain.text(), /deriveCaseStatus/);

  const featureLinks = await worker.fetch(new Request("https://example.test/feature-links.js"), {}, context);
  assert.equal(featureLinks.status, 200);
  assert.match(await featureLinks.text(), /dashboard\.work-queue/);

  const illustrations = await worker.fetch(new Request("https://example.test/routine-illustrations.js"), {}, context);
  assert.equal(illustrations.status, 200);
  assert.match(await illustrations.text(), /needs-analysis/);

  const markdownParser = await worker.fetch(new Request("https://example.test/vendor/marked/marked.esm.js"), {}, context);
  assert.equal(markdownParser.status, 200);
  assert.match(markdownParser.headers.get("content-type"), /^text\/javascript/);
  assert.equal(markdownParser.headers.get("cache-control"), "public, max-age=3600");

  const routines = await worker.fetch(new Request("https://example.test/docs/verksamhetsfloden-och-handlaggningsrutiner.md"), {}, context);
  assert.equal(routines.status, 200);
  assert.match(routines.headers.get("content-type"), /^text\/markdown/);
  assert.match(await routines.text(), /Verksamhetsflöden och handläggningsrutiner/);

  const missing = await worker.fetch(new Request("https://example.test/missing.png", {
    headers: { accept: "image/png" }
  }), {}, context);
  assert.equal(missing.status, 404);
});
