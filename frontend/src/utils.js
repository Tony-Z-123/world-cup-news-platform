/**
 * Converts a UTC date + time string pair to the browser's local timezone.
 * Handles both "HH:MM" (football-data.org) and "HH:MM:SS+00:00" (TheSportsDB).
 * Returns a formatted string like "Jun 11, 2026 • 7:00 PM", or "Time TBD".
 */
export function formatLocalDateTime(date, time) {
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

/**
 * Derives preview group standings (all zeros) from the match schedule.
 * Returns the same shape as the /standings API so the same render path works.
 */
export function buildPreviewStandings(matches) {
  const groupMap = new Map(); // "Group A" → Map(teamName → crest)
  for (const m of matches) {
    if (!m.group) continue;
    if (!groupMap.has(m.group)) groupMap.set(m.group, new Map());
    const teamMap = groupMap.get(m.group);
    if (m.homeTeam && !teamMap.has(m.homeTeam)) teamMap.set(m.homeTeam, m.homeBadge || "");
    if (m.awayTeam && !teamMap.has(m.awayTeam)) teamMap.set(m.awayTeam, m.awayBadge || "");
  }
  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupLabel, teamMap]) => ({
      group: groupLabel,
      table: [...teamMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, crest], idx) => ({
          position: idx + 1,
          team: name,
          crest,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0,
        })),
    }));
}

/**
 * Generates and triggers download of a .ics calendar file for a match.
 */
export function downloadICS(match) {
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
