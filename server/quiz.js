/** Strict quiz contracts; local-model responses are untrusted, untyped data. */
export function validateQuiz(result, count) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
      !Array.isArray(result.questions) || result.questions.length !== count) {
    throw new Error("Local model returned the wrong number of quiz questions.");
  }
  for (const item of result.questions) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        typeof item.question !== "string" || !item.question.trim() ||
        item.question.length > 500 || !Array.isArray(item.options) ||
        item.options.length !== 4 ||
        item.options.some((option) =>
          typeof option !== "string" || !option.trim() || option.length > 250
        ) || new Set(item.options.map((option) => option.trim().toLowerCase())).size !== 4 ||
        !Number.isInteger(item.answer) || item.answer < 0 || item.answer >= 4 ||
        typeof item.explanation !== "string" || !item.explanation.trim() ||
        item.explanation.length > 800) {
      throw new Error("Local model returned a malformed quiz question.");
    }
  }
  return { questions: result.questions };
}

// These test study methods, NOT subject facts. Never invent correct answers
// about an unfamiliar syllabus while the user's local model is unavailable.
const strategies = [
  ["Your understanding is weak. What should you do first?",
    "Identify the specific concept you cannot explain",
    ["Ignore the gap", "Mark it completed", "Memorize without checking"],
    "Pinpoint the gap before choosing the next exercise."],
  ["Which approach tests your memory after reading notes?",
    "Close the notes and recall the idea independently",
    ["Only highlight phrases", "Read the same paragraph again", "Copy the page verbatim"],
    "Retrieval practice reveals what you can actually recall."],
  ["You got a practice answer wrong. What is the best next step?",
    "Inspect why the answer was wrong and retry",
    ["Skip without reviewing", "Delete the question", "Assume the topic is impossible"],
    "Diagnosing errors helps prevent the same mistake."],
  ["How can you check retention a few days later?",
    "Try a short spaced recall session",
    ["Never revisit it", "Reread notes continuously today", "Judge from familiarity only"],
    "Spaced retrieval checks knowledge after some forgetting."],
  ["You have several exam topics left. What should guide priority?",
    "Exam proximity and weak areas",
    ["Alphabetical order alone", "Study only favorites", "Skip unfamiliar topics"],
    "Use deadlines and weaknesses to choose the most useful work."],
  ["Which method exposes misconceptions early?",
    "Explain the concept in your own words without notes",
    ["Assume recognition means mastery", "Only watch more videos", "Avoid asking questions"],
    "An independent explanation reveals gaps."],
  ["How should you use a practice test result?",
    "Review incorrect answers and adapt your next session",
    ["Ignore errors entirely", "Repeat answers without understanding", "Stop practicing"],
    "Feedback helps target study time."],
  ["A long session is losing focus. What is a reasonable action?",
    "Take a short break and return to one concrete task",
    ["Continue distracted indefinitely", "Multitask with many feeds", "Abandon the course"],
    "Short breaks and specific tasks protect focus."],
  ["You can recognize an answer but cannot produce it. What helps?",
    "Practice generating an answer from memory",
    ["Only reread examples", "Skip independent practice", "Count recognition as recall"],
    "Producing an answer is stronger evidence than familiarity."],
  ["What is a useful end-of-session check?",
    "Record what you still cannot explain",
    ["Only log the hours spent", "Pretend all tasks were easy", "Avoid reviewing errors"],
    "A short gap list informs the next session."],
  ["What improves understanding when topics are easily confused?",
    "Compare their differences with examples",
    ["Treat them as identical", "Memorize only labels", "Avoid mixed practice"],
    "Comparison highlights distinctions."],
  ["How can you measure readiness for a real exam?",
    "Attempt representative questions under realistic conditions",
    ["Only count video hours", "Rely on confidence alone", "Never time practice"],
    "Realistic practice reveals gaps and timing problems."],
  ["You have limited study time. Which goal is most useful?",
    "Choose one measurable outcome for the session",
    ["Do everything at once", "Avoid specific objectives", "Study unrelated material"],
    "Measurable goals make a session actionable."],
  ["When is it useful to consult an explanation?",
    "After attempting to recall or solve the question",
    ["Before trying every time", "Instead of any practice", "Only after the exam"],
    "Trying first helps you diagnose misunderstanding."],
  ["What makes a revision schedule more reliable?",
    "Return to weak material at spaced intervals",
    ["Review only on the last night", "Never revisit completed topics", "Choose randomly forever"],
    "Spaced review provides repeated retrieval opportunities."],
  ["A complex topic feels overwhelming. Where should you begin?",
    "Break it into smaller testable concepts",
    ["Quit the entire subject", "Try to memorize everything in one pass", "Avoid checking basics"],
    "Small steps help identify prerequisites."],
  ["How should you treat a confident but incorrect answer?",
    "Investigate the misconception and correct it",
    ["Trust confidence alone", "Hide the mistake", "Never try again"],
    "Confidence is not proof of accuracy."],
  ["What is an effective use of worked examples?",
    "Study a method, then solve a similar problem yourself",
    ["Copy without understanding", "Skip all independent attempts", "Memorize only final numbers"],
    "Independent transfer tests whether you learned the method."],
  ["Which data better tracks progress than total hours alone?",
    "Accuracy on fresh practice questions",
    ["The number of tabs open", "How long notes look", "Number of highlighted lines"],
    "Performance demonstrates useful learning."],
  ["Before moving on from a topic, what is a helpful check?",
    "Explain it and answer a fresh question independently",
    ["Assume reading equals mastery", "Avoid all review", "Only look at the answer key"],
    "Independent recall and application are useful checks."]
];

export function fallbackQuiz(subject, topics, count) {
  const focus = topics.length ? topics : [subject];
  const questions = Array.from({ length: count }, (_, i) => {
    const [question, correct, distractors, explanation] = strategies[i];
    const offset = i % 4;
    const options = [...distractors];
    options.splice(offset, 0, correct);
    return {
      question: `${question} (Focus: ${focus[i % focus.length]})`,
      options,
      answer: offset,
      explanation
    };
  });
  return {
    source: "fallback",
    notice: "Local AI unavailable or returned invalid data. These are general study-strategy questions, not subject-specific knowledge questions.",
    questions
  };
}
