import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Brain, CalendarDays, Check, ChevronRight, Clock3, Flame, GraduationCap, Github,
  LayoutDashboard, MessageCircle, Moon, Plus, RefreshCw, Search, Settings,
  Sparkles, Sun, Target, Trash2, Trophy, X, Zap
} from "lucide-react";
import "./styles.css";

const STORAGE = "studybuddy-v2";
const seed = [
  { id: 1, name: "Database Management", short: "DBMS", exam: "2026-09-05", confidence: 55, difficulty: "Hard", topics: ["Normalization", "Transactions", "Indexing", "SQL Joins"], done: [true, true, false, false], tone: "purple" },
  { id: 2, name: "Operating Systems", short: "OS", exam: "2026-09-10", confidence: 72, difficulty: "Medium", topics: ["Scheduling", "Deadlocks", "Memory", "Paging"], done: [true, true, false, false], tone: "green" },
  { id: 3, name: "Computer Networks", short: "CN", exam: "2026-09-15", confidence: 41, difficulty: "Hard", topics: ["TCP/IP", "Routing", "DNS", "HTTP"], done: [true, false, false, false], tone: "orange" }
];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE)) || seed; } catch { return seed; }
}
function save(data) { localStorage.setItem(STORAGE, JSON.stringify(data)); }
function daysUntil(date) {
  const now = new Date();
  const target = new Date(`${date}T23:59:59`);
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

function App() {
  const [subjects, setSubjects] = useState(load);
  const [page, setPage] = useState("Dashboard");
  const [dark, setDark] = useState(() => localStorage.getItem("studybuddy-theme") === "dark");
  const [hours, setHours] = useState(3);
  const [plan, setPlan] = useState(null);
  const [aiStatus, setAiStatus] = useState({ ollama: false, models: [] });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => save(subjects), [subjects]);
  useEffect(() => localStorage.setItem("studybuddy-theme", dark ? "dark" : "light"), [dark]);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setAiStatus).catch(() => {});
  }, []);

  const filtered = subjects.filter(s => `${s.name} ${s.short}`.toLowerCase().includes(search.toLowerCase()));
  const overall = Math.round(subjects.reduce((sum, s) => sum + (s.done.filter(Boolean).length / s.topics.length) * 100, 0) / Math.max(1, subjects.length));
  const weak = subjects.flatMap(s => s.topics.map((topic, i) => ({ subject: s.short, topic, confidence: s.done[i] ? Math.min(100, s.confidence + 25) : Math.max(10, s.confidence - 15) }))).filter(x => x.confidence < 60).sort((a,b) => a.confidence-b.confidence);

  function toggleTopic(subjectId, index) {
    setSubjects(current => current.map(s => s.id === subjectId ? { ...s, done: s.done.map((v,i) => i === index ? !v : v) } : s));
  }
  function addSubject(s) { setSubjects(c => [...c, s]); setModal(null); }
  function deleteSubject(id) { setSubjects(c => c.filter(s => s.id !== id)); }
  async function generatePlan() {
    setPage("Plan");
    setPlan({ loading: true });
    const response = await fetch("/api/plan", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ subjects: subjects.map(s => ({...s, done: s.done.filter(Boolean).length})), hoursPerDay: hours, days: 7 })});
    setPlan(await response.json());
  }

  return <div className={`app ${dark ? "dark" : ""}`}>
    <aside className="sidebar">
      <div className="brand"><div className="logo"><Brain size={19}/></div><div><b>StudyBuddy</b><small>study smarter, panic less</small></div></div>
      <span className="label">WORKSPACE</span>
      {[["Dashboard",LayoutDashboard],["Plan",CalendarDays],["Subjects",Target],["Progress",Trophy],["Weak Topics",Zap]].map(([n,I]) =>
        <button className={`nav ${page===n?"active":""}`} key={n} onClick={()=>setPage(n)}><I size={17}/><span>{n}</span></button>
      )}
      <div className="sidebar-bottom">
        <button className="nav" onClick={()=>setModal({type:"coach"})}><MessageCircle size={17}/><span>AI Coach</span><em>LOCAL</em></button>
        <button className="nav" onClick={() => window.open("https://github.com/harshitethic", "_blank", "noopener,noreferrer")}><Github size={17}/><span>Follow on GitHub</span></button>
        <div className={`ai-badge ${aiStatus.ollama ? "online" : ""}`}><span className="status-dot"/><div><b>{aiStatus.ollama ? "Local AI online" : "Smart mode"}</b><small>{aiStatus.ollama ? (aiStatus.models[0] || "Ollama") : "no API key needed"}</small></div></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><div className="logo"><Brain size={17}/></div><b>StudyBuddy</b></div>
        <div className="top-actions">
          <div className="search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subjects..." /></div>
          <button className="icon-btn" onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button>
          <div className="avatar">HS</div>
        </div>
      </header>

      {page==="Dashboard" && <Dashboard subjects={filtered} overall={overall} hours={hours} setHours={setHours} generatePlan={generatePlan} setModal={setModal} toggleTopic={toggleTopic}/>}
      {page==="Plan" && <Plan plan={plan} generatePlan={generatePlan} setPage={setPage}/>}
      {page==="Subjects" && <Subjects subjects={filtered} onAdd={()=>setModal({type:"add"})} onDelete={deleteSubject}/>}
      {page==="Progress" && <Progress subjects={subjects} overall={overall}/>}
      {page==="Weak Topics" && <WeakTopics weak={weak} setPage={setPage}/>}

      <footer className="site-footer">
        <div className="footer-left">
          <span className="footer-logo">⚡</span>
          <div>
            <b>Built by <a href="https://github.com/harshitethic" target="_blank" rel="noreferrer">@harshitethic</a></b>
            <small>Made for students who procrastinate professionally.</small>
          </div>
        </div>
        <a className="github-follow" href="https://github.com/harshitethic" target="_blank" rel="noreferrer">
          <Github size={15}/> Follow me on GitHub <span>↗</span>
        </a>
      </footer>
    </main>

    {modal?.type==="add" && <AddModal onClose={()=>setModal(null)} onAdd={addSubject}/>}
    {modal?.type==="coach" && <Coach onClose={()=>setModal(null)} subjects={subjects}/>}
  </div>;
}

function Dashboard({subjects, overall, hours, setHours, generatePlan, setModal, toggleTopic}) {
  const next = [...subjects].sort((a,b)=>daysUntil(a.exam)-daysUntil(b.exam))[0];
  return <div className="content">
    <section className="hero"><div><span className="eyebrow"><i/> THURSDAY, AUGUST 27</span><h1>Good morning, Harshit 👋</h1><p>Let's turn academic panic into a vaguely legal study plan.</p></div><div className="doodle">🧠<small>brain.exe<br/>loading...</small></div></section>

    <div className="stats">
      <Stat icon={<Target/>} title="Preparation" value={`${overall}%`} sub="all subjects" tone="purple"/>
      <Stat icon={<CalendarDays/>} title="Next exam" value={next ? `${daysUntil(next.exam)}d` : "—"} sub={next ? `${next.short} • ${next.exam}` : "none"} tone="orange"/>
      <Stat icon={<Flame/>} title="Study streak" value="7 days" sub="best: 12 days" tone="green"/>
      <Stat icon={<Clock3/>} title="Daily target" value={`${hours}h`} sub="change below" tone="yellow"/>
    </div>

    <div className="layout2">
      <section className="card">
        <CardHead title="Stop winging it. Build the plan 🎯" sub="Tell the planner how many hours you can pretend to be productive."/>
        <div className="hours"><div><b>Available study time</b><span>{hours} hours/day</span></div><input type="range" min="1" max="10" value={hours} onChange={e=>setHours(Number(e.target.value))}/></div>
        <button className="primary big" onClick={generatePlan}><Sparkles size={17}/> Generate real study plan <ChevronRight size={15}/></button>
        <div className="hint"><span>💡</span> The planner uses exam date + confidence + unfinished topics. If Ollama is installed, an open model turns this into an actual AI-generated plan.</div>
      </section>

      <section className="card">
        <CardHead title="Exam radar 🚨" sub="What is coming for you"/>
        {subjects.slice(0,4).map(s=><div className="exam" key={s.id}><div className={`subject-dot ${s.tone}`}>{s.short.slice(0,2)}</div><div className="exam-main"><b>{s.name}</b><small>{s.exam} • {s.confidence}% confidence</small></div><strong className={daysUntil(s.exam)<8?"urgent":""}>{daysUntil(s.exam)}d</strong></div>)}
      </section>
    </div>

    <div className="layout2">
      <section className="card">
        <CardHead title="Today's mission (do NOT ignore this)" sub="Check things off. Your future self is watching."/>
        {subjects[0] && subjects[0].topics.map((topic,i)=><button className={`topic ${subjects[0].done[i]?"checked":""}`} key={topic} onClick={()=>toggleTopic(subjects[0].id,i)}><span className="check">{subjects[0].done[i]&&<Check size={12}/>}</span><span><b>{topic}</b><small>{subjects[0].done[i]?"completed":"pending • weak topic"}</small></span></button>)}
      </section>

      <section className="card">
        <CardHead title="Proof you actually studied" sub="No fake productivity points. Just receipts."/>
        {subjects.map(s=>{const value=s.done.filter(Boolean).length/s.topics.length*100;return <div className="progress-row" key={s.id}><div><b>{s.short}</b><small>{s.done.filter(Boolean).length}/{s.topics.length}</small></div><Bar value={value}/><strong>{Math.round(value)}%</strong></div>})}
        <button className="link-btn" onClick={()=>setPage("Progress")}>View detailed progress <ChevronRight size={13}/></button>
      </section>
    </div>

    <section className="cta"><div><Sparkles size={20}/><div><b>Brain.exe has entered the chat.</b><span>No OpenAI bill. No subscription. Your laptop does the thinking.</span></div></div><button onClick={()=>setModal({type:"coach"})}>Open AI Coach</button></section>
  </div>;
}

function Stat({icon,title,value,sub,tone}){return <div className={`stat ${tone}`}><div className="stat-icon">{icon}</div><div><small>{title}</small><b>{value}</b><span>{sub}</span></div></div>}
function CardHead({title,sub,children}){return <div className="card-head"><div><h2>{title}</h2><small>{sub}</small></div>{children}</div>}
function Bar({value}){return <div className="bar"><i style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>}

function Plan({plan,generatePlan,setPage}) {
  return <div className="content">
    <section className="page-title"><div><h1>Your study plan 📅</h1><p>Generated from your subjects, exams, confidence and available time.</p></div><button className="primary" onClick={generatePlan}><RefreshCw size={15}/> Regenerate</button></section>
    {plan?.loading ? <div className="loading"><div>🧠</div><h2>Planning your academic survival...</h2><p>Checking exam dates, weak topics and available hours.</p></div> :
    plan ? <><div className="source-pill">{plan.source==="local-ai" ? "✨ Generated by your local open model" : "⚙️ Generated by built-in smart planner"}{plan.model ? ` • ${plan.model}` : ""}</div><p className="summary">{plan.summary || plan.notice}</p><div className="plan-grid">{(plan.days||[]).map(day=><div className="day" key={day.date}><div className="day-head"><b>{new Date(day.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short"})}</b><span>{day.date}</span></div>{(day.slots||[]).map((slot,i)=><div className="slot" key={i}><span>{slot.time}</span><div><b>{slot.subject} — {slot.topic}</b><small>{slot.minutes} min • {slot.reason}</small></div></div>)}</div>)}</div></> :
    <div className="empty"><div>📚</div><h2>No plan generated yet.</h2><p>Go back to the dashboard and press Generate real study plan.</p><button className="primary" onClick={()=>setPage("Dashboard")}>Back to dashboard</button></div>}
  </div>
}

function Subjects({subjects,onAdd,onDelete}){return <div className="content"><section className="page-title"><div><h1>My subjects 📚</h1><p>Your syllabus is the source of truth.</p></div><button className="primary" onClick={onAdd}><Plus size={15}/> Add subject</button></section><div className="subject-grid">{subjects.map(s=><div className="subject-card" key={s.id}><div className="subject-top"><div className={`subject-dot big ${s.tone}`}>{s.short}</div><button className="delete" onClick={()=>onDelete(s.id)}><Trash2 size={15}/></button></div><h2>{s.name}</h2><small>Exam: <b>{s.exam}</b> • {daysUntil(s.exam)} days</small><div className="chips"><span>{s.difficulty}</span><span>{s.confidence}% confidence</span></div><Bar value={s.done.filter(Boolean).length/s.topics.length*100}/><small>{s.done.filter(Boolean).length}/{s.topics.length} topics complete</small></div>)}</div></div>}

function Progress({subjects,overall}){return <div className="content"><section className="page-title"><div><h1>Progress 📈</h1><p>Actual completion from your topic checklists.</p></div></section><div className="progress-hero"><div className="ring"><span>{overall}%</span></div><div><h2>Overall preparation</h2><p>{overall>=70?"You're in decent shape. Keep revising.":"You're not doomed, but consistency matters now."}</p><div className="mini"><b>7🔥 <small>streak</small></b><b>{subjects.reduce((a,s)=>a+s.done.filter(Boolean).length,0)} <small>topics done</small></b></div></div></div><section className="card"><CardHead title="Subject breakdown" sub="Completed topics / total topics"/>{subjects.map(s=><div className="big-progress" key={s.id}><div><b>{s.name}</b><strong>{Math.round(s.done.filter(Boolean).length/s.topics.length*100)}%</strong></div><Bar value={s.done.filter(Boolean).length/s.topics.length*100}/></div>)}</section></div>}

function WeakTopics({weak,setPage}){return <div className="content"><section className="page-title"><div><h1>Weak topics 🫠</h1><p>These should rise to the top of your plan.</p></div><button className="primary" onClick={()=>setPage("Plan")}><Sparkles size={15}/> Build around weak topics</button></section><section className="card">{weak.length?weak.map((w,i)=><div className="weak-item" key={`${w.subject}-${w.topic}-${i}`}><span className="tag">{w.subject}</span><b>{w.topic}</b><div className="weak-bar"><i style={{width:`${w.confidence}%`}}/></div><strong>{w.confidence}%</strong></div>):<div className="empty">No weak topics yet.</div>}</section></div>}

function AddModal({onClose,onAdd}){const[name,setName]=useState("");const[exam,setExam]=useState("2026-09-20");const[difficulty,setDifficulty]=useState("Medium");const[topics,setTopics]=useState("");function submit(){if(!name.trim()||!topics.trim())return;const short=name.trim().split(/\s+/).map(x=>x[0]).join("").slice(0,3).toUpperCase();onAdd({id:Date.now(),name:name.trim(),short,exam,confidence:50,difficulty,topics:topics.split(",").map(x=>x.trim()).filter(Boolean),done:topics.split(",").map(()=>false),tone:"purple"});}return <Modal title="Add subject" onClose={onClose}><div className="form"><label>Subject name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Computer Networks"/></label><label>Exam date<input type="date" value={exam} onChange={e=>setExam(e.target.value)}/></label><label>Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Topics <small>comma separated</small><textarea value={topics} onChange={e=>setTopics(e.target.value)} placeholder="TCP/IP, Routing, DNS, HTTP"/></label><button className="primary full" disabled={!name.trim()||!topics.trim()} onClick={submit}><Plus size={15}/> Add subject</button></div></Modal>}

function Coach({ onClose, subjects }) {
  const [msg, setMsg] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(text = msg) {
    if (!text.trim()) return;
    setLoading(true);

    const context = {
      subjects: subjects.map((s) => ({
        name: s.name,
        exam: s.exam,
        confidence: s.confidence,
        weakTopics: s.topics.filter((_, i) => !s.done[i])
      }))
    };

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context })
      });
      const data = await response.json();
      setAnswer(data.answer || "No answer returned.");
    } catch {
      setAnswer("I couldn't reach the local coach. The app still works; start Ollama for AI answers.");
    } finally {
      setLoading(false);
      setMsg("");
    }
  }

  return (
    <Modal title="AI Coach ✨" onClose={onClose}>
      <div className="coach">
        <div className="coach-answer">
          <Sparkles size={16} />
          <span>
            {loading
              ? "Thinking..."
              : answer || "Ask me what to study, what to do after missing a day, or how to tackle a weak topic."}
          </span>
        </div>

        <div className="quick">
          <button onClick={() => ask("What should I study tonight?")}>What tonight?</button>
          <button onClick={() => ask("I missed yesterday. Fix my plan.")}>I missed yesterday 💀</button>
          <button onClick={() => ask("How should I study my weakest topic?")}>Weak topic help</button>
        </div>

        <div className="chat-input">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask anything..."
          />
          <button onClick={() => ask()}><ChevronRight size={17} /></button>
        </div>

        <small className="privacy">
          Uses Ollama locally when available. No cloud API key is required.
        </small>
      </div>
    </Modal>
  );
}

function Modal({title,onClose,children}){return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={17}/></button></div>{children}</div></div>}

createRoot(document.getElementById("root")).render(<App/>);