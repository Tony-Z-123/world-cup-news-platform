import { formatLocalDateTime } from "../utils";

const SINGLE_STAGE_KEYS = ["SEMI_FINALS", "THIRD_PLACE", "FINAL"];

export default function BracketPage({ bracket, loadingBracket }) {
  return (
    <>
      <h2 style={{ marginBottom: "16px" }}>⚡ Knockout Bracket</h2>

      {loadingBracket ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "90px", borderRadius: "12px" }} />
          ))}
        </div>
      ) : bracket.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: "15px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          padding: "40px 30px",
          textAlign: "center",
          marginBottom: "40px",
        }}>
          <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🗓️</p>
          <p style={{ color: "#555", fontWeight: 600, fontSize: "16px", margin: "0 0 8px" }}>
            Knockout bracket not available yet
          </p>
          <p style={{ color: "#999", fontSize: "14px", margin: 0 }}>
            Bracket matches will appear here once the group stage is complete.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: "40px" }}>
          {bracket.map((stageBlock) => {
            const isSingle = SINGLE_STAGE_KEYS.includes(stageBlock.stageKey);
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
    </>
  );
}
