import { formatLocalDateTime } from "../utils";

const SINGLE_STAGE_KEYS = ["SEMI_FINALS", "THIRD_PLACE", "FINAL"];

function TeamSlot({ name, badge, side }) {
  const isEmpty = !name;
  return (
    <div
      className={`bracket-team${side === "away" ? " away" : ""}`}
      style={{ opacity: isEmpty ? 0.45 : 1 }}
    >
      {badge
        ? <img src={badge} alt={name || "TBD"} />
        : !isEmpty && (
          <span style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "#e8eaf0", display: "inline-block", flexShrink: 0,
          }} />
        )
      }
      <span style={{ fontStyle: isEmpty ? "italic" : "normal", color: isEmpty ? "#aaa" : "#222" }}>
        {name || "TBD"}
      </span>
    </div>
  );
}

export default function BracketPage({ bracket, loadingBracket }) {
  const totalMatches = bracket.reduce((n, s) => n + s.matches.length, 0);
  const determinedMatches = bracket.reduce(
    (n, s) => n + s.matches.filter(m => m.homeTeam && m.awayTeam).length, 0
  );

  return (
    <>
      <h2 style={{ marginBottom: "6px" }}>⚡ Knockout Bracket</h2>

      {!loadingBracket && bracket.length > 0 && (
        <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
          {determinedMatches} of {totalMatches} matchups confirmed
          {determinedMatches < totalMatches && " — remaining slots fill as group stage concludes"}
        </p>
      )}

      {loadingBracket ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "12px",
          marginBottom: "40px",
        }}>
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
                    const live     = m.status === "IN_PLAY" || m.status === "PAUSED";
                    const hasScore = finished || (live && m.homeScore != null);

                    return (
                      <div
                        key={i}
                        className="bracket-match"
                        style={{
                          borderLeft: finished
                            ? "3px solid #1a6b3a"
                            : live
                            ? "3px solid #e65100"
                            : "3px solid transparent",
                        }}
                      >
                        <div className="bracket-teams">
                          <TeamSlot name={m.homeTeam} badge={m.homeBadge} side="home" />

                          {hasScore ? (
                            <div className="bracket-score">
                              <span>{m.homeScore ?? "–"}</span>
                              <span className="bracket-score-divider">:</span>
                              <span>{m.awayScore ?? "–"}</span>
                            </div>
                          ) : (
                            <span className="bracket-vs">{live ? "🔴" : "VS"}</span>
                          )}

                          <TeamSlot name={m.awayTeam} badge={m.awayBadge} side="away" />
                        </div>

                        <div className="bracket-meta">
                          {finished
                            ? "✓ Finished"
                            : live
                            ? "🔴 Live"
                            : formatLocalDateTime(m.date, m.time)}
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
