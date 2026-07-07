/**
 * ContactoExternoForm.jsx - Form for external contact data (Phase 4 T047)
 * 
 * Renders fields for nombre_empresa, telefono, email.
 * Visible only when:
 * - sector === "RECLAMO_CLIENTE"
 * - user.is_admin === true
 */
import React from "react";

function ContactoExternoForm({
  nombreEmpresa,
  telefono,
  email,
  onNombreEmpresaChange,
  onTelefonoChange,
  onEmailChange,
  sectorCodigo,
  isAdmin,
  disabled,
}) {
  // Show form only if sector = RECLAMO_CLIENTE and user is admin
  if (sectorCodigo !== "RECLAMO_CLIENTE" || !isAdmin) {
    return null;
  }

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#f9fafb" }}>
      <h3 style={{ margin: "0 0 1rem 0" }}>Datos de Contacto Externo</h3>
      
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Nombre de Empresa
          </label>
          <input
            type="text"
            placeholder="Ej: Acme Corp"
            value={nombreEmpresa}
            onChange={(e) => onNombreEmpresaChange(e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Teléfono
          </label>
          <input
            type="tel"
            placeholder="Ej: +1234567890"
            value={telefono}
            onChange={(e) => onTelefonoChange(e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Email
          </label>
          <input
            type="email"
            placeholder="Ej: contacto@acme.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
      
      <p style={{ marginTop: "0.5rem", fontSize: 12, color: "#64748b" }}>
        Nota: Estos datos no se pueden modificar después de la creación del hallazgo.
      </p>
    </section>
  );
}

export default ContactoExternoForm;
