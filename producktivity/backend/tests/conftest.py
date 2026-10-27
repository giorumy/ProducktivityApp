import os
import sys

import mongomock
import pytest

# Make backend/ importable when running `pytest` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JWT_SECRET", "test-secret-key-that-is-at-least-32-bytes")

from app import create_app  # noqa: E402


@pytest.fixture
def client():
    # In-memory fake MongoDB, so tests never touch Atlas
    fake_db = mongomock.MongoClient().db
    app = create_app(fake_db)
    app.config["TESTING"] = True
    return app.test_client()