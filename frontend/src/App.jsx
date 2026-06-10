import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const MATCHES_PER_PAGE = 10;

/**
 * Converts a UTC date + time string pair to the browser's local timezone.
 * Handles both "HH:MM" (football-data.org) and "HH:MM:SS+00:00" (TheSportsDB).
 * Returns a formatted string like "Jun 11, 2026 • 7:00 PM", or "Time TBD".
 */
function formatLocalDateTime(date, time) {
  if (!date) return "Time TBD";

  // Strip any trailing timezone offset, e.g. "19:00:00+00:00" → "19:00:00"
  const cleanTime = time ? time.replace(/[+-]\d{2}:\d{2}$/, "").trim() : null;

  const isoString = cleanTime ? `${date}T${cleanTime}Z` : `${date}T00:00:00Z`;
  const dt = new Date(isoString);
  if (isNaN(dt.getTime())) return "Time TBD";

  const datePart = dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (!cleanTime) return datePart;

  const timePart = dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart} • ${timePart}`;
}

function downloadICS(match) {
  const { date, time, venue } = match;
  const homeTeam = match.homeTeam || "TBD";
  const awayTeam = match.awayTeam || "TBD";

  if (!date) return;

  const pad = (n) => String(n).padStart(2, "0");

  const formatDT = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  // Strip timezone offset from TheSportsDB time string e.g. "19:00:00+00:00" → "19:00:00"
  const cleanTime = time ? time.replace(/[+-]\d{2}:\d{2}$/, "").trim() : "12:00:00";

  const startDate = new Date(`${date}T${cleanTime}Z`);
  if (isNaN(startDate.getTime())) return;

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const uid = `${date}-${homeTeam.replace(/\s+/g, "")}-${awayTeam.replace(/\s+/g, "")}@footballplatform`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Football Platform//World Cup 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDT(new Date())}`,
    `DTSTART:${formatDT(startDate)}`,
    `DTEND:${formatDT(endDate)}`,
    `SUMMARY:${homeTeam} vs ${awayTeam}`,
    `LOCATION:${venue || ""}`,
    "DESCRIPTION:FIFA World Cup 2026 Match",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${homeTeam}_vs_${awayTeam}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function App() {
  const [matches, setMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [standings, setStandings] = useState([]);
  const [bracket, setBracket] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [loadingBracket, setLoadingBracket] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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
      .catch(() => {
        setLoadingStandings(false);
      });

    fetch(`${API_URL}/bracket`)
      .then((res) => {
        if (!res.ok) throw new Error(`Bracket request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setBracket(Array.isArray(data) ? data : []);
        setLoadingBracket(false);
      })
      .catch(() => {
        setLoadingBracket(false);
      });
  }, []);

  const filteredMatches = matches.filter((match) => {
    const home = match.homeTeam ?? "";
    const away = match.awayTeam ?? "";
    const q = search.toLowerCase();
    return home.toLowerCase().includes(q) || away.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredMatches.length / MATCHES_PER_PAGE);
  const paginatedMatches = filteredMatches.slice(
    (currentPage - 1) * MATCHES_PER_PAGE,
    currentPage * MATCHES_PER_PAGE
  );

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Arial",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .skeleton {
          background: linear-gradient(90deg, #ececec 25%, #e0e0e0 50%, #ececec 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 15px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
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
        .page-btn:disabled {
          background: #f5f5f5;
          color: #aaa;
          cursor: not-allowed;
        }
        .standings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        .standings-card {
          background: #fff;
          border-radius: 15px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .standings-card-header {
          background: #1a6b3a;
          color: #fff;
          padding: 10px 16px;
          font-weight: bold;
          font-size: 15px;
          letter-spacing: 0.5px;
        }
        .standings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .standings-table th {
          background: #f5f5f5;
          padding: 7px 10px;
          text-align: center;
          color: #555;
          font-weight: 600;
          border-bottom: 1px solid #eee;
        }
        .standings-table th:first-child { text-align: left; padding-left: 12px; }
        .standings-table td {
          padding: 8px 10px;
          text-align: center;
          border-bottom: 1px solid #f0f0f0;
          color: #333;
        }
        .standings-table td:first-child { text-align: left; padding-left: 12px; }
        .standings-table tr:last-child td { border-bottom: none; }
        .standings-table tr:nth-child(1) td,
        .standings-table tr:nth-child(2) td { background: #f0faf4; }
        .standings-table .pts { font-weight: 700; color: #1a6b3a; }
        .team-cell { display: flex; align-items: center; gap: 8px; }
        .team-crest { width: 20px; height: 20px; object-fit: contain; flex-shrink: 0; }

        /* ── Favorites ── */
        .favorites-card {
          background: #fff;
          border-radius: 15px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          padding: 22px 26px 18px;
          margin-bottom: 36px;
        }
        .favorites-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a3c6b;
          margin: 0 0 18px;
        }
        .fav-row { margin-bottom: 13px; }
        .fav-row:last-of-type { margin-bottom: 0; }
        .fav-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #333;
          margin-bottom: 5px;
        }
        .fav-label span:last-child { font-weight: 700; color: #1a6b3a; }
        .fav-bar-track {
          background: #f0f0f0;
          border-radius: 999px;
          height: 10px;
          overflow: hidden;
        }
        .fav-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #1a6b3a, #34a85a);
          transition: width 0.6s ease;
        }
        .favorites-note {
          margin-top: 14px;
          font-size: 11px;
          color: #aaa;
          text-align: right;
        }

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
        .bracket-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 12px;
        }
        .bracket-grid.single { grid-template-columns: 1fr; max-width: 480px; }
        .bracket-match {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bracket-teams {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .bracket-team {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #222;
          min-width: 0;
        }
        .bracket-team.away { flex-direction: row-reverse; text-align: right; }
        .bracket-team img { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; }
        .bracket-score {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 18px;
          font-weight: 800;
          color: #1a3c6b;
          flex-shrink: 0;
        }
        .bracket-score-divider { color: #bbb; font-weight: 400; }
        .bracket-vs {
          font-size: 12px;
          font-weight: 600;
          color: #aaa;
          flex-shrink: 0;
          padding: 0 4px;
        }
        .bracket-meta {
          font-size: 12px;
          color: #888;
          text-align: center;
        }
      `}</style>

      <h1 style={{ textAlign: "center", marginBottom: "8px" }}>
        ⚽ Football Platform
      </h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "25px", fontSize: "15px" }}>
        World Cup 2026 Matches &amp; Football News
      </p>

      {error && (
        <p style={{ color: "red", textAlign: "center" }}>
          ⚠️ Could not load data: {error}
        </p>
      )}

      {/* ── Tournament Favorites ── */}
      <div className="favorites-card">
        <p className="favorites-title">🏆 Favorites to Win World Cup 2026</p>
        {[
          { team: "Brazil",    pct: 18 },
          { team: "France",    pct: 16 },
          { team: "Spain",     pct: 13 },
          { team: "Argentina", pct: 11 },
          { team: "England",   pct: 10 },
        ].map(({ team, pct }) => (
          <div key={team} className="fav-row">
            <div className="fav-label">
              <span>{team}</span>
              <span>{pct}%</span>
            </div>
            <div className="fav-bar-track">
              <div className="fav-bar-fill" style={{ width: `${pct * 5}%` }} />
            </div>
          </div>
        ))}
        <p className="favorites-note">
          Illustrative probabilities for demonstration purposes.
        </p>
      </div>

      <input
        type="text"
        placeholder="🔍 Search team..."
        value={search}
        onChange={handleSearch}
        style={{
          padding: "12px",
          width: "300px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          fontSize: "16px",
          marginBottom: "20px",
        }}
      />

      {/* ── Knockout Bracket ── */}
      <h2 style={{ marginBottom: "16px" }}>⚡ Knockout Bracket</h2>

      {loadingBracket ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "90px", borderRadius: "12px" }} />
          ))}
        </div>
      ) : bracket.length === 0 ? (
        <p style={{ color: "#888", marginBottom: "40px" }}>
          Knockout bracket matches will appear here once the group stage is complete.
        </p>
      ) : (
        <div style={{ marginBottom: "40px" }}>
          {bracket.map((stageBlock) => {
            const isSingle = ["SEMI_FINALS", "THIRD_PLACE", "FINAL"].includes(stageBlock.stageKey);
            return (
              <div key={stageBlock.stageKey} className="bracket-stage">
                <div className="bracket-stage-label">{stageBlock.stage}</div>
                <div className={`bracket-grid${isSingle ? " single" : ""}`}>
                  {stageBlock.matches.map((m, i) => {
                    const finished = m.status === "FINISHED";
                    const home = m.homeTeam || "TBD";
                    const away = m.awayTeam || "TBD";
                    return (
                      <div key={i} className="bracket-match">
                        <div className="bracket-teams">
                          <div className="bracket-team">
                            {m.homeBadge && <img src={m.homeBadge} alt={home} />}
                            <span>{home}</span>
                          </div>

                          {finished ? (
                            <div className="bracket-score">
                              <span>{m.homeScore ?? "–"}</span>
                              <span className="bracket-score-divider">:</span>
                              <span>{m.awayScore ?? "–"}</span>
                            </div>
                          ) : (
                            <span className="bracket-vs">VS</span>
                          )}

                          <div className="bracket-team away">
                            {m.awayBadge && <img src={m.awayBadge} alt={away} />}
                            <span>{away}</span>
                          </div>
                        </div>
                        <div className="bracket-meta">
                          {formatLocalDateTime(m.date, m.time)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Group Standings ── */}
      <h2 style={{ marginBottom: "16px" }}>🏆 Group Standings</h2>

      {loadingStandings ? (
        <div className="standings-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "200px", borderRadius: "15px" }} />
          ))}
        </div>
      ) : standings.length === 0 ? (
        <p style={{ color: "#888", marginBottom: "40px" }}>
          Standings are not available yet — they will appear once the group stage begins.
        </p>
      ) : (
        <div className="standings-grid">
          {standings.map((group) => (
            <div key={group.group} className="standings-card">
              <div className="standings-card-header">{group.group}</div>
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>#&nbsp;&nbsp;Team</th>
                    <th title="Played">P</th>
                    <th title="Won">W</th>
                    <th title="Drawn">D</th>
                    <th title="Lost">L</th>
                    <th title="Points">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.table.map((row) => (
                    <tr key={row.position}>
                      <td>
                        <span className="team-cell">
                          <span style={{ color: "#999", minWidth: "14px" }}>{row.position}</span>
                          {row.crest && (
                            <img src={row.crest} alt={row.team} className="team-crest" />
                          )}
                          {row.team}
                        </span>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td className="pts">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── Matches ── */}
      {loadingMatches ? (
        <div>
          <p style={{ color: "#aaa", marginBottom: "16px" }}>Loading matches...</p>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "92px", marginBottom: "20px" }}
            />
          ))}
        </div>
      ) : (
        <>
          <p style={{ color: "#555", marginBottom: "16px" }}>
            Showing {filteredMatches.length} match{filteredMatches.length !== 1 ? "es" : ""}
            {search && ` for "${search}"`}
          </p>

          {paginatedMatches.map((match, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "15px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                {match.homeBadge && (
                  <img src={match.homeBadge} alt={match.homeTeam || "TBD"} width="40" />
                )}
                <strong>{match.homeTeam || "TBD"}</strong>
                <span>vs</span>
                <strong>{match.awayTeam || "TBD"}</strong>
                {match.awayBadge && (
                  <img src={match.awayBadge} alt={match.awayTeam || "TBD"} width="40" />
                )}
              </div>
              <p>📅 {formatLocalDateTime(match.date, match.time)}</p>
              <p>📍 {match.venue || "Venue TBD"}</p>
              <button
                onClick={() => downloadICS(match)}
                style={{
                  marginTop: "8px",
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid #c8e6c9",
                  backgroundColor: "#f1f8f1",
                  color: "#2e7d32",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                📅 Add to Calendar
              </button>
            </div>
          ))}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                marginTop: "10px",
                marginBottom: "40px",
              }}
            >
              <button
                className="page-btn"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <span style={{ fontSize: "14px", color: "#555", minWidth: "90px", textAlign: "center" }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="page-btn"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <h2 style={{ marginTop: "40px" }}>📰 Latest Football News</h2>

      {loadingNews ? (
        <div>
          <p style={{ color: "#aaa", marginBottom: "16px" }}>Loading news...</p>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "80px", marginBottom: "15px", borderRadius: "10px" }}
            />
          ))}
        </div>
      ) : (
        news.map((article, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "#ffffff",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            }}
          >
            {article.image && (
              <img
                src={article.image}
                alt={article.title}
                width="300"
                style={{ borderRadius: "10px" }}
              />
            )}
            <h3>{article.title}</h3>
            <a href={article.url} target="_blank" rel="noreferrer">
              Read More
            </a>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
