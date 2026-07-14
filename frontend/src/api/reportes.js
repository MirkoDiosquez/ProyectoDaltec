import client from "./client.js";

const BASE = "/reportes/";

export async function listReportes() {
  const { data } = await client.get(BASE);
  return data?.results || data;
}

export async function generarReporte() {
  const { data } = await client.post(BASE, {});
  return data;
}

export async function eliminarReporte(reporteId) {
  await client.delete(`${BASE}${reporteId}/`);
}

export async function descargarReporte(reporteId, nombre) {
  const response = await client.get(`${BASE}${reporteId}/download/`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
