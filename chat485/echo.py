"""
Echo provider: OpenAI-compatible chat completions endpoint.

Drop-in mock for an upstream chat completions service.  Returns the last user
message as the assistant response, formatted to match the OpenAI chat
completions schema.  Hosted in-process so chat485 has a working provider
without an external dependency.

Andrew DeOrio <awdeorio@umich.edu>
"""

import logging
import time
import uuid

import flask

import chat485

LOGGER = logging.getLogger("echo")

# Hard-coded character budget for the echo server's "context window".  Real
# providers enforce limits in tokens.  We use characters so the limit is
# deterministic and easy to test from both pytest and Cypress.
MAX_CONTEXT_CHARS = 8000


@chat485.app.route("/api/v1/chat/completions", methods=["POST"])
def chat_completions():
    """OpenAI-compatible chat completions (echo server)."""
    data = flask.request.get_json() or {}
    model = data.get("model", "echo-1")
    messages = data.get("messages", [])

    total_chars = sum(len(m.get("content", "")) for m in messages)
    LOGGER.info(
        "Request: model=%s, messages=%s, chars=%s",
        model,
        len(messages),
        total_chars,
    )
    if total_chars > MAX_CONTEXT_CHARS:
        LOGGER.warning(
            "Rejected request: %s chars exceeds %s limit",
            total_chars,
            MAX_CONTEXT_CHARS,
        )
        return flask.jsonify(
            error={
                "message": (
                    f"Request exceeds context window of {MAX_CONTEXT_CHARS} "
                    f"characters (got {total_chars})."
                ),
                "code": "context_length_exceeded",
            }
        ), 400

    last_user_message = ""
    for message in reversed(messages):
        if message.get("role") == "user":
            last_user_message = message.get("content", "")
            break
    if not last_user_message:
        LOGGER.warning("Request had no user message")

    return flask.jsonify(
        id=f"chatcmpl-{uuid.uuid4().hex[:29]}",
        object="chat.completion",
        created=int(time.time()),
        model=model,
        choices=[
            {
                "index": 0,
                "message": {"role": "assistant", "content": last_user_message},
                "finish_reason": "stop",
            }
        ],
    )
