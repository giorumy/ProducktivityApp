import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, login, saveSession, signup, type AuthResponse } from "../auth/api";
import { hasErrors, validateLogin, validateSignup, type FieldErrors, type FieldName } from "../auth/validation";
import "./AuthPage.css";

type Mode = "login" | "signup";

interface AuthPageProps {
  onAuthenticated: (session: AuthResponse) => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setErrors({});
    setFormError("");
    setPassword("");
    setConfirmPassword("");
  }

  // Updates a field and clears its error as soon as the user edits it
  function update(field: FieldName, setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const found = isSignup
      ? validateSignup(username, email, password, confirmPassword)
      : validateLogin(email, password);
    setErrors(found);
    if (hasErrors(found)) return;

    setLoading(true);
    try {
      const session = isSignup
        ? await signup(username.trim(), email.trim(), password)
        : await login(email.trim(), password);
      saveSession(session);
      onAuthenticated(session);
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const passwordToggle = (
    <button
      type="button"
      className="auth__toggle"
      onClick={() => setShowPassword((s) => !s)}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? "Hide" : "Show"}
    </button>
  );

  return (
    <main className="auth">
      {/* Left side: the pond */}
      <section className="auth__pond" aria-hidden="true">
        <div className="auth__pond-text">
          <p className="auth__brand">Producktivity</p>
          <p className="auth__motto">
            Say it.
            <br />
            Do it.
            <br />
            Show it.
          </p>
        </div>
        <div className="auth__water">
          <svg className="auth__duck" viewBox="0 0 120 90">
            <ellipse cx="62" cy="62" rx="44" ry="22" fill="#FFD95A" />
            <path d="M30 58 Q40 40 62 52 Q50 66 30 58Z" fill="#F5C842" />
            <circle cx="88" cy="34" r="20" fill="#FFD95A" />
            <circle cx="94" cy="29" r="3.2" fill="#1A2B2C" />
            <path d="M106 36 Q120 38 116 44 Q108 46 104 42Z" fill="#F2A33A" />
          </svg>
          <svg className="auth__waves" viewBox="0 0 600 40" preserveAspectRatio="none">
            <path d="M0 20 Q50 5 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 V40 H0Z" fill="#2C7C80" />
          </svg>
        </div>
      </section>

      {/* Right side: the form */}
      <section className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <h1 className="auth__title">{isSignup ? "Create your account" : "Log in"}</h1>
          <p className="auth__subtitle">
            {isSignup ? "Start building habits that stick." : "Pick up where you left off."}
          </p>

          {formError && (
            <p className="auth__form-error" role="alert">
              {formError}
            </p>
          )}

          {isSignup && (
            <Field
              id="username"
              label="Username"
              value={username}
              onChange={update("username", setUsername)}
              error={errors.username}
              autoComplete="username"
              hint="3–20 letters, numbers, or underscores"
            />
          )}

          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={update("email", setEmail)}
            error={errors.email}
            autoComplete="email"
            placeholder="you@ufl.edu"
          />

          <Field
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={update("password", setPassword)}
            error={errors.password}
            autoComplete={isSignup ? "new-password" : "current-password"}
            hint={isSignup ? "At least 8 characters, with a letter and a number" : undefined}
            trailing={passwordToggle}
          />

          {isSignup && (
            <Field
              id="confirmPassword"
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={update("confirmPassword", setConfirmPassword)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          )}

          <button className="auth__submit" type="submit" disabled={loading}>
            {loading ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create account" : "Log in"}
          </button>

          <p className="auth__switch">
            {isSignup ? "Already have an account?" : "New to Producktivity?"}{" "}
            <button type="button" className="auth__link" onClick={switchMode}>
              {isSignup ? "Log in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

interface FieldProps {
  id: FieldName;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  trailing?: ReactNode;
}

function Field({ id, label, value, onChange, type = "text", error, hint, placeholder, autoComplete, trailing }: FieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="auth__field">
      <label className="auth__label" htmlFor={id}>
        {label}
      </label>
      <div className="auth__input-wrap">
        <input
          id={id}
          className={`auth__input${trailing ? " auth__input--with-trailing" : ""}`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={message ? messageId : undefined}
        />
        {trailing}
      </div>
      {message && (
        <p id={messageId} className={error ? "auth__error" : "auth__hint"}>
          {message}
        </p>
      )}
    </div>
  );
}
