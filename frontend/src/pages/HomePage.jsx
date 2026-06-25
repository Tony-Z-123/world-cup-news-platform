import { useState } from "react";
import { formatLocalDateTime, downloadICS } from "../utils";

const MATCHES_PER_PAGE = 10;

const FAVORITES = [
  { team: "Spain",       pct: 17.3 },
  { team: "France",      pct: 15.1 },
  { team: "England",     pct: 12.8 },
  { team: "Argentina",   pct:  9.7 },
  { team: "Brazil",      pct:  7.8 },
  { team: "Portugal",    pct:  5.6 },
  { team: "Germany",     pct:  4.3 },
  { team: "Netherlands", pct:  3.2 },
  { team: "Belgium",     pct:  2.5 },
  { team: "Croatia",     pct:  1.7 },
];

export default function HomePage({ matches, news, loadingMatches, loadingNews }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
    <>
      {/* ── Tournament Favorites ── */}
      <div className="favorites-card">
        <p className="favorites-title">🏆 Favorites to Win World Cup 2026</p>
        {FAVORITES.map(({ team, pct }) => (
          <div key={team} className="fav-row">
            <div className="fav-label">
              <span>{team}</span>
              <span>{pct}%</span>
            </div>
            <div className="fav-bar-track">
              <div className="fav-bar-fill" style={{ width: `${(pct / 17.3) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="favorites-note">
          Probabilities are illustrative and based on publicly circulated estimates, not live betting odds.
        </p>
      </div>

      {/* ── Match Search + List ── */}
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

      {loadingMatches ? (
        <div>
          <p style={{ color: "#aaa", marginBottom: "16px" }}>Loading matches...</p>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "92px", marginBottom: "20px" }} />
          ))}
        </div>
      ) : (
        <>
          <p style={{ color: "#555", marginBottom: "16px" }}>
            Showing {filteredMatches.length} match{filteredMatches.length !== 1 ? "es" : ""}
            {search && ` for "${search}"`}
          </p>

          {paginatedMatches.map((match, index) => {
            const finished = match.status === "FINISHED";
            const live     = match.status === "IN_PLAY" || match.status === "PAUSED";
            const hasScore = finished || (live && match.homeScore != null);
            const home     = match.homeTeam || "TBD";
            const away     = match.awayTeam || "TBD";

            return (
              <div
                key={index}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "15px",
                  padding: "20px",
                  marginBottom: "20px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  borderLeft: finished ? "4px solid #1a6b3a" : live ? "4px solid #e65100" : "4px solid transparent",
                }}
              >
                {/* Teams + score row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                  {match.homeBadge && <img src={match.homeBadge} alt={home} width="36" />}
                  <strong style={{ fontSize: "15px" }}>{home}</strong>

                  {hasScore ? (
                    <span style={{ fontSize: "22px", fontWeight: 800, color: "#1a3c6b", padding: "0 4px" }}>
                      {match.homeScore} – {match.awayScore}
                    </span>
                  ) : (
                    <span style={{ color: "#aaa", fontWeight: 600 }}>vs</span>
                  )}

                  <strong style={{ fontSize: "15px" }}>{away}</strong>
                  {match.awayBadge && <img src={match.awayBadge} alt={away} width="36" />}
                </div>

                {/* Status badge */}
                {(finished || live) && (
                  <div style={{ textAlign: "center", marginTop: "8px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      background: live ? "#fff3e0" : "#f0faf4",
                      color: live ? "#e65100" : "#1a6b3a",
                      border: `1px solid ${live ? "#ffcc80" : "#a5d6a7"}`,
                    }}>
                      {live ? "🔴 Live" : "✓ Finished"}
                    </span>
                  </div>
                )}

                {/* Date / venue (always shown) */}
                <p style={{ marginTop: "10px", color: "#555", fontSize: "13px" }}>
                  📅 {formatLocalDateTime(match.date, match.time)}
                </p>
                <p style={{ color: "#555", fontSize: "13px" }}>
                  📍 {match.venue || "Venue TBD"}
                </p>

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
            );
          })}

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "10px", marginBottom: "40px" }}>
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

      {/* ── Football News ── */}
      <h2 style={{ marginTop: "40px" }}>📰 Latest Football News</h2>

      {loadingNews ? (
        <div>
          <p style={{ color: "#aaa", marginBottom: "16px" }}>Loading news...</p>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "80px", marginBottom: "15px", borderRadius: "10px" }} />
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
              <img src={article.image} alt={article.title} width="300" style={{ borderRadius: "10px" }} />
            )}
            <h3>{article.title}</h3>
            <a href={article.url} target="_blank" rel="noreferrer">Read More</a>
          </div>
        ))
      )}
    </>
  );
}
