import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from auth import auth_bp

from bson import ObjectId
from bson.errors import InvalidId


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
    

    @app.get("/tasks/<task_id>")
    def get_task(task_id):
        try:
            task = database.tasks.find_one({"_id": ObjectId(task_id)})
        except InvalidId:
            return {"error": "Invalid task ID"}, 400

        if task is None:
            return {"error": "Task not found"}, 404

        return {
            "id": str(task["_id"]),
            "title": task["title"],
            "completed": task["completed"]
        }

    @app.patch("/tasks/<task_id>")
    def update_task(task_id):
        data = request.get_json(silent=True) or {}

        updates = {}

        if "title" in data:
            if not isinstance(data["title"], str) or not data["title"].strip():
                return {"error": "title cannot be empty"}, 400
            updates["title"] = data["title"].strip()

        if "completed" in data:
            if not isinstance(data["completed"], bool):
                return {"error": "completed must be a boolean"}, 400
            updates["completed"] = data["completed"]

        if not updates:
            return {"error": "No valid fields to update"}, 400

        try:
            task_id_obj = ObjectId(task_id)
        except InvalidId:
            return {"error": "Invalid task ID"}, 400

        result = database.tasks.update_one(
            {"_id": task_id_obj},
            {"$set": updates}
        )

        if result.matched_count == 0:
            return {"error": "Task not found"}, 404

        task = database.tasks.find_one({"_id": task_id_obj})

        return {
            "id": str(task["_id"]),
            "title": task["title"],
            "completed": task["completed"]
        }

    @app.delete("/tasks/<task_id>")
    def delete_task(task_id):
        try:
            task_id_obj = ObjectId(task_id)
        except InvalidId:
            return {"error": "Invalid task ID"}, 400

        result = database.tasks.delete_one({"_id": task_id_obj})

        if result.deleted_count == 0:
            return {"error": "Task not found"}, 404

        return {"message": "Task deleted successfully"}, 200

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5001)