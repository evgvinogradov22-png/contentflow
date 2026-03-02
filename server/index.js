const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const app = express();
const PORT = process.env.PORT || 3001;
const INVITE_PASSWORD = process.env.INVITE_PASSWORD || "1290";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "contentflow.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

app.use(cors());
app.use(express.json());

const BUILD_PATH = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(BUILD_PATH)) app.use(express.static(BUILD_PATH));

// ── sql.js wrapper — makes it feel like better-sqlite3 ────────────────────────
let db;
let saveTimer;

function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }, 300);
}

// run() — executes write SQL, returns nothing
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// get() — returns first row as object or undefined
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

// all() — returns array of row objects
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// exec() — for multi-statement DDL
function exec(sql) {
  db.run(sql);
  saveDb();
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log("Loaded existing database");
  } else {
    db = new SQL.Database();
    console.log("Created new database");
  }

  // Schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'Оператор',
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      project_id TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'idea',
      day INTEGER,
      assignee_id TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);

  // Seed default projects
  db.run(`INSERT OR IGNORE INTO projects (id, label, color) VALUES
    ('brandx',     'Brand X',     '#ef4444'),
    ('techco',     'TechCo',      '#3b82f6'),
    ('fashionlab', 'Fashion Lab', '#ec4899'),
    ('ecostore',   'EcoStore',    '#10b981');
  `);

  // Migration: rename assignee -> assignee_id
  try {
    const cols = all("PRAGMA table_info(tasks)").map(c => c.name);
    if (cols.includes("assignee") && !cols.includes("assignee_id")) {
      db.run("ALTER TABLE tasks RENAME COLUMN assignee TO assignee_id");
      console.log("Migrated: assignee -> assignee_id");
    }
  } catch (e) { console.log("Migration skipped:", e.message); }

  saveDb();

  // ── Auth ────────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", (req, res) => {
    const { telegram, role, password, invite_password } = req.body;
    if (!telegram || !role || !password) return res.status(400).json({ error: "Заполните все поля" });
    if (invite_password !== INVITE_PASSWORD) return res.status(403).json({ error: "Неверный код приглашения" });
    const clean = telegram.replace(/^@/, "").toLowerCase().trim();
    if (get("SELECT id FROM users WHERE telegram = ?", [clean]))
      return res.status(409).json({ error: "Этот ник уже зарегистрирован" });
    const id = "user_" + uuidv4().replace(/-/g, "").slice(0, 12);
    run("INSERT INTO users (id, telegram, role, password_hash) VALUES (?, ?, ?, ?)",
      [id, clean, role, simpleHash(password + clean)]);
    res.json({ id, telegram: clean, role });
  });

  app.post("/api/auth/login", (req, res) => {
    const { telegram, password } = req.body;
    if (!telegram || !password) return res.status(400).json({ error: "Заполните все поля" });
    const clean = telegram.replace(/^@/, "").toLowerCase().trim();
    const user = get("SELECT * FROM users WHERE telegram = ?", [clean]);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    if (simpleHash(password + clean) !== user.password_hash)
      return res.status(401).json({ error: "Неверный пароль" });
    res.json({ id: user.id, telegram: user.telegram, role: user.role });
  });

  app.get("/api/users", (req, res) => {
    res.json(all("SELECT id, telegram, role FROM users ORDER BY created_at ASC"));
  });

  // ── Projects ─────────────────────────────────────────────────────────────────
  app.get("/api/projects", (req, res) => {
    res.json(all("SELECT * FROM projects ORDER BY created_at ASC"));
  });
  app.post("/api/projects", (req, res) => {
    const { label, color } = req.body;
    if (!label || !color) return res.status(400).json({ error: "required" });
    const id = "proj_" + uuidv4().replace(/-/g, "").slice(0, 12);
    run("INSERT INTO projects (id, label, color) VALUES (?, ?, ?)", [id, label, color]);
    res.json({ id, label, color });
  });
  app.delete("/api/projects/:id", (req, res) => {
    run("DELETE FROM tasks WHERE project_id = ?", [req.params.id]);
    run("DELETE FROM projects WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  });

  // ── Tasks ────────────────────────────────────────────────────────────────────
  app.get("/api/tasks", (req, res) => {
    res.json(all("SELECT * FROM tasks ORDER BY created_at ASC"));
  });
  app.post("/api/tasks", (req, res) => {
    const { title, description, project_id, stage, day, assignee_id } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: "required" });
    const id = "task_" + uuidv4().replace(/-/g, "").slice(0, 12);
    run("INSERT INTO tasks (id, title, description, project_id, stage, day, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, title, description || "", project_id, stage || "idea", day || null, assignee_id || ""]);
    res.json(get("SELECT * FROM tasks WHERE id = ?", [id]));
  });
  app.patch("/api/tasks/:id", (req, res) => {
    const allowed = ["title", "description", "project_id", "stage", "day", "assignee_id"];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: "nothing to update" });
    run(
      `UPDATE tasks SET ${fields.map(f => f + " = ?").join(", ")} WHERE id = ?`,
      [...fields.map(f => req.body[f] === undefined ? null : req.body[f]), req.params.id]
    );
    res.json(get("SELECT * FROM tasks WHERE id = ?", [req.params.id]));
  });
  app.delete("/api/tasks/:id", (req, res) => {
    run("DELETE FROM tasks WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  });

  // ── Fallback ──────────────────────────────────────────────────────────────────
  app.get("*", (req, res) => {
    const index = path.join(BUILD_PATH, "index.html");
    if (fs.existsSync(index)) res.sendFile(index);
    else res.json({ status: "ContentFlow API running" });
  });

  app.listen(PORT, () => console.log(`ContentFlow API on port ${PORT}`));
}

boot().catch(err => { console.error("Boot failed:", err); process.exit(1); });
