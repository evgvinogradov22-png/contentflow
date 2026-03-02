import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "";

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STAGES = [
  { id: "idea",    label: "Идея",       icon: "💡", color: "#f59e0b" },
  { id: "script",  label: "Сценарий",   icon: "✍️", color: "#8b5cf6" },
  { id: "shot",    label: "Снято",      icon: "🎬", color: "#3b82f6" },
  { id: "edit",    label: "Монтаж",     icon: "🎞️", color: "#ec4899" },
  { id: "publish", label: "Публикация", icon: "🚀", color: "#10b981" },
];

const PROJECT_COLORS = ["#ef4444","#3b82f6","#ec4899","#10b981","#f59e0b","#8b5cf6","#06b6d4","#f97316"];

const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAY_NAMES = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function encodeDay(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
function decodeDay(n) { const y = Math.floor(n / 10000); const m = Math.floor((n % 10000) / 100) - 1; const d = n % 100; return { y, m, d }; }

// ─── Styles ───────────────────────────────────────────────────────────────────
const INPUT = {
  background: "#16161f", border: "1px solid #2d2d44",
  borderRadius: 8, padding: "9px 12px", color: "#f0eee8",
  fontSize: 13, fontFamily: "'Syne', sans-serif", outline: "none",
  width: "100%", boxSizing: "border-box",
};
const LBL = {
  fontSize: 10, color: "#4b5563", fontWeight: 700, letterSpacing: "0.08em",
  marginBottom: 5, fontFamily: "'JetBrains Mono', monospace",
};

// ─── Stage bar ────────────────────────────────────────────────────────────────
function StageBar({ stage, onChange }) {
  const idx = STAGES.findIndex(s => s.id === stage);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {STAGES.map((s, i) => {
        const active = s.id === stage;
        const passed = i < idx;
        return (
          <button key={s.id} onClick={() => onChange(s.id)} title={s.label} style={{
            flex: 1, padding: "7px 2px", borderRadius: 8, cursor: "pointer",
            background: active ? s.color + "22" : passed ? "#1a1a2e" : "#111118",
            border: `1px solid ${active ? s.color : passed ? s.color + "40" : "#2d2d44"}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            <span style={{ fontSize: 9, color: active ? s.color : passed ? s.color + "80" : "#3d3d55", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("calendar");

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [addingDay, setAddingDay]     = useState(null);
  const [detailTask, setDetailTask]   = useState(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const emptyTask = useCallback(() => ({
    title: "", description: "", project_id: projects[0]?.id || "", stage: "idea", assignee: ""
  }), [projects]);

  const [newTask, setNewTask]       = useState({ title: "", description: "", project_id: "", stage: "idea", assignee: "" });
  const [newProject, setNewProject] = useState({ label: "", color: PROJECT_COLORS[0] });

  // ── Load data ──
  useEffect(() => {
    Promise.all([apiFetch("/api/projects"), apiFetch("/api/tasks")])
      .then(([p, t]) => { setProjects(p); setTasks(t); })
      .catch(err => console.error("Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const today = encodeDay(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const projectOf = (id) => projects.find(p => p.id === id) || { label: "?", color: "#6b7280" };
  const stageOf   = (id) => STAGES.find(s => s.id === id) || STAGES[0];

  const visibleTasks  = useMemo(() => tasks.filter(t => filter === "all" || t.project_id === filter), [tasks, filter]);
  const calendarTasks = useMemo(() => visibleTasks.filter(t => t.day !== null), [visibleTasks]);
  const backlogTasks  = useMemo(() => visibleTasks.filter(t => !t.day), [visibleTasks]);

  const tasksByDay = useMemo(() => {
    const map = {};
    calendarTasks.forEach(t => { (map[t.day] = map[t.day] || []).push(t); });
    return map;
  }, [calendarTasks]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // ── CRUD ──
  const handleAddTask = async () => {
    if (!newTask.title.trim() || !newTask.project_id) return;
    setSaving(true);
    try {
      const day = addingDay === "backlog" ? null : encodeDay(year, month, addingDay);
      const task = await apiFetch("/api/tasks", { method: "POST", body: { ...newTask, day } });
      setTasks(prev => [...prev, task]);
      setAddingDay(null);
      setNewTask(emptyTask());
    } finally { setSaving(false); }
  };

  const handleAddProject = async () => {
    if (!newProject.label.trim()) return;
    setSaving(true);
    try {
      const proj = await apiFetch("/api/projects", { method: "POST", body: newProject });
      setProjects(prev => [...prev, proj]);
      setNewProject({ label: "", color: PROJECT_COLORS[0] });
      setAddProjectOpen(false);
    } finally { setSaving(false); }
  };

  const handleDeleteProject = async (pid) => {
    await apiFetch(`/api/projects/${pid}`, { method: "DELETE" });
    setProjects(prev => prev.filter(p => p.id !== pid));
    setTasks(prev => prev.filter(t => t.project_id !== pid));
    if (filter === pid) setFilter("all");
  };

  const updateTask = async (id, patch) => {
    const updated = await apiFetch(`/api/tasks/${id}`, { method: "PATCH", body: patch });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    setDetailTask(prev => prev?.id === id ? updated : prev);
  };

  const deleteTask = async (id) => {
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
    setDetailTask(null);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDay(year, month);
  const overlay     = addingDay !== null || detailTask || addProjectOpen;

  // ── Loading screen ──
  if (loading) return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#4b5563" }}>
      <div style={{ fontSize: 32 }}>📅</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>загрузка данных...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Syne', sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "#f0eee8" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "15px 28px", display: "flex", alignItems: "center", gap: 14, background: "#0d0d16" }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📅</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.5px" }}>ContentFlow</div>
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>smm production · reels</div>
        </div>
        {saving && <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginLeft: 8 }}>💾 сохранение...</div>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {STAGES.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#111118", borderRadius: 20, padding: "3px 8px", border: "1px solid #1e1e2e" }}>
              <span style={{ fontSize: 10 }}>{s.icon}</span>
              <span style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 65px)" }}>

        {/* SIDEBAR */}
        <div style={{ width: 205, background: "#0d0d16", borderRight: "1px solid #1a1a2e", padding: "18px 13px", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>

          <div style={{ display: "flex", gap: 3, marginBottom: 18, background: "#111118", borderRadius: 7, padding: 3, border: "1px solid #1e1e2e" }}>
            {[["calendar","📅 Календарь"],["backlog","💡 Идеи"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: "6px 3px", borderRadius: 5, cursor: "pointer", fontSize: 11,
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                background: view === v ? "#1e1e35" : "transparent",
                border: view === v ? "1px solid #3d3d5c" : "1px solid transparent",
                color: view === v ? "#f0eee8" : "#3d3d55",
              }}>{l}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#3d3d55", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>ПРОЕКТЫ</div>

          <button onClick={() => setFilter("all")} style={{
            width: "100%", textAlign: "left", background: filter === "all" ? "#1a1a2e" : "transparent",
            border: filter === "all" ? "1px solid #3d3d5c" : "1px solid transparent",
            borderRadius: 7, padding: "6px 9px", cursor: "pointer",
            color: filter === "all" ? "#f0eee8" : "#4b5563", fontSize: 12, fontFamily: "'Syne', sans-serif", marginBottom: 2,
          }}>◈ Все проекты</button>

          {projects.map(p => (
            <div key={p.id} style={{ display: "flex", marginBottom: 2 }}>
              <button onClick={() => setFilter(p.id)} style={{
                flex: 1, textAlign: "left",
                background: filter === p.id ? "#1a1a2e" : "transparent",
                border: filter === p.id ? `1px solid ${p.color}45` : "1px solid transparent",
                borderRadius: "7px 0 0 7px", padding: "6px 8px 6px 9px", cursor: "pointer",
                color: filter === p.id ? "#f0eee8" : "#6b7280", fontSize: 12, fontFamily: "'Syne', sans-serif",
                display: "flex", alignItems: "center", gap: 7, overflow: "hidden",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
              </button>
              <button onClick={() => handleDeleteProject(p.id)} title="Удалить" style={{
                background: filter === p.id ? "#1a1a2e" : "transparent",
                border: filter === p.id ? `1px solid ${p.color}45` : "1px solid transparent",
                borderLeft: "none", borderRadius: "0 7px 7px 0",
                padding: "6px 7px", cursor: "pointer", color: "#2d2d44", fontSize: 11, transition: "color 0.12s",
              }} onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#2d2d44"}>✕</button>
            </div>
          ))}

          <button onClick={() => setAddProjectOpen(true)} style={{
            width: "100%", background: "transparent", border: "1px dashed #2d2d44",
            borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: "#3d3d55",
            fontSize: 11, fontFamily: "'Syne', sans-serif", marginTop: 5, textAlign: "left",
          }}>+ Добавить проект</button>

          <div style={{ marginTop: 22, fontSize: 10, color: "#3d3d55", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 9, fontFamily: "'JetBrains Mono', monospace" }}>СТАТИСТИКА</div>
          {STAGES.map(s => {
            const cnt = tasks.filter(t => t.stage === s.id && (filter === "all" || t.project_id === filter)).length;
            return (
              <div key={s.id} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: "#6b7280" }}>{s.icon} {s.label}</span>
                  <span style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{cnt}</span>
                </div>
                <div style={{ height: 2, background: "#1e1e2e", borderRadius: 1 }}>
                  <div style={{ height: 2, borderRadius: 1, background: s.color, width: `${Math.min(100, cnt * 15)}%`, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: "auto", paddingTop: 14, fontSize: 10, color: "#2d2d44", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>
            {visibleTasks.length} рилсов · {backlogTasks.length} в банке
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 22px" }}>

          {/* CALENDAR */}
          {view === "calendar" && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button onClick={prevMonth} style={{ background: "#111118", border: "1px solid #2d2d44", color: "#f0eee8", width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>‹</button>
              <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", margin: 0 }}>
                {MONTH_NAMES[month]} <span style={{ color: "#2d2d44" }}>{year}</span>
              </h2>
              <button onClick={nextMonth} style={{ background: "#111118", border: "1px solid #2d2d44", color: "#f0eee8", width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>›</button>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#3d3d55", fontFamily: "'JetBrains Mono', monospace" }}>+ нажмите на день</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
              {DAY_NAMES.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#2d2d44", fontFamily: "'JetBrains Mono', monospace", padding: "2px 0", fontWeight: 700 }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={i} style={{ minHeight: 105 }} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dk = encodeDay(year, month, day);
                const dt = tasksByDay[dk] || [];
                const isToday = dk === today;
                return (
                  <div key={day} onClick={() => { setAddingDay(day); setNewTask({ ...emptyTask(), project_id: projects[0]?.id || "" }); }}
                    style={{ minHeight: 105, background: isToday ? "#0f0f1e" : "#111118", border: isToday ? "1px solid #7c3aed" : "1px solid #1e1e2e", borderRadius: 8, padding: "6px 6px 4px", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = isToday ? "#9d6fef" : "#3d3d5c"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = isToday ? "#7c3aed" : "#1e1e2e"}>
                    <div style={{ fontSize: 11, color: isToday ? "#a78bfa" : "#2d2d44", fontWeight: isToday ? 800 : 500, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 3 }}>
                      {day}{isToday && <span style={{ fontSize: 7, background: "#7c3aed", color: "#fff", borderRadius: 3, padding: "1px 3px" }}>сег</span>}
                    </div>
                    {dt.slice(0, 3).map(t => {
                      const st = stageOf(t.stage); const pr = projectOf(t.project_id);
                      return (
                        <div key={t.id} onClick={e => { e.stopPropagation(); setDetailTask({ ...t }); }} style={{ borderLeft: `3px solid ${st.color}`, background: "#1a1a2e", borderRadius: "0 4px 4px 0", padding: "3px 5px", marginBottom: 2, fontSize: 11, cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 9 }}>{st.icon}</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80, color: "#ddd", fontWeight: 500 }}>{t.title}</span>
                          </div>
                          <div style={{ fontSize: 9, color: pr.color, fontFamily: "'JetBrains Mono', monospace" }}>{pr.label}</div>
                        </div>
                      );
                    })}
                    {dt.length > 3 && <div style={{ fontSize: 9, color: "#2d2d44", fontFamily: "'JetBrains Mono', monospace", paddingLeft: 2 }}>+{dt.length - 3}</div>}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* BACKLOG */}
          {view === "backlog" && (<>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", margin: "0 0 2px" }}>💡 Банк идей</h2>
                <div style={{ fontSize: 11, color: "#3d3d55", fontFamily: "'JetBrains Mono', monospace" }}>рилсы без даты · {backlogTasks.length} шт.</div>
              </div>
              <button onClick={() => { setAddingDay("backlog"); setNewTask({ ...emptyTask(), project_id: projects[0]?.id || "" }); }} style={{
                marginLeft: "auto", background: "linear-gradient(135deg,#7c3aed,#ec4899)",
                border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff",
                cursor: "pointer", fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700,
              }}>+ Добавить идею</button>
            </div>

            {backlogTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2d2d44" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💡</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>банк идей пуст</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px,1fr))", gap: 10 }}>
                {backlogTasks.map(t => {
                  const st = stageOf(t.stage); const pr = projectOf(t.project_id);
                  return (
                    <div key={t.id} onClick={() => setDetailTask({ ...t })} style={{
                      background: "#111118", borderLeft: `3px solid ${st.color}`,
                      border: "1px solid #1e1e2e", borderLeftWidth: 3, borderLeftColor: st.color,
                      borderRadius: 10, padding: "14px 15px", cursor: "pointer",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = st.color + "60"; e.currentTarget.style.borderLeftColor = st.color; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2e"; e.currentTarget.style.borderLeftColor = st.color; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{t.title}</div>
                        <span style={{ fontSize: 14, marginLeft: 8 }}>{st.icon}</span>
                      </div>
                      {t.description && <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5, marginBottom: 10 }}>{t.description}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: pr.color + "20", color: pr.color, fontFamily: "'JetBrains Mono', monospace" }}>{pr.label}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: st.color + "15", color: st.color, fontFamily: "'JetBrains Mono', monospace" }}>{st.label}</span>
                        {t.assignee && <span style={{ marginLeft: "auto", fontSize: 10, background: "#1a1a2e", borderRadius: 20, padding: "2px 8px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>{t.assignee}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* OVERLAY */}
      {overlay && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => { setAddingDay(null); setDetailTask(null); setAddProjectOpen(false); }}>

          {/* ADD TASK */}
          {addingDay !== null && !detailTask && (
            <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 15, padding: 24, width: 450, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 18 }}>
                {addingDay === "backlog" ? "💡 Новая идея" : `🎬 Рилс · ${addingDay} ${MONTH_NAMES[month]} ${year}`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div><div style={LBL}>НАЗВАНИЕ</div>
                  <input placeholder="Название рилса" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} style={INPUT} /></div>
                <div><div style={LBL}>ОПИСАНИЕ</div>
                  <textarea placeholder="Идея, концепция, ключевые моменты..." value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                    style={{ ...INPUT, minHeight: 80, resize: "vertical", lineHeight: 1.5 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={LBL}>ПРОЕКТ</div>
                    <select value={newTask.project_id} onChange={e => setNewTask(p => ({ ...p, project_id: e.target.value }))} style={INPUT}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><div style={LBL}>ИСПОЛНИТЕЛЬ</div>
                    <input placeholder="Инициалы" value={newTask.assignee} onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))} style={INPUT} /></div>
                </div>
                <div><div style={LBL}>ЭТАП</div>
                  <StageBar stage={newTask.stage} onChange={s => setNewTask(p => ({ ...p, stage: s }))} /></div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddingDay(null)} style={{ flex: 1, background: "transparent", border: "1px solid #2d2d44", borderRadius: 8, padding: "9px", color: "#4b5563", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: 13 }}>Отмена</button>
                  <button onClick={handleAddTask} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 8, padding: "9px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>
                    {saving ? "Сохранение..." : addingDay === "backlog" ? "В банк идей" : "Добавить рилс"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {detailTask && (
            <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 15, padding: 24, width: 490, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{detailTask.title}</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: projectOf(detailTask.project_id).color + "20", color: projectOf(detailTask.project_id).color, fontFamily: "'JetBrains Mono', monospace" }}>{projectOf(detailTask.project_id).label}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#1a1a2e", color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
                      {detailTask.day ? (() => { const { y, m, d } = decodeDay(detailTask.day); return `${d} ${MONTH_NAMES[m]} ${y}`; })() : "💡 банк идей"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetailTask(null)} style={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 6, width: 26, height: 26, cursor: "pointer", color: "#6b7280", fontSize: 15, flexShrink: 0 }}>×</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <div><div style={LBL}>НАЗВАНИЕ</div>
                  <input value={detailTask.title} onChange={e => updateTask(detailTask.id, { title: e.target.value })} style={INPUT} /></div>
                <div><div style={LBL}>ОПИСАНИЕ</div>
                  <textarea value={detailTask.description || ""} onChange={e => updateTask(detailTask.id, { description: e.target.value })}
                    placeholder="Описание, концепция, референсы..."
                    style={{ ...INPUT, minHeight: 90, resize: "vertical", lineHeight: 1.6 }} /></div>
                <div><div style={LBL}>ЭТАП ПРОИЗВОДСТВА</div>
                  <StageBar stage={detailTask.stage} onChange={s => updateTask(detailTask.id, { stage: s })} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={LBL}>ПРОЕКТ</div>
                    <select value={detailTask.project_id} onChange={e => updateTask(detailTask.id, { project_id: e.target.value })} style={INPUT}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><div style={LBL}>ИСПОЛНИТЕЛЬ</div>
                    <input value={detailTask.assignee || ""} onChange={e => updateTask(detailTask.id, { assignee: e.target.value })} placeholder="Инициалы" style={INPUT} /></div>
                </div>
                {detailTask.day && (
                  <div>
                    <div style={LBL}>ДЕЙСТВИЯ</div>
                    <button onClick={() => updateTask(detailTask.id, { day: null })} style={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 7, padding: "7px 14px", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "'Syne', sans-serif" }}>
                      ↩ Убрать дату — в банк идей
                    </button>
                  </div>
                )}
                <button onClick={() => deleteTask(detailTask.id)} style={{
                  background: "transparent", border: "1px solid #ef444430", borderRadius: 8, padding: "8px", color: "#ef4444", cursor: "pointer", fontSize: 12, fontFamily: "'Syne', sans-serif",
                }}>Удалить рилс</button>
              </div>
            </div>
          )}

          {/* ADD PROJECT */}
          {addProjectOpen && (
            <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 15, padding: 24, width: 340, boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 18 }}>Новый проект</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><div style={LBL}>НАЗВАНИЕ</div>
                  <input placeholder="Название клиента / проекта" value={newProject.label} onChange={e => setNewProject(p => ({ ...p, label: e.target.value }))} style={INPUT} /></div>
                <div>
                  <div style={LBL}>ЦВЕТ</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {PROJECT_COLORS.map(c => (
                      <button key={c} onClick={() => setNewProject(p => ({ ...p, color: c }))} style={{
                        width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: "none",
                        outline: newProject.color === c ? `2px solid ${c}` : "none", outlineOffset: 2,
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddProjectOpen(false)} style={{ flex: 1, background: "transparent", border: "1px solid #2d2d44", borderRadius: 8, padding: "9px", color: "#4b5563", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: 13 }}>Отмена</button>
                  <button onClick={handleAddProject} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 8, padding: "9px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>
                    {saving ? "..." : "Создать"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
