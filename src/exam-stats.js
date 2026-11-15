/** Calendar-day exam countdowns with no invented deadlines or expired 'next exams'. */
export function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function daysUntilExam(exam, today = new Date()) {
  if (typeof exam !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(exam)) return null;
  const [year, month, day] = exam.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  if (target.getFullYear() !== year || target.getMonth() !== month - 1 ||
      target.getDate() !== day) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function countdownLabel(exam, today = new Date()) {
  const days = daysUntilExam(exam, today);
  if (days === null) return "No date";
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  return `${days}d`;
}

export function nextUpcomingExam(subjects, today = new Date()) {
  return [...subjects]
    .filter((s) => {
      const days = daysUntilExam(s.exam, today);
      return days !== null && days >= 0;
    })
    .sort((a, b) => daysUntilExam(a.exam, today) - daysUntilExam(b.exam, today))[0] ?? null;
}
