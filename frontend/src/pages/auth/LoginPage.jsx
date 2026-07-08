/**
 * LoginPage — DNI + password authentication form.
 *
 * - Calls useAuth().login(dni, password)
 * - On success redirects to the page the user was trying to reach
 *   (via React Router location.state.from), or to /hallazgos as default.
 * - Displays server error messages (invalid credentials, inactive account).
 * - Disables form during submission to prevent double-submit.
 *
 * DNI field: numeric input (type="number") to match the BigIntegerField on
 * the backend and the contract that expects an integer, not a string.
 *
 * Refs: T016, spec FR-002, contracts/rest-api.md POST /api/v1/auth/login/
 */
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, go straight to hallazgos
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/hallazgos";
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!dni || !password) {
      setError("Ingresá tu DNI y contraseña.");
      return;
    }

    setLoading(true);
    try {
      await login(Number(dni), password);
      const from = location.state?.from?.pathname || "/hallazgos";
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Error al iniciar sesión. Verificá tus credenciales.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <img
            src="https://daltectools.com/wp-content/uploads/2024/09/Daltec-logo-azul-y-blanco-200px-02.png"
            alt="Daltec"
            style={{ height: 48, width: "auto" }}
          />
        </div>
        <h2 style={styles.subtitle}>Iniciar sesión</h2>

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="dni" style={styles.label}>
              DNI
            </label>
            <input
              id="dni"
              type="number"
              inputMode="numeric"
              autoComplete="username"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              disabled={loading}
              placeholder="Ej: 12345678"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Contraseña"
              style={styles.input}
              required
            />
          </div>

          {error && (
            <p role="alert" style={styles.error}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles — replaced with CSS modules / design system in polish phase
// ---------------------------------------------------------------------------
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    padding: "1rem",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "2rem",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    margin: "0 0 0.25rem",
    fontSize: "1.5rem",
    fontWeight: 700,
    textAlign: "center",
    color: "#111827",
  },
  subtitle: {
    margin: "0 0 1.5rem",
    fontSize: "1rem",
    fontWeight: 400,
    textAlign: "center",
    color: "#6b7280",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "1rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  error: {
    margin: 0,
    padding: "0.5rem 0.75rem",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  button: {
    padding: "0.625rem",
    fontSize: "1rem",
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};
