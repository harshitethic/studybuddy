import test from "node:test";
import assert from "node:assert/strict";
import { validateQuiz, fallbackQuiz } from "../server/quiz.js";

const item = {
  question: "Which technique supports recall?",
  options: ["Active recall", "Passive review", "Guessing", "Avoid practice"],
  answer: 0,
  explanation: "Answer retrieval helps demonstrate recall."
};

test("accepts valid model quiz and rejects wrong question count", () => {
  const valid = { questions: [item, { ...item, question: "Another question" }] };
  assert.equal(validateQuiz(valid, 2).questions.length, 2);
  assert.throws(() => validateQuiz(valid, 5));
  assert.throws(() => validateQuiz({ questions: [] }, 1));
});

test("rejects invalid answer indices, duplicate options and malformed responses", () => {
  for (const broken of [
    { ...item, answer: 4 },
    { ...item, answer: -1 },
    { ...item, answer: 0.5 },
    { ...item, options: ["same", "Same", "other", "third"] },
    { ...item, options: ["only", "two"] },
    { ...item, explanation: "" },
    { ...item, question: "" }
  ]) {
    assert.throws(() => validateQuiz({ questions: [broken] }, 1));
  }
  for (const broken of [null, [], {}, { questions: null }]) {
    assert.throws(() => validateQuiz(broken, 1));
  }
});

test("offline fallback honors every allowed count without pretending to know subject facts", () => {
  for (const count of [1, 2, 5, 20]) {
    const result = fallbackQuiz("Physics", ["Motion", "Energy"], count);
    assert.equal(result.source, "fallback");
    assert.match(result.notice, /general study-strategy/i);
    assert.equal(result.questions.length, count);
    assert.equal(validateQuiz(result, count).questions.length, count);
  }
});

test("fallback answer positions vary and each question includes the supplied focus", () => {
  const quiz = fallbackQuiz("Physics", ["Momentum"], 10);
  assert.equal(new Set(quiz.questions.map((q) => q.answer)).size, 4);
  assert.ok(quiz.questions.every((q) => q.question.includes("Momentum")));
  assert.equal(new Set(quiz.questions.map((q) => q.question)).size, 10);
});
