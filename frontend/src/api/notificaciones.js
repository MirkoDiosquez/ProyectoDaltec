/**
 * API module for notifications (T208).
 *
 * Uses the shared axios client which attaches Authorization: Bearer <token>
 * automatically via its request interceptor (see api/client.js).
 *
 * Endpoints:
 *   GET  /notificaciones/                    — list (filterable by tipo, leida)
 *   PATCH /notificaciones/{id}/marcar-leida/ — mark one as read
 *   POST /notificaciones/marcar-todas-leidas/ — mark all as read
 */
import client from './client.js';

const BASE = '/notificaciones/';

/**
 * Fetch notifications for the current user.
 *
 * @param {Object} params - Optional query params: { leida, tipo, ordering }
 * @returns {Promise<Array>} Array of notification objects
 */
export async function getNotificaciones(params = {}) {
  const { data } = await client.get(BASE, { params });
  // DRF may return paginated { results: [] } or a plain array
  return Array.isArray(data) ? data : (data.results ?? []);
}

/**
 * Mark a single notification as read.
 *
 * @param {number} id - Notification ID
 * @returns {Promise<Object>} Updated notification object
 */
export async function marcarLeida(id) {
  const { data } = await client.patch(`${BASE}${id}/marcar-leida/`);
  return data;
}

/**
 * Mark all notifications as read for the current user.
 *
 * @returns {Promise<Object>} { updated_count, message }
 */
export async function marcarTodasLeidas() {
  const { data } = await client.post(`${BASE}marcar-todas-leidas/`);
  return data;
}
