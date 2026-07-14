import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { createUser, deleteUser, listUsers, setUserActive, updateUser } from "../../api/users.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalogoContext } from "../../context/CatalogoContext.jsx";

const tableCell = {
  borderBottom: "1px solid #e2e8f0",
  padding: "0.6rem 0.5rem",
  verticalAlign: "top",
};

const inputStyle = {
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  padding: "0.45rem",
  width: "100%",
};

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
  if (!data) return "No se pudo actualizar el usuario.";
  if (data.detail) return data.detail;

  const firstField = Object.keys(data)[0];
  const firstError = data[firstField];
  if (Array.isArray(firstError)) return `${firstField}: ${firstError[0]}`;
  if (typeof firstError === "string") return `${firstField}: ${firstError}`;

  return "No se pudo actualizar el usuario.";
}

export default function GestionUsuariosPage() {
  const { user: loggedUser } = useAuth();
  const { getSubseccionesBySetor } = useCatalogoContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);
  const [statusChangingUserId, setStatusChangingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    dni: "",
    nombre: "",
    apellido: "",
    sexo: "M",
    email: "",
    password: "",
    tipo: "EMPLEADO",
    sector: "",
    empresa: "EMPRESA_A",
  });

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const data = await listUsers();
        const usersArray = Array.isArray(data) ? data : [];
        if (!mounted) return;
        setUsers(usersArray);
        const initialDrafts = {};
        usersArray.forEach((u) => {
          initialDrafts[u.id] = {
            tipo: u.tipo,
            sector: u.sector || "",
            empresa: u.empresa || "EMPRESA_A",
          };
        });
        setRoleDrafts(initialDrafts);
      } catch (apiError) {
        if (mounted) setError(getErrorMessage(apiError));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((u) => {
      const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
      return (
        fullName.includes(normalized) ||
        String(u.dni).includes(normalized) ||
        (u.email || "").toLowerCase().includes(normalized)
      );
    });
  }, [query, users]);

  const internalSectorOptions = useMemo(
    () => getSubseccionesBySetor("INTERNO"),
    [getSubseccionesBySetor]
  );

  const onCreateFormChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onRoleDraftChange = (userId, field, value) => {
    setRoleDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value,
      },
    }));
  };

  const onApplyRole = async (targetUser) => {
    if (!adminPassword.trim()) {
      setError("Ingresá tu contraseña de administrador para confirmar cambios.");
      return;
    }

    setSavingUserId(targetUser.id);
    setError("");
    setSuccess("");

    const draft = roleDrafts[targetUser.id] || { tipo: targetUser.tipo };
    const payload = {
      tipo: draft.tipo,
      password_confirmacion: adminPassword,
    };

    if (draft.tipo === "EMPLEADO") {
      payload.sector = resolveSectorCodigo(draft.sector, internalSectorOptions);
    }

    if (draft.tipo === "CLIENTE") {
      payload.empresa = draft.empresa || "EMPRESA_A";
    }

    try {
      const updated = await updateUser(targetUser.id, payload);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, tipo: updated.tipo, nombre: updated.nombre, apellido: updated.apellido, email: updated.email, dni: updated.dni }
            : u
        )
      );
      setRoleDrafts((prev) => ({
        ...prev,
        [targetUser.id]: {
          ...prev[targetUser.id],
          tipo: updated.tipo,
          sector: updated.sector || "",
          empresa: updated.empresa || "EMPRESA_A",
        },
      }));
      setSuccess(`Rol actualizado para ${updated.nombre} ${updated.apellido}.`);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingUserId(null);
    }
  };

  const onCreateUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    const payload = {
      dni: Number(createForm.dni),
      nombre: createForm.nombre.trim(),
      apellido: createForm.apellido.trim(),
      sexo: createForm.sexo,
      email: createForm.email.trim(),
      password: createForm.password,
      tipo: createForm.tipo,
    };

    if (createForm.tipo === "EMPLEADO") {
      payload.sector = resolveSectorCodigo(createForm.sector, internalSectorOptions);
    }

    if (createForm.tipo === "CLIENTE") {
      payload.empresa = createForm.empresa;
    }

    try {
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
      setRoleDrafts((prev) => ({
        ...prev,
        [created.id]: {
          tipo: created.tipo,
          sector: created.sector || "",
          empresa: created.empresa || "EMPRESA_A",
        },
      }));
      setCreateForm({
        dni: "",
        nombre: "",
        apellido: "",
        sexo: "M",
        email: "",
        password: "",
        tipo: "EMPLEADO",
        sector: "",
        empresa: "EMPRESA_A",
      });
      setSuccess(`Usuario creado: ${created.nombre} ${created.apellido}.`);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setCreating(false);
    }
  };

  const onToggleUserStatus = (targetUser) => {
    if (!adminPassword.trim()) {
      setError("Ingresá tu contraseña de administrador para confirmar cambios.");
      return;
    }

    setConfirmAction({
      type: "toggle-status",
      targetUser,
      isActivating: !targetUser.is_active,
    });
  };

  const onDeleteUser = (targetUser) => {
    if (!adminPassword.trim()) {
      setError("Ingresá tu contraseña de administrador para confirmar cambios.");
      return;
    }

    setConfirmAction({
      type: "delete",
      targetUser,
    });
  };

  const onConfirmAction = async () => {
    if (!confirmAction?.targetUser) return;

    const { targetUser } = confirmAction;

    setError("");
    setSuccess("");

    if (confirmAction.type === "toggle-status") {
      setStatusChangingUserId(targetUser.id);
      try {
        const updated = await setUserActive(
          targetUser.id,
          confirmAction.isActivating,
          adminPassword
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: updated.is_active } : u))
        );
        setSuccess(
          `${updated.nombre} ${updated.apellido} ${updated.is_active ? "habilitado" : "deshabilitado"} correctamente.`
        );
      } catch (apiError) {
        setError(getErrorMessage(apiError));
      } finally {
        setStatusChangingUserId(null);
        setConfirmAction(null);
      }
      return;
    }

    if (confirmAction.type === "delete") {
      setDeletingUserId(targetUser.id);
      try {
        await deleteUser(targetUser.id, adminPassword);
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        setRoleDrafts((prev) => {
          const copy = { ...prev };
          delete copy[targetUser.id];
          return copy;
        });
        setSuccess(`${targetUser.nombre} ${targetUser.apellido} fue eliminado.`);
      } catch (apiError) {
        setError(getErrorMessage(apiError));
      } finally {
        setDeletingUserId(null);
        setConfirmAction(null);
      }
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "2rem 1rem" }}>
        <p style={{ margin: 0, color: "#475569" }}>Cargando usuarios...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Gestión de Usuarios</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Accedé a perfiles y cambiá roles directamente desde esta lista.
        </p>
      </header>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
          padding: "1rem",
          marginBottom: "1rem",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Contraseña de administrador (obligatoria para modificar)</span>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={{ ...inputStyle, maxWidth: 420 }}
            placeholder="Tu contraseña actual"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Buscar usuario</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inputStyle, maxWidth: 420 }}
            placeholder="Nombre, email o DNI"
          />
        </label>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
        {success && <p style={{ color: "#166534", margin: 0 }}>{success}</p>}
      </section>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.15rem" }}>Crear Usuario</h2>
        <form
          onSubmit={onCreateUser}
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <input name="dni" type="number" min="1" required placeholder="DNI" value={createForm.dni} onChange={onCreateFormChange} style={inputStyle} />
          <input name="nombre" type="text" required placeholder="Nombre" value={createForm.nombre} onChange={onCreateFormChange} style={inputStyle} />
          <input name="apellido" type="text" required placeholder="Apellido" value={createForm.apellido} onChange={onCreateFormChange} style={inputStyle} />
          <select name="sexo" value={createForm.sexo} onChange={onCreateFormChange} style={inputStyle}>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
          <input name="email" type="email" required placeholder="Email" value={createForm.email} onChange={onCreateFormChange} style={inputStyle} />
          <input name="password" type="password" minLength={6} required placeholder="Contraseña" value={createForm.password} onChange={onCreateFormChange} style={inputStyle} />
          <select name="tipo" value={createForm.tipo} onChange={onCreateFormChange} style={inputStyle}>
            <option value="EMPLEADO">Empleado</option>
            <option value="CLIENTE">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </select>

          {createForm.tipo === "EMPLEADO" && (
            <select
              name="sector"
              value={createForm.sector}
              onChange={onCreateFormChange}
              required
              style={inputStyle}
            >
              <option value="">Sector interno (subsección)</option>
              {internalSectorOptions.map((sub) => (
                <option key={sub.id} value={sub.codigo}>
                  {sub.nombre}
                </option>
              ))}
            </select>
          )}

          {createForm.tipo === "CLIENTE" && (
            <select name="empresa" value={createForm.empresa} onChange={onCreateFormChange} style={inputStyle}>
              <option value="EMPRESA_A">Empresa A</option>
              <option value="EMPRESA_B">Empresa B</option>
              <option value="EMPRESA_C">Empresa C</option>
            </select>
          )}

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={creating} style={{ padding: "0.5rem 0.8rem", opacity: creating ? 0.6 : 1 }}>
              {creating ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </section>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1040 }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>Usuario</th>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>DNI</th>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>Email</th>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>Rol actual</th>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>Estado</th>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>Nuevo rol</th>
              <th style={{ ...tableCell, textAlign: "left", fontWeight: 700 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isTargetAnotherAdmin = u.tipo === "ADMIN" && u.id !== loggedUser?.id;
              const isOwnUser = u.id === loggedUser?.id;
              const isBlockedForStatusOrDelete = isTargetAnotherAdmin || isOwnUser;
              const draft = roleDrafts[u.id] || { tipo: u.tipo, sector: "", empresa: "EMPRESA_A" };

              return (
                <tr key={u.id}>
                  <td style={tableCell}>
                    <strong>{u.nombre} {u.apellido}</strong>
                  </td>
                  <td style={tableCell}>{u.dni}</td>
                  <td style={tableCell}>{u.email}</td>
                  <td style={tableCell}>{u.tipo}</td>
                  <td style={tableCell}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 999,
                        padding: "0.2rem 0.65rem",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: u.is_active ? "#166534" : "#991b1b",
                        background: u.is_active ? "#dcfce7" : "#fee2e2",
                        border: `1px solid ${u.is_active ? "#86efac" : "#fca5a5"}`,
                      }}
                    >
                      {u.is_active ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  <td style={{ ...tableCell, minWidth: 250 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <select
                        value={draft.tipo}
                        onChange={(e) => onRoleDraftChange(u.id, "tipo", e.target.value)}
                        style={inputStyle}
                        disabled={isTargetAnotherAdmin}
                      >
                        <option value="EMPLEADO">Empleado</option>
                        <option value="CLIENTE">Cliente</option>
                        <option value="ADMIN">Administrador</option>
                      </select>

                      {draft.tipo === "EMPLEADO" && (
                        <select
                          value={draft.sector || ""}
                          onChange={(e) => onRoleDraftChange(u.id, "sector", e.target.value)}
                          style={inputStyle}
                          disabled={isTargetAnotherAdmin}
                        >
                          <option value="">Sector interno (subsección)</option>
                          {internalSectorOptions.map((sub) => (
                            <option key={sub.id} value={sub.codigo}>
                              {sub.nombre}
                            </option>
                          ))}
                          {!!draft.sector &&
                            !internalSectorOptions.some((sub) => sub.codigo === draft.sector) && (
                              <option value={draft.sector}>
                                {internalSectorOptions.find((sub) => normalizeText(sub.nombre) === normalizeText(draft.sector))?.nombre || draft.sector}
                              </option>
                            )}
                        </select>
                      )}

                      {draft.tipo === "CLIENTE" && (
                        <select
                          value={draft.empresa || "EMPRESA_A"}
                          onChange={(e) => onRoleDraftChange(u.id, "empresa", e.target.value)}
                          style={inputStyle}
                          disabled={isTargetAnotherAdmin}
                        >
                          <option value="EMPRESA_A">Empresa A</option>
                          <option value="EMPRESA_B">Empresa B</option>
                          <option value="EMPRESA_C">Empresa C</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td style={tableCell}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isTargetAnotherAdmin ? (
                        <span
                          style={{
                            border: "1px solid #94a3b8",
                            color: "#64748b",
                            borderRadius: 8,
                            textDecoration: "none",
                            padding: "0.4rem 0.7rem",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                          }}
                          title="No podés editar el perfil de otro administrador"
                        >
                          Perfil bloqueado
                        </span>
                      ) : (
                        <Link
                          to={`/usuarios/${u.id}/perfil`}
                          style={{
                            border: "1px solid #1d4ed8",
                            color: "#1d4ed8",
                            borderRadius: 8,
                            textDecoration: "none",
                            padding: "0.4rem 0.7rem",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                          }}
                        >
                          Ver Perfil
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => onApplyRole(u)}
                        disabled={isTargetAnotherAdmin || savingUserId === u.id}
                        style={{
                          padding: "0.4rem 0.7rem",
                          fontSize: "0.85rem",
                          opacity: isTargetAnotherAdmin || savingUserId === u.id ? 0.6 : 1,
                        }}
                        title={
                          isTargetAnotherAdmin
                            ? "No podés modificar el perfil ni rol de otro administrador"
                            : "Aplicar cambio de rol"
                        }
                      >
                        {savingUserId === u.id ? "Guardando..." : "Cambiar Rol"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleUserStatus(u)}
                        disabled={
                          isBlockedForStatusOrDelete ||
                          statusChangingUserId === u.id ||
                          deletingUserId === u.id
                        }
                        style={{
                          padding: "0.4rem 0.7rem",
                          fontSize: "0.85rem",
                          background: u.is_active ? "#b45309" : "#166534",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          opacity:
                            isBlockedForStatusOrDelete ||
                            statusChangingUserId === u.id ||
                            deletingUserId === u.id
                              ? 0.6
                              : 1,
                          cursor:
                            isBlockedForStatusOrDelete ||
                            statusChangingUserId === u.id ||
                            deletingUserId === u.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                        title={
                          isOwnUser
                            ? "No podés cambiar el estado de tu propio usuario"
                            : isTargetAnotherAdmin
                              ? "No podés gestionar otro administrador"
                              : u.is_active
                                ? "Deshabilitar usuario"
                                : "Habilitar usuario"
                        }
                      >
                        {statusChangingUserId === u.id
                          ? "Procesando..."
                          : u.is_active
                            ? "Deshabilitar"
                            : "Habilitar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteUser(u)}
                        disabled={
                          isBlockedForStatusOrDelete ||
                          deletingUserId === u.id ||
                          statusChangingUserId === u.id
                        }
                        style={{
                          padding: "0.4rem 0.7rem",
                          fontSize: "0.85rem",
                          background: "#dc2626",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          opacity:
                            isBlockedForStatusOrDelete ||
                            deletingUserId === u.id ||
                            statusChangingUserId === u.id
                              ? 0.6
                              : 1,
                          cursor:
                            isBlockedForStatusOrDelete ||
                            deletingUserId === u.id ||
                            statusChangingUserId === u.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                        title={
                          isOwnUser
                            ? "No podés eliminar tu propio usuario"
                            : isTargetAnotherAdmin
                              ? "No podés eliminar otro administrador"
                              : "Eliminar usuario"
                        }
                      >
                        {deletingUserId === u.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td style={tableCell} colSpan={7}>
                  No se encontraron usuarios con ese criterio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {confirmAction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 200,
          }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#fff",
              padding: "1rem",
              boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
              display: "grid",
              gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 style={{ margin: 0, color: "#0f172a" }}>
              {confirmAction.type === "delete" ? "Confirmar eliminación" : "Confirmar cambio de estado"}
            </h3>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.45 }}>
              {confirmAction.type === "delete"
                ? `Vas a eliminar a ${confirmAction.targetUser.nombre} ${confirmAction.targetUser.apellido}. Esta acción no se puede deshacer.`
                : confirmAction.isActivating
                  ? `Vas a habilitar a ${confirmAction.targetUser.nombre} ${confirmAction.targetUser.apellido}.`
                  : `Vas a deshabilitar a ${confirmAction.targetUser.nombre} ${confirmAction.targetUser.apellido}.`}
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Se usará la contraseña de administrador ingresada para confirmar la operación.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={statusChangingUserId !== null || deletingUserId !== null}
                style={{
                  padding: "0.45rem 0.8rem",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmAction}
                disabled={statusChangingUserId !== null || deletingUserId !== null}
                style={{
                  padding: "0.45rem 0.8rem",
                  borderRadius: 8,
                  border: "none",
                  background: confirmAction.type === "delete" ? "#dc2626" : "#0f766e",
                  color: "#fff",
                  fontWeight: 700,
                  opacity: statusChangingUserId !== null || deletingUserId !== null ? 0.7 : 1,
                }}
              >
                {statusChangingUserId !== null || deletingUserId !== null
                  ? "Procesando..."
                  : confirmAction.type === "delete"
                    ? "Sí, eliminar"
                    : "Sí, confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
