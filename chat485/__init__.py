"""Initializes flask application."""

from pathlib import Path

import flask

app = flask.Flask(__name__)

project_root = Path(__file__).resolve().parent.parent
app.config["DATABASE_FILENAME"] = project_root / "var" / "chat485.sqlite3"

import chat485.api  # noqa: E402
import chat485.echo  # noqa: E402
import chat485.model  # noqa: E402


@app.route("/")
def index():
    """Serve the React application."""
    return app.send_static_file("index.html")


@app.route("/conversations/<_uuid>/")
def conversation_page(_uuid):
    """Serve the React application for a conversation."""
    return app.send_static_file("index.html")
