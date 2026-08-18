import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getMe, getUserById, setAvatar, updateMe, updateUser } from "../../api/users.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalogoContext } from "../../context/CatalogoContext.jsx";

const AVATARS = [
  { key: "pato",         label: "Pato" },
  { key: "rinoceronte",  label: "Rinoceronte" },
  { key: "flamenco",     label: "Flamenco" },
  { key: "tiburon",      label: "Tiburón" },
  { key: "mapache",      label: "Mapache" },
  { key: "oso",          label: "Oso" },
  { key: "cebra",        label: "Cebra" },
  { key: "elefante",     label: "Elefante" },
  { key: "tucan",        label: "Tucán" },
];

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
  avatar: "",
};

export default function PerfilUsuarioPage() {
  const { id } = useParams();
  const { user: loggedUser, updateStoredUser } = useAuth();
  const { getSubseccionesBySetor } = useCatalogoContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
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
          avatar: data.avatar ?? "",
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

  const onAvatarSelect = async (avatarKey) => {
    setAvatarSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = isSelfProfile
        ? await setAvatar(avatarKey)
        : await setAvatar(avatarKey); // solo self puede cambiar su avatar
      setForm((prev) => ({ ...prev, avatar: updated.avatar ?? "" }));
      if (isSelfProfile) {
        updateStoredUser({ ...(loggedUser || {}), avatar: updated.avatar ?? "" });
      }
      setSuccess("Avatar actualizado.");
    } catch {
      setError("No se pudo guardar el avatar.");
    } finally {
      setAvatarSaving(false);
    }
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
        avatar: updated.avatar ?? "",
      }));

      if (isSelfProfile) {
        updateStoredUser({
          ...(loggedUser || {}),
          id: updated.id,
          nombre: updated.nombre,
          apellido: updated.apellido,
          tipo: updated.tipo,
          avatar: updated.avatar ?? "",
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
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem" }}>
        <p style={{ margin: 0, color: "#475569" }}>Cargando perfil...</p>
      </main>
    );
  }

  const currentTipo = canChangeRole ? form.tipo : profile?.tipo;

  const initials = [form.nombre, form.apellido]
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase())
    .join("") || "?";

  const roleLabel = { ADMIN: "Administrador", EMPLEADO: "Empleado", CLIENTE: "Cliente" }[currentTipo] || currentTipo;

  const avatarSrc = form.avatar ? `/avatars/avatar_${form.avatar}.png` : null;

  const sectionTitle = (text) => (
    <h2
      style={{
        margin: "0 0 1rem",
        fontSize: "0.78rem",
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.09em",
      }}
    >
      {text}
    </h2>
  );

  const divider = (
    <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "1.5rem 0" }} />
  );

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Profile header card */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
          borderRadius: "16px 16px 0 0",
          padding: "2.5rem 2rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.85rem",
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: avatarSrc ? "transparent" : "rgba(255,255,255,0.2)",
            border: "3px solid rgba(255,255,255,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.05em",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt={form.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "1.4rem", fontWeight: 700 }}>
            {form.nombre} {form.apellido}
          </h1>
          <span
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "0.22rem 0.85rem",
              borderRadius: 20,
              background: "rgba(255,255,255,0.18)",
              color: "#e2e8f0",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            {roleLabel}
          </span>
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: "0.82rem" }}>
          Toda modificación requiere contraseña de confirmación
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={onSubmit}
        style={{
          background: "#fff",
          borderRadius: "0 0 16px 16px",
          border: "1px solid #e2e8f0",
          borderTop: "none",
          padding: "2rem 1.75rem 1.75rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
        }}
      >
        {/* Avatar selector */}
        {sectionTitle("Elegir Avatar")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.25rem",
          }}
        >
          {AVATARS.map(({ key, label }) => {
            const selected = form.avatar === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => onAvatarSelect(key)}
                disabled={avatarSaving}
                style={{
                  padding: 4,
                  borderRadius: 12,
                  border: selected ? "2.5px solid #1d4ed8" : "2.5px solid transparent",
                  background: selected ? "#eff6ff" : "#f8fafc",
                  cursor: avatarSaving ? "not-allowed" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  transition: "border-color 0.15s, background 0.15s",
                  outline: "none",
                  opacity: avatarSaving ? 0.6 : 1,
                }}
              >
                <img
                  src={`/avatars/avatar_${key}.png`}
                  alt={label}
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <span style={{ fontSize: "0.7rem", color: selected ? "#1d4ed8" : "#64748b", fontWeight: selected ? 700 : 400 }}>
                  {label}
                </span>
              </button>
            );
          })}
          {/* Opción sin avatar */}
          <button
            type="button"
            title="Sin avatar"
            onClick={() => onAvatarSelect("")}
            disabled={avatarSaving}
            style={{
              padding: 4,
              borderRadius: 12,
              border: form.avatar === "" ? "2.5px solid #1d4ed8" : "2.5px solid transparent",
              background: form.avatar === "" ? "#eff6ff" : "#f8fafc",
              cursor: avatarSaving ? "not-allowed" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              opacity: avatarSaving ? 0.6 : 1,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                color: "#94a3b8",
              }}
            >
              —
            </div>
            <span style={{ fontSize: "0.7rem", color: form.avatar === "" ? "#1d4ed8" : "#64748b", fontWeight: form.avatar === "" ? 700 : 400 }}>
              Ninguno
            </span>
          </button>
        </div>

        {divider}

        {/* Información Personal */}
        {sectionTitle("Información Personal")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.1rem",
          }}
        >
          <label style={labelStyle}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>DNI</span>
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
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Nombre</span>
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
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Apellido</span>
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
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Sexo</span>
            <select name="sexo" value={form.sexo} onChange={onChange} style={inputStyle}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </label>

          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              style={inputStyle}
            />
          </label>
        </div>

        {divider}

        {/* Cuenta */}
        {sectionTitle("Cuenta")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.1rem",
          }}
        >
          <label style={labelStyle}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Rol</span>
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
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Sector</span>
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
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Empresa</span>
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

        {divider}

        {/* Seguridad */}
        {sectionTitle("Seguridad")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.1rem",
          }}
        >
          <label style={labelStyle}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>
              Nueva contraseña{" "}
              <span style={{ fontWeight: 400, color: "#94a3b8" }}>(opcional)</span>
            </span>
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
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>
              Contraseña de confirmación
            </span>
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

        {/* Messages */}
        {error && (
          <p
            style={{
              marginTop: "1.25rem",
              marginBottom: 0,
              padding: "0.75rem 1rem",
              borderRadius: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </p>
        )}
        {success && (
          <p
            style={{
              marginTop: "1.25rem",
              marginBottom: 0,
              padding: "0.75rem 1rem",
              borderRadius: 8,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: "0.875rem",
            }}
          >
            {success}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1.75rem" }}>
          <Link
            to={isAdmin ? "/usuarios" : "/"}
            style={{
              border: "1.5px solid #1e3a8a",
              borderRadius: 8,
              padding: "0.6rem 1.1rem",
              textDecoration: "none",
              color: "#1e3a8a",
              fontWeight: 600,
              fontSize: "0.9rem",
              transition: "background 0.15s ease",
            }}
          >
            Volver
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: 8,
              border: "none",
              background: saving ? "#93c5fd" : "#1d4ed8",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "background 0.15s ease",
            }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </main>
  );
}
