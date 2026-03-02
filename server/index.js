const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;
const INVITE_PASSWORD = process.env.INVITE_PASSWORD || "1290";
const ADMIN_TG = (process.env.ADMIN_TELEGRAM || "evg_vinogradov").toLowerCase();

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
      id TEXT PRIMARY KEY,
      telegram TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'Оператор',
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      project_id TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'idea',
      day BIGINT,
      assignee_id TEXT DEFAULT '',
      starred BOOLEAN DEFAULT FALSE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  `);

  // Safe migrations
  const cols = await q("SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'");
  const colNames = cols.map(c => c.column_name);
  if (!colNames.includes('starred')) await pool.query("ALTER TABLE tasks ADD COLUMN starred BOOLEAN DEFAULT FALSE");

  const ucols = await q("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  const ucolNames = ucols.map(c => c.column_name);
  if (!ucolNames.includes('is_admin')) await pool.query("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE");

  await pool.query(`
    INSERT INTO projects (id, label, color) VALUES
      ('brandx','Brand X','#ef4444'),('techco','TechCo','#3b82f6'),
      ('fashionlab','Fashion Lab','#ec4899'),('ecostore','EcoStore','#10b981')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log("Database ready, admin telegram:", ADMIN_TG);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { telegram, role, password, invite_password } = req.body;
    if (!telegram || !role || !password) return res.status(400).json({ error: "Заполните все поля" });
    if (invite_password !== INVITE_PASSWORD) return res.status(403).json({ error: "Неверный код приглашения" });
    const clean = telegram.replace(/^@/, "").toLowerCase().trim();
    if (await q1("SELECT id FROM users WHERE telegram = $1", [clean]))
      return res.status(409).json({ error: "Этот ник уже зарегистрирован" });
    const id = "user_" + uuidv4().replace(/-/g, "").slice(0, 12);
    const isAdmin = clean === ADMIN_TG;
    await q("INSERT INTO users (id, telegram, role, password_hash, is_admin) VALUES ($1,$2,$3,$4,$5)",
      [id, clean, role, simpleHash(password + clean), isAdmin]);
    res.json({ id, telegram: clean, role, is_admin: isAdmin });
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка сервера" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { telegram, password } = req.body;
    if (!telegram || !password) return res.status(400).json({ error: "Заполните все поля" });
    const clean = telegram.replace(/^@/, "").toLowerCase().trim();
    const user = await q1("SELECT * FROM users WHERE telegram = $1", [clean]);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    if (simpleHash(password + clean) !== user.password_hash) return res.status(401).json({ error: "Неверный пароль" });
    // Auto-grant admin if matches ADMIN_TG
    if (clean === ADMIN_TG && !user.is_admin) {
      await q("UPDATE users SET is_admin = TRUE WHERE id = $1", [user.id]);
      user.is_admin = true;
    }
    res.json({ id: user.id, telegram: user.telegram, role: user.role, is_admin: user.is_admin });
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка сервера" }); }
});

app.get("/api/users", async (req, res) => {
  try { res.json(await q("SELECT id, telegram, role, is_admin FROM users ORDER BY created_at ASC")); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Admin routes ──────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const adminTg = req.headers["x-admin-telegram"];
  if (!adminTg || adminTg.toLowerCase() !== ADMIN_TG) return res.status(403).json({ error: "Нет доступа" });
  next();
}

// Delete user
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await q("UPDATE tasks SET assignee_id = '' WHERE assignee_id = $1", [req.params.id]);
    await q("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// Reset user password
app.patch("/api/admin/users/:id/password", requireAdmin, async (req, res) => {
  try {
    const { new_password } = req.body;
    const user = await q1("SELECT telegram FROM users WHERE id = $1", [req.params.id]);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    await q("UPDATE users SET password_hash = $1 WHERE id = $2",
      [simpleHash(new_password + user.telegram), req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// Change user role
app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    await q("UPDATE users SET role = $1 WHERE id = $2", [role, req.params.id]);
    res.json(await q1("SELECT id, telegram, role, is_admin FROM users WHERE id = $1", [req.params.id]));
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// Full DB dump for admin
app.get("/api/admin/dump", requireAdmin, async (req, res) => {
  try {
    const [users, projects, tasks] = await Promise.all([
      q("SELECT id, telegram, role, is_admin, created_at FROM users ORDER BY created_at"),
      q("SELECT * FROM projects ORDER BY created_at"),
      q("SELECT * FROM tasks ORDER BY created_at"),
    ]);
    res.json({ users, projects, tasks });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Projects ──────────────────────────────────────────────────────────────────
app.get("/api/projects", async (req, res) => {
  try { res.json(await q("SELECT * FROM projects ORDER BY created_at ASC")); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.post("/api/projects", async (req, res) => {
  try {
    const { label, color } = req.body;
    if (!label || !color) return res.status(400).json({ error: "required" });
    const id = "proj_" + uuidv4().replace(/-/g, "").slice(0, 12);
    await q("INSERT INTO projects (id, label, color) VALUES ($1,$2,$3)", [id, label, color]);
    res.json({ id, label, color });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.delete("/api/projects/:id", async (req, res) => {
  try {
    await q("DELETE FROM tasks WHERE project_id = $1", [req.params.id]);
    await q("DELETE FROM projects WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/api/tasks", async (req, res) => {
  try { res.json(await q("SELECT * FROM tasks ORDER BY created_at ASC")); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, project_id, stage, day, assignee_id } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: "required" });
    const id = "task_" + uuidv4().replace(/-/g, "").slice(0, 12);
    await q("INSERT INTO tasks (id, title, description, project_id, stage, day, assignee_id, starred) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE)",
      [id, title, description || "", project_id, stage || "idea", day || null, assignee_id || ""]);
    res.json(await q1("SELECT * FROM tasks WHERE id = $1", [id]));
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const allowed = ["title", "description", "project_id", "stage", "day", "assignee_id", "starred"];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: "nothing to update" });
    const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const vals = fields.map(f => req.body[f] === undefined ? null : req.body[f]);
    await q(`UPDATE tasks SET ${sets} WHERE id = $${fields.length + 1}`, [...vals, req.params.id]);
    res.json(await q1("SELECT * FROM tasks WHERE id = $1", [req.params.id]));
  } catch(e) { console.error(e); res.status(500).json({ error: "Ошибка" }); }
});
app.delete("/api/tasks/:id", async (req, res) => {
  try { await q("DELETE FROM tasks WHERE id = $1", [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: "Ошибка" }); }
});

app.get("*", (req, res) => {
  const index = path.join(BUILD_PATH, "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.json({ status: "ContentFlow API" });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`ContentFlow API on port ${PORT}`)))
  .catch(err => { console.error("DB init failed:", err); process.exit(1); });
