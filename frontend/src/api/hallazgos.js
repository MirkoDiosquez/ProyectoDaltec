import client from "./client.js";

const BASE = "/hallazgos/";

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

export async function addResponsable(id, responsableId) {
  const { data } = await client.post(`${BASE}${id}/add_responsable/`, {
    id: responsableId,
  });
  return data;
}

export async function removeResponsable(id, responsableId) {
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
