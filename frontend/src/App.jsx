import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import BracketPage from "./pages/BracketPage";
import StandingsPage from "./pages/StandingsPage";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function App() {
  const [matches, setMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [standings, setStandings] = useState([]);
  const [bracket, setBracket] = useState([]);
  const [error, setError] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [loadingBracket, setLoadingBracket] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Matches request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMatches(Array.isArray(data) ? data : []);
        setLoadingMatches(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingMatches(false);
      });

    fetch(`${API_URL}/news`)
      .then((res) => {
        if (!res.ok) throw new Error(`News request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setNews(Array.isArray(data) ? data : []);
        setLoadingNews(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingNews(false);
      });

    fetch(`${API_URL}/standings`)
      .then((res) => {
        if (!res.ok) throw new Error(`Standings request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStandings(Array.isArray(data) ? data : []);
        setLoadingStandings(false);
      })
      .catch(() => setLoadingStandings(false));

    fetch(`${API_URL}/bracket`)
      .then((res) => {
        if (!res.ok) throw new Error(`Bracket request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setBracket(Array.isArray(data) ? data : []);
        setLoadingBracket(false);
      })
      .catch(() => setLoadingBracket(false));
  }, []);

  return (
    <BrowserRouter>
      <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto", fontFamily: "Arial" }}>
        {/* ── Global styles ── */}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .skeleton {
            background: linear-gradient(90deg, #ececec 25%, #e0e0e0 50%, #ececec 75%);
            background-size: 200% 100%;
            animation: shimmer 1.4s infinite;
            border-radius: 15px;
          }
          .page-btn {
            padding: 8px 22px;
            border-radius: 8px;
            border: 1px solid #ddd;
            font-size: 14px;
            cursor: pointer;
            background: #fff;
            transition: background 0.2s, box-shadow 0.2s;
          }
          .page-btn:hover:not(:disabled) {
            background: #f5f5f5;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          }
          .page-btn:disabled { background: #f5f5f5; color: #aaa; cursor: not-allowed; }

          /* ── Championship Hero ── */
          .champ-hero {
            display: flex;
            align-items: center;
            gap: 20px;
            background: linear-gradient(135deg, #c8960c 0%, #f5c518 40%, #e8a800 100%);
            border-radius: 18px;
            box-shadow: 0 6px 24px rgba(200,150,12,0.35);
            padding: 28px 30px;
            margin-bottom: 28px;
            flex-wrap: wrap;
            overflow: hidden;
          }
          .champ-hero-img {
            width: 220px;
            height: 160px;
            object-fit: cover;
            border-radius: 12px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.30);
            flex-shrink: 0;
            order: -1;
          }
          @media (max-width: 620px) {
            .champ-hero-img {
              width: 100%;
              height: 200px;
              order: 0;
            }
          }
          .champ-trophy {
            font-size: 64px;
            line-height: 1;
            flex-shrink: 0;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.18));
          }
          .champ-body { flex: 1; min-width: 200px; }
          .champ-eyebrow {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.85);
            margin: 0 0 6px;
          }
          .champ-title {
            font-size: 28px;
            font-weight: 900;
            color: #fff;
            margin: 0 0 8px;
            text-shadow: 0 2px 6px rgba(0,0,0,0.18);
          }
          .champ-result {
            font-size: 15px;
            color: rgba(255,255,255,0.92);
            margin: 0 0 8px;
            letter-spacing: 0.3px;
          }
          .champ-result strong { font-size: 18px; color: #fff; }
          .champ-subtitle {
            font-size: 13px;
            color: rgba(255,255,255,0.82);
            margin: 0;
            line-height: 1.5;
          }

          /* ── Awards ── */
          .awards-heading {
            font-size: 16px;
            font-weight: 700;
            color: #1a3c6b;
            margin: 0 0 16px;
          }
          .awards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 36px;
            align-items: stretch;
          }
          .award-card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            padding: 22px 18px 18px;
            text-align: center;
            border-top: 3px solid #f5c518;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          /* Circular portrait */
          .award-portrait {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            object-fit: cover;
            object-position: top center;
            border: 3px solid #f5c518;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            margin-bottom: 14px;
            flex-shrink: 0;
          }
          /* Emoji shown only when portrait image fails */
          .award-icon-fallback { font-size: 34px; margin-bottom: 10px; }
          .award-label {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #c8960c;
            margin: 0 0 6px;
          }
          .award-winner {
            font-size: 17px;
            font-weight: 800;
            color: #1a3c6b;
            margin: 0 0 4px;
          }
          .award-subtitle {
            font-size: 12px;
            color: #888;
            margin: 0;
          }

          /* ── Standings ── */
          .standings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }
          .standings-card { background: #fff; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden; }
          .standings-card-header { background: #1a6b3a; color: #fff; padding: 10px 16px; font-weight: bold; font-size: 15px; letter-spacing: 0.5px; }
          .standings-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .standings-table th { background: #f5f5f5; padding: 7px 10px; text-align: center; color: #555; font-weight: 600; border-bottom: 1px solid #eee; }
          .standings-table th:first-child { text-align: left; padding-left: 12px; }
          .standings-table td { padding: 8px 10px; text-align: center; border-bottom: 1px solid #f0f0f0; color: #333; }
          .standings-table td:first-child { text-align: left; padding-left: 12px; }
          .standings-table tr:last-child td { border-bottom: none; }
          .standings-table tr:nth-child(1) td,
          .standings-table tr:nth-child(2) td { background: #f0faf4; }
          .standings-grid.preview .standings-table tr:nth-child(1) td,
          .standings-grid.preview .standings-table tr:nth-child(2) td { background: #fff; }
          .standings-table .pts { font-weight: 700; color: #1a6b3a; }
          .team-cell { display: flex; align-items: center; gap: 8px; }
          .team-crest { width: 20px; height: 20px; object-fit: contain; flex-shrink: 0; }
          .preview-badge {
            display: inline-block;
            background: rgba(255,255,255,0.22);
            border: 1px solid rgba(255,255,255,0.45);
            color: #fff;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.7px;
            text-transform: uppercase;
            padding: 2px 7px;
            border-radius: 999px;
            margin-left: 8px;
            vertical-align: middle;
          }
          .preview-note { text-align: center; font-size: 12px; color: #888; font-style: italic; margin: -16px 0 40px; }

          /* ── Bracket ── */
          .bracket-stage { margin-bottom: 32px; }
          .bracket-stage-label {
            display: inline-block;
            background: #1a3c6b;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            padding: 5px 14px;
            border-radius: 20px;
            margin-bottom: 14px;
          }
          .bracket-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
          .bracket-grid.single { grid-template-columns: 1fr; max-width: 480px; }
          .bracket-match { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
          .bracket-teams { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
          .bracket-team { display: flex; align-items: center; gap: 7px; flex: 1; font-size: 14px; font-weight: 600; color: #222; min-width: 0; }
          .bracket-team.away { flex-direction: row-reverse; text-align: right; }
          .bracket-team img { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; }
          .bracket-score { display: flex; align-items: center; gap: 4px; font-size: 18px; font-weight: 800; color: #1a3c6b; flex-shrink: 0; }
          .bracket-score-divider { color: #bbb; font-weight: 400; }
          .bracket-vs { font-size: 12px; font-weight: 600; color: #aaa; flex-shrink: 0; padding: 0 4px; }
          .bracket-meta { font-size: 12px; color: #888; text-align: center; }
        `}</style>

        <h1 style={{ textAlign: "center", marginBottom: "8px" }}>⚽ Football Platform</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "20px", fontSize: "15px" }}>
          World Cup 2026 Matches &amp; Football News
        </p>

        <NavBar />

        {error && (
          <p style={{ color: "red", textAlign: "center", marginBottom: "16px" }}>
            ⚠️ Could not load data: {error}
          </p>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                matches={matches}
                news={news}
                loadingMatches={loadingMatches}
                loadingNews={loadingNews}
              />
            }
          />
          <Route
            path="/bracket"
            element={
              <BracketPage
                bracket={bracket}
                loadingBracket={loadingBracket}
              />
            }
          />
          <Route
            path="/standings"
            element={
              <StandingsPage
                standings={standings}
                matches={matches}
                loadingStandings={loadingStandings}
                loadingMatches={loadingMatches}
              />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
