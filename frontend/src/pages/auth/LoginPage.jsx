/**
 * LoginPage â€” DNI + password authentication form.
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
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./LoginPage.css";

const employeeTutorialSteps = [
  {
    title: "Crear un hallazgo",
    description:
      "Entrá a Hallazgos y seleccioná Crear hallazgo. Cargá sector, subsección, detalle y evidencia para registrarlo correctamente.",
  },
  {
    title: "Entrar al chat del hallazgo",
    description:
      "Desde el detalle del hallazgo abrí Chat para coordinar con responsables, dejar actualizaciones y adjuntar información relevante.",
  },
  {
    title: "Gestionar acciones y seguimiento",
    description:
      "Revisá estados, fechas y responsables asignados para avanzar acciones correctivas y mantener trazabilidad completa.",
  },
  {
    title: "Revisar notificaciones",
    description:
      "Consultá el panel de notificaciones para detectar mensajes urgentes, cambios pendientes y tareas nuevas del sistema.",
  },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="login-page">

      {/* â”€â”€ Brand panel (desktop only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="login-brand">
        <img
          src="https://daltectools.com/wp-content/uploads/2024/09/Daltec-logo-azul-y-blanco-200px-02.png"
          alt="Daltec"
          className="login-brand__logo"
        />
        <h1 className="login-brand__heading">
          Sistema de Gestión de hallazgos<br />de Calidad
        </h1>
        <p className="login-brand__sub">
          Gestioná hallazgos, acciones correctivas y comunicaciones con clientes desde un solo lugar.
        </p>
        <div className="login-brand__badges">
          <span className="login-brand__badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Gestión de Hallazgos
          </span>
          <span className="login-brand__badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Acciones Correctivas
          </span>
          <span className="login-brand__badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Reportes y Trazabilidad
          </span>
        </div>

        <section className="login-tutorial" aria-label="Tutorial para empleados">
          <header className="login-tutorial__header">
            <h3>Guía rápida para empleados</h3>
            <p>Pasos esenciales para usar el sistema desde tu primer ingreso.</p>
          </header>
          <ol className="login-tutorial__list">
            {employeeTutorialSteps.map((step, index) => (
              <li key={step.title} className="login-tutorial__item">
                <span className="login-tutorial__index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      {/* â”€â”€ Form panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="login-form-panel">
        <div className="login-form-inner">

          <div className="login-form__header">
            <h2 className="login-form__title">Iniciar sesión</h2>
            <p className="login-form__desc">Ingresá tu DNI y contraseña para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            <div className="login-field">
              <label htmlFor="dni">DNI</label>
              <input
                id="dni"
                type="number"
                inputMode="numeric"
                autoComplete="username"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                disabled={loading}
                placeholder="Ej: 12345678"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-field__password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="login-field__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="login-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading && <span className="login-submit__spinner" />}
              {loading ? "Ingresando… " : "Ingresar"}
            </button>
          </form>

          <div className="login-footer">
            Daltec Tools &copy; {new Date().getFullYear()} — Sistema de Gestión de Calidad
          </div>

          <section className="login-tutorial-mobile" aria-label="Tutorial para empleados en móvil">
            <h3>Guía rápida</h3>
            <p className="login-tutorial-mobile__lead">Accesos y funcionalidades para empleados.</p>
            <ol className="login-tutorial-mobile__list">
              {employeeTutorialSteps.map((step, index) => (
                <li key={`${step.title}-mobile`}>
                  <span>{index + 1}</span>
                  <div>
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

        </div>
      </section>
    </div>
  );
}

