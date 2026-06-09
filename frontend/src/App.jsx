import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function App() {
  const [matches, setMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Matches request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message));

    fetch(`${API_URL}/news`)
      .then((res) => {
        if (!res.ok) throw new Error(`News request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setNews(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const filteredMatches = matches.filter((match) => {
    const home = match.homeTeam ?? "";
    const away = match.awayTeam ?? "";
    const q = search.toLowerCase();
    return home.toLowerCase().includes(q) || away.toLowerCase().includes(q);
  });

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "25px" }}>
        ⚽ World Cup 2026
      </h1>

      {error && (
        <p style={{ color: "red", textAlign: "center" }}>
          ⚠️ Could not load data: {error}
        </p>
      )}

      <input
        type="text"
        placeholder="🔍 Search team..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "12px",
          width: "300px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          fontSize: "16px",
          marginBottom: "20px",
        }}
      />

      <p>Showing {filteredMatches.length} matches</p>

      {filteredMatches.map((match, index) => (
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

      <h2 style={{ marginTop: "40px" }}>📰 Latest Football News</h2>

      {news.map((article, index) => (
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
      ))}
    </div>
  );
}

export default App;