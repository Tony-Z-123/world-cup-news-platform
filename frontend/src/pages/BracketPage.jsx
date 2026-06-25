import { formatLocalDateTime } from "../utils";

const SINGLE_STAGE_KEYS = ["SEMI_FINALS", "THIRD_PLACE", "FINAL"];

/** One team slot inside a bracket card. */
function TeamSlot({ name, label, badge, confirmed, side }) {
  const display = name || label || "TBD";
  const isTbd   = !name && !label;

  return (
    <div
      className={`bracket-team${side === "away" ? " away" : ""}`}
      style={{ opacity: isTbd ? 0.35 : confirmed ? 1 : 0.75 }}
    >
      {/* Badge: only show when team is confirmed */}
      {badge && confirmed ? (
        <img src={badge} alt={name} />
      ) : confirmed ? (
        <span style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "#e8eaf0", display: "inline-block", flexShrink: 0,
        }} />
      ) : null}

      <span style={{
        fontStyle:  confirmed ? "normal" : "italic",
        fontSize:   confirmed ? "14px" : "12px",
        color:      confirmed ? "#222" : isTbd ? "#ccc" : "#888",
        lineHeight: 1.3,
      }}>
        {display}
      </span>
    </div>
  );
}

export default function BracketPage({ bracket, loadingBracket }) {
  const totalSlots = bracket.reduce(
    (n, s) => n + s.matches.length * 2, 0
  );
  const confirmedSlots = bracket.reduce(
    (n, s) => n + s.matches.filter(m => m.homeConfirmed).length
                + s.matches.filter(m => m.awayConfirmed).length,
    0
  );
  const hasPlaceholders = confirmedSlots < totalSlots;

  return (
    <>
      <h2 style={{ marginBottom: "6px" }}>⚡ Knockout Bracket</h2>

      {/* Preview Mode note */}
      {!loadingBracket && bracket.length > 0 && hasPlaceholders && (
        <div style={{
          background: "#fffbea",
          border: "1px solid #ffe082",
          borderRadius: "10px",
          padding: "10px 16px",
          marginBottom: "20px",
          fontSize: "13px",
          color: "#795548",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <span style={{ fontSize: "16px" }}>🗓️</span>
          <span>
            <strong>Preview Mode</strong> — Knockout matchups are projected placeholders
            until group-stage results are finalised.
            {" "}<span style={{ opacity: 0.7 }}>
              {confirmedSlots} of {totalSlots} team slots confirmed.
            </span>
          </span>
        </div>
      )}

      {loadingBracket ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "12px",
          marginBottom: "40px",
        }}>
          {[...Array(6)].map((_, i) => (
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
                    const hasScore = (finished || live)
                                  && m.homeScore != null
                                  && m.awayScore != null;

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
                        {/* Match number badge */}
                        {m.matchNum && (
                          <div style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#aaa",
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}>
                            Match {m.matchNum}
                          </div>
                        )}

                        <div className="bracket-teams">
                          <TeamSlot
                            name={m.homeTeam}
                            label={m.homeLabel}
                            badge={m.homeBadge}
                            confirmed={m.homeConfirmed}
                            side="home"
                          />

                          {hasScore ? (
                            <div className="bracket-score">
                              <span>{m.homeScore ?? "–"}</span>
                              <span className="bracket-score-divider">:</span>
                              <span>{m.awayScore ?? "–"}</span>
                            </div>
                          ) : (
                            <span className="bracket-vs">
                              {live ? "🔴" : "VS"}
                            </span>
                          )}

                          <TeamSlot
                            name={m.awayTeam}
                            label={m.awayLabel}
                            badge={m.awayBadge}
                            confirmed={m.awayConfirmed}
                            side="away"
                          />
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
