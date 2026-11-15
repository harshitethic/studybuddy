import test from "node:test";
import assert from "node:assert/strict";
import { algorithmicPlan } from "../server/planner.js";

const start = new Date(2026, 10, 15, 10, 0, 0);

test("missing exam date does not outrank a real upcoming exam", () => {
  const plan = algorithmicPlan([
    { name: "No exam date", exam: null, confidence: 20 },
    { name: "Exam tomorrow", exam: "2026-11-16", confidence: 80 }
  ], 1, 1, start);

  assert.equal(plan.days[0].slots[0].subject, "Exam tomorrow");
});

test("missing exam dates use confidence ranking rather than input order", () => {
  const plan = algorithmicPlan([
    { name: "High confidence", confidence: 95, exam: null },
    { name: "Low confidence", confidence: 25, exam: null }
  ], 1, 1, start);

  assert.equal(plan.days[0].slots[0].subject, "Low confidence");
  assert.equal(plan.days[0].slots[0].reason, "weak topic");
});

test("null and empty confidence values use neutral priority", () => {
  const plan = algorithmicPlan([
    { name: "Unrated", confidence: null, exam: null },
    { name: "Weak", confidence: 10, exam: null },
    { name: "Blank", confidence: "", exam: null }
  ], 2, 1, start);

  assert.deepEqual(
    plan.days[0].slots.map((slot) => slot.subject),
    ["Weak", "Unrated", "Blank"]
  );
  assert.notEqual(plan.days[0].slots[1].reason, "weak topic");
});

test("existing deadline and confidence priorities still apply", () => {
  const plan = algorithmicPlan([
    { name: "Later", exam: "2026-11-25", confidence: 20 },
    { name: "Soon", exam: "2026-11-16", confidence: 90 }
  ], 1, 1, start);

  assert.equal(plan.days[0].slots[0].subject, "Soon");
});
