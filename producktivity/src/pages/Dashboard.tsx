import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./Dashboard.css";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface DashboardProps {
  onSignOut: () => void;
  username?: string;
  initialTasks?: Task[];
}

interface RemovedTask {
  task: Task;
  index: number;
}

const APP_NAME = "Producktivity";
const POINTS_PER_GOAL = 10; //temporary point value; replace with backend values
const UNDO_WINDOW_MS = 5000;

export default function Dashboard({ onSignOut, username, initialTasks = [] }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draft, setDraft] = useState("");
  const [removed, setRemoved] = useState<RemovedTask | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const undoTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  const completedCount = tasks.filter((g) => g.completed).length;
  const percent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const points = completedCount * POINTS_PER_GOAL;

  //connect backend calls with task handlers

  function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), title, completed: false }]);
    setDraft("");
  }

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)));
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditText(task.title);
  }

  function saveEdit(id: string) {
    const title = editText.trim();
    if (!title) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    setEditingId(null);
    setEditText("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function removeTask(id: string) {
    const index = tasks.findIndex((g) => g.id === id);
    if (index === -1) return;
    setRemoved({ task: tasks[index], index });
    setTasks((prev) => prev.filter((g) => g.id !== id));
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setRemoved(null), UNDO_WINDOW_MS);
  }

  function undoRemove() {
    if (!removed) return;
    const { task, index } = removed;
    setTasks((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, task);
      return next;
    });
    setRemoved(null);
    window.clearTimeout(undoTimer.current);
  }

  return (
    <div className="dash">
      <aside className="dash-sidebar" aria-label="Sidebar">
        <p className="dash-brand">{APP_NAME}</p>
        {username && <p className="dash-user">{username}</p>}
        <nav className="dash-nav" aria-label="Main">
          <a className="dash-nav-item" href="#goals" aria-current="page">
            Tasks
          </a>
        </nav>
        <button type="button" className="dash-btn dash-btn-quiet dash-signout" onClick={onSignOut}>
          Sign out
        </button>
      </aside>

      <main className="dash-main" id="tasks">
        <header className="dash-header">
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-points" aria-label={`${points} points earned`}>
            <strong>{points}</strong> points
          </p>
        </header>

        {/* duck companion placeholder*/}
        <section className="dash-stage" aria-label="Pet companion" data-slot="pet-companion" />

        <section className="dash-panel" aria-labelledby="progress-heading">
          <div className="dash-progress-head">
            <h2 id="progress-heading" className="dash-heading">Progress</h2>
            <p className="dash-muted">
              {completedCount} of {tasks.length} complete
            </p>
          </div>
          <div
            className="dash-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Task completion"
          >
            <div className="dash-bar-fill" style={{ transform: `scaleX(${percent / 100})` }} />
          </div>

          <form className="dash-add" onSubmit={addTask}>
            <label htmlFor="new-task" className="dash-sr">
              New task
            </label>
            <input
              id="new-task"
              className="dash-input"
              type="text"
              placeholder="Add a task"
              value={draft}
              maxLength={120}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="dash-btn dash-btn-primary" disabled={!draft.trim()}>
              Add task
            </button>
          </form>

          {tasks.length === 0 ? (
            <p className="dash-empty">No tasks for now!</p>
          ) : (
            <ul className="dash-list">
              {tasks.map((task) => {
                const isEditing = task.id === editingId;
                return (
                  <li key={task.id} className="dash-item" data-done={task.completed}>
                    {isEditing ? (
                      <div className="dash-edit-row" style={{ display: "flex", width: "100%", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          className="dash-input"
                          value={editText}
                          maxLength={120}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(task.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="dash-btn dash-btn-primary"
                          onClick={() => saveEdit(task.id)}
                          disabled={!editText.trim()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="dash-btn dash-btn-quiet"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="dash-check">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                          />
                          <span className="dash-check-box" aria-hidden="true" />
                          <span className="dash-item-title">{task.title}</span>
                        </label>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            className="dash-btn dash-btn-quiet"
                            onClick={() => startEdit(task)}
                            aria-label={`Edit ${task.title}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn-quiet"
                            onClick={() => removeTask(task.id)}
                            aria-label={`Delete ${task.title}`}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {removed && (
        <div className="dash-toast" role="status">
          <span>Task deleted</span>
          <button type="button" className="dash-toast-action" onClick={undoRemove}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}