"""Register the REST API routes."""

import hashlib
import hmac
import uuid

import flask
import requests

import chat485
from chat485.config import MODELS
from chat485.model import get_db

MAX_TITLE_LENGTH = 30
REQUEST_TIMEOUT = 30
PASSWORD_HASH_PARTS = 3


def json_error(error):
    """Return an HTTP error as JSON."""
    return {
        "status_code": error.code,
        "message": error.name,
    }, error.code


for status_code in (400, 401, 403, 404, 405, 409, 502):
    chat485.app.register_error_handler(status_code, json_error)


@chat485.app.route("/api/v1/", methods=["GET"])
def get_resources():
    """Get resources from api/v1."""
    return {
        "chat_completions": "/api/v1/chat/completions",
        "conversations": "/api/v1/conversations/",
        "models": "/api/v1/models",
        "url": flask.request.path,
    }


@chat485.app.route("/api/v1/models", methods=["GET"])
def get_models():
    """Get models from v1/models."""
    models = []
    for model in MODELS:
        if "api_key" in model and model["api_key"] in (None, ""):
            continue
        models.append({"id": model["model"]})
    return {"data": models}


@chat485.app.route("/api/v1/conversations/", methods=["GET"])
def get_conversations():
    """Retrieve user's existing conversations."""
    db = get_db()

    session = get_current_session()
    if session is None:
        return {
            "results": [],
            "url": flask.request.path,
        }

    if session["userid"] is not None:
        cursor = db.execute(
            """
            SELECT uuid, title, created
            FROM conversations
            WHERE userid = ?
            ORDER BY created DESC, conversationid DESC;
            """,
            (session["userid"],),
        )
    else:
        cursor = db.execute(
            """
            SELECT uuid, title, created
            FROM conversations
            WHERE sessionid = ?
            ORDER BY created DESC, conversationid DESC;
            """,
            (session["sessionid"],),
        )

    rows = cursor.fetchall()
    converted = []
    for row in rows:
        converted.append(dict(row))
    return {"results": converted, "url": flask.request.path}


@chat485.app.route("/api/v1/conversations/<uuid>/", methods=["GET"])
def retrieve_message(uuid):
    """Retrieve conversation metadata inside a specific conversation."""
    conversation = get_authorized_conversation(uuid)

    return {
        "uuid": conversation["uuid"],
        "title": conversation["title"],
        "created": conversation["created"],
        "url": flask.request.path,
    }


@chat485.app.route("/api/v1/conversations/", methods=["POST"])
def create_conversation():
    """Create a new empty conversation in the app."""
    db = get_db()

    session = get_current_session()

    userid = None
    sessionid = None
    new_session = False

    if session is None:
        sessionid = str(uuid.uuid4())
        db.execute(
            """
            INSERT INTO sessions (sessionid, userid)
            VALUES (?, ?)
            """,
            (sessionid, None),
        )
        new_session = True
    elif session["userid"] is not None:
        userid = session["userid"]
    else:
        sessionid = session["sessionid"]

    new_uuid = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO conversations (uuid, userid, sessionid, title)
        VALUES (?, ?, ?, ?)
        """,
        (new_uuid, userid, sessionid, None),
    )
    db.commit()

    cursor = db.execute(
        """
        SELECT uuid, title, created
        FROM conversations
        WHERE uuid = ?
        """,
        (new_uuid,),
    )
    row = cursor.fetchone()

    response_data = {
        "uuid": new_uuid,
        "title": None,
        "created": row["created"],
        "url": f"/api/v1/conversations/{new_uuid}/",
    }

    response = flask.make_response(response_data, 201)

    if new_session:
        response.set_cookie(
            "sessionid",
            sessionid,
            httponly=True,
            samesite="Lax",
        )

    return response


@chat485.app.route("/api/v1/conversations/<uuid>/", methods=["DELETE"])
def delete_conversation(uuid):
    """Delete a conversation by its UUID."""
    db = get_db()

    get_authorized_conversation(uuid)

    db.execute(
        """
        DELETE FROM conversations
        WHERE uuid = ?
        """,
        (uuid,),
    )
    db.commit()
    return "", 204


@chat485.app.route("/api/v1/conversations/<uuid>/messages/", methods=["GET"])
def get_messages(uuid):
    """Retrieve messages belonging to a conversation."""
    db = get_db()

    get_authorized_conversation(uuid)

    size = flask.request.args.get("size", "10")
    try:
        size = int(size)
    except ValueError:
        flask.abort(400)

    if size <= 0:
        flask.abort(400)

    before = flask.request.args.get("before")
    if before is not None:
        try:
            before = int(before)
        except ValueError:
            flask.abort(400)
        if before <= 0:
            flask.abort(400)

    cursor = db.execute(
        """
        SELECT messages.messageid,
            messages.conversationid,
            messages.role,
            messages.content,
            messages.created
        FROM messages
        JOIN conversations
            ON messages.conversationid = conversations.conversationid
        WHERE conversations.uuid = ?
        AND (? IS NULL OR messages.messageid < ?)
        ORDER BY messages.messageid DESC
        LIMIT ?
        """,
        (uuid, before, before, size),
    )
    rows = cursor.fetchall()

    messages = []
    for row in rows:
        messages.append(dict(row))

    next_url = ""

    if len(messages) == size:
        oldest_id = messages[-1]["messageid"]
        next_url = (
            f"/api/v1/conversations/{uuid}/messages/?size={size}&before={oldest_id}"
        )

    return {
        "results": messages,
        "next": next_url,
        "url": flask.request.full_path.rstrip("?"),
    }


@chat485.app.route("/api/v1/conversations/<uuid>/messages/", methods=["POST"])
def create_message(uuid):
    """Create a user message and generate response."""
    db = get_db()
    data = flask.request.get_json(silent=True)

    if not isinstance(data, dict):
        flask.abort(400)

    content = data.get("content")
    model = data.get("model", "echo-1")

    if content is None:
        flask.abort(400)

    model_config = None
    for m in MODELS:
        if m["model"] == model:
            model_config = m
            break
    if model_config is None:
        flask.abort(400)

    conversation = get_authorized_conversation(uuid)

    if conversation["title"] is None:
        title = generate_conversation_title(content)

        db.execute(
            """
            UPDATE conversations
            SET title = ?
            WHERE conversationid = ?
            """,
            (title, conversation["conversationid"]),
        )
        db.commit()

    db.execute(
        """
        INSERT INTO messages (conversationid, role, content)
        VALUES (?, ?, ?)
        """,
        (conversation["conversationid"], "user", content),
    )
    db.commit()

    cursor = db.execute(
        """
        SELECT role, content
        FROM messages
        WHERE conversationid = ?
        ORDER BY messageid DESC
        LIMIT 20
        """,
        (conversation["conversationid"],),
    )
    rows = cursor.fetchall()
    rows = rows[::-1]

    history = []
    for row in rows:
        history.append(
            {
                "role": row["role"],
                "content": row["content"],
            }
        )

    generic_message = {
        "role": "system",
        "content": "You are Chat485, a helpful AI assistant.",
    }

    model_messages = [generic_message] + history
    payload = {"model": model, "messages": model_messages}
    headers = {}
    api_key = model_config.get("api_key")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        response = requests.post(
            model_config["api_url"],
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException:
        flask.abort(502)

    response_data = response.json()
    assistant_content = response_data["choices"][0]["message"]["content"]

    cursor = db.execute(
        """
        INSERT INTO messages (conversationid, role, content)
        VALUES (?, ?, ?)
        """,
        (conversation["conversationid"], "assistant", assistant_content),
    )
    db.commit()

    assistant_id = cursor.lastrowid
    cursor = db.execute(
        """
        SELECT messageid, role, content, created
        FROM messages
        WHERE messageid = ?
        """,
        (assistant_id,),
    )

    assistant_message = cursor.fetchone()

    return {
        "messageid": assistant_message["messageid"],
        "role": assistant_message["role"],
        "content": assistant_message["content"],
        "created": assistant_message["created"],
    }, 201


def generate_conversation_title(content):
    """Generate a conversation title from the first user message."""
    if len(content) <= MAX_TITLE_LENGTH:
        return content

    title = content[:MAX_TITLE_LENGTH]
    last_space = title.rfind(" ")

    if last_space != -1:
        title = title[:last_space]

    return title + "..."


def get_current_session():
    """Retrieve the current session or Basic-authenticated user."""
    auth = flask.request.authorization

    if auth is not None:
        if auth.type.lower() != "basic":
            flask.abort(401)

        userid = get_basic_auth_user()

        if userid is None:
            flask.abort(401)

        return {
            "userid": userid,
            "sessionid": None,
        }

    session_id = flask.request.cookies.get("sessionid")

    if session_id is None:
        return None

    db = get_db()

    cursor = db.execute(
        """
        SELECT sessionid, userid
        FROM sessions
        WHERE sessionid = ?
        """,
        (session_id,),
    )

    return cursor.fetchone()


def get_authorized_conversation(uuid):
    """Retrieve a conversation and verify ownership."""
    db = get_db()

    cursor = db.execute(
        """
        SELECT conversationid, uuid, userid, sessionid, title, created
        FROM conversations
        WHERE uuid = ?
        """,
        (uuid,),
    )

    conversation = cursor.fetchone()

    if conversation is None:
        flask.abort(404)

    session = get_current_session()
    if session is None:
        flask.abort(403)

    if session["userid"] is not None:
        if conversation["userid"] != session["userid"]:
            flask.abort(403)
    elif conversation["sessionid"] != session["sessionid"]:
        flask.abort(403)

    return conversation


def verify_password(stored_password, candidate_password):
    """Verify a password against its stored hash."""
    parts = stored_password.split("$")

    if len(parts) != PASSWORD_HASH_PARTS:
        return False

    algorithm, salt, stored_digest = parts
    if algorithm != "sha512":
        return False

    salted_password = salt + candidate_password
    hash_obj = hashlib.new(algorithm)
    hash_obj.update(salted_password.encode("utf-8"))
    calculated_digest = hash_obj.hexdigest()
    return hmac.compare_digest(calculated_digest, stored_digest)


def get_basic_auth_user():
    """Authenticate a user using HTTP."""
    auth = flask.request.authorization
    if auth is None or auth.type.lower() != "basic":
        return None

    db = get_db()

    cursor = db.execute(
        """
        SELECT userid, password
        FROM users
        WHERE email = ?
        """,
        (auth.username,),
    )

    user = cursor.fetchone()
    if user is None:
        return None

    if not verify_password(user["password"], auth.password):
        return None

    return user["userid"]


@chat485.app.route("/api/v1/accounts", methods=["POST"])
def create_account():
    """Create a new user account."""
    data = flask.request.get_json(silent=True)
    if not isinstance(data, dict):
        flask.abort(400)

    fullname = data.get("fullname")
    email = data.get("email")
    password = data.get("password")

    if not isinstance(fullname, str) or not fullname:
        flask.abort(400)

    if not isinstance(email, str) or not email:
        flask.abort(400)

    if not isinstance(password, str) or not password:
        flask.abort(400)

    db = get_db()
    cursor = db.execute(
        """
        SELECT userid
        FROM users
        WHERE email = ?
        """,
        (email,),
    )

    existing_user = cursor.fetchone()
    if existing_user is not None:
        flask.abort(409)

    algorithm = "sha512"
    salt = uuid.uuid4().hex
    salted_password = salt + password
    hash_obj = hashlib.new(algorithm)
    hash_obj.update(salted_password.encode("utf-8"))
    password_digest = hash_obj.hexdigest()
    password_hash = "$".join([algorithm, salt, password_digest])

    cursor = db.execute(
        """
        INSERT INTO users (fullname, email, password)
        VALUES (?, ?, ?)
        """,
        (fullname, email, password_hash),
    )
    new_userid = cursor.lastrowid

    session = get_current_session()
    if session is not None and session["userid"] is None:
        db.execute(
            """
            UPDATE conversations
            SET userid = ?, sessionid = NULL
            WHERE sessionid = ?
            """,
            (new_userid, session["sessionid"]),
        )

    new_sessionid = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO sessions (sessionid, userid)
        VALUES (?, ?)
        """,
        (new_sessionid, new_userid),
    )

    if session is not None and session["userid"] is None:
        db.execute(
            """
            DELETE FROM sessions
            WHERE sessionid = ?
            """,
            (session["sessionid"],),
        )
    db.commit()

    cursor = db.execute(
        """
        SELECT userid, fullname, email, created
        FROM users
        WHERE userid = ?
        """,
        (new_userid,),
    )
    new_user = cursor.fetchone()

    response_data = {
        "userid": new_user["userid"],
        "fullname": new_user["fullname"],
        "email": new_user["email"],
        "created": new_user["created"],
    }

    response = flask.make_response(response_data, 201)

    response.set_cookie("sessionid", new_sessionid, httponly=True, samesite="Lax")

    return response


@chat485.app.route("/api/v1/accounts/sessions", methods=["POST"])
def login_account():
    """Log in an existing user."""
    data = flask.request.get_json(silent=True)

    if not isinstance(data, dict):
        flask.abort(400)

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not email:
        flask.abort(400)

    if not isinstance(password, str) or not password:
        flask.abort(400)

    db = get_db()
    cursor = db.execute(
        """
        SELECT userid, fullname, email, password, created
        FROM users
        WHERE email = ?
        """,
        (email,),
    )

    user = cursor.fetchone()

    if user is None:
        flask.abort(403)

    if not verify_password(user["password"], password):
        flask.abort(403)

    session = get_current_session()
    if session is not None and session["userid"] is None:
        db.execute(
            """
        UPDATE conversations
        SET userid = ?, sessionid = NULL
        WHERE sessionid = ?
        """,
            (user["userid"], session["sessionid"]),
        )

    new_sessionid = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO sessions (sessionid, userid)
        VALUES (?, ?)
        """,
        (new_sessionid, user["userid"]),
    )

    if session is not None and session["userid"] is None:
        db.execute(
            """
            DELETE FROM sessions
            WHERE sessionid = ?
            """,
            (session["sessionid"],),
        )
    db.commit()

    response_data = {
        "userid": user["userid"],
        "fullname": user["fullname"],
    }

    response = flask.make_response(response_data, 200)

    response.set_cookie(
        "sessionid",
        new_sessionid,
        httponly=True,
        samesite="Lax",
    )

    return response


@chat485.app.route("/api/v1/accounts/sessions", methods=["DELETE"])
def logout_account():
    """Log out the current session."""
    session_id = flask.request.cookies.get("sessionid")

    db = get_db()

    if session_id is not None:
        db.execute(
            """
            DELETE FROM sessions
            WHERE sessionid = ?
            """,
            (session_id,),
        )
        db.commit()

    response = flask.make_response("", 204)
    response.delete_cookie("sessionid")

    return response


@chat485.app.route("/api/v1/accounts/sessions/me", methods=["GET"])
def get_current_account():
    """Return the currently logged-in user's account."""
    session = get_current_session()

    if session is None or session["userid"] is None:
        flask.abort(403)

    db = get_db()

    cursor = db.execute(
        """
        SELECT userid, fullname, email
        FROM users
        WHERE userid = ?
        """,
        (session["userid"],),
    )

    user = cursor.fetchone()

    if user is None:
        flask.abort(403)

    return {
        "userid": user["userid"],
        "fullname": user["fullname"],
        "email": user["email"],
    }, 200


@chat485.app.route("/api/v1/accounts/<int:userid>", methods=["GET"])
def get_account(userid):
    """Retrieve account information."""
    session = get_current_session()

    if session is None or session["userid"] is None:
        flask.abort(403)

    db = get_db()

    cursor = db.execute(
        """
        SELECT userid, fullname, email, created
        FROM users
        WHERE userid = ?
        """,
        (userid,),
    )

    user = cursor.fetchone()

    if user is None:
        flask.abort(404)

    return {
        "userid": user["userid"],
        "fullname": user["fullname"],
        "email": user["email"],
        "created": user["created"],
    }, 200


@chat485.app.route("/api/v1/accounts/<int:userid>", methods=["PATCH"])
def update_account(userid):
    """Update the authenticated user's account details."""
    session = get_current_session()

    if session is None or session["userid"] is None:
        flask.abort(403)

    if session["userid"] != userid:
        flask.abort(403)

    data = flask.request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        flask.abort(400)

    fullname = data.get("fullname")
    email = data.get("email")

    if "fullname" not in data and "email" not in data:
        flask.abort(400)

    if "fullname" in data and (not isinstance(fullname, str) or not fullname):
        flask.abort(400)

    if "email" in data and (not isinstance(email, str) or not email):
        flask.abort(400)

    db = get_db()

    cursor = db.execute(
        """
        SELECT userid, fullname, email, created
        FROM users
        WHERE userid = ?
        """,
        (userid,),
    )

    user = cursor.fetchone()

    if user is None:
        flask.abort(404)

    if "email" in data and email != user["email"]:
        cursor = db.execute(
            """
            SELECT userid
            FROM users
            WHERE email = ?
            AND userid != ?
            """,
            (email, userid),
        )

        if cursor.fetchone() is not None:
            flask.abort(409)

    if "fullname" not in data:
        fullname = user["fullname"]

    if "email" not in data:
        email = user["email"]

    db.execute(
        """
        UPDATE users
        SET fullname = ?, email = ?
        WHERE userid = ?
        """,
        (fullname, email, userid),
    )

    db.commit()

    cursor = db.execute(
        """
        SELECT userid, fullname, email, created
        FROM users
        WHERE userid = ?
        """,
        (userid,),
    )

    updated_user = cursor.fetchone()

    return {
        "userid": updated_user["userid"],
        "fullname": updated_user["fullname"],
        "email": updated_user["email"],
        "created": updated_user["created"],
    }, 200
