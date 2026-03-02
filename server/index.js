const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { WebSocketServer } = require("ws");
const { Pool } = require("pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const INVITE_PASSWORD = process.env.INVITE_PASSWORD || "1290";
const ADMIN_TG = (process.env.ADMIN_TELEGRAM || "evg_vinogradov").toLowerCase();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "7ff81882f4e5d895f03bb7d791513075";
const R2_BUCKET = "contentflow-files";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || "deab66b8abc27bcfef91b38dc1a2f3ec",
    secretAccessKey: process.env.R2_SECRET_KEY || "8d05f7e693e8047c1ce72ba1c8fc5bdd6fcb157f0c0214a8606b87cf311a7b71",
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});
async function q(sql, p = []) { const { rows } = await pool.query(sql, p); return rows; }
async function q1(sql, p = []) { const { rows } = await pool.query(sql, p); return rows[0] || null; }

app.use(cors());
app.use(express.json());

const BUILD_PATH = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(BUILD_PATH)) app.use(express.static(BUILD_PATH));

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, telegram TEXT UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'Оператор',
      password_hash TEXT NOT NULL, is_admin BOOLEAN DEFAULT FALSE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, label TEXT NOT NULL, color TEXT NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
      project_id TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'idea',
      day BIGINT, assignee_id TEXT DEFAULT '', starred BOOLEAN DEFAULT FALSE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL, user_id TEXT NOT NULL,
      text TEXT DEFAULT '', type TEXT DEFAULT 'text',
      file_url TEXT DEFAULT '', file_name TEXT DEFAULT '', file_size BIGINT DEFAULT 0,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS message_reads (
      user_id TEXT NOT NULL, task_id TEXT NOT NULL, last_read_at BIGINT DEFAULT 0,
      PRIMARY KEY (user_id, task_id)
    );
  `);

  const tcols = (await q("SELECT column_name FROM information_schema.columns WHERE table_name='tasks'")).map(r=>r.column_name);
  if (!tcols.includes('starred')) await pool.query("ALTER TABLE tasks ADD COLUMN starred BOOLEAN DEFAULT FALSE");
  const ucols = (await q("SELECT column_name FROM information_schema.columns WHERE table_name='users'")).map(r=>r.column_name);
  if (!ucols.includes('is_admin')) await pool.query("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE");

  await pool.query(`
    INSERT INTO projects (id,label,color) VALUES
      ('brandx','Brand X','#ef4444'),('techco','TechCo','#3b82f6'),
      ('fashionlab','Fashion Lab','#ec4899'),('ecostore','EcoStore','#10b981')
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log("Database ready");
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
const clients = new Map();
wss.on("connection", (ws) => {
  let userId = null;
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "auth") {
        userId = msg.userId;
        if (!clients.has(userId)) clients.set(userId, new Set());
        clients.get(userId).add(ws);
      }
    } catch {}
  });
  ws.on("close", () => {
    if (userId && clients.has(userId)) {
      clients.get(userId).delete(ws);
      if (clients.get(userId).size === 0) clients.delete(userId);
    }
  });
});

function broadcast(taskId, message) {
  const payload = JSON.stringify({ type: "message", taskId, message });
  clients.forEach((sockets) => {
    sockets.forEach((ws) => { if (ws.readyState === 1) ws.send(payload); });
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { telegram, role, password, invite_password } = req.body;
    if (!telegram || !role || !password) return res.status(400).json({ error: "Заполните все поля" });
    if (invite_password !== INVITE_PASSWORD) return res.status(403).json({ error: "Неверный код приглашения" });
    const clean = telegram.replace(/^@/, "").toLowerCase().trim();
    if (await q1("SELECT id FROM users WHERE telegram=$1", [clean]))
      return res.status(409).json({ error: "Ник уже занят" });
    const id = "user_" + uuidv4().replace(/-/g,"").slice(0,12);
    const isAdmin = clean === ADMIN_TG;
    await q("INSERT INTO users (id,telegram,role,password_hash,is_admin) VALUES ($1,$2,$3,$4,$5)",
      [id, clean, role, simpleHash(password + clean), isAdmin]);
    res.json({ id, telegram: clean, role, is_admin: isAdmin });
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { telegram, password } = req.body;
    if (!telegram || !password) return res.status(400).json({ error: "Заполните все поля" });
    const clean = telegram.replace(/^@/, "").toLowerCase().trim();
    const user = await q1("SELECT * FROM users WHERE telegram=$1", [clean]);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    if (simpleHash(password + clean) !== user.password_hash) return res.status(401).json({ error: "Неверный пароль" });
    if (clean === ADMIN_TG && !user.is_admin) {
      await q("UPDATE users SET is_admin=TRUE WHERE id=$1", [user.id]);
      user.is_admin = true;
    }
    res.json({ id: user.id, telegram: user.telegram, role: user.role, is_admin: user.is_admin });
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});

app.get("/api/users", async (req, res) => {
  try { res.json(await q("SELECT id,telegram,role,is_admin FROM users ORDER BY created_at")); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Admin ─────────────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if ((req.headers["x-admin-telegram"]||"").toLowerCase() !== ADMIN_TG)
    return res.status(403).json({ error: "Нет доступа" });
  next();
}
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await q("UPDATE tasks SET assignee_id='' WHERE assignee_id=$1", [req.params.id]);
    await q("DELETE FROM users WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.patch("/api/admin/users/:id/password", requireAdmin, async (req, res) => {
  try {
    const user = await q1("SELECT telegram FROM users WHERE id=$1", [req.params.id]);
    if (!user) return res.status(404).json({ error: "Не найден" });
    await q("UPDATE users SET password_hash=$1 WHERE id=$2",
      [simpleHash(req.body.new_password + user.telegram), req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    await q("UPDATE users SET role=$1 WHERE id=$2", [req.body.role, req.params.id]);
    res.json(await q1("SELECT id,telegram,role,is_admin FROM users WHERE id=$1", [req.params.id]));
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.get("/api/admin/dump", requireAdmin, async (req, res) => {
  try {
    const [users, projects, tasks, messages] = await Promise.all([
      q("SELECT id,telegram,role,is_admin,created_at FROM users ORDER BY created_at"),
      q("SELECT * FROM projects ORDER BY created_at"),
      q("SELECT * FROM tasks ORDER BY created_at"),
      q("SELECT * FROM messages ORDER BY created_at DESC LIMIT 200"),
    ]);
    res.json({ users, projects, tasks, messages });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Projects ──────────────────────────────────────────────────────────────────
app.get("/api/projects", async (req, res) => {
  try { res.json(await q("SELECT * FROM projects ORDER BY created_at")); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.post("/api/projects", async (req, res) => {
  try {
    const { label, color } = req.body;
    const id = "proj_" + uuidv4().replace(/-/g,"").slice(0,12);
    await q("INSERT INTO projects (id,label,color) VALUES ($1,$2,$3)", [id, label, color]);
    res.json({ id, label, color });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.delete("/api/projects/:id", async (req, res) => {
  try {
    await q("DELETE FROM messages WHERE task_id IN (SELECT id FROM tasks WHERE project_id=$1)", [req.params.id]);
    await q("DELETE FROM tasks WHERE project_id=$1", [req.params.id]);
    await q("DELETE FROM projects WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/api/tasks", async (req, res) => {
  try { res.json(await q("SELECT * FROM tasks ORDER BY created_at")); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, project_id, stage, day, assignee_id } = req.body;
    const id = "task_" + uuidv4().replace(/-/g,"").slice(0,12);
    await q("INSERT INTO tasks (id,title,description,project_id,stage,day,assignee_id,starred) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE)",
      [id, title, description||"", project_id, stage||"idea", day||null, assignee_id||""]);
    res.json(await q1("SELECT * FROM tasks WHERE id=$1", [id]));
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const allowed = ["title","description","project_id","stage","day","assignee_id","starred"];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: "nothing" });
    const sets = fields.map((f,i) => `${f}=$${i+1}`).join(", ");
    await q(`UPDATE tasks SET ${sets} WHERE id=$${fields.length+1}`,
      [...fields.map(f => req.body[f]??null), req.params.id]);
    res.json(await q1("SELECT * FROM tasks WHERE id=$1", [req.params.id]));
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await q("DELETE FROM messages WHERE task_id=$1", [req.params.id]);
    await q("DELETE FROM message_reads WHERE task_id=$1", [req.params.id]);
    await q("DELETE FROM tasks WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Messages ──────────────────────────────────────────────────────────────────
app.get("/api/tasks/:taskId/messages", async (req, res) => {
  try {
    const msgs = await q(
      `SELECT m.*, u.telegram, u.role FROM messages m
       LEFT JOIN users u ON m.user_id=u.id
       WHERE m.task_id=$1 ORDER BY m.created_at ASC`,
      [req.params.taskId]
    );
    res.json(msgs);
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

app.post("/api/tasks/:taskId/messages", async (req, res) => {
  try {
    const { user_id, text, type, file_url, file_name, file_size } = req.body;
    const id = "msg_" + uuidv4().replace(/-/g,"").slice(0,12);
    await q("INSERT INTO messages (id,task_id,user_id,text,type,file_url,file_name,file_size) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, req.params.taskId, user_id, text||"", type||"text", file_url||"", file_name||"", file_size||0]);
    const msg = await q1(
      `SELECT m.*, u.telegram, u.role FROM messages m
       LEFT JOIN users u ON m.user_id=u.id WHERE m.id=$1`, [id]
    );
    broadcast(req.params.taskId, msg);
    res.json(msg);
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});

app.post("/api/tasks/:taskId/messages/read", async (req, res) => {
  try {
    const { user_id } = req.body;
    await q(
      `INSERT INTO message_reads (user_id,task_id,last_read_at) VALUES ($1,$2,$3)
       ON CONFLICT (user_id,task_id) DO UPDATE SET last_read_at=$3`,
      [user_id, req.params.taskId, Date.now()]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

app.get("/api/unread/:userId", async (req, res) => {
  try {
    const rows = await q(
      `SELECT m.task_id, COUNT(*)::int as count FROM messages m
       LEFT JOIN message_reads mr ON mr.task_id=m.task_id AND mr.user_id=$1
       WHERE m.user_id!=$1 AND m.created_at>COALESCE(mr.last_read_at,0)
       GROUP BY m.task_id`,
      [req.params.userId]
    );
    const result = {};
    rows.forEach(r => { result[r.task_id] = r.count; });
    res.json(result);
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── R2 presigned upload URL ───────────────────────────────────────────────────
app.post("/api/upload/presign", async (req, res) => {
  try {
    const { filename, content_type, task_id } = req.body;
    const ext = (filename.split(".").pop()||"bin").toLowerCase();
    const key = `tasks/${task_id}/${uuidv4()}.${ext}`;
    const cmd = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: content_type });
    const upload_url = await getSignedUrl(R2, cmd, { expiresIn: 3600 });
    const file_url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
    res.json({ upload_url, key, file_url });
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка получения URL: " + e.message }); }
});

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  const index = path.join(BUILD_PATH, "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.json({ status: "ContentFlow API" });
});

initDb()
  .then(() => server.listen(PORT, () => console.log(`ContentFlow API on port ${PORT}`)))
  .catch(err => { console.error("DB init failed:", err); process.exit(1); });
