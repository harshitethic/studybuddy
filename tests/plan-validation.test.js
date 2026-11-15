import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneratedPlan } from "../server/plan-validation.js";

const today = new Date(2026, 10, 15, 10, 0);
const subjects = [{ name: "Database Management", short: "DBMS", topics: ["Indexes", "Joins"] }];
const valid = {
  summary: "Study indexes and joins.",
  days: [
    { date: "2026-11-15", slots: [
      { time: "18:00", subject: "DBMS", topic: "Indexes", minutes: 50, reason: "exam soon" },
      { time: "19:00", subject: "DBMS", topic: "Joins", minutes: 40, reason: "review" }
    ] },
    { date: "2026-11-16", slots: [
      { time: "17:00", subject: "Database Management", topic: "Revision", minutes: 45, reason: "practice" }
    ] }
  ]
};

test("accepts a complete budget-respecting syllabus-based plan", () => {
  assert.equal(validateGeneratedPlan(valid, subjects, 2, 2, today), valid);
});

test("rejects invented subjects and topics", () => {
  for (const slotChange of [
    { subject: "New Subject" },
    { topic: "Quantum Levitation" }
  ]) {
    const changed = structuredClone(valid);
    Object.assign(changed.days[0].slots[0], slotChange);
    assert.throws(() => validateGeneratedPlan(changed, subjects, 2, 2, today));
  }
});

test("rejects over-budget, overlapping, and non-finite time slots", () => {
  for (const slotChange of [
    { minutes: 181 },
    { minutes: Number.NaN },
    { time: "25:00" },
    { time: "xx:xx" },
    { minutes: 110 }
  ]) {
    const changed = structuredClone(valid);
    Object.assign(changed.days[0].slots[0], slotChange);
    assert.throws(() => validateGeneratedPlan(changed, subjects, 2, 2, today));
  }
  const overlapping = structuredClone(valid);
  overlapping.days[0].slots[1].time = "18:30";
  assert.throws(() => validateGeneratedPlan(overlapping, subjects, 2, 2, today));
});

test("rejects missing, duplicate, and out-of-horizon dates", () => {
  for (const changed of [
    { ...valid, days: valid.days.slice(0, 1) },
    { ...valid, days: [valid.days[0], valid.days[0]] },
    { ...valid, days: [{ ...valid.days[0], date: "2026-11-30" }, valid.days[1]] }
  ]) {
    assert.throws(() => validateGeneratedPlan(changed, subjects, 2, 2, today));
  }
});

test("rejects wrong response shapes before reaching the UI", () => {
  for (const changed of [null, [], {}, { summary: "", days: valid.days }]) {
    assert.throws(() => validateGeneratedPlan(changed, subjects, 2, 2, today));
  }
});
