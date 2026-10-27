def test_create_and_list_tasks(client):
    res = client.post("/tasks", json={"title": "first task"})
    assert res.status_code == 201
    assert res.get_json()["completed"] is False

    tasks = client.get("/tasks").get_json()
    assert [t["title"] for t in tasks] == ["first task"]


def test_task_requires_title(client):
    res = client.post("/tasks", json={})
    assert res.status_code == 400
    