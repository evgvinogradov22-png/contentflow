import { useState, useEffect, useCallback } from "react";

const STAGES = [
  { id: "idea",    label: "Идея",       icon: "💡", color: "#f59e0b" },
  { id: "script",  label: "Сценарий",   icon: "✍️", color: "#8b5cf6" },
  { id: "shot",    label: "Снято",      icon: "🎬", color: "#3b82f6" },
  { id: "edit",    label: "Монтаж",     icon: "🎞️", color: "#ec4899" },
  { id: "publish", label: "Публикация", icon: "🚀", color: "#10b981" },
];
const ROLES = ["Менеджер проекта", "Сценарист", "Оператор", "Монтажёр"];
const PROJECT_COLORS = ["#ef4444","#3b82f6","#ec4899","#10b981","#f59e0b","#8b5cf6","#06b6d4","#f97316"];
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function encDay(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
function decDay(n) { return { y: Math.floor(n/10000), m: Math.floor((n%10000)/100)-1, d: n%100 }; }

const roleColor = r => ({ "Менеджер проекта":"#f59e0b", "Сценарист":"#8b5cf6", "Оператор":"#3b82f6", "Монтажёр":"#ec4899" }[r] || "#6b7280");
const stageOf = id => STAGES.find(s => s.id === id) || STAGES[0];

const S = {
  input: { background:"#16161f", border:"1px solid #2d2d44", borderRadius:8, padding:"10px 13px", color:"#f0eee8", fontSize:13, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" },
  lbl: { fontSize:10, color:"#4b5563", fontWeight:700, letterSpacing:"0.08em", marginBottom:5, display:"block", fontFamily:"'JetBrains Mono',monospace" },
};

async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка");
  return data;
}

// ── Stage selector ────────────────────────────────────────────────────────────
function StageBar({ stage, onChange }) {
  const idx = STAGES.findIndex(s => s.id === stage);
  return (
    <div style={{ display:"flex", gap:4 }}>
      {STAGES.map((s, i) => {
        const active = s.id === stage, past = i < idx;
        return (
          <button key={s.id} onClick={() => onChange(s.id)} style={{ flex:1, padding:"7px 2px", borderRadius:8, cursor:"pointer", background: active ? s.color+"22" : past ? "#1a1a2e" : "#111118", border:`1px solid ${active ? s.color : past ? s.color+"40" : "#2d2d44"}`, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:14 }}>{s.icon}</span>
            <span style={{ fontSize:9, color: active ? s.color : past ? s.color+"80" : "#3d3d55", fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function Auth({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [tg, setTg] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [pass, setPass] = useState("");
  const [invite, setInvite] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const body = tab === "login"
        ? { telegram: tg, password: pass }
        : { telegram: tg, role, password: pass, invite_password: invite };
      const user = await api(tab === "login" ? "/api/auth/login" : "/api/auth/register", { method:"POST", body });
      onLogin(user);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", color:"#f0eee8" }}>
      <div style={{ width:360 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:50, height:50, borderRadius:14, background:"linear-gradient(135deg,#7c3aed,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 12px" }}>📅</div>
          <div style={{ fontSize:20, fontWeight:800 }}>ContentFlow</div>
          <div style={{ fontSize:10, color:"#4b5563", fontFamily:"'JetBrains Mono',monospace", marginTop:3 }}>smm production calendar</div>
        </div>

        <div style={{ display:"flex", background:"#111118", borderRadius:8, padding:3, border:"1px solid #1e1e2e", marginBottom:18 }}>
          {[["login","Войти"],["register","Регистрация"]].map(([t,l]) => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ flex:1, padding:"8px", borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700, background: tab===t ? "#1e1e35" : "transparent", border: tab===t ? "1px solid #3d3d5c" : "1px solid transparent", color: tab===t ? "#f0eee8" : "#4b5563" }}>{l}</button>
          ))}
        </div>

        <div style={{ background:"#111118", border:"1px solid #1e1e2e", borderRadius:12, padding:22, display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <span style={S.lbl}>НИК В ТЕЛЕГРАМ</span>
            <input placeholder="@username" value={tg} onChange={e=>setTg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={S.input} />
          </div>
          {tab === "register" && (
            <div>
              <span style={S.lbl}>ДОЛЖНОСТЬ</span>
              <select value={role} onChange={e=>setRole(e.target.value)} style={S.input}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}
          <div>
            <span style={S.lbl}>ПАРОЛЬ</span>
            <input type="password" placeholder="Ваш пароль" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={S.input} />
          </div>
          {tab === "register" && (
            <div>
              <span style={S.lbl}>КОД ПРИГЛАШЕНИЯ</span>
              <input type="password" placeholder="Код от менеджера" value={invite} onChange={e=>setInvite(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={S.input} />
            </div>
          )}
          {err && <div style={{ background:"#ef444415", border:"1px solid #ef444430", borderRadius:7, padding:"8px 11px", fontSize:12, color:"#ef4444", fontFamily:"'JetBrains Mono',monospace" }}>{err}</div>}
          <button onClick={submit} disabled={busy} style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", borderRadius:8, padding:"11px", color:"#fff", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13, marginTop:2 }}>
            {busy ? "..." : tab === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </div>
        <div style={{ textAlign:"center", marginTop:12, fontSize:10, color:"#2d2d44", fontFamily:"'JetBrains Mono',monospace" }}>
          {tab === "register" ? "код приглашения: 1290" : "нет аккаунта? → Регистрация"}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errMsg, setErrMsg] = useState("");

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [view, setView] = useState("calendar");
  const [pf, setPf] = useState("all"); // project filter
  const [uf, setUf] = useState("all"); // user filter

  const [addDay, setAddDay] = useState(null);
  const [detail, setDetail] = useState(null);
  const [addProj, setAddProj] = useState(false);

  const [nt, setNt] = useState({ title:"", description:"", project_id:"", stage:"idea", assignee_id:"" });
  const [np, setNp] = useState({ label:"", color:PROJECT_COLORS[0] });

  const today = encDay(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const load = useCallback(async (u) => {
    setStatus("loading");
    try {
      const [p, t, us] = await Promise.all([api("/api/projects"), api("/api/tasks"), api("/api/users")]);
      setProjects(Array.isArray(p) ? p : []);
      setTasks(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(us) ? us : []);
      setStatus("ready");
    } catch(e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }, []);

  const handleLogin = useCallback((u) => {
    setUser(u);
    load(u);
  }, [load]);

  const handleLogout = () => {
    setUser(null);
    setProjects([]); setTasks([]); setUsers([]);
    setStatus("idle");
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  if (status === "loading") return (
    <div style={{ background:"#0a0a0f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10, color:"#4b5563", fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>
      <div style={{ fontSize:28 }}>📅</div>загрузка данных...
    </div>
  );

  if (status === "error") return (
    <div style={{ background:"#0a0a0f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:"#f0eee8", fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>
      <div style={{ fontSize:28 }}>⚠️</div>
      <div style={{ color:"#ef4444" }}>{errMsg}</div>
      <button onClick={() => load(user)} style={{ background:"#1e1e35", border:"1px solid #3d3d5c", borderRadius:8, padding:"8px 18px", color:"#f0eee8", cursor:"pointer", fontFamily:"inherit" }}>Повторить</button>
      <button onClick={handleLogout} style={{ background:"transparent", border:"none", color:"#4b5563", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>Выйти</button>
    </div>
  );

  if (status === "idle") return (
    <div style={{ background:"#0a0a0f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#4b5563", fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>
      <button onClick={() => load(user)} style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", cursor:"pointer", fontFamily:"inherit" }}>Загрузить</button>
    </div>
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const projOf = id => projects.find(p => p.id === id) || { label:"?", color:"#6b7280" };
  const userOf = id => users.find(u => u.id === id) || null;

  const visible = tasks.filter(t =>
    (pf === "all" || t.project_id === pf) &&
    (uf === "all" || t.assignee_id === uf)
  );
  const calTasks = visible.filter(t => t.day);
  const backlog  = visible.filter(t => !t.day);

  const byDay = {};
  calTasks.forEach(t => { (byDay[t.day] = byDay[t.day] || []).push(t); });

  const prevM = () => month === 0 ? (setMonth(11), setYear(y=>y-1)) : setMonth(m=>m-1);
  const nextM = () => month === 11 ? (setMonth(0), setYear(y=>y+1)) : setMonth(m=>m+1);

  const emptyTask = () => ({ title:"", description:"", project_id: projects[0]?.id || "", stage:"idea", assignee_id: user?.id || "" });

  async function doAddTask() {
    if (!nt.title.trim() || !nt.project_id) return;
    const day = addDay === "backlog" ? null : encDay(year, month, addDay);
    const task = await api("/api/tasks", { method:"POST", body:{ ...nt, day } });
    setTasks(p => [...p, task]);
    setAddDay(null); setNt(emptyTask());
  }

  async function doAddProject() {
    if (!np.label.trim()) return;
    const proj = await api("/api/projects", { method:"POST", body:np });
    setProjects(p => [...p, proj]);
    setNp({ label:"", color:PROJECT_COLORS[0] }); setAddProj(false);
  }

  async function doDelProject(id) {
    await api(`/api/projects/${id}`, { method:"DELETE" });
    setProjects(p => p.filter(x => x.id !== id));
    setTasks(p => p.filter(x => x.project_id !== id));
    if (pf === id) setPf("all");
  }

  async function doUpdate(id, patch) {
    const updated = await api(`/api/tasks/${id}`, { method:"PATCH", body:patch });
    setTasks(p => p.map(t => t.id === id ? updated : t));
    setDetail(prev => prev && prev.id === id ? updated : prev);
  }

  async function doDelete(id) {
    await api(`/api/tasks/${id}`, { method:"DELETE" });
    setTasks(p => p.filter(t => t.id !== id));
    setDetail(null);
  }

  const dim = daysInMonth(year, month);
  const fd  = firstDay(year, month);
  const overlay = addDay !== null || detail || addProj;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Syne',sans-serif", height:"100vh", background:"#0a0a0f", color:"#f0eee8", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* HEADER */}
      <div style={{ borderBottom:"1px solid #1a1a2e", padding:"11px 20px", display:"flex", alignItems:"center", gap:12, background:"#0d0d16", flexShrink:0 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📅</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800 }}>ContentFlow</div>
          <div style={{ fontSize:9, color:"#4b5563", fontFamily:"'JetBrains Mono',monospace" }}>smm production · reels</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", gap:3 }}>
            {STAGES.map(s => (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:3, background:"#111118", borderRadius:20, padding:"2px 7px", border:"1px solid #1e1e2e" }}>
                <span style={{ fontSize:9 }}>{s.icon}</span>
                <span style={{ fontSize:9, color:"#4b5563", fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7, background:"#111118", border:"1px solid #2d2d44", borderRadius:20, padding:"4px 10px" }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:`linear-gradient(135deg,${roleColor(user.role)},#7c3aed)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700 }}>
              {(user.telegram || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700 }}>@{user.telegram}</div>
              <div style={{ fontSize:8, color:roleColor(user.role), fontFamily:"'JetBrains Mono',monospace" }}>{user.role}</div>
            </div>
            <button onClick={handleLogout} title="Выйти" style={{ background:"transparent", border:"none", color:"#3d3d55", cursor:"pointer", fontSize:13, marginLeft:2 }}>⎋</button>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* SIDEBAR */}
        <div style={{ width:195, background:"#0d0d16", borderRight:"1px solid #1a1a2e", padding:"14px 11px", flexShrink:0, display:"flex", flexDirection:"column", overflowY:"auto" }}>

          <div style={{ display:"flex", gap:3, marginBottom:14, background:"#111118", borderRadius:7, padding:3, border:"1px solid #1e1e2e" }}>
            {[["calendar","📅 Календарь"],["backlog","💡 Идеи"]].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{ flex:1, padding:"5px 3px", borderRadius:5, cursor:"pointer", fontSize:10, fontFamily:"'Syne',sans-serif", fontWeight:600, background: view===v ? "#1e1e35":"transparent", border: view===v ? "1px solid #3d3d5c":"1px solid transparent", color: view===v ? "#f0eee8":"#3d3d55" }}>{l}</button>
            ))}
          </div>

          <div style={{ fontSize:9, color:"#3d3d55", fontWeight:700, letterSpacing:"0.1em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>ПРОЕКТЫ</div>
          <button onClick={() => setPf("all")} style={{ width:"100%", textAlign:"left", background: pf==="all" ? "#1a1a2e":"transparent", border: pf==="all" ? "1px solid #3d3d5c":"1px solid transparent", borderRadius:6, padding:"5px 8px", cursor:"pointer", color: pf==="all" ? "#f0eee8":"#4b5563", fontSize:11, fontFamily:"'Syne',sans-serif", marginBottom:2 }}>◈ Все проекты</button>
          {projects.map(p => (
            <div key={p.id} style={{ display:"flex", marginBottom:2 }}>
              <button onClick={() => setPf(p.id)} style={{ flex:1, textAlign:"left", background: pf===p.id ? "#1a1a2e":"transparent", border: pf===p.id ? `1px solid ${p.color}45`:"1px solid transparent", borderRadius:"6px 0 0 6px", padding:"5px 7px 5px 8px", cursor:"pointer", color: pf===p.id ? "#f0eee8":"#6b7280", fontSize:11, fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", gap:6, overflow:"hidden" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:p.color, flexShrink:0 }} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.label}</span>
              </button>
              <button onClick={() => doDelProject(p.id)} style={{ background: pf===p.id ? "#1a1a2e":"transparent", border: pf===p.id ? `1px solid ${p.color}45`:"1px solid transparent", borderLeft:"none", borderRadius:"0 6px 6px 0", padding:"5px 6px", cursor:"pointer", color:"#2d2d44", fontSize:10 }} onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#2d2d44"}>✕</button>
            </div>
          ))}
          <button onClick={() => setAddProj(true)} style={{ width:"100%", background:"transparent", border:"1px dashed #2d2d44", borderRadius:6, padding:"5px 8px", cursor:"pointer", color:"#3d3d55", fontSize:10, fontFamily:"'Syne',sans-serif", marginTop:4, textAlign:"left" }}>+ Добавить проект</button>

          <div style={{ fontSize:9, color:"#3d3d55", fontWeight:700, letterSpacing:"0.1em", marginBottom:6, marginTop:16, fontFamily:"'JetBrains Mono',monospace" }}>КОМАНДА</div>
          <button onClick={() => setUf("all")} style={{ width:"100%", textAlign:"left", background: uf==="all" ? "#1a1a2e":"transparent", border: uf==="all" ? "1px solid #3d3d5c":"1px solid transparent", borderRadius:6, padding:"5px 8px", cursor:"pointer", color: uf==="all" ? "#f0eee8":"#4b5563", fontSize:11, fontFamily:"'Syne',sans-serif", marginBottom:2 }}>👥 Все сотрудники</button>
          {users.map(u => (
            <button key={u.id} onClick={() => setUf(u.id)} style={{ width:"100%", textAlign:"left", background: uf===u.id ? "#1a1a2e":"transparent", border: uf===u.id ? `1px solid ${roleColor(u.role)}45`:"1px solid transparent", borderRadius:6, padding:"5px 8px", cursor:"pointer", color: uf===u.id ? "#f0eee8":"#6b7280", fontSize:11, fontFamily:"'Syne',sans-serif", marginBottom:2, display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:`linear-gradient(135deg,${roleColor(u.role)}88,#7c3aed44)`, border:`1px solid ${roleColor(u.role)}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, flexShrink:0 }}>{(u.telegram||"?")[0].toUpperCase()}</div>
              <div style={{ overflow:"hidden" }}>
                <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontSize:10 }}>@{u.telegram}</div>
                <div style={{ fontSize:8, color:roleColor(u.role), fontFamily:"'JetBrains Mono',monospace" }}>{u.role}</div>
              </div>
            </button>
          ))}

          <div style={{ marginTop:16, fontSize:9, color:"#3d3d55", fontWeight:700, letterSpacing:"0.1em", marginBottom:7, fontFamily:"'JetBrains Mono',monospace" }}>СТАТИСТИКА</div>
          {STAGES.map(s => {
            const cnt = tasks.filter(t => t.stage===s.id && (pf==="all"||t.project_id===pf) && (uf==="all"||t.assignee_id===uf)).length;
            return (
              <div key={s.id} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:2 }}>
                  <span style={{ color:"#6b7280" }}>{s.icon} {s.label}</span>
                  <span style={{ color:s.color, fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{cnt}</span>
                </div>
                <div style={{ height:2, background:"#1e1e2e", borderRadius:1 }}>
                  <div style={{ height:2, borderRadius:1, background:s.color, width:`${Math.min(100,cnt*15)}%` }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:"auto", paddingTop:12, fontSize:9, color:"#2d2d44", fontFamily:"'JetBrains Mono',monospace", textAlign:"center" }}>
            {visible.length} рилсов · {backlog.length} в банке
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>

          {view === "calendar" && (<>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <button onClick={prevM} style={{ background:"#111118", border:"1px solid #2d2d44", color:"#f0eee8", width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:13 }}>‹</button>
              <h2 style={{ fontSize:17, fontWeight:800, margin:0 }}>{MONTHS[month]} <span style={{ color:"#2d2d44" }}>{year}</span></h2>
              <button onClick={nextM} style={{ background:"#111118", border:"1px solid #2d2d44", color:"#f0eee8", width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:13 }}>›</button>
              <span style={{ marginLeft:"auto", fontSize:9, color:"#3d3d55", fontFamily:"'JetBrains Mono',monospace" }}>нажмите на день →</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:9, color:"#2d2d44", fontFamily:"'JetBrains Mono',monospace", padding:"2px 0", fontWeight:700 }}>{d}</div>)}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
              {Array.from({length:fd}).map((_,i) => <div key={i} style={{ minHeight:90 }} />)}
              {Array.from({length:dim},(_,i)=>i+1).map(day => {
                const dk = encDay(year,month,day);
                const dt = byDay[dk] || [];
                const isTd = dk === today;
                return (
                  <div key={day} onClick={() => { setAddDay(day); setNt(emptyTask()); }}
                    style={{ minHeight:90, background: isTd?"#0f0f1e":"#111118", border: isTd?"1px solid #7c3aed":"1px solid #1e1e2e", borderRadius:7, padding:"5px 5px 4px", cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=isTd?"#9d6fef":"#3d3d5c"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=isTd?"#7c3aed":"#1e1e2e"}>
                    <div style={{ fontSize:10, color:isTd?"#a78bfa":"#2d2d44", fontWeight:isTd?800:500, marginBottom:3, fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:2 }}>
                      {day}{isTd&&<span style={{ fontSize:6, background:"#7c3aed", color:"#fff", borderRadius:3, padding:"1px 3px" }}>сег</span>}
                    </div>
                    {dt.slice(0,3).map(t => {
                      const st=stageOf(t.stage), pr=projOf(t.project_id), asgn=userOf(t.assignee_id);
                      return (
                        <div key={t.id} onClick={e=>{e.stopPropagation();setDetail({...t});}} style={{ borderLeft:`2px solid ${st.color}`, background:"#1a1a2e", borderRadius:"0 3px 3px 0", padding:"2px 4px", marginBottom:2, cursor:"pointer" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                            <span style={{ fontSize:8 }}>{st.icon}</span>
                            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:65, color:"#ddd", fontWeight:500, fontSize:10 }}>{t.title}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <div style={{ fontSize:8, color:pr.color, fontFamily:"'JetBrains Mono',monospace" }}>{pr.label}</div>
                            {asgn && <div style={{ fontSize:7, color:roleColor(asgn.role), fontFamily:"'JetBrains Mono',monospace" }}>@{asgn.telegram.slice(0,5)}</div>}
                          </div>
                        </div>
                      );
                    })}
                    {dt.length>3&&<div style={{ fontSize:8, color:"#2d2d44", fontFamily:"'JetBrains Mono',monospace" }}>+{dt.length-3}</div>}
                  </div>
                );
              })}
            </div>
          </>)}

          {view === "backlog" && (<>
            <div style={{ display:"flex", alignItems:"center", marginBottom:18 }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:800, margin:"0 0 2px" }}>💡 Банк идей</h2>
                <div style={{ fontSize:10, color:"#3d3d55", fontFamily:"'JetBrains Mono',monospace" }}>без даты · {backlog.length} шт.</div>
              </div>
              <button onClick={() => { setAddDay("backlog"); setNt(emptyTask()); }} style={{ marginLeft:"auto", background:"linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", borderRadius:8, padding:"7px 14px", color:"#fff", cursor:"pointer", fontSize:11, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>+ Идея</button>
            </div>
            {backlog.length === 0 ? (
              <div style={{ textAlign:"center", padding:"50px 0", color:"#2d2d44" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💡</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>банк пуст</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:10 }}>
                {backlog.map(t => {
                  const st=stageOf(t.stage), pr=projOf(t.project_id), asgn=userOf(t.assignee_id);
                  return (
                    <div key={t.id} onClick={()=>setDetail({...t})} style={{ background:"#111118", borderLeft:`3px solid ${st.color}`, border:"1px solid #1e1e2e", borderLeftWidth:3, borderLeftColor:st.color, borderRadius:10, padding:"12px 13px", cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, flex:1 }}>{t.title}</div>
                        <span style={{ fontSize:13, marginLeft:6 }}>{st.icon}</span>
                      </div>
                      {t.description&&<div style={{ fontSize:11, color:"#4b5563", lineHeight:1.4, marginBottom:8 }}>{t.description}</div>}
                      <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:20, background:pr.color+"20", color:pr.color, fontFamily:"'JetBrains Mono',monospace" }}>{pr.label}</span>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:20, background:st.color+"15", color:st.color, fontFamily:"'JetBrains Mono',monospace" }}>{st.label}</span>
                        {asgn&&<span style={{ marginLeft:"auto", fontSize:9, background:"#1a1a2e", borderRadius:20, padding:"2px 7px", color:roleColor(asgn.role), fontFamily:"'JetBrains Mono',monospace" }}>@{asgn.telegram}</span>}
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
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
          onClick={() => { setAddDay(null); setDetail(null); setAddProj(false); }}>

          {/* ADD TASK */}
          {addDay !== null && !detail && (
            <div style={{ background:"#111118", border:"1px solid #2d2d44", borderRadius:14, padding:22, width:430, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 30px 60px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:16 }}>{addDay==="backlog"?"💡 Новая идея":`🎬 ${addDay} ${MONTHS[month]} ${year}`}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                <div><span style={S.lbl}>НАЗВАНИЕ</span><input placeholder="Название рилса" value={nt.title} onChange={e=>setNt(p=>({...p,title:e.target.value}))} style={S.input} /></div>
                <div><span style={S.lbl}>ОПИСАНИЕ</span><textarea placeholder="Идея, концепция..." value={nt.description} onChange={e=>setNt(p=>({...p,description:e.target.value}))} style={{...S.input,minHeight:65,resize:"vertical",lineHeight:1.5}} /></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><span style={S.lbl}>ПРОЕКТ</span>
                    <select value={nt.project_id} onChange={e=>setNt(p=>({...p,project_id:e.target.value}))} style={S.input}>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><span style={S.lbl}>ИСПОЛНИТЕЛЬ</span>
                    <select value={nt.assignee_id} onChange={e=>setNt(p=>({...p,assignee_id:e.target.value}))} style={S.input}>
                      <option value="">— нет —</option>
                      {users.map(u=><option key={u.id} value={u.id}>@{u.telegram}</option>)}
                    </select></div>
                </div>
                <div><span style={S.lbl}>ЭТАП</span><StageBar stage={nt.stage} onChange={s=>setNt(p=>({...p,stage:s}))} /></div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button onClick={()=>setAddDay(null)} style={{ flex:1, background:"transparent", border:"1px solid #2d2d44", borderRadius:8, padding:"8px", color:"#4b5563", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontSize:12 }}>Отмена</button>
                  <button onClick={doAddTask} style={{ flex:2, background:"linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", borderRadius:8, padding:"8px", color:"#fff", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12 }}>
                    {addDay==="backlog"?"В банк идей":"Добавить"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {detail && (
            <div style={{ background:"#111118", border:"1px solid #2d2d44", borderRadius:14, padding:22, width:470, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 30px 60px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:800, marginBottom:5 }}>{detail.title}</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, background:projOf(detail.project_id).color+"20", color:projOf(detail.project_id).color, fontFamily:"'JetBrains Mono',monospace" }}>{projOf(detail.project_id).label}</span>
                    {userOf(detail.assignee_id)&&<span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, background:roleColor(userOf(detail.assignee_id).role)+"20", color:roleColor(userOf(detail.assignee_id).role), fontFamily:"'JetBrains Mono',monospace" }}>@{userOf(detail.assignee_id).telegram}</span>}
                    <span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, background:"#1a1a2e", color:"#4b5563", fontFamily:"'JetBrains Mono',monospace" }}>
                      {detail.day ? (()=>{const{y,m,d}=decDay(detail.day);return`${d} ${MONTHS[m]} ${y}`;})() : "💡 банк идей"}
                    </span>
                  </div>
                </div>
                <button onClick={()=>setDetail(null)} style={{ background:"#1a1a2e", border:"1px solid #2d2d44", borderRadius:6, width:24, height:24, cursor:"pointer", color:"#6b7280", fontSize:14, flexShrink:0 }}>×</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div><span style={S.lbl}>НАЗВАНИЕ</span><input value={detail.title} onChange={e=>doUpdate(detail.id,{title:e.target.value})} style={S.input} /></div>
                <div><span style={S.lbl}>ОПИСАНИЕ</span><textarea value={detail.description||""} onChange={e=>doUpdate(detail.id,{description:e.target.value})} style={{...S.input,minHeight:80,resize:"vertical",lineHeight:1.5}} /></div>
                <div><span style={S.lbl}>ЭТАП</span><StageBar stage={detail.stage} onChange={s=>doUpdate(detail.id,{stage:s})} /></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><span style={S.lbl}>ПРОЕКТ</span>
                    <select value={detail.project_id} onChange={e=>doUpdate(detail.id,{project_id:e.target.value})} style={S.input}>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><span style={S.lbl}>ИСПОЛНИТЕЛЬ</span>
                    <select value={detail.assignee_id||""} onChange={e=>doUpdate(detail.id,{assignee_id:e.target.value})} style={S.input}>
                      <option value="">— нет —</option>
                      {users.map(u=><option key={u.id} value={u.id}>@{u.telegram}</option>)}
                    </select></div>
                </div>
                {detail.day&&<button onClick={()=>doUpdate(detail.id,{day:null})} style={{ background:"#1a1a2e", border:"1px solid #2d2d44", borderRadius:7, padding:"6px 12px", color:"#9ca3af", cursor:"pointer", fontSize:11, fontFamily:"'Syne',sans-serif", textAlign:"left" }}>↩ В банк идей</button>}
                <button onClick={()=>doDelete(detail.id)} style={{ background:"transparent", border:"1px solid #ef444430", borderRadius:8, padding:"7px", color:"#ef4444", cursor:"pointer", fontSize:11, fontFamily:"'Syne',sans-serif" }}>Удалить рилс</button>
              </div>
            </div>
          )}

          {/* ADD PROJECT */}
          {addProj && (
            <div style={{ background:"#111118", border:"1px solid #2d2d44", borderRadius:14, padding:22, width:310, boxShadow:"0 30px 60px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:16 }}>Новый проект</div>
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                <div><span style={S.lbl}>НАЗВАНИЕ</span><input placeholder="Название проекта" value={np.label} onChange={e=>setNp(p=>({...p,label:e.target.value}))} style={S.input} /></div>
                <div><span style={S.lbl}>ЦВЕТ</span>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {PROJECT_COLORS.map(c=><button key={c} onClick={()=>setNp(p=>({...p,color:c}))} style={{ width:24, height:24, borderRadius:"50%", background:c, cursor:"pointer", border:"none", outline: np.color===c?`2px solid ${c}`:"none", outlineOffset:2 }} />)}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button onClick={()=>setAddProj(false)} style={{ flex:1, background:"transparent", border:"1px solid #2d2d44", borderRadius:8, padding:"8px", color:"#4b5563", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontSize:12 }}>Отмена</button>
                  <button onClick={doAddProject} style={{ flex:2, background:"linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", borderRadius:8, padding:"8px", color:"#fff", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12 }}>Создать</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
