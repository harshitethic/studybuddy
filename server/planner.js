/** Build a deterministic study plan when Ollama is unavailable. */
export function algorithmicPlan(subjects, hoursPerDay = 3, requestedDays = 7, today = new Date()) {
  const start = new Date(today);
  const sorted = [...subjects].sort((a, b) => {
    const daysUntil = (subject) => {
      const time = new Date(subject.exam).getTime();
      return Number.isFinite(time) ? (time - start.getTime()) / 86400000 : Infinity;
    };
    const confidence = (subject) => Number.isFinite(Number(subject.confidence))
      ? Math.min(100, Math.max(0, Number(subject.confidence))) : 50;
    return (daysUntil(a) - daysUntil(b)) + (confidence(a) - confidence(b)) / 10;
  });
  const horizon = Math.min(30, Math.max(1, Math.trunc(Number(requestedDays)) || 7));
  const budgetMinutes = Math.min(1440, Math.max(15, Math.floor(Number(hoursPerDay) * 60) || 180));
  const days = [];

  for (let d = 0; d < horizon; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    let remaining = budgetMinutes;
    const slots = [];
    const count = Math.min(3, sorted.length);
    for (let i = 0; i < count && remaining >= 15; i++) {
      const subject = sorted[(d + i) % sorted.length];
      if (!subject || typeof subject !== "object") continue;
      const duration = Math.min(i === 0 ? 50 : 40, remaining);
      const topics = Array.isArray(subject.topics) ? subject.topics : [];
      const done = Math.max(0, Math.trunc(Number(subject.done)) || 0);
      const topic = topics.length ? topics[(done + d) % topics.length] : "Revision";
      const confidence = Number(subject.confidence);
      slots.push({
        time: `${d === 0 ? 18 + i : 17 + i}:00`,
        subject: subject.short || subject.name,
        topic,
        minutes: duration,
        type: i === 0 ? "deep-work" : "revision",
        reason: Number.isFinite(confidence) && confidence < 50 ? "weak topic" : "exam proximity"
      });
      remaining -= duration;
    }
    if (slots.length) {
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      days.push({ date: day, slots });
    }
  }
  return {
    summary: "A priority-first plan built from exam proximity, confidence and available time.",
    days
  };
}
