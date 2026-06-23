/**
 * NotificacionesPage.jsx — Unread notifications list with mark-read action.
 *
 * Task T063 — Notificaciones page placeholder with future API integration.
 * Shows unread badge count from NotificacionContext (when implemented).
 */

import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function NotificacionesPage() {
  const { user } = useAuth();
  const [notifications] = useState([
    {
      id: 1,
      titulo: "Hallazgo aprobado",
      mensaje: "Tu hallazgo ha sido aprobado por el administrador.",
      fecha: new Date(),
      leida: false,
    },
    {
      id: 2,
      titulo: "Nueva solicitud de cierre",
      mensaje: "Se ha recibido una nueva solicitud de cierre de acción.",
      fecha: new Date(Date.now() - 3600000),
      leida: false,
    },
  ]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Notificaciones</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          {notifications.filter((n) => !n.leida).length} sin leer
        </p>
      </header>

      {notifications.length === 0 ? (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "2rem",
            textAlign: "center",
            background: "#f8fafc",
          }}
        >
          <p style={{ color: "#64748b", margin: 0 }}>
            No tenés notificaciones nuevas.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "1rem",
                background: notif.leida ? "#fff" : "#f0f9ff",
                borderLeft: `4px solid ${notif.leida ? "#cbd5e1" : "#0284c7"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  >
                    {notif.titulo}
                  </h3>
                  <p style={{ margin: "0.5rem 0 0.5rem 0", color: "#475569" }}>
                    {notif.mensaje}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                    }}
                  >
                    {notif.fecha.toLocaleString("es-AR")}
                  </p>
                </div>
                {!notif.leida && (
                  <button
                    style={{
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      // TODO: Mark as read via API when T061 is ready
                    }}
                  >
                    Marcar leído
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
