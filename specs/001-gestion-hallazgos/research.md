# Research: Sistema de Gestión de Hallazgos y Acciones Correctivas

**Branch**: `001-gestion-hallazgos` | **Date**: 2026-06-16

## Decision Log

### R-001: Comunicación en Tiempo Real

**Decision**: Django Channels 4.x con WebSocket consumers, backed por Redis Channel Layer.

**Rationale**: La constitución exige Django Channels para funcionalidad async/WebSocket (Principio I). Dos áreas requieren push en tiempo real: notificaciones al Admin (FR-008, SC-001 < 5 s) y chat colaborativo (FR-011). WebSocket es el protocolo bidireccional correcto; el Redis Channel Layer permite que mensajes lleguen a cualquier instancia de backend (escalabilidad horizontal, Principio V).

**Alternatives considered**:
- Server-Sent Events (SSE): Unidireccional; insuficiente para el chat bidireccional. Rechazado.
- Polling: No cumple los requisitos de latencia SC-001 / SC-003. Rechazado.
- Long-polling: Complejo con múltiples instancias; Redis pub/sub es más simple y efectivo. Rechazado.

---

### R-002: Estrategia de Autenticación

**Decision**: JWT via `djangorestframework-simplejwt`; access token en header `Authorization: Bearer`; refresh token en cookie HttpOnly.

**Rationale**: La constitución (Principio VI) exige JWT. Almacenar el refresh token en una cookie HttpOnly mitiga el robo por XSS de tokens de larga vida; el access token en Authorization header funciona nativamente con `JWTAuthentication` de DRF. Los tokens stateless son compatibles con escalado horizontal (Principio V).

**Alternatives considered**:
- Django session auth: Stateful; requiere sticky sessions o backend de sesiones compartido — complica el escalado horizontal. Rechazado.
- Access + refresh ambos en localStorage: Riesgo XSS para el refresh token. Rechazado.

---

### R-003: Modelo de Usuario / Estrategia de Roles

**Decision**: Único modelo `CustomUser` extendiendo `AbstractUser` con campo `tipo` (choices: ADMIN, EMPLEADO, CLIENTE); tablas de perfil adicionales (`EmpleadoProfile`, `ClienteProfile`) para datos específicos del rol.

**Rationale**: El patrón `AbstractUser` es el recomendado por Django. La herencia multi-tabla completa (como en el diagrama de clases) es válida pero agrega overhead de JOINs y serializers DRF más complejos para un sistema single-tenant a esta escala. Un discriminador `tipo` + tablas de perfil logra la misma semántica de dominio con consultas más simples (Principio X — Mantenibilidad primero).

**Alternatives considered**:
- Django Multi-Table Inheritance completa: Modelo OO más limpio pero consultas más pesadas y serializers complejos. Sin beneficio medible a la escala objetivo. Rechazado.
- Django Groups/Permissions nativos: Menos explícito que un campo `tipo` para este dominio cerrado. Rechazado.

---

### R-004: Estrategia de Almacenamiento de Archivos

**Decision**: `FileField` de Django con `MEDIA_ROOT` en filesystem local para desarrollo; configurable vía `DEFAULT_FILE_STORAGE` env var para producción (compatible con `django-storages` + S3 en el futuro). `MAX_FILE_SIZE` y `ALLOWED_FILE_TYPES` desde settings/env.

**Rationale**: El Principio II prohíbe hardcodear límites de archivos. El Principio IX desalienta introducir nueva infraestructura (S3) sin aprobación arquitectural. El almacenamiento local es el baseline; la abstracción vía `DEFAULT_FILE_STORAGE` permite migración futura sin cambios en la lógica de negocio.

**Tipos permitidos** (de spec.md — Assumptions): PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX, PPT, PPTX.

**Alternatives considered**:
- S3 directo en Phase 1: Requiere aprobación de nueva infra (Principio IX). Rechazado.
- Almacenamiento BLOB en base de datos: Mal rendimiento para archivos grandes; viola Principio III. Rechazado.

---

### R-005: Máquina de Estados (Hallazgo y Acción)

**Decision**: Métodos explícitos en capa de servicios que verifican y ejecutan transiciones válidas; sin librería FSM externa.

**Rationale**: Los grafos de estados son pequeños y bien definidos. Encapsular transiciones en métodos de servicio (e.g., `hallazgo_service.aprobar()`, `accion_service.solicitar_cierre()`) es simple, testeable y mantenible (Principio X). El servicio lanza `ValidationError` en transiciones inválidas.

**Transiciones — Hallazgo**:
```
PENDIENTE → APROBADO         (Admin aprueba)
PENDIENTE → RECHAZADO        (Admin rechaza — estado terminal)
PENDIENTE → PENDIENTE        (Admin reclasifica tipo)
APROBADO  → CERRADO          (auto: cuando las 3 acciones = CERRADA, FR-022)
```

**Transiciones — Accion**:
```
PENDIENTE          → EN_PROGRESO      (Empleado actualiza descripción/fechas)
EN_PROGRESO        → SOLICITUD_CIERRE (Empleado solicita cierre)
SOLICITUD_CIERRE   → CERRADA          (Admin aprueba)
SOLICITUD_CIERRE   → EN_PROGRESO      (Admin rechaza)
```

**Alternatives considered**:
- `django-fsm`: Agrega dependencia externa; innecesaria para un grafo pequeño y fijo. Rechazado.
- Lógica de transición en el frontend: Viola Principio III. Rechazado.

---

### R-006: Trigger de Cierre Automático de Hallazgo

**Decision**: Signal `post_save` en el modelo `Accion` verifica si las 3 acciones del `Hallazgo` padre están en `CERRADA`; si es así, transiciona el `Hallazgo` a `CERRADO` (FR-022).

**Rationale**: Las signals de Django proveen un hook limpio sin acoplar la capa de vistas a esta regla de negocio. La verificación es idempotente y transaccional (dentro del `save()` de la acción).

**Alternatives considered**:
- Tarea Celery periódica: Asíncrona; podría demorarse. Las signals son síncronas e inmediatas. Rechazado.
- Llamada explícita desde la vista de aprobación del Admin: Crea acoplamiento y riesgo de omisión. Rechazado.

---

### R-007: Autenticación en WebSocket

**Decision**: Token JWT como query parameter en el handshake WebSocket; validado en un `TokenAuthMiddleware` personalizado que envuelve la aplicación ASGI.

**Rationale**: El API WebSocket del navegador no soporta headers personalizados. Pasar el access token (corta vida) como query param (`ws://.../ws/chat/{id}/?token=<JWT>`) es el patrón estándar de Django Channels. El middleware valida el token antes de hacer el upgrade de conexión.

**Alternatives considered**:
- Auth basada en cookies para WebSocket: Requiere coordinación CSRF y restricción de mismo origen. Más complejo. Rechazado.
- Session auth: Stateful; contradice decisión R-002. Rechazado.
