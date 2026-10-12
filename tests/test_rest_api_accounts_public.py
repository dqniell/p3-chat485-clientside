"""Public unit tests for account REST API."""


def test_login(client):
    """Verify POST login returns logname.

    Note: 'client' is a fixture fuction that provides a Flask test server
    interface with a clean database.  It is implemented in conftest.py and
    reused by many tests.  Docs: https://docs.pytest.org/en/latest/fixture.html
    """
    response = client.post(
        "/api/v1/accounts/sessions",
        json={
            "email": "awdeorio@umich.edu",
            "password": "chickens",
        },
    )
    assert response.status_code == 200
    assert response.get_json() == {
        "userid": 1,
        "fullname": "Andrew DeOrio",
    }
