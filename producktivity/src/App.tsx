import { useState } from "react";
import "./App.css";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import { clearSession, getSession, type AuthResponse } from "./auth/api";

function App() {
  const [session, setSession] = useState<AuthResponse | null>(() => getSession());

  if (!session) {
    return <AuthPage onAuthenticated={setSession} />;
  }

  // Placeholder until the dashboard exists
  return (
    <Dashboard
      username={session.user.username}
      onSignOut={() => {
        clearSession();
        setSession(null);
      }}
    />
    );
}

export default App;