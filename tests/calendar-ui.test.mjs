import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calendarDateKey, calendarMonthDays } from "../calendar-domain.js";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("builds a stable six-week calendar starting on Monday", () => {
  const days = calendarMonthDays(new Date(2026, 7, 1));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(calendarDateKey(days[0]), "2026-07-27");
  assert.equal(calendarDateKey(days.at(-1)), "2026-09-06");
  assert.equal(calendarDateKey("2026-08-20"), "2026-08-20");
});

test("exposes calendar navigation, filters and the responsive agenda", () => {
  assert.match(html, /id="navCalendar"[^>]*href="#\/calendar"/);
  assert.match(html, /id="calendarView"/);
  assert.match(html, /data-calendar-type-filter="meeting"/);
  assert.match(html, /data-calendar-type-filter="activity"/);
  assert.match(html, /data-calendar-type-filter="case"/);
  assert.match(html, /id="calendarOwnerFilter"/);
  assert.match(app, /calendar: renderCalendar/);
  assert.match(app, /caseMeetings\.filter/);
  assert.match(app, /caseActivities\.filter/);
  assert.match(app, /cases\.filter/);
  assert.match(styles, /\.calendar-grid \{/);
  assert.match(styles, /\.calendar-agenda \{/);
  assert.match(styles, /@media \(max-width: 767\.98px\)/);
});

test("calendar entries open the existing source records", () => {
  assert.match(app, /#\/case\/\$\{caseRecord\.id\}\/meetings/);
  assert.match(app, /#\/case\/\$\{caseRecord\.id\}\/activities\/\$\{activity\.id\}/);
  assert.match(app, /#\/case\/\$\{caseRecord\.id\}/);
  assert.match(app, /version: "95"/);
});
