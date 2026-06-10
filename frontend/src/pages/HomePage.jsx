import { useState } from "react";
import { formatLocalDateTime, downloadICS } from "../utils";

const MATCHES_PER_PAGE = 10;

const FAVORITES = [
  { team: "Brazil",    pct: 18 },
  { team: "France",    pct: 16 },
  { team: "Spain",     pct: 13 },
  { team: "Argentina", pct: 11 },
  { team: "England",   pct: 10 },
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
              <div className="fav-bar-fill" style={{ width: `${pct * 5}%` }} />
            </div>
          </div>
        ))}
        <p className="favorites-note">
          Illustrative probabilities for demonstration purposes.
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
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
