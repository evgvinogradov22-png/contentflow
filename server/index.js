const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;
const INVITE_PASSWORD = process.env.INVITE_PASSWORD || "1290";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "contentflow.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Оператор',
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    project_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'idea',
    day INTEGER,
    assignee_id TEXT DEFAULT '',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  INSERT OR IGNORE INTO projects (id, label, color) VALUES
    ('brandx',     'Brand X',     '#ef4444'),
    ('techco',     'TechCo',      '#3b82f6'),
    ('fashionlab', 'Fashion Lab', '#ec4899'),
    ('ecostore',   'EcoStore',    '#10b981');
`);

app.use(cors());
app.use(express.json());

const BUILD_PATH = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(BUILD_PATH)) app.use(express.static(BUILD_PATH));

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/register", (req, res) => {
  const { telegram, role, password, invite_password } = req.body;
  if (!telegram || !role || !password) return res.status(400).json({ error: "Заполните все поля" });
  if (invite_password !== INVITE_PASSWORD) return res.status(403).json({ error: "Неверный код приглашения" });
  const clean = telegram.replace(/^@/, "").toLowerCase().trim();
  if (db.prepare("SELECT id FROM users WHERE telegram = ?").get(clean))
    return res.status(409).json({ error: "Этот ник уже зарегистрирован" });
  const id = "user_" + uuidv4().replace(/-/g, "").slice(0, 12);
  db.prepare("INSERT INTO users (id, telegram, role, password_hash) VALUES (?, ?, ?, ?)").run(id, clean, role, simpleHash(password + clean));
  res.json({ id, telegram: clean, role });
});

app.post("/api/auth/login", (req, res) => {
  const { telegram, password } = req.body;
  if (!telegram || !password) return res.status(400).json({ error: "Заполните все поля" });
  const clean = telegram.replace(/^@/, "").toLowerCase().trim();
  const user = db.prepare("SELECT * FROM users WHERE telegram = ?").get(clean);
  if (!user) return res.status(401).json({ error: "Пользователь не найден" });
  if (simpleHash(password + clean) !== user.password_hash) return res.status(401).json({ error: "Неверный пароль" });
  res.json({ id: user.id, telegram: user.telegram, role: user.role });
});

app.get("/api/users", (req, res) => {
  res.json(db.prepare("SELECT id, telegram, role FROM users ORDER BY created_at ASC").all());
});

// ── Projects ──────────────────────────────────────────────────────────────────
app.get("/api/projects", (req, res) => {
  res.json(db.prepare("SELECT * FROM projects ORDER BY created_at ASC").all());
});
app.post("/api/projects", (req, res) => {
  const { label, color } = req.body;
  if (!label || !color) return res.status(400).json({ error: "required" });
  const id = "proj_" + uuidv4().replace(/-/g, "").slice(0, 12);
  db.prepare("INSERT INTO projects (id, label, color) VALUES (?, ?, ?)").run(id, label, color);
  res.json({ id, label, color });
});
app.delete("/api/projects/:id", (req, res) => {
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/api/tasks", (req, res) => {
  res.json(db.prepare("SELECT * FROM tasks ORDER BY created_at ASC").all());
});
app.post("/api/tasks", (req, res) => {
  const { title, description, project_id, stage, day, assignee_id } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: "required" });
  const id = "task_" + uuidv4().replace(/-/g, "").slice(0, 12);
  db.prepare("INSERT INTO tasks (id, title, description, project_id, stage, day, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, title, description || "", project_id, stage || "idea", day || null, assignee_id || "");
  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id));
});
app.patch("/api/tasks/:id", (req, res) => {
  const allowed = ["title", "description", "project_id", "stage", "day", "assignee_id"];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: "nothing to update" });
  db.prepare(`UPDATE tasks SET ${fields.map(f => f + " = ?").join(", ")} WHERE id = ?`)
    .run(...fields.map(f => req.body[f] === undefined ? null : req.body[f]), req.params.id);
  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id));
});
app.delete("/api/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  const index = path.join(BUILD_PATH, "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.json({ status: "ContentFlow API" });
});

app.listen(PORT, () => console.log(`ContentFlow API on port ${PORT}`));
