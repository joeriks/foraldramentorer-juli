import test from "node:test";
import assert from "node:assert/strict";
import {
  LEARNING_CONTENT,
  DEFAULT_TENANT_LEARNING_SELECTION,
  DEFAULT_PUBLIC_LEARNING_SELECTION,
  courseProgressPercent,
  prepareLearningMarkdown,
  requiredLearningContentIds,
  scoreKnowledgeTest,
  validateLearningContent
} from "../learning-domain.js";

test("keeps Markdown formatting but escapes raw HTML", () => {
  assert.equal(prepareLearningMarkdown("## Rubrik\n<script>alert(1)</script>"), "## Rubrik\n&lt;script>alert(1)&lt;/script>");
});

test("learning content has valid references and answers", () => {
  assert.deepEqual(validateLearningContent(LEARNING_CONTENT), []);
});

test("scores knowledge tests against the configured pass threshold", () => {
  const knowledgeTest = LEARNING_CONTENT.find((item) => item.type === "test");
  const allCorrect = Object.fromEntries(knowledgeTest.questions.map((question) => [question.id, question.correctOptionId]));
  assert.deepEqual(scoreKnowledgeTest(knowledgeTest, allCorrect), { correct: 3, total: 3, score: 100, passed: true });
  assert.equal(scoreKnowledgeTest(knowledgeTest, { ...allCorrect, "q-role": "a" }).passed, true);
  assert.equal(scoreKnowledgeTest(knowledgeTest, { "q-role": "b" }).passed, false);
});

test("calculates course progress from completed modules", () => {
  const course = LEARNING_CONTENT.find((item) => item.type === "course");
  assert.equal(courseProgressPercent(course, []), 0);
  assert.equal(courseProgressPercent(course, ["role", "reflection"]), 50);
  assert.equal(courseProgressPercent(course, course.modules.map((module) => module.id)), 100);
});

test("includes course dependencies in a municipality selection", () => {
  assert.deepEqual(
    new Set(requiredLearningContentIds(LEARNING_CONTENT, DEFAULT_TENANT_LEARNING_SELECTION)),
    new Set([
      "course-foundation",
      "material-role-and-boundaries",
      "material-contact-and-reporting",
      "test-foundation",
      "course-safe-contact",
      "material-first-meeting",
      "material-difficult-situations",
      "material-child-perspective",
      "test-safe-contact"
    ])
  );
});

test("provides realistic examples of every supported content type", () => {
  assert.ok(LEARNING_CONTENT.filter((item) => item.type === "material").length >= 5);
  assert.ok(LEARNING_CONTENT.filter((item) => item.type === "course").length >= 2);
  assert.ok(LEARNING_CONTENT.filter((item) => item.type === "test").length >= 2);
});

test("defaults public learning to parent-facing reference material only", () => {
  const publicItems = DEFAULT_PUBLIC_LEARNING_SELECTION.map((id) => LEARNING_CONTENT.find((item) => item.id === id));
  assert.ok(publicItems.length >= 3);
  assert.ok(publicItems.every((item) => item?.type === "material"));
  assert.ok(publicItems.every((item) => /förälder|stöd|kontakt/i.test(`${item.title} ${item.summary}`)));
});
