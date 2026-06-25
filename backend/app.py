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
    entry = _cache.get(key)
    if entry and time.time() < entry["expires_at"]:
        return entry["data"]
    return None

def _cache_set(key, data, ttl):
    _cache[key] = {"data": data, "expires_at": time.time() + ttl}

# ─── Venue-matching helpers ───────────────────────────────────────────────────

def _norm(name):
    """Lowercase and strip non-alpha for fuzzy team-name matching."""
    return re.sub(r"[^a-z]", "", (name or "").lower())

def _venue_key(date, home, away):
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
    raw = _raw_football_data_matches()
    _cache_set("raw_fd_matches", raw, TTL_MATCHES)
    return raw

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
    """Convert one raw football-data.org match dict to our frontend format."""
    utc_date  = m.get("utcDate") or ""
    date_part = utc_date[:10] if utc_date else ""
    time_part = utc_date[11:16] if len(utc_date) >= 16 else ""

    home = m.get("homeTeam") or {}
    away = m.get("awayTeam") or {}
    area = m.get("area") or {}

    home_name = home.get("name") or home.get("shortName") or ""
    away_name = away.get("name") or away.get("shortName") or ""

    # Venue: prefer football-data.org; enrich from TheSportsDB when missing
    venue_raw = m.get("venue") or ""
    venue = venue_raw if isinstance(venue_raw, str) else ""
    if not venue and home_name and away_name:
        venue = venue_map.get(_venue_key(date_part, home_name, away_name), "")

    score  = m.get("score") or {}
    ft     = score.get("fullTime") or {}
    status = m.get("status") or ""

    raw_group = m.get("group") or ""
    stage     = m.get("stage") or ""
    group_label = _norm_group(raw_group) if stage == "GROUP_STAGE" and raw_group else ""

    return {
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

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    # Try football-data.org (cached)
    try:
        raw_matches = _get_cached_raw_matches()
        venue_map   = _get_venue_map()
        matches     = [_build_match(m, venue_map) for m in raw_matches]
        return jsonify(matches)
    except Exception:
        pass

    # Fallback to TheSportsDB
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
    url = (
        f"https://newsapi.org/v2/everything?"
        f"q=football&language=en&pageSize=10&apiKey={NEWS_API_KEY}"
    )
    response = requests.get(url, timeout=10)
    data     = response.json()

    articles = [
        {"title": a["title"], "url": a["url"], "image": a["urlToImage"]}
        for a in data.get("articles", [])
    ]
    _cache_set("news", articles, TTL_NEWS)
    return jsonify(articles)


@app.route("/bracket")
def bracket():
    if not FOOTBALL_DATA_API_KEY:
        return jsonify({"error": "FOOTBALL_DATA_API_KEY is not set"}), 500

    # Reuse the same cached raw matches — no extra API call needed
    try:
        raw_matches = _get_cached_raw_matches()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502

    STAGE_ORDER = {
        "LAST_32":        0,
        "LAST_16":        1,
        "QUARTER_FINALS": 2,
        "SEMI_FINALS":    3,
        "THIRD_PLACE":    4,
        "FINAL":          5,
    }
    STAGE_LABELS = {
        "LAST_32":        "Round of 32",
        "LAST_16":        "Round of 16",
        "QUARTER_FINALS": "Quarter Finals",
        "SEMI_FINALS":    "Semi Finals",
        "THIRD_PLACE":    "Third Place Playoff",
        "FINAL":          "Final",
    }

    # Build a group-name → ranked team list from group stage so we can
    # generate meaningful placeholder labels for TBD slots.
    group_teams: dict[str, list[str]] = {}   # "Group A" → ["Brazil","France",...]
    for m in raw_matches:
        if m.get("stage") != "GROUP_STAGE":
            continue
        raw_group = m.get("group") or ""
        if not raw_group:
            continue
        glabel = _norm_group(raw_group)
        if glabel not in group_teams:
            group_teams[glabel] = []
        for team_obj in (m.get("homeTeam") or {}, m.get("awayTeam") or {}):
            name = team_obj.get("name") or team_obj.get("shortName") or ""
            if name and name not in group_teams[glabel]:
                group_teams[glabel].append(name)

    stages: dict = {}
    for m in raw_matches:
        stage = m.get("stage") or ""
        if stage not in STAGE_ORDER:
            continue

        utc_date  = m.get("utcDate") or ""
        date_part = utc_date[:10] if utc_date else ""
        time_part = utc_date[11:16] if len(utc_date) >= 16 else ""

        home  = m.get("homeTeam") or {}
        away  = m.get("awayTeam") or {}
        score = m.get("score") or {}
        ft    = score.get("fullTime") or {}

        home_name = home.get("name") or home.get("shortName") or ""
        away_name = away.get("name") or away.get("shortName") or ""

        # If the API gives us placeholder strings (some editions do), use them.
        # Otherwise leave empty and the frontend will show "TBD".
        home_label = home_name
        away_label = away_name

        stages.setdefault(stage, []).append({
            "date":       date_part,
            "time":       time_part,
            "homeTeam":   home_label,
            "awayTeam":   away_label,
            "homeBadge":  home.get("crest") or "",
            "awayBadge":  away.get("crest") or "",
            "homeScore":  ft.get("home"),
            "awayScore":  ft.get("away"),
            "status":     m.get("status") or "",
            "matchday":   m.get("matchday"),
        })

    result = []
    for key in sorted(stages, key=lambda s: STAGE_ORDER[s]):
        result.append({
            "stage":      STAGE_LABELS[key],
            "stageKey":   key,
            "matches":    sorted(stages[key], key=lambda x: (x["date"] or "", x["matchday"] or 0)),
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
    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
    resp = requests.get(
        "https://api.football-data.org/v4/competitions/WC/standings",
        headers=headers,
        timeout=10,
    )
    if resp.status_code != 200:
        return jsonify({"error": f"football-data.org returned HTTP {resp.status_code}"}), 502

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
