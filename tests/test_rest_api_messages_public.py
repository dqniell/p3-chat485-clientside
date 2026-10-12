"""Public unit tests for messages REST API."""

from utils import replace_fields


def test_messages_create(client):
    """Verify POST request to create a message in a conversation.

    Note: 'client' is a fixture fuction that provides a Flask test server
    interface with a clean database.  It is implemented in conftest.py and
    reused by many tests.  Docs: https://docs.pytest.org/en/latest/fixture.html
    """
    # Create a conversation anonymously
    response = client.post("/api/v1/conversations/")
    assert response.status_code == 201
    conv_uuid = response.get_json()["uuid"]

    # Send a message using the echo model
    response = client.post(
        f"/api/v1/conversations/{conv_uuid}/messages/",
        json={
            "content": "Hello World Again",
            "model": "echo-1",
        },
    )
    assert response.status_code == 201
    response_json = response.get_json()

    # Replace dynamic fields with placeholders
    replace_fields(response_json, key="messageid", value="DUMMY")
    replace_fields(response_json, key="created", value="DUMMY")

    # Verify response is the saved assistant message
    assert response_json == {
        "messageid": "DUMMY",
        "role": "assistant",
        "content": "Hello World Again",
        "created": "DUMMY",
    }
