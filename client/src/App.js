import { useState, useEffect, useCallback } from "react";
import Chat from "./Chat";

const STAGES = [
  { id:"idea",    label:"Идея",       icon:"💡", color:"#f59e0b" },
  { id:"script",  label:"Сценарий",   icon:"✍️", color:"#8b5cf6" },
  { id:"shot",    label:"Снято",      icon:"🎬", color:"#3b82f6" },
  { id:"edit",    label:"Монтаж",     icon:"🎞️", color:"#ec4899" },
  { id:"publish", label:"Публикация", icon:"🚀", color:"#10b981" },
];
const ROLES = ["Менеджер проекта","Сценарист","Оператор","Монтажёр"];
const PCOLORS = ["#ef4444","#3b82f6","#ec4899","#10b981","#f59e0b","#8b5cf6","#06b6d4","#f97316"];
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const WDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function dim(y,m){return new Date(y,m+1,0).getDate();}
function fd(y,m){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}
function enc(y,m,d){return y*10000+(m+1)*100+d;}
function dec(n){return{y:Math.floor(n/10000),m:Math.floor((n%10000)/100)-1,d:n%100};}
function fmtDay(n){if(!n)return null;const{y,m,d}=dec(n);return`${d} ${MONTHS[m]} ${y}`;}
const rc=r=>({"Менеджер проекта":"#f59e0b","Сценарист":"#8b5cf6","Оператор":"#3b82f6","Монтажёр":"#ec4899"}[r]||"#6b7280");
const stOf=id=>STAGES.find(s=>s.id===id)||STAGES[0];

const SI={background:"#16161f",border:"1px solid #2d2d44",borderRadius:8,padding:"10px 13px",color:"#f0eee8",fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
const LB={fontSize:10,color:"#4b5563",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,display:"block",fontFamily:"'JetBrains Mono',monospace"};

async function api(path,opts={}){
  const headers={"Content-Type":"application/json",...(opts.adminTg?{"x-admin-telegram":opts.adminTg}:{})};
  const r=await fetch(path,{...opts,headers,body:opts.body?JSON.stringify(opts.body):undefined});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error||"Ошибка");
  return data;
}

// ── Stage bar ─────────────────────────────────────────────────────────────────
function StageBar({stage,onChange}){
  const idx=STAGES.findIndex(s=>s.id===stage);
  return(
    <div style={{display:"flex",gap:4}}>
      {STAGES.map((s,i)=>{
        const active=s.id===stage,past=i<idx;
        return(
          <button key={s.id} onClick={()=>onChange(s.id)} style={{flex:1,padding:"7px 2px",borderRadius:8,cursor:"pointer",background:active?s.color+"22":past?"#1a1a2e":"#111118",border:`1px solid ${active?s.color:past?s.color+"40":"#2d2d44"}`,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:13}}>{s.icon}</span>
            <span style={{fontSize:9,color:active?s.color:past?s.color+"80":"#3d3d55",fontFamily:"'JetBrains Mono',monospace"}}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function Auth({onLogin}){
  const [tab,setTab]=useState("login");
  const [tg,setTg]=useState("");
  const [role,setRole]=useState(ROLES[0]);
  const [pass,setPass]=useState("");
  const [inv,setInv]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(){
    setErr("");setBusy(true);
    try{
      const body=tab==="login"?{telegram:tg,password:pass}:{telegram:tg,role,password:pass,invite_password:inv};
      const user=await api(tab==="login"?"/api/auth/login":"/api/auth/register",{method:"POST",body});
      onLogin(user);
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  }

  return(
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",color:"#f0eee8"}}>
      <div style={{width:360}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:50,height:50,borderRadius:14,background:"linear-gradient(135deg,#7c3aed,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 12px"}}>📅</div>
          <div style={{fontSize:20,fontWeight:800}}>ContentFlow</div>
          <div style={{fontSize:10,color:"#4b5563",fontFamily:"'JetBrains Mono',monospace",marginTop:3}}>smm production calendar</div>
        </div>
        <div style={{display:"flex",background:"#111118",borderRadius:8,padding:3,border:"1px solid #1e1e2e",marginBottom:18}}>
          {[["login","Войти"],["register","Регистрация"]].map(([t,l])=>(
            <button key={t} onClick={()=>{setTab(t);setErr("");}} style={{flex:1,padding:"8px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:700,background:tab===t?"#1e1e35":"transparent",border:tab===t?"1px solid #3d3d5c":"1px solid transparent",color:tab===t?"#f0eee8":"#4b5563"}}>{l}</button>
          ))}
        </div>
        <div style={{background:"#111118",border:"1px solid #1e1e2e",borderRadius:12,padding:22,display:"flex",flexDirection:"column",gap:12}}>
          <div><span style={LB}>НИК В ТЕЛЕГРАМ</span><input placeholder="@username" value={tg} onChange={e=>setTg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={SI}/></div>
          {tab==="register"&&<div><span style={LB}>ДОЛЖНОСТЬ</span><select value={role} onChange={e=>setRole(e.target.value)} style={SI}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></div>}
          <div><span style={LB}>ПАРОЛЬ</span><input type="password" placeholder="Пароль" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={SI}/></div>
          {tab==="register"&&<div><span style={LB}>КОД ПРИГЛАШЕНИЯ</span><input type="password" placeholder="Код от менеджера" value={inv} onChange={e=>setInv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={SI}/></div>}
          {err&&<div style={{background:"#ef444415",border:"1px solid #ef444430",borderRadius:7,padding:"8px 11px",fontSize:12,color:"#ef4444",fontFamily:"'JetBrains Mono',monospace"}}>{err}</div>}
          <button onClick={submit} disabled={busy} style={{background:"linear-gradient(135deg,#7c3aed,#ec4899)",border:"none",borderRadius:8,padding:"11px",color:"#fff",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,marginTop:2}}>
            {busy?"...":(tab==="login"?"Войти":"Зарегистрироваться")}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:12,fontSize:10,color:"#2d2d44",fontFamily:"'JetBrains Mono',monospace"}}>{tab==="register"?"код приглашения: 1290":"нет аккаунта? → Регистрация"}</div>
      </div>
    </div>
  );
}

// ── Task Card (used in calendar and backlog) ──────────────────────────────────
function TaskCard({t,projOf,userOf,onClick,onStar,draggable,onDragStart,onChat,unreadCount}){
  const st=stOf(t.stage),pr=projOf(t.project_id),asgn=userOf(t.assignee_id);
  return(
    <div draggable={draggable} onDragStart={onDragStart}
      style={{borderLeft:`3px solid ${st.color}`,background:"#1a1a2e",borderRadius:"0 5px 5px 0",padding:"4px 6px",marginBottom:3,cursor:"pointer",position:"relative"}}
      onClick={e=>{e.stopPropagation();onClick();}}>
      <div style={{display:"flex",alignItems:"center",gap:3,paddingRight:16}}>
        <span style={{fontSize:9}}>{st.icon}</span>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:72,color:"#ddd",fontWeight:500,fontSize:10}}>{t.title}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:8,color:pr.color,fontFamily:"'JetBrains Mono',monospace"}}>{pr.label}</div>
        {asgn&&<div style={{fontSize:7,color:rc(asgn.role),fontFamily:"'JetBrains Mono',monospace"}}>@{asgn.telegram.slice(0,5)}</div>}
      </div>
      <button onClick={e=>{e.stopPropagation();onStar();}}
        style={{position:"absolute",top:3,right:3,background:"transparent",border:"none",cursor:"pointer",fontSize:10,color:t.starred?"#f59e0b":"#2d2d44",padding:0,lineHeight:1}}>
        {t.starred?"★":"☆"}
      </button>
      <button onClick={e=>{e.stopPropagation();onChat();}}
        style={{position:"absolute",bottom:3,right:3,background:"transparent",border:"none",cursor:"pointer",fontSize:9,color:"#3d3d55",padding:0,lineHeight:1}}>
        💬
      </button>
      {unreadCount>0&&<div style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700}}>{unreadCount>9?"9+":unreadCount}</div>}
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({user,onClose}){
  const [tab,setTab]=useState("users");
  const [users,setUsers]=useState([]);
  const [dump,setDump]=useState(null);
  const [editPw,setEditPw]=useState({id:null,pw:""});
  const [editRole,setEditRole]=useState({id:null,role:""});
  const adminOpts={adminTg:user.telegram};

  useEffect(()=>{
    api("/api/users").then(setUsers);
  },[]);

  async function loadDump(){
    const d=await api("/api/admin/dump",adminOpts);
    setDump(d);setTab("dump");
  }
  async function delUser(id){
    if(!window.confirm("Удалить пользователя?"))return;
    await api(`/api/admin/users/${id}`,{method:"DELETE",...adminOpts});
    setUsers(p=>p.filter(u=>u.id!==id));
  }
  async function resetPw(id){
    if(!editPw.pw.trim())return;
    await api(`/api/admin/users/${id}/password`,{method:"PATCH",body:{new_password:editPw.pw},...adminOpts});
    setEditPw({id:null,pw:""});
    alert("Пароль изменён");
  }
  async function changeRole(id,role){
    const updated=await api(`/api/admin/users/${id}/role`,{method:"PATCH",body:{role},...adminOpts});
    setUsers(p=>p.map(u=>u.id===id?{...u,role:updated.role}:u));
    setEditRole({id:null,role:""});
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#111118",border:"1px solid #2d2d44",borderRadius:16,width:700,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 40px 80px rgba(0,0,0,0.8)"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"18px 22px",borderBottom:"1px solid #1e1e2e",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:18}}>🛡️</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14}}>Панель администратора</div>
            <div style={{fontSize:10,color:"#4b5563",fontFamily:"'JetBrains Mono',monospace"}}>@{user.telegram}</div>
          </div>
          <button onClick={onClose} style={{background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:6,width:26,height:26,cursor:"pointer",color:"#6b7280",fontSize:14}}>×</button>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:3,padding:"12px 22px 0",borderBottom:"1px solid #1e1e2e"}}>
          {[["users","👥 Пользователи"],["dump","🗄️ База данных"]].map(([t,l])=>(
            <button key={t} onClick={()=>t==="dump"?loadDump():setTab(t)} style={{padding:"7px 14px",borderRadius:"7px 7px 0 0",cursor:"pointer",fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:600,background:tab===t?"#1a1a2e":"transparent",border:tab===t?"1px solid #2d2d44":"1px solid transparent",borderBottom:tab===t?"1px solid #1a1a2e":"none",color:tab===t?"#f0eee8":"#4b5563",marginBottom:"-1px"}}>{l}</button>
          ))}
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:22}}>
          {tab==="users"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {users.map(u=>(
                <div key={u.id} style={{background:"#0d0d16",border:"1px solid #1e1e2e",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${rc(u.role)},#7c3aed)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{u.telegram[0].toUpperCase()}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>@{u.telegram} {u.is_admin&&<span style={{fontSize:9,background:"#f59e0b20",color:"#f59e0b",borderRadius:4,padding:"1px 5px",fontFamily:"'JetBrains Mono',monospace"}}>ADMIN</span>}</div>
                      <div style={{fontSize:10,color:rc(u.role),fontFamily:"'JetBrains Mono',monospace"}}>{u.role}</div>
                    </div>
                    {!u.is_admin&&(
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        {editRole.id===u.id?(
                          <>
                            <select value={editRole.role} onChange={e=>setEditRole(p=>({...p,role:e.target.value}))} style={{...SI,width:"auto",padding:"4px 8px",fontSize:11}}>
                              {ROLES.map(r=><option key={r}>{r}</option>)}
                            </select>
                            <button onClick={()=>changeRole(u.id,editRole.role)} style={{background:"#10b981",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif"}}>✓</button>
                            <button onClick={()=>setEditRole({id:null,role:""})} style={{background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:6,padding:"4px 8px",color:"#6b7280",cursor:"pointer",fontSize:11}}>✕</button>
                          </>
                        ):(
                          <button onClick={()=>setEditRole({id:u.id,role:u.role})} style={{background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:6,padding:"4px 10px",color:"#9ca3af",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif"}}>Роль</button>
                        )}
                        {editPw.id===u.id?(
                          <>
                            <input type="password" placeholder="Новый пароль" value={editPw.pw} onChange={e=>setEditPw(p=>({...p,pw:e.target.value}))} style={{...SI,width:130,padding:"4px 8px",fontSize:11}}/>
                            <button onClick={()=>resetPw(u.id)} style={{background:"#8b5cf6",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif"}}>Сохранить</button>
                            <button onClick={()=>setEditPw({id:null,pw:""})} style={{background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:6,padding:"4px 8px",color:"#6b7280",cursor:"pointer",fontSize:11}}>✕</button>
                          </>
                        ):(
                          <button onClick={()=>setEditPw({id:u.id,pw:""})} style={{background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:6,padding:"4px 10px",color:"#9ca3af",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif"}}>Пароль</button>
                        )}
                        <button onClick={()=>delUser(u.id)} style={{background:"transparent",border:"1px solid #ef444430",borderRadius:6,padding:"4px 10px",color:"#ef4444",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif"}}>Удалить</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab==="dump"&&dump&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {[["👥 Пользователи",dump.users,["id","telegram","role","is_admin"]],["📁 Проекты",dump.projects,["id","label","color"]],["🎬 Задачи",dump.tasks,["id","title","stage","project_id","assignee_id","day","starred"]]].map(([title,rows,cols])=>(
                <div key={title}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:8,color:"#9ca3af"}}>{title} ({rows.length})</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>
                      <thead><tr>{cols.map(c=><th key={c} style={{textAlign:"left",padding:"4px 8px",background:"#0d0d16",color:"#4b5563",borderBottom:"1px solid #1e1e2e"}}>{c}</th>)}</tr></thead>
                      <tbody>{rows.map((r,i)=><tr key={i} style={{borderBottom:"1px solid #1a1a2e"}}>{cols.map(c=><td key={c} style={{padding:"4px 8px",color:"#9ca3af",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{String(r[c]??"-")}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats Panel ───────────────────────────────────────────────────────────────
function StatsPanel({tasks,projects,year,month}){
  const [period,setPeriod]=useState("month");

  const filtered=tasks.filter(t=>{
    if(!t.day)return false;
    if(period==="month"){const{y,m}=dec(t.day);return y===year&&m===month;}
    return true;
  });

  return(
    <div style={{padding:"20px 22px",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,margin:"0 0 2px"}}>📊 Статистика</h2>
          <div style={{fontSize:10,color:"#3d3d55",fontFamily:"'JetBrains Mono',monospace"}}>по проектам и этапам</div>
        </div>
        <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
          {[["month","Месяц"],["all","Всё время"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif",fontWeight:600,background:period===v?"#1e1e35":"#111118",border:period===v?"1px solid #3d3d5c":"1px solid #2d2d44",color:period===v?"#f0eee8":"#4b5563"}}>{l}</button>
          ))}
        </div>
      </div>

      {/* By project */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:11,color:"#3d3d55",fontWeight:700,letterSpacing:"0.1em",marginBottom:12,fontFamily:"'JetBrains Mono',monospace"}}>ПО ПРОЕКТАМ</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {projects.map(p=>{
            const ptasks=filtered.filter(t=>t.project_id===p.id);
            const total=ptasks.length;
            const pub=ptasks.filter(t=>t.stage==="publish").length;
            const pct=total>0?Math.round(pub/total*100):0;
            return(
              <div key={p.id} style={{background:"#111118",border:`1px solid ${p.color}30`,borderLeft:`3px solid ${p.color}`,borderRadius:10,padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:13}}>{p.label}</div>
                  <div style={{fontSize:10,color:p.color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{pub}/{total}</div>
                </div>
                <div style={{height:4,background:"#1e1e2e",borderRadius:2,marginBottom:8}}>
                  <div style={{height:4,borderRadius:2,background:`linear-gradient(90deg,${p.color},${p.color}88)`,width:`${pct}%`,transition:"width 0.4s"}}/>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {STAGES.map(s=>{
                    const cnt=ptasks.filter(t=>t.stage===s.id).length;
                    if(!cnt)return null;
                    return<span key={s.id} style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:s.color+"15",color:s.color,fontFamily:"'JetBrains Mono',monospace"}}>{s.icon} {cnt}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By stage */}
      <div>
        <div style={{fontSize:11,color:"#3d3d55",fontWeight:700,letterSpacing:"0.1em",marginBottom:12,fontFamily:"'JetBrains Mono',monospace"}}>ПО ЭТАПАМ</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {STAGES.map(s=>{
            const cnt=filtered.filter(t=>t.stage===s.id).length;
            const total=filtered.length||1;
            return(
              <div key={s.id} style={{background:"#111118",border:`1px solid ${s.color}30`,borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
                <div style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono',monospace"}}>{cnt}</div>
                <div style={{fontSize:10,color:"#4b5563",marginTop:2}}>{s.label}</div>
                <div style={{fontSize:9,color:s.color+"80",fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>{Math.round(cnt/total*100)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [projects,setProjects]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [users,setUsers]=useState([]);
  const [status,setStatus]=useState("idle");
  const [view,setView]=useState("calendar");
  const [chatTask,setChatTask]=useState(null);
  const [unread,setUnread]=useState({});
  const [calMode,setCalMode]=useState("month"); // month | week

  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth());
  const [weekStart,setWeekStart]=useState(()=>{
    const d=new Date();d.setDate(d.getDate()-((d.getDay()||7)-1));
    return enc(d.getFullYear(),d.getMonth(),d.getDate());
  });

  const [pf,setPf]=useState("all");
  const [uf,setUf]=useState("all");
  const [addDay,setAddDay]=useState(null);
  const [detail,setDetail]=useState(null);
  const [addProj,setAddProj]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [dragTask,setDragTask]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const [nt,setNt]=useState({title:"",description:"",project_id:"",stage:"idea",assignee_id:"",day:null});
  const [np,setNp]=useState({label:"",color:PCOLORS[0]});

  const today=enc(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());

  const load=useCallback(async()=>{
    setStatus("loading");
    try{
      const [p,t,u]=await Promise.all([api("/api/projects"),api("/api/tasks"),api("/api/users")]);
      setProjects(Array.isArray(p)?p:[]);
      setTasks(Array.isArray(t)?t:[]);
      setUsers(Array.isArray(u)?u:[]);
      setStatus("ready");
      // Load unread counts
      try {
        const ur = await api(`/api/unread/${u.id}`);
        // u here is currentUser - we pass it separately
      } catch {}
    }catch(e){setStatus("error");}
  },[]);

  const handleLogin=useCallback(async u=>{
    setUser(u);
    load();
    try { const ur=await api(`/api/unread/${u.id}`); setUnread(ur||{}); } catch {}
  },[load]);
  const markRead=(taskId)=>{
    setUnread(prev=>({...prev,[taskId]:0}));
  };
  const handleLogout=()=>{setUser(null);setProjects([]);setTasks([]);setUsers([]);setStatus("idle");};

  if(!user)return <Auth onLogin={handleLogin}/>;
  if(status==="loading")return<div style={{background:"#0a0a0f",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,color:"#4b5563",fontFamily:"'JetBrains Mono',monospace",fontSize:12}}><div style={{fontSize:28}}>📅</div>загрузка...</div>;
  if(status==="error")return<div style={{background:"#0a0a0f",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#f0eee8",fontFamily:"'JetBrains Mono',monospace",fontSize:12}}><div style={{fontSize:28}}>⚠️</div><button onClick={load} style={{background:"linear-gradient(135deg,#7c3aed,#ec4899)",border:"none",borderRadius:8,padding:"8px 18px",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Повторить</button></div>;
  if(status==="idle")return<div style={{background:"#0a0a0f",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={load} style={{background:"linear-gradient(135deg,#7c3aed,#ec4899)",border:"none",borderRadius:8,padding:"10px 20px",color:"#fff",cursor:"pointer",fontFamily:"'Syne',sans-serif"}}>Загрузить</button></div>;

  const projOf=id=>projects.find(p=>p.id===id)||{label:"?",color:"#6b7280"};
  const userOf=id=>users.find(u=>u.id===id)||null;

  const visible=tasks.filter(t=>(pf==="all"||t.project_id===pf)&&(uf==="all"||t.assignee_id===uf));
  const calTasks=visible.filter(t=>t.day);
  const backlog=visible.filter(t=>!t.day);
  const starred=tasks.filter(t=>t.starred);

  const byDay={};
  calTasks.forEach(t=>{(byDay[t.day]=byDay[t.day]||[]).push(t);});

  const emptyTask=()=>({title:"",description:"",project_id:projects[0]?.id||"",stage:"idea",assignee_id:user?.id||"",day:null});

  async function doAddTask(){
    if(!nt.title.trim()||!nt.project_id)return;
    const dayVal=addDay==="backlog"?null:(nt.day||encodeDay(year,month,addDay));
    const task=await api("/api/tasks",{method:"POST",body:{...nt,day:dayVal}});
    setTasks(p=>[...p,task]);setAddDay(null);setNt(emptyTask());
  }

  function encodeDay(y,m,d){return enc(y,m,d);}

  async function doStar(id){
    const t=tasks.find(x=>x.id===id);if(!t)return;
    const updated=await api(`/api/tasks/${id}`,{method:"PATCH",body:{starred:!t.starred}});
    setTasks(p=>p.map(x=>x.id===id?updated:x));
    if(detail&&detail.id===id)setDetail(updated);
  }

  async function doUpdate(id,patch){
    const updated=await api(`/api/tasks/${id}`,{method:"PATCH",body:patch});
    setTasks(p=>p.map(t=>t.id===id?updated:t));
    setDetail(prev=>prev&&prev.id===id?updated:prev);
  }

  async function doDelete(id){
    await api(`/api/tasks/${id}`,{method:"DELETE"});
    setTasks(p=>p.filter(t=>t.id!==id));setDetail(null);
  }

  async function doAddProject(){
    if(!np.label.trim())return;
    const proj=await api("/api/projects",{method:"POST",body:np});
    setProjects(p=>[...p,proj]);setNp({label:"",color:PCOLORS[0]});setAddProj(false);
  }

  async function doDelProject(id){
    await api(`/api/projects/${id}`,{method:"DELETE"});
    setProjects(p=>p.filter(x=>x.id!==id));
    setTasks(p=>p.filter(x=>x.project_id!==id));
    if(pf===id)setPf("all");
  }

  // Week navigation
  function getWeekDays(startEnc){
    const{y,m,d}=dec(startEnc);
    const start=new Date(y,m,d);
    return Array.from({length:7},(_,i)=>{
      const dd=new Date(start);dd.setDate(dd.getDate()+i);
      return enc(dd.getFullYear(),dd.getMonth(),dd.getDate());
    });
  }
  function prevWeek(){const{y,m,d}=dec(weekStart);const dt=new Date(y,m,d);dt.setDate(dt.getDate()-7);setWeekStart(enc(dt.getFullYear(),dt.getMonth(),dt.getDate()));}
  function nextWeek(){const{y,m,d}=dec(weekStart);const dt=new Date(y,m,d);dt.setDate(dt.getDate()+7);setWeekStart(enc(dt.getFullYear(),dt.getMonth(),dt.getDate()));}

  const weekDays=getWeekDays(weekStart);
  const{y:wy,m:wm}=dec(weekStart);

  // Drag & drop
  function handleDrop(dayEnc){
    if(!dragTask)return;
    doUpdate(dragTask,{day:dayEnc});
    setDragTask(null);
  }

  const overlay=addDay!==null||detail||addProj;

  return(
    <div style={{fontFamily:"'Syne',sans-serif",height:"100vh",background:"#0a0a0f",color:"#f0eee8",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {showAdmin&&<AdminPanel user={user} onClose={()=>setShowAdmin(false)}/>}

      {/* HEADER */}
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"11px 20px",display:"flex",alignItems:"center",gap:12,background:"#0d0d16",flexShrink:0}}>
        <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📅</div>
        <div>
          <div style={{fontSize:13,fontWeight:800}}>ContentFlow</div>
          <div style={{fontSize:9,color:"#4b5563",fontFamily:"'JetBrains Mono',monospace"}}>smm production · reels</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",gap:3}}>
            {STAGES.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:2,background:"#111118",borderRadius:20,padding:"2px 7px",border:"1px solid #1e1e2e"}}><span style={{fontSize:9}}>{s.icon}</span><span style={{fontSize:9,color:"#4b5563",fontFamily:"'JetBrains Mono',monospace"}}>{s.label}</span></div>)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,background:"#111118",border:"1px solid #2d2d44",borderRadius:20,padding:"4px 10px"}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg,${rc(user.role)},#7c3aed)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{(user.telegram||"?")[0].toUpperCase()}</div>
            <div>
              <div style={{fontSize:10,fontWeight:700}}>@{user.telegram}</div>
              <div style={{fontSize:8,color:rc(user.role),fontFamily:"'JetBrains Mono',monospace"}}>{user.role}</div>
            </div>
            {user.is_admin&&<button onClick={()=>setShowAdmin(true)} title="Админ-панель" style={{background:"#f59e0b20",border:"1px solid #f59e0b40",borderRadius:5,padding:"2px 7px",color:"#f59e0b",cursor:"pointer",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>🛡️</button>}
            <button onClick={handleLogout} title="Выйти" style={{background:"transparent",border:"none",color:"#3d3d55",cursor:"pointer",fontSize:13,marginLeft:2}}>⎋</button>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* SIDEBAR */}
        <div style={{width:195,background:"#0d0d16",borderRight:"1px solid #1a1a2e",padding:"14px 11px",flexShrink:0,display:"flex",flexDirection:"column",overflowY:"auto"}}>
          {/* View tabs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:14}}>
            {[["calendar","📅"],["backlog","💡"],["starred","⭐"],["stats","📊"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"6px 4px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif",fontWeight:600,background:view===v?"#1e1e35":"#111118",border:view===v?"1px solid #3d3d5c":"1px solid #1e1e2e",color:view===v?"#f0eee8":"#3d3d55",textAlign:"center"}}>{l}</button>
            ))}
          </div>

          {/* Calendar mode toggle (only in calendar view) */}
          {view==="calendar"&&(
            <div style={{display:"flex",gap:3,marginBottom:12,background:"#111118",borderRadius:6,padding:3,border:"1px solid #1e1e2e"}}>
              {[["month","Месяц"],["week","Неделя"]].map(([v,l])=>(
                <button key={v} onClick={()=>setCalMode(v)} style={{flex:1,padding:"4px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"'Syne',sans-serif",fontWeight:600,background:calMode===v?"#1e1e35":"transparent",border:calMode===v?"1px solid #3d3d5c":"1px solid transparent",color:calMode===v?"#f0eee8":"#3d3d55"}}>{l}</button>
              ))}
            </div>
          )}

          <div style={{fontSize:9,color:"#3d3d55",fontWeight:700,letterSpacing:"0.1em",marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>ПРОЕКТЫ</div>
          <button onClick={()=>setPf("all")} style={{width:"100%",textAlign:"left",background:pf==="all"?"#1a1a2e":"transparent",border:pf==="all"?"1px solid #3d3d5c":"1px solid transparent",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:pf==="all"?"#f0eee8":"#4b5563",fontSize:11,fontFamily:"'Syne',sans-serif",marginBottom:2}}>◈ Все</button>
          {projects.map(p=>(
            <div key={p.id} style={{display:"flex",marginBottom:2}}>
              <button onClick={()=>setPf(p.id)} style={{flex:1,textAlign:"left",background:pf===p.id?"#1a1a2e":"transparent",border:pf===p.id?`1px solid ${p.color}45`:"1px solid transparent",borderRadius:"6px 0 0 6px",padding:"5px 7px 5px 8px",cursor:"pointer",color:pf===p.id?"#f0eee8":"#6b7280",fontSize:11,fontFamily:"'Syne',sans-serif",display:"flex",alignItems:"center",gap:6,overflow:"hidden"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.label}</span>
              </button>
              <button onClick={()=>doDelProject(p.id)} style={{background:pf===p.id?"#1a1a2e":"transparent",border:pf===p.id?`1px solid ${p.color}45`:"1px solid transparent",borderLeft:"none",borderRadius:"0 6px 6px 0",padding:"5px 6px",cursor:"pointer",color:"#2d2d44",fontSize:10}} onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#2d2d44"}>✕</button>
            </div>
          ))}
          <button onClick={()=>setAddProj(true)} style={{width:"100%",background:"transparent",border:"1px dashed #2d2d44",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:"#3d3d55",fontSize:10,fontFamily:"'Syne',sans-serif",marginTop:4,textAlign:"left"}}>+ Проект</button>

          <div style={{fontSize:9,color:"#3d3d55",fontWeight:700,letterSpacing:"0.1em",marginBottom:6,marginTop:16,fontFamily:"'JetBrains Mono',monospace"}}>КОМАНДА</div>
          <button onClick={()=>setUf("all")} style={{width:"100%",textAlign:"left",background:uf==="all"?"#1a1a2e":"transparent",border:uf==="all"?"1px solid #3d3d5c":"1px solid transparent",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:uf==="all"?"#f0eee8":"#4b5563",fontSize:11,fontFamily:"'Syne',sans-serif",marginBottom:2}}>👥 Все</button>
          {users.map(u=>(
            <button key={u.id} onClick={()=>setUf(u.id)} style={{width:"100%",textAlign:"left",background:uf===u.id?"#1a1a2e":"transparent",border:uf===u.id?`1px solid ${rc(u.role)}45`:"1px solid transparent",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:uf===u.id?"#f0eee8":"#6b7280",fontSize:11,fontFamily:"'Syne',sans-serif",marginBottom:2,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg,${rc(u.role)}88,#7c3aed44)`,border:`1px solid ${rc(u.role)}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,flexShrink:0}}>{(u.telegram||"?")[0].toUpperCase()}</div>
              <div style={{overflow:"hidden"}}>
                <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10}}>@{u.telegram}</div>
                <div style={{fontSize:8,color:rc(u.role),fontFamily:"'JetBrains Mono',monospace"}}>{u.role}</div>
              </div>
            </button>
          ))}

          <div style={{marginTop:"auto",paddingTop:12,fontSize:9,color:"#2d2d44",fontFamily:"'JetBrains Mono',monospace",textAlign:"center"}}>
            {visible.length} рилсов · {starred.length} ⭐
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>

          {/* CALENDAR MONTH */}
          {view==="calendar"&&calMode==="month"&&(
            <div style={{padding:"16px 18px",flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <button onClick={()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1)} style={{background:"#111118",border:"1px solid #2d2d44",color:"#f0eee8",width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:13}}>‹</button>
                <h2 style={{fontSize:17,fontWeight:800,margin:0}}>{MONTHS[month]} <span style={{color:"#2d2d44"}}>{year}</span></h2>
                <button onClick={()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1)} style={{background:"#111118",border:"1px solid #2d2d44",color:"#f0eee8",width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:13}}>›</button>
                <span style={{marginLeft:"auto",fontSize:9,color:"#3d3d55",fontFamily:"'JetBrains Mono',monospace"}}>нажмите → добавить · тяните → переместить</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
                {WDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"#2d2d44",fontFamily:"'JetBrains Mono',monospace",padding:"2px 0",fontWeight:700}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                {Array.from({length:fd(year,month)}).map((_,i)=><div key={i} style={{minHeight:90}}/>)}
                {Array.from({length:dim(year,month)},(_,i)=>i+1).map(day=>{
                  const dk=enc(year,month,day);
                  const dt=byDay[dk]||[];
                  const isTd=dk===today;
                  return(
                    <div key={day}
                      onClick={()=>{setAddDay(day);setNt({...emptyTask(),day:dk});}}
                      onDragOver={e=>{e.preventDefault();setDragOver(dk);}}
                      onDragLeave={()=>setDragOver(null)}
                      onDrop={()=>{handleDrop(dk);setDragOver(null);}}
                      style={{minHeight:90,background:dragOver===dk?"#1a1a35":isTd?"#0f0f1e":"#111118",border:dragOver===dk?"1px solid #7c3aed55":isTd?"1px solid #7c3aed":"1px solid #1e1e2e",borderRadius:7,padding:"5px 5px 4px",cursor:"pointer",transition:"all 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=isTd?"#9d6fef":"#3d3d5c"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=isTd?"#7c3aed":"#1e1e2e"}>
                      <div style={{fontSize:10,color:isTd?"#a78bfa":"#2d2d44",fontWeight:isTd?800:500,marginBottom:3,fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:2}}>
                        {day}{isTd&&<span style={{fontSize:6,background:"#7c3aed",color:"#fff",borderRadius:3,padding:"1px 3px"}}>сег</span>}
                      </div>
                      {dt.slice(0,3).map(t=>(
                        <TaskCard key={t.id} t={t} projOf={projOf} userOf={userOf}
                          onClick={()=>setDetail({...t})}
                          onStar={()=>doStar(t.id)}
                          onChat={()=>setChatTask(t)}
                          unreadCount={unread[t.id]||0}
                          draggable onDragStart={()=>setDragTask(t.id)}/>
                      ))}
                      {dt.length>3&&<div style={{fontSize:8,color:"#2d2d44",fontFamily:"'JetBrains Mono',monospace"}}>+{dt.length-3}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CALENDAR WEEK */}
          {view==="calendar"&&calMode==="week"&&(
            <div style={{padding:"16px 18px",flex:1,display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <button onClick={prevWeek} style={{background:"#111118",border:"1px solid #2d2d44",color:"#f0eee8",width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:13}}>‹</button>
                <h2 style={{fontSize:17,fontWeight:800,margin:0}}>
                  {MONTHS_SHORT[wm]} <span style={{color:"#2d2d44"}}>{wy}</span>
                  <span style={{fontSize:12,color:"#4b5563",fontWeight:400,marginLeft:10,fontFamily:"'JetBrains Mono',monospace"}}>
                    {(()=>{const{d:d1}=dec(weekDays[0]);const{d:d2,m:m2}=dec(weekDays[6]);return`${d1}–${d2} ${MONTHS_SHORT[m2]}`;})()}
                  </span>
                </h2>
                <button onClick={nextWeek} style={{background:"#111118",border:"1px solid #2d2d44",color:"#f0eee8",width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:13}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,flex:1}}>
                {weekDays.map((dk,i)=>{
                  const{d}=dec(dk);
                  const dt=byDay[dk]||[];
                  const isTd=dk===today;
                  const isSun=i===6;
                  return(
                    <div key={dk}
                      onDragOver={e=>e.preventDefault()}
                      onDrop={()=>handleDrop(dk)}
                      style={{background:isTd?"#0f0f1e":"#111118",border:isTd?"1px solid #7c3aed":`1px solid ${isSun?"#2d1a1a":"#1e1e2e"}`,borderRadius:8,display:"flex",flexDirection:"column",minHeight:400}}>
                      <div style={{padding:"8px 8px 6px",borderBottom:"1px solid #1a1a2e",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontSize:10,color:"#3d3d55",fontFamily:"'JetBrains Mono',monospace"}}>{WDAYS[i]}</span>
                          <span style={{fontSize:13,fontWeight:800,color:isTd?"#a78bfa":isSun?"#6b3333":"#6b7280"}}>{d}</span>
                        </div>
                        <button onClick={()=>{setAddDay(d);setCalMode("month");setMonth(dec(dk).m);setYear(dec(dk).y);setNt({...emptyTask(),day:dk});}} style={{background:"transparent",border:"none",color:"#2d2d44",cursor:"pointer",fontSize:14,lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color="#a78bfa"} onMouseLeave={e=>e.currentTarget.style.color="#2d2d44"}>+</button>
                      </div>
                      <div style={{padding:"6px",flex:1,overflowY:"auto"}}>
                        {dt.map(t=>(
                          <TaskCard key={t.id} t={t} projOf={projOf} userOf={userOf}
                            onClick={()=>setDetail({...t})}
                            onStar={()=>doStar(t.id)}
                            onChat={()=>setChatTask(t)}
                            unreadCount={unread[t.id]||0}
                            draggable onDragStart={()=>setDragTask(t.id)}/>
                        ))}
                      </div>
                      {dt.length>0&&<div style={{padding:"4px 8px",fontSize:9,color:"#3d3d55",fontFamily:"'JetBrains Mono',monospace",borderTop:"1px solid #1a1a2e"}}>{dt.length} рилс{dt.length>1?"ов":""}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BACKLOG */}
          {view==="backlog"&&(
            <div style={{padding:"20px 22px"}}>
              <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
                <div><h2 style={{fontSize:18,fontWeight:800,margin:"0 0 2px"}}>💡 Банк идей</h2><div style={{fontSize:10,color:"#3d3d55",fontFamily:"'JetBrains Mono',monospace"}}>{backlog.length} рилсов без даты</div></div>
                <button onClick={()=>{setAddDay("backlog");setNt(emptyTask());}} style={{marginLeft:"auto",background:"linear-gradient(135deg,#7c3aed,#ec4899)",border:"none",borderRadius:8,padding:"7px 14px",color:"#fff",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif",fontWeight:700}}>+ Идея</button>
              </div>
              {backlog.length===0?<div style={{textAlign:"center",padding:"50px 0",color:"#2d2d44"}}><div style={{fontSize:32,marginBottom:8}}>💡</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>пусто</div></div>:(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
                  {backlog.map(t=>{
                    const st=stOf(t.stage),pr=projOf(t.project_id),asgn=userOf(t.assignee_id);
                    return(
                      <div key={t.id} style={{background:"#111118",borderLeft:`3px solid ${st.color}`,border:"1px solid #1e1e2e",borderLeftWidth:3,borderLeftColor:st.color,borderRadius:10,padding:"12px 13px",cursor:"pointer",position:"relative"}} onClick={()=>setDetail({...t})}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,paddingRight:20}}>
                          <div style={{fontSize:12,fontWeight:700,flex:1}}>{t.title}</div>
                          <span style={{fontSize:13}}>{st.icon}</span>
                        </div>
                        {t.description&&<div style={{fontSize:11,color:"#4b5563",lineHeight:1.4,marginBottom:8}}>{t.description}</div>}
                        <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:pr.color+"20",color:pr.color,fontFamily:"'JetBrains Mono',monospace"}}>{pr.label}</span>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:st.color+"15",color:st.color,fontFamily:"'JetBrains Mono',monospace"}}>{st.label}</span>
                          {asgn&&<span style={{marginLeft:"auto",fontSize:9,background:"#1a1a2e",borderRadius:20,padding:"2px 7px",color:rc(asgn.role),fontFamily:"'JetBrains Mono',monospace"}}>@{asgn.telegram}</span>}
                        </div>
                        <button onClick={e=>{e.stopPropagation();doStar(t.id);}} style={{position:"absolute",top:10,right:10,background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:t.starred?"#f59e0b":"#2d2d44",padding:0}}>
                          {t.starred?"★":"☆"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STARRED */}
          {view==="starred"&&(
            <div style={{padding:"20px 22px"}}>
              <div style={{marginBottom:20}}>
                <h2 style={{fontSize:18,fontWeight:800,margin:"0 0 2px"}}>⭐ Залетевшие идеи</h2>
                <div style={{fontSize:10,color:"#3d3d55",fontFamily:"'JetBrains Mono',monospace"}}>рилсы которые выстрелили · {starred.length} шт.</div>
              </div>
              {starred.length===0?<div style={{textAlign:"center",padding:"50px 0",color:"#2d2d44"}}><div style={{fontSize:32,marginBottom:8}}>⭐</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>нажмите ☆ на рилсе чтобы добавить</div></div>:(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10}}>
                  {starred.map(t=>{
                    const st=stOf(t.stage),pr=projOf(t.project_id),asgn=userOf(t.assignee_id);
                    return(
                      <div key={t.id} style={{background:"#111118",border:"1px solid #f59e0b30",borderLeft:"3px solid #f59e0b",borderRadius:10,padding:"13px 14px",cursor:"pointer",position:"relative"}} onClick={()=>setDetail({...t})}>
                        <div style={{position:"absolute",top:10,right:10,fontSize:14,color:"#f59e0b"}}>★</div>
                        <div style={{fontSize:12,fontWeight:700,marginBottom:5,paddingRight:20}}>{t.title}</div>
                        {t.description&&<div style={{fontSize:11,color:"#4b5563",lineHeight:1.4,marginBottom:8}}>{t.description}</div>}
                        {t.day&&<div style={{fontSize:9,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>📅 {fmtDay(t.day)}</div>}
                        <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:pr.color+"20",color:pr.color,fontFamily:"'JetBrains Mono',monospace"}}>{pr.label}</span>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:st.color+"15",color:st.color,fontFamily:"'JetBrains Mono',monospace"}}>{st.icon} {st.label}</span>
                          {asgn&&<span style={{marginLeft:"auto",fontSize:9,background:"#1a1a2e",borderRadius:20,padding:"2px 7px",color:rc(asgn.role),fontFamily:"'JetBrains Mono',monospace"}}>@{asgn.telegram}</span>}
                        </div>
                        <button onClick={e=>{e.stopPropagation();doStar(t.id);}} style={{marginTop:8,background:"transparent",border:"1px solid #f59e0b30",borderRadius:6,padding:"3px 10px",color:"#f59e0b",cursor:"pointer",fontSize:10,fontFamily:"'Syne',sans-serif",width:"100%"}}>Убрать из избранного</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STATS */}
          {view==="stats"&&<StatsPanel tasks={tasks} projects={projects} year={year} month={month}/>}
        </div>
      </div>

      {/* OVERLAY */}
      {overlay&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={()=>{setAddDay(null);setDetail(null);setAddProj(false);}}>

          {/* ADD TASK */}
          {addDay!==null&&!detail&&(
            <div style={{background:"#111118",border:"1px solid #2d2d44",borderRadius:14,padding:22,width:450,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 30px 60px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:13,fontWeight:800,marginBottom:16}}>{addDay==="backlog"?"💡 Новая идея":`🎬 Новый рилс`}</div>
              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <div><span style={LB}>НАЗВАНИЕ</span><input placeholder="Название рилса" value={nt.title} onChange={e=>setNt(p=>({...p,title:e.target.value}))} style={SI}/></div>
                <div><span style={LB}>ОПИСАНИЕ</span><textarea placeholder="Идея, концепция..." value={nt.description} onChange={e=>setNt(p=>({...p,description:e.target.value}))} style={{...SI,minHeight:65,resize:"vertical",lineHeight:1.5}}/></div>
                {/* Date picker */}
                {addDay==="backlog"&&(
                  <div><span style={LB}>ДАТА (необязательно)</span>
                    <input type="date" value={nt.day?(()=>{const{y,m,d}=dec(nt.day);return`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;})():""}
                      onChange={e=>{if(e.target.value){const[y,m,d]=e.target.value.split("-").map(Number);setNt(p=>({...p,day:enc(y,m-1,d)}));}else{setNt(p=>({...p,day:null}));}}}
                      style={SI}/></div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><span style={LB}>ПРОЕКТ</span>
                    <select value={nt.project_id} onChange={e=>setNt(p=>({...p,project_id:e.target.value}))} style={SI}>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><span style={LB}>ИСПОЛНИТЕЛЬ</span>
                    <select value={nt.assignee_id} onChange={e=>setNt(p=>({...p,assignee_id:e.target.value}))} style={SI}>
                      <option value="">— нет —</option>
                      {users.map(u=><option key={u.id} value={u.id}>@{u.telegram}</option>)}
                    </select></div>
                </div>
                <div><span style={LB}>ЭТАП</span><StageBar stage={nt.stage} onChange={s=>setNt(p=>({...p,stage:s}))}/></div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={()=>setAddDay(null)} style={{flex:1,background:"transparent",border:"1px solid #2d2d44",borderRadius:8,padding:"8px",color:"#4b5563",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontSize:12}}>Отмена</button>
                  <button onClick={doAddTask} style={{flex:2,background:"linear-gradient(135deg,#7c3aed,#ec4899)",border:"none",borderRadius:8,padding:"8px",color:"#fff",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12}}>
                    {addDay==="backlog"?"В банк идей":"Добавить"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {detail&&(
            <div style={{background:"#111118",border:"1px solid #2d2d44",borderRadius:14,padding:22,width:480,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 30px 60px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,marginBottom:5,paddingRight:30}}>{detail.title}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:projOf(detail.project_id).color+"20",color:projOf(detail.project_id).color,fontFamily:"'JetBrains Mono',monospace"}}>{projOf(detail.project_id).label}</span>
                    {userOf(detail.assignee_id)&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:rc(userOf(detail.assignee_id).role)+"20",color:rc(userOf(detail.assignee_id).role),fontFamily:"'JetBrains Mono',monospace"}}>@{userOf(detail.assignee_id).telegram}</span>}
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:"#1a1a2e",color:"#4b5563",fontFamily:"'JetBrains Mono',monospace"}}>{detail.day?fmtDay(detail.day):"💡 банк идей"}</span>
                    {detail.starred&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:"#f59e0b20",color:"#f59e0b",fontFamily:"'JetBrains Mono',monospace"}}>⭐ залетело</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                  <button onClick={()=>doStar(detail.id)} title="В залетевшие" style={{background:detail.starred?"#f59e0b20":"#1a1a2e",border:`1px solid ${detail.starred?"#f59e0b40":"#2d2d44"}`,borderRadius:6,width:26,height:26,cursor:"pointer",color:detail.starred?"#f59e0b":"#4b5563",fontSize:14}}>
                    {detail.starred?"★":"☆"}
                  </button>
                  <button onClick={()=>setDetail(null)} style={{background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:6,width:26,height:26,cursor:"pointer",color:"#6b7280",fontSize:14}}>×</button>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><span style={LB}>НАЗВАНИЕ</span><input value={detail.title} onChange={e=>doUpdate(detail.id,{title:e.target.value})} style={SI}/></div>
                <div><span style={LB}>ОПИСАНИЕ</span><textarea value={detail.description||""} onChange={e=>doUpdate(detail.id,{description:e.target.value})} style={{...SI,minHeight:80,resize:"vertical",lineHeight:1.5}}/></div>
                {/* Date picker in detail */}
                <div><span style={LB}>ДАТА</span>
                  <input type="date" value={detail.day?(()=>{const{y,m,d}=dec(detail.day);return`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;})():""}
                    onChange={e=>{if(e.target.value){const[y,m,d]=e.target.value.split("-").map(Number);doUpdate(detail.id,{day:enc(y,m-1,d)});}else{doUpdate(detail.id,{day:null});}}}
                    style={SI}/></div>
                <div><span style={LB}>ЭТАП</span><StageBar stage={detail.stage} onChange={s=>doUpdate(detail.id,{stage:s})}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><span style={LB}>ПРОЕКТ</span>
                    <select value={detail.project_id} onChange={e=>doUpdate(detail.id,{project_id:e.target.value})} style={SI}>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                    </select></div>
                  <div><span style={LB}>ИСПОЛНИТЕЛЬ</span>
                    <select value={detail.assignee_id||""} onChange={e=>doUpdate(detail.id,{assignee_id:e.target.value})} style={SI}>
                      <option value="">— нет —</option>
                      {users.map(u=><option key={u.id} value={u.id}>@{u.telegram}</option>)}
                    </select></div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setChatTask(detail);setDetail(null);}} style={{flex:1,background:"#1a1a2e",border:"1px solid #2d2d44",borderRadius:8,padding:"7px",color:"#a78bfa",cursor:"pointer",fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:600}}>💬 Открыть чат {(unread[detail.id]||0)>0&&<span style={{background:"#ef4444",borderRadius:10,padding:"1px 5px",fontSize:10,color:"#fff",marginLeft:4}}>{unread[detail.id]}</span>}</button>
                  <button onClick={()=>doDelete(detail.id)} style={{flex:1,background:"transparent",border:"1px solid #ef444430",borderRadius:8,padding:"7px",color:"#ef4444",cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif"}}>Удалить</button>
                </div>
              </div>
            </div>
          )}

          {/* ADD PROJECT */}
          {addProj&&(
            <div style={{background:"#111118",border:"1px solid #2d2d44",borderRadius:14,padding:22,width:310,boxShadow:"0 30px 60px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:13,fontWeight:800,marginBottom:16}}>Новый проект</div>
              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <div><span style={LB}>НАЗВАНИЕ</span><input placeholder="Название проекта" value={np.label} onChange={e=>setNp(p=>({...p,label:e.target.value}))} style={SI}/></div>
                <div><span style={LB}>ЦВЕТ</span>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {PCOLORS.map(c=><button key={c} onClick={()=>setNp(p=>({...p,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:"none",outline:np.color===c?`2px solid ${c}`:"none",outlineOffset:2}}/>)}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={()=>setAddProj(false)} style={{flex:1,background:"transparent",border:"1px solid #2d2d44",borderRadius:8,padding:"8px",color:"#4b5563",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontSize:12}}>Отмена</button>
                  <button onClick={doAddProject} style={{flex:2,background:"linear-gradient(135deg,#7c3aed,#ec4899)",border:"none",borderRadius:8,padding:"8px",color:"#fff",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12}}>Создать</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {chatTask&&<Chat task={chatTask} user={user} users={users} onClose={()=>setChatTask(null)} onMarkRead={markRead}/>}
    </div>
  );
}
