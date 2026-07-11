/**
 * Notification navigation utility (T213).
 *
 * Maps each notification tipo to the correct in-app destination so that
 * clicking a notification takes the user directly to the relevant section
 * inside the hallazgo detail page.
 *
 * Supported tipos (must match Notificacion.TIPO_CHOICES on the backend):
 *   aprobacion_porque_pendiente  → hallazgo detail, #porques section
 *   cambio_responsable_pendiente → hallazgo detail, #responsables section
 *   cierre_pendiente             → hallazgo detail, #acciones section
 *   asignado_responsable         → hallazgo detail (top)
 *   mensaje_urgente              → hallazgo detail, #chat section
 */

/** @type {Record<string, (id: number) => string>} */
const ROUTES_BY_TIPO = {
  aprobacion_porque_pendiente: (id) => `/hallazgos/${id}#porques`,
  cambio_responsable_pendiente: (id) => `/hallazgos/${id}#responsables`,
  cierre_pendiente: (id) => `/hallazgos/${id}#acciones`,
  asignado_responsable: (id) => `/hallazgos/${id}`,
  mensaje_urgente: (id) => `/hallazgos/${id}#chat`,
};

/**
 * Returns the navigation path for a given notification tipo and hallazgo id.
 * Falls back to the hallazgo detail root if the tipo is unknown.
 *
 * @param {string} tipo  - Notification tipo value
 * @param {number} id    - Hallazgo ID
 * @returns {string}     Navigation path (may include hash anchor)
 */
export function getNotifRoute(tipo, id) {
  const builder = ROUTES_BY_TIPO[tipo];
  return builder ? builder(id) : `/hallazgos/${id}`;
}

/**
 * Extracts the hallazgo ID from a notification object.
 *
 * Handles two shapes produced by the system:
 *   - REST API response:  notif.hallazgo_related = { id, tipo, estado }
 *   - WebSocket payload:  notif.hallazgo_id = <number>
 *
 * @param {Object} notif  - Notification object (from REST or WebSocket)
 * @returns {number|null} Hallazgo ID or null if not present
 */
export function getHallazgoId(notif) {
  return notif?.hallazgo_related?.id ?? notif?.hallazgo_id ?? null;
}
