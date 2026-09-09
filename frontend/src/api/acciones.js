import client from "./client.js";

export async function getAccion(hallazgoId, accionId) {
  const { data } = await client.get(`/hallazgos/${hallazgoId}/acciones/${accionId}/`);
  return data;
}

export async function updateAccion(hallazgoId, accionId, payload) {
  const { data } = await client.patch(`/hallazgos/${hallazgoId}/acciones/${accionId}/`, payload);
  return data;
}

export async function uploadArchivoAccion(hallazgoId, accionId, file) {
  const formData = new FormData();
  formData.append("archivo", file);
  const { data } = await client.post(
    `/hallazgos/${hallazgoId}/acciones/${accionId}/upload_archivo/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function solicitarCierreAccion(hallazgoId, accionId, observacion = "") {
  const { data } = await client.post(`/hallazgos/${hallazgoId}/acciones/${accionId}/solicitar_cierre/`, {
    observacion,
  });
  return data;
}

export async function listPorquesAccion(hallazgoId, accionId, params = {}) {
  const { data } = await client.get(
    `/hallazgos/${hallazgoId}/acciones/${accionId}/porques/`,
    { params }
  );
  return data?.results || data;
}

export async function createPorqueAccion(hallazgoId, accionId, textoCausa) {
  const { data } = await client.post(
    `/hallazgos/${hallazgoId}/acciones/${accionId}/porques/`,
    { texto_causa: textoCausa }
  );
  return data;
}

export async function approvePorqueAccion(hallazgoId, accionId, porqueId) {
  const { data } = await client.post(
    `/hallazgos/${hallazgoId}/acciones/${accionId}/porques/${porqueId}/approve/`
  );
  return data;
}

export async function rejectPorqueAccion(hallazgoId, accionId, porqueId, observacion = "") {
  const { data } = await client.post(
    `/hallazgos/${hallazgoId}/acciones/${accionId}/porques/${porqueId}/reject/`,
    { observacion }
  );
  return data;
}

export async function listSolicitudesCierre(params = {}) {
  const { data } = await client.get("/solicitudes-cierre/", { params });
  return data;
}

export async function aprobarSolicitudCierre(id) {
  const { data } = await client.post(`/solicitudes-cierre/${id}/aprobar/`);
  return data;
}

export async function rechazarSolicitudCierre(id, observacion = "") {
  const { data } = await client.post(`/solicitudes-cierre/${id}/rechazar/`, { observacion });
  return data;
}
