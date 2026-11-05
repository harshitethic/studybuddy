import express from "express";
import { algorithmicPlan } from "./planner.js";

const app = express();
const PORT = 8787;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

app.use(express.json({ limit: "1mb" }));

async function ollama(path, options = {}) {
  const response = await fetch(`${OLLAMA_URL}${path}`, {
    ...options,
    // Never leave plan/quiz/coach waiting indefinitely for an unresponsive local model.
    signal: options.signal ?? AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

function cleanJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("Model did not return JSON.");
  return JSON.parse(candidate.slice(first, last + 1));
}

app.get("/api/health", async (_req, res) => {
  try {
    const data = await ollama("/api/tags");
    const models = (data.models || []).map((m) => m.name);
    res.json({ ok: true, ollama: true, models, defaultModel: DEFAULT_MODEL });
  } catch {
    res.json({ ok: true, ollama: false, models: [], defaultModel: DEFAULT_MODEL });
  }
});

app.post("/api/plan", async (req, res) => {
  const { subjects = [], hoursPerDay = 3, days = 7, model = DEFAULT_MODEL } = req.body ?? {};
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: "Add at least one subject." });
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < 0.25 || hoursPerDay > 24) {
    return res.status(400).json({ error: "hoursPerDay must be between 0.25 and 24." });
  }
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return res.status(400).json({ error: "days must be an integer between 1 and 30." });
  }
  if (subjects.some((subject) => !subject || typeof subject !== "object" ||
    typeof subject.name !== "string" || !subject.name.trim() ||
    (subject.topics != null && (!Array.isArray(subject.topics) ||
      subject.topics.some((topic) => typeof topic !== "string"))))) {
    return res.status(400).json({ error: "Each subject needs a name and optional string topics." });
  }

  const fallback = algorithmicPlan(subjects, hoursPerDay, days);

  try {
    const prompt = `You are an expert college study planner.
Create a realistic ${days}-day study plan.
Do not invent subjects or topics.
Prioritize exams that are sooner, low-confidence subjects, hard subjects, and unfinished topics.
Respect the student's available hours per day.
Include short breaks by leaving gaps between sessions.
Return ONLY valid JSON in this exact shape:
{"summary":"short explanation","days":[{"date":"YYYY-MM-DD","slots":[{"time":"18:00","subject":"DBMS","topic":"Normalization","minutes":50,"type":"deep-work","reason":"exam soon"}]}]}
Student data:
${JSON.stringify({ subjects, hoursPerDay, days })}`;

    const data = await ollama("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: "Return strict JSON only. Never use markdown." },
          { role: "user", content: prompt }
        ]
      })
    });

    const plan = cleanJson(data.message?.content || "");
    return res.json({ ...plan, source: "local-ai", model });
  } catch (error) {
    return res.json({
      ...fallback,
      source: "smart-fallback",
      notice: "Ollama is not available, so the built-in planner generated this schedule."
    });
  }
});

app.post("/api/coach", async (req, res) => {
  const { message, context = {}, model = DEFAULT_MODEL } = req.body ?? {};
  if (typeof message !== "string" || !message.trim() || message.length > 4000) {
    return res.status(400).json({ error: "A message of up to 4000 characters is required." });
  }
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return res.status(400).json({ error: "context must be an object." });
  }

  try {
    const data = await ollama("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content: "You are StudyBuddy, a concise and practical college study coach. Be honest, specific and encouraging. Never pretend to know facts not provided. Keep answers under 180 words."
          },
          {
            role: "user",
            content: `Student context:\n${JSON.stringify(context)}\n\nStudent asks:\n${message}`
          }
        ]
      })
    });
    return res.json({ answer: data.message?.content || "No answer returned.", source: "local-ai", model });
  } catch {
    const q = message.toLowerCase();
    let answer = "Start with the subject that is both closest to its exam and lowest in confidence. Then do one focused 45–50 minute block, a short break, and a recall quiz.";
    if (q.includes("miss") || q.includes("behind")) {
      answer = "Don't cram everything into tonight. Drop the lowest-priority task, move the weakest topic into the next two days, and keep one short revision block. Consistency beats a panic marathon.";
    } else if (q.includes("tonight")) {
      answer = "Pick your nearest exam first. Spend 50 minutes on the weakest topic, take 15 minutes off, then do 40 minutes of active recall. Finish with 10 minutes writing what you still can't explain.";
    }
    return res.json({ answer, source: "local-fallback" });
  }
});

app.post("/api/quiz", async (req, res) => {
  const { subject, topics = [], count = 5, model = DEFAULT_MODEL } = req.body ?? {};
  if (typeof subject !== "string" || !subject.trim() || subject.length > 120) {
    return res.status(400).json({ error: "A subject name of up to 120 characters is required." });
  }
  if (!Array.isArray(topics) || topics.length > 40 ||
    topics.some((topic) => typeof topic !== "string" || topic.length > 120)) {
    return res.status(400).json({ error: "topics must be an array of up to 40 short strings." });
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return res.status(400).json({ error: "count must be an integer between 1 and 20." });
  }
  try {
    const data = await ollama("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: { temperature: 0.3 },
        messages: [{
          role: "user",
          content: `Create ${count} multiple-choice questions for a college student studying ${subject}.
Topics: ${topics.join(", ")}
Return ONLY JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}]}`
        }]
      })
    });
    return res.json({ ...cleanJson(data.message?.content || ""), source: "local-ai" });
  } catch {
    return res.json({
      source: "fallback",
      questions: [
        { question: `Which topic should you prioritize in ${subject}?`, options: ["The weakest topic", "The easiest topic only", "Nothing", "Only rereading notes"], answer: 0, explanation: "Prioritizing weak areas gives the best return." },
        { question: "Which study method usually gives stronger recall?", options: ["Active recall", "Only rereading", "Highlighting everything", "Watching without testing"], answer: 0, explanation: "Retrieving information strengthens recall." }
      ]
    });
  }
});

app.listen(PORT, () => {
  console.log(`StudyBuddy API running on http://localhost:${PORT}`);
  console.log(`Ollama: ${OLLAMA_URL} | model: ${DEFAULT_MODEL}`);
});