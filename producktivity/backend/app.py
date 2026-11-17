import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

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
        title = data["title"].strip() if isinstance(data["title"], str) else ""
        if not title:
            return {"error": "title is required"}, 400
        completed = data.get("completed", False)
        if not isinstance(completed, bool):
            return {"error": "completed must be a boolean"}, 400
        result = database.tasks.insert_one({"title": title, "completed": completed})
        return {"id": str(result.inserted_id), "title": title, "completed": completed}, 201

    @app.get("/tasks")
    def list_tasks():
        tasks = [
            {"id": str(t["_id"]), "title": t["title"], "completed": t["completed"]}
            for t in database.tasks.find()
        ]
        return jsonify(tasks)

    def task_object_id(task_id):
        try:
            return ObjectId(task_id)
        except (InvalidId, TypeError):
            return None

    def update_task(task_id):
        data = request.get_json(silent=True) or {}
        update = {}

        if "title" in data:
            title = data["title"].strip() if isinstance(data["title"], str) else ""
            if not title:
                return {"error": "title is required"}, 400
            update["title"] = title

        if "completed" in data:
            if not isinstance(data["completed"], bool):
                return {"error": "completed must be a boolean"}, 400
            update["completed"] = data["completed"]

        if not update:
            return {"error": "title or completed is required"}, 400

        object_id = task_object_id(task_id)
        if object_id is None:
            return {"error": "task not found"}, 404

        result = database.tasks.find_one_and_update(
            {"_id": object_id},
            {"$set": update},
            return_document=ReturnDocument.AFTER,
        )
        if result is None:
            return {"error": "task not found"}, 404
        return {"id": str(result["_id"]), "title": result["title"], "completed": result["completed"]}

    @app.patch("/tasks/<task_id>")
    @app.put("/tasks/<task_id>")
    def update_task_route(task_id):
        return update_task(task_id)

    @app.delete("/tasks/<task_id>")
    def delete_task(task_id):
        object_id = task_object_id(task_id)
        if object_id is None:
            return {"error": "task not found"}, 404
        result = database.tasks.delete_one({"_id": object_id})
        if result.deleted_count == 0:
            return {"error": "task not found"}, 404
        return {"status": "deleted"}

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5001)