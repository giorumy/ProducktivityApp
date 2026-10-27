import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from auth import auth_bp


def create_app(database=None):
    app = Flask(__name__)

    if database is None:
        from db import db as database
    app.config["DB"] = database

    # Let the React dev server (Vite, port 5173) call this API
    CORS(app, origins=os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(","))

    # No two users can share a username or email
    database.users.create_index("username_lower", unique=True)
    database.users.create_index("email", unique=True)

    app.register_blueprint(auth_bp)

    @app.route("/health/db")
    def db_health():
        database.command("ping")
        return {"status": "ok"}

    @app.post("/tasks")
    def create_task():
        data = request.get_json(silent=True) or {}
        if not data.get("title"):
            return {"error": "title is required"}, 400
        result = database.tasks.insert_one({"title": data["title"], "completed": False})
        return {"id": str(result.inserted_id), "title": data["title"], "completed": False}, 201

    @app.get("/tasks")
    def list_tasks():
        tasks = [
            {"id": str(t["_id"]), "title": t["title"], "completed": t["completed"]}
            for t in database.tasks.find()
        ]
        return jsonify(tasks)

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5001)