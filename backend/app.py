from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import os
import re
import time
from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

load_dotenv()

NEWS_API_KEY         = os.getenv("NEWS_API_KEY")
FOOTBALL_DATA_API_KEY = os.getenv("FOOTBALL_DATA_API_KEY")

# ─── In-memory cache ──────────────────────────────────────────────────────────

_cache: dict = {}

TTL_MATCHES  = 30 * 60   # 30 minutes
TTL_STANDINGS = 30 * 60  # 30 minutes
TTL_NEWS     = 15 * 60   # 15 minutes

def _cache_get(key):
    """Return cached data only if within TTL; otherwise None."""
    entry = _cache.get(key)
    if entry and time.time() < entry["expires_at"]:
        return entry["data"]
    return None

def _cache_get_stale(key):
    """Return cached data regardless of TTL (used as last-resort fallback)."""
    entry = _cache.get(key)
    return entry["data"] if entry else None

def _cache_set(key, data, ttl):
    _cache[key] = {"data": data, "expires_at": time.time() + ttl}

# ─── Venue-matching helpers ───────────────────────────────────────────────────

# Canonical aliases for team names that differ between football-data.org and TheSportsDB.
# Both sides of a mismatch map to the same canonical slug.
_TEAM_ALIASES: dict[str, str] = {
    "usa":                          "unitedstates",
    "unitedstatesofamerica":        "unitedstates",
    "czechrepublic":                "czechia",
    "ivorycoast":                   "cotedivoire",
    "republicofireland":            "ireland",
    "korearepublic":                "southkorea",
    "republicofkorea":              "southkorea",
    "dprkorea":                     "northkorea",
    "bosniaandherzegovina":         "bosniaherzegovina",
    "democraticrepublicofthecongo": "drcongo",
    "congodrc":                     "drcongo",
}

def _norm(name: str) -> str:
    """
    Normalise a team name for confident venue matching:
      1. Unicode NFKD decomposition + ASCII transliteration (handles accented chars)
      2. Lowercase, strip non-alpha
      3. Apply alias table so variant names (USA/United States, etc.) share one slug
    """
    import unicodedata
    slug = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z]", "", slug.lower())
    return _TEAM_ALIASES.get(slug, slug)

def _venue_key(date: str, home: str, away: str) -> str:
    return f"{date}|{_norm(home)}|{_norm(away)}"

# ─── Raw data fetchers (no caching, just HTTP) ────────────────────────────────

def _raw_football_data_matches():
    """Call football-data.org matches endpoint and return raw list."""
    if not FOOTBALL_DATA_API_KEY:
        raise ValueError("FOOTBALL_DATA_API_KEY is not set")
    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
    resp = requests.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        headers=headers,
        timeout=10,
    )
    if resp.status_code != 200:
        raise ValueError(f"football-data.org returned HTTP {resp.status_code}")
    return resp.json().get("matches", [])


def _raw_sportsdb_events():
    """Call TheSportsDB and return raw events list."""
    url = "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026"
    resp = requests.get(url, timeout=10)
    return (resp.json().get("events") or [])

# ─── Cached raw-match access (shared by / and /bracket) ──────────────────────

def _get_cached_raw_matches():
    cached = _cache_get("raw_fd_matches")
    if cached is not None:
        print("Returning cached matches")
        return cached
    print("Refreshing matches from API")
    try:
        raw = _raw_football_data_matches()
        _cache_set("raw_fd_matches", raw, TTL_MATCHES)
        return raw
    except Exception as exc:
        stale = _cache_get_stale("raw_fd_matches")
        if stale is not None:
            print("API failed; returning stale cached matches as fallback")
            return stale
        raise exc

# ─── Venue enrichment map ────────────────────────────────────────────────────

def _get_venue_map():
    """
    Build {venue_key → venue_string} from TheSportsDB.
    Cached for TTL_MATCHES so we don't hammer TheSportsDB.
    """
    cached = _cache_get("venue_map")
    if cached is not None:
        return cached
    try:
        events = _raw_sportsdb_events()
        venue_map = {}
        for e in events:
            venue = (e.get("strVenue") or "").strip()
            if not venue:
                continue
            key = _venue_key(
                e.get("dateEvent") or "",
                e.get("strHomeTeam") or "",
                e.get("strAwayTeam") or "",
            )
            venue_map[key] = venue
        _cache_set("venue_map", venue_map, TTL_MATCHES)
        return venue_map
    except Exception:
        return {}

# ─── Normalisation helpers ────────────────────────────────────────────────────

def _norm_group(raw_group):
    """'GROUP_A' → 'Group A'"""
    return raw_group.replace("GROUP_", "Group ").replace("_", " ").title()


def _build_match(m, venue_map):
    """
    Convert one raw football-data.org match dict to frontend format.
    Returns (match_dict, venue_was_enriched: bool).
    """
    utc_date  = m.get("utcDate") or ""
    date_part = utc_date[:10] if utc_date else ""
    time_part = utc_date[11:16] if len(utc_date) >= 16 else ""

    home = m.get("homeTeam") or {}
    away = m.get("awayTeam") or {}
    area = m.get("area") or {}

    home_name = home.get("name") or home.get("shortName") or ""
    away_name = away.get("name") or away.get("shortName") or ""

    # Primary venue from football-data.org
    venue_raw = m.get("venue") or ""
    venue = venue_raw if isinstance(venue_raw, str) else ""
    enriched = False

    # Enrichment: if fd.org has no venue, try TheSportsDB via alias-normalised key
    if not venue and home_name and away_name:
        sdb_venue = venue_map.get(_venue_key(date_part, home_name, away_name), "")
        if sdb_venue:
            venue = sdb_venue
            enriched = True

    score  = m.get("score") or {}
    ft     = score.get("fullTime") or {}
    status = m.get("status") or ""

    raw_group = m.get("group") or ""
    stage     = m.get("stage") or ""
    group_label = _norm_group(raw_group) if stage == "GROUP_STAGE" and raw_group else ""

    match_dict = {
        "date":      date_part,
        "time":      time_part,
        "homeTeam":  home_name,
        "awayTeam":  away_name,
        "venue":     venue,
        "country":   area.get("name") or "",
        "homeBadge": home.get("crest") or "",
        "awayBadge": away.get("crest") or "",
        "poster":    "",
        "group":     group_label,
        "status":    status,
        "homeScore": ft.get("home"),
        "awayScore": ft.get("away"),
        "winner":    score.get("winner") or None,
        "matchday":  m.get("matchday"),
        "stage":     stage,
    }
    return match_dict, enriched

# ─── Routes ───────────────────────────────────────────────────────────────────

def _build_processed_matches():
    """
    Fetch, enrich with venues, and return the final match list.
    Logs venue enrichment stats. Result is cached by the caller.

    Both external API calls (_get_cached_raw_matches and _get_venue_map) are
    submitted concurrently so the total cold-start wait is max(t_fd, t_sdb)
    instead of t_fd + t_sdb.  Cache hits on either call are still instant.
    """
    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_matches = pool.submit(_get_cached_raw_matches)
        fut_venues  = pool.submit(_get_venue_map)
        # Raise immediately if either call failed
        raw_matches = fut_matches.result()
        venue_map   = fut_venues.result()

    matches    = []
    n_enriched = 0
    n_tbd      = 0

    for m in raw_matches:
        match_dict, was_enriched = _build_match(m, venue_map)
        matches.append(match_dict)
        if was_enriched:
            n_enriched += 1
        elif not match_dict["venue"]:
            n_tbd += 1

    if n_enriched:
        print(f"Enriched venue from TheSportsDB: {n_enriched} match(es)")
    if n_tbd:
        print(f"Venue still TBD: {n_tbd} match(es)")

    return matches


@app.route("/")
def home():
    # Served from processed-matches cache when available
    cached = _cache_get("matches")
    if cached is not None:
        print("Returning cached matches")
        return jsonify(cached)

    print("Refreshing matches from API")
    try:
        matches = _build_processed_matches()
        _cache_set("matches", matches, TTL_MATCHES)
        return jsonify(matches)
    except Exception:
        stale = _cache_get_stale("matches")
        if stale is not None:
            print("API failed; returning stale cached matches as fallback")
            return jsonify(stale)

    # Last resort: TheSportsDB
    try:
        print("Falling back to TheSportsDB for matches")
        events  = _raw_sportsdb_events()
        matches = []
        for e in events:
            matches.append({
                "date":      e["dateEvent"],
                "time":      e["strTime"],
                "homeTeam":  e["strHomeTeam"],
                "awayTeam":  e["strAwayTeam"],
                "venue":     e["strVenue"],
                "country":   e["strCountry"],
                "poster":    e["strPoster"],
                "homeBadge": e["strHomeTeamBadge"],
                "awayBadge": e["strAwayTeamBadge"],
            })
        return jsonify(matches)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/news")
def news():
    cached = _cache_get("news")
    if cached is not None:
        print("Returning cached news")
        return jsonify(cached)

    print("Refreshing news from API")
    try:
        url = (
            f"https://newsapi.org/v2/everything?"
            f"q=football&language=en&pageSize=10&apiKey={NEWS_API_KEY}"
        )
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            raise ValueError(f"NewsAPI returned HTTP {response.status_code}")

        articles = [
            {"title": a["title"], "url": a["url"], "image": a["urlToImage"]}
            for a in response.json().get("articles", [])
        ]
        _cache_set("news", articles, TTL_NEWS)
        return jsonify(articles)

    except Exception as exc:
        stale = _cache_get_stale("news")
        if stale is not None:
            print("API failed; returning stale cached news as fallback")
            return jsonify(stale)
        return jsonify({"error": str(exc)}), 502


@app.route("/bracket")
def bracket():
    if not FOOTBALL_DATA_API_KEY:
        return jsonify({"error": "FOOTBALL_DATA_API_KEY is not set"}), 500

    try:
        raw_matches = _get_cached_raw_matches()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502

    STAGE_KEYS   = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"]
    STAGE_LABELS = {
        "LAST_32":        "Round of 32",
        "LAST_16":        "Round of 16",
        "QUARTER_FINALS": "Quarter Finals",
        "SEMI_FINALS":    "Semi Finals",
        "THIRD_PLACE":    "Third Place Playoff",
        "FINAL":          "Final",
    }
    # WC 2026: 72 group-stage + 32 knockout = 104 matches total.
    # Display match numbers follow the sequential bracket numbering.
    MATCH_START = {
        "LAST_32": 73, "LAST_16": 89, "QUARTER_FINALS": 97,
        "SEMI_FINALS": 101, "THIRD_PLACE": 103, "FINAL": 104,
    }

    def by_date_id(m):
        return (m.get("utcDate") or "", m.get("id") or 0)

    # Collect knockout matches, sorted per stage by date then match-id
    raw_by_stage: dict[str, list] = {s: [] for s in STAGE_KEYS}
    for m in raw_matches:
        s = m.get("stage") or ""
        if s in raw_by_stage:
            raw_by_stage[s].append(m)

    for s in STAGE_KEYS:
        raw_by_stage[s].sort(key=by_date_id)

    r32 = raw_by_stage["LAST_32"]
    r16 = raw_by_stage["LAST_16"]
    qf  = raw_by_stage["QUARTER_FINALS"]
    sf  = raw_by_stage["SEMI_FINALS"]
    tp  = raw_by_stage["THIRD_PLACE"]
    fn  = raw_by_stage["FINAL"]

    # Assign sequential display match numbers (73, 74, … 104)
    mid_to_num: dict[int, int] = {}
    for s in STAGE_KEYS:
        start = MATCH_START[s]
        for i, m in enumerate(raw_by_stage[s]):
            mid_to_num[m["id"]] = start + i

    def team_slot(team_obj, feeder_id=None, loser=False):
        """
        Return (name, label, confirmed) for one team slot:
          name      – real team name from the API (empty when not yet determined)
          label     – best display label: real name OR "Winner M73" / "Loser M101"
          confirmed – True only when the API has the actual team
        """
        name = (team_obj or {}).get("name") or (team_obj or {}).get("shortName") or ""
        badge = (team_obj or {}).get("crest") or ""
        if name:
            return name, name, badge, True
        if feeder_id is not None:
            num = mid_to_num.get(feeder_id, "?")
            prefix = "Loser" if loser else "Winner"
            return "", f"{prefix} M{num}", "", False
        return "", "", "", False

    def build_matches(raw_list, home_feeders=None, away_feeders=None,
                      home_loser=False, away_loser=False):
        n = len(raw_list)
        home_feeders = home_feeders or [None] * n
        away_feeders = away_feeders or [None] * n
        result = []
        for i, m in enumerate(raw_list):
            utc_date = m.get("utcDate") or ""
            score    = m.get("score") or {}
            ft       = score.get("fullTime") or {}

            h_name, h_label, h_badge, h_ok = team_slot(
                m.get("homeTeam"), home_feeders[i], home_loser)
            a_name, a_label, a_badge, a_ok = team_slot(
                m.get("awayTeam"), away_feeders[i], away_loser)

            result.append({
                "matchNum":      mid_to_num.get(m.get("id")),
                "date":          utc_date[:10] if utc_date else "",
                "time":          utc_date[11:16] if len(utc_date) >= 16 else "",
                "homeTeam":      h_name,
                "awayTeam":      a_name,
                "homeLabel":     h_label,
                "awayLabel":     a_label,
                "homeConfirmed": h_ok,
                "awayConfirmed": a_ok,
                "homeBadge":     h_badge,
                "awayBadge":     a_badge,
                "homeScore":     ft.get("home"),
                "awayScore":     ft.get("away"),
                "status":        m.get("status") or "",
            })
        return result

    def ids(lst, indices):
        return [lst[i]["id"] if i < len(lst) else None for i in indices]

    # ── Round of 32 ──────────────────────────────────────────────────────────
    r32_built = build_matches(r32)  # feeders = group-stage results (unknown)

    # ── Round of 16 ─── each R16 match fed by two adjacent R32 matches ───────
    r16_built = build_matches(
        r16,
        home_feeders=ids(r32, [2*i   for i in range(len(r16))]),
        away_feeders=ids(r32, [2*i+1 for i in range(len(r16))]),
    )

    # ── Quarter Finals ────────────────────────────────────────────────────────
    qf_built = build_matches(
        qf,
        home_feeders=ids(r16, [2*i   for i in range(len(qf))]),
        away_feeders=ids(r16, [2*i+1 for i in range(len(qf))]),
    )

    # ── Semi Finals ───────────────────────────────────────────────────────────
    sf_built = build_matches(
        sf,
        home_feeders=ids(qf, [2*i   for i in range(len(sf))]),
        away_feeders=ids(qf, [2*i+1 for i in range(len(sf))]),
    )

    # ── Third Place Playoff ── losers of both SF matches ─────────────────────
    sf_ids = [m["id"] for m in sf]
    tp_built = build_matches(
        tp,
        home_feeders=[sf_ids[0] if sf_ids else None] * len(tp),
        away_feeders=[sf_ids[1] if len(sf_ids) > 1 else None] * len(tp),
        home_loser=True, away_loser=True,
    )

    # ── Final ── winners of both SF matches ───────────────────────────────────
    fn_built = build_matches(
        fn,
        home_feeders=[sf_ids[0] if sf_ids else None] * len(fn),
        away_feeders=[sf_ids[1] if len(sf_ids) > 1 else None] * len(fn),
    )

    built_map = {
        "LAST_32": r32_built, "LAST_16": r16_built,
        "QUARTER_FINALS": qf_built, "SEMI_FINALS": sf_built,
        "THIRD_PLACE": tp_built, "FINAL": fn_built,
    }

    result = []
    for key in STAGE_KEYS:
        matches = built_map[key]
        if not matches:
            continue
        result.append({
            "stage":    STAGE_LABELS[key],
            "stageKey": key,
            "matches":  matches,
        })

    return jsonify(result)


@app.route("/standings")
def standings():
    if not FOOTBALL_DATA_API_KEY:
        return jsonify({"error": "FOOTBALL_DATA_API_KEY is not set"}), 500

    cached = _cache_get("standings")
    if cached is not None:
        print("Returning cached standings")
        return jsonify(cached)

    print("Refreshing standings from API")
    try:
        headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
        resp = requests.get(
            "https://api.football-data.org/v4/competitions/WC/standings",
            headers=headers,
            timeout=10,
        )
        if resp.status_code != 200:
            raise ValueError(f"football-data.org returned HTTP {resp.status_code}")

        raw = resp.json().get("standings", [])

        groups = []
        for entry in raw:
            if entry.get("type") != "TOTAL":
                continue

            raw_group = entry.get("group") or ""
            label = _norm_group(raw_group) if raw_group else "Group"

            table = []
            for row in entry.get("table", []):
                team = row.get("team") or {}
                table.append({
                    "position": row.get("position", 0),
                    "team":     team.get("name") or team.get("shortName") or "Unknown",
                    "crest":    team.get("crest") or "",
                    "played":   row.get("playedGames", 0),
                    "won":      row.get("won", 0),
                    "drawn":    row.get("draw", 0),
                    "lost":     row.get("lost", 0),
                    "points":   row.get("points", 0),
                })

            groups.append({"group": label, "table": table})

        _cache_set("standings", groups, TTL_STANDINGS)
        return jsonify(groups)

    except Exception as exc:
        stale = _cache_get_stale("standings")
        if stale is not None:
            print("API failed; returning stale cached standings as fallback")
            return jsonify(stale)
        return jsonify({"error": str(exc)}), 502


@app.route("/players/<team_id>")
def players(team_id):
    url = f"https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id={team_id}"
    response = requests.get(url, timeout=10)
    data = response.json()

    player_list = []
    if data["player"]:
        for player in data["player"][:10]:
            player_list.append({
                "name":     player["strPlayer"],
                "position": player["strPosition"],
                "image":    player["strThumb"],
            })

    return jsonify(player_list)


if __name__ == "__main__":
    app.run(debug=True)
