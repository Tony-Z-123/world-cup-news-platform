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
