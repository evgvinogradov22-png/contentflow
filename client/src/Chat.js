import { useState, useEffect, useRef, useCallback } from "react";

const rc = r => ({"Менеджер проекта":"#f59e0b","Сценарист":"#8b5cf6","Оператор":"#3b82f6","Монтажёр":"#ec4899"}[r]||"#6b7280");

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

function fmtTime(ts) {
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

// ── Voice Recorder ────────────────────────────────────────────────────────────
function VoiceRecorder({ onSend, taskId, userId }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        await uploadAndSend(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch(e) { alert("Нет доступа к микрофону"); }
  }

  function stop() {
    clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    setRecording(false);
  }

  async function uploadAndSend(blob) {
    try {
      const filename = `voice_${Date.now()}.webm`;
      const { upload_url, file_url } = await api("/api/upload/presign", {
        method: "POST",
        body: { filename, content_type: "audio/webm", task_id: taskId }
      });
      await fetch(upload_url, { method: "PUT", body: blob, headers: { "Content-Type": "audio/webm" } });
      await onSend({ type: "voice", file_url, file_name: filename, file_size: blob.size, text: "🎙️ Голосовое сообщение" });
    } catch(e) { alert("Ошибка загрузки: " + e.message); }
  }

  return (
    <button
      onMouseDown={start} onMouseUp={stop} onTouchStart={start} onTouchEnd={stop}
      style={{ background: recording ? "#ef444420" : "#1a1a2e", border: `1px solid ${recording ? "#ef4444" : "#2d2d44"}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: recording ? "#ef4444" : "#6b7280", fontSize: 16, flexShrink: 0, position: "relative" }}
      title="Удерживайте для записи">
      🎙️
      {recording && <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 8, padding: "1px 4px", fontFamily: "monospace" }}>{seconds}s</span>}
    </button>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────────
export default function Chat({ task, user, users, onClose, onMarkRead }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mention, setMention] = useState(null); // mention suggestions
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);

  // Load messages
  useEffect(() => {
    api(`/api/tasks/${task.id}/messages`).then(setMessages).catch(console.error);
    // Mark as read
    api(`/api/tasks/${task.id}/messages/read`, { method: "POST", body: { user_id: user.id } });
    onMarkRead(task.id);
  }, [task.id]);

  // WebSocket
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}`);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", userId: user.id }));
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "message" && data.taskId === task.id) {
          setMessages(prev => [...prev, data.message]);
          api(`/api/tasks/${task.id}/messages/read`, { method: "POST", body: { user_id: user.id } });
          onMarkRead(task.id);
        }
      } catch {}
    };
    return () => ws.close();
  }, [task.id, user.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(overrides = {}) {
    const payload = { user_id: user.id, type: "text", text, ...overrides };
    if (!payload.text?.trim() && !payload.file_url) return;
    setText("");
    try {
      await api(`/api/tasks/${task.id}/messages`, { method: "POST", body: payload });
    } catch(e) { alert(e.message); }
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) { alert("Файл слишком большой (максимум 200 МБ)"); return; }
    setUploading(true);
    try {
      const { upload_url, file_url } = await api("/api/upload/presign", {
        method: "POST",
        body: { filename: file.name, content_type: file.type || "application/octet-stream", task_id: task.id }
      });
      await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const type = isImage ? "image" : isVideo ? "video" : "file";
      await sendMessage({ type, file_url, file_name: file.name, file_size: file.size, text: file.name });
    } catch(e) { alert("Ошибка загрузки: " + e.message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  // @mention handling
  function handleInput(e) {
    const val = e.target.value;
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setMention(users.filter(u => u.id !== user.id));
    } else if (lastAt !== -1 && val.slice(lastAt + 1).match(/^\w+$/)) {
      const q = val.slice(lastAt + 1).toLowerCase();
      setMention(users.filter(u => u.telegram.toLowerCase().startsWith(q) && u.id !== user.id));
    } else {
      setMention(null);
    }
  }

  function insertMention(tg) {
    const lastAt = text.lastIndexOf("@");
    const newText = text.slice(0, lastAt) + "@" + tg + " ";
    setText(newText);
    setMention(null);
    inputRef.current?.focus();
  }

  const msgUser = (msg) => users.find(u => u.id === msg.user_id) || { telegram: msg.telegram || "?", role: msg.role || "" };
  const isMe = (msg) => msg.user_id === user.id;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: 16, width: 560, height: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 80px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
            <div style={{ fontSize: 9, color: "#4b5563", fontFamily: "'JetBrains Mono',monospace" }}>чат · {messages.length} сообщ.</div>
          </div>
          <button onClick={onClose} style={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 6, width: 26, height: 26, cursor: "pointer", color: "#6b7280", fontSize: 14 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#2d2d44", fontSize: 12, marginTop: 40, fontFamily: "'JetBrains Mono',monospace" }}>
              💬 начните обсуждение рилса
            </div>
          )}
          {messages.map(msg => {
            const mu = msgUser(msg);
            const me = isMe(msg);
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: me ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                {!me && (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${rc(mu.role)},#7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {(mu.telegram||"?")[0].toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", gap: 3 }}>
                  {!me && <div style={{ fontSize: 9, color: rc(mu.role), fontFamily: "'JetBrains Mono',monospace", paddingLeft: 4 }}>@{mu.telegram}</div>}
                  <div style={{ background: me ? "#2d1a4e" : "#1a1a2e", border: `1px solid ${me ? "#7c3aed40" : "#2d2d44"}`, borderRadius: me ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "8px 12px", maxWidth: "100%" }}>
                    {/* Text with @mention highlight */}
                    {(msg.type === "text" || !msg.type) && (
                      <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word", color: "#f0eee8" }}>
                        {msg.text.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith("@") ? <span key={i} style={{ color: "#a78bfa", fontWeight: 600 }}>{part}</span> : part
                        )}
                      </div>
                    )}
                    {/* Image */}
                    {msg.type === "image" && (
                      <div>
                        <img src={msg.file_url} alt={msg.file_name} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block", marginBottom: msg.text && msg.text !== msg.file_name ? 6 : 0 }} />
                        {msg.text && msg.text !== msg.file_name && <div style={{ fontSize: 12, color: "#f0eee8" }}>{msg.text}</div>}
                      </div>
                    )}
                    {/* Video */}
                    {msg.type === "video" && (
                      <video src={msg.file_url} controls style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block" }} />
                    )}
                    {/* Voice */}
                    {msg.type === "voice" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎙️</span>
                        <audio src={msg.file_url} controls style={{ height: 32, width: 180 }} />
                      </div>
                    )}
                    {/* File */}
                    {msg.type === "file" && (
                      <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                        <span style={{ fontSize: 18 }}>📎</span>
                        <div>
                          <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{msg.file_name}</div>
                          <div style={{ fontSize: 10, color: "#4b5563" }}>{fmtSize(msg.file_size)}</div>
                        </div>
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: "#3d3d55", fontFamily: "'JetBrains Mono',monospace", paddingLeft: 4, paddingRight: 4 }}>{fmtTime(msg.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Mention suggestions */}
        {mention && mention.length > 0 && (
          <div style={{ borderTop: "1px solid #1e1e2e", padding: "6px 12px", display: "flex", gap: 6, flexWrap: "wrap", background: "#0d0d16" }}>
            {mention.map(u => (
              <button key={u.id} onClick={() => insertMention(u.telegram)} style={{ background: "#1a1a2e", border: `1px solid ${rc(u.role)}40`, borderRadius: 20, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: rc(u.role), fontFamily: "'JetBrains Mono',monospace" }}>
                @{u.telegram}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid #1e1e2e", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFile} accept="*/*" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: uploading ? "#4b5563" : "#6b7280", fontSize: 16, flexShrink: 0 }} title="Прикрепить файл">
            {uploading ? "⏳" : "📎"}
          </button>
          <VoiceRecorder onSend={(p) => sendMessage(p)} taskId={task.id} userId={user.id} />
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInput}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Сообщение... (@ для упоминания)"
            style={{ flex: 1, background: "#16161f", border: "1px solid #2d2d44", borderRadius: 10, padding: "9px 12px", color: "#f0eee8", fontSize: 13, fontFamily: "'Syne',sans-serif", outline: "none", resize: "none", minHeight: 40, maxHeight: 120, lineHeight: 1.5 }}
            rows={1}
          />
          <button onClick={() => sendMessage()} style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", border: "none", borderRadius: 10, padding: "9px 14px", cursor: "pointer", color: "#fff", fontSize: 16, flexShrink: 0 }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
