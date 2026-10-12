"""Shared test fixtures.

Pytest will automatically run the client_setup_teardown() function before a
REST API test.  A test should use "client" as an input, because the name of
the fixture is "client".

EXAMPLE:
>>> def test_simple(client):
>>>     response = client.get("/")
>>>     assert response.status_code == 200

Pytest docs:
https://docs.pytest.org/en/latest/fixture.html#conftest-py-sharing-fixture-functions
"""

import logging
import subprocess
import urllib.parse

import chat485
import pytest
import requests

# Set up logging
LOGGER = logging.getLogger("autograder")


@pytest.fixture(name="client")
def client_setup_teardown():
    """
    Start a Flask test server with a clean database.

    This fixture is used to test the REST API, not the front-end.

    Flask docs: https://flask.palletsprojects.com/en/1.1.x/testing/#testing
    """
    LOGGER.info("Setup test fixture 'client'")

    # Reset the database
    subprocess.run(["bin/chat485db", "reset"], check=True)

    # Configure Flask test server
    chat485.app.config["TESTING"] = True

    # Transfer control to test.  The code before the "yield" statement is setup
    # code, which is executed before the test.  Code after the "yield" is
    # teardown code, which is executed at the end of the test.  Teardown code
    # is executed whether the test passed or failed.
    with chat485.app.test_client() as client:
        yield client

    # Teardown code starts here
    LOGGER.info("Teardown test fixture 'client'")


@pytest.fixture(autouse=True)
def mock_local_requests(monkeypatch):
    """Route requests.post() calls to localhost through the Flask test client.

    The messages API calls requests.post() to reach the chat completions
    endpoint on the same server.  During testing no live server is running, so
    we intercept those calls and forward them through Flask's test client.
    """
    # Capture the real requests.post before patching, so the non-local
    # fallthrough below can delegate to it without recursing into this mock.
    real_post = requests.post

    def _mock_post(url, json=None, headers=None, **kwargs):
        # Forward only calls aimed at this server (the in-process echo server)
        # through the test client; any other host makes a real request.
        parsed = urllib.parse.urlparse(url)
        if parsed.hostname in ("localhost", "127.0.0.1"):
            LOGGER.info("Intercepting requests.post(%s)", url)
            # Replay the request against the app through Flask's test client,
            # which runs the real view with no live server on a socket.
            with chat485.app.test_client() as tc:
                flask_resp = tc.post(
                    parsed.path,
                    json=json,
                    headers=headers or {},
                )

            # Repackage the test-client result as a genuine requests.Response so
            # .ok, .json(), .text, bool(), and .raise_for_status() all behave
            # exactly as they would against a live server, instead of a
            # hand-mocked subset that silently diverges from real requests.
            response = requests.Response()
            response.status_code = flask_resp.status_code
            response.url = url
            # flask_resp.status is like "404 NOT FOUND"; keep the reason phrase.
            _, _, response.reason = flask_resp.status.partition(" ")
            response.encoding = "utf-8"
            response.headers["Content-Type"] = flask_resp.content_type
            response._content = flask_resp.get_data()
            return response

        # Non-local URL: delegate to the real requests.post captured above.
        return real_post(url, json=json, headers=headers, **kwargs)

    # Route every requests.post() call through the interceptor for this test.
    monkeypatch.setattr("requests.post", _mock_post)
