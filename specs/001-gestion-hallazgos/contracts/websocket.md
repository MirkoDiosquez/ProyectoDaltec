# WebSocket Contract

**Branch**: `001-gestion-hallazgos` | **Date**: 2026-06-16

## Overview

Django Channels 4.x con Redis Channel Layer. Se exponen dos consumers:

| Consumer | URL | Propósito |
|----------|-----|-----------|
| `ChatConsumer` | `ws://host/ws/chat/{hallazgo_id}/` | Mensajería en tiempo real del chat del hallazgo |
| `NotificacionConsumer` | `ws://host/ws/notificaciones/` | Push de notificaciones al Administrador |

---

## Autenticación WebSocket

El API WebSocket del navegador no soporta headers `Authorization`. El access token JWT se pasa como query parameter:

```
ws://host/ws/chat/1/?token=<access_token>
```

Un `TokenAuthMiddleware` personalizado (ASGI) valida el token antes del upgrade de la conexión. Si el token es inválido o expirado, cierra la conexión con código `4001`.

**Security note**: El access token tiene vida corta (configurable vía `JWT_ACCESS_LIFETIME`). El frontend debe renovarlo antes de abrir una nueva conexión WebSocket si el anterior expiró.

---

## ChatConsumer

**URL**: `ws://host/ws/chat/{hallazgo_id}/?token=<access_token>`

**Permisos**: Solo participantes vigentes del chat (responsables del hallazgo) pueden conectarse.

**Channel Group**: `chat_{hallazgo_id}`

### Conexión / Desconexión

Al conectar, el consumer verifica que el usuario sea participante del chat del hallazgo. Si no lo es, rechaza la conexión con código `4003`.

### Mensajes: Client → Server

#### `chat.send`
Enviar un mensaje al chat.

```json
{
  "type": "chat.send",
  "contenido": "Texto del mensaje"
}
```

**Validación**: `contenido` no puede estar vacío. Si el usuario ya no es participante (fue removido), el mensaje se rechaza.

### Mensajes: Server → Client

#### `chat.message`
Broadcast del nuevo mensaje a todos los participantes conectados.

```json
{
  "type": "chat.message",
  "mensaje": {
    "id": 42,
    "contenido": "Texto del mensaje",
    "fecha_hora": "2026-06-16T10:00:00Z",
    "autor": {
      "id": 3,
      "nombre": "Juan Pérez"
    }
  }
}
```

#### `chat.participant_removed`
Notificación enviada al usuario que fue removido como responsable (antes de cerrar su conexión).

```json
{
  "type": "chat.participant_removed",
  "detail": "Has sido removido del hallazgo y ya no tienes acceso al chat."
}
```

Tras enviar este mensaje, el server cierra la conexión del usuario removido con código `4003`.

---

## NotificacionConsumer

**URL**: `ws://host/ws/notificaciones/?token=<access_token>`

**Permisos**: Solo ADMIN.

**Channel Group**: `notificaciones_admin_{user_id}`

### Conexión

El consumer verifica que el usuario sea ADMIN. Si no, rechaza con código `4003`.

### Mensajes: Server → Client

El server solo envía mensajes push; el cliente no envía mensajes en este consumer.

#### `notificacion.nueva`
Nueva notificación generada en el sistema.

```json
{
  "type": "notificacion.nueva",
  "notificacion": {
    "id": 7,
    "titulo": "Nuevo hallazgo registrado",
    "mensaje": "Juan Pérez registró una No Conformidad en Sector B.",
    "fecha": "2026-06-16T10:00:00Z",
    "leida": false,
    "hallazgo_relacionado": {
      "id": 1,
      "tipo": "NO_CONFORMIDAD",
      "estado": "PENDIENTE"
    }
  }
}
```

**Triggers** (cuándo se emite):
- Creación de cualquier Hallazgo (FR-008).
- Solicitud de cierre de acción por un Empleado (FR-016 → FR-017).

---

## Close Codes

| Código | Significado |
|--------|-------------|
| `4001` | Token JWT inválido o expirado |
| `4003` | Sin permisos (usuario no es participante / no es Admin) |
| `1000` | Cierre normal |
