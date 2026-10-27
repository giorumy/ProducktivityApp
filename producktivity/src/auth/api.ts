// Talks to the Flask backend for signup and login.
//
// USE_MOCK = true fakes the backend so the forms can be tested before
// Omar's endpoints exist. Switch it to false once these work:
//   POST /api/auth/signup  { username, email, password } -> { token, user }
//   POST /api/auth/login   { email, password }           -> { token, user }
// Errors should come back as { "error": "message", "field": "username" | "email" }
// with status 401 (wrong login) or 409 (username/email already taken).

export const USE_MOCK = false;

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class ApiError extends Error {
  status: number;
  field?: "username" | "email";

  constructor(message: string, status: number, field?: "username" | "email") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
  }
}

// ---------- Real backend ----------

function fallbackMessage(status: number): string {
  if (status === 401) return "Email or password is incorrect.";
  if (status === 409) return "That username or email is already taken.";
  return "Something went wrong on our end. Try again in a moment.";
}

async function post(path: string, body: object): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Make sure the backend is running.", 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error ?? fallbackMessage(response.status), response.status, data.field);
  }
  return data as AuthResponse;
}

// ---------- Fake backend for testing ----------
// Login works with any valid email and the password "password123".
// Signing up with the username "taken" shows the duplicate-username error.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockLogin(email: string, password: string): Promise<AuthResponse> {
  await wait(600);
  if (password !== "password123") {
    throw new ApiError("Email or password is incorrect.", 401);
  }
  return { token: "mock-token", user: { id: "1", username: email.split("@")[0], email } };
}

async function mockSignup(username: string, email: string): Promise<AuthResponse> {
  await wait(600);
  if (username.toLowerCase() === "taken") {
    throw new ApiError("That username is already taken.", 409, "username");
  }
  return { token: "mock-token", user: { id: "1", username, email } };
}

// ---------- What the pages use ----------

export function login(email: string, password: string): Promise<AuthResponse> {
  return USE_MOCK ? mockLogin(email, password) : post("/api/auth/login", { email, password });
}

export function signup(username: string, email: string, password: string): Promise<AuthResponse> {
  return USE_MOCK
    ? mockSignup(username, email)
    : post("/api/auth/signup", { username, email, password });
}

const TOKEN_KEY = "producktivity.token";
const USER_KEY = "producktivity.user";

export function saveSession(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function getSession(): AuthResponse | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  if (!token || !user) return null;
  try {
    return { token, user: JSON.parse(user) as User };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
