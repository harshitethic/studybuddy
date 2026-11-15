/** Recover usable study records without crashing React on corrupted localStorage. */
export function restoreSubjects(raw, fallback = []) {
  if (raw == null) return fallback;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!Array.isArray(saved)) return fallback;
  // An intentionally empty subject list must stay empty after a reload.
  if (!saved.length) return [];

  const result = [];
  const seenIds = new Set();
  saved.forEach((subject, index) => {
    if (!subject || typeof subject !== "object" || Array.isArray(subject) ||
        typeof subject.name !== "string" || !subject.name.trim() ||
        !Array.isArray(subject.topics)) return;

    const entries = subject.topics.map((topic, topicIndex) => ({
      topic: typeof topic === "string" ? topic.trim() : "",
      done: Array.isArray(subject.done) && subject.done[topicIndex] === true
    })).filter((item) => item.topic.length > 0);
    if (!entries.length) return;

    const name = subject.name.trim();
    const short = typeof subject.short === "string" && subject.short.trim()
      ? subject.short.trim() : name.split(/\\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
    const id = (typeof subject.id === "number" && Number.isSafeInteger(subject.id)) ||
      (typeof subject.id === "string" && subject.id.length > 0)
      ? subject.id : `recovered-${index}`;
    if (seenIds.has(id)) return;
    seenIds.add(id);
    const rawConfidence = Number(subject.confidence);
    result.push({
      ...subject, id, name, short,
      exam: typeof subject.exam === "string" ? subject.exam : "",
      confidence: subject.confidence == null || subject.confidence === "" ||
        !Number.isFinite(rawConfidence) ? 50 : Math.max(0, Math.min(100, rawConfidence)),
      topics: entries.map(({ topic }) => topic),
      done: entries.map(({ done }) => done),
      difficulty: typeof subject.difficulty === "string" ? subject.difficulty : "Medium",
      tone: typeof subject.tone === "string" ? subject.tone : "purple"
    });
  });
  return result.length ? result : fallback;
}
