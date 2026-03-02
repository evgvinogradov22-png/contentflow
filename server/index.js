const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Database setup ---
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "contentflow.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
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
    assignee TEXT DEFAULT '',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Seed default projects if empty
  INSERT OR IGNORE INTO projects (id, label, color) VALUES
    ('brandx',     'Brand X',     '#ef4444'),
    ('techco',     'TechCo',      '#3b82f6'),
    ('fashionlab', 'Fashion Lab', '#ec4899'),
    ('ecostore',   'EcoStore',    '#10b981');
`);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Serve React build in production
const BUILD_PATH = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(BUILD_PATH)) {
  app.use(express.static(BUILD_PATH));
}

// --- API Routes ---

// GET all projects
app.get("/api/projects", (req, res) => {
  const projects = db.prepare("SELECT * FROM projects ORDER BY created_at ASC").all();
  res.json(projects);
});

// POST create project
app.post("/api/projects", (req, res) => {
  const { label, color } = req.body;
  if (!label || !color) return res.status(400).json({ error: "label and color required" });
  const id = "proj_" + uuidv4().replace(/-/g, "").slice(0, 12);
  db.prepare("INSERT INTO projects (id, label, color) VALUES (?, ?, ?)").run(id, label, color);
  res.json({ id, label, color });
});

// DELETE project (also deletes tasks via CASCADE)
app.delete("/api/projects/:id", (req, res) => {
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET all tasks
app.get("/api/tasks", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at ASC").all();
  res.json(tasks);
});

// POST create task
app.post("/api/tasks", (req, res) => {
  const { title, description, project_id, stage, day, assignee } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: "title and project_id required" });
  const id = "task_" + uuidv4().replace(/-/g, "").slice(0, 12);
  db.prepare(
    "INSERT INTO tasks (id, title, description, project_id, stage, day, assignee) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, title, description || "", project_id, stage || "idea", day || null, assignee || "");
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.json(task);
});

// PATCH update task
app.patch("/api/tasks/:id", (req, res) => {
  const allowed = ["title", "description", "project_id", "stage", "day", "assignee"];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: "nothing to update" });
  const sets = fields.map(f => `${f} = ?`).join(", ");
  const values = fields.map(f => req.body[f] === undefined ? null : req.body[f]);
  db.prepare(`UPDATE tasks SET ${sets} WHERE id = ?`).run(...values, req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json(task);
});

// DELETE task
app.delete("/api/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Fallback to React app
app.get("*", (req, res) => {
  const index = path.join(BUILD_PATH, "index.html");
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.json({ status: "API running", docs: "/api/projects, /api/tasks" });
  }
});

app.listen(PORT, () => {
  console.log(`ContentFlow API running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
