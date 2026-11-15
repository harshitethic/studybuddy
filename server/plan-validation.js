/** Reject hallucinated or malformed local-model plans before displaying them. */
function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function validClock(value) {
  if (typeof value !== "string" || !/^[0-9]{2}:[0-9]{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function validateGeneratedPlan(plan, subjects, hoursPerDay, requestedDays, today = new Date()) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
      typeof plan.summary !== "string" || !plan.summary.trim() ||
      plan.summary.length > 600 || !Array.isArray(plan.days) ||
      plan.days.length !== requestedDays) {
    throw new Error("Model returned an invalid study plan.");
  }

  const expectedDates = new Set();
  for (let offset = 0; offset < requestedDays; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    expectedDates.add(localDateKey(day));
  }

  const allowedSubjects = new Map();
  for (const subject of subjects) {
    for (const name of [subject.name, subject.short]) {
      if (typeof name === "string" && name.trim()) allowedSubjects.set(name, subject);
    }
  }

  const seen = new Set();
  for (const day of plan.days) {
    if (!day || typeof day !== "object" || Array.isArray(day) ||
        !expectedDates.has(day.date) || seen.has(day.date) ||
        !Array.isArray(day.slots) || day.slots.length < 1 ||
        day.slots.length > 48) {
      throw new Error("Model returned an invalid study-plan day.");
    }
    seen.add(day.date);
    let total = 0;
    let previousEnd = -1;
    for (const slot of day.slots) {
      if (!slot || typeof slot !== "object" || Array.isArray(slot) ||
          typeof slot.subject !== "string" || !allowedSubjects.has(slot.subject) ||
          typeof slot.topic !== "string" || !slot.topic.trim() ||
          typeof slot.reason !== "string" || slot.reason.length > 300 ||
          !Number.isInteger(slot.minutes) || slot.minutes < 15 || slot.minutes > 180) {
        throw new Error("Model returned an invalid study-plan slot.");
      }
      const subject = allowedSubjects.get(slot.subject);
      if (slot.topic !== "Revision" && !subject.topics?.includes(slot.topic)) {
        throw new Error("Model invented a topic outside the student's syllabus.");
      }
      const start = validClock(slot.time);
      if (start === null || start < previousEnd || start + slot.minutes > 1440) {
        throw new Error("Model scheduled overlapping or invalid sessions.");
      }
      previousEnd = start + slot.minutes;
      total += slot.minutes;
    }
    if (total > hoursPerDay * 60 + 0.001) {
      throw new Error("Model plan exceeds the daily study budget.");
    }
  }
  return plan;
}
