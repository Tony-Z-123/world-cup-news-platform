from dotenv import load_dotenv
import os
from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

@app.route("/")
def home():
    try:
        url = "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026"
        response = requests.get(url, timeout=10)
        data = response.json()

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
		"homeTeamId": event["idHomeTeam"],
		"awayTeamId": event["idAwayTeam"],
                "homeBadge": event["strHomeTeamBadge"],
                "awayBadge": event["strAwayTeamBadge"]
            })

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