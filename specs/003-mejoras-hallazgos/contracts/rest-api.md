# API Specification: REST Endpoints

**Date**: 2026-07-05 | **Feature**: specs/003-mejoras-hallazgos | **Status**: Complete

---

## Overview

This document specifies all REST API endpoints for the 8 features in the Hallazgos enhancement. All endpoints require JWT authentication (Bearer token in Authorization header). Request/response schemas are in JSON format.

**Base URL**: `/api/v1/`

**Auth Header**: `Authorization: Bearer {jwt_token}`

---

## Hallazgos (Extended)

### POST /hallazgos/
Create a new hallazgo with sector, subseccion, tipo classification.

**Request**:
```json
{
  "descripcion": "string",
  "ubicacion": "string",
  "sector_codigo": "string (e.g., 'RECLAMO_CLIENTE', 'PROVEEDOR', 'INTERNO')",
  "subseccion_codigo": "string or null (required if sector=INTERNO)",
  "tipo_codigo": "string (e.g., 'NO_CONFORMIDAD')",
  "contacto_externo": {
    "nombre_empresa": "string",
    "telefono": "string (optional)",
    "email": "string (optional)",
    "observacion": "string (optional)"
  }  // optional, only when sector=RECLAMO_CLIENTE and user=admin
}
```

**Response** (201 Created):
```json
{
  "id": 123,
  "descripcion": "string",
  "ubicacion": "string",
  "creado_por": {"id": 1, "nombre": "Admin User"},
  "sector": {"id": 1, "codigo": "RECLAMO_CLIENTE", "nombre": "Reclamo cliente"},
  "subseccion": null,
  "tipo": {"id": 1, "codigo": "QUEJA_CLIENTE", "nombre": "Queja del Cliente"},
  "contacto_externo": {
    "id": 456,
    "nombre_empresa": "XYZ Corp",
    "telefono": "555-1234",
    "email": "contact@xyz.com"
  },
  "estado": "abierto",
  "responsables": [],
  "fecha_creacion": "2026-07-05T10:00:00Z",
  "fecha_actualizacion": "2026-07-05T10:00:00Z"
}
```

**Status Codes**:
- `201 Created`: Success
- `400 Bad Request`: Validation error (missing required sector, invalid subseccion for sector, MIME type not whitelisted, file size exceeded)
- `403 Forbidden`: contacto_externo provided but user is not admin
- `403 Forbidden`: contacto_externo provided but sector is not RECLAMO_CLIENTE

**Authorization**: Any authenticated user

---

### GET /hallazgos/
List hallazgos with optional filtering by sector, subseccion, tipo, estado.

**Query Parameters**:
```
?sector_codigo=INTERNO
?subseccion_codigo=ADMIN
?tipo_codigo=NO_CONFORMIDAD
?estado=abierto
?creado_por_id=1
?limit=20
?offset=0
```

**Response** (200 OK):
```json
{
  "count": 150,
  "next": "/api/v1/hallazgos/?limit=20&offset=20",
  "previous": null,
  "results": [
    {
      "id": 123,
      "descripcion": "string",
      "sector": {"id": 1, "codigo": "INTERNO"},
      "subseccion": {"id": 5, "codigo": "ADMIN"},
      "tipo": {"id": 1, "codigo": "NO_CONFORMIDAD"},
      "estado": "abierto",
      "creado_por": {"id": 1, "nombre": "Admin"},
      "responsables": [
        {"id": 10, "nombre": "Juan Pérez"}
      ],
      "fecha_creacion": "2026-07-05T10:00:00Z"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid filter values

**Authorization**: Any authenticated user (returns only hallazgos user has access to)

---

### GET /hallazgos/{id}/
Retrieve single hallazgo with all details (sector, subseccion, tipo, contacto_externo, responsables, porqués, archivos, notificaciones).

**Response** (200 OK):
```json
{
  "id": 123,
  "descripcion": "string",
  "ubicacion": "string",
  "creado_por": {"id": 1, "nombre": "Admin User"},
  "sector": {"id": 1, "codigo": "RECLAMO_CLIENTE", "nombre": "Reclamo cliente"},
  "subseccion": null,
  "tipo": {"id": 1, "codigo": "QUEJA_CLIENTE", "nombre": "Queja del Cliente"},
  "contacto_externo": {
    "id": 456,
    "nombre_empresa": "XYZ Corp",
    "telefono": "555-1234",
    "email": "contact@xyz.com",
    "observacion": "Contact via email preferred"
  },
  "estado": "abierto",
  "responsables": [
    {"id": 10, "nombre": "Juan Pérez", "email": "juan@org.com"}
  ],
  "porques": [
    {
      "id": 500,
      "texto_causa": "Falta de control en proceso X",
      "autor_tipo": "admin",
      "autor": {"id": 1, "nombre": "Admin"},
      "estado": "aprobado",
      "fecha_creacion": "2026-07-05T11:00:00Z",
      "archivos": [
        {"id": 100, "nombre": "foto.jpg", "tipo_mime": "image/jpeg"}
      ]
    }
  ],
  "archivos": [
    {
      "id": 101,
      "nombre": "documento.pdf",
      "tipo_mime": "application/pdf",
      "tamanio": 1024000,
      "fecha_carga": "2026-07-05T10:30:00Z",
      "cargado_por": {"id": 5, "nombre": "Employee"}
    }
  ],
  "fecha_creacion": "2026-07-05T10:00:00Z",
  "fecha_actualizacion": "2026-07-05T15:30:00Z"
}
```

**Status Codes**:
- `200 OK`: Success
- `404 Not Found`: Hallazgo not found
- `403 Forbidden`: User lacks access

**Authorization**: Authenticated user with access to hallazgo (creator, assigned responsible, or admin)

---

### PATCH /hallazgos/{id}/
Update hallazgo fields.

**Request**:
```json
{
  "descripcion": "string (optional)",
  "ubicacion": "string (optional)",
  "estado": "abierto|en_progreso|cerrado|cancelado (optional)",
  "responsables_ids": [1, 2, 3]  // optional, replaces current list
}
```

**Response** (200 OK): Updated hallazgo object

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid field values
- `403 Forbidden`: User lacks permission to update
- `404 Not Found`: Hallazgo not found

**Authorization**: Creator or Admin only

---

## Catalogos (Dynamic Configuration)

### GET /catalogos/sectores/
Retrieve all active sectors.

**Response** (200 OK):
```json
{
  "count": 3,
  "results": [
    {"id": 1, "codigo": "RECLAMO_CLIENTE", "nombre": "Reclamo cliente", "activo": true},
    {"id": 2, "codigo": "PROVEEDOR", "nombre": "Proveedor", "activo": true},
    {"id": 3, "codigo": "INTERNO", "nombre": "Interno", "activo": true}
  ]
}
```

**Authorization**: Any authenticated user

---

### GET /catalogos/subsecciones/?sector_codigo=INTERNO
Retrieve subsections for a given sector.

**Query Parameters**:
```
?sector_codigo=INTERNO (required)
```

**Response** (200 OK):
```json
{
  "count": 5,
  "results": [
    {"id": 5, "sector_codigo": "INTERNO", "codigo": "ADMIN", "nombre": "Administración", "activo": true},
    {"id": 6, "sector_codigo": "INTERNO", "codigo": "COMPRAS", "nombre": "Compras", "activo": true}
  ]
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Missing sector_codigo

**Authorization**: Any authenticated user

---

### GET /catalogos/tipos/
Retrieve all active tipo values.

**Response** (200 OK):
```json
{
  "count": 3,
  "results": [
    {"id": 1, "codigo": "NO_CONFORMIDAD", "nombre": "No Conformidad", "activo": true},
    {"id": 2, "codigo": "OPORTUNIDAD_MEJORA", "nombre": "Oportunidad de Mejora", "activo": true},
    {"id": 3, "codigo": "QUEJA_CLIENTE", "nombre": "Queja del Cliente", "activo": true}
  ]
}
```

**Authorization**: Any authenticated user

---

### POST /catalogos/sectores/ (Admin Only)
Create new sector.

**Request**:
```json
{
  "codigo": "string (uppercase, unique)",
  "nombre": "string",
  "descripcion": "string (optional)"
}
```

**Response** (201 Created): New sector object

**Authorization**: Admin only

---

### PATCH /catalogos/sectores/{id}/ (Admin Only)
Update sector (codes is immutable).

**Request**:
```json
{
  "nombre": "string (optional)",
  "descripcion": "string (optional)",
  "activo": true|false (optional)
}
```

**Response** (200 OK): Updated sector object

**Authorization**: Admin only

---

### DELETE /catalogos/sectores/{id}/ (Admin Only)
Delete sector (soft-delete by setting activo=false is recommended).

**Response** (204 No Content)

**Authorization**: Admin only

**Similar endpoints for subsecciones and tipos.**

---

## Análisis de 5 Porqués

### POST /hallazgos/{hallazgo_id}/porques/
Create a 5-why analysis entry.

**Request**:
```json
{
  "texto_causa": "string (required)",
  "archivos": [
    {
      "archivo_base64": "string (base64-encoded file content)",
      "nombre": "string (e.g., 'foto.jpg')",
      "tipo_mime": "string (e.g., 'image/jpeg')"
    }
  ]  // optional
}
```

**Response** (201 Created):
```json
{
  "id": 500,
  "hallazgo_id": 123,
  "texto_causa": "string",
  "autor_tipo": "responsable",  // or "admin"
  "autor": {"id": 10, "nombre": "Juan Pérez"},
  "estado": "pendiente",  // "aprobado" if autor_tipo="admin"
  "archivos": [
    {"id": 100, "nombre": "foto.jpg", "tipo_mime": "image/jpeg"}
  ],
  "fecha_creacion": "2026-07-05T11:00:00Z",
  "fecha_aprobacion": null  // or timestamp if approved
}
```

**Behavior**:
- If request user is admin: `estado` = "aprobado", `fecha_aprobacion` = now, `aprobado_por` = user
- If request user is responsable: `estado` = "pendiente", `fecha_aprobacion` = null, `aprobado_por` = null

**Status Codes**:
- `201 Created`: Success
- `400 Bad Request`: File not whitelisted or too large
- `403 Forbidden`: User not responsable/admin for this hallazgo
- `404 Not Found`: Hallazgo not found

**Authorization**: Admin or assigned responsible party

---

### GET /hallazgos/{hallazgo_id}/porques/
List all porqués for a hallazgo (ordered by creation date).

**Response** (200 OK):
```json
{
  "count": 5,
  "results": [
    {
      "id": 500,
      "texto_causa": "string",
      "autor_tipo": "admin",
      "autor": {"id": 1, "nombre": "Admin"},
      "estado": "aprobado",
      "fecha_creacion": "2026-07-05T11:00:00Z"
    }
  ]
}
```

**Authorization**: Hallazgo participants (creator, responsables, admin)

---

### PATCH /hallazgos/{hallazgo_id}/porques/{porque_id}/approve/
Admin approval of responsable-submitted porqué.

**Request**:
```json
{}
```

**Response** (200 OK):
```json
{
  "id": 500,
  "estado": "aprobado",
  "fecha_aprobacion": "2026-07-05T12:00:00Z",
  "aprobado_por": {"id": 1, "nombre": "Admin"}
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Porqué already approved/rejected
- `403 Forbidden`: User not admin
- `404 Not Found`: Porqué not found

**Authorization**: Admin only

---

### PATCH /hallazgos/{hallazgo_id}/porques/{porque_id}/reject/
Admin rejection of responsable-submitted porqué.

**Request**:
```json
{
  "observacion": "string (optional reason for rejection)"
}
```

**Response** (200 OK):
```json
{
  "id": 500,
  "estado": "rechazado",
  "fecha_aprobacion": "2026-07-05T12:00:00Z",
  "aprobado_por": {"id": 1, "nombre": "Admin"},
  "observacion_rechazo": "string"
}
```

**Authorization**: Admin only

---

## Archivos (Extended)

### POST /archivos/upload/
Upload file with polymorphic association.

**Request** (multipart/form-data):
```
archivo_file: [binary file content]
nombre: "documento.pdf"
hallazgo_id: 123  // or porque_id or mensaje_id (exactly one required)
tipo_mime: "application/pdf" (optional, inferred from file extension)
```

**Response** (201 Created):
```json
{
  "id": 101,
  "nombre": "documento.pdf",
  "tipo_mime": "application/pdf",
  "tamanio": 1024000,
  "fecha_carga": "2026-07-05T10:30:00Z",
  "cargado_por": {"id": 5, "nombre": "Employee"},
  "hallazgo_id": 123,
  "porque_id": null,
  "mensaje_id": null,
  "preview_url": "/archivos/101/preview/"
}
```

**Status Codes**:
- `201 Created`: Success
- `400 Bad Request`: No file provided, MIME type not whitelisted, file size exceeded, multiple parents provided
- `404 Not Found`: Parent (hallazgo/porque/mensaje) not found

**Authorization**: Any authenticated user

---

### GET /archivos/{id}/
Retrieve file metadata.

**Response** (200 OK):
```json
{
  "id": 101,
  "nombre": "documento.pdf",
  "tipo_mime": "application/pdf",
  "tamanio": 1024000,
  "fecha_carga": "2026-07-05T10:30:00Z",
  "cargado_por": {"id": 5, "nombre": "Employee"},
  "preview_url": "/archivos/101/preview/"
}
```

**Authorization**: User with access to parent hallazgo/porque/mensaje

---

### GET /archivos/{id}/download/
Download file (returns file as attachment).

**Response** (200 OK): File content with Content-Disposition: attachment

**Status Codes**:
- `200 OK`: Success
- `404 Not Found`: File not found

**Authorization**: User with access to parent hallazgo/porque/mensaje

---

### GET /archivos/{id}/preview/
Serve file for inline preview (embeddable in `<img>` or `<iframe src>` tags).

**Response** (200 OK): File content with Content-Disposition: inline

**Note**: Supported formats for inline preview: image/*, application/pdf, text/plain, text/csv. Other formats redirects to download endpoint.

**Authorization**: User with access to parent hallazgo/porque/mensaje

---

## Solicitudes de Cambio de Responsable

### POST /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/
Create request to add/change responsible parties.

**Request**:
```json
{
  "tipo": "agregar_responsable|cambiar_responsable",
  "usuario_propuesto_id": 20,
  "observacion": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "id": 700,
  "hallazgo_id": 123,
  "responsable_solicitante": {"id": 10, "nombre": "Juan Pérez"},
  "tipo": "cambiar_responsable",
  "usuario_propuesto": {"id": 20, "nombre": "María García"},
  "observacion_solicitante": "string",
  "estado": "pendiente",
  "fecha_creacion": "2026-07-05T13:00:00Z"
}
```

**Validation**:
- User must be a current responsible for the hallazgo
- UNIQUE(hallazgo, responsable_solicitante, usuario_propuesto) with estado='pendiente'
- usuario_propuesto cannot be same as responsable_solicitante

**Status Codes**:
- `201 Created`: Success
- `400 Bad Request`: Duplicate pending request, invalid user
- `403 Forbidden`: User not assigned responsible for this hallazgo
- `404 Not Found`: Hallazgo not found

**Authorization**: Assigned responsible party

---

### GET /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/
List all change requests for a hallazgo.

**Response** (200 OK):
```json
{
  "count": 2,
  "results": [
    {
      "id": 700,
      "tipo": "cambiar_responsable",
      "responsable_solicitante": {"id": 10, "nombre": "Juan Pérez"},
      "usuario_propuesto": {"id": 20, "nombre": "María García"},
      "estado": "pendiente",
      "fecha_creacion": "2026-07-05T13:00:00Z"
    }
  ]
}
```

**Authorization**: Hallazgo participants (admin, creator, responsables)

---

### PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{request_id}/approve/
Admin approval of change request.

**Request**:
```json
{}
```

**Response** (200 OK):
```json
{
  "id": 700,
  "estado": "aprobada",
  "fecha_resolucion": "2026-07-05T14:00:00Z",
  "resuelto_por": {"id": 1, "nombre": "Admin"}
}
```

**Behavior**:
- If tipo='agregar_responsable': Add usuario_propuesto to hallazgo.responsables
- If tipo='cambiar_responsable': Remove responsable_solicitante, add usuario_propuesto
- Notify both affected users

**Authorization**: Admin only

---

### PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{request_id}/reject/
Admin rejection of change request.

**Request**:
```json
{
  "observacion": "string (optional reason)"
}
```

**Response** (200 OK):
```json
{
  "id": 700,
  "estado": "rechazada",
  "fecha_resolucion": "2026-07-05T14:00:00Z",
  "resuelto_por": {"id": 1, "nombre": "Admin"},
  "observacion_resolucion": "string"
}
```

**Authorization**: Admin only

---

## Chat (Extended)

### POST /chat/{chat_id}/mensajes/
Send a chat message with optional #urgente tag and file attachments.

**Request**:
```json
{
  "contenido_texto": "string (required, case-insensitive #urgente detection)",
  "archivos": [
    {
      "archivo_base64": "string",
      "nombre": "string",
      "tipo_mime": "string"
    }
  ]  // optional
}
```

**Response** (201 Created):
```json
{
  "id": 600,
  "chat_id": 50,
  "autor": {"id": 10, "nombre": "Juan Pérez"},
  "contenido_texto": "Se debe revisar #urgente el proceso X",
  "tiene_urgente": true,  // auto-detected
  "archivos": [
    {"id": 102, "nombre": "foto.png", "tipo_mime": "image/png"}
  ],
  "fecha_hora": "2026-07-05T14:30:00Z"
}
```

**Behavior**:
- Regex detects `#urgente` case-insensitive
- If tiene_urgente=true: dispatch notification to all chat participants

**Authorization**: Chat participant

---

### GET /chat/{chat_id}/mensajes/
List messages in a chat.

**Response** (200 OK):
```json
{
  "count": 50,
  "results": [
    {
      "id": 600,
      "autor": {"id": 10, "nombre": "Juan Pérez"},
      "contenido_texto": "string",
      "tiene_urgente": false,
      "archivos": [],
      "fecha_hora": "2026-07-05T14:30:00Z"
    }
  ]
}
```

**Authorization**: Chat participant

---

## Notificaciones (Extended)

### GET /notificaciones/
List notifications for current user.

**Query Parameters**:
```
?tipo=mensaje_urgente,aprobacion_porque_pendiente
?leida=false
?limit=20
?offset=0
```

**Response** (200 OK):
```json
{
  "count": 15,
  "results": [
    {
      "id": 1000,
      "tipo": "aprobacion_porque_pendiente",
      "hallazgo_id": 123,
      "titulo": "Porqué pendiente de aprobación en hallazgo 123",
      "contenido": "string",
      "leida": false,
      "fecha_creacion": "2026-07-05T11:00:00Z",
      "enlace_destino": "/hallazgos/123/"
    }
  ]
}
```

**Authorization**: Authenticated user (returns only own notifications)

---

### PATCH /notificaciones/{id}/marcar-leida/
Mark notification as read.

**Request**:
```json
{}
```

**Response** (200 OK):
```json
{
  "id": 1000,
  "leida": true,
  "fecha_lectura": "2026-07-05T15:00:00Z"
}
```

**Authorization**: Notification owner only

---

### POST /notificaciones/marcar-todas-leidas/
Mark all notifications as read.

**Request**:
```json
{
  "tipo": "string (optional, filter by type)"
}
```

**Response** (200 OK):
```json
{
  "count": 10,
  "message": "10 notifications marked as read"
}
```

**Authorization**: Authenticated user

---

## Error Responses

All errors return JSON with structure:

```json
{
  "error": {
    "code": "string (e.g., 'VALIDATION_ERROR', 'PERMISSION_DENIED')",
    "message": "string (user-friendly description)",
    "details": {
      "field_name": ["error message 1", "error message 2"]
    }
  }
}
```

**Common HTTP Status Codes**:
- `200 OK`: Successful GET, PATCH, PUT
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User lacks permission
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource (e.g., duplicate pending request)
- `500 Internal Server Error`: Server error

---

**Status**: Complete  
**Next Step**: Create contracts/websocket.md
