import jwt

GOOD = {"username": "omar_s", "email": "omar@ufl.edu", "password": "duckpond123"}


def signup(client, **overrides):
    return client.post("/api/auth/signup", json={**GOOD, **overrides})


def test_signup_returns_token_and_user(client):
    res = signup(client)
    assert res.status_code == 201
    body = res.get_json()
    assert body["user"]["username"] == "omar_s"
    assert body["user"]["email"] == "omar@ufl.edu"
    assert "password" not in str(body["user"])
    assert jwt.decode(body["token"], "test-secret-key-that-is-at-least-32-bytes", algorithms=["HS256"])["sub"] == body["user"]["id"]


def test_password_is_not_stored_in_plain_text(client):
    signup(client)
    stored = client.application.config["DB"].users.find_one({"email": "omar@ufl.edu"})
    assert stored["password_hash"] != GOOD["password"]


def test_duplicate_username_is_rejected(client):
    signup(client)
    res = signup(client, username="OMAR_S", email="other@ufl.edu")
    assert res.status_code == 409
    assert res.get_json()["field"] == "username"


def test_duplicate_email_is_rejected(client):
    signup(client)
    res = signup(client, username="someone_else", email="Omar@UFL.edu")
    assert res.status_code == 409
    assert res.get_json()["field"] == "email"


def test_weak_password_is_rejected(client):
    res = signup(client, password="short")
    assert res.status_code == 400
    assert res.get_json()["field"] == "password"


def test_bad_username_is_rejected(client):
    res = signup(client, username="no spaces!")
    assert res.status_code == 400
    assert res.get_json()["field"] == "username"


def test_login_with_correct_password(client):
    signup(client)
    res = client.post("/api/auth/login", json={"email": "omar@ufl.edu", "password": "duckpond123"})
    assert res.status_code == 200
    assert res.get_json()["user"]["username"] == "omar_s"


def test_login_with_wrong_password(client):
    signup(client)
    res = client.post("/api/auth/login", json={"email": "omar@ufl.edu", "password": "wrongpass1"})
    assert res.status_code == 401


def test_login_with_unknown_email(client):
    res = client.post("/api/auth/login", json={"email": "nobody@ufl.edu", "password": "duckpond123"})
    assert res.status_code == 401


def test_cors_allows_react_dev_server(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "x@y.z", "password": "x"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"