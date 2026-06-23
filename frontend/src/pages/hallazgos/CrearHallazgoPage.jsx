import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createHallazgo } from "../../api/hallazgos.js";
import { useAuth } from "../../context/AuthContext.jsx";

const EMPLEADO_TIPOS = [
  { value: "NO_CONFORMIDAD", label: "No Conformidad" },
  { value: "OPORTUNIDAD_MEJORA", label: "Oportunidad de Mejora" },
];

export default function CrearHallazgoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    descripcion: "",
    ubicacion: "",
    tipo: EMPLEADO_TIPOS[0].value,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedTipos = useMemo(() => {
    if (user?.tipo === "EMPLEADO") {
      return EMPLEADO_TIPOS;
    }
    return [];
  }, [user?.tipo]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const created = await createHallazgo({
        descripcion: form.descripcion.trim(),
        ubicacion: form.ubicacion.trim(),
        tipo: form.tipo,
      });
      navigate(`/hallazgos/${created.id}`);
    } catch (apiError) {
      const detail =
        apiError?.response?.data?.detail ||
        apiError?.response?.data?.tipo?.[0] ||
        "No se pudo crear el hallazgo.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Crear Hallazgo</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Registra una No Conformidad u Oportunidad de Mejora.
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
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Descripcion</span>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={onChange}
            rows={5}
            required
            placeholder="Describe el hallazgo detectado"
            style={{ borderRadius: 8, border: "1px solid #cbd5e1", padding: "0.65rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Ubicacion</span>
          <input
            type="text"
            name="ubicacion"
            value={form.ubicacion}
            onChange={onChange}
            required
            placeholder="Sector o ubicacion"
            style={{ borderRadius: 8, border: "1px solid #cbd5e1", padding: "0.65rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Tipo</span>
          <select
            name="tipo"
            value={form.tipo}
            onChange={onChange}
            required
            style={{ borderRadius: 8, border: "1px solid #cbd5e1", padding: "0.65rem" }}
          >
            {allowedTipos.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link
            to="/hallazgos"
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
            {loading ? "Guardando..." : "Crear Hallazgo"}
          </button>
        </div>
      </form>
    </main>
  );
}
