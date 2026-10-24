"""Signup and login routes.

Matches the contract in the frontend's src/auth/api.ts:
  POST /api/auth/signup  { username, email, password } -> { token, user }
  POST /api/auth/login   { email, password }           -> { token, user }
Errors come back as { "error": "...", "field": "username" | "email" | "password" }.
"""

import os
import re
from datetime import datetime, timedelta, timezone

import jwt
from flask import Blueprint, current_app, request
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,20}$")
TOKEN_HOURS = 24


def users():
    return current_app.config["DB"].users


def error(message, status, field=None):
    body = {"error": message}
    if field:
        body["field"] = field
    return body, status


def make_token(user_id):
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS256")


def public_user(doc):
    return {"id": str(doc["_id"]), "username": doc["username"], "email": doc["email"]}


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Same rules as the frontend's validation.ts
    if not USERNAME_PATTERN.match(username):
        return error("Use 3–20 letters, numbers, or underscores.", 400, "username")
    if not EMAIL_PATTERN.match(email):
        return error("That doesn't look like an email address.", 400, "email")
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return error("Use at least 8 characters with a letter and a number.", 400, "password")

    if users().find_one({"username_lower": username.lower()}):
        return error("That username is already taken.", 409, "username")
    if users().find_one({"email": email}):
        return error("That email is already registered.", 409, "email")

    doc = {
        "username": username,
        "username_lower": username.lower(),
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": "member",
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = users().insert_one(doc)
    except DuplicateKeyError:
        # Two signups at the same moment; the unique index caught it
        return error("That username or email is already taken.", 409)

    doc["_id"] = result.inserted_id
    return {"token": make_token(str(doc["_id"])), "user": public_user(doc)}, 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = users().find_one({"email": email})
    # Same message whether the email or the password is wrong
    if not user or not check_password_hash(user["password_hash"], password):
        return error("Email or password is incorrect.", 401)

    return {"token": make_token(str(user["_id"])), "user": public_user(user)}