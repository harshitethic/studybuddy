import test from "node:test";
import assert from "node:assert/strict";
import { restoreSubjects } from "../src/stored-subjects.js";

const fallback = [{ id: 1, name: "Default", topics: ["Intro"], done: [false] }];

test("malformed JSON and non-array saved state fall back without crashing", () => {
  assert.equal(restoreSubjects("{broken", fallback), fallback);
  assert.equal(restoreSubjects('{"name":"not an array"}', fallback), fallback);
  assert.equal(restoreSubjects('true', fallback), fallback);
  assert.equal(restoreSubjects(null, fallback), fallback);
});

test("an explicitly empty saved list remains empty instead of restoring defaults", () => {
  assert.deepEqual(restoreSubjects("[]", fallback), []);
});

test("repairs missing short names, progress arrays, and confidence", () => {
  const input = [{
    name: "Computer Science", topics: ["OS", "", "Networks"],
    done: [true, true, false], confidence: null, exam: null
  }];
  const [subject] = restoreSubjects(JSON.stringify(input), fallback);
  assert.equal(subject.short, "CS");
  assert.deepEqual(subject.topics, ["OS", "Networks"]);
  assert.deepEqual(subject.done, [true, false]);
  assert.equal(subject.confidence, 50);
  assert.equal(subject.exam, "");
  assert.equal(subject.id, "recovered-0");
});

test("ignores broken items without discarding healthy saved study progress", () => {
  const records = [
    null, { name: "" }, { name: "Invalid", topics: [] },
    { id: 8, name: "Math", short: "M", topics: ["Algebra"], done: [true], confidence: 92 },
    { id: 8, name: "Duplicate", topics: ["Calculus"], done: [false] }
  ];
  const restored = restoreSubjects(JSON.stringify(records), fallback);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].name, "Math");
  assert.deepEqual(restored[0].done, [true]);
  assert.equal(restored[0].confidence, 92);
});

test("a record with no recoverable subjects safely uses the fallback", () => {
  assert.equal(restoreSubjects('[null, {"topics":["bad"]}]', fallback), fallback);
});
