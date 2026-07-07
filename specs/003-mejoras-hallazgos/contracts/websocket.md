# WebSocket Protocol Specification

**Date**: 2026-07-05 | **Feature**: specs/003-mejoras-hallazgos | **Status**: Complete

---

## Overview

WebSocket connections enable real-time chat messages and push notifications. The server uses Django Channels with Redis as the channel layer for horizontal scaling.

**Server**: Django Channels (asgiref + channels-redis)  
**Authentication**: JWT Bearer token (via query parameter)  
**Protocol**: JSON-formatted text frames  
**Transport**: WebSocket (secure WSS in production)

---

## Connection Endpoints

### 1. Chat Channel
```
ws://localhost/ws/chat/{hallazgo_id}/?token={jwt_token}
wss://production.example.com/ws/chat/{hallazgo_id}/?token={jwt_token}  (production)
```

**Purpose**: Real-time chat messages within a hallazgo discussion.

**Authorization**:
- User must be a participant in the hallazgo's chat (creator, assigned responsible, admin)
- JWT token validated on connection; invalid/expired token closes connection

---

### 2. Notifications Channel
```
ws://localhost/ws/notificaciones/?token={jwt_token}
wss://production.example.com/ws/notificaciones/?token={jwt_token}  (production)
```

**Purpose**: Real-time categorized notifications (cierre_pendiente, aprobacion_porque_pendiente, etc.).

**Authorization**:
- User receives only their own notifications
- JWT token validated on connection

---

## Chat Channel: Message Types

### Client → Server: Send Message

**Format**:
```json
{
  "type": "chat.message",
  "contenido_texto": "Se debe revisar #urgente el proceso X",
  "archivos": [
    {
      "archivo_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "nombre": "imagen.png",
      "tipo_mime": "image/png"
    }
  ]
}
```

**Processing**:
1. Server validates user is hallazgo participant
2. Regex detects `#urgente` (case-insensitive)
3. Save Mensaje to database
4. Broadcast to all chat participants
5. If tiene_urgente=true: dispatch notification to all participants (via WebSocket)

---

### Server → Client: Message Received

**Format** (sent to all chat participants):
```json
{
  "type": "chat.message",
  "id": 600,
  "chat_id": 50,
  "autor_id": 10,
  "autor_nombre": "Juan Pérez",
  "contenido_texto": "Se debe revisar #urgente el proceso X",
  "tiene_urgente": true,
  "archivos": [
    {
      "id": 102,
      "nombre": "imagen.png",
      "tipo_mime": "image/png",
      "preview_url": "/archivos/102/preview/",
      "download_url": "/archivos/102/download/"
    }
  ],
  "fecha_hora": "2026-07-05T14:30:00Z"
}
```

---

### Server → Client: Participant List Updated

**Format** (sent to all chat participants when someone joins/leaves):
```json
{
  "type": "chat.participants",
  "participants": [
    {"id": 10, "nombre": "Juan Pérez", "estado": "online"},
    {"id": 1, "nombre": "Admin User", "estado": "online"}
  ]
}
```

---

### Server → Client: Error

**Format**:
```json
{
  "type": "chat.error",
  "code": "VALIDATION_ERROR",
  "message": "File size exceeds maximum 50 MB",
  "details": {
    "file": "documento.pdf (75 MB)"
  }
}
```

---

### Server → Client: Participant Removed

**Format** (sent when a responsible is removed from hallazgo via change request approval):
```json
{
  "type": "chat.participant_removed",
  "usuario_id": 10,
  "usuario_nombre": "Juan Pérez",
  "razon": "Removed from hallazgo responsables"
}
```

**Behavior**: Client-side closes connection and redirects user (optional) since they no longer have access to chat.

---

## Notifications Channel: Message Types

### Server → Client: New Notification

**Format** (sent to target user):
```json
{
  "type": "notificacion.nueva",
  "id": 1000,
  "tipo": "aprobacion_porque_pendiente",  // categorization
  "hallazgo_id": 123,
  "titulo": "Porqué pendiente de aprobación en hallazgo 123",
  "contenido": "Falta de control en proceso X",
  "enlace_destino": "/hallazgos/123/",
  "fecha_creacion": "2026-07-05T11:00:00Z"
}
```

**Categorization Types**:
- `cierre_pendiente`: Request to close hallazgo (admin/responsables)
- `aprobacion_porque_pendiente`: Responsable-submitted porqué pending admin approval (admin)
- `cambio_responsable_pendiente`: Request to change/add responsible (affected user)
- `asignado_responsable`: User newly assigned as responsible (new responsible)
- `mensaje_urgente`: Chat message with #urgente tag (chat participants)
- `otro`: Miscellaneous notifications

---

### Server → Client: Notification Categories

**Format** (sent on connection to show unread counts):
```json
{
  "type": "notificacion.categoria",
  "categorias": {
    "cierre_pendiente": 2,
    "aprobacion_porque_pendiente": 1,
    "cambio_responsable_pendiente": 0,
    "asignado_responsable": 1,
    "mensaje_urgente": 3
  }
}
```

---

### Client → Server: Mark Notification as Read

**Format**:
```json
{
  "type": "notificacion.marcar_leida",
  "notification_id": 1000
}
```

**Server Response**:
```json
{
  "type": "notificacion.leida",
  "notification_id": 1000,
  "fecha_lectura": "2026-07-05T15:00:00Z"
}
```

---

### Client → Server: Mark All as Read (by Type)

**Format**:
```json
{
  "type": "notificacion.marcar_todas_leidas",
  "tipo": "aprobacion_porque_pendiente"  // optional, null = all types
}
```

**Server Response**:
```json
{
  "type": "notificacion.marcadas_leidas",
  "count": 5,
  "tipo": "aprobacion_porque_pendiente"
}
```

---

## Connection Lifecycle

### 1. Connection Established

```
Client → ws://localhost/ws/chat/123/?token=JWT_TOKEN
         ↓
Server validates JWT token
Server checks user authorization (is participant?)
Server joins user to channel group (channel_layer.group_add)
Server sends "chat.participants" with current list
         ↓
Server → chat.participants (all participants notified of new join)
```

### 2. Message Exchange

```
Client → chat.message { "contenido_texto": "..." }
         ↓
Server validates, saves to DB
Server broadcasts chat.message to all participants
         ↓
All Clients ← chat.message (with id, datetime, autor info)
```

### 3. Connection Closed

```
Client closes connection
Server removes user from channel group
Server broadcasts chat.participants (updated list)
```

---

## Connection Management

### Heartbeat (Ping/Pong)

Django Channels handles TCP-level keep-alive; no application-level ping/pong required.

### Reconnection Strategy (Client-side)

Recommended client-side behavior:

```javascript
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;

function connectWebSocket(endpoint, token) {
  ws = new WebSocket(`wss://${endpoint}/?token=${token}`);
  
  ws.onopen = () => {
    console.log("Connected");
    reconnectAttempts = 0;
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  };
  
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    attemptReconnect(endpoint, token);
  };
  
  ws.onclose = () => {
    console.log("Closed");
    attemptReconnect(endpoint, token);
  };
}

function attemptReconnect(endpoint, token) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    setTimeout(
      () => connectWebSocket(endpoint, token),
      RECONNECT_DELAY_MS * reconnectAttempts
    );
  }
}
```

### Connection Timeout

Server closes connection if:
- JWT token expires (client should reconnect with refreshed token)
- User loses access to hallazgo (e.g., removed as responsible)
- Server-side error or crash

Client should treat disconnection as non-fatal and attempt reconnection.

---

## Security Considerations

### 1. JWT Authentication

- Token passed via query parameter: `?token=JWT_TOKEN`
- Token validated on connection; invalid/expired tokens rejected immediately
- Connection closes if token expires during session (client re-authenticates and reconnects)

### 2. Message Validation

- All messages validated for:
  - Sender authorization (is user participant/admin?)
  - Content length limits
  - File MIME type whitelist
  - File size limits

### 3. Rate Limiting (Recommended)

- Per-user message rate limit (e.g., 10 msg/sec) to prevent abuse
- Implement in consumer: check timestamp of last N messages, reject if exceeds limit

### 4. HTTPS/WSS

- Production must use WSS (secure WebSocket) over HTTPS
- Configure in Nginx:
```nginx
location /ws/ {
    proxy_pass http://django_asgi;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## Scalability

### Channel Layer Configuration

Using Redis for distributed WebSocket scaling:

```python
# backend/config/settings/production.py

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [("redis", 6379)],
            "capacity": 10000,
            "expiry": 10,
        },
    },
}
```

### Group Management

- Chat groups: `chat_{hallazgo_id}`
- Notification groups: `notificaciones_{user_id}`

User can join multiple groups (e.g., user 10 in chat_123 + chat_456 + notificaciones_10).

### Performance Expectations

- **Message latency**: < 200ms p95 (WebSocket → Redis → group_send → broadcast)
- **Throughput**: ~10,000 messages/sec per Redis instance
- **Concurrent connections**: ~1000+ per Django/Channels instance (scales horizontally with load balancing)

---

## Example: Full Chat Flow

```
STEP 1: User A connects to chat 123
Client A → ws://localhost/ws/chat/123/?token=JWT_A
Server   → Validates JWT, verifies A is participant
Server   → channel_layer.group_add("chat_123", A_channel)
Server   → A.send({"type": "chat.participants", "participants": [A]})
Server   → channel_layer.group_send("chat_123", {
             "type": "chat.participants",
             "participants": [A]
           })

STEP 2: User B connects to chat 123
Client B → ws://localhost/ws/chat/123/?token=JWT_B
Server   → channel_layer.group_add("chat_123", B_channel)
Server   → channel_layer.group_send("chat_123", {
             "type": "chat.participants",
             "participants": [A, B]
           })
Clients A, B ← Receive updated participant list

STEP 3: User A sends message
Client A → {"type": "chat.message", "contenido_texto": "Hello #urgente"}
Server   → Detects #urgente, creates Mensaje with tiene_urgente=true
Server   → channel_layer.group_send("chat_123", {
             "type": "chat.message",
             "id": 600,
             "autor_nombre": "User A",
             "contenido_texto": "Hello #urgente",
             "tiene_urgente": true
           })
Server   → Creates Notificacion for A, B with tipo="mensaje_urgente"
Server   → channel_layer.group_send("notificaciones_10", {...})  (to B)
Server   → channel_layer.group_send("notificaciones_1", {...})   (to A)

Clients A, B ← chat.message with id, timestamp
Client B ← notificacion.nueva with tipo="mensaje_urgente"
```

---

## Error Handling

### Connection Errors

```json
{
  "type": "chat.error",
  "code": "AUTH_FAILED",
  "message": "Invalid or expired JWT token"
}
```

Server closes connection after error.

### Message Validation Errors

```json
{
  "type": "chat.error",
  "code": "VALIDATION_ERROR",
  "message": "File exceeds 50 MB limit",
  "details": {"file": "documento.pdf"}
}
```

Connection remains open; client can retry.

### Rate Limiting

```json
{
  "type": "chat.error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many messages sent. Please wait 5 seconds."
}
```

---

## Testing

### Manual WebSocket Testing (Browser DevTools)

```javascript
const ws = new WebSocket("ws://localhost/ws/chat/123/?token=JWT_TOKEN");

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({
    type: "chat.message",
    contenido_texto: "Test message #urgente"
  }));
};

ws.onmessage = (event) => {
  console.log("Message:", JSON.parse(event.data));
};
```

### Automated Testing (pytest + channels testing utilities)

```python
from channels.testing import WebsocketCommunicator
from chat.consumers import ChatConsumer

@pytest.mark.asyncio
async def test_send_message():
    communicator = WebsocketCommunicator(
        ChatConsumer.as_asgi(),
        "/ws/chat/123/?token=JWT_TOKEN"
    )
    connected, _ = await communicator.connect()
    assert connected
    
    await communicator.send_json_to({
        "type": "chat.message",
        "contenido_texto": "Hello #urgente"
    })
    
    response = await communicator.receive_json_from()
    assert response["type"] == "chat.message"
    assert response["tiene_urgente"] is True
    
    await communicator.disconnect()
```

---

**Status**: Complete  
**Next Step**: Create quickstart.md (validation scenarios)
