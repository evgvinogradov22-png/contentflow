import { useState, useMemo, useEffect, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "";
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

const STAGES = [
  { id: "idea",    label: "Идея",       icon: "💡", color: "#f59e0b" },
  { id: "script",  label: "Сценарий",   icon: "✍️", color: "#8b5cf6" },
  { id: "shot",    label: "Снято",      icon: "🎬", color: "#3b82f6" },
  { id: "edit",    label: "Монтаж",     icon: "🎞️", color: "#ec4899" },
  { id: "publish", label: "Публикация", icon: "🚀", color: "#10b981" },
];

const ROLES = ["Менеджер проекта", "Сценарист", "Оператор", "Монтажёр"];
const PROJECT_COLORS = ["#ef4444","#3b82f6","#ec4899","#10b981","#f59e0b","#8b5cf6","#06b6d4","#f97316"];

const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAY_NAMES = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function encodeDay(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
function decodeDay(n) { const y = Math.floor(n / 10000); const m = Math.floor((n % 10000) / 100) - 1; const d = n % 100; return { y, m, d }; }

const INPUT = { background: "#16161f", border: "1px solid #2d2d44", borderRadius: 8, padding: "10px 13px", color: "#f0eee8", fontSize: 13, fontFamily: "'Syne', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };
const LBL = { fontSize: 10, color: "#4b5563", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" };

function StageBar({ stage, onChange }) {
  const idx = STAGES.findIndex(s => s.id === stage);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {STAGES.map((s, i) => {
        const active = s.id === stage, passed = i < idx;
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

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ telegram: "", role: ROLES[0], password: "", invite_password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const user = await apiFetch(endpoint, { method: "POST", body: form });
      localStorage.setItem("cf_user", JSON.stringify(user));
      onLogin(user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>📅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f0eee8", letterSpacing: "-0.5px" }}>ContentFlow</div>
          <div style={{ fontSize: 11, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>smm production calendar</div>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", background: "#111118", borderRadius: 9, padding: 3, border: "1px solid #1e1e2e", marginBottom: 24 }}>
          {[["login","Войти"],["register","Регистрация"]].map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "8px", borderRadius: 7, cursor: "pointer", fontSize: 13,
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              background: mode === m ? "#1e1e35" : "transparent",
              border: mode === m ? "1px solid #3d3d5c" : "1px solid transparent",
              color: mode === m ? "#f0eee8" : "#4b5563",
            }}>{l}</button>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <div style={LBL}>НИК В ТЕЛЕГРАМ</div>
            <input placeholder="@username" value={form.telegram} onChange={e => setForm(p => ({ ...p, telegram: e.target.value }))} style={INPUT} />
          </div>

          {mode === "register" && (
            <div>
              <div style={LBL}>ДОЛЖНОСТЬ</div>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={INPUT}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          <div>
            <div style={LBL}>ПАРОЛЬ</div>
            <input type="password" placeholder="Ваш пароль" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={INPUT} />
          </div>

          {mode === "register" && (
            <div>
              <div style={LBL}>КОД ПРИГЛАШЕНИЯ</div>
              <input type="password" placeholder="Код от менеджера" value={form.invite_password} onChange={e => setForm(p => ({ ...p, invite_password: e.target.value }))} style={INPUT} />
            </div>
          )}

          {error && <div style={{ background: "#ef444415", border: "1px solid #ef444430", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{
            background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 9,
            padding: "12px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif",
            fontWeight: 800, fontSize: 14, marginTop: 4,
          }}>
            {loading ? "..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#2d2d44", fontFamily: "'JetBrains Mono', monospace" }}>
          код приглашения — у вашего менеджера
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cf_user")); } catch { return null; }
  });

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [projectFilter, setProjectFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [view, setView] = useState("calendar");

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [addingDay, setAddingDay]   = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const emptyTask = useCallback(() => ({
    title: "", description: "", project_id: projects[0]?.id || "", stage: "idea", assignee_id: currentUser?.id || ""
  }), [projects, currentUser]);

  const [newTask, setNewTask]       = useState({ title: "", description: "", project_id: "", stage: "idea", assignee_id: "" });
  const [newProject, setNewProject] = useState({ label: "", color: PROJECT_COLORS[0] });

  const today = encodeDay(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([apiFetch("/api/projects"), apiFetch("/api/tasks"), apiFetch("/api/users")])
      .then(([p, t, u]) => { setProjects(p); setTasks(t); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => { localStorage.removeItem("cf_user"); setCurrentUser(null); };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;
  if (loading) return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 30 }}>📅</div><div style={{ fontSize: 12 }}>загрузка...</div>
    </div>
  );

  const projectOf = (id) => projects.find(p => p.id === id) || { label: "?", color: "#6b7280" };
  const stageOf   = (id) => STAGES.find(s => s.id === id) || STAGES[0];
  const userOf    = (id) => users.find(u => u.id === id);

  const roleColor = (role) => {
    if (role === "Менеджер проекта") return "#f59e0b";
    if (role === "Сценарист")        return "#8b5cf6";
    if (role === "Оператор")         return "#3b82f6";
    if (role === "Монтажёр")         return "#ec4899";
    return "#6b7280";
  };

  const visibleTasks = useMemo(() =>
    tasks.filter(t =>
      (projectFilter === "all" || t.project_id === projectFilter) &&
      (userFilter === "all" || t.assignee_id === userFilter)
    ), [tasks, projectFilter, userFilter]);

  const calendarTasks = useMemo(() => visibleTasks.filter(t => t.day), [visibleTasks]);
  const backlogTasks  = useMemo(() => visibleTasks.filter(t => !t.day), [visibleTasks]);

  const tasksByDay = useMemo(() => {
    const map = {};
    calendarTasks.forEach(t => { (map[t.day] = map[t.day] || []).push(t); });
    return map;
  }, [calendarTasks]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !newTask.project_id) return;
    setSaving(true);
    try {
      const day = addingDay === "backlog" ? null : encodeDay(year, month, addingDay);
      const task = await apiFetch("/api/tasks", { method: "POST", body: { ...newTask, day } });
      setTasks(prev => [...prev, task]);
      setAddingDay(null);
      setNewTask(emptyTask());
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
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
    if (projectFilter === pid) setProjectFilter("all");
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

  return (
    <div style={{ fontFamily: "'Syne', sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "#f0eee8" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "13px 24px", display: "flex", alignItems: "center", gap: 14, background: "#0d0d16" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📅</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.5px" }}>ContentFlow</div>
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>smm production · reels</div>
        </div>
        {saving && <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>💾 сохранение...</div>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Stage legend */}
          <div style={{ display: "flex", gap: 4 }}>
            {STAGES.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 3, background: "#111118", borderRadius: 20, padding: "3px 8px", border: "1px solid #1e1e2e" }}>
                <span style={{ fontSize: 10 }}>{s.icon}</span>
                <span style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
              </div>
            ))}
          </div>
          {/* User badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111118", border: "1px solid #2d2d44", borderRadius: 20, padding: "5px 12px" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor(currentUser.role)}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
              {currentUser.telegram[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>@{currentUser.telegram}</div>
              <div style={{ fontSize: 9, color: roleColor(currentUser.role), fontFamily: "'JetBrains Mono', monospace" }}>{currentUser.role}</div>
            </div>
            <button onClick={handleLogout} title="Выйти" style={{ background: "transparent", border: "none", color: "#3d3d55", cursor: "pointer", fontSize: 14, marginLeft: 4 }}>⎋</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>

        {/* SIDEBAR */}
        <div style={{ width: 210, background: "#0d0d16", borderRight: "1px solid #1a1a2e", padding: "18px 13px", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 3, marginBottom: 16, background: "#111118", borderRadius: 7, padding: 3, border: "1px solid #1e1e2e" }}>
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

          {/* Projects filter */}
          <div style={{ fontSize: 10, color: "#3d3d55", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 7, fontFamily: "'JetBrains Mono', monospace" }}>ПРОЕКТЫ</div>
          <button onClick={() => setProjectFilter("all")} style={{ width: "100%", textAlign: "left", background: projectFilter === "all" ? "#1a1a2e" : "transparent", border: projectFilter === "all" ? "1px solid #3d3d5c" : "1px solid transparent", borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: projectFilter === "all" ? "#f0eee8" : "#4b5563", fontSize: 12, fontFamily: "'Syne', sans-serif", marginBottom: 2 }}>◈ Все проекты</button>
          {projects.map(p => (
            <div key={p.id} style={{ display: "flex", marginBottom: 2 }}>
              <button onClick={() => setProjectFilter(p.id)} style={{ flex: 1, textAlign: "left", background: projectFilter === p.id ? "#1a1a2e" : "transparent", border: projectFilter === p.id ? `1px solid ${p.color}45` : "1px solid transparent", borderRadius: "7px 0 0 7px", padding: "6px 8px 6px 9px", cursor: "pointer", color: projectFilter === p.id ? "#f0eee8" : "#6b7280", fontSize: 12, fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
              </button>
              <button onClick={() => handleDeleteProject(p.id)} style={{ background: projectFilter === p.id ? "#1a1a2e" : "transparent", border: projectFilter === p.id ? `1px solid ${p.color}45` : "1px solid transparent", borderLeft: "none", borderRadius: "0 7px 7px 0", padding: "6px 7px", cursor: "pointer", color: "#2d2d44", fontSize: 11 }} onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#2d2d44"}>✕</button>
            </div>
          ))}
          <button onClick={() => setAddProjectOpen(true)} style={{ width: "100%", background: "transparent", border: "1px dashed #2d2d44", borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: "#3d3d55", fontSize: 11, fontFamily: "'Syne', sans-serif", marginTop: 5, textAlign: "left" }}>+ Добавить проект</button>

          {/* Team filter */}
          <div style={{ fontSize: 10, color: "#3d3d55", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 7, marginTop: 20, fontFamily: "'JetBrains Mono', monospace" }}>КОМАНДА</div>
          <button onClick={() => setUserFilter("all")} style={{ width: "100%", textAlign: "left", background: userFilter === "all" ? "#1a1a2e" : "transparent", border: userFilter === "all" ? "1px solid #3d3d5c" : "1px solid transparent", borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: userFilter === "all" ? "#f0eee8" : "#4b5563", fontSize: 12, fontFamily: "'Syne', sans-serif", marginBottom: 2 }}>👥 Все сотрудники</button>
          {users.map(u => (
            <button key={u.id} onClick={() => setUserFilter(u.id)} style={{
              width: "100%", textAlign: "left", background: userFilter === u.id ? "#1a1a2e" : "transparent",
              border: userFilter === u.id ? `1px solid ${roleColor(u.role)}45` : "1px solid transparent",
              borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: userFilter === u.id ? "#f0eee8" : "#6b7280",
              fontSize: 12, fontFamily: "'Syne', sans-serif", marginBottom: 2,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor(u.role)}88, #7c3aed44)`, border: `1px solid ${roleColor(u.role)}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                {u.telegram[0].toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>@{u.telegram}</div>
                <div style={{ fontSize: 9, color: roleColor(u.role), fontFamily: "'JetBrains Mono', monospace" }}>{u.role}</div>
              </div>
            </button>
          ))}

          {/* Stats */}
          <div style={{ marginTop: 20, fontSize: 10, color: "#3d3d55", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 9, fontFamily: "'JetBrains Mono', monospace" }}>СТАТИСТИКА</div>
          {STAGES.map(s => {
            const cnt = tasks.filter(t => t.stage === s.id && (projectFilter === "all" || t.project_id === projectFilter) && (userFilter === "all" || t.assignee_id === userFilter)).length;
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
              <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", margin: 0 }}>{MONTH_NAMES[month]} <span style={{ color: "#2d2d44" }}>{year}</span></h2>
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
                  <div key={day} onClick={() => { setAddingDay(day); setNewTask({ ...emptyTask() }); }}
                    style={{ minHeight: 105, background: isToday ? "#0f0f1e" : "#111118", border: isToday ? "1px solid #7c3aed" : "1px solid #1e1e2e", borderRadius: 8, padding: "6px 6px 4px", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = isToday ? "#9d6fef" : "#3d3d5c"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = isToday ? "#7c3aed" : "#1e1e2e"}>
                    <div style={{ fontSize: 11, color: isToday ? "#a78bfa" : "#2d2d44", fontWeight: isToday ? 800 : 500, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 3 }}>
                      {day}{isToday && <span style={{ fontSize: 7, background: "#7c3aed", color: "#fff", borderRadius: 3, padding: "1px 3px" }}>сег</span>}
                    </div>
                    {dt.slice(0, 3).map(t => {
                      const st = stageOf(t.stage); const pr = projectOf(t.project_id); const assignee = userOf(t.assignee_id);
                      return (
                        <div key={t.id} onClick={e => { e.stopPropagation(); setDetailTask({ ...t }); }} style={{ borderLeft: `3px solid ${st.color}`, background: "#1a1a2e", borderRadius: "0 4px 4px 0", padding: "3px 5px", marginBottom: 2, fontSize: 11, cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 9 }}>{st.icon}</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 75, color: "#ddd", fontWeight: 500 }}>{t.title}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 9, color: pr.color, fontFamily: "'JetBrains Mono', monospace" }}>{pr.label}</div>
                            {assignee && <div style={{ fontSize: 8, color: roleColor(assignee.role), fontFamily: "'JetBrains Mono', monospace" }}>@{assignee.telegram.slice(0, 5)}</div>}
                          </div>
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
              <button onClick={() => { setAddingDay("backlog"); setNewTask({ ...emptyTask() }); }} style={{ marginLeft: "auto", background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>+ Добавить идею</button>
            </div>
            {backlogTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2d2d44" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💡</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>банк идей пуст</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px,1fr))", gap: 10 }}>
                {backlogTasks.map(t => {
                  const st = stageOf(t.stage); const pr = projectOf(t.project_id); const assignee = userOf(t.assignee_id);
                  return (
                    <div key={t.id} onClick={() => setDetailTask({ ...t })} style={{ background: "#111118", borderLeft: `3px solid ${st.color}`, border: "1px solid #1e1e2e", borderLeftWidth: 3, borderLeftColor: st.color, borderRadius: 10, padding: "14px 15px", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = st.color + "60"; e.currentTarget.style.borderLeftColor = st.color; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2e"; e.currentTarget.style.borderLeftColor = st.color; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{t.title}</div>
                        <span style={{ fontSize: 14, marginLeft: 8 }}>{st.icon}</span>
                      </div>
                      {t.description && <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5, marginBottom: 10 }}>{t.description}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: pr.color + "20", color: pr.color, fontFamily: "'JetBrains Mono', monospace" }}>{pr.label}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: st.color + "15", color: st.color, fontFamily: "'JetBrains Mono', monospace" }}>{st.label}</span>
                        {assignee && <span style={{ marginLeft: "auto", fontSize: 10, background: "#1a1a2e", borderRadius: 20, padding: "2px 8px", color: roleColor(assignee.role), fontFamily: "'JetBrains Mono', monospace" }}>@{assignee.telegram}</span>}
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
            <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 15, padding: 24, width: 460, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 18 }}>
                {addingDay === "backlog" ? "💡 Новая идея" : `🎬 Рилс · ${addingDay} ${MONTH_NAMES[month]} ${year}`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><div style={LBL}>НАЗВАНИЕ</div><input placeholder="Название рилса" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} style={INPUT} /></div>
                <div><div style={LBL}>ОПИСАНИЕ</div><textarea placeholder="Идея, концепция, ключевые моменты..." value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} style={{ ...INPUT, minHeight: 75, resize: "vertical", lineHeight: 1.5 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={LBL}>ПРОЕКТ</div>
                    <select value={newTask.project_id} onChange={e => setNewTask(p => ({ ...p, project_id: e.target.value }))} style={INPUT}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><div style={LBL}>ИСПОЛНИТЕЛЬ</div>
                    <select value={newTask.assignee_id} onChange={e => setNewTask(p => ({ ...p, assignee_id: e.target.value }))} style={INPUT}>
                      <option value="">— не назначен —</option>
                      {users.map(u => <option key={u.id} value={u.id}>@{u.telegram} · {u.role}</option>)}
                    </select></div>
                </div>
                <div><div style={LBL}>ЭТАП</div><StageBar stage={newTask.stage} onChange={s => setNewTask(p => ({ ...p, stage: s }))} /></div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddingDay(null)} style={{ flex: 1, background: "transparent", border: "1px solid #2d2d44", borderRadius: 8, padding: "9px", color: "#4b5563", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: 13 }}>Отмена</button>
                  <button onClick={handleAddTask} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 8, padding: "9px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>
                    {saving ? "..." : addingDay === "backlog" ? "В банк идей" : "Добавить рилс"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {detailTask && (
            <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 15, padding: 24, width: 500, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{detailTask.title}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: projectOf(detailTask.project_id).color + "20", color: projectOf(detailTask.project_id).color, fontFamily: "'JetBrains Mono', monospace" }}>{projectOf(detailTask.project_id).label}</span>
                    {userOf(detailTask.assignee_id) && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: roleColor(userOf(detailTask.assignee_id).role) + "20", color: roleColor(userOf(detailTask.assignee_id).role), fontFamily: "'JetBrains Mono', monospace" }}>
                        @{userOf(detailTask.assignee_id).telegram} · {userOf(detailTask.assignee_id).role}
                      </span>
                    )}
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#1a1a2e", color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
                      {detailTask.day ? (() => { const { y, m, d } = decodeDay(detailTask.day); return `${d} ${MONTH_NAMES[m]} ${y}`; })() : "💡 банк идей"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetailTask(null)} style={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 6, width: 26, height: 26, cursor: "pointer", color: "#6b7280", fontSize: 15, flexShrink: 0 }}>×</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <div><div style={LBL}>НАЗВАНИЕ</div><input value={detailTask.title} onChange={e => updateTask(detailTask.id, { title: e.target.value })} style={INPUT} /></div>
                <div><div style={LBL}>ОПИСАНИЕ</div><textarea value={detailTask.description || ""} onChange={e => updateTask(detailTask.id, { description: e.target.value })} placeholder="Описание, концепция, референсы..." style={{ ...INPUT, minHeight: 90, resize: "vertical", lineHeight: 1.6 }} /></div>
                <div><div style={LBL}>ЭТАП ПРОИЗВОДСТВА</div><StageBar stage={detailTask.stage} onChange={s => updateTask(detailTask.id, { stage: s })} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={LBL}>ПРОЕКТ</div>
                    <select value={detailTask.project_id} onChange={e => updateTask(detailTask.id, { project_id: e.target.value })} style={INPUT}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><div style={LBL}>ИСПОЛНИТЕЛЬ</div>
                    <select value={detailTask.assignee_id || ""} onChange={e => updateTask(detailTask.id, { assignee_id: e.target.value })} style={INPUT}>
                      <option value="">— не назначен —</option>
                      {users.map(u => <option key={u.id} value={u.id}>@{u.telegram} · {u.role}</option>)}
                    </select></div>
                </div>
                {detailTask.day && (
                  <div><div style={LBL}>ДЕЙСТВИЯ</div>
                    <button onClick={() => updateTask(detailTask.id, { day: null })} style={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 7, padding: "7px 14px", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "'Syne', sans-serif" }}>↩ Убрать дату — в банк идей</button>
                  </div>
                )}
                <button onClick={() => deleteTask(detailTask.id)} style={{ background: "transparent", border: "1px solid #ef444430", borderRadius: 8, padding: "8px", color: "#ef4444", cursor: "pointer", fontSize: 12, fontFamily: "'Syne', sans-serif" }}>Удалить рилс</button>
              </div>
            </div>
          )}

          {/* ADD PROJECT */}
          {addProjectOpen && (
            <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 15, padding: 24, width: 340, boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 18 }}>Новый проект</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><div style={LBL}>НАЗВАНИЕ</div><input placeholder="Название клиента / проекта" value={newProject.label} onChange={e => setNewProject(p => ({ ...p, label: e.target.value }))} style={INPUT} /></div>
                <div><div style={LBL}>ЦВЕТ</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {PROJECT_COLORS.map(c => <button key={c} onClick={() => setNewProject(p => ({ ...p, color: c }))} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: "none", outline: newProject.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddProjectOpen(false)} style={{ flex: 1, background: "transparent", border: "1px solid #2d2d44", borderRadius: 8, padding: "9px", color: "#4b5563", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: 13 }}>Отмена</button>
                  <button onClick={handleAddProject} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 8, padding: "9px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>{saving ? "..." : "Создать"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
