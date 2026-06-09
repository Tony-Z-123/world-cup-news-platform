import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const MATCHES_PER_PAGE = 10;

function App() {
  const [matches, setMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
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
                <img src={match.homeBadge} alt={match.homeTeam} width="40" />
                <strong>{match.homeTeam}</strong>
                <span>vs</span>
                <strong>{match.awayTeam}</strong>
                <img src={match.awayBadge} alt={match.awayTeam} width="40" />
              </div>
              <p>📅 {match.date}</p>
              <p>📍 {match.venue}</p>
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
