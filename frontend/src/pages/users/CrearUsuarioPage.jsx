import { useState } from "react";
import { Link } from "react-router-dom";

import { createUser } from "../../api/users.js";

const INITIAL_FORM = {
  dni: "",
  nombre: "",
  apellido: "",
  sexo: "M",
  email: "",
  password: "",
  tipo: "EMPLEADO",
  sector: "",
  empresa: "EMPRESA_A",
};

const inputStyle = {
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  padding: "0.65rem",
};

const labelStyle = { display: "grid", gap: 6 };

function getErrorMessage(apiError) {
  const data = apiError?.response?.data;
  if (!data) return "No se pudo crear el usuario.";
  if (data.detail) return data.detail;

  const firstField = Object.keys(data)[0];
  const firstError = data[firstField];
  if (Array.isArray(firstError)) return `${firstField}: ${firstError[0]}`;
  if (typeof firstError === "string") return `${firstField}: ${firstError}`;

  return "No se pudo crear el usuario.";
}

export default function CrearUsuarioPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState(null);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setCreatedUser(null);
    setLoading(true);

    const payload = {
      dni: Number(form.dni),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      sexo: form.sexo,
      email: form.email.trim(),
      password: form.password,
      tipo: form.tipo,
    };

    if (form.tipo === "EMPLEADO") payload.sector = form.sector.trim();
    if (form.tipo === "CLIENTE") payload.empresa = form.empresa;

    try {
      const user = await createUser(payload);
      setCreatedUser(user);
      setForm(INITIAL_FORM);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Crear Usuario</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Alta de administradores, empleados y clientes.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1rem",
          background: "#fff",
          display: "grid",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>DNI</span>
            <input
              type="number"
              name="dni"
              value={form.dni}
              onChange={onChange}
              required
              min="1"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Tipo</span>
            <select name="tipo" value={form.tipo} onChange={onChange} style={inputStyle}>
              <option value="EMPLEADO">Empleado</option>
              <option value="CLIENTE">Cliente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Nombre</span>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Apellido</span>
            <input
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={onChange}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Sexo</span>
            <select name="sexo" value={form.sexo} onChange={onChange} style={inputStyle}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          {form.tipo === "EMPLEADO" && (
            <label style={labelStyle}>
              <span style={{ fontWeight: 600 }}>Sector</span>
              <input
                type="text"
                name="sector"
                value={form.sector}
                onChange={onChange}
                required
                style={inputStyle}
              />
            </label>
          )}

          {form.tipo === "CLIENTE" && (
            <label style={labelStyle}>
              <span style={{ fontWeight: 600 }}>Empresa</span>
              <select
                name="empresa"
                value={form.empresa}
                onChange={onChange}
                required
                style={inputStyle}
              >
                <option value="EMPRESA_A">Empresa A</option>
                <option value="EMPRESA_B">Empresa B</option>
                <option value="EMPRESA_C">Empresa C</option>
              </select>
            </label>
          )}
        </div>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
        {createdUser && (
          <p style={{ color: "#166534", margin: 0 }}>
            Usuario creado: {createdUser.nombre} {createdUser.apellido} (
            {createdUser.tipo})
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link
            to="/"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "0.55rem 0.95rem",
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "0.55rem 0.95rem",
              background: "#0f172a",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Guardando..." : "Crear Usuario"}
          </button>
        </div>
      </form>
    </main>
  );
}
