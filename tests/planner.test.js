import test from "node:test";
import assert from "node:assert/strict";
import { algorithmicPlan } from "../server/planner.js";

const today = new Date(2026, 10, 5, 10);
const subjects = [
  { name: "Math", short: "MATH", exam: "2026-11-08", confidence: 30, topics: ["Functions", "Graphs"], done: 1 },
  { name: "Physics", exam: "2026-11-14", confidence: 70, topics: ["Light"] },
  { name: "History", exam: "2026-11-22", confidence: 60, topics: ["Maps"] },
  { name: "Chemistry", exam: "2026-11-28", confidence: 50, topics: ["Atoms"] }
];

test("respects the requested planning horizon", () => {
  assert.equal(algorithmicPlan(subjects, 3, 2, today).days.length, 2);
  assert.equal(algorithmicPlan(subjects, 3, 9, today).days.length, 9);
});

test("never overschedules the daily minutes budget", () => {
  for (const hours of [0.5, 1, 1.5, 2, 3]) {
    const plan = algorithmicPlan(subjects, hours, 7, today);
    for (const day of plan.days) {
      const allocated = day.slots.reduce((total, slot) => total + slot.minutes, 0);
      assert.ok(allocated <= hours * 60, `${allocated} exceeds ${hours}h`);
      assert.ok(day.slots.every((slot) => slot.minutes >= 15));
    }
  }
});

test("rotates subjects across the study plan", () => {
  const plan = algorithmicPlan(subjects, 3, 4, today);
  assert.equal(new Set(plan.days.map((day) => day.slots[0].subject)).size, 4);
});

test("advances topic suggestions between days", () => {
  const plan = algorithmicPlan(subjects.slice(0, 1), 1, 2, today);
  assert.deepEqual(plan.days.map((day) => day.slots[0].topic), ["Graphs", "Functions"]);
});

test("formats dates using local calendar days instead of UTC", () => {
  const midnight = new Date(2026, 10, 5, 0, 30);
  assert.equal(algorithmicPlan(subjects, 1, 1, midnight).days[0].date, "2026-11-05");
});

test("handles an empty subjects array safely", () => {
  assert.deepEqual(algorithmicPlan([], 2, 5, today).days, []);
});
