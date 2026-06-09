# ⚽ World Cup 2026

A full-stack web application that displays FIFA World Cup 2026 match schedules, team badges, player rosters, and the latest football news.

![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react)
![Flask](https://img.shields.io/badge/Backend-Flask_3-000000?logo=flask)
![Vite](https://img.shields.io/badge/Bundler-Vite_8-646CFF?logo=vite)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)

---

## Features

- **World Cup 2026 Match Schedule** — Live match data pulled from TheSportsDB API
- **Team Badges** — Home and away team badges displayed for every fixture
- **Team Search** — Filter matches in real time by team name
- **Player Rosters** — Look up players for any team via TheSportsDB
- **Football News** — Latest football headlines powered by NewsAPI
- **Responsive Layout** — Clean card-based UI built with React

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 19, Vite 8                  |
| Backend   | Python 3, Flask 3, Flask-CORS     |
| Data      | TheSportsDB API (free tier)       |
| News      | NewsAPI (`/v2/everything`)        |
| Deploy    | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
football-news-platform/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Template for environment variables
│   └── .env                # ← NOT committed (gitignored)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example        # Template for frontend env vars
├── render.yaml             # Render deployment config
├── vercel.json             # Vercel deployment config
├── .gitignore
└── README.md
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [NewsAPI](https://newsapi.org/) API key (free tier)

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create your `.env` file from the template:

```bash
cp .env.example .env
# Then edit .env and add your real NEWS_API_KEY
```

Start the Flask server:

```bash
python app.py
```

The API runs at `http://127.0.0.1:5000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/`                 | Returns all World Cup 2026 match fixtures |
| GET    | `/news`             | Returns latest football news articles    |
| GET    | `/players/<team_id>`| Returns up to 10 players for a team      |

---

## External APIs

### TheSportsDB
- **URL**: `https://www.thesportsdb.com`
- **Usage**: Match schedule, team badges, player data for World Cup 2026 (league ID `4429`, season `2026`)
- **Key**: Free tier API key `123` — no signup required

### NewsAPI
- **URL**: `https://newsapi.org`
- **Usage**: `/v2/everything?q=football` — latest English-language football headlines
- **Key**: Requires a free API key stored in `backend/.env` as `NEWS_API_KEY`

---

## Deployment

### Backend → Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — confirm settings
5. Add environment variable: `NEWS_API_KEY = <your key>`
6. Deploy — your backend URL will be `https://<service>.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable: `VITE_API_URL = https://<your-render-service>.onrender.com`
5. Deploy — Vercel auto-runs `npm run build`

See [DEPLOYMENT.md](#deployment) section below for full step-by-step instructions.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                        | Required |
|----------------|------------------------------------|----------|
| `NEWS_API_KEY` | Your NewsAPI.org API key           | Yes      |

### Frontend (`frontend/.env.local`)

| Variable        | Description                              | Required       |
|-----------------|------------------------------------------|----------------|
| `VITE_API_URL`  | Full URL of the deployed Flask backend   | Production only |

---

## Security Notes

- `.env` is listed in `.gitignore` and is **never committed**
- Use `.env.example` files as templates — they contain no real secrets
- Set `NEWS_API_KEY` as a **Render environment variable** in the dashboard
- Set `VITE_API_URL` as a **Vercel environment variable** in the dashboard

---

## License

MIT — free to use and modify.
