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
});

test("serves application assets and returns 404 for unknown files", async () => {
  const script = await worker.fetch(new Request("https://example.test/app.js"), {}, context);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /^text\/javascript/);
  assert.match(await script.text(), /CASE_ACTIVITIES_STORE/);

  const domain = await worker.fetch(new Request("https://example.test/case-domain.js"), {}, context);
  assert.equal(domain.status, 200);
  assert.match(await domain.text(), /deriveCaseStatus/);

  const markdownParser = await worker.fetch(new Request("https://example.test/vendor/marked/marked.esm.js"), {}, context);
  assert.equal(markdownParser.status, 200);
  assert.match(markdownParser.headers.get("content-type"), /^text\/javascript/);

  const routines = await worker.fetch(new Request("https://example.test/docs/verksamhetsfloden-och-handlaggningsrutiner.md"), {}, context);
  assert.equal(routines.status, 200);
  assert.match(routines.headers.get("content-type"), /^text\/markdown/);
  assert.match(await routines.text(), /Verksamhetsflöden och handläggningsrutiner/);

  const missing = await worker.fetch(new Request("https://example.test/missing.png", {
    headers: { accept: "image/png" }
  }), {}, context);
  assert.equal(missing.status, 404);
});
