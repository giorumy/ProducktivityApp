import { useState } from "react";
import "./App.css";
import AuthPage from "./pages/AuthPage";
import { clearSession, getSession, type AuthResponse } from "./auth/api";

function App() {
  const [session, setSession] = useState<AuthResponse | null>(() => getSession());

  if (!session) {
    return <AuthPage onAuthenticated={setSession} />;
  }

  // Placeholder until the dashboard exists
  return (
    <main style={{ padding: "4rem 1.5rem" }}>
      <h1>Welcome, {session.user.username}!</h1>
      <p style={{ marginBottom: "1.5rem" }}>You're logged in. The dashboard will go here.</p>
      <button
        onClick={() => {
          clearSession();
          setSession(null);
        }}
      >
        Log out
      </button>
    </main>
  );
}

export default App;
