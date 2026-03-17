import { useState } from "react";
import { apiLogin, apiRegister } from "../api/client";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    handle: "@",
    email: "",
    password: "",
  });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedHandle = form.handle.trim().startsWith("@")
        ? form.handle.trim()
        : `@${form.handle.trim()}`;
      const payload = isRegister
        ? {
            name: form.name.trim(),
            handle: normalizedHandle,
            email: form.email.trim(),
            password: form.password,
            remember,
          }
        : { email: form.email.trim(), password: form.password, remember };
      const data = isRegister
        ? await apiRegister(payload)
        : await apiLogin(payload);
      onAuth(data.user);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-section">
      <div className="glass auth-card">
        <div className="auth-header">
          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p>
            {isRegister
              ? "Join Circle with your official profile."
              : "Log in to continue."}
          </p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <label className="field">
                Display name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                Handle
                <input
                  type="text"
                  value={form.handle}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, handle: event.target.value }))
                  }
                  required
                />
              </label>
            </>
          ) : null}
          <label className="field">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              required
            />
          </label>
          <label className="field remember-field">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Please wait" : isRegister ? "Create account" : "Log in"}
          </button>
        </form>
        <button
          className="ghost"
          type="button"
          onClick={() => {
            setMode(isRegister ? "login" : "register");
            setError("");
          }}
        >
          {isRegister ? "Already have an account? Log in" : "New here? Register"}
        </button>
      </div>
    </div>
  );
}
