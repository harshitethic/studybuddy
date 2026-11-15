import test from "node:test";
import assert from "node:assert/strict";
import {
  daysUntilExam, countdownLabel, nextUpcomingExam, localDateKey
} from "../src/exam-stats.js";

const today = new Date(2026, 10, 15, 9, 30);

test("today is zero calendar days, tomorrow is one", () => {
  assert.equal(daysUntilExam("2026-11-15", today), 0);
  assert.equal(daysUntilExam("2026-11-16", today), 1);
  assert.equal(countdownLabel("2026-11-15", today), "Today");
});

test("past and missing dates are not advertised as upcoming", () => {
  const subjects = [
    { name: "Old", exam: "2026-09-01" },
    { name: "Unknown", exam: null },
    { name: "Later", exam: "2026-11-20" },
    { name: "Soon", exam: "2026-11-17" }
  ];
  assert.equal(nextUpcomingExam(subjects, today).name, "Soon");
  assert.equal(countdownLabel(subjects[0].exam, today), "Past");
  assert.equal(countdownLabel(subjects[1].exam, today), "No date");
  assert.equal(nextUpcomingExam(subjects.slice(0, 2), today), null);
});

test("invalid calendar dates cannot become an upcoming exam", () => {
  for (const date of ["2026-02-30", "2026-13-02", "", "tomorrow", null]) {
    assert.equal(daysUntilExam(date, today), null);
  }
});

test("defaults to a real local date rather than a hardcoded past date", () => {
  assert.equal(localDateKey(today), "2026-11-15");
  assert.equal(localDateKey(new Date(2026, 0, 2)), "2026-01-02");
});
