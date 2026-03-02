# ContentFlow — SMM Production Calendar

Планировщик производства контента для SMM-агентства.

---

## 🚀 Деплой на Railway (рекомендуется, бесплатно)

### Шаг 1 — Загрузите на GitHub
1. Зайдите на [github.com](https://github.com) → New repository
2. Назовите `contentflow` → Create repository
3. Скачайте [GitHub Desktop](https://desktop.github.com/) или используйте сайт
4. Перетащите все файлы этой папки в репозиторий → Commit → Push

### Шаг 2 — Задеплойте на Railway
1. Зайдите на [railway.app](https://railway.app) → Login with GitHub
2. New Project → Deploy from GitHub repo → выберите `contentflow`
3. Railway автоматически соберёт и запустит проект
4. Через 2-3 минуты появится ссылка вида `contentflow-production.up.railway.app`

**Готово!** Откройте ссылку — платформа работает, данные сохраняются.

---

## 🔧 Деплой на Render (альтернатива)

1. Загрузите на GitHub (см. Шаг 1 выше)
2. Зайдите на [render.com](https://render.com) → New → Web Service
3. Подключите репозиторий
4. Build Command: `npm run build`
5. Start Command: `npm start`
6. Deploy

---

## 💻 Запуск локально (для разработки)

```bash
# Установить зависимости
cd server && npm install
cd ../client && npm install

# Запустить бэкенд (в одном терминале)
cd server && npm start

# Запустить фронтенд (в другом терминале)  
cd client && npm start
```

Открыть: http://localhost:3000

---

## 📦 Структура проекта

```
contentflow/
├── client/          # React frontend
│   └── src/App.js   # Главный компонент
├── server/          # Express backend
│   ├── index.js     # API + SQLite
│   └── data/        # База данных (создаётся автоматически)
├── package.json     # Корневой (для Railway)
└── railway.toml     # Конфиг Railway
```

## 🗄️ API

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/projects | Все проекты |
| POST | /api/projects | Создать проект |
| DELETE | /api/projects/:id | Удалить проект |
| GET | /api/tasks | Все задачи |
| POST | /api/tasks | Создать задачу |
| PATCH | /api/tasks/:id | Обновить задачу |
| DELETE | /api/tasks/:id | Удалить задачу |
