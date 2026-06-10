from dotenv import load_dotenv
import os
from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
FOOTBALL_DATA_API_KEY = os.getenv("FOOTBALL_DATA_API_KEY")


def _fetch_from_football_data():
    """Fetch World Cup matches from football-data.org and normalise to frontend format."""
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

    raw_matches = resp.json().get("matches", [])
    matches = []

    for m in raw_matches:
        utc_date = m.get("utcDate") or ""
        date_part = utc_date[:10] if utc_date else ""
        time_part = utc_date[11:16] if len(utc_date) >= 16 else ""

        home = m.get("homeTeam") or {}
        away = m.get("awayTeam") or {}
        venue_obj = m.get("venue") or ""
        area = m.get("area") or {}

        # Normalise group label for group-stage matches only ("GROUP_A" → "Group A")
        raw_group = m.get("group") or ""
        if m.get("stage") == "GROUP_STAGE" and raw_group:
            group_label = raw_group.replace("GROUP_", "Group ").replace("_", " ").title()
        else:
            group_label = ""

        matches.append({
            "date": date_part,
            "time": time_part,
            "homeTeam": home.get("name") or home.get("shortName") or "",
            "awayTeam": away.get("name") or away.get("shortName") or "",
            "venue": venue_obj if isinstance(venue_obj, str) else "",
            "country": area.get("name") or "",
            "homeBadge": home.get("crest") or "",
            "awayBadge": away.get("crest") or "",
            "poster": "",
            "group": group_label,
        })

    return matches


def _fetch_from_sportsdb():
    """Fetch World Cup matches from TheSportsDB and normalise to frontend format."""
    url = "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026"
    resp = requests.get(url, timeout=10)
    data = resp.json()

    matches = []
    for event in data["events"]:
        matches.append({
            "date": event["dateEvent"],
            "time": event["strTime"],
            "homeTeam": event["strHomeTeam"],
            "awayTeam": event["strAwayTeam"],
            "venue": event["strVenue"],
            "country": event["strCountry"],
            "poster": event["strPoster"],
            "homeBadge": event["strHomeTeamBadge"],
            "awayBadge": event["strAwayTeamBadge"],
        })

    return matches


@app.route("/")
def home():
    try:
        matches = _fetch_from_football_data()
        return jsonify(matches)
    except Exception:
        pass

    try:
        matches = _fetch_from_sportsdb()
        return jsonify(matches)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/news")
def news():
    url = (
        f"https://newsapi.org/v2/everything?"
        f"q=football&language=en&pageSize=10&apiKey={NEWS_API_KEY}"
    )

    response = requests.get(url, timeout=10)
    data = response.json()

    articles = []

    for article in data["articles"]:
        articles.append({
            "title": article["title"],
            "url": article["url"],
            "image": article["urlToImage"]
        })

    return jsonify(articles)


@app.route("/bracket")
def bracket():
    if not FOOTBALL_DATA_API_KEY:
        return jsonify({"error": "FOOTBALL_DATA_API_KEY is not set"}), 500

    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
    resp = requests.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        headers=headers,
        timeout=10,
    )

    if resp.status_code != 200:
        return jsonify({"error": f"football-data.org returned HTTP {resp.status_code}"}), 502

    raw_matches = resp.json().get("matches", [])

    STAGE_ORDER = {
        "LAST_32":       0,
        "LAST_16":       1,
        "QUARTER_FINALS": 2,
        "SEMI_FINALS":   3,
        "THIRD_PLACE":   4,
        "FINAL":         5,
    }
    STAGE_LABELS = {
        "LAST_32":       "Round of 32",
        "LAST_16":       "Round of 16",
        "QUARTER_FINALS": "Quarter Finals",
        "SEMI_FINALS":   "Semi Finals",
        "THIRD_PLACE":   "Third Place Playoff",
        "FINAL":         "Final",
    }

    stages = {}
    for m in raw_matches:
        stage = m.get("stage") or ""
        if stage not in STAGE_ORDER:
            continue  # skip group stage and unknowns

        utc_date = m.get("utcDate") or ""
        date_part = utc_date[:10] if utc_date else ""
        time_part = utc_date[11:16] if len(utc_date) >= 16 else ""

        home = m.get("homeTeam") or {}
        away = m.get("awayTeam") or {}
        score = m.get("score") or {}
        ft   = score.get("fullTime") or {}

        stages.setdefault(stage, []).append({
            "date":      date_part,
            "time":      time_part,
            "homeTeam":  home.get("name") or home.get("shortName") or "",
            "awayTeam":  away.get("name") or away.get("shortName") or "",
            "homeBadge": home.get("crest") or "",
            "awayBadge": away.get("crest") or "",
            "homeScore": ft.get("home"),
            "awayScore": ft.get("away"),
            "status":    m.get("status") or "",
        })

    result = []
    for key in sorted(stages, key=lambda s: STAGE_ORDER[s]):
        result.append({
            "stage":    STAGE_LABELS[key],
            "stageKey": key,
            "matches":  sorted(stages[key], key=lambda x: x["date"] or ""),
        })

    return jsonify(result)


@app.route("/standings")
def standings():
    if not FOOTBALL_DATA_API_KEY:
        return jsonify({"error": "FOOTBALL_DATA_API_KEY is not set"}), 500

    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
    resp = requests.get(
        "https://api.football-data.org/v4/competitions/WC/standings",
        headers=headers,
        timeout=10,
    )

    if resp.status_code != 200:
        return jsonify({"error": f"football-data.org returned HTTP {resp.status_code}"}), 502

    raw = resp.json().get("standings", [])

    # Keep only the TOTAL standing type (not HOME / AWAY splits)
    groups = []
    for entry in raw:
        if entry.get("type") != "TOTAL":
            continue

        raw_group = entry.get("group") or ""
        # "GROUP_A" → "Group A", "GROUP_B" → "Group B", etc.
        label = raw_group.replace("GROUP_", "Group ").replace("_", " ").title() if raw_group else "Group"

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
                "name": player["strPlayer"],
                "position": player["strPosition"],
                "image": player["strThumb"]
            })

    return jsonify(player_list)


if __name__ == "__main__":
    app.run(debug=True)
