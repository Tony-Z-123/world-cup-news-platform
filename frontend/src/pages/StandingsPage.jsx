import { useMemo } from "react";
import { buildPreviewStandings } from "../utils";

export default function StandingsPage({ standings, matches, loadingStandings, loadingMatches }) {
  // Use real standings when available; derive zero-stats preview from match schedule otherwise.
  // Wait for both fetches to settle to avoid a flash of empty state.
  const displayStandings = useMemo(() => {
    if (standings.length > 0) return { data: standings, isPreview: false };
    if (loadingStandings || loadingMatches) return { data: [], isPreview: false };
    const preview = buildPreviewStandings(matches);
    return { data: preview, isPreview: preview.length > 0 };
  }, [standings, matches, loadingStandings, loadingMatches]);

  const isLoading = loadingStandings || (standings.length === 0 && loadingMatches);

  return (
    <>
      <h2 style={{ marginBottom: "16px" }}>🏆 Group Standings</h2>

      {isLoading ? (
        <div className="standings-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "200px", borderRadius: "15px" }} />
          ))}
        </div>
      ) : displayStandings.data.length === 0 ? (
        <p style={{ color: "#888", marginBottom: "40px" }}>
          Standings are not available yet — they will appear once the group stage begins.
        </p>
      ) : (
        <>
          <div className={`standings-grid${displayStandings.isPreview ? " preview" : ""}`}>
            {displayStandings.data.map((group) => (
              <div key={group.group} className="standings-card">
                <div className="standings-card-header">
                  {group.group}
                  {displayStandings.isPreview && (
                    <span className="preview-badge">Preview</span>
                  )}
                </div>
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

          {displayStandings.isPreview && (
            <p className="preview-note">
              Tournament has not started yet — standings are shown alphabetically with zero stats.
              Live data will replace this automatically once matches begin.
            </p>
          )}
        </>
      )}
    </>
  );
}
