"""module contains database helper functions."""

import sqlite3

import flask

import chat485


def get_db():
    """gets/returns the database connection."""
    if "sqlite_db" not in flask.g:
        flask.g.sqlite_db = sqlite3.connect(chat485.app.config["DATABASE_FILENAME"])
        flask.g.sqlite_db.row_factory = sqlite3.Row

    return flask.g.sqlite_db


def close_db(_error):
    """Close the database connection."""
    db = flask.g.pop("sqlite_db", None)
    if db is not None:
        db.close()


chat485.app.teardown_appcontext(close_db)
