import express from "express";

const app = express();
const PORT = 8787;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

app.use(express.json({ limit: "1mb" }));

async function ollama(path, options = {}) {
  const response = await fetch(`${OLLAMA_URL}${path}`, {
    ...options,
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

function algorithmicPlan(subjects, hoursPerDay = 3) {
  const today = new Date();
  const days = [];
  const sorted = [...subjects].sort((a, b) => {
    const da = new Date(a.exam).getTime() - today.getTime();
    const db = new Date(b.exam).getTime() - today.getTime();
    return (da - db) + ((a.confidence || 50) - (b.confidence || 50)) * 86400000 / 10;
  });

  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const slots = [];
    let remaining = Math.max(1, Number(hoursPerDay) || 3);
    for (let i = 0; i < Math.min(3, sorted.length) && remaining >= 0.5; i++) {
      const s = sorted[i];
      const topics = s.topics || [];
      const topic = topics[(s.done || 0) % Math.max(1, topics.length)] || "Revision";
      const mins = i === 0 ? 50 : 40;
      slots.push({
        time: d === 0 ? `${18 + i}:00` : `${17 + i}:00`,
        subject: s.short || s.name,
        topic,
        minutes: mins,
        type: i === 0 ? "deep-work" : "revision",
        reason: (s.confidence || 50) < 50 ? "weak topic" : "exam proximity"
      });
      remaining -= mins / 60;
    }
    if (slots.length) days.push({ date: date.toISOString().slice(0, 10), slots });
  }
  return {
    summary: "A priority-first plan built from exam proximity, confidence and available time.",
    days
  };
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
  const { subjects = [], hoursPerDay = 3, days = 7, model = DEFAULT_MODEL } = req.body;
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: "Add at least one subject." });
  }

  const fallback = algorithmicPlan(subjects, hoursPerDay);

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
  const { message, context = {}, model = DEFAULT_MODEL } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message is required." });

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
  const { subject, topics = [], count = 5, model = DEFAULT_MODEL } = req.body;
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