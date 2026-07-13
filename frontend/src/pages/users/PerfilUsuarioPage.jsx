import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getMe, getUserById, updateMe, updateUser } from "../../api/users.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalogoContext } from "../../context/CatalogoContext.jsx";

const inputStyle = {
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  padding: "0.65rem",
};

const labelStyle = { display: "grid", gap: 6 };

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function resolveSectorCodigo(value, options) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const byCode = options.find((opt) => opt.codigo === raw);
  if (byCode) return byCode.codigo;

  const normalizedRaw = normalizeText(raw);
  const byName = options.find((opt) => normalizeText(opt.nombre) === normalizedRaw);
  if (byName) return byName.codigo;

  return raw;
}

function getErrorMessage(apiError) {
  const data = apiError?.response?.data;
  if (!data) return "No se pudo guardar el perfil.";
  if (data.detail) return data.detail;

  const firstField = Object.keys(data)[0];
  const firstError = data[firstField];
  if (Array.isArray(firstError)) return `${firstField}: ${firstError[0]}`;
  if (typeof firstError === "string") return `${firstField}: ${firstError}`;

  return "No se pudo guardar el perfil.";
}

const INITIAL_FORM = {
  dni: "",
  nombre: "",
  apellido: "",
  sexo: "M",
  email: "",
  tipo: "EMPLEADO",
  sector: "",
  empresa: "EMPRESA_A",
  password_confirmacion: "",
  new_password: "",
};

export default function PerfilUsuarioPage() {
  const { id } = useParams();
  const { user: loggedUser, updateStoredUser } = useAuth();
  const { getSubseccionesBySetor } = useCatalogoContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const isAdmin = loggedUser?.tipo === "ADMIN";
  const isSelfProfile = useMemo(() => {
    if (!id) return true;
    return Number(id) === loggedUser?.id;
  }, [id, loggedUser?.id]);

  const canChangeRole = isAdmin && isSelfProfile;
  const sectorOptions = useMemo(() => getSubseccionesBySetor("INTERNO"), [getSubseccionesBySetor]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const data = id ? await getUserById(id) : await getMe();
        if (!mounted) return;
        setProfile(data);
        setForm({
          dni: String(data.dni ?? ""),
          nombre: data.nombre ?? "",
          apellido: data.apellido ?? "",
          sexo: data.sexo ?? "M",
          email: data.email ?? "",
          tipo: data.tipo ?? "EMPLEADO",
          sector: data.sector ?? "",
          empresa: data.empresa ?? "EMPRESA_A",
          password_confirmacion: "",
          new_password: "",
        });
      } catch (apiError) {
        if (mounted) setError(getErrorMessage(apiError));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [id]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      dni: Number(form.dni),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      sexo: form.sexo,
      email: form.email.trim(),
      password_confirmacion: form.password_confirmacion,
    };

    if (canChangeRole) {
      payload.tipo = form.tipo;
    }

    if ((canChangeRole ? form.tipo : profile?.tipo) === "EMPLEADO") {
      payload.sector = resolveSectorCodigo(form.sector, sectorOptions);
    }

    if ((canChangeRole ? form.tipo : profile?.tipo) === "CLIENTE") {
      payload.empresa = form.empresa;
    }

    if (form.new_password.trim()) {
      payload.new_password = form.new_password;
    }

    try {
      const updated = id ? await updateUser(id, payload) : await updateMe(payload);
      setProfile(updated);
      setForm((prev) => ({
        ...prev,
        password_confirmacion: "",
        new_password: "",
        tipo: updated.tipo,
        sector: updated.sector ?? "",
        empresa: updated.empresa ?? "EMPRESA_A",
      }));

      if (isSelfProfile) {
        updateStoredUser({
          ...(loggedUser || {}),
          id: updated.id,
          nombre: updated.nombre,
          apellido: updated.apellido,
          tipo: updated.tipo,
        });
      }
      setSuccess("Perfil actualizado correctamente.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem" }}>
        <p style={{ margin: 0, color: "#475569" }}>Cargando perfil...</p>
      </main>
    );
  }

  const currentTipo = canChangeRole ? form.tipo : profile?.tipo;

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0 }}>{isSelfProfile ? "Mi Perfil" : "Perfil de Usuario"}</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Toda modificación requiere contraseña de confirmación.
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
              min="1"
              required
              style={inputStyle}
            />
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
            <span style={{ fontWeight: 600 }}>Rol</span>
            <select
              name="tipo"
              value={form.tipo}
              onChange={onChange}
              style={inputStyle}
              disabled={!canChangeRole}
            >
              <option value="EMPLEADO">Empleado</option>
              <option value="CLIENTE">Cliente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>

          {currentTipo === "EMPLEADO" && (
            <label style={labelStyle}>
              <span style={{ fontWeight: 600 }}>Sector</span>
              <select
                name="sector"
                value={form.sector}
                onChange={onChange}
                required
                style={inputStyle}
              >
                <option value="">Selecciona un sector interno</option>
                {sectorOptions.map((sub) => (
                  <option key={sub.id} value={sub.codigo}>
                    {sub.nombre}
                  </option>
                ))}
                {!!form.sector && !sectorOptions.some((sub) => sub.codigo === form.sector) && (
                  <option value={form.sector}>{form.sector}</option>
                )}
              </select>
            </label>
          )}

          {currentTipo === "CLIENTE" && (
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

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Nueva contraseña (opcional)</span>
            <input
              type="password"
              name="new_password"
              value={form.new_password}
              onChange={onChange}
              minLength={6}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Contraseña de confirmación</span>
            <input
              type="password"
              name="password_confirmacion"
              value={form.password_confirmacion}
              onChange={onChange}
              required
              style={inputStyle}
            />
          </label>
        </div>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
        {success && <p style={{ color: "#166534", margin: 0 }}>{success}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link
            to={isAdmin ? "/usuarios" : "/"}
            style={{
              border: "1.5px solid #1e3a8a",
              borderRadius: 8,
              padding: "0.55rem 0.95rem",
              textDecoration: "none",
              color: "#1e3a8a",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Volver
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "0.55rem 0.95rem", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </main>
  );
}
