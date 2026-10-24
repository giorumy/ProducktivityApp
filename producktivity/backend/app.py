from flask import Flask, request, jsonify
from db import db

app = Flask(__name__)


@app.route("/health/db")
def db_health():
    db.command("ping")
    return {"status": "ok"}


@app.post("/tasks")
def create_task():
    data = request.get_json() or {}
    if not data.get("title"):
        return {"error": "title is required"}, 400
    result = db.tasks.insert_one({"title": data["title"], "completed": False})
    return {"id": str(result.inserted_id), "title": data["title"], "completed": False}, 201


@app.get("/tasks")
def list_tasks():
    tasks = [
        {"id": str(t["_id"]), "title": t["title"], "completed": t["completed"]}
        for t in db.tasks.find()
    ]
    return jsonify(tasks)


if __name__ == "__main__":
    app.run(debug=True, port=5001)