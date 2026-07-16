import client from "./client.js";

const BASE = "/hallazgos/";
const USUARIOS_BASE = "/usuarios/";

export async function createHallazgo(payload) {
  const { data } = await client.post(BASE, payload);
  return data;
}

export async function listHallazgos(params = {}) {
  const { data } = await client.get(BASE, { params });
  return data;
}

export async function getHallazgo(id) {
  const { data } = await client.get(`${BASE}${id}/`);
  return data;
}

export async function deleteHallazgo(id, passwordConfirmacion) {
  const { data } = await client.delete(`${BASE}${id}/`, {
    data: { password_confirmacion: passwordConfirmacion },
  });
  return data;
}

export async function aprobar(id) {
  const { data } = await client.post(`${BASE}${id}/aprobar/`);
  return data;
}

export async function rechazar(id) {
  const { data } = await client.post(`${BASE}${id}/rechazar/`);
  return data;
}

export async function reclasificar(id, tipo) {
  const { data } = await client.post(`${BASE}${id}/reclasificar/`, { tipo });
  return data;
}

/**
 * List all system users (T098, T094).
 * Used by ResponsableList component to show available users for responsable management.
 * Supports pagination via query params.
 */
export async function listUsuarios(params = {}) {
  const { data } = await client.get(USUARIOS_BASE, { params });
  return data?.results || data; // Handle both paginated and non-paginated responses
}

/**
 * Add a user as responsable using RESTful endpoint (T098, T092).
 * New endpoint: PATCH /hallazgos/{id}/responsables/{user_id}/add/
 */
export async function addResponsable(hallazgoId, userId) {
  const { data } = await client.patch(
    `${BASE}${hallazgoId}/responsables/${userId}/add/`
  );
  return data;
}

/**
 * Remove a user as responsable using RESTful endpoint (T098, T093).
 * New endpoint: DELETE /hallazgos/{id}/responsables/{user_id}/remove/
 */
export async function removeResponsable(hallazgoId, userId) {
  const { data } = await client.delete(
    `${BASE}${hallazgoId}/responsables/${userId}/remove/`
  );
  return data;
}

/**
 * Legacy endpoints - kept for backward compatibility
 */
export async function addResponsableLegacy(id, responsableId) {
  const { data } = await client.post(`${BASE}${id}/add_responsable/`, {
    id: responsableId,
  });
  return data;
}

export async function removeResponsableLegacy(id, responsableId) {
  const { data } = await client.post(`${BASE}${id}/remove_responsable/`, {
    id: responsableId,
  });
  return data;
}

export async function uploadArchivo(id, file) {
  const formData = new FormData();
  formData.append("archivo", file);

  const { data } = await client.post(`${BASE}${id}/upload_archivo/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listPorques(hallazgoId, params = {}) {
  const { data } = await client.get(`${BASE}${hallazgoId}/porques/`, { params });
  return data?.results || data;
}

export async function createPorque(hallazgoId, textoCausa) {
  const { data } = await client.post(`${BASE}${hallazgoId}/porques/`, {
    texto_causa: textoCausa,
  });
  return data;
}

export async function approvePorque(hallazgoId, porqueId) {
  const { data } = await client.post(
    `${BASE}${hallazgoId}/porques/${porqueId}/approve/`
  );
  return data;
}

export async function rejectPorque(hallazgoId, porqueId, observacion = "") {
  const { data } = await client.post(
    `${BASE}${hallazgoId}/porques/${porqueId}/reject/`,
    { observacion }
  );
  return data;
}

/**
 * List solicitudes de cambio de responsable for a hallazgo (T110, T108).
 * GET /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/
 */
export async function listSolicitudesCambio(hallazgoId, params = {}) {
  const { data } = await client.get(
    `${BASE}${hallazgoId}/solicitudes-cambio-responsable/`,
    { params }
  );
  return data?.results || data;
}

/**
 * Create a new solicitud de cambio de responsable (T110, T111, T108).
 * POST /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/
 * 
 * Body:
 * {
 *   "tipo": "agregar" | "cambiar",
 *   "usuario_propuesto": <user_id>,
 *   "observacion_rechazo": "optional reason"
 * }
 */
export async function createSolicitudCambio(hallazgoId, payload) {
  const { data } = await client.post(
    `${BASE}${hallazgoId}/solicitudes-cambio-responsable/`,
    payload
  );
  return data;
}

/**
 * Approve a solicitud de cambio de responsable (T113, T108, admin-only).
 * PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/approve/
 */
export async function approveSolicitudCambio(hallazgoId, solicitudId) {
  const { data } = await client.patch(
    `${BASE}${hallazgoId}/solicitudes-cambio-responsable/${solicitudId}/approve/`
  );
  return data;
}

/**
 * Reject a solicitud de cambio de responsable (T113, T108, admin-only).
 * PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/reject/
 * 
 * Body (optional):
 * {
 *   "observacion": "Reason for rejection"
 * }
 */
export async function rejectSolicitudCambio(hallazgoId, solicitudId, observacion = "") {
  const { data } = await client.patch(
    `${BASE}${hallazgoId}/solicitudes-cambio-responsable/${solicitudId}/reject/`,
    { observacion }
  );
  return data;
}

/**
 * Get admin dashboard statistics (admin-only).
 * GET /hallazgos/estadisticas/
 * 
 * Returns:
 * - hallazgos_por_tipo: array of {tipo, count}
 * - hallazgos_por_subseccion: array of {subseccion__nombre, count}
 * - acciones_abiertas: array of {tipo, count}
 */
export async function getEstadisticas() {
  const { data } = await client.get(`${BASE}estadisticas/`);
  return data;
}

/**
 * Get responsable assignment/removal history for a hallazgo.
 * GET /hallazgos/{id}/historial_responsables/
 * 
 * Returns array of history records with:
 * - id
 * - responsable_id
 * - responsable_nombre
 * - responsable_email
 * - fecha_asignacion
 * - fecha_remocion (null if still assigned)
 * - estado (ACTIVO | REMOVIDO)
 */
export async function getHistorialResponsables(hallazgoId) {
  const { data } = await client.get(`${BASE}${hallazgoId}/historial_responsables/`);
  return data;
}

