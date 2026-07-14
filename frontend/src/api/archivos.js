/**
 * Authenticated file download and preview for Archivo objects.
 *
 * Direct <img src> / <a href> navigation cannot send the JWT Authorization header,
 * so all file fetches must go through the axios client which injects the token.
 */
import client from "./client.js";

/**
 * Fetch a file for inline preview and return a temporary blob URL.
 * The caller is responsible for calling URL.revokeObjectURL() on cleanup.
 *
 * @param {number} archivoId
 * @returns {Promise<string>}  blob: URL
 */
export async function getPreviewBlobUrl(archivoId) {
  const response = await client.get(`/archivos/${archivoId}/preview/`, {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
}

/**
 * Download a file using the authenticated client.
 * Creates a temporary <a> element and clicks it to trigger the browser download.
 *
 * @param {number} archivoId
 * @param {string} nombre  — suggested filename
 */
export async function downloadArchivo(archivoId, nombre) {
  const response = await client.get(`/archivos/${archivoId}/download/`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to let the download start
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Admin: Get list of all files with metadata.
 * GET /archivos/admin_files/
 *
 * @returns {Promise<{total: number, files: Array}>}
 */
export async function getAdminFilesList() {
  const { data } = await client.get("/archivos/admin_files/");
  return data;
}

/**
 * Admin: Delete a single file.
 * DELETE /archivos/{id}/admin_delete/
 *
 * @param {number} archivoId
 * @returns {Promise<{detail: string, deleted_id: number}>}
 */
export async function deleteArchivoAdmin(archivoId) {
  const { data } = await client.delete(`/archivos/${archivoId}/admin_delete/`);
  return data;
}

/**
 * Admin: Bulk delete multiple files.
 * POST /archivos/admin_bulk_delete/
 *
 * @param {Array<number>} fileIds
 * @returns {Promise<{detail: string, deleted_count: number}>}
 */
export async function bulkDeleteArchivosAdmin(fileIds) {
  const { data } = await client.post("/archivos/admin_bulk_delete/", {
    file_ids: fileIds,
  });
  return data;
}
