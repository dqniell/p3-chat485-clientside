"""Public unit tests for conversations REST API."""

import re

from utils import replace_fields

# Regex matches conversation UUID for example
# a1b2c3d4-e5f6-7890-abcd-ef1234567890
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def test_conversations_create(client):
    """Verify POST request to create a new conversation.

    Note: 'client' is a fixture fuction that provides a Flask test server
    interface with a clean database.  It is implemented in conftest.py and
    reused by many tests.  Docs: https://docs.pytest.org/en/latest/fixture.html
    """
    response = client.post("/api/v1/conversations/")
    assert response.status_code == 201
    response_json = response.get_json()

    # Replace dynamic fields with placeholder
    replace_fields(response_json, key="created", value="DUMMY")

    # Verify UUID format
    assert "uuid" in response_json
    assert UUID_RE.match(response_json["uuid"])
    conv_uuid = response_json["uuid"]

    # Replace dynamic uuid with placeholder
    replace_fields(response_json, key="uuid", value="DUMMY")

    # Verify response.  Title is null at create; it is filled in later by
    # the first user message.
    assert response_json == {
        "uuid": "DUMMY",
        "title": None,
        "created": "DUMMY",
        "url": f"/api/v1/conversations/{conv_uuid}/",
    }
