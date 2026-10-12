"""Public unit tests for REST API.

Covers the resource index and the models list.  Resource-specific tests live
in separate files:

    test_rest_api_conversations_public.py
    test_rest_api_messages_public.py
    test_rest_api_accounts_public.py
"""


def test_resources(client):
    """Verify GET requests to root endpoint.

    Note: 'client' is a fixture fuction that provides a Flask test server
    interface with a clean database.  It is implemented in conftest.py and
    reused by many tests.  Docs: https://docs.pytest.org/en/latest/fixture.html
    """
    # Verify response with information listed in the spec.
    response = client.get("/api/v1/")
    assert response.status_code == 200
    assert response.get_json() == {
        "chat_completions": "/api/v1/chat/completions",
        "conversations": "/api/v1/conversations/",
        "models": "/api/v1/models",
        "url": "/api/v1/",
    }


def test_models_list(client):
    """Verify GET requests to models list endpoint.

    Note: 'client' is a fixture fuction that provides a Flask test server
    interface with a clean database.  It is implemented in conftest.py and
    reused by many tests.  Docs: https://docs.pytest.org/en/latest/fixture.html
    """
    # No login needed - anonymous access works
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    response_json = response.get_json()

    # Verify response contains a "data" key with a list
    assert "data" in response_json
    assert isinstance(response_json["data"], list)

    # Verify each model has an "id" field
    for model in response_json["data"]:
        assert "id" in model

    # Verify default config includes the echo model
    model_ids = [m["id"] for m in response_json["data"]]
    assert "echo-1" in model_ids
