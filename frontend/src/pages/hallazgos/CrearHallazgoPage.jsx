import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createHallazgo, uploadArchivo } from "../../api/hallazgos.js";
import { listClientes } from "../../api/users.js";
import { useAuth } from "../../context/AuthContext.jsx";
import SectorSelector from "../../components/hallazgos/SectorSelector.jsx";
import ContactoExternoForm from "../../components/hallazgos/ContactoExternoForm.jsx";
import FileUpload from "../../components/FileUpload.jsx";

const EMPLEADO_TIPOS = [
  { value: "NO_CONFORMIDAD", label: "No Conformidad" },
  { value: "OPORTUNIDAD_MEJORA", label: "Oportunidad de Mejora" },
];

const ADMIN_TIPOS = [
  { value: "NO_CONFORMIDAD", label: "No Conformidad" },
  { value: "OPORTUNIDAD_MEJORA", label: "Oportunidad de Mejora" },
  { value: "QUEJA_CLIENTE", label: "Queja de Cliente" },
];

export default function CrearHallazgoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    descripcion: "",
    ubicacion: "",
    tipo: EMPLEADO_TIPOS[0].value,
    cliente_asociado: "",
    // Phase 3: Sector classification
    sector_codigo: "",
    subseccion_codigo: "",
    // Phase 4: External contact (admin-only for RECLAMO_CLIENTE)
    contacto_externo_nombre_empresa: "",
    contacto_externo_telefono: "",
    contacto_externo_email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);

  const isAdmin = user?.tipo === "ADMIN";

  const allowedTipos = useMemo(() => {
    if (isAdmin) return ADMIN_TIPOS;
    if (user?.tipo === "EMPLEADO") return EMPLEADO_TIPOS;
    return [];
  }, [isAdmin, user?.tipo]);

  // Load clientes list when Admin selects QUEJA_CLIENTE
  useEffect(() => {
    if (isAdmin && form.tipo === "QUEJA_CLIENTE" && clientes.length === 0) {
      listClientes()
        .then((data) => setClientes(Array.isArray(data) ? data : data.results ?? []))
        .catch(() => setClientes([]));
    }
  }, [isAdmin, form.tipo, clientes.length]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Reset cliente_asociado when tipo changes away from QUEJA_CLIENTE
      ...(name === "tipo" && value !== "QUEJA_CLIENTE" ? { cliente_asociado: "" } : {}),
    }));
  };

  // Phase 3: Handle sector change
  const onSectorChange = (sectorCodigo) => {
    setForm((prev) => ({
      ...prev,
      sector_codigo: sectorCodigo,
      subseccion_codigo: "", // Reset subseccion when sector changes
    }));
  };

  // Phase 3: Handle subseccion change
  const onSubseccionChange = (subseccionCodigo) => {
    setForm((prev) => ({
      ...prev,
      subseccion_codigo: subseccionCodigo,
    }));
  };

  // Phase 4: Handle contacto_externo field changes
  const onContactoNombreEmpresaChange = (value) => {
    setForm((prev) => ({ ...prev, contacto_externo_nombre_empresa: value }));
  };

  const onContactoTelefonoChange = (value) => {
    setForm((prev) => ({ ...prev, contacto_externo_telefono: value }));
  };

  const onContactoEmailChange = (value) => {
    setForm((prev) => ({ ...prev, contacto_externo_email: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        descripcion: form.descripcion.trim(),
        ubicacion: form.ubicacion.trim(),
        tipo: form.tipo,
        // Phase 3: Include sector classification
        sector_codigo: form.sector_codigo,
        subseccion_codigo: form.subseccion_codigo || "",
      };
      if (isAdmin && form.tipo === "QUEJA_CLIENTE" && form.cliente_asociado) {
        payload.cliente_asociado = Number(form.cliente_asociado);
      }
      // Phase 4: Include contacto_externo if provided
      if (form.contacto_externo_nombre_empresa.trim()) {
        payload.contacto_externo_nombre_empresa = form.contacto_externo_nombre_empresa.trim();
        payload.contacto_externo_telefono = form.contacto_externo_telefono.trim();
        payload.contacto_externo_email = form.contacto_externo_email.trim();
      }
      const created = await createHallazgo(payload);
      if (pendingFile) {
        try {
          await uploadArchivo(created.id, pendingFile);
        } catch {
          // File upload failed but hallazgo was created — navigate anyway
        }
      }
      navigate(`/hallazgos/${created.id}`);
    } catch (apiError) {
      const detail =
        apiError?.response?.data?.detail ||
        apiError?.response?.data?.cliente_asociado?.[0] ||
        apiError?.response?.data?.tipo?.[0] ||
        apiError?.response?.data?.sector_codigo?.[0] ||
        apiError?.response?.data?.subseccion_codigo?.[0] ||
        apiError?.response?.data?.contacto_externo_nombre_empresa?.[0] ||
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

        {/* Phase 3: Sector Classification Selector */}
        <SectorSelector
          sectorCodigo={form.sector_codigo}
          subseccionCodigo={form.subseccion_codigo}
          onSectorChange={onSectorChange}
          onSubseccionChange={onSubseccionChange}
          disabled={false}
        />

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

        {/* Phase 4: External Contact Form (admin-only, RECLAMO_CLIENTE sector) */}
        <ContactoExternoForm
          nombreEmpresa={form.contacto_externo_nombre_empresa}
          telefono={form.contacto_externo_telefono}
          email={form.contacto_externo_email}
          onNombreEmpresaChange={onContactoNombreEmpresaChange}
          onTelefonoChange={onContactoTelefonoChange}
          onEmailChange={onContactoEmailChange}
          sectorCodigo={form.sector_codigo}
          isAdmin={isAdmin}
          disabled={loading}
        />

        {isAdmin && form.tipo === "QUEJA_CLIENTE" && (
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Cliente Asociado</span>
            <select
              name="cliente_asociado"
              value={form.cliente_asociado}
              onChange={onChange}
              required
              style={{ borderRadius: 8, border: "1px solid #cbd5e1", padding: "0.65rem" }}
            >
              <option value="">-- Selecciona un cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido} (DNI: {c.dni})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Phase 6 (T078): File upload for hallazgo creation */}
        <div style={{ marginTop: "1rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Archivos Adjuntos (Opcional)</p>
          <FileUpload
            deferred
            onFileSelect={(file) => setPendingFile(file)}
            onError={(err) => setError(`Upload error: ${err}`)}
            maxSizeMB={1024}
          />
        </div>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link
            to="/hallazgos"
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
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "0.55rem 0.95rem", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Guardando..." : "Crear Hallazgo"}
          </button>
        </div>
      </form>
    </main>
  );
}
