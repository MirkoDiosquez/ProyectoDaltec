# REST API Contract

**Branch**: `001-gestion-hallazgos` | **Date**: 2026-06-16

## Conventions

- Base URL: `/api/v1/`
- Authentication: `Authorization: Bearer <access_token>` (JWT)
- Content-Type: `application/json` (except file uploads: `multipart/form-data`)
- Errors: `{ "detail": "message" }` or `{ "field": ["error"] }` (DRF default)
- HTTP Status codes follow REST semantics: 200, 201, 204, 400, 401, 403, 404, 409

---

## Auth

### POST `/api/v1/auth/login/`
Obtener tokens JWT.

**Auth required**: No

**Request**:
```json
{
  "dni": 12345678,
  "password": "string"
}
```

**Response 200**:
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>"
}
```

**Response 401**: Credenciales inválidas.

---

### POST `/api/v1/auth/refresh/`
Renovar access token.

**Auth required**: No (refresh token en cookie HttpOnly)

**Response 200**:
```json
{ "access": "<new_access_token>" }
```

---

### POST `/api/v1/auth/logout/`
Invalidar refresh token (blacklist).

**Auth required**: Yes

**Response 204**: No content.

---

## Usuarios

### POST `/api/v1/usuarios/`
Crear nuevo usuario.

**Auth required**: ADMIN

**Request**:
```json
{
  "dni": 12345678,
  "nombre": "Juan",
  "apellido": "Pérez",
  "sexo": "M",
  "email": "juan@empresa.com",
  "password": "string",
  "tipo": "EMPLEADO",
  "sector": "Producción"
}
```
*Para `tipo=CLIENTE`: reemplazar `sector` por `empresa: "EMPRESA_A"`.*

**Response 201**:
```json
{
  "id": 1,
  "dni": 12345678,
  "nombre": "Juan",
  "apellido": "Pérez",
  "tipo": "EMPLEADO"
}
```

**Response 400**: DNI duplicado, campos inválidos (FR-003).
**Response 403**: No ADMIN.

---

### GET `/api/v1/usuarios/`
Listar usuarios del sistema.

**Auth required**: ADMIN

**Response 200**: Array de usuarios (id, dni, nombre, apellido, tipo).

---

### GET `/api/v1/usuarios/me/`
Perfil del usuario autenticado.

**Auth required**: Yes

**Response 200**: Datos del usuario + perfil de rol.

---

## Hallazgos

### POST `/api/v1/hallazgos/`
Crear hallazgo.

**Auth required**: EMPLEADO | CLIENTE

**Request**:
```json
{
  "descripcion": "string",
  "ubicacion": "Sector B",
  "tipo": "NO_CONFORMIDAD"
}
```
*Empleados pueden usar: `NO_CONFORMIDAD`, `OPORTUNIDAD_MEJORA` (FR-004).*  
*Clientes solo: `QUEJA_CLIENTE` (FR-005).*

**Response 201**:
```json
{
  "id": 1,
  "descripcion": "string",
  "ubicacion": "Sector B",
  "tipo": "NO_CONFORMIDAD",
  "estado": "PENDIENTE",
  "fecha_creacion": "2026-06-16",
  "creado_por": { "id": 2, "nombre": "Juan Pérez" }
}
```

**Response 400**: Tipo no permitido para el rol del usuario.

---

### GET `/api/v1/hallazgos/`
Listar hallazgos visibles para el usuario autenticado.

**Auth required**: Yes

- ADMIN: todos los hallazgos (FR-023).
- EMPLEADO: solo hallazgos donde es responsable (FR-024).
- CLIENTE: solo sus propias Quejas de Cliente (FR-025).

**Query params**: `estado`, `tipo` (filtros opcionales)

**Response 200**: Array paginado de hallazgos.

---

### GET `/api/v1/hallazgos/{id}/`
Detalle de hallazgo.

**Auth required**: Yes (mismo criterio de visibilidad que listado)

**Response 200**:
```json
{
  "id": 1,
  "descripcion": "string",
  "ubicacion": "Sector B",
  "tipo": "NO_CONFORMIDAD",
  "estado": "APROBADO",
  "fecha_creacion": "2026-06-16",
  "creado_por": { "id": 2, "nombre": "Juan Pérez" },
  "responsables": [{ "id": 3, "nombre": "Ana García" }],
  "acciones": [
    { "id": 1, "tipo": "INMEDIATA", "estado": "EN_PROGRESO" },
    { "id": 2, "tipo": "CORRECTIVA", "estado": "PENDIENTE" },
    { "id": 3, "tipo": "VERIFICACION_EFICIENCIA", "estado": "PENDIENTE" }
  ]
}
```

---

### PATCH `/api/v1/hallazgos/{id}/aprobar/`
Aprobar hallazgo en estado PENDIENTE.

**Auth required**: ADMIN

**Response 200**: Hallazgo actualizado con `estado: APROBADO`.
**Response 400**: Estado no es PENDIENTE.
**Response 409**: RECHAZADO es terminal.

---

### PATCH `/api/v1/hallazgos/{id}/rechazar/`
Rechazar hallazgo en estado PENDIENTE.

**Auth required**: ADMIN

**Response 200**: Hallazgo con `estado: RECHAZADO`.

---

### PATCH `/api/v1/hallazgos/{id}/reclasificar/`
Cambiar tipo de hallazgo PENDIENTE.

**Auth required**: ADMIN

**Request**:
```json
{ "tipo": "OPORTUNIDAD_MEJORA" }
```

**Response 200**: Hallazgo con nuevo `tipo`; `estado` permanece `PENDIENTE`.

---

### POST `/api/v1/hallazgos/{id}/responsables/`
Asignar responsable a hallazgo APROBADO.

**Auth required**: ADMIN

**Request**:
```json
{ "responsable_id": 3 }
```

**Response 200**: Lista actualizada de responsables.
**Response 200** (info): Si ya estaba asignado, responde con aviso (no error bloqueante) (FR-027).
**Response 400**: Hallazgo no en estado APROBADO.

---

### DELETE `/api/v1/hallazgos/{id}/responsables/{usuario_id}/`
Remover responsable de hallazgo.

**Auth required**: ADMIN

**Response 204**: Responsable removido; participante eliminado del chat automáticamente (FR-013).

---

### POST `/api/v1/hallazgos/{id}/archivos/`
Adjuntar archivo a hallazgo.

**Auth required**: ADMIN | EMPLEADO responsable

**Content-Type**: `multipart/form-data`

**Request**: Campo `archivo` (file).

**Response 201**:
```json
{
  "id": 1,
  "nombre": "evidencia.pdf",
  "fecha_carga": "2026-06-16T10:00:00Z",
  "cargado_por": { "id": 2, "nombre": "Juan Pérez" }
}
```

**Response 400**: Tipo MIME no permitido o tamaño excede límite.

---

## Acciones

### GET `/api/v1/hallazgos/{hallazgo_id}/acciones/{id}/`
Detalle de acción.

**Auth required**: ADMIN | EMPLEADO responsable

**Response 200**:
```json
{
  "id": 1,
  "tipo": "INMEDIATA",
  "descripcion": "string",
  "fecha_inicio": "2026-06-16",
  "fecha_fin": "2026-06-30",
  "estado": "EN_PROGRESO",
  "archivos": []
}
```

---

### PATCH `/api/v1/hallazgos/{hallazgo_id}/acciones/{id}/`
Actualizar descripción y/o fechas de acción.

**Auth required**: EMPLEADO responsable del hallazgo

**Request**:
```json
{
  "descripcion": "Descripción actualizada",
  "fecha_inicio": "2026-06-17",
  "fecha_fin": "2026-07-01"
}
```

**Response 200**: Acción actualizada; estado pasa a `EN_PROGRESO` si era `PENDIENTE`.

---

### POST `/api/v1/hallazgos/{hallazgo_id}/acciones/{id}/archivos/`
Adjuntar archivo a acción.

**Auth required**: EMPLEADO responsable

**Content-Type**: `multipart/form-data`

**Response 201**: Mismo esquema que adjunto de hallazgo.

---

### POST `/api/v1/hallazgos/{hallazgo_id}/acciones/{id}/solicitar-cierre/`
Solicitar cierre de acción.

**Auth required**: EMPLEADO responsable

**Request**:
```json
{ "observacion": "string (opcional)" }
```

**Response 201**:
```json
{
  "id": 1,
  "accion_id": 1,
  "estado": "PENDIENTE",
  "fecha_solicitud": "2026-06-16T10:00:00Z"
}
```

**Response 400**: Acción no en estado `EN_PROGRESO`.

---

### PATCH `/api/v1/solicitudes-cierre/{id}/aprobar/`
Aprobar solicitud de cierre de acción.

**Auth required**: ADMIN

**Response 200**: Solicitud `APROBADA`; acción pasa a `CERRADA`; verificación de cierre automático de hallazgo (FR-022).

---

### PATCH `/api/v1/solicitudes-cierre/{id}/rechazar/`
Rechazar solicitud de cierre.

**Auth required**: ADMIN

**Request**:
```json
{ "observacion": "Motivo del rechazo" }
```

**Response 200**: Solicitud `RECHAZADA`; acción vuelve a `EN_PROGRESO` (FR-019).

---

## Notificaciones

### GET `/api/v1/notificaciones/`
Listar notificaciones del usuario autenticado.

**Auth required**: ADMIN

**Query params**: `leida=false` (filtro opcional)

**Response 200**: Array de notificaciones.

---

### PATCH `/api/v1/notificaciones/{id}/marcar-leida/`
Marcar notificación como leída.

**Auth required**: ADMIN

**Response 200**: Notificación con `leida: true`.

---

## Chat

### GET `/api/v1/hallazgos/{id}/chat/`
Obtener información del chat y mensajes históricos del hallazgo.

**Auth required**: Participante vigente del chat (responsable del hallazgo)

**Response 200**:
```json
{
  "id": 1,
  "participantes": [{ "id": 2, "nombre": "Juan Pérez" }],
  "mensajes": [
    {
      "id": 1,
      "contenido": "Hola",
      "fecha_hora": "2026-06-16T10:00:00Z",
      "autor": { "id": 2, "nombre": "Juan Pérez" }
    }
  ]
}
```

**Response 403**: Usuario no es participante del chat.
