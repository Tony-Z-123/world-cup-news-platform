# Football Platform

A full-stack football web application built with React and Flask. The current version focuses on **World Cup 2026 match schedules** and **live football news**, with plans to expand into a general-purpose football platform.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)
![Backend on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)

---

## Live Demo

**Frontend:** [https://world-cup-news-platform.vercel.app](https://world-cup-news-platform.vercel.app)

> The backend runs on Render's free tier and may take ~30 seconds to wake up on the first request.

---

## Overview

Football Platform is a full-stack web app that aggregates football data from multiple APIs and presents it in a clean, card-based UI. Users can browse World Cup 2026 fixtures, view team badges, search by team name, explore player rosters, and read the latest football headlines — all in one place.

The project is structured as a **monorepo** with a React frontend deployed on Vercel and a Flask REST API deployed on Render.

---

## Features

- **World Cup 2026 Fixtures** — Full match schedule with dates, venues, and group info
- **Team Badges** — Home and away badges displayed on every fixture card
- **Team Search** — Real-time client-side filtering by team name
- **Player Rosters** — Browse up to 10 players per team via TheSportsDB
- **Football News** — Latest English-language headlines powered by NewsAPI
- **Responsive Layout** — Clean card-based design that works on all screen sizes
- **Environment-based API URLs** — Frontend/backend connection fully configurable via env vars

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, plain CSS |
| Backend | Python 3.11, Flask 3.1, Flask-CORS |
| Match Data | [TheSportsDB API](https://www.thesportsdb.com) (free tier) |
| News Data | [NewsAPI](https://newsapi.org) (`/v2/everything`) |
| Frontend Deploy | [Vercel](https://vercel.com) |
| Backend Deploy | [Render](https://render.com) |

---

## Project Structure

```
football-news-platform/
├── backend/
│   ├── app.py               # Flask REST API (matches, news, players)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── vercel.json          # Vercel deployment config
│   └── .env.example         # Frontend environment variable template
├── render.yaml              # Render deployment config
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | All World Cup 2026 fixtures |
| `GET` | `/news` | Latest football news articles |
| `GET` | `/players/<team_id>` | Player roster for a given team |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [NewsAPI](https://newsapi.org) key

### 1. Clone the repository

```bash
git clone https://github.com/Tony-Z-123/world-cup-news-platform.git
cd world-cup-news-platform
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create your local `.env` file:

```bash
cp .env.example .env
# Open .env and add your NEWS_API_KEY
```

Start the Flask server:

```bash
python app.py
# Runs at http://127.0.0.1:5000
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

---

## Environment Variables

### Backend — `backend/.env`

```
NEWS_API_KEY=YOUR_API_KEY_HERE
```

Get a free key at [newsapi.org](https://newsapi.org).

### Frontend — `frontend/.env.local`

```
VITE_API_URL=YOUR_BACKEND_URL
```

In local development this can be omitted — the app defaults to `http://127.0.0.1:5000`.
In production, set this to your Render backend URL in the Vercel dashboard.

> **Never commit `.env` or `.env.local` files.** Both are covered by `.gitignore`.

---

## Deployment

| Service | Platform | Config file |
|---|---|---|
| Flask backend | [Render](https://render.com) | `render.yaml` |
| React frontend | [Vercel](https://vercel.com) | `frontend/vercel.json` |

**Render:** Connect the GitHub repo, set `NEWS_API_KEY` as an environment variable in the dashboard, and deploy. The `render.yaml` handles the rest.

**Vercel:** Import the GitHub repo, set Root Directory to `frontend`, add `VITE_API_URL` pointing to your Render backend URL, and deploy.

---

## Future Improvements

- [ ] Add live match scores and real-time updates
- [ ] Add a dedicated team profile page with full squad and stats
- [ ] Support multiple leagues beyond World Cup (Premier League, Champions League, etc.)
- [ ] Add user authentication and favourite teams
- [ ] Improve mobile layout and add dark mode
- [ ] Add caching layer to reduce external API calls

---

## Author

**Tony Z**
- GitHub: [@Tony-Z-123](https://github.com/Tony-Z-123)
- Project: [world-cup-news-platform](https://github.com/Tony-Z-123/world-cup-news-platform)

---

## License

MIT — free to use and modify.
